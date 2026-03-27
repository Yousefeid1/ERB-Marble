// ============================================
// Financial Reports Pages
// ============================================

// ===== P&L REPORT =====
async function renderReportPL() {
  const content = document.getElementById('page-content');
  try {
    const r = await api.reportPL();
    const grossMargin = r.revenue > 0 ? (r.gross_profit / r.revenue * 100).toFixed(1) : 0;
    const netMargin   = r.revenue > 0 ? (r.net_profit   / r.revenue * 100).toFixed(1) : 0;

    content.innerHTML = `
      <div class="page-header"><div><h2>تقرير الأرباح والخسائر</h2><p>نتائج الأعمال التشغيلية</p></div></div>

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
    const typeNames = { asset: 'الأصول', liability: 'الخصوم', equity: 'حقوق الملكية' };

    const renderGroup = (type) => {
      const items = accounts.filter(a => a.type === type && a.parent_id !== null && a.balance !== 0);
      return items.map(a => `<tr><td style="padding-right:24px">${a.name}</td><td class="number">${formatMoney(a.balance)}</td></tr>`).join('');
    };

    content.innerHTML = `
      <div class="page-header"><div><h2>الميزانية العمومية</h2><p>المركز المالي للشركة</p></div></div>

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

    content.innerHTML = `
      <div class="page-header"><div><h2>تقرير الهالك</h2><p>تحليل نسبة الهالك في عمليات القطع</p></div></div>
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
      <div class="page-header"><div><h2>تقرير المخزون</h2><p>الوضع الحالي للمخزون</p></div></div>
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
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}
