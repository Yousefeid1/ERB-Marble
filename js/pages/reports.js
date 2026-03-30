// ============================================
// Financial Reports Pages
// ============================================

// ===== P&L REPORT =====
async function renderReportPL() {
  const content = document.getElementById('page-content');
  try {
    const r = await api.reportPL();
    window._plData = r;
    const grossMargin = r.revenue > 0 ? (r.gross_profit / r.revenue * 100).toFixed(1) : 0;
    const netMargin   = r.revenue > 0 ? (r.net_profit   / r.revenue * 100).toFixed(1) : 0;

    content.innerHTML = `
      <div class="page-header"><div><h2>تقرير الأرباح والخسائر</h2><p>نتائج الأعمال التشغيلية</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="exportPLExcel()">📊 Excel</button><button class="btn btn-secondary" onclick="exportPLPDF()">📄 PDF</button></div></div>

      <div class="report-summary">
        <div class="summary-box gold">   <div class="label">الإيرادات</div>              <div class="value">${formatMoney(r.revenue)}</div></div>
        <div class="summary-box">        <div class="label">تكلفة البضاعة المباعة</div> <div class="value">${formatMoney(r.cogs)}</div></div>
        <div class="summary-box ${r.gross_profit >= 0 ? 'profit' : 'loss'}"><div class="label">مجمل الربح</div><div class="value">${formatMoney(r.gross_profit)}</div></div>
        <div class="summary-box">        <div class="label">مصروفات التشغيل</div>      <div class="value">${formatMoney(r.operating_expenses)}</div></div>
        <div class="summary-box ${r.net_profit >= 0 ? 'profit' : 'loss'}"><div class="label">صافي الربح</div><div class="value">${formatMoney(r.net_profit)}</div></div>
        <div class="summary-box gold">   <div class="label">هامش الربح الصافي</div>    <div class="value">${netMargin}%</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><span class="card-title">📈 الإيرادات</span></div>
          <table>
            <tbody>
              <tr><td>إيرادات المبيعات</td><td class="number text-success">${formatMoney(r.revenue)}</td></tr>
              <tr style="border-top:1px solid var(--border)"><td><strong>إجمالي الإيرادات</strong></td><td class="number"><strong class="text-success">${formatMoney(r.revenue)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📉 المصروفات</span></div>
          <table>
            <tbody>
              <tr><td>تكلفة البضاعة المباعة</td><td class="number text-danger">${formatMoney(r.cogs)}</td></tr>
              ${r.expenses.map(e => `<tr><td>${e.description}</td><td class="number text-danger">${formatMoney(e.amount)}</td></tr>`).join('')}
              <tr style="border-top:1px solid var(--border)"><td><strong>إجمالي المصروفات</strong></td><td class="number"><strong class="text-danger">${formatMoney(r.cogs + r.operating_expenses)}</strong></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="border-color:var(--accent)">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center">
          <div>
            <div class="text-muted" style="font-size:12px;margin-bottom:4px">مجمل الربح</div>
            <div style="font-size:20px;font-weight:800;color:${r.gross_profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatMoney(r.gross_profit)}</div>
            <div class="text-muted" style="font-size:12px">هامش ${grossMargin}%</div>
          </div>
          <div>
            <div class="text-muted" style="font-size:12px;margin-bottom:4px">مصروفات التشغيل</div>
            <div style="font-size:20px;font-weight:800;color:var(--danger)">${formatMoney(r.operating_expenses)}</div>
          </div>
          <div>
            <div class="text-muted" style="font-size:12px;margin-bottom:4px">صافي الربح</div>
            <div style="font-size:24px;font-weight:900;color:${r.net_profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatMoney(r.net_profit)}</div>
            <div class="text-muted" style="font-size:12px">هامش ${netMargin}%</div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

// ===== BALANCE SHEET =====
async function renderReportBS() {
  const content = document.getElementById('page-content');
  try {
    const { total_assets, total_liabilities, total_equity, accounts } = await api.reportBS();
    window._bsData = { total_assets, total_liabilities, total_equity, accounts };
    const typeNames = { asset: 'الأصول', liability: 'الخصوم', equity: 'حقوق الملكية' };

    const renderGroup = (type) => {
      const items = accounts.filter(a => a.type === type && a.parent_id !== null && a.balance !== 0);
      return items.map(a => `<tr><td style="padding-right:24px">${a.name}</td><td class="number">${formatMoney(a.balance)}</td></tr>`).join('');
    };

    content.innerHTML = `
      <div class="page-header"><div><h2>الميزانية العمومية</h2><p>المركز المالي للشركة</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="exportBSExcel()">📊 Excel</button><button class="btn btn-secondary" onclick="exportBSPDF()">📄 PDF</button></div></div>

      <div class="report-summary">
        <div class="summary-box gold">  <div class="label">إجمالي الأصول</div>       <div class="value">${formatMoney(total_assets)}</div></div>
        <div class="summary-box loss">  <div class="label">إجمالي الخصوم</div>       <div class="value">${formatMoney(total_liabilities)}</div></div>
        <div class="summary-box profit"><div class="label">حقوق الملكية</div>         <div class="value">${formatMoney(total_equity)}</div></div>
        <div class="summary-box ${Math.abs(total_assets - (total_liabilities + total_equity)) < 1 ? 'profit' : 'loss'}">
          <div class="label">التوازن</div>
          <div class="value" style="font-size:14px">${Math.abs(total_assets - (total_liabilities + total_equity)) < 1 ? '✓ متوازن' : '✗ غير متوازن'}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><span class="card-title">🏦 الأصول</span></div>
          <table><tbody>
            ${renderGroup('asset')}
            <tr style="border-top:2px solid var(--border)">
              <td><strong>إجمالي الأصول</strong></td>
              <td class="number"><strong style="color:var(--accent)">${formatMoney(total_assets)}</strong></td>
            </tr>
          </tbody></table>
        </div>
        <div>
          <div class="card">
            <div class="card-header"><span class="card-title">💳 الخصوم</span></div>
            <table><tbody>
              ${renderGroup('liability')}
              <tr style="border-top:2px solid var(--border)">
                <td><strong>إجمالي الخصوم</strong></td>
                <td class="number"><strong class="text-danger">${formatMoney(total_liabilities)}</strong></td>
              </tr>
            </tbody></table>
          </div>
          <div class="card" style="margin-top:0">
            <div class="card-header"><span class="card-title">📊 حقوق الملكية</span></div>
            <table><tbody>
              ${renderGroup('equity')}
              <tr style="border-top:2px solid var(--border)">
                <td><strong>إجمالي حقوق الملكية</strong></td>
                <td class="number"><strong class="text-success">${formatMoney(total_equity)}</strong></td>
              </tr>
            </tbody></table>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

// ===== WASTE REPORT =====
async function renderReportWaste() {
  const content = document.getElementById('page-content');
  try {
    const r = await api.reportWaste();
    window._wasteData = r;

    content.innerHTML = `
      <div class="page-header"><div><h2>تقرير الهالك</h2><p>تحليل نسبة الهالك في عمليات القطع</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="exportWasteExcel()">📊 Excel</button><button class="btn btn-secondary" onclick="exportWastePDF()">📄 PDF</button></div></div>
      <div class="report-summary">
        <div class="summary-box gold">  <div class="label">إجمالي الدفعات</div>          <div class="value">${r.total_batches}</div></div>
        <div class="summary-box profit"><div class="label">إجمالي الألواح المنتجة</div>  <div class="value">${r.total_slabs}</div></div>
        <div class="summary-box loss">  <div class="label">إجمالي الهالك (ألواح)</div>  <div class="value">${r.total_waste_slabs}</div></div>
        <div class="summary-box ${r.avg_waste_percentage > 5 ? 'loss' : 'profit'}">
          <div class="label">متوسط نسبة الهالك</div>
          <div class="value">${r.avg_waste_percentage.toFixed(1)}%</div>
        </div>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الدفعة</th><th>البلوك</th><th>النوع</th><th>التاريخ</th>
              <th>الكلي</th><th>درجة A</th><th>درجة B</th><th>هالك</th><th>% الهالك</th>
            </tr></thead>
            <tbody>
              ${r.details.length === 0
                ? `<tr><td colspan="9"><div class="empty-state" style="padding:30px"><div class="empty-icon">✅</div><h3>لا توجد بيانات</h3></div></td></tr>`
                : r.details.map(b => `
                  <tr>
                    <td class="number">${b.batch_number}</td>
                    <td class="number">${b.block_code}</td>
                    <td>${b.block_type}</td>
                    <td>${formatDate(b.date)}</td>
                    <td class="number">${b.slabs_count}</td>
                    <td class="number text-success">${b.grade_a}</td>
                    <td class="number text-warning">${b.grade_b}</td>
                    <td class="number text-danger">${b.waste}</td>
                    <td class="number">
                      <span class="badge ${b.waste_percentage > 5 ? 'badge-danger' : 'badge-success'}">${b.waste_percentage.toFixed(1)}%</span>
                    </td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

// ===== INVENTORY REPORT =====
async function renderReportInventory() {
  const content = document.getElementById('page-content');
  try {
    const r = await api.reportInventory();
    const lowStock = r.products.filter(p => p.stock_qty <= p.min_stock);

    content.innerHTML = `
      <div class="page-header"><div><h2>تقرير المخزون</h2><p>الوضع الحالي للمخزون</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="exportInventoryExcel()">📊 Excel</button><button class="btn btn-secondary" onclick="exportInventoryPDF()">📄 PDF</button></div></div>
      <div class="report-summary">
        <div class="summary-box gold">  <div class="label">إجمالي قيمة المخزون</div> <div class="value">${formatMoney(r.total_inventory_value)}</div></div>
        <div class="summary-box profit"><div class="label">عدد المنتجات</div>           <div class="value">${r.products.length}</div></div>
        <div class="summary-box">       <div class="label">عدد البلوكات</div>           <div class="value">${r.blocks.length}</div></div>
        <div class="summary-box ${lowStock.length > 0 ? 'loss' : 'profit'}">
          <div class="label">منتجات نقص المخزون</div>
          <div class="value">${lowStock.length}</div>
        </div>
      </div>

      ${lowStock.length > 0 ? `
        <div style="background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.3);border-radius:8px;padding:16px;margin-bottom:20px">
          <strong class="text-danger">⚠ تحذير: ${lowStock.length} منتج وصل للحد الأدنى للمخزون</strong>
          <ul style="margin-top:8px;padding-right:20px">
            ${lowStock.map(p => `<li class="text-danger">${p.name}: ${p.stock_qty} ${p.unit} (الحد الأدنى: ${p.min_stock} ${p.unit})</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header"><span class="card-title">📦 المنتجات</span></div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>الكود</th><th>المنتج</th><th>الفئة</th><th>الوحدة</th><th>المخزون الحالي</th><th>الحد الأدنى</th><th>سعر الكلفة</th><th>القيمة الكلية</th><th>الحالة</th></tr></thead>
            <tbody>
              ${r.products.map(p => `
                <tr>
                  <td class="number">${p.code}</td>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.category}</td>
                  <td>${p.unit}</td>
                  <td class="number ${p.stock_qty <= p.min_stock ? 'text-danger' : 'text-success'}">${p.stock_qty}</td>
                  <td class="number">${p.min_stock}</td>
                  <td class="number">${formatMoney(p.cost)}</td>
                  <td class="number">${formatMoney(p.cost * p.stock_qty)}</td>
                  <td>${p.stock_qty <= p.min_stock ? '<span class="badge badge-danger">نقص</span>' : '<span class="badge badge-success">طبيعي</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🪨 البلوكات</span></div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>الكود</th><th>النوع</th><th>المصدر</th><th>الوزن (طن)</th><th>التكلفة</th><th>الحالة</th></tr></thead>
            <tbody>
              ${r.blocks.map(b => {
                const statusLabels = { in_stock: ['badge-success','في المخزن'], in_cutting: ['badge-warning','في القطع'], processed: ['badge-gold','مُصنَّع'] };
                const [cls, label] = statusLabels[b.status] || ['badge-info', b.status];
                return `
                  <tr>
                    <td class="number">${b.code}</td><td>${b.type}</td><td>${b.origin}</td>
                    <td class="number">${b.weight_tons}</td><td class="number">${formatMoney(b.cost)}</td>
                    <td><span class="badge ${cls}">${label}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    window._inventoryData = r;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

// ===== EXPORT: P&L =====
function exportPLPDF() {
  const r = window._plData;
  if (!r) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['البند', 'المبلغ (EGP)'];
  const rows = [
    ['إيرادات المبيعات', r.revenue.toFixed(2)],
    ['تكلفة البضاعة المباعة', '-' + r.cogs.toFixed(2)],
    ['مجمل الربح', r.gross_profit.toFixed(2)],
    ...r.expenses.map(e => [e.description, '-' + parseFloat(e.amount).toFixed(2)]),
    ['إجمالي مصروفات التشغيل', '-' + r.operating_expenses.toFixed(2)],
  ];
  const totalsRow = ['صافي الربح', r.net_profit.toFixed(2) + ' EGP'];
  exportGenericPDF({ title: 'تقرير الأرباح والخسائر', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow, filename: `pl-${new Date().toISOString().split('T')[0]}.pdf`, orientation: 'portrait' });
}

function exportPLExcel() {
  const r = window._plData;
  if (!r) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['البند', 'المبلغ (EGP)'];
  const rows = [
    ['إيرادات المبيعات', r.revenue],
    ['تكلفة البضاعة المباعة', -r.cogs],
    ['مجمل الربح', r.gross_profit],
    ...r.expenses.map(e => [e.description, -parseFloat(e.amount)]),
    ['إجمالي مصروفات التشغيل', -r.operating_expenses],
    ['صافي الربح', r.net_profit],
  ];
  exportGenericExcel({ sheetName: 'الأرباح والخسائر', headers, rows, filename: `pl-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== EXPORT: BALANCE SHEET =====
function exportBSPDF() {
  const d = window._bsData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const typeLabel = { asset: 'أصل', liability: 'خصم', equity: 'حقوق ملكية' };
  const headers = ['اسم الحساب', 'النوع', 'الرصيد (EGP)'];
  const rows = (d.accounts || []).filter(a => a.parent_id !== null && a.balance !== 0).map(a => [
    a.name, typeLabel[a.type] || a.type, parseFloat(a.balance).toFixed(2),
  ]);
  const totalsRow = ['إجمالي الأصول / الخصوم + حقوق الملكية', '', d.total_assets.toFixed(2) + ' EGP'];
  exportGenericPDF({ title: 'الميزانية العمومية', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow, filename: `balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`, orientation: 'portrait' });
}

function exportBSExcel() {
  const d = window._bsData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const typeLabel = { asset: 'أصل', liability: 'خصم', equity: 'حقوق ملكية' };
  const headers = ['اسم الحساب', 'النوع', 'الرصيد (EGP)'];
  const rows = (d.accounts || []).filter(a => a.parent_id !== null && a.balance !== 0).map(a => [
    a.name, typeLabel[a.type] || a.type, a.balance,
  ]);
  const totalsRow = ['إجمالي الأصول', '', d.total_assets];
  exportGenericExcel({ sheetName: 'الميزانية العمومية', headers, rows, totalsRow, filename: `balance-sheet-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== EXPORT: WASTE =====
function exportWastePDF() {
  const r = window._wasteData;
  if (!r) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['رقم الدفعة', 'البلوك', 'النوع', 'التاريخ', 'الكلي', 'درجة A', 'درجة B', 'هالك', '% الهالك'];
  const rows = r.details.map(b => [b.batch_number, b.block_code, b.block_type, formatDate(b.date), b.slabs_count, b.grade_a, b.grade_b, b.waste, b.waste_percentage.toFixed(1) + '%']);
  const totalsRow = ['الإجمالي', '', '', '', r.total_slabs, '', '', r.total_waste_slabs, r.avg_waste_percentage.toFixed(1) + '%'];
  exportGenericPDF({ title: 'تقرير الهالك', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow, filename: `waste-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportWasteExcel() {
  const r = window._wasteData;
  if (!r) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['رقم الدفعة', 'كود البلوك', 'نوع الحجر', 'التاريخ', 'إجمالي الألواح', 'درجة A', 'درجة B', 'هالك', '% الهالك'];
  const rows = r.details.map(b => [b.batch_number, b.block_code, b.block_type, b.date, b.slabs_count, b.grade_a, b.grade_b, b.waste, b.waste_percentage]);
  const totalsRow = ['الإجمالي', '', '', '', r.total_slabs, '', '', r.total_waste_slabs, r.avg_waste_percentage];
  exportGenericExcel({ sheetName: 'تقرير الهالك', headers, rows, totalsRow, filename: `waste-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ============================================
// تقرير التدفقات النقدية — Module 8.1
// ============================================
function renderReportCashFlow() {
  const content = document.getElementById('page-content');

  // قراءة الفترة من الحالة أو الشهر الحالي
  const now    = new Date();
  const defPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const from   = window._cfFrom  || (defPeriod + '-01');
  const to     = window._cfTo    || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // ===== أنشطة التشغيل =====
  const operInflows  = DB.getAll('payments')
    .filter(p => p.type === 'receipt' && p.date >= from && p.date <= to)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const operOutflows = DB.getAll('payments')
    .filter(p => p.type === 'payment' && p.date >= from && p.date <= to)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const expenses = DB.getAll('expenses')
    .filter(e => e.date >= from && e.date <= to)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const operatingNet = operInflows - operOutflows - expenses;

  // ===== أنشطة الاستثمار =====
  const capitalPurchases = DB.getAll('blocks')
    .filter(b => b.received_date && b.received_date >= from && b.received_date <= to)
    .reduce((s, b) => s + (b.cost || 0), 0);

  const investingNet = -capitalPurchases;

  // ===== أنشطة التمويل (تُدخَل يدوياً من القيود) =====
  const financingEntries = DB.getAll('journal')
    .filter(j => j.date >= from && j.date <= to && j.isFinancing);
  const financingNet = financingEntries.reduce((s, j) => {
    const lineSum = (j.lines || []).reduce((ls, l) => ls + (l.credit || 0) - (l.debit || 0), 0);
    return s + lineSum;
  }, 0);

  const netCashFlow = operatingNet + investingNet + financingNet;

  // ===== تفاصيل الإيرادات والمصروفات =====
  const operInflowDetails = DB.getAll('payments')
    .filter(p => p.type === 'receipt' && p.date >= from && p.date <= to);
  const operOutflowDetails = DB.getAll('payments')
    .filter(p => p.type === 'payment' && p.date >= from && p.date <= to);
  const expenseDetails = DB.getAll('expenses')
    .filter(e => e.date >= from && e.date <= to);

  // ===== حفظ للتصدير =====
  window._cfData = {
    from, to, operatingNet, investingNet, financingNet, netCashFlow,
    operInflows, operOutflows, expenses, capitalPurchases,
    operInflowDetails, operOutflowDetails, expenseDetails
  };

  content.innerHTML = `
    <div class="page-header">
      <div><h2>تقرير التدفقات النقدية</h2><p>Cash Flow Statement</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="exportCashFlowExcel()">📊 Excel</button>
        <button class="btn btn-secondary" onclick="exportCashFlowPDF()">📄 PDF</button>
      </div>
    </div>

    <!-- فلتر الفترة -->
    <div class="card" style="padding:12px 16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <label style="color:var(--text-secondary)">من:</label>
        <input type="date" id="cf-from" value="${from}" style="width:160px"
          onchange="window._cfFrom=this.value;renderReportCashFlow()">
        <label style="color:var(--text-secondary)">إلى:</label>
        <input type="date" id="cf-to" value="${to}" style="width:160px"
          onchange="window._cfTo=this.value;renderReportCashFlow()">
      </div>
    </div>

    <!-- ملخص التدفقات -->
    <div class="report-summary">
      <div class="summary-box ${operatingNet >= 0 ? 'profit' : 'loss'}">
        <div class="label">أنشطة التشغيل</div>
        <div class="value">${formatMoney(operatingNet)}</div>
      </div>
      <div class="summary-box ${investingNet >= 0 ? 'profit' : 'loss'}">
        <div class="label">أنشطة الاستثمار</div>
        <div class="value">${formatMoney(investingNet)}</div>
      </div>
      <div class="summary-box">
        <div class="label">أنشطة التمويل</div>
        <div class="value">${formatMoney(financingNet)}</div>
      </div>
      <div class="summary-box ${netCashFlow >= 0 ? 'gold' : 'loss'}">
        <div class="label">صافي التدفق النقدي</div>
        <div class="value">${formatMoney(netCashFlow)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">

      <!-- أنشطة التشغيل -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">⚙️ أنشطة التشغيل</span>
          <span style="font-weight:700;color:${operatingNet>=0?'var(--success)':'var(--danger)'}">
            ${formatMoney(operatingNet)}
          </span>
        </div>
        <table>
          <tbody>
            <tr><td style="color:var(--success)">تحصيلات من العملاء</td>
                <td class="number text-success">+ ${formatMoney(operInflows)}</td></tr>
            <tr><td style="color:var(--danger)">مدفوعات للموردين</td>
                <td class="number text-danger">- ${formatMoney(operOutflows)}</td></tr>
            <tr><td style="color:var(--danger)">المصروفات التشغيلية</td>
                <td class="number text-danger">- ${formatMoney(expenses)}</td></tr>
            <tr style="border-top:2px solid var(--border)">
              <td><strong>صافي التشغيل</strong></td>
              <td class="number"><strong style="color:${operatingNet>=0?'var(--success)':'var(--danger)'}">
                ${formatMoney(operatingNet)}</strong></td>
            </tr>
          </tbody>
        </table>
        ${operInflowDetails.length > 0 ? `
        <details style="margin-top:8px">
          <summary style="cursor:pointer;color:var(--accent);font-size:13px;padding:4px">▾ تفاصيل التحصيلات</summary>
          <div class="data-table-wrapper" style="max-height:160px;overflow-y:auto;margin-top:4px">
            <table>
              <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
              <tbody>
                ${operInflowDetails.slice(0,20).map(p => `
                  <tr>
                    <td>${formatDate(p.date)}</td>
                    <td>${p.notes || p.description || '-'}</td>
                    <td class="number text-success">${formatMoney(p.amount)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </details>` : ''}
      </div>

      <!-- أنشطة الاستثمار -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🏗️ أنشطة الاستثمار</span>
          <span style="font-weight:700;color:${investingNet>=0?'var(--success)':'var(--danger)'}">
            ${formatMoney(investingNet)}
          </span>
        </div>
        <table>
          <tbody>
            <tr><td style="color:var(--danger)">شراء البلوكات (رأسمالي)</td>
                <td class="number text-danger">- ${formatMoney(capitalPurchases)}</td></tr>
            <tr style="border-top:2px solid var(--border)">
              <td><strong>صافي الاستثمار</strong></td>
              <td class="number"><strong style="color:${investingNet>=0?'var(--success)':'var(--danger)'}">
                ${formatMoney(investingNet)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- أنشطة التمويل -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">💳 أنشطة التمويل</span>
          <span style="font-weight:700;color:${financingNet>=0?'var(--success)':'var(--danger)'}">
            ${formatMoney(financingNet)}
          </span>
        </div>
        ${financingEntries.length === 0
          ? `<div class="empty-state" style="padding:24px">
               <div class="empty-icon">📋</div>
               <p style="font-size:13px">لا توجد قيود تمويلية للفترة المحددة.<br>
               وَسِّم قيود التمويل بـ isFinancing=true.</p>
             </div>`
          : `<table><tbody>
              ${financingEntries.map(j => `
                <tr>
                  <td>${j.description || '-'}</td>
                  <td class="number">${formatMoney(
                    (j.lines || []).reduce((ls, l) => ls + (l.credit || 0) - (l.debit || 0), 0)
                  )}</td>
                </tr>`).join('')}
             </tbody></table>`}
        <div style="margin-top:12px;padding:8px;background:var(--bg-input);border-radius:6px;font-size:12px;color:var(--text-muted)">
          ⚙️ لتسجيل أنشطة تمويلية، أنشئ قيداً محاسبياً وفعّل خيار "نشاط تمويلي"
        </div>
      </div>
    </div>

    <!-- ملخص إجمالي -->
    <div class="card" style="border-color:${netCashFlow>=0?'var(--success)':'var(--danger)'};margin-top:4px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;text-align:center">
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">إجمالي التحصيلات</div>
          <div style="font-size:20px;font-weight:700;color:var(--success)">${formatMoney(operInflows)}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">إجمالي المدفوعات</div>
          <div style="font-size:20px;font-weight:700;color:var(--danger)">${formatMoney(operOutflows + expenses + capitalPurchases)}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">صافي التدفق</div>
          <div style="font-size:24px;font-weight:900;color:${netCashFlow>=0?'var(--success)':'var(--danger)'}">
            ${netCashFlow >= 0 ? '▲' : '▼'} ${formatMoney(Math.abs(netCashFlow))}
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">الفترة</div>
          <div style="font-size:14px;font-weight:600">${formatDate(from)}</div>
          <div style="font-size:12px;color:var(--text-muted)">إلى ${formatDate(to)}</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// تقرير تكلفة المتر المصنع — Module 8.2
// ============================================
function renderReportCostPerMeter() {
  const content = document.getElementById('page-content');

  // استيراد دالة التكاليف غير المباشرة من cost-centers.js إن وُجدت
  const getOverhead = (typeof getAllocatedOverhead === 'function')
    ? getAllocatedOverhead
    : () => 0;

  const stages = DB.getAll('manufacturing_stages');

  // تجميع البيانات حسب نوع المرحلة
  const stageMap = {};
  stages.forEach(s => {
    const key = s.stage || 'غير محدد';
    if (!stageMap[key]) {
      stageMap[key] = {
        stage: key, directCost: 0, laborCost: 0,
        materialCost: 0, transportCost: 0, outputQty: 0,
        wasteQty: 0, count: 0,
      };
    }
    const m = stageMap[key];
    m.directCost    += s.directCost    || 0;
    m.laborCost     += s.laborCost     || 0;
    m.materialCost  += s.materialCost  || 0;
    m.transportCost += s.transportCost || 0;
    m.outputQty     += s.outputQuantity|| 0;
    m.wasteQty      += s.wasteQuantity || 0;
    m.count++;
  });

  const rows = Object.values(stageMap);
  let cumulativeCost = 0;

  const tableRows = rows.length > 0 ? rows.map(r => {
    const directTotal   = r.directCost + r.laborCost + r.materialCost + r.transportCost;
    const indirectAlloc = getOverhead(r.stage, '');
    const totalCost     = directTotal + indirectAlloc;
    cumulativeCost     += totalCost;
    const cpm           = r.outputQty > 0 ? totalCost / r.outputQty : 0;
    const wasteRate     = (r.outputQty + r.wasteQty) > 0
      ? (r.wasteQty / (r.outputQty + r.wasteQty) * 100).toFixed(1) : '0.0';

    return { r, directTotal, indirectAlloc, totalCost, cumulativeCost: cumulativeCost, cpm, wasteRate };
  }) : [];

  window._cpmData = tableRows;

  const totalDirect   = rows.reduce((s, r) => s + r.directCost + r.laborCost + r.materialCost + r.transportCost, 0);
  const totalOutput   = rows.reduce((s, r) => s + r.outputQty, 0);
  const totalWaste    = rows.reduce((s, r) => s + r.wasteQty, 0);
  const avgCpm        = totalOutput > 0 ? (totalDirect / totalOutput) : 0;

  content.innerHTML = `
    <div class="page-header">
      <div><h2>تقرير تكلفة المتر المصنع</h2><p>تحليل التكلفة لكل مرحلة إنتاج</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="exportCPMExcel()">📊 Excel</button>
        <button class="btn btn-secondary" onclick="exportCPMPDF()">📄 PDF</button>
      </div>
    </div>

    <div class="report-summary">
      <div class="summary-box gold">
        <div class="label">إجمالي التكاليف المباشرة</div>
        <div class="value">${formatMoney(totalDirect)}</div>
      </div>
      <div class="summary-box profit">
        <div class="label">إجمالي الكمية المنتجة</div>
        <div class="value">${totalOutput.toFixed(2)} م²</div>
      </div>
      <div class="summary-box">
        <div class="label">متوسط تكلفة المتر</div>
        <div class="value">${formatMoney(avgCpm)}</div>
      </div>
      <div class="summary-box ${totalWaste > 0 ? 'loss' : 'profit'}">
        <div class="label">إجمالي الهالك</div>
        <div class="value">${totalWaste.toFixed(2)}</div>
      </div>
    </div>

    ${stages.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">🏭</div>
        <h3>لا توجد مراحل تصنيع مسجلة</h3>
        <p>سجّل مراحل التصنيع من صفحة "مراحل التصنيع"</p>
      </div>
    ` : `
    <!-- جدول تكلفة المتر -->
    <div class="card" style="padding:0">
      <div class="card-header" style="padding:12px 16px">
        <span class="card-title">📊 تكلفة المتر لكل مرحلة</span>
      </div>
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>المرحلة</th>
              <th>عدد العمليات</th>
              <th>التكلفة المباشرة</th>
              <th>غير المباشرة</th>
              <th>الإجمالي</th>
              <th>الكمية المنتجة</th>
              <th>تكلفة المتر</th>
              <th>% الهالك</th>
              <th>التكلفة التراكمية</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.map(({ r, directTotal, indirectAlloc, totalCost, cumulativeCost, cpm, wasteRate }) => `
              <tr>
                <td><strong>${r.stage}</strong></td>
                <td class="number">${r.count}</td>
                <td class="number">${formatMoney(directTotal)}</td>
                <td class="number text-muted">${formatMoney(indirectAlloc)}</td>
                <td class="number">${formatMoney(totalCost)}</td>
                <td class="number">${r.outputQty.toFixed(2)}</td>
                <td class="number" style="color:var(--accent);font-weight:700">${formatMoney(cpm)}</td>
                <td class="number ${parseFloat(wasteRate) > 10 ? 'text-danger' : 'text-success'}">${wasteRate}%</td>
                <td class="number text-muted">${formatMoney(cumulativeCost)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-input);font-weight:700">
              <td>الإجمالي</td>
              <td class="number">${rows.reduce((s,r)=>s+r.count,0)}</td>
              <td class="number">${formatMoney(totalDirect)}</td>
              <td></td>
              <td class="number">${formatMoney(totalDirect)}</td>
              <td class="number">${totalOutput.toFixed(2)}</td>
              <td class="number" style="color:var(--accent)">${formatMoney(avgCpm)}</td>
              <td class="number ${totalWaste > 0 ? 'text-danger' : 'text-success'}">
                ${((totalWaste/(totalOutput+totalWaste||1))*100).toFixed(1)}%
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- رسم بياني تطور التكلفة -->
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">📈 تطور تكلفة المتر عبر مراحل الإنتاج</span></div>
      <canvas id="cpm-chart" height="60"></canvas>
    </div>
    `}
  `;

  // رسم البياني بعد تحديث DOM
  if (tableRows.length > 0) {
    requestAnimationFrame(() => {
      const ctx = document.getElementById('cpm-chart');
      if (!ctx) return;
      new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: tableRows.map(d => d.r.stage),
          datasets: [
            {
              label: 'تكلفة المتر (ج.م/م²)',
              data: tableRows.map(d => d.cpm.toFixed(2)),
              backgroundColor: 'rgba(200,169,110,0.3)',
              borderColor: '#c8a96e',
              borderWidth: 2,
              borderRadius: 4,
              yAxisID: 'y',
            },
            {
              type: 'line',
              label: 'التكلفة التراكمية',
              data: tableRows.map(d => d.cumulativeCost.toFixed(2)),
              borderColor: '#4caf9e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 4,
              tension: 0.3,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#8892aa', font: { family: 'Cairo' } } } },
          scales: {
            x:  { ticks: { color: '#8892aa' }, grid: { color: 'rgba(42,47,63,0.5)' } },
            y:  { ticks: { color: '#8892aa' }, grid: { color: 'rgba(42,47,63,0.5)' }, position: 'right' },
            y1: { ticks: { color: '#4caf9e' }, grid: { drawOnChartArea: false }, position: 'left' },
          },
        },
      });
    });
  }
}

// ============================================
// تقرير ربحية التصدير — Module 8.3
// ============================================
function renderReportExportProfit() {
  const content = document.getElementById('page-content');

  const orders = DB.getAll('export_orders');

  const totalRevenue = orders.reduce((s, o) => s + (o.totalRevenue || 0), 0);
  const totalCost    = orders.reduce((s, o) => s + (o.totalCost    || 0), 0);
  const totalProfit  = totalRevenue - totalCost;
  const avgProfitPct = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : '0.0';

  // تجميع حسب العميل
  const byCustomer = {};
  orders.forEach(o => {
    const k = o.customerName || o.customerId || 'غير محدد';
    if (!byCustomer[k]) byCustomer[k] = { revenue: 0, cost: 0, count: 0 };
    byCustomer[k].revenue += o.totalRevenue || 0;
    byCustomer[k].cost    += o.totalCost    || 0;
    byCustomer[k].count++;
  });

  // تجميع حسب الوجهة
  const byDest = {};
  orders.forEach(o => {
    const k = o.destination || 'غير محددة';
    if (!byDest[k]) byDest[k] = { revenue: 0, cost: 0 };
    byDest[k].revenue += o.totalRevenue || 0;
    byDest[k].cost    += o.totalCost    || 0;
  });

  const topCustomers = Object.entries(byCustomer)
    .map(([name, v]) => ({ name, ...v, profit: v.revenue - v.cost }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  window._epData = { orders, totalRevenue, totalCost, totalProfit, byCustomer, byDest };

  content.innerHTML = `
    <div class="page-header">
      <div><h2>تقرير ربحية التصدير</h2><p>تحليل أرباح أوامر التصدير</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="exportEPExcel()">📊 Excel</button>
        <button class="btn btn-secondary" onclick="exportEPPDF()">📄 PDF</button>
      </div>
    </div>

    <div class="report-summary">
      <div class="summary-box gold">
        <div class="label">إجمالي إيرادات التصدير</div>
        <div class="value">${formatMoney(totalRevenue)}</div>
      </div>
      <div class="summary-box loss">
        <div class="label">إجمالي تكاليف التصدير</div>
        <div class="value">${formatMoney(totalCost)}</div>
      </div>
      <div class="summary-box ${totalProfit >= 0 ? 'profit' : 'loss'}">
        <div class="label">إجمالي الربح</div>
        <div class="value">${formatMoney(totalProfit)}</div>
      </div>
      <div class="summary-box">
        <div class="label">متوسط هامش الربح</div>
        <div class="value">${avgProfitPct}%</div>
      </div>
    </div>

    ${orders.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">🚢</div>
        <h3>لا توجد أوامر تصدير</h3>
        <p>أنشئ أوامر تصدير من صفحة "نظام التصدير"</p>
      </div>
    ` : `
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:16px;margin-bottom:16px">
      <!-- جدول الأوامر -->
      <div class="card" style="padding:0">
        <div class="card-header" style="padding:12px 16px">
          <span class="card-title">📋 أوامر التصدير</span>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>رقم الأمر</th>
                <th>العميل</th>
                <th>الوجهة</th>
                <th>الإيراد</th>
                <th>التكلفة</th>
                <th>الربح</th>
                <th>الهامش%</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(o => {
                const profit = (o.totalRevenue || 0) - (o.totalCost || 0);
                const pct    = (o.totalRevenue || 0) > 0 ? (profit / o.totalRevenue * 100).toFixed(1) : '0.0';
                return `
                  <tr>
                    <td class="number">${o.exportOrderNo}</td>
                    <td>${o.customerName || '-'}</td>
                    <td>${o.destination || '-'}</td>
                    <td class="number text-success">${formatMoney(o.totalRevenue || 0)}</td>
                    <td class="number text-danger">${formatMoney(o.totalCost || 0)}</td>
                    <td class="number" style="color:${profit>=0?'var(--success)':'var(--danger)'};font-weight:700">
                      ${formatMoney(profit)}
                    </td>
                    <td class="number ${parseFloat(pct) >= 20 ? 'text-success' : parseFloat(pct) > 0 ? 'text-warning' : 'text-danger'}">
                      ${pct}%
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- أعلى العملاء ربحاً -->
      <div class="card">
        <div class="card-header"><span class="card-title">⭐ أعلى العملاء ربحاً</span></div>
        ${topCustomers.length > 0
          ? topCustomers.map((c, i) => {
              const pct = c.revenue > 0 ? (c.profit / c.revenue * 100).toFixed(1) : '0.0';
              return `
                <div style="margin-bottom:12px;padding:8px;background:var(--bg-input);border-radius:6px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:13px;font-weight:600">${i+1}. ${c.name}</span>
                    <span style="font-size:12px;color:var(--accent)">${c.count} أمر</span>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="font-size:12px;color:var(--text-muted)">ربح: ${formatMoney(c.profit)}</span>
                    <span style="font-size:12px;font-weight:700;color:${parseFloat(pct)>=20?'var(--success)':'var(--warning)'}">
                      ${pct}%
                    </span>
                  </div>
                </div>`;
            }).join('')
          : '<div class="empty-state" style="padding:20px"><p>لا توجد بيانات</p></div>'
        }
      </div>
    </div>

    <!-- الربحية حسب الوجهة -->
    <div class="card" style="margin-top:4px">
      <div class="card-header"><span class="card-title">🗺️ الربحية حسب الوجهة</span></div>
      <div class="data-table-wrapper">
        <table>
          <thead><tr><th>الوجهة</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th><th>الهامش%</th></tr></thead>
          <tbody>
            ${Object.entries(byDest).map(([dest, v]) => {
              const profit = v.revenue - v.cost;
              const pct    = v.revenue > 0 ? (profit / v.revenue * 100).toFixed(1) : '0.0';
              return `
                <tr>
                  <td><strong>${dest}</strong></td>
                  <td class="number text-success">${formatMoney(v.revenue)}</td>
                  <td class="number text-danger">${formatMoney(v.cost)}</td>
                  <td class="number" style="color:${profit>=0?'var(--success)':'var(--danger)'}">${formatMoney(profit)}</td>
                  <td class="number ${parseFloat(pct)>=20?'text-success':'text-warning'}">${pct}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    `}
  `;
}

// ============================================
// تقرير حركة المخزون — Module 8.4
// ============================================
function renderReportInventoryMovement() {
  const content = document.getElementById('page-content');

  const products   = DB.getAll('products');
  const sales      = DB.getAll('sales').filter(s => s.status !== 'cancelled' && s.status !== 'draft');
  const purchases  = DB.getAll('purchases').filter(p => p.status !== 'cancelled' && p.status !== 'draft');

  // بناء حركة كل منتج
  const movements = products.map(p => {
    // المبيعات: خروج
    const salesItems = [];
    sales.forEach(s => {
      (s.items || []).forEach(item => {
        if (item.product_id === p.id || item.product === p.name) {
          salesItems.push({
            date: s.invoice_date, ref: s.invoice_number,
            type: 'صادر', qty: -(item.qty || 0), amount: item.subtotal || 0
          });
        }
      });
    });

    // المشتريات: وارد
    const purchaseItems = [];
    purchases.forEach(pur => {
      (pur.items || []).forEach(item => {
        if (item.product_id === p.id || item.product === p.name) {
          purchaseItems.push({
            date: pur.invoice_date, ref: pur.invoice_number,
            type: 'وارد', qty: item.qty || 0, amount: item.subtotal || 0
          });
        }
      });
    });

    const allMoves  = [...salesItems, ...purchaseItems]
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalIn   = allMoves.filter(m => m.qty > 0).reduce((s, m) => s + m.qty, 0);
    const totalOut  = Math.abs(allMoves.filter(m => m.qty < 0).reduce((s, m) => s + m.qty, 0));
    const fifoValue = p.stock_qty * p.cost; // تقييم بسعر الكلفة الحالي = المخزون الحالي × سعر الكلفة

    return { p, allMoves, totalIn, totalOut, fifoValue };
  });

  const grandTotal = movements.reduce((s, m) => s + m.fifoValue, 0);

  window._imData = movements;

  content.innerHTML = `
    <div class="page-header">
      <div><h2>تقرير حركة المخزون</h2><p>وارد / صادر / الرصيد الحالي بالتكلفة الحالية</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="exportIMExcel()">📊 Excel</button>
        <button class="btn btn-secondary" onclick="exportIMPDF()">📄 PDF</button>
      </div>
    </div>

    <div class="report-summary">
      <div class="summary-box gold">
        <div class="label">إجمالي قيمة المخزون (بالتكلفة الحالية)</div>
        <div class="value">${formatMoney(grandTotal)}</div>
      </div>
      <div class="summary-box profit">
        <div class="label">عدد الأصناف</div>
        <div class="value">${products.length}</div>
      </div>
      <div class="summary-box">
        <div class="label">إجمالي الوارد</div>
        <div class="value">${movements.reduce((s,m)=>s+m.totalIn,0).toFixed(0)}</div>
      </div>
      <div class="summary-box">
        <div class="label">إجمالي الصادر</div>
        <div class="value">${movements.reduce((s,m)=>s+m.totalOut,0).toFixed(0)}</div>
      </div>
    </div>

    <div class="card" style="padding:0">
      <div class="card-header" style="padding:12px 16px">
        <span class="card-title">📦 حركة الأصناف</span>
      </div>
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>المنتج</th>
              <th>الفئة</th>
              <th>الوحدة</th>
              <th>إجمالي الوارد</th>
              <th>إجمالي الصادر</th>
              <th>الرصيد الحالي</th>
              <th>سعر الكلفة</th>
              <th>القيمة بالتكلفة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map(({ p, totalIn, totalOut, fifoValue }) => `
              <tr>
                <td class="number">${p.code}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>${p.unit}</td>
                <td class="number text-success">+ ${totalIn}</td>
                <td class="number text-danger">- ${totalOut}</td>
                <td class="number ${p.stock_qty <= p.min_stock ? 'text-danger' : 'text-success'}" style="font-weight:700">
                  ${p.stock_qty}
                </td>
                <td class="number">${formatMoney(p.cost)}</td>
                <td class="number" style="color:var(--accent)">${formatMoney(fifoValue)}</td>
                <td>${p.stock_qty <= p.min_stock
                  ? '<span class="badge badge-danger">نقص مخزون</span>'
                  : '<span class="badge badge-success">طبيعي</span>'
                }</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg-input);font-weight:700">
              <td colspan="8">إجمالي قيمة المخزون</td>
              <td class="number" style="color:var(--accent)">${formatMoney(grandTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

// ============================================
// تقرير مديونية العملاء مع حد الائتمان — Module 8.5
// ============================================
function renderReportCustomerCredit() {
  const content = document.getElementById('page-content');

  const customers  = DB.getAll('customers');
  const crmRecords = DB.getAll('crm_customers');
  const sales      = DB.getAll('sales');

  // دالة حساب رصيد العميل
  const getBalance = (customerId) =>
    sales.filter(s => s.customer_id === customerId
                   && s.status !== 'paid'
                   && s.status !== 'cancelled')
         .reduce((sum, s) => sum + ((s.total_amount || 0) - (s.paid_amount || 0)), 0);

  // أقدم فاتورة غير مسددة
  const getOldestInvoice = (customerId) => {
    const unpaid = sales
      .filter(s => s.customer_id === customerId && s.status !== 'paid' && s.status !== 'cancelled')
      .sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date));
    return unpaid.length > 0 ? unpaid[0] : null;
  };

  const rows = customers.map(c => {
    const crmRec      = crmRecords.find(r => r.id === c.id) || {};
    const balance     = getBalance(c.id);
    const creditLimit = crmRec.creditLimit || 0;
    const usedPct     = creditLimit > 0 ? (balance / creditLimit * 100) : 0;
    const available   = creditLimit > 0 ? Math.max(0, creditLimit - balance) : null;
    const oldest      = getOldestInvoice(c.id);
    const isBreached  = creditLimit > 0 && balance > creditLimit;
    return { c, balance, creditLimit, usedPct, available, oldest, isBreached };
  }).sort((a, b) => b.balance - a.balance);

  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);
  const breachedCount = rows.filter(r => r.isBreached).length;

  window._ccData = rows;

  content.innerHTML = `
    <div class="page-header">
      <div><h2>مديونية العملاء وحد الائتمان</h2><p>الرصيد المستحق مقارنة بالحد الائتماني</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="exportCCExcel()">📊 Excel</button>
        <button class="btn btn-secondary" onclick="exportCCPDF()">📄 PDF</button>
      </div>
    </div>

    <div class="report-summary">
      <div class="summary-box loss">
        <div class="label">إجمالي المديونية</div>
        <div class="value">${formatMoney(totalBalance)}</div>
      </div>
      <div class="summary-box">
        <div class="label">عدد العملاء</div>
        <div class="value">${customers.length}</div>
      </div>
      <div class="summary-box ${breachedCount > 0 ? 'loss' : 'profit'}">
        <div class="label">تجاوزو حد الائتمان</div>
        <div class="value">${breachedCount}</div>
      </div>
      <div class="summary-box profit">
        <div class="label">لا توجد ديون مستحقة</div>
        <div class="value">${rows.filter(r => r.balance <= 0).length}</div>
      </div>
    </div>

    ${breachedCount > 0 ? `
      <div style="background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.3);border-radius:8px;padding:12px 16px;margin-bottom:16px">
        <strong class="text-danger">⚠ تحذير: ${breachedCount} عميل تجاوز حد الائتمان</strong>
      </div>
    ` : ''}

    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>العميل</th>
              <th>الرصيد المستحق</th>
              <th>حد الائتمان</th>
              <th>% المستخدم</th>
              <th>المتاح</th>
              <th>أقدم فاتورة</th>
              <th>عمر الدين (يوم)</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ c, balance, creditLimit, usedPct, available, oldest, isBreached }) => {
              const ageDays = oldest
                ? Math.floor((new Date() - new Date(oldest.invoice_date)) / 86400000)
                : 0;
              const usedBar = creditLimit > 0 ? Math.min(usedPct, 100) : 0;
              return `
                <tr style="${isBreached ? 'background:rgba(224,82,82,0.06)' : ''}">
                  <td><strong>${c.name}</strong><br>
                    <span style="font-size:11px;color:var(--text-muted)">${c.phone || ''}</span>
                  </td>
                  <td class="number" style="color:${balance>0?'var(--danger)':'var(--success)'};font-weight:700">
                    ${formatMoney(balance)}
                  </td>
                  <td class="number">${creditLimit > 0 ? formatMoney(creditLimit) : '<span class="badge badge-info">غير محدد</span>'}</td>
                  <td>
                    ${creditLimit > 0 ? `
                      <div style="display:flex;align-items:center;gap:6px">
                        <div style="flex:1;height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden">
                          <div style="height:100%;width:${usedBar.toFixed(0)}%;background:${isBreached?'var(--danger)':usedPct>75?'var(--warning)':'var(--success)'};border-radius:4px;transition:width .3s"></div>
                        </div>
                        <span style="font-size:12px;font-weight:700;min-width:36px;color:${isBreached?'var(--danger)':usedPct>75?'var(--warning)':'var(--success)'}">${usedPct.toFixed(0)}%</span>
                      </div>` : '-'}
                  </td>
                  <td class="number ${available !== null && available < 1000 ? 'text-danger' : 'text-success'}">
                    ${available !== null ? formatMoney(available) : '-'}
                  </td>
                  <td>${oldest ? oldest.invoice_number + '<br><span style="font-size:11px;color:var(--text-muted)">' + formatDate(oldest.invoice_date) + '</span>' : '-'}</td>
                  <td class="number ${ageDays > 90 ? 'text-danger' : ageDays > 60 ? 'text-warning' : ''}">
                    ${ageDays > 0 ? ageDays : '-'}
                  </td>
                  <td>${isBreached
                    ? '<span class="badge badge-danger">تجاوز الحد</span>'
                    : balance > 0
                    ? '<span class="badge badge-warning">مديون</span>'
                    : '<span class="badge badge-success">نظيف</span>'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================
// تصدير تقرير التدفقات النقدية
// ============================================
function exportCashFlowPDF() {
  const d = window._cfData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['البند', 'المبلغ (EGP)'];
  const rows = [
    ['تحصيلات من العملاء',     d.operInflows.toFixed(2)],
    ['مدفوعات للموردين',      '-' + d.operOutflows.toFixed(2)],
    ['المصروفات التشغيلية',   '-' + d.expenses.toFixed(2)],
    ['صافي أنشطة التشغيل',    d.operatingNet.toFixed(2)],
    ['شراء بلوكات (رأسمالي)', '-' + d.capitalPurchases.toFixed(2)],
    ['صافي أنشطة الاستثمار',  d.investingNet.toFixed(2)],
    ['صافي أنشطة التمويل',    d.financingNet.toFixed(2)],
  ];
  exportGenericPDF({ title: 'تقرير التدفقات النقدية', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow: ['صافي التدفق النقدي', d.netCashFlow.toFixed(2) + ' EGP'], filename: `cashflow-${new Date().toISOString().split('T')[0]}.pdf`, orientation: 'portrait' });
}

function exportCashFlowExcel() {
  const d = window._cfData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['البند', 'المبلغ (EGP)'];
  const rows = [
    ['تحصيلات من العملاء',     d.operInflows],
    ['مدفوعات للموردين',       -d.operOutflows],
    ['المصروفات التشغيلية',    -d.expenses],
    ['صافي أنشطة التشغيل',     d.operatingNet],
    ['شراء بلوكات',            -d.capitalPurchases],
    ['صافي أنشطة الاستثمار',   d.investingNet],
    ['صافي أنشطة التمويل',     d.financingNet],
    ['صافي التدفق النقدي',      d.netCashFlow],
  ];
  exportGenericExcel({ sheetName: 'التدفقات النقدية', headers, rows, filename: `cashflow-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ============================================
// تصدير تقرير تكلفة المتر
// ============================================
function exportCPMPDF() {
  const d = window._cpmData;
  if (!d || !d.length) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['المرحلة', 'التكلفة المباشرة', 'غير المباشرة', 'الكمية م²', 'تكلفة المتر', '% الهالك'];
  const rows = d.map(({ r, directTotal, indirectAlloc, cpm, wasteRate }) => [
    r.stage, directTotal.toFixed(2), indirectAlloc.toFixed(2), r.outputQty.toFixed(2), cpm.toFixed(2), wasteRate + '%'
  ]);
  exportGenericPDF({ title: 'تقرير تكلفة المتر المصنع', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, filename: `cost-per-meter-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportCPMExcel() {
  const d = window._cpmData;
  if (!d || !d.length) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['المرحلة', 'عدد العمليات', 'التكلفة المباشرة', 'غير المباشرة', 'الإجمالي', 'الكمية م²', 'تكلفة المتر', '% الهالك', 'التكلفة التراكمية'];
  const rows = d.map(({ r, directTotal, indirectAlloc, totalCost, cumulativeCost, cpm, wasteRate }) => [
    r.stage, r.count, directTotal, indirectAlloc, totalCost, r.outputQty, cpm, parseFloat(wasteRate), cumulativeCost
  ]);
  exportGenericExcel({ sheetName: 'تكلفة المتر', headers, rows, filename: `cost-per-meter-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ============================================
// تصدير تقرير ربحية التصدير
// ============================================
function exportEPPDF() {
  const d = window._epData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['رقم الأمر', 'العميل', 'الوجهة', 'الإيراد', 'التكلفة', 'الربح', 'الهامش%'];
  const rows = d.orders.map(o => {
    const profit = (o.totalRevenue || 0) - (o.totalCost || 0);
    const pct    = (o.totalRevenue || 0) > 0 ? (profit / o.totalRevenue * 100).toFixed(1) : '0.0';
    return [o.exportOrderNo, o.customerName || '-', o.destination || '-', (o.totalRevenue||0).toFixed(2), (o.totalCost||0).toFixed(2), profit.toFixed(2), pct + '%'];
  });
  const totalsRow = ['الإجمالي', '', '', d.totalRevenue.toFixed(2), d.totalCost.toFixed(2), d.totalProfit.toFixed(2), (d.totalRevenue > 0 ? (d.totalProfit/d.totalRevenue*100).toFixed(1) : '0') + '%'];
  exportGenericPDF({ title: 'تقرير ربحية التصدير', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow, filename: `export-profit-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportEPExcel() {
  const d = window._epData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['رقم الأمر', 'العميل', 'الوجهة', 'العملة', 'الإيراد', 'التكلفة', 'الربح', 'الهامش%'];
  const rows = d.orders.map(o => {
    const profit = (o.totalRevenue || 0) - (o.totalCost || 0);
    const pct    = (o.totalRevenue || 0) > 0 ? (profit / o.totalRevenue * 100).toFixed(1) : '0.0';
    return [o.exportOrderNo, o.customerName || '-', o.destination || '-', o.currency || 'EGP', o.totalRevenue || 0, o.totalCost || 0, profit, parseFloat(pct)];
  });
  const totalsRow = ['الإجمالي', '', '', '', d.totalRevenue, d.totalCost, d.totalProfit, d.totalRevenue > 0 ? parseFloat((d.totalProfit/d.totalRevenue*100).toFixed(1)) : 0];
  exportGenericExcel({ sheetName: 'ربحية التصدير', headers, rows, totalsRow, filename: `export-profit-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ============================================
// تصدير تقرير حركة المخزون
// ============================================
function exportIMPDF() {
  const d = window._imData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['الكود', 'المنتج', 'الوارد', 'الصادر', 'الرصيد', 'سعر الكلفة', 'القيمة'];
  const rows = d.map(({ p, totalIn, totalOut, fifoValue }) => [
    p.code, p.name, totalIn, totalOut, p.stock_qty, p.cost.toFixed(2), fifoValue.toFixed(2)
  ]);
  const totalVal = d.reduce((s, m) => s + m.fifoValue, 0);
  exportGenericPDF({ title: 'تقرير حركة المخزون', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow: ['', 'الإجمالي', '', '', '', '', totalVal.toFixed(2) + ' EGP'], filename: `inventory-movement-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportIMExcel() {
  const d = window._imData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['الكود', 'المنتج', 'الفئة', 'الوحدة', 'وارد', 'صادر', 'الرصيد الحالي', 'سعر الكلفة (EGP)', 'القيمة بالتكلفة'];
  const rows = d.map(({ p, totalIn, totalOut, fifoValue }) => [
    p.code, p.name, p.category, p.unit, totalIn, totalOut, p.stock_qty, p.cost, fifoValue
  ]);
  const totalVal = d.reduce((s, m) => s + m.fifoValue, 0);
  exportGenericExcel({ sheetName: 'حركة المخزون', headers, rows, totalsRow: ['', 'الإجمالي', '', '', '', '', '', '', totalVal], filename: `inventory-movement-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ============================================
// تصدير تقرير مديونية العملاء
// ============================================
function exportCCPDF() {
  const d = window._ccData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['العميل', 'الرصيد المستحق', 'حد الائتمان', '% المستخدم', 'المتاح', 'أقدم فاتورة', 'عمر الدين'];
  const rows = d.map(({ c, balance, creditLimit, usedPct, available, oldest }) => {
    const ageDays = oldest ? Math.floor((new Date() - new Date(oldest.invoice_date)) / 86400000) : 0;
    return [c.name, balance.toFixed(2), creditLimit > 0 ? creditLimit.toFixed(2) : 'غير محدد', creditLimit > 0 ? usedPct.toFixed(1) + '%' : '-', available !== null ? available.toFixed(2) : '-', oldest ? oldest.invoice_number : '-', ageDays > 0 ? ageDays + ' يوم' : '-'];
  });
  const totalBalance = d.reduce((s, r) => s + r.balance, 0);
  exportGenericPDF({ title: 'مديونية العملاء وحد الائتمان', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow: ['الإجمالي', totalBalance.toFixed(2) + ' EGP', '', '', '', '', ''], filename: `customer-credit-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportCCExcel() {
  const d = window._ccData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['العميل', 'الهاتف', 'الرصيد المستحق (EGP)', 'حد الائتمان (EGP)', '% المستخدم', 'المتاح (EGP)', 'أقدم فاتورة', 'عمر الدين (يوم)', 'الحالة'];
  const rows = d.map(({ c, balance, creditLimit, usedPct, available, oldest, isBreached }) => {
    const ageDays = oldest ? Math.floor((new Date() - new Date(oldest.invoice_date)) / 86400000) : 0;
    return [c.name, c.phone || '', balance, creditLimit || 0, creditLimit > 0 ? parseFloat(usedPct.toFixed(1)) : '', available !== null ? available : '', oldest ? oldest.invoice_number : '', ageDays > 0 ? ageDays : '', isBreached ? 'تجاوز الحد' : balance > 0 ? 'مديون' : 'نظيف'];
  });
  const totalBalance = d.reduce((s, r) => s + r.balance, 0);
  exportGenericExcel({ sheetName: 'مديونية العملاء', headers, rows, totalsRow: ['الإجمالي', '', totalBalance, '', '', '', '', '', ''], filename: `customer-credit-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== EXPORT: INVENTORY =====
function exportInventoryPDF() {
  const r = window._inventoryData;
  if (!r) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['الكود', 'المنتج', 'الفئة', 'الوحدة', 'المخزون', 'الحد الأدنى', 'سعر الكلفة', 'القيمة الكلية'];
  const rows = r.products.map(p => [p.code, (p.name || '').substring(0, 20), p.category, p.unit, p.stock_qty, p.min_stock, parseFloat(p.cost).toFixed(2) + ' EGP', (p.cost * p.stock_qty).toFixed(2) + ' EGP']);
  const totalVal = r.products.reduce((s, p) => s + p.cost * p.stock_qty, 0);
  const totalsRow = ['', 'الإجمالي', '', '', '', '', '', totalVal.toFixed(2) + ' EGP'];
  exportGenericPDF({ title: 'تقرير المخزون', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow, filename: `inventory-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportInventoryExcel() {
  const r = window._inventoryData;
  if (!r) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['الكود', 'المنتج', 'الفئة', 'الوحدة', 'المخزون الحالي', 'الحد الأدنى', 'سعر الكلفة (EGP)', 'القيمة الكلية (EGP)'];
  const rows = r.products.map(p => [p.code, p.name, p.category, p.unit, p.stock_qty, p.min_stock, p.cost, p.cost * p.stock_qty]);
  const totalVal = r.products.reduce((s, p) => s + p.cost * p.stock_qty, 0);
  const totalsRow = ['', 'الإجمالي', '', '', '', '', '', totalVal];
  exportGenericExcel({ sheetName: 'تقرير المخزون', headers, rows, totalsRow, filename: `inventory-${new Date().toISOString().split('T')[0]}.xlsx` });
}
