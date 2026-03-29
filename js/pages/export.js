// ============================================
// الوحدة الثالثة — نظام التصدير
// إدارة أوامر التصدير وتحليل الربحية
// ============================================

// ===== العملات المدعومة وبياناتها =====
const CURRENCIES = {
  EGP: { name: 'جنيه مصري',      symbol: 'ج.م' },
  USD: { name: 'دولار أمريكي',   symbol: '$'    },
  EUR: { name: 'يورو',           symbol: '€'    },
  GBP: { name: 'جنيه إسترليني',  symbol: '£'    },
  SAR: { name: 'ريال سعودي',     symbol: 'ر.س'  },
  AED: { name: 'درهم إماراتي',   symbol: 'د.إ'  },
};

// ===== حالات أمر التصدير =====
const EXPORT_STATUSES = {
  draft:     { label: 'مسودة',          badge: 'badge-warning' },
  confirmed: { label: 'مؤكد',           badge: 'badge-info'    },
  shipped:   { label: 'تم الشحن',       badge: 'badge-gold'    },
  delivered: { label: 'تم التسليم',     badge: 'badge-success' },
  paid:      { label: 'مسدد',           badge: 'badge-success' },
};

// ===== حالة الصفحة الداخلية =====
let _exportView      = 'list';  // 'list' | 'detail'
let _exportDetailId  = null;
let _exportActiveTab = 'orders'; // 'orders' | 'reports'
let _exportFilters   = { status: '', currency: '', destination: '', dateFrom: '', dateTo: '' };

// ===== شريط حالة التبويب النشط في تقارير =====
let _reportChartInstance = null;

// ============================================
// تحويل العملة
// ============================================

// تحويل مبلغ من عملة إلى أخرى باستخدام جدول الأسعار بالجنيه المصري
function convertCurrency(amount, from, to, rates) {
  const inEGP = amount * (rates[from] || 1);
  return inEGP / (rates[to] || 1);
}

// بناء جدول أسعار الصرف بالجنيه المصري من قائمة الأوامر
function buildRatesFromOrders(orders) {
  const rates = { EGP: 1 };
  orders.forEach(o => {
    if (o.currency && o.exchangeRate) {
      rates[o.currency] = parseFloat(o.exchangeRate) || 1;
    }
  });
  return rates;
}

// ============================================
// حساب مجاميع أمر التصدير
// ============================================

// احتساب الإيرادات والتكاليف والأرباح لأمر تصدير محدد
function calcOrderTotals(items) {
  let totalRevenue = 0;
  let totalCost    = 0;

  (items || []).forEach(item => {
    const qty   = parseFloat(item.quantity)    || 0;
    const price = parseFloat(item.unitPrice)   || 0;
    const rev   = qty * price;

    const cost =
      (parseFloat(item.purchaseCost)         || 0) +
      (parseFloat(item.manufacturingCost)    || 0) +
      (parseFloat(item.transportCostLocal)   || 0) +
      (parseFloat(item.shippingCost)         || 0) +
      (parseFloat(item.customsCost)          || 0) +
      (parseFloat(item.commissions)          || 0) +
      (parseFloat(item.otherCosts)           || 0);

    totalRevenue += rev;
    totalCost    += cost;
  });

  const grossProfit    = totalRevenue - totalCost;
  const grossProfitPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return { totalRevenue, totalCost, grossProfit, grossProfitPct };
}

// ============================================
// الدالة الرئيسية للصفحة
// ============================================

async function renderExport() {
  if (_exportView === 'detail' && _exportDetailId) {
    showExportDetail(_exportDetailId);
  } else {
    renderExportList();
  }
}

// ============================================
// قائمة أوامر التصدير
// ============================================

function renderExportList() {
  _exportView = 'list';
  const content = document.getElementById('page-content');

  const orders    = DB.getAll('export_orders');
  const rates     = buildRatesFromOrders(orders);

  // ===== حساب مؤشرات الأداء الرئيسية =====
  const totalOrders  = orders.length;
  let   sumRevEGP    = 0;
  let   sumProfitEGP = 0;
  let   sumPctAcc    = 0;
  let   pctCount     = 0;

  orders.forEach(o => {
    const r = parseFloat(o.exchangeRate) || 1;
    sumRevEGP    += (parseFloat(o.totalRevenue) || 0) * r;
    sumProfitEGP += (parseFloat(o.grossProfit)  || 0) * r;
    if (o.totalRevenue > 0) { sumPctAcc += parseFloat(o.grossProfitPct) || 0; pctCount++; }
  });

  const avgPct = pctCount > 0 ? (sumPctAcc / pctCount) : 0;

  // ===== تطبيق الفلاتر =====
  const filtered = _applyExportFilters(orders);

  content.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div>
        <h2>نظام التصدير</h2>
        <p>إدارة أوامر التصدير وتحليل الربحية</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="exportOrdersExcel()">📊 Excel</button>
        <button class="btn btn-primary" onclick="openNewExportModal()">＋ أمر تصدير جديد</button>
      </div>
    </div>

    <!-- التبويبات -->
    <div class="tabs" style="margin-bottom:16px">
      <button class="tab-btn ${_exportActiveTab==='orders'?'active':''}" onclick="_setExportTab('orders')">أوامر التصدير</button>
      <button class="tab-btn ${_exportActiveTab==='reports'?'active':''}" onclick="_setExportTab('reports')">التقارير والتحليلات</button>
    </div>

    ${_exportActiveTab === 'orders' ? _renderOrdersTab(filtered, totalOrders, sumRevEGP, sumProfitEGP, avgPct) : _renderReportsTab(orders, rates)}
  `;

  // رسم مخطط التقارير إذا كان التبويب نشطاً
  if (_exportActiveTab === 'reports') {
    _drawMonthlyChart(orders, rates);
  }
}

// تغيير التبويب النشط
function _setExportTab(tab) {
  _exportActiveTab = tab;
  renderExportList();
}

// ===== تطبيق الفلاتر على القائمة =====
function _applyExportFilters(orders) {
  return orders.filter(o => {
    if (_exportFilters.status      && o.status      !== _exportFilters.status)      return false;
    if (_exportFilters.currency    && o.currency    !== _exportFilters.currency)    return false;
    if (_exportFilters.destination && !o.destination.includes(_exportFilters.destination)) return false;
    if (_exportFilters.dateFrom    && o.shippingDate < _exportFilters.dateFrom)     return false;
    if (_exportFilters.dateTo      && o.shippingDate > _exportFilters.dateTo)       return false;
    return true;
  });
}

// ===== تبويب الأوامر =====
function _renderOrdersTab(filtered, totalOrders, sumRevEGP, sumProfitEGP, avgPct) {
  // قائمة الوجهات الفريدة للفلتر
  const allOrders     = DB.getAll('export_orders');
  const destinations  = [...new Set(allOrders.map(o => o.destination).filter(Boolean))];

  return `
    <!-- بطاقات المؤشرات -->
    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi-card">
        <div class="kpi-icon">📋</div>
        <div class="kpi-info">
          <div class="kpi-value">${totalOrders}</div>
          <div class="kpi-label">إجمالي الأوامر</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <div class="kpi-info">
          <div class="kpi-value">${formatMoney(sumRevEGP)}</div>
          <div class="kpi-label">إجمالي الإيراد (ج.م)</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📈</div>
        <div class="kpi-info">
          <div class="kpi-value">${formatMoney(sumProfitEGP)}</div>
          <div class="kpi-label">إجمالي الربح (ج.م)</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">%</div>
        <div class="kpi-info">
          <div class="kpi-value">${avgPct.toFixed(1)}%</div>
          <div class="kpi-label">متوسط نسبة الربح</div>
        </div>
      </div>
    </div>

    <!-- شريط الفلاتر -->
    <div class="filters-bar">
      <select onchange="_setExportFilter('status', this.value)">
        <option value="">كل الحالات</option>
        ${Object.entries(EXPORT_STATUSES).map(([k, v]) => `<option value="${k}" ${_exportFilters.status===k?'selected':''}>${v.label}</option>`).join('')}
      </select>
      <select onchange="_setExportFilter('currency', this.value)">
        <option value="">كل العملات</option>
        ${Object.entries(CURRENCIES).map(([k, v]) => `<option value="${k}" ${_exportFilters.currency===k?'selected':''}>${v.name}</option>`).join('')}
      </select>
      <select onchange="_setExportFilter('destination', this.value)">
        <option value="">كل الوجهات</option>
        ${destinations.map(d => `<option value="${d}" ${_exportFilters.destination===d?'selected':''}>${d}</option>`).join('')}
      </select>
      <input type="date" value="${_exportFilters.dateFrom}" onchange="_setExportFilter('dateFrom', this.value)" title="من تاريخ الشحن">
      <input type="date" value="${_exportFilters.dateTo}"   onchange="_setExportFilter('dateTo',   this.value)" title="إلى تاريخ الشحن">
      <button class="btn btn-secondary btn-sm" onclick="_clearExportFilters()">مسح الفلاتر</button>
    </div>

    <!-- جدول البيانات -->
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead><tr>
            <th>رقم الأمر</th>
            <th>العميل</th>
            <th>الوجهة</th>
            <th>العملة</th>
            <th>الإيراد</th>
            <th>التكلفة</th>
            <th>الربح</th>
            <th>النسبة %</th>
            <th>تاريخ الشحن</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr></thead>
          <tbody>
            ${filtered.length ? filtered.map(o => _renderOrderRow(o)).join('') : `
              <tr><td colspan="11">
                <div class="empty-state" style="padding:40px">
                  <div class="empty-icon">🚢</div>
                  <h3>لا توجد أوامر تصدير</h3>
                  <p>أضف أمر تصدير جديد للبدء</p>
                </div>
              </td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// صف واحد في جدول الأوامر
function _renderOrderRow(o) {
  const cur   = CURRENCIES[o.currency] || { symbol: o.currency };
  const sym   = cur.symbol;
  const pct   = parseFloat(o.grossProfitPct) || 0;
  const pctCl = pct >= 15 ? 'text-success' : pct > 0 ? 'text-warning' : 'text-danger';

  return `
    <tr>
      <td><strong>${o.exportOrderNo}</strong></td>
      <td>${o.customerName || '-'}</td>
      <td>${o.destination  || '-'}</td>
      <td>${sym} ${o.currency}</td>
      <td class="number">${sym} ${formatMoney(o.totalRevenue)}</td>
      <td class="number">${sym} ${formatMoney(o.totalCost)}</td>
      <td class="number ${o.grossProfit >= 0 ? 'text-success' : 'text-danger'}">${sym} ${formatMoney(o.grossProfit)}</td>
      <td class="number ${pctCl}">${pct.toFixed(1)}%</td>
      <td>${formatDate(o.shippingDate)}</td>
      <td>${_exportStatusBadge(o.status)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="showExportDetail(${o.id})">عرض</button>
        <button class="btn btn-secondary btn-sm" onclick="openEditExportModal(${o.id})">تعديل</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteExportOrder(${o.id})">حذف</button>
      </td>
    </tr>
  `;
}

// ===== تبويب التقارير =====
function _renderReportsTab(orders, rates) {
  // ربحية حسب العميل
  const byCustomer = {};
  orders.forEach(o => {
    const r = parseFloat(o.exchangeRate) || 1;
    if (!byCustomer[o.customerName]) byCustomer[o.customerName] = { rev: 0, profit: 0 };
    byCustomer[o.customerName].rev    += (parseFloat(o.totalRevenue) || 0) * r;
    byCustomer[o.customerName].profit += (parseFloat(o.grossProfit)  || 0) * r;
  });

  // ربحية حسب الوجهة
  const byDest = {};
  orders.forEach(o => {
    const r = parseFloat(o.exchangeRate) || 1;
    if (!byDest[o.destination]) byDest[o.destination] = { rev: 0, profit: 0 };
    byDest[o.destination].rev    += (parseFloat(o.totalRevenue) || 0) * r;
    byDest[o.destination].profit += (parseFloat(o.grossProfit)  || 0) * r;
  });

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- ربحية حسب العميل -->
      <div class="card">
        <h3 style="margin-bottom:12px">📊 الربحية حسب العميل</h3>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>العميل</th><th>الإيراد (ج.م)</th><th>الربح (ج.م)</th><th>النسبة %</th></tr></thead>
            <tbody>
              ${Object.entries(byCustomer).length
                ? Object.entries(byCustomer).map(([name, d]) => {
                    const pct = d.rev > 0 ? (d.profit / d.rev * 100) : 0;
                    return `<tr>
                      <td>${name}</td>
                      <td class="number">${formatMoney(d.rev)}</td>
                      <td class="number ${d.profit>=0?'text-success':'text-danger'}">${formatMoney(d.profit)}</td>
                      <td class="number">${pct.toFixed(1)}%</td>
                    </tr>`;
                  }).join('')
                : '<tr><td colspan="4" style="text-align:center">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ربحية حسب الوجهة -->
      <div class="card">
        <h3 style="margin-bottom:12px">🌍 الربحية حسب الوجهة</h3>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>الوجهة</th><th>الإيراد (ج.م)</th><th>الربح (ج.م)</th><th>النسبة %</th></tr></thead>
            <tbody>
              ${Object.entries(byDest).length
                ? Object.entries(byDest).map(([dest, d]) => {
                    const pct = d.rev > 0 ? (d.profit / d.rev * 100) : 0;
                    return `<tr>
                      <td>${dest || 'غير محدد'}</td>
                      <td class="number">${formatMoney(d.rev)}</td>
                      <td class="number ${d.profit>=0?'text-success':'text-danger'}">${formatMoney(d.profit)}</td>
                      <td class="number">${pct.toFixed(1)}%</td>
                    </tr>`;
                  }).join('')
                : '<tr><td colspan="4" style="text-align:center">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- مخطط المقارنة الشهرية -->
    <div class="card">
      <h3 style="margin-bottom:12px">📅 المقارنة الشهرية للإيراد والربح (ج.م)</h3>
      <canvas id="export-monthly-chart" height="100"></canvas>
    </div>
  `;
}

// رسم مخطط المقارنة الشهرية باستخدام Chart.js
function _drawMonthlyChart(orders, rates) {
  if (typeof Chart === 'undefined') return;

  const canvas = document.getElementById('export-monthly-chart');
  if (!canvas) return;

  // تجميع البيانات شهرياً
  const monthly = {};
  orders.forEach(o => {
    if (!o.shippingDate) return;
    const month = o.shippingDate.substring(0, 7); // YYYY-MM
    const r     = parseFloat(o.exchangeRate) || 1;
    if (!monthly[month]) monthly[month] = { rev: 0, profit: 0 };
    monthly[month].rev    += (parseFloat(o.totalRevenue) || 0) * r;
    monthly[month].profit += (parseFloat(o.grossProfit)  || 0) * r;
  });

  const labels  = Object.keys(monthly).sort();
  const revData = labels.map(m => monthly[m].rev);
  const pftData = labels.map(m => monthly[m].profit);

  // تدمير المخطط السابق إذا وجد
  if (_reportChartInstance) {
    _reportChartInstance.destroy();
    _reportChartInstance = null;
  }

  _reportChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'الإيراد',  data: revData, backgroundColor: 'rgba(59,130,246,0.7)' },
        { label: 'الربح',    data: pftData, backgroundColor: 'rgba(16,185,129,0.7)' },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ===== دوال الفلاتر =====
function _setExportFilter(key, value) {
  _exportFilters[key] = value;
  renderExportList();
}

function _clearExportFilters() {
  _exportFilters = { status: '', currency: '', destination: '', dateFrom: '', dateTo: '' };
  renderExportList();
}

// ============================================
// عرض تفاصيل أمر التصدير
// ============================================

function showExportDetail(id) {
  _exportView     = 'detail';
  _exportDetailId = id;

  const order = DB.findById('export_orders', id);
  if (!order) {
    toast('أمر التصدير غير موجود', 'error');
    _exportView = 'list';
    renderExportList();
    return;
  }

  const content = document.getElementById('page-content');
  const cur     = CURRENCIES[order.currency] || { symbol: order.currency, name: order.currency };

  content.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div>
        <h2>تفاصيل أمر التصدير: ${order.exportOrderNo}</h2>
        <p>${_exportStatusBadge(order.status)}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="renderExportList()">← العودة للقائمة</button>
        <button class="btn btn-secondary" onclick="openEditExportModal(${order.id})">✏️ تعديل</button>
        <button class="btn btn-secondary" onclick="printExportOrder(${order.id})">🖨️ تصدير PDF</button>
        <button class="btn btn-secondary" onclick="_emailExportOrder(${order.id})">📧 إرسال بالبريد</button>
      </div>
    </div>

    <!-- بيانات الرأسية -->
    <div class="card" style="margin-bottom:16px">
      <div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
        <div class="form-group">
          <label>رقم الأمر</label>
          <div style="font-weight:700">${order.exportOrderNo}</div>
        </div>
        <div class="form-group">
          <label>العميل</label>
          <div>${order.customerName || '-'}</div>
        </div>
        <div class="form-group">
          <label>وجهة الشحن</label>
          <div>${order.destination || '-'}</div>
        </div>
        <div class="form-group">
          <label>ميناء التحميل</label>
          <div>${order.portOfLoading || '-'}</div>
        </div>
        <div class="form-group">
          <label>ميناء التفريغ</label>
          <div>${order.portOfDischarge || '-'}</div>
        </div>
        <div class="form-group">
          <label>رقم بوليصة الشحن</label>
          <div>${order.billOfLading || '-'}</div>
        </div>
        <div class="form-group">
          <label>تاريخ الشحن</label>
          <div>${formatDate(order.shippingDate)}</div>
        </div>
        <div class="form-group">
          <label>تاريخ التسليم المتوقع</label>
          <div>${formatDate(order.deliveryDate)}</div>
        </div>
        <div class="form-group">
          <label>العملة</label>
          <div>${cur.name} (${cur.symbol})</div>
        </div>
        <div class="form-group">
          <label>سعر الصرف (للجنيه)</label>
          <div>${order.exchangeRate || 1}</div>
        </div>
      </div>
      ${order.notes ? `<div style="margin-top:12px;padding:10px;background:var(--bg-secondary);border-radius:8px"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
    </div>

    <!-- جدول البنود -->
    <div class="card" style="margin-bottom:16px;padding:0">
      <div style="padding:16px 16px 0"><h3>📦 بنود الأمر</h3></div>
      <div class="data-table-wrapper">
        <table>
          <thead><tr>
            <th>البيان</th>
            <th>الكمية</th>
            <th>الوحدة</th>
            <th>سعر الوحدة (${cur.symbol})</th>
            <th>الإجمالي (${cur.symbol})</th>
            <th>تكلفة الشراء</th>
            <th>تكلفة التصنيع</th>
            <th>نقل محلي</th>
            <th>شحن دولي</th>
            <th>جمارك</th>
            <th>عمولات</th>
            <th>تكاليف أخرى</th>
            <th>إجمالي التكلفة</th>
            <th>هامش الربح</th>
          </tr></thead>
          <tbody>
            ${(order.items || []).map(item => {
              const qty   = parseFloat(item.quantity)  || 0;
              const price = parseFloat(item.unitPrice) || 0;
              const rev   = qty * price;
              const cost  =
                (parseFloat(item.purchaseCost)      || 0) +
                (parseFloat(item.manufacturingCost) || 0) +
                (parseFloat(item.transportCostLocal)|| 0) +
                (parseFloat(item.shippingCost)      || 0) +
                (parseFloat(item.customsCost)       || 0) +
                (parseFloat(item.commissions)       || 0) +
                (parseFloat(item.otherCosts)        || 0);
              const margin = rev - cost;
              return `<tr>
                <td>${item.description || '-'}</td>
                <td class="number">${qty}</td>
                <td>${item.unit || '-'}</td>
                <td class="number">${formatMoney(price)}</td>
                <td class="number"><strong>${formatMoney(rev)}</strong></td>
                <td class="number">${formatMoney(item.purchaseCost)}</td>
                <td class="number">${formatMoney(item.manufacturingCost)}</td>
                <td class="number">${formatMoney(item.transportCostLocal)}</td>
                <td class="number">${formatMoney(item.shippingCost)}</td>
                <td class="number">${formatMoney(item.customsCost)}</td>
                <td class="number">${formatMoney(item.commissions)}</td>
                <td class="number">${formatMoney(item.otherCosts)}</td>
                <td class="number text-warning">${formatMoney(cost)}</td>
                <td class="number ${margin>=0?'text-success':'text-danger'}">${formatMoney(margin)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ملخص الربحية -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:16px">
      <div class="kpi-card">
        <div class="kpi-icon">💵</div>
        <div class="kpi-info">
          <div class="kpi-value">${cur.symbol} ${formatMoney(order.totalRevenue)}</div>
          <div class="kpi-label">إجمالي الإيراد</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📉</div>
        <div class="kpi-info">
          <div class="kpi-value">${cur.symbol} ${formatMoney(order.totalCost)}</div>
          <div class="kpi-label">إجمالي التكلفة</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📈</div>
        <div class="kpi-info">
          <div class="kpi-value" style="color:${order.grossProfit>=0?'var(--success)':'var(--danger)'}">${cur.symbol} ${formatMoney(order.grossProfit)}</div>
          <div class="kpi-label">الربح الإجمالي</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">%</div>
        <div class="kpi-info">
          <div class="kpi-value" style="color:${order.grossProfitPct>=0?'var(--success)':'var(--danger)'}">${(parseFloat(order.grossProfitPct)||0).toFixed(1)}%</div>
          <div class="kpi-label">صافي الربح %</div>
        </div>
      </div>
    </div>

    <!-- تحديث الحالة -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <strong>تحديث الحالة:</strong>
        <select id="detail-status-select" style="flex:1;min-width:150px;max-width:250px">
          ${Object.entries(EXPORT_STATUSES).map(([k,v]) =>
            `<option value="${k}" ${order.status===k?'selected':''}>${v.label}</option>`
          ).join('')}
        </select>
        <button class="btn btn-primary" onclick="_updateExportStatus(${order.id})">حفظ الحالة</button>
      </div>
    </div>
  `;
}

// تحديث حالة أمر التصدير من صفحة التفاصيل
function _updateExportStatus(id) {
  const sel   = document.getElementById('detail-status-select');
  if (!sel) return;
  const order = DB.findById('export_orders', id);
  if (!order) return;
  order.status = sel.value;
  DB.save('export_orders', order);
  toast('تم تحديث الحالة بنجاح', 'success');
  showExportDetail(id);
}

// ============================================
// نافذة الإضافة / التعديل
// ============================================

function openNewExportModal() {
  const customers = DB.getAll('customers');
  const nextNo    = _generateExportOrderNo();

  openModal('أمر تصدير جديد', _buildExportModalHTML({
    exportOrderNo: nextNo,
    customerId: '',
    destination: '',
    currency: 'USD',
    exchangeRate: 50,
    shippingDate: '',
    deliveryDate: '',
    portOfLoading: '',
    portOfDischarge: '',
    billOfLading: '',
    status: 'draft',
    notes: '',
    items: [_emptyItem()],
  }, customers, false));
}

function openEditExportModal(id) {
  const order     = DB.findById('export_orders', id);
  if (!order) { toast('الأمر غير موجود', 'error'); return; }
  const customers = DB.getAll('customers');

  openModal('تعديل أمر التصدير', _buildExportModalHTML(order, customers, true));
}

// توليد رقم أمر تصدير تلقائي
function _generateExportOrderNo() {
  const year   = new Date().getFullYear();
  const orders = DB.getAll('export_orders');
  const max    = orders.reduce((m, o) => {
    const match = (o.exportOrderNo || '').match(/EXP-\d{4}-(\d+)/);
    return match ? Math.max(m, parseInt(match[1])) : m;
  }, 0);
  return `EXP-${year}-${String(max + 1).padStart(3, '0')}`;
}

// عنصر بند فارغ
function _emptyItem() {
  return {
    description: '', quantity: 1, unit: 'م²', unitPrice: 0, totalPrice: 0,
    purchaseCost: 0, manufacturingCost: 0, transportCostLocal: 0,
    shippingCost: 0, customsCost: 0, commissions: 0, otherCosts: 0,
  };
}

// بناء HTML نافذة الإضافة/التعديل
function _buildExportModalHTML(order, customers, isEdit) {
  const id = isEdit ? order.id : '';

  return `
    <form id="export-form" onsubmit="_submitExportForm(event, ${id})">
      <div style="max-height:75vh;overflow-y:auto;padding-right:4px">

        <!-- بيانات الرأسية -->
        <fieldset style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
          <legend style="padding:0 8px;font-weight:600">بيانات الأمر</legend>
          <div class="form-grid">
            <div class="form-group">
              <label>رقم الأمر <span style="color:var(--danger)">*</span></label>
              <input type="text" name="exportOrderNo" value="${order.exportOrderNo}" required>
            </div>
            <div class="form-group">
              <label>العميل <span style="color:var(--danger)">*</span></label>
              <select name="customerId" required onchange="_onExportCustomerChange(this)">
                <option value="">-- اختر العميل --</option>
                ${customers.map(c => `<option value="${c.id}" data-name="${c.name}" ${order.customerId==c.id?'selected':''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>وجهة الشحن <span style="color:var(--danger)">*</span></label>
              <input type="text" name="destination" value="${order.destination || ''}" required placeholder="مثال: دبي، الإمارات">
            </div>
            <div class="form-group">
              <label>الحالة</label>
              <select name="status">
                ${Object.entries(EXPORT_STATUSES).map(([k,v]) => `<option value="${k}" ${order.status===k?'selected':''}>${v.label}</option>`).join('')}
              </select>
            </div>
          </div>
        </fieldset>

        <!-- بيانات الشحن -->
        <fieldset style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
          <legend style="padding:0 8px;font-weight:600">بيانات الشحن</legend>
          <div class="form-grid">
            <div class="form-group">
              <label>ميناء التحميل</label>
              <input type="text" name="portOfLoading" value="${order.portOfLoading || ''}" placeholder="مثال: ميناء الإسكندرية">
            </div>
            <div class="form-group">
              <label>ميناء التفريغ</label>
              <input type="text" name="portOfDischarge" value="${order.portOfDischarge || ''}" placeholder="مثال: ميناء جبل علي">
            </div>
            <div class="form-group">
              <label>رقم بوليصة الشحن</label>
              <input type="text" name="billOfLading" value="${order.billOfLading || ''}">
            </div>
            <div class="form-group">
              <label>تاريخ الشحن</label>
              <input type="date" name="shippingDate" value="${order.shippingDate || ''}">
            </div>
            <div class="form-group">
              <label>تاريخ التسليم المتوقع</label>
              <input type="date" name="deliveryDate" value="${order.deliveryDate || ''}">
            </div>
          </div>
        </fieldset>

        <!-- بيانات العملة -->
        <fieldset style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
          <legend style="padding:0 8px;font-weight:600">العملة وسعر الصرف</legend>
          <div class="form-grid">
            <div class="form-group">
              <label>العملة <span style="color:var(--danger)">*</span></label>
              <select name="currency" required onchange="_onExportCurrencyChange()">
                ${Object.entries(CURRENCIES).map(([k,v]) => `<option value="${k}" ${order.currency===k?'selected':''}>${v.name} (${v.symbol})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>سعر الصرف (وحدة بالجنيه)</label>
              <input type="number" name="exchangeRate" id="export-exchange-rate" value="${order.exchangeRate || 1}" min="0.001" step="0.001">
            </div>
          </div>
        </fieldset>

        <!-- البنود -->
        <fieldset style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
          <legend style="padding:0 8px;font-weight:600">بنود الأمر</legend>
          <div id="export-items-container">
            ${(order.items || []).map((item, idx) => _buildItemRowHTML(item, idx)).join('')}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="_addExportItem()">＋ إضافة بند</button>
        </fieldset>

        <!-- ملخص الحسابات -->
        <div class="card" id="export-totals-summary" style="margin-bottom:12px;background:var(--bg-secondary)">
          <div style="display:flex;gap:24px;flex-wrap:wrap">
            <div><strong>الإيراد:</strong> <span id="et-revenue">0</span></div>
            <div><strong>التكلفة:</strong> <span id="et-cost">0</span></div>
            <div><strong>الربح:</strong>    <span id="et-profit">0</span></div>
            <div><strong>النسبة:</strong>   <span id="et-pct">0%</span></div>
          </div>
        </div>

        <!-- ملاحظات -->
        <div class="form-group">
          <label>ملاحظات</label>
          <textarea name="notes" rows="2" style="width:100%">${order.notes || ''}</textarea>
        </div>

      </div><!-- /scroll -->

      <!-- أزرار الحفظ -->
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary">💾 حفظ الأمر</button>
      </div>
    </form>
  `;
}

// HTML صف بند واحد في النموذج
function _buildItemRowHTML(item, idx) {
  return `
    <div class="export-item-row" data-idx="${idx}" style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong style="font-size:13px">البند ${idx + 1}</strong>
        <button type="button" class="btn btn-danger btn-sm" onclick="_removeExportItem(${idx})" title="حذف البند">✕</button>
      </div>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
        <div class="form-group" style="grid-column:span 2">
          <label>البيان</label>
          <input type="text" name="item_description_${idx}" value="${item.description||''}" placeholder="وصف البند">
        </div>
        <div class="form-group">
          <label>الكمية</label>
          <input type="number" name="item_quantity_${idx}" value="${item.quantity||1}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>الوحدة</label>
          <input type="text" name="item_unit_${idx}" value="${item.unit||'م²'}">
        </div>
        <div class="form-group">
          <label>سعر الوحدة</label>
          <input type="number" name="item_unitPrice_${idx}" value="${item.unitPrice||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>تكلفة الشراء</label>
          <input type="number" name="item_purchaseCost_${idx}" value="${item.purchaseCost||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>تكلفة التصنيع</label>
          <input type="number" name="item_manufacturingCost_${idx}" value="${item.manufacturingCost||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>نقل محلي</label>
          <input type="number" name="item_transportCostLocal_${idx}" value="${item.transportCostLocal||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>شحن دولي</label>
          <input type="number" name="item_shippingCost_${idx}" value="${item.shippingCost||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>جمارك</label>
          <input type="number" name="item_customsCost_${idx}" value="${item.customsCost||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>عمولات</label>
          <input type="number" name="item_commissions_${idx}" value="${item.commissions||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
        <div class="form-group">
          <label>تكاليف أخرى</label>
          <input type="number" name="item_otherCosts_${idx}" value="${item.otherCosts||0}" min="0" step="0.01" oninput="_recalcExportTotals()">
        </div>
      </div>
    </div>
  `;
}

// إضافة بند جديد في النموذج
function _addExportItem() {
  const container = document.getElementById('export-items-container');
  if (!container) return;
  const idx = container.querySelectorAll('.export-item-row').length;
  const div = document.createElement('div');
  div.innerHTML = _buildItemRowHTML(_emptyItem(), idx);
  container.appendChild(div.firstElementChild);
}

// حذف بند من النموذج
function _removeExportItem(idx) {
  const container = document.getElementById('export-items-container');
  if (!container) return;
  const rows = container.querySelectorAll('.export-item-row');
  if (rows.length <= 1) { toast('يجب أن يحتوي الأمر على بند واحد على الأقل', 'warning'); return; }
  rows[idx]?.remove();
  // إعادة ترقيم البنود
  container.querySelectorAll('.export-item-row').forEach((row, i) => {
    row.dataset.idx = i;
    row.querySelector('strong').textContent = `البند ${i + 1}`;
    row.querySelectorAll('[name]').forEach(input => {
      input.name = input.name.replace(/_\d+$/, `_${i}`);
    });
    const delBtn = row.querySelector('button');
    if (delBtn) delBtn.setAttribute('onclick', `_removeExportItem(${i})`);
  });
  _recalcExportTotals();
}

// إعادة حساب المجاميع في الوقت الفعلي
function _recalcExportTotals() {
  const container = document.getElementById('export-items-container');
  if (!container) return;

  const items = _collectItemsFromForm(container);
  const { totalRevenue, totalCost, grossProfit, grossProfitPct } = calcOrderTotals(items);

  const elRev    = document.getElementById('et-revenue');
  const elCost   = document.getElementById('et-cost');
  const elProfit = document.getElementById('et-profit');
  const elPct    = document.getElementById('et-pct');

  if (elRev)    elRev.textContent    = formatMoney(totalRevenue);
  if (elCost)   elCost.textContent   = formatMoney(totalCost);
  if (elProfit) {
    elProfit.textContent  = formatMoney(grossProfit);
    elProfit.style.color  = grossProfit >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  if (elPct) {
    elPct.textContent = grossProfitPct.toFixed(1) + '%';
    elPct.style.color = grossProfitPct >= 0 ? 'var(--success)' : 'var(--danger)';
  }
}

// تعيين اسم العميل عند تغيير القائمة المنسدلة
function _onExportCustomerChange(select) {
  // لا عمل إضافي مطلوب — القيمة ستُقرأ عند الحفظ
}

// تغيير العملة (يمكن توسيعه لجلب سعر الصرف آلياً)
function _onExportCurrencyChange() {
  // نقطة توسيع مستقبلية: جلب سعر الصرف تلقائياً
}

// ===== قراءة البنود من النموذج =====
function _collectItemsFromForm(container) {
  const rows  = container.querySelectorAll('.export-item-row');
  const items = [];

  rows.forEach((row, idx) => {
    const g = (name) => {
      const el = row.querySelector(`[name="${name}_${idx}"]`);
      return el ? el.value : '';
    };
    items.push({
      description:        g('item_description'),
      quantity:           parseFloat(g('item_quantity'))          || 0,
      unit:               g('item_unit')                          || 'م²',
      unitPrice:          parseFloat(g('item_unitPrice'))         || 0,
      totalPrice:         (parseFloat(g('item_quantity')) || 0) * (parseFloat(g('item_unitPrice')) || 0),
      purchaseCost:       parseFloat(g('item_purchaseCost'))      || 0,
      manufacturingCost:  parseFloat(g('item_manufacturingCost')) || 0,
      transportCostLocal: parseFloat(g('item_transportCostLocal'))|| 0,
      shippingCost:       parseFloat(g('item_shippingCost'))      || 0,
      customsCost:        parseFloat(g('item_customsCost'))       || 0,
      commissions:        parseFloat(g('item_commissions'))       || 0,
      otherCosts:         parseFloat(g('item_otherCosts'))        || 0,
    });
  });

  return items;
}

// ===== حفظ النموذج =====
function _submitExportForm(event, editId) {
  event.preventDefault();
  const form = event.target;
  const fd   = new FormData(form);

  // قراءة بيانات الرأسية
  const customerSel  = form.querySelector('[name="customerId"]');
  const selectedOpt  = customerSel?.options[customerSel.selectedIndex];
  const customerName = selectedOpt?.dataset.name || selectedOpt?.text || '';

  const data = {
    exportOrderNo:   fd.get('exportOrderNo')?.trim() || '',
    customerId:      parseInt(fd.get('customerId'))  || 0,
    customerName,
    destination:     fd.get('destination')?.trim()   || '',
    currency:        fd.get('currency')              || 'USD',
    exchangeRate:    parseFloat(fd.get('exchangeRate')) || 1,
    shippingDate:    fd.get('shippingDate')           || '',
    deliveryDate:    fd.get('deliveryDate')            || '',
    portOfLoading:   fd.get('portOfLoading')?.trim()  || '',
    portOfDischarge: fd.get('portOfDischarge')?.trim() || '',
    billOfLading:    fd.get('billOfLading')?.trim()    || '',
    status:          fd.get('status')                  || 'draft',
    notes:           fd.get('notes')?.trim()           || '',
  };

  // التحقق من الحقول المطلوبة
  if (!data.exportOrderNo) { toast('رقم الأمر مطلوب',   'error'); return; }
  if (!data.customerId)    { toast('يرجى اختيار العميل', 'error'); return; }
  if (!data.destination)   { toast('وجهة الشحن مطلوبة',  'error'); return; }

  // تفادي تكرار رقم الأمر
  const existing = DB.getAll('export_orders').find(
    o => o.exportOrderNo === data.exportOrderNo && o.id !== editId
  );
  if (existing) { toast('رقم الأمر موجود مسبقاً، يرجى تغييره', 'error'); return; }

  // قراءة البنود
  const container = document.getElementById('export-items-container');
  const items     = _collectItemsFromForm(container);
  if (!items.length) { toast('يجب إضافة بند واحد على الأقل', 'error'); return; }

  // حساب المجاميع
  const { totalRevenue, totalCost, grossProfit, grossProfitPct } = calcOrderTotals(items);

  const record = {
    ...data,
    items,
    totalRevenue,
    totalCost,
    grossProfit,
    grossProfitPct,
    createdAt: editId ? (DB.findById('export_orders', editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
  };

  if (editId) {
    record.id = editId;
    DB.save('export_orders', record);
    toast('تم تحديث أمر التصدير بنجاح', 'success');
  } else {
    record.id = DB.nextId('export_orders');
    DB.save('export_orders', record);
    toast('تم إنشاء أمر التصدير بنجاح', 'success');
  }

  closeModal();
  renderExportList();
}

// ============================================
// حذف أمر التصدير
// ============================================

function deleteExportOrder(id) {
  const order = DB.findById('export_orders', id);
  if (!order) return;

  if (!confirm(`هل أنت متأكد من حذف أمر التصدير ${order.exportOrderNo}؟\nلا يمكن التراجع عن هذا الإجراء.`)) return;

  DB.remove('export_orders', id);
  toast('تم حذف أمر التصدير', 'success');

  // العودة للقائمة إذا كنا في صفحة التفاصيل
  if (_exportView === 'detail' && _exportDetailId === id) {
    _exportView     = 'list';
    _exportDetailId = null;
  }
  renderExportList();
}

// ============================================
// طباعة / تصدير PDF
// ============================================

function printExportOrder(id) {
  const order = DB.findById('export_orders', id);
  if (!order) { toast('الأمر غير موجود', 'error'); return; }

  const cur = CURRENCIES[order.currency] || { symbol: order.currency, name: order.currency };
  const settings = DB.getAll('settings') || {};
  const companyName = settings.company_name || 'شركة الرخام والجرانيت';

  const win = window.open('', '_blank');
  if (!win) { toast('يرجى السماح بالنوافذ المنبثقة لتصدير PDF', 'error'); return; }

  const itemsHTML = (order.items || []).map((item, i) => {
    const qty   = parseFloat(item.quantity)  || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const rev   = qty * price;
    const cost  =
      (parseFloat(item.purchaseCost)      || 0) +
      (parseFloat(item.manufacturingCost) || 0) +
      (parseFloat(item.transportCostLocal)|| 0) +
      (parseFloat(item.shippingCost)      || 0) +
      (parseFloat(item.customsCost)       || 0) +
      (parseFloat(item.commissions)       || 0) +
      (parseFloat(item.otherCosts)        || 0);
    return `<tr>
      <td>${i+1}</td>
      <td>${item.description||'-'}</td>
      <td>${qty}</td>
      <td>${item.unit||'م²'}</td>
      <td>${formatMoney(price)}</td>
      <td><strong>${formatMoney(rev)}</strong></td>
      <td>${formatMoney(cost)}</td>
      <td>${formatMoney(rev-cost)}</td>
    </tr>`;
  }).join('');

  win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>أمر تصدير ${order.exportOrderNo}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #1a1a2e; margin: 20px; }
    h1 { text-align: center; color: #0f3460; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; }
    .header-item { background: #f8f9fa; padding: 8px 12px; border-radius: 6px; }
    .header-item label { font-size: 11px; color: #666; display: block; }
    .header-item span  { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #0f3460; color: #fff; padding: 8px; text-align: center; }
    td { padding: 6px 8px; border: 1px solid #ddd; text-align: center; }
    tr:nth-child(even) { background: #f8f9fa; }
    .totals { display: flex; gap: 16px; margin-top: 16px; flex-wrap: wrap; }
    .total-box { background: #f0f4ff; border-radius: 8px; padding: 12px 20px; flex: 1; min-width: 120px; text-align: center; }
    .total-box .label { font-size: 11px; color: #666; }
    .total-box .value { font-size: 18px; font-weight: 700; color: #0f3460; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #999; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>${companyName}</h1>
  <h2 style="text-align:center;color:#666">أمر تصدير — ${order.exportOrderNo}</h2>

  <div class="header-grid">
    <div class="header-item"><label>العميل</label><span>${order.customerName||'-'}</span></div>
    <div class="header-item"><label>وجهة الشحن</label><span>${order.destination||'-'}</span></div>
    <div class="header-item"><label>ميناء التحميل</label><span>${order.portOfLoading||'-'}</span></div>
    <div class="header-item"><label>ميناء التفريغ</label><span>${order.portOfDischarge||'-'}</span></div>
    <div class="header-item"><label>تاريخ الشحن</label><span>${formatDate(order.shippingDate)}</span></div>
    <div class="header-item"><label>تاريخ التسليم</label><span>${formatDate(order.deliveryDate)}</span></div>
    <div class="header-item"><label>بوليصة الشحن</label><span>${order.billOfLading||'-'}</span></div>
    <div class="header-item"><label>العملة / سعر الصرف</label><span>${cur.name} — ${order.exchangeRate||1} ج.م</span></div>
  </div>

  <table>
    <thead><tr>
      <th>#</th><th>البيان</th><th>الكمية</th><th>الوحدة</th>
      <th>سعر الوحدة (${cur.symbol})</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th>
    </tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="totals">
    <div class="total-box">
      <div class="label">إجمالي الإيراد</div>
      <div class="value">${cur.symbol} ${formatMoney(order.totalRevenue)}</div>
    </div>
    <div class="total-box">
      <div class="label">إجمالي التكلفة</div>
      <div class="value">${cur.symbol} ${formatMoney(order.totalCost)}</div>
    </div>
    <div class="total-box">
      <div class="label">الربح الإجمالي</div>
      <div class="value" style="color:${order.grossProfit>=0?'#10b981':'#ef4444'}">${cur.symbol} ${formatMoney(order.grossProfit)}</div>
    </div>
    <div class="total-box">
      <div class="label">صافي الربح %</div>
      <div class="value" style="color:${order.grossProfitPct>=0?'#10b981':'#ef4444'}">${(parseFloat(order.grossProfitPct)||0).toFixed(1)}%</div>
    </div>
  </div>

  ${order.notes ? `<div style="margin-top:16px;padding:10px;background:#fffbeb;border-radius:6px"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}

  <div class="footer">
    <p>تم الإصدار بتاريخ: ${new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' })}</p>
    <p>${companyName} — نظام إدارة التصدير</p>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
  win.document.close();
  toast('جاري فتح نافذة الطباعة — اختر "حفظ كـ PDF"', 'success');
}

// ============================================
// إرسال بريد إلكتروني
// ============================================

function _emailExportOrder(id) {
  const order = DB.findById('export_orders', id);
  if (!order) return;

  // البحث عن بريد العميل
  const customer = DB.findById('customers', order.customerId);
  const email    = customer?.email || '';

  emailExportOrder(order, email);
}

function emailExportOrder(order, customerEmail) {
  const cur     = CURRENCIES[order.currency] || { symbol: order.currency };
  const subject = encodeURIComponent(`أمر تصدير ${order.exportOrderNo}`);
  const body    = encodeURIComponent(
    `عزيزي العميل ${order.customerName}،\n\n` +
    `يسعدنا إخطاركم بتفاصيل أمر التصدير رقم: ${order.exportOrderNo}\n\n` +
    `وجهة الشحن: ${order.destination || '-'}\n` +
    `ميناء التحميل: ${order.portOfLoading || '-'}\n` +
    `ميناء التفريغ: ${order.portOfDischarge || '-'}\n` +
    `تاريخ الشحن: ${order.shippingDate || '-'}\n` +
    `تاريخ التسليم المتوقع: ${order.deliveryDate || '-'}\n` +
    `بوليصة الشحن: ${order.billOfLading || '-'}\n\n` +
    `إجمالي الإيراد: ${cur.symbol} ${formatMoney(order.totalRevenue)}\n\n` +
    `نتطلع إلى استمرار تعاملكم معنا.\n\nمع تحياتنا،\nفريق التصدير`
  );

  if (customerEmail) {
    window.open(`mailto:${customerEmail}?subject=${subject}&body=${body}`);
  } else {
    // فتح عميل البريد بدون مستلم إذا لم يُوجد بريد
    window.open(`mailto:?subject=${subject}&body=${body}`);
    toast('لم يُسجَّل بريد للعميل — يمكنك إدخاله يدوياً', 'warning');
  }
}

// ============================================
// تصدير Excel
// ============================================

function exportOrdersExcel() {
  const orders = DB.getAll('export_orders');
  if (!orders.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('مكتبة Excel غير محملة', 'error'); return; }

  const rows = orders.map(o => ({
    'رقم الأمر':          o.exportOrderNo,
    'العميل':             o.customerName,
    'الوجهة':             o.destination,
    'العملة':             o.currency,
    'سعر الصرف':          o.exchangeRate,
    'تاريخ الشحن':        o.shippingDate,
    'تاريخ التسليم':      o.deliveryDate,
    'ميناء التحميل':      o.portOfLoading,
    'ميناء التفريغ':      o.portOfDischarge,
    'بوليصة الشحن':       o.billOfLading,
    'إجمالي الإيراد':     o.totalRevenue,
    'إجمالي التكلفة':     o.totalCost,
    'الربح الإجمالي':     o.grossProfit,
    'نسبة الربح %':       parseFloat(o.grossProfitPct||0).toFixed(2),
    'الحالة':             EXPORT_STATUSES[o.status]?.label || o.status,
    'ملاحظات':            o.notes,
    'تاريخ الإنشاء':      o.createdAt,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'أوامر التصدير');
  XLSX.writeFile(wb, `export_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('تم تصدير Excel بنجاح', 'success');
}

// ============================================
// شارة حالة التصدير
// ============================================

function _exportStatusBadge(status) {
  const s = EXPORT_STATUSES[status];
  if (!s) return `<span class="badge badge-info">${status || '-'}</span>`;
  return `<span class="badge ${s.badge}">${s.label}</span>`;
}
