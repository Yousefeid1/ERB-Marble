// ============================================
// لوحة التحكم الرئيسية - Dashboard
// ============================================

// ===== جمع جميع التنبيهات الذكية =====
function collectAllAlerts() {
  var alerts  = [];
  var today   = new Date();
  var in7Days = new Date(today.getTime() + 7 * 86400000);
  var s = DB.get('settings') || {};

  // 1. مخزون منخفض
  var products = DB.getAll('products');
  products.forEach(function(p) {
    if ((p.stock_qty || 0) <= (p.min_stock || 5)) {
      alerts.push({
        level:    'warning',
        category: 'مخزون',
        text:     p.name + ': متبقي ' + (p.stock_qty || 0) + ' ' + (p.unit || 'وحدة'),
        page:     'products',
        id:       p.id
      });
      if (s.tgNotifyLowStock) sendTelegramNotification(
        '⚠️ <b>مخزون منخفض</b>\n' + p.name +
        ': متبقي ' + (p.stock_qty || 0) + ' ' + (p.unit || 'وحدة')
      );
    }
  });

  // 2. فواتير متأخرة أكثر من 30 يوم
  var sales = DB.getAll('sales');
  sales.forEach(function(inv) {
    if (inv.status !== 'sent') return;
    var days = daysBetween(inv.invoice_date);
    if (days > 30) {
      alerts.push({
        level:    'danger',
        category: 'مديونية',
        text:     (inv.customer || '') + ' — ' +
                  formatCurrency(inv.total_amount) + ' — ' + days + ' يوم',
        page:     'sales',
        id:       inv.id
      });
      if (s.tgNotifyOverdue) sendTelegramNotification(
        '🔴 <b>فاتورة متأخرة ' + days + ' يوم</b>\n' +
        'العميل: ' + (inv.customer || '') + '\n' +
        'المبلغ: ' + formatCurrency(inv.total_amount)
      );
    }
  });

  // 3. شيكات تستحق خلال 7 أيام (غير مستحقة بعد أو مستحقة للتو)
  var checks = DB.getAll('checks');
  checks.forEach(function(chk) {
    if (chk.status !== 'pending') return;
    if (!chk.dueDate) return;
    var due = new Date(chk.dueDate);
    if (isNaN(due.getTime())) return;
    if (due >= today && due <= in7Days) {
      alerts.push({
        level:    'info',
        category: 'شيكات',
        text:     (chk.partyName || '') + ' — ' +
                  formatCurrency(chk.amount) + ' — ' +
                  formatDate(chk.dueDate),
        page:     'checks',
        id:       chk.id
      });
      if (s.tgNotifyChecks) sendTelegramNotification(
        '📅 <b>شيك يستحق قريباً</b>\n' +
        (chk.partyName || '') + '\n' +
        'المبلغ: ' + formatCurrency(chk.amount) + '\n' +
        'الاستحقاق: ' + formatDate(chk.dueDate)
      );
    }
  });

  // 4. تجاوز حد الائتمان
  var crmCustomers = DB.getAll('crm_customers');
  crmCustomers.forEach(function(c) {
    if (!c.creditLimit || c.creditLimit <= 0) return;
    var bal = DB.getAll('sales')
      .filter(function(inv) {
        return inv.customer_id === c.id &&
               inv.status !== 'paid' &&
               inv.status !== 'cancelled';
      })
      .reduce(function(sum, inv) {
        return sum + ((inv.total_amount || 0) - (inv.paid_amount || 0));
      }, 0);
    if (bal > c.creditLimit) {
      alerts.push({
        level:    'danger',
        category: 'ائتمان',
        text:     (c.name || '') + ' — مديونية ' +
                  formatCurrency(bal) +
                  ' / حد ' + formatCurrency(c.creditLimit),
        page:     'crm',
        id:       c.id
      });
    }
  });

  // 5. تذكير النسخ الاحتياطي
  var lastBackup = localStorage.getItem('_lastBackup');
  var backupDays = lastBackup ? daysBetween(lastBackup) : 999;
  if (backupDays > 1) {
    alerts.push({
      level:    'warning',
      category: 'نظام',
      text:     'لم يتم عمل نسخة احتياطية منذ ' +
                (backupDays >= 999 ? 'البداية' : backupDays + ' يوم'),
      page:     'settings',
      id:       null
    });
  }

  return alerts;
}

// ===== عرض قسم التنبيهات الملوّن =====
function renderAlertsSection(alerts) {
  if (!alerts || !alerts.length) return '';

  var colors = {
    danger:  { bg: '#fcebeb', border: '#a32d2d', text: '#791f1f' },
    warning: { bg: '#faeeda', border: '#854f0b', text: '#633806' },
    info:    { bg: '#e6f1fb', border: '#185fa5', text: '#0c447c' }
  };

  return alerts.map(function(a) {
    var c = colors[a.level] || colors.info;
    var onclick = a.page
      ? (a.id
          ? 'navigateToEntity(\'' + a.page + '\',\'' + a.id + '\')'
          : 'showPage(\'' + a.page + '\')')
      : 'showPage(\'settings\')';
    return '<div onclick="' + onclick + '" style="cursor:pointer;display:flex;align-items:center;gap:8px;' +
      'padding:8px 12px;margin-bottom:6px;background:' + c.bg + ';' +
      'border:1px solid ' + c.border + ';border-radius:8px;font-size:13px;color:' + c.text + '">' +
      '<span style="font-weight:700;font-size:11px;padding:2px 6px;background:' + c.border +
      ';color:#fff;border-radius:4px">' + (a.category || '') + '</span>' +
      '<span>' + a.text + '</span>' +
      '</div>';
  }).join('');
}

// ===== مؤشرات الإنتاج =====
function renderProductionKPIs() {
  var mfg    = DB.getAll('manufacturing_stages');
  var slabs  = DB.getAll('slabs');
  var blocks = DB.getAll('blocks');

  var thisMonth = new Date().toISOString().slice(0, 7);

  // إجمالي الإنتاج هذا الشهر
  var monthlyOutput = mfg
    .filter(function(op) { return (op.date || '').slice(0, 7) === thisMonth; })
    .reduce(function(sum, op) { return sum + (op.outputQuantity || 0); }, 0);

  // نسبة الهالك هذا الشهر
  var mfgThisMonth = mfg.filter(function(op) { return (op.date || '').slice(0, 7) === thisMonth; });
  var totalIn  = mfgThisMonth.reduce(function(sum, op) { return sum + (op.inputQuantity  || 0); }, 0);
  var totalOut = mfgThisMonth.reduce(function(sum, op) { return sum + (op.outputQuantity || 0); }, 0);
  var wasteRate = totalIn > 0
    ? ((totalIn - totalOut) / totalIn * 100).toFixed(1)
    : '0.0';

  // ألواح متاحة في المخزن
  var availableSlabs = slabs.filter(function(s) {
    return s.status === 'in_stock';
  }).length;

  // كتل في مرحلة القطع
  var blocksInCutting = blocks.filter(function(b) {
    return b.status === 'in_cutting';
  }).length;

  // متوسط تكلفة المتر (من مراحل التصنيع هذا الشهر)
  var totalCostThisM = mfgThisMonth.reduce(function(sum, op) {
    return sum + (op.directCost || 0) + (op.laborCost || 0) +
                 (op.materialCost || 0) + (op.transportCost || 0);
  }, 0);
  var avgCost = totalOut > 0
    ? formatCurrency(totalCostThisM / totalOut)
    : '—';

  return renderMiniKPI('إنتاج الشهر', monthlyOutput.toFixed(1) + ' وحدة', '#185fa5') +
         renderMiniKPI('هالك الشهر', wasteRate + '%', parseFloat(wasteRate) > 5 ? '#a32d2d' : '#1a7a4a') +
         renderMiniKPI('ألواح متاحة', availableSlabs + ' لوح', '#854f0b') +
         renderMiniKPI('كتل في القطع', blocksInCutting + ' كتلة', '#6b2fa0') +
         renderMiniKPI('متوسط تكلفة المتر', avgCost, '#0c447c');
}

// ===== بطاقة KPI صغيرة =====
function renderMiniKPI(label, value, color) {
  return '<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;' +
    'padding:10px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;' +
    'margin:0 4px 8px 4px;min-width:130px;text-align:center">' +
    '<div style="font-size:16px;font-weight:700;color:' + (color || 'var(--accent)') + '">' + value + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + label + '</div>' +
    '</div>';
}

// ===== التقرير اليومي التلقائي عبر تيليجرام =====
function checkAndSendDailyReport() {
  var today = new Date().toISOString().slice(0, 10);
  var lastReport = localStorage.getItem('_lastDailyReport');
  if (lastReport === today) return; // أُرسل اليوم بالفعل

  var s = DB.get('settings') || {};
  if (!s.tgDailyReport || !s.tgBotToken || !s.tgChatId) return; // غير مُفعَّل

  // بناء ملخص سريع
  var sales      = DB.getAll('sales');
  var todaySales = sales.filter(function(inv) {
    return inv.invoice_date === today && inv.status !== 'cancelled';
  });
  var todayTotal = todaySales.reduce(function(sum, inv) {
    return sum + (inv.total_amount || 0);
  }, 0);

  var overdue = sales.filter(function(inv) {
    return inv.status === 'sent' && daysBetween(inv.invoice_date) > 30;
  }).length;

  var lowStock = DB.getAll('products').filter(function(p) {
    return (p.stock_qty || 0) <= (p.min_stock || 5);
  }).length;

  var msg =
    '📊 <b>التقرير اليومي — ' + today + '</b>\n\n' +
    '💰 مبيعات اليوم: ' + formatCurrency(todayTotal) + ' (' + todaySales.length + ' فاتورة)\n' +
    '⚠️ فواتير متأخرة: ' + overdue + '\n' +
    '📦 منتجات بمخزون منخفض: ' + lowStock;

  sendTelegramNotification(msg);
  localStorage.setItem('_lastDailyReport', today);
}

async function renderDashboard() {
  const content = document.getElementById('page-content');
  try {
    // إرسال التقرير اليومي إن لزم
    checkAndSendDailyReport();

    const d = await api.dashboard();
    const k = d.kpis;

    // ===== حساب مؤشرات التصنيع والتصدير الجديدة =====
    const now   = new Date();
    const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevM = (() => {
      const p = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}`;
    })();

    // تكلفة المتر المصنع هذا الشهر
    const mfgStages  = DB.getAll('manufacturing_stages');
    const thisMStages = mfgStages.filter(s => s.date && s.date.startsWith(thisM));
    const prevMStages = mfgStages.filter(s => s.date && s.date.startsWith(prevM));

    const calcCPM = (stages) => {
      const totalCost = stages.reduce((s, r) =>
        s + (r.directCost || 0) + (r.laborCost || 0) + (r.materialCost || 0) + (r.transportCost || 0), 0);
      const totalOut  = stages.reduce((s, r) => s + (r.outputQuantity || 0), 0);
      return totalOut > 0 ? totalCost / totalOut : 0;
    };

    const thisCPM  = calcCPM(thisMStages);
    const prevCPM  = calcCPM(prevMStages);
    const cpmGrowth = prevCPM > 0 ? ((thisCPM - prevCPM) / prevCPM * 100).toFixed(1) : null;

    // إيرادات التصدير vs المحلية هذا الشهر
    const exportOrders   = DB.getAll('export_orders');
    const thisExportRev  = exportOrders.filter(o => o.shippingDate && o.shippingDate.startsWith(thisM))
      .reduce((s, o) => s + (o.totalRevenue || 0), 0);
    const allSales       = DB.getAll('sales');
    const thisLocalRev   = allSales.filter(s => s.invoice_date && s.invoice_date.startsWith(thisM)
                            && s.status !== 'cancelled')
      .reduce((s, inv) => s + (inv.total_amount || 0), 0);

    // نسبة الهالك الفعلية
    const totalOutput   = mfgStages.reduce((s, r) => s + (r.outputQuantity || 0), 0);
    const totalWaste    = mfgStages.reduce((s, r) => s + (r.wasteQuantity  || 0), 0);
    const wasteRate     = (totalOutput + totalWaste) > 0
      ? (totalWaste / (totalOutput + totalWaste) * 100).toFixed(1) : '0.0';
    const settings      = DB.get('settings') || {};
    const targetWaste   = parseFloat(settings.target_waste_pct || 5); // الهدف الافتراضي 5% - يُعدَّل من الإعدادات

    // أعلى 5 عملاء إيراداً هذا الشهر
    const top5Customers = (() => {
      const map = {};
      allSales.filter(s => s.invoice_date && s.invoice_date.startsWith(thisM) && s.status !== 'cancelled')
        .forEach(s => { map[s.customer] = (map[s.customer] || 0) + (s.total_amount || 0); });
      return Object.entries(map).map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
    })();

    // أعلى 5 ماكينات تكلفةً هذا الشهر
    const top5Machines = (() => {
      const map = {};
      thisMStages.forEach(s => {
        if (!s.machineId) return;
        const cost = (s.directCost || 0) + (s.laborCost || 0) + (s.materialCost || 0) + (s.transportCost || 0);
        map[s.machineId] = (map[s.machineId] || 0) + cost;
      });
      return Object.entries(map).map(([id, cost]) => ({ id, cost }))
        .sort((a, b) => b.cost - a.cost).slice(0, 5);
    })();

    content.innerHTML = `
      <!-- ===== التنبيهات الذكية ===== -->
      <div id="alertsContainer" style="margin-bottom:12px"></div>

      <!-- ===== مؤشرات الإنتاج ===== -->
      <div id="productionKPIsContainer" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px"></div>

      <!-- ===== KPIs الأساسية ===== -->
      <div class="kpi-grid">
        <div class="kpi-card gold">
          <div class="kpi-icon">💰</div>
          <div class="kpi-value number">${formatMoney(k.monthly_sales)}</div>
          <div class="kpi-label">مبيعات الشهر (${k.monthly_sales_count} فاتورة)
            ${d.sales_growth !== null ? `<span style="font-size:12px;font-weight:700;color:${parseFloat(d.sales_growth)>=0?'var(--success)':'var(--danger)'};margin-right:6px">${parseFloat(d.sales_growth)>=0?'▲':'▼'} ${Math.abs(d.sales_growth)}%</span>` : ''}
          </div>
        </div>
        <div class="kpi-card green">
          <div class="kpi-icon">🏦</div>
          <div class="kpi-value number">${formatMoney(k.cash_balance + k.bank_balance)}</div>
          <div class="kpi-label">الرصيد النقدي والبنكي</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-value number">${formatMoney(k.overdue_amount)}</div>
          <div class="kpi-label">مستحقات متأخرة (${k.overdue_count})</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📦</div>
          <div class="kpi-value number">${formatMoney(k.inventory_value)}</div>
          <div class="kpi-label">قيمة المخزون</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🛒</div>
          <div class="kpi-value number">${formatMoney(k.monthly_purchases)}</div>
          <div class="kpi-label">مشتريات الشهر</div>
        </div>
        <div class="kpi-card ${k.low_stock_count > 0 ? 'red' : 'green'}">
          <div class="kpi-icon">🚨</div>
          <div class="kpi-value">${k.low_stock_count}</div>
          <div class="kpi-label">منتجات نقص المخزون</div>
        </div>
      </div>

      <!-- ===== KPIs الإنتاج والتصدير ===== -->
      <div class="kpi-grid" style="margin-top:-8px">
        <div class="kpi-card" onclick="showPage('report-cost-per-meter')" style="cursor:pointer">
          <div class="kpi-icon">📐</div>
          <div class="kpi-value number">${formatMoney(thisCPM)}</div>
          <div class="kpi-label">متوسط تكلفة المتر هذا الشهر
            ${cpmGrowth !== null ? `<span style="font-size:12px;font-weight:700;color:${parseFloat(cpmGrowth)<=0?'var(--success)':'var(--danger)'};margin-right:6px">${parseFloat(cpmGrowth)<=0?'▼':'▲'} ${Math.abs(cpmGrowth)}%</span>` : ''}
          </div>
        </div>
        <div class="kpi-card" onclick="showPage('report-export-profit')" style="cursor:pointer">
          <div class="kpi-icon">🚢</div>
          <div class="kpi-value number">${formatMoney(thisExportRev)}</div>
          <div class="kpi-label">إيرادات التصدير هذا الشهر</div>
        </div>
        <div class="kpi-card" onclick="showPage('report-export-profit')" style="cursor:pointer">
          <div class="kpi-icon">🏠</div>
          <div class="kpi-value number">${formatMoney(thisLocalRev)}</div>
          <div class="kpi-label">إيرادات السوق المحلي هذا الشهر</div>
        </div>
        <div class="kpi-card ${parseFloat(wasteRate) > targetWaste ? 'red' : 'green'}" onclick="showPage('report-waste')" style="cursor:pointer">
          <div class="kpi-icon">♻️</div>
          <div class="kpi-value">${wasteRate}%</div>
          <div class="kpi-label">نسبة الهالك الفعلية (الهدف: ${targetWaste}%)</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">📈 المبيعات - آخر 6 أشهر</span>
          </div>
          <canvas id="sales-chart" height="80"></canvas>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">⭐ أفضل العملاء</span>
          </div>
          <div id="top-customers-list"></div>
        </div>
      </div>

    <div class="charts-grid">
      <div class="card">
        <div class="card-header"><span class="card-title">🏆 أكثر المنتجات مبيعاً</span></div>
        <div id="top-products-list" style="padding:8px 4px">
          ${(d.top_products && d.top_products.length) ? (() => {
            const maxQ = Math.max(...d.top_products.map(p => p.qty));
            return d.top_products.map((p,i) => `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                  <span style="font-size:13px;font-weight:600">${i+1}. ${p.name}</span>
                  <span style="font-size:13px;color:var(--accent)">${p.qty} وحدة</span>
                </div>
                <div style="height:6px;background:var(--bg-input);border-radius:3px">
                  <div style="height:100%;background:linear-gradient(90deg,var(--accent-dark),var(--accent));border-radius:3px;width:${(p.qty/maxQ*100).toFixed(1)}%"></div>
                </div>
              </div>`).join('');
          })() : '<div class="empty-state" style="padding:30px"><div class="empty-icon">📦</div><p>لا توجد بيانات</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">🚨 تنبيهات المخزون المنخفض</span></div>
        <div>
          ${(d.low_stock_products && d.low_stock_products.length) ? d.low_stock_products.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:13px;font-weight:600">${p.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${p.code}</div>
              </div>
              <div style="text-align:center">
                <div style="font-size:16px;font-weight:700;color:var(--danger)">${p.stock_qty}</div>
                <div style="font-size:11px;color:var(--text-muted)">الحد الأدنى: ${p.min_stock}</div>
              </div>
            </div>`).join('') : '<div class="empty-state" style="padding:30px"><div class="empty-icon">✅</div><p>المخزون بمستوى جيد</p></div>'}
        </div>
      </div>
    </div>

    <!-- ===== أعلى 5 هذا الشهر ===== -->
    <div class="charts-grid" style="margin-top:4px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🥇 أعلى 5 عملاء إيراداً هذا الشهر</span>
          <button class="btn btn-secondary btn-sm" onclick="showPage('crm')">CRM</button>
        </div>
        <div style="padding:4px">
          ${top5Customers.length > 0 ? (() => {
            const maxT = Math.max(...top5Customers.map(c => c.total));
            return top5Customers.map((c, i) => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:600">${i+1}. ${c.name}</span>
                  <span style="font-size:13px;color:var(--accent)">${formatMoney(c.total)}</span>
                </div>
                <div style="height:5px;background:var(--bg-input);border-radius:3px">
                  <div style="height:100%;background:linear-gradient(90deg,var(--accent-dark),var(--accent));border-radius:3px;width:${(c.total/maxT*100).toFixed(1)}%"></div>
                </div>
              </div>`).join('');
          })() : '<div class="empty-state" style="padding:20px"><p>لا توجد مبيعات هذا الشهر</p></div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">⚙️ أعلى 5 ماكينات تكلفةً هذا الشهر</span>
          <button class="btn btn-secondary btn-sm" onclick="showPage('manufacturing')">التصنيع</button>
        </div>
        <div style="padding:4px">
          ${top5Machines.length > 0 ? (() => {
            const maxC = Math.max(...top5Machines.map(m => m.cost));
            return top5Machines.map((m, i) => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:600">${i+1}. ${m.id}</span>
                  <span style="font-size:13px;color:var(--danger)">${formatMoney(m.cost)}</span>
                </div>
                <div style="height:5px;background:var(--bg-input);border-radius:3px">
                  <div style="height:100%;background:linear-gradient(90deg,var(--danger),var(--warning));border-radius:3px;width:${(m.cost/maxC*100).toFixed(1)}%"></div>
                </div>
              </div>`).join('');
          })() : '<div class="empty-state" style="padding:20px"><p>لا توجد عمليات تصنيع هذا الشهر</p></div>'}
        </div>
      </div>
    </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">🧾 آخر الفواتير</span>
          <button class="btn btn-primary btn-sm" onclick="showPage('sales')">عرض الكل</button>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>التاريخ</th>
              <th>المبلغ</th>
              <th>الحالة</th>
            </tr></thead>
            <tbody>
              ${d.recent_invoices.map(inv => `
                <tr>
                  <td class="number">${inv.invoice_number}</td>
                  <td>${inv.customer}</td>
                  <td>${formatDate(inv.invoice_date)}</td>
                  <td class="number">${formatMoney(inv.total_amount)}</td>
                  <td>${statusBadge(inv.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // ===== ملء التنبيهات الذكية =====
    var allAlerts = collectAllAlerts();
    var alertsEl = document.getElementById('alertsContainer');
    if (alertsEl) {
      if (allAlerts.length > 0) {
        alertsEl.innerHTML =
          '<div class="card" style="border-right:3px solid var(--warning);padding:12px 16px">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
          '<span style="font-size:16px">🔔</span>' +
          '<strong>تنبيهات تحتاج متابعة</strong>' +
          '<span class="badge badge-danger">' + allAlerts.length + '</span>' +
          '</div>' +
          renderAlertsSection(allAlerts) +
          '</div>';
      }
    }

    // ===== ملء مؤشرات الإنتاج =====
    var prodKPIsEl = document.getElementById('productionKPIsContainer');
    if (prodKPIsEl) {
      var prodHtml = renderProductionKPIs();
      if (prodHtml) {
        prodKPIsEl.innerHTML =
          '<div style="width:100%;margin-bottom:4px">' +
          '<span style="font-size:13px;font-weight:600;color:var(--text-muted)">📊 مؤشرات الإنتاج — الشهر الحالي</span>' +
          '</div>' + prodHtml;
      }
    }

    // Sales chart
    const chartData = d.charts.monthly_sales;
    if (chartData.length > 0) {
      const ctx = document.getElementById('sales-chart').getContext('2d');
      _registerChart('dashboard-sales', new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.map(r => r.month),
          datasets: [{
            label: 'المبيعات (EGP)',
            data: chartData.map(r => r.total),
            backgroundColor: 'rgba(200,169,110,0.3)',
            borderColor: '#c8a96e',
            borderWidth: 2,
            borderRadius: 6,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#8892aa', font: { family: 'Cairo' } } } },
          scales: {
            x: { ticks: { color: '#8892aa' }, grid: { color: 'rgba(42,47,63,0.8)' } },
            y: { ticks: { color: '#8892aa' }, grid: { color: 'rgba(42,47,63,0.8)' } }
          }
        }
      }));
    }

    // Top customers
    const tcList = document.getElementById('top-customers-list');
    if (d.top_customers.length === 0) {
      tcList.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon">👤</div><p>لا توجد بيانات</p></div>';
    } else {
      const maxSales = Math.max(...d.top_customers.map(c => c.total));
      tcList.innerHTML = d.top_customers.map(c => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600">${c.name}</span>
            <span style="font-size:13px;color:var(--accent)">${formatMoney(c.total)}</span>
          </div>
          <div style="height:6px;background:var(--bg-input);border-radius:3px;">
            <div style="height:100%;background:linear-gradient(90deg,var(--accent-dark),var(--accent));border-radius:3px;width:${(c.total/maxSales*100).toFixed(1)}%"></div>
          </div>
        </div>
      `).join('');
    }

  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}
