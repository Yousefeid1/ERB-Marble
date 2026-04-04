// ============================================
// وحدة أداء المبيعات – Sales Performance Module
// ============================================

// isSalespersonOnly is defined in sales.js which loads first; provide a fallback
// in case this module is ever loaded standalone.
if (typeof isSalespersonOnly === 'undefined') {
  // eslint-disable-next-line no-inner-declarations
  function isSalespersonOnly() {
    const role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
    return role === 'موظف مبيعات';
  }
}

async function renderSalesPerformance() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loader"></div>';
  try {
    const data = await api.salesPerformance();
    window._spLastData = data;
    _renderSalesPerformanceHTML(data);
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function _renderSalesPerformanceHTML(data) {
  const content = document.getElementById('page-content');
  const now = new Date();
  const monthLabel = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  // KPI cards
  const kpiHTML = `
    <div class="report-summary">
      <div class="summary-box gold">
        <div class="label">إجمالي المبيعات</div>
        <div class="value">${formatMoney(data.total_sales)}</div>
      </div>
      <div class="summary-box">
        <div class="label">عدد الفواتير</div>
        <div class="value">${data.total_count}</div>
      </div>
      <div class="summary-box profit">
        <div class="label">عدد السيلز</div>
        <div class="value">${data.bySalesperson.filter(s => s.id).length}</div>
      </div>
      <div class="summary-box">
        <div class="label">المناطق النشطة</div>
        <div class="value">${data.byRegion.length}</div>
      </div>
    </div>
  `;

  // Salesperson table
  const spRows = data.bySalesperson.map((sp, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${sp.name}</strong></td>
      <td class="number">${sp.count}</td>
      <td class="number">${formatMoney(sp.total)}</td>
      <td class="number text-success">${formatMoney(sp.paid)}</td>
      <td class="number ${sp.total - sp.paid > 0 ? 'text-danger' : 'text-success'}">${formatMoney(sp.total - sp.paid)}</td>
      <td>
        <div style="background:var(--bg-secondary);border-radius:4px;height:8px;overflow:hidden">
          <div style="height:8px;background:var(--accent);border-radius:4px;width:${data.total_sales > 0 ? Math.min(100, (sp.total / data.total_sales * 100)).toFixed(1) : 0}%"></div>
        </div>
        <small class="text-muted">${data.total_sales > 0 ? (sp.total / data.total_sales * 100).toFixed(1) : 0}%</small>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" class="text-center text-muted">لا توجد بيانات</td></tr>`;

  // Products table
  const prodRows = data.topProducts.slice(0, 8).map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${p.name}</strong></td>
      <td class="number">${p.qty}</td>
      <td class="number">${formatMoney(p.total)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="text-center text-muted">لا توجد بيانات</td></tr>`;

  // Region table
  const regionRows = data.byRegion.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.region}</strong></td>
      <td class="number">${r.count}</td>
      <td class="number">${formatMoney(r.total)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="text-center text-muted">لا توجد بيانات</td></tr>`;

  // Customer type table
  const typeRows = data.byCustomerType.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="badge badge-info">${t.type}</span></td>
      <td class="number">${t.count}</td>
      <td class="number">${formatMoney(t.total)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="text-center text-muted">لا توجد بيانات</td></tr>`;

  // Commission table
  const commRows = data.commissionSummary.length
    ? data.commissionSummary.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td class="number text-warning">${formatMoney(c.pending)}</td>
        <td class="number text-success">${formatMoney(c.paid)}</td>
        <td class="number">${formatMoney(c.pending + c.paid)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="5" class="text-center text-muted">لا توجد عمولات محسوبة بعد</td></tr>`;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h2>📊 أداء المبيعات</h2>
        <p>تحليل شامل لأداء فريق المبيعات والمنتجات والمناطق</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="exportSalesPerformancePDF()">📄 PDF</button>
        <button class="btn btn-secondary" onclick="exportSalesPerformanceExcel()">📊 Excel</button>
      </div>
    </div>

    ${kpiHTML}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <!-- Monthly Trend Chart -->
      <div class="card">
        <h3 style="margin-bottom:12px;font-size:15px">📈 الاتجاه الشهري</h3>
        <canvas id="sp-monthly-chart" height="180"></canvas>
      </div>
      <!-- Salesperson Share Chart -->
      <div class="card">
        <h3 style="margin-bottom:12px;font-size:15px">🥇 حصص السيلز</h3>
        <canvas id="sp-share-chart" height="180"></canvas>
      </div>
    </div>

    <!-- Salesperson Performance Table -->
    <div class="card" style="padding:0;margin-bottom:16px">
      <div style="padding:16px 16px 8px;font-weight:700;font-size:15px">👤 أداء موظفي المبيعات</div>
      <div class="data-table-wrapper">
        <table>
          <thead><tr>
            <th>#</th><th>السيلز</th><th>الفواتير</th>
            <th>إجمالي المبيعات</th><th>المحصل</th><th>المتبقي</th><th>الحصة</th>
          </tr></thead>
          <tbody>${spRows}</tbody>
        </table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <!-- Top Products -->
      <div class="card" style="padding:0">
        <div style="padding:16px 16px 8px;font-weight:700;font-size:15px">🏆 أعلى المنتجات مبيعاً</div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>الإيرادات</th></tr></thead>
            <tbody>${prodRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Sales by Region -->
      <div class="card" style="padding:0">
        <div style="padding:16px 16px 8px;font-weight:700;font-size:15px">🗺️ المبيعات حسب المنطقة</div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>#</th><th>المنطقة</th><th>الطلبات</th><th>الإجمالي</th></tr></thead>
            <tbody>${regionRows}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <!-- Customer Type -->
      <div class="card" style="padding:0">
        <div style="padding:16px 16px 8px;font-weight:700;font-size:15px">🏷️ المبيعات حسب نوع العميل</div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>#</th><th>النوع</th><th>الطلبات</th><th>الإجمالي</th></tr></thead>
            <tbody>${typeRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Commissions -->
      <div class="card" style="padding:0">
        <div style="padding:16px 16px 8px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:700;font-size:15px">💰 ملخص العمولات</span>
          <button class="btn btn-sm btn-primary" onclick="showPage('commissions')">عرض الكل</button>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>#</th><th>السيلز</th><th>معلقة</th><th>مصروفة</th><th>الإجمالي</th></tr></thead>
            <tbody>${commRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Draw charts after DOM update
  setTimeout(() => {
    _drawMonthlyTrendChart(data.monthlyTrend);
    _drawSalespersonShareChart(data.bySalesperson);
  }, 100);
}

function _drawMonthlyTrendChart(monthlyTrend) {
  const canvas = document.getElementById('sp-monthly-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const labels = monthlyTrend.map(m => m.month);
  const values = monthlyTrend.map(m => m.total);
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'المبيعات',
        data: values,
        backgroundColor: 'rgba(212, 175, 55, 0.7)',
        borderColor: '#d4af37',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => (v / 1000).toFixed(1) + 'k' } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

function _drawSalespersonShareChart(bySalesperson) {
  const canvas = document.getElementById('sp-share-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const top = bySalesperson.filter(s => s.id).slice(0, 6);
  if (!top.length) return;
  const COLORS = ['#d4af37','#4CAF50','#2196F3','#FF9800','#E91E63','#9C27B0'];
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: top.map(s => s.name),
      datasets: [{
        data: top.map(s => s.total),
        backgroundColor: COLORS.slice(0, top.length),
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.label}: ${formatMoney(ctx.raw)}` }
        }
      }
    }
  });
}

// ===== COMMISSIONS PAGE =====
async function renderCommissions() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loader"></div>';
  try {
    const users       = await api.users();
    const salespeople = users.filter(u => ['موظف مبيعات', 'مدير مبيعات'].includes(u.role));

    // Salesperson only sees their own commissions
    const params = isSalespersonOnly() ? { salesperson_id: currentUser.id } : {};
    const commissions = await api.commissions(params);

    const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_amount, 0);
    const totalPaid    = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission_amount, 0);

    const rows = commissions.map(c => `
      <tr>
        <td class="number">${c.invoice_number}</td>
        <td><strong>${c.salesperson_name}</strong></td>
        <td>${c.customer}</td>
        <td class="number">${formatMoney(c.sale_amount)}</td>
        <td class="number">${c.commission_rate}%</td>
        <td class="number text-warning"><strong>${formatMoney(c.commission_amount)}</strong></td>
        <td>${c.status === 'paid'
          ? `<span class="badge badge-success">مصروفة</span>`
          : `<span class="badge badge-warning">معلقة</span>`}</td>
        <td>${formatDate(c.created_at)}</td>
        <td>
          ${c.status === 'pending' && canUserChangeInvoiceStatus()
            ? `<button class="btn btn-sm btn-success" onclick="payCommission(${c.id})">✓ صرف</button>`
            : ''}
        </td>
      </tr>
    `).join('') || `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="empty-icon">💰</div><h3>لا توجد عمولات</h3><p>ستظهر العمولات تلقائياً عند سداد الفواتير</p></div></td></tr>`;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>💰 إدارة العمولات</h2><p>متابعة وصرف عمولات موظفي المبيعات</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportCommissionsExcel()">📊 Excel</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box gold">
          <div class="label">إجمالي العمولات</div>
          <div class="value">${formatMoney(totalPending + totalPaid)}</div>
        </div>
        <div class="summary-box loss">
          <div class="label">معلقة (لم تُصرف)</div>
          <div class="value">${formatMoney(totalPending)}</div>
        </div>
        <div class="summary-box profit">
          <div class="label">مصروفة</div>
          <div class="value">${formatMoney(totalPaid)}</div>
        </div>
        <div class="summary-box">
          <div class="label">عدد المعاملات</div>
          <div class="value">${commissions.length}</div>
        </div>
      </div>

      <div class="filters-bar">
        ${!isSalespersonOnly() ? `
        <select id="comm-sp-filter" onchange="filterCommissions()">
          <option value="">كل السيلز</option>
          ${salespeople.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
        </select>` : ''}
        <select id="comm-status-filter" onchange="filterCommissions()">
          <option value="">كل الحالات</option>
          <option value="pending">معلقة</option>
          <option value="paid">مصروفة</option>
        </select>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table id="comm-table">
            <thead><tr>
              <th>رقم الفاتورة</th><th>السيلز</th><th>العميل</th>
              <th>قيمة البيع</th><th>نسبة العمولة</th><th>مبلغ العمولة</th>
              <th>الحالة</th><th>التاريخ</th><th>إجراءات</th>
            </tr></thead>
            <tbody id="comm-tbody">${rows}</tbody>
          </table>
        </div>
      </div>
    `;
    window._commissionsData = commissions;
    window._commUsersData   = users;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

async function filterCommissions() {
  const spId   = document.getElementById('comm-sp-filter')?.value;
  const status = document.getElementById('comm-status-filter')?.value;
  const params = {};
  if (isSalespersonOnly()) params.salesperson_id = currentUser.id;
  else if (spId) params.salesperson_id = parseInt(spId);
  if (status) params.status = status;
  const commissions = await api.commissions(params);
  window._commissionsData = commissions;
  // Re-render rows inline
  const rows = commissions.map(c => `
    <tr>
      <td class="number">${c.invoice_number}</td>
      <td><strong>${c.salesperson_name}</strong></td>
      <td>${c.customer}</td>
      <td class="number">${formatMoney(c.sale_amount)}</td>
      <td class="number">${c.commission_rate}%</td>
      <td class="number text-warning"><strong>${formatMoney(c.commission_amount)}</strong></td>
      <td>${c.status === 'paid'
        ? `<span class="badge badge-success">مصروفة</span>`
        : `<span class="badge badge-warning">معلقة</span>`}</td>
      <td>${formatDate(c.created_at)}</td>
      <td>
        ${c.status === 'pending' && canUserChangeInvoiceStatus()
          ? `<button class="btn btn-sm btn-success" onclick="payCommission(${c.id})">✓ صرف</button>`
          : ''}
      </td>
    </tr>
  `).join('') || `<tr><td colspan="9"><div class="empty-state" style="padding:30px"><div class="empty-icon">💰</div><h3>لا توجد نتائج</h3></div></td></tr>`;
  document.getElementById('comm-tbody').innerHTML = rows;
}

async function payCommission(id) {
  if (!confirm('هل تريد صرف هذه العمولة؟')) return;
  try {
    await api.payCommission(id);
    toast('تم صرف العمولة بنجاح', 'success');
    renderCommissions();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== 6. تقرير عمولات المبيعات المبني على المتحصلات =====
/**
 * يُحسب العمولة بناءً على المبالغ المحصّلة فعلياً (payments)
 * لا بناءً على قيمة الفاتورة
 * commission = collected_amount * employee_rate
 * الأدوار المصرح لها: مدير، مدير مبيعات، مدير قسم
 */
async function renderCommissionReport() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loader"></div>';

  try {
    // التحقق من الصلاحية
    const role = currentUser?.role || '';
    const allowedRoles = ['مدير عام', 'مدير', 'مدير مبيعات', 'مدير قسم', 'محاسب'];
    if (!allowedRoles.includes(role)) {
      content.innerHTML = `<div class="card"><p style="color:var(--danger)">ليس لديك صلاحية عرض هذا التقرير</p></div>`;
      return;
    }

    const users    = await api.users();
    const sales    = DB.getAll('sales');
    const payments = DB.getAll('payments').filter(p => p.type === 'receipt' && p.party_type === 'customer');

    // بناء خريطة بيانات موظفي المبيعات
    const salespeople = users.filter(u => SALES_ASSIGNABLE_ROLES.includes(u.role));

    // حساب العمولات بناءً على المتحصلات
    const commData = salespeople.map(sp => {
      // الفواتير المرتبطة بهذا السيلز
      const spInvoices = sales.filter(s => String(s.salesperson_id) === String(sp.id));

      // المتحصلات الفعلية: مجموع paid_amount من الفواتير مباشرة
      // نستخدم paid_amount كمصدر موحد لتجنب التكرار
      const totalCollected = spInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);

      // نسبة العمولة من بيانات المستخدم
      const rate = parseFloat(sp.commission_rate || 0);
      const commissionAmount = totalCollected * (rate / 100);

      return {
        id:             sp.id,
        name:           sp.name,
        role:           sp.role,
        invoiceCount:   spInvoices.length,
        totalSales:     spInvoices.reduce((s, i) => s + (i.total_amount || 0), 0),
        totalCollected,
        rate,
        commissionAmount,
      };
    }).filter(sp => sp.invoiceCount > 0 || sp.totalCollected > 0);

    const grandTotal = commData.reduce((s, c) => s + c.commissionAmount, 0);

    const rows = commData.map((sp, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${sp.name}</strong></td>
        <td><span class="badge badge-info">${sp.role}</span></td>
        <td class="number">${sp.invoiceCount}</td>
        <td class="number">${formatMoney(sp.totalSales)}</td>
        <td class="number text-success"><strong>${formatMoney(sp.totalCollected)}</strong></td>
        <td class="number">${sp.rate}%</td>
        <td class="number text-warning"><strong>${formatMoney(sp.commissionAmount)}</strong></td>
      </tr>
    `).join('') || `<tr><td colspan="8" class="text-center text-muted">لا توجد بيانات</td></tr>`;

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h2>📊 تقرير عمولات المبيعات</h2>
          <p>مبنية على المتحصلات الفعلية — ${new Date().toLocaleDateString('ar-EG',{month:'long',year:'numeric'})}</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportCommissionReportExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="showPage('commissions')">← عرض العمولات التفصيلية</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box gold">
          <div class="label">إجمالي العمولات المستحقة</div>
          <div class="value">${formatMoney(grandTotal)}</div>
        </div>
        <div class="summary-box">
          <div class="label">عدد موظفي المبيعات</div>
          <div class="value">${commData.length}</div>
        </div>
        <div class="summary-box profit">
          <div class="label">إجمالي المتحصلات</div>
          <div class="value">${formatMoney(commData.reduce((s,c)=>s+c.totalCollected,0))}</div>
        </div>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table id="commission-report-table">
            <thead><tr>
              <th>#</th><th>الموظف</th><th>الدور</th>
              <th>الفواتير</th><th>إجمالي المبيعات</th>
              <th>المتحصلات الفعلية</th><th>نسبة العمولة</th><th>العمولة المستحقة</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
    window._commReportData = commData;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function exportCommissionReportExcel() {
  const data = window._commReportData || [];
  if (!data.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  const headers = ['الموظف', 'الدور', 'الفواتير', 'إجمالي المبيعات', 'المتحصلات', 'نسبة العمولة%', 'العمولة المستحقة'];
  const rows = data.map(sp => [sp.name, sp.role, sp.invoiceCount, sp.totalSales, sp.totalCollected, sp.rate, sp.commissionAmount]);
  if (typeof exportGenericExcel === 'function') {
    exportGenericExcel({ sheetName: 'تقرير العمولات', headers, rows, filename: `commission-report-${new Date().toISOString().split('T')[0]}.xlsx` });
  } else {
    toast('تصدير Excel غير متوفر', 'warning');
  }
}

// ===== EXPORT: SALES PERFORMANCE =====
function exportSalesPerformancePDF() {
  const data = window._spLastData;
  if (!data) { renderSalesPerformance().then(() => toast('أعد المحاولة', 'warning')); return; }
  const headers = ['#', 'السيلز', 'الفواتير', 'إجمالي المبيعات', 'المحصل', 'المتبقي'];
  const rows = data.bySalesperson.map((sp, i) => [
    i + 1, sp.name, sp.count,
    parseFloat(sp.total).toFixed(2) + ' EGP',
    parseFloat(sp.paid).toFixed(2) + ' EGP',
    parseFloat(sp.total - sp.paid).toFixed(2) + ' EGP',
  ]);
  exportGenericPDF({
    title: 'تقرير أداء المبيعات',
    subtitle: 'نظام ERP - الرخام والجرانيت',
    headers, rows,
    filename: `sales-performance-${new Date().toISOString().split('T')[0]}.pdf`,
  });
}

function exportSalesPerformanceExcel() {
  const data = window._spLastData;
  if (!data) return;
  const headers = ['السيلز', 'الفواتير', 'إجمالي المبيعات', 'المحصل', 'المتبقي'];
  const rows = data.bySalesperson.map(sp => [sp.name, sp.count, sp.total, sp.paid, sp.total - sp.paid]);
  exportGenericExcel({
    sheetName: 'أداء المبيعات',
    headers, rows,
    filename: `sales-performance-${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}

function exportCommissionsExcel() {
  const commissions = window._commissionsData || [];
  if (!commissions.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('مكتبة Excel غير محملة', 'error'); return; }
  const headers = ['رقم الفاتورة', 'السيلز', 'العميل', 'قيمة البيع', 'نسبة العمولة %', 'مبلغ العمولة', 'الحالة', 'التاريخ'];
  const rows = commissions.map(c => [
    c.invoice_number, c.salesperson_name, c.customer,
    c.sale_amount, c.commission_rate, c.commission_amount,
    c.status === 'paid' ? 'مصروفة' : 'معلقة',
    c.created_at ? c.created_at.split('T')[0] : '',
  ]);
  exportGenericExcel({
    sheetName: 'العمولات',
    headers, rows,
    filename: `commissions-${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}
