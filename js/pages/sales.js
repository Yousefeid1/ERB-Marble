// ============================================
// Sales Pages
// ============================================

// ===== SALES =====
let _salesPage = 1;

async function renderSales(page) {
  if (page) _salesPage = page;
  const content = document.getElementById('page-content');
  try {
    const customers = await api.customers();
    const { data: sales } = await api.sales();

    const paged = slicePage(sales, _salesPage);
    const pagination = renderPaginationBar(_salesPage, sales.length, 'renderSales');

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h2>فواتير المبيعات</h2>
          <p>إدارة وتتبع جميع فواتير البيع</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportSalesExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportSalesPDF()">📄 PDF</button>
          <button class="btn btn-primary" onclick="openNewSaleModal()">＋ فاتورة جديدة</button>
        </div>
      </div>

      <div class="filters-bar">
        <input type="text" id="sales-search" placeholder="بحث برقم الفاتورة أو العميل..." oninput="filterSales()" style="flex:1;min-width:200px">
        <select id="sales-status-filter" onchange="filterSales()">
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="sent">مرسلة</option>
          <option value="partial">جزئي</option>
          <option value="paid">مسددة</option>
          <option value="cancelled">ملغاة</option>
          <option value="rejected">مرفوضة</option>
        </select>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table id="sales-table">
            <thead><tr>
              <th>رقم الفاتورة</th>
              <th>العميل</th>
              <th>التاريخ</th>
              <th>تاريخ الاستحقاق</th>
              <th>الإجمالي</th>
              <th>المدفوع</th>
              <th>المتبقي</th>
              <th>العملة</th>
              <th>السعر التفاوضي</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr></thead>
            <tbody id="sales-tbody">
              ${renderSalesRows(paged)}
            </tbody>
          </table>
        </div>
        ${pagination}
      </div>
    `;

    window._salesData     = sales;
    window._customersData = customers;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function isInvoiceFinal(status) {
  return status === 'paid' || status === 'cancelled' || status === 'rejected';
}

function getDueDateClass(sale) {
  if (!sale.due_date || isInvoiceFinal(sale.status)) return '';
  return new Date(sale.due_date) < new Date() ? 'text-danger' : '';
}

function renderSalesRows(sales) {
  if (!sales.length) return `<tr><td colspan="11"><div class="empty-state" style="padding:40px"><div class="empty-icon">🧾</div><h3>لا توجد فواتير</h3></div></td></tr>`;
  const canChangeStatus = canUserChangeInvoiceStatus();
  return sales.map(s => `
    <tr>
      <td class="number"><strong>${s.invoice_number}</strong></td>
      <td>${s.customer}</td>
      <td>${formatDate(s.invoice_date)}</td>
      <td class="${getDueDateClass(s)}">${formatDate(s.due_date)}</td>
      <td class="number">${formatMoney(s.total_amount, s.currency || 'EGP')}</td>
      <td class="number text-success">${formatMoney(s.paid_amount, s.currency || 'EGP')}</td>
      <td class="number ${s.total_amount - s.paid_amount > 0 ? 'text-danger' : 'text-success'}">${formatMoney(s.total_amount - s.paid_amount, s.currency || 'EGP')}</td>
      <td>${s.currency || 'EGP'}</td>
      <td class="number">${s.negotiated_price ? formatMoney(s.negotiated_price, s.currency || 'EGP') : '-'}</td>
      <td>${statusBadge(s.status)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="viewSaleDetail(${s.id})">عرض</button>
        ${canChangeStatus && !isInvoiceFinal(s.status)
          ? `<button class="btn btn-secondary btn-sm" onclick="openChangeSaleStatusModal(${s.id})">تغيير الحالة</button>`
          : ''}
        ${canChangeStatus && !isInvoiceFinal(s.status)
          ? `<button class="btn btn-danger btn-sm" onclick="cancelSale(${s.id})">إلغاء</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

async function filterSales() {
  const search = document.getElementById('sales-search').value;
  const status = document.getElementById('sales-status-filter').value;
  const { data } = await api.sales({ search, status });
  _salesPage = 1;
  window._salesData = data;
  _updateTableWithPagination('sales-tbody', renderSalesRows, data, 1, 'renderSales');
}

function canUserChangeInvoiceStatus() {
  const role = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
  return ['مدير عام', 'مدير', 'محاسب', 'مدير مبيعات', 'مدير قسم'].includes(role);
}

async function cancelSale(id) {
  if (!confirm('هل تريد إلغاء هذه الفاتورة؟')) return;
  await api.cancelSale(id);
  toast('تم إلغاء الفاتورة', 'success');
  renderSales();
}

function openChangeSaleStatusModal(id) {
  const sales = window._salesData || [];
  const s = sales.find(x => x.id === id);
  if (!s) return;
  openModal(`تغيير حالة الفاتورة ${s.invoice_number}`, `
    <div style="margin-bottom:16px">
      <p>العميل: <strong>${s.customer}</strong></p>
      <p>الحالة الحالية: ${statusBadge(s.status)}</p>
    </div>
    <div class="form-group">
      <label>الحالة الجديدة *</label>
      <select id="change-status-val">
        <option value="draft"     ${s.status==='draft'     ?'selected':''}>مسودة</option>
        <option value="sent"      ${s.status==='sent'      ?'selected':''}>مرسلة / معلقة</option>
        <option value="partial"   ${s.status==='partial'   ?'selected':''}>جزئي مدفوع</option>
        <option value="paid"      ${s.status==='paid'      ?'selected':''}>مدفوعة</option>
        <option value="cancelled" ${s.status==='cancelled' ?'selected':''}>ملغاة</option>
        <option value="rejected"  ${s.status==='rejected'  ?'selected':''}>مرفوضة</option>
      </select>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="confirmChangeSaleStatus(${id})">💾 تأكيد التغيير</button>
    </div>
  `);
}

async function confirmChangeSaleStatus(id) {
  const newStatus = document.getElementById('change-status-val').value;
  try {
    await api.updateSaleStatus(id, newStatus);
    closeModal();
    toast('تم تغيير حالة الفاتورة بنجاح', 'success');
    renderSales();
    loadNotifications();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function viewSaleDetail(id) {
  const s = await api.saleDetail(id);
  if (!s) return;
  const itemsHTML = s.items.map(it => `
    <tr>
      <td>${it.product}</td>
      <td class="number">${it.qty}</td>
      <td class="number">${formatMoney(it.unit_price)}</td>
      <td class="number">${formatMoney(it.subtotal)}</td>
    </tr>
  `).join('');
  openModal(`فاتورة ${s.invoice_number}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div><span class="text-muted">العميل:</span> <strong>${s.customer}</strong></div>
      <div><span class="text-muted">تاريخ الفاتورة:</span> <strong>${formatDate(s.invoice_date)}</strong></div>
      <div><span class="text-muted">تاريخ الاستحقاق:</span> <strong>${formatDate(s.due_date)}</strong></div>
      <div><span class="text-muted">الحالة:</span> ${statusBadge(s.status)}</div>
      <div><span class="text-muted">العملة:</span> <strong>${s.currency || 'EGP'}</strong></div>
      ${s.negotiated_price ? `<div><span class="text-muted">السعر التفاوضي:</span> <strong style="color:var(--accent)">${formatMoney(s.negotiated_price, s.currency || 'EGP')}</strong></div>` : ''}
      ${s.negotiated_price ? `<div><span class="text-muted">الفرق:</span> <strong class="text-danger">${formatMoney(s.total_amount - s.negotiated_price, s.currency || 'EGP')}</strong></div>` : ''}
    </div>
    <div class="data-table-wrapper" style="margin-bottom:16px">
      <table>
        <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
    </div>
    <div style="text-align:left;padding:16px;background:var(--bg-input);border-radius:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>الإجمالي قبل الضريبة:</span><strong>${formatMoney(s.subtotal)}</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>الضريبة (14%):</span><strong>${formatMoney(s.tax)}</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>الإجمالي:</span><strong style="color:var(--accent)">${formatMoney(s.total_amount)}</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span>المدفوع:</span><strong class="text-success">${formatMoney(s.paid_amount)}</strong></div>
      <div style="display:flex;justify-content:space-between"><span>المتبقي:</span><strong class="text-danger">${formatMoney(s.total_amount - s.paid_amount)}</strong></div>
    </div>
    ${s.notes ? `<p style="margin-top:12px;color:var(--text-secondary)">ملاحظات: ${s.notes}</p>` : ''}
  `);
}

function openNewSaleModal() {
  const customers = window._customersData || [];
  openModal('فاتورة مبيعات جديدة', `
    <div class="form-grid">
      <div class="form-group">
        <label>العميل *</label>
        <select id="ns-customer">
          <option value="">اختر العميل</option>
          ${customers.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>تاريخ الفاتورة *</label>
        <input type="date" id="ns-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>تاريخ الاستحقاق *</label>
        <input type="date" id="ns-due" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>الحالة</label>
        <select id="ns-status">
          <option value="draft">مسودة</option>
          <option value="sent">مرسلة</option>
        </select>
      </div>
      <div class="form-group">
        <label>العملة</label>
        <select id="ns-currency">
          <option value="EGP">ج.م (EGP)</option>
          <option value="USD">دولار (USD)</option>
        </select>
      </div>
    </div>
    <hr class="divider">
    <div id="ns-items">
      <div class="line-row" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;font-size:12px;color:var(--text-muted)">
        <span>المنتج</span><span>الكمية</span><span>السعر</span><span></span>
      </div>
      <div id="ns-items-list">
        ${newSaleItemRow(0)}
      </div>
    </div>
    <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addSaleItemRow()">＋ إضافة بند</button>
    <div style="text-align:left;margin-top:16px;padding:12px;background:var(--bg-input);border-radius:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>الإجمالي قبل الضريبة:</span><strong id="ns-subtotal">0.00 EGP</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>الضريبة (14%):</span><strong id="ns-tax">0.00 EGP</strong></div>
      <div style="display:flex;justify-content:space-between"><span>الإجمالي:</span><strong id="ns-total" style="color:var(--accent)">0.00 EGP</strong></div>
    </div>
    ${isManager() ? `<div class="form-group form-full" style="margin-top:8px">
      <label>السعر التفاوضي (للمدير فقط - اختياري)</label>
      <input type="number" id="ns-negotiated-price" placeholder="اتركه فارغاً لاستخدام السعر الأساسي" min="0">
    </div>` : ''}
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveSale()">💾 حفظ الفاتورة</button>
    </div>
  `);
}

function newSaleItemRow(idx) {
  const products = (window._productsCache || []);
  return `
    <div class="line-row" id="ns-item-${idx}" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center">
      <input type="text" placeholder="اسم المنتج" id="ns-item-prod-${idx}" oninput="calcSaleTotals()">
      <input type="number" placeholder="الكمية" id="ns-item-qty-${idx}" min="1" value="1" oninput="calcSaleTotals()">
      <input type="number" placeholder="السعر" id="ns-item-price-${idx}" min="0" value="0" oninput="calcSaleTotals()">
      <button class="btn btn-danger btn-sm" onclick="this.closest('.line-row').remove();calcSaleTotals()">✕</button>
    </div>
  `;
}

window._saleItemCount = 0;
function addSaleItemRow() {
  window._saleItemCount++;
  document.getElementById('ns-items-list').insertAdjacentHTML('beforeend', newSaleItemRow(window._saleItemCount));
}

function calcSaleTotals() {
  let subtotal = 0;
  document.querySelectorAll('[id^="ns-item-qty-"]').forEach(qtyEl => {
    const idx   = qtyEl.id.split('-').pop();
    const qty   = parseFloat(qtyEl.value) || 0;
    const price = parseFloat(document.getElementById(`ns-item-price-${idx}`)?.value) || 0;
    subtotal += qty * price;
  });
  const tax   = subtotal * 0.14;
  const total = subtotal + tax;
  document.getElementById('ns-subtotal').textContent = formatMoney(subtotal);
  document.getElementById('ns-tax').textContent      = formatMoney(tax);
  document.getElementById('ns-total').textContent    = formatMoney(total);
}

async function saveSale() {
  const custEl = document.getElementById('ns-customer');
  if (!custEl.value) { toast('الرجاء اختيار العميل', 'error'); return; }
  const items = [];
  document.querySelectorAll('[id^="ns-item-qty-"]').forEach(qtyEl => {
    const idx   = qtyEl.id.split('-').pop();
    const prod  = document.getElementById(`ns-item-prod-${idx}`)?.value?.trim();
    const qty   = parseFloat(qtyEl.value) || 0;
    const price = parseFloat(document.getElementById(`ns-item-price-${idx}`)?.value) || 0;
    if (prod && qty > 0) items.push({ product_id: null, product: prod, qty, unit_price: price, subtotal: qty * price });
  });
  if (!items.length) { toast('أضف بندًا واحدًا على الأقل', 'error'); return; }
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const tax      = subtotal * 0.14;
  await api.createSale({
    customer_id:   parseInt(custEl.value),
    customer:      custEl.options[custEl.selectedIndex].dataset.name,
    invoice_date:  document.getElementById('ns-date').value,
    due_date:      document.getElementById('ns-due').value,
    status:        document.getElementById('ns-status').value,
    currency:      document.getElementById('ns-currency')?.value || 'EGP',
    negotiated_price: isManager() && document.getElementById('ns-negotiated-price')?.value
      ? parseFloat(document.getElementById('ns-negotiated-price').value)
      : null,
    items, subtotal, tax, total_amount: subtotal + tax, paid_amount: 0,
  });
  closeModal();
  toast('تم حفظ الفاتورة بنجاح', 'success');
  renderSales();
}

// ===== CUSTOMERS =====
async function renderCustomers() {
  const content = document.getElementById('page-content');
  try {
    const customers = await api.customers();
    content.innerHTML = `
      <div class="page-header">
        <div><h2>العملاء</h2><p>إدارة بيانات العملاء</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportCustomersExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportCustomersPDF()">📄 PDF</button>
          <button class="btn btn-primary" onclick="openNewCustomerModal()">＋ عميل جديد</button>
        </div>
      </div>
      <div class="filters-bar">
        <input type="text" id="cust-search" placeholder="بحث باسم العميل..." oninput="filterCustomers()" style="flex:1">
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>البريد الإلكتروني</th><th>العنوان</th><th>الرصيد المستحق</th><th>تاريخ الإنشاء</th></tr></thead>
            <tbody id="cust-tbody">${renderCustomerRows(customers)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._customersListData = customers;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderCustomerRows(customers) {
  if (!customers.length) return `<tr><td colspan="6"><div class="empty-state" style="padding:30px"><div class="empty-icon">👤</div><h3>لا يوجد عملاء</h3></div></td></tr>`;
  return customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone || '-'}</td>
      <td>${c.email || '-'}</td>
      <td>${c.address || '-'}</td>
      <td class="number ${c.balance > 0 ? 'text-danger' : 'text-success'}">${formatMoney(c.balance)}</td>
      <td>${formatDate(c.created_at)}</td>
    </tr>
  `).join('');
}

async function filterCustomers() {
  const search    = document.getElementById('cust-search').value;
  const customers = await api.customers({ search });
  document.getElementById('cust-tbody').innerHTML = renderCustomerRows(customers);
}

function openNewCustomerModal() {
  openModal('عميل جديد', `
    <div class="form-grid">
      <div class="form-group form-full"><label>اسم العميل *</label><input type="text" id="nc-name" placeholder="اسم الشركة أو الشخص"></div>
      <div class="form-group"><label>الهاتف</label><input type="text" id="nc-phone" placeholder="01xxxxxxxxx"></div>
      <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="nc-email" placeholder="email@example.com"></div>
      <div class="form-group form-full"><label>العنوان</label><input type="text" id="nc-address" placeholder="المدينة، المنطقة"></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveCustomer()">💾 حفظ</button>
    </div>
  `);
}

async function saveCustomer() {
  const name = document.getElementById('nc-name').value.trim();
  if (!name) { toast('الرجاء إدخال اسم العميل', 'error'); return; }
  await api.createCustomer({ name, phone: document.getElementById('nc-phone').value, email: document.getElementById('nc-email').value, address: document.getElementById('nc-address').value });
  closeModal();
  toast('تم إضافة العميل بنجاح', 'success');
  renderCustomers();
}

// ===== AGING REPORT =====
async function renderAging() {
  const content = document.getElementById('page-content');
  try {
    const aging = await api.aging();
    const buckets = { 'current': 0, '0-30': 0, '30-60': 0, '60-90': 0, '90+': 0 };
    aging.forEach(s => { buckets[s.bucket] = (buckets[s.bucket] || 0) + s.outstanding; });
    const total = aging.reduce((s, i) => s + i.outstanding, 0);

    content.innerHTML = `
      <div class="page-header"><div><h2>تقرير التقادم</h2><p>مستحقات العملاء حسب عمر الدين</p></div></div>
      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي المستحقات</div><div class="value">${formatMoney(total)}</div></div>
        <div class="summary-box"><div class="label">جارية (Current)</div><div class="value">${formatMoney(buckets['current'])}</div></div>
        <div class="summary-box"><div class="label">1-30 يوم</div><div class="value">${formatMoney(buckets['0-30'])}</div></div>
        <div class="summary-box loss"><div class="label">31-60 يوم</div><div class="value">${formatMoney(buckets['30-60'])}</div></div>
        <div class="summary-box loss"><div class="label">61-90 يوم</div><div class="value">${formatMoney(buckets['60-90'])}</div></div>
        <div class="summary-box loss"><div class="label">أكثر من 90 يوم</div><div class="value">${formatMoney(buckets['90+'])}</div></div>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>تاريخ الاستحقاق</th><th>أيام التأخير</th><th>المبلغ المستحق</th><th>الفئة</th></tr></thead>
            <tbody>
              ${aging.length === 0
                ? `<tr><td colspan="6"><div class="empty-state" style="padding:30px"><div class="empty-icon">✅</div><h3>لا توجد مستحقات متأخرة</h3></div></td></tr>`
                : aging.sort((a, b) => b.days_overdue - a.days_overdue).map(s => `
                  <tr>
                    <td class="number">${s.invoice_number}</td>
                    <td>${s.customer}</td>
                    <td>${formatDate(s.due_date)}</td>
                    <td class="number ${s.days_overdue > 0 ? 'text-danger' : 'text-success'}">${s.days_overdue > 0 ? s.days_overdue + ' يوم' : 'لم تستحق'}</td>
                    <td class="number text-danger">${formatMoney(s.outstanding)}</td>
                    <td><span class="badge ${s.bucket === 'current' ? 'badge-success' : s.days_overdue > 60 ? 'badge-danger' : 'badge-warning'}">${s.bucket === 'current' ? 'جارية' : s.bucket + ' يوم'}</span></td>
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

// ===== EXPORT: SALES PDF =====
function exportSalesPDF() {
  const sales = window._salesData || [];
  if (!sales.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  const statusLabel = { draft: 'مسودة', sent: 'مرسلة', partial: 'جزئي', paid: 'مسددة', cancelled: 'ملغاة', rejected: 'مرفوضة' };
  const headers = ['#', 'رقم الفاتورة', 'العميل', 'التاريخ', 'العملة', 'الإجمالي', 'السعر التفاوضي', 'المدفوع', 'المتبقي', 'الحالة'];
  const rows = sales.map((s, i) => {
    const cur = s.currency || 'EGP';
    return [
      i + 1,
      s.invoice_number,
      (s.customer || '').substring(0, 20),
      formatDate(s.invoice_date),
      cur,
      parseFloat(s.total_amount || 0).toFixed(2) + ' ' + cur,
      s.negotiated_price ? parseFloat(s.negotiated_price).toFixed(2) + ' ' + cur : '-',
      parseFloat(s.paid_amount || 0).toFixed(2) + ' ' + cur,
      parseFloat((s.total_amount || 0) - (s.paid_amount || 0)).toFixed(2) + ' ' + cur,
      statusLabel[s.status] || s.status,
    ];
  });
  const totalAmt = sales.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = sales.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalsRow = ['', 'الإجمالي', '', '', '', totalAmt.toFixed(2) + ' EGP', '', totalPaid.toFixed(2) + ' EGP', (totalAmt - totalPaid).toFixed(2) + ' EGP', ''];
  exportGenericPDF({ title: 'فواتير المبيعات', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow, filename: `sales-${new Date().toISOString().split('T')[0]}.pdf` });
}

// ===== EXPORT: SALES EXCEL =====
function exportSalesExcel() {
  const sales = window._salesData || [];
  if (!sales.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('مكتبة Excel غير محملة', 'error'); return; }
  const statusLabel = { draft: 'مسودة', sent: 'مرسلة', partial: 'جزئي', paid: 'مسددة', cancelled: 'ملغاة', rejected: 'مرفوضة' };
  const headers = ['رقم الفاتورة', 'العميل', 'تاريخ الفاتورة', 'تاريخ الاستحقاق', 'العملة', 'الإجمالي', 'السعر التفاوضي', 'المدفوع', 'المتبقي', 'الحالة', 'ملاحظات'];
  const rows = sales.map(s => [
    s.invoice_number,
    s.customer,
    s.invoice_date,
    s.due_date || '-',
    s.currency || 'EGP',
    s.total_amount || 0,
    s.negotiated_price || '',
    s.paid_amount || 0,
    (s.total_amount || 0) - (s.paid_amount || 0),
    statusLabel[s.status] || s.status,
    s.notes || '-',
  ]);
  const totalAmt = sales.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalPaid = sales.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalsRow = ['الإجمالي', '', '', '', '', totalAmt, '', totalPaid, totalAmt - totalPaid, '', ''];
  exportGenericExcel({ sheetName: 'فواتير المبيعات', headers, rows, totalsRow, filename: `sales-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== EXPORT: CUSTOMERS =====
function exportCustomersPDF() {
  const customers = window._customersListData || [];
  const headers = ['#', 'الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'الرصيد المستحق'];
  const rows = customers.map((c, i) => [i + 1, (c.name || '').substring(0, 22), c.phone || '-', (c.email || '-').substring(0, 20), (c.address || '-').substring(0, 18), parseFloat(c.balance || 0).toFixed(2) + ' EGP']);
  const totalBalance = customers.reduce((s, c) => s + (c.balance || 0), 0);
  exportGenericPDF({ title: 'العملاء', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow: ['', '', '', '', 'إجمالي المستحقات', totalBalance.toFixed(2) + ' EGP'], filename: `customers-${new Date().toISOString().split('T')[0]}.pdf`, orientation: 'portrait' });
}

function exportCustomersExcel() {
  const customers = window._customersListData || [];
  const headers = ['الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'الرصيد المستحق (EGP)', 'تاريخ الإنشاء'];
  const rows = customers.map(c => [c.name, c.phone || '-', c.email || '-', c.address || '-', c.balance || 0, c.created_at || '-']);
  const totalBalance = customers.reduce((s, c) => s + (c.balance || 0), 0);
  exportGenericExcel({ sheetName: 'العملاء', headers, rows, totalsRow: ['الإجمالي', '', '', '', totalBalance, ''], filename: `customers-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// =============================================
// وحدة عروض الأسعار
// =============================================

async function renderQuotations() {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loader"></div>';
  try {
    const { data: quotations } = await api.quotations();
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h2>عروض الأسعار</h2>
          <p>إنشاء وإدارة عروض الأسعار للعملاء</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="openNewQuotationModal()">＋ عرض سعر جديد</button>
        </div>
      </div>
      <div class="filters-bar">
        <input type="text" id="quo-search" placeholder="بحث برقم العرض أو العميل..." oninput="filterQuotations()" style="flex:1">
        <select id="quo-status" onchange="filterQuotations()">
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="sent">مرسل</option>
          <option value="accepted">مقبول</option>
          <option value="rejected">مرفوض</option>
          <option value="invoiced">محوّل لفاتورة</option>
        </select>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم العرض</th><th>العميل</th><th>التاريخ</th><th>صالح حتى</th>
              <th>الإجمالي</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody id="quo-tbody">${renderQuotationRows(quotations)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderQuotationRows(quotations) {
  if (!quotations || !quotations.length) return `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="empty-icon">📋</div><h3>لا توجد عروض أسعار</h3><p>أنشئ أول عرض سعر للعملاء</p></div></td></tr>`;
  return quotations.map(q => `
    <tr>
      <td data-label="رقم العرض" class="number">${q.quotation_number}</td>
      <td data-label="العميل">${q.customer}</td>
      <td data-label="التاريخ">${formatDate(q.date)}</td>
      <td data-label="صالح حتى">${formatDate(q.valid_until) || '-'}</td>
      <td data-label="الإجمالي" class="number">${formatMoney(q.total_amount, q.currency || 'EGP')}</td>
      <td data-label="الحالة">${statusBadge(q.status)}</td>
      <td data-label="إجراءات">
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${q.status === 'draft' ? `<button class="btn btn-sm btn-secondary" onclick="sendQuotation(${q.id})">إرسال</button>` : ''}
          ${q.status === 'sent' ? `<button class="btn btn-sm btn-success" onclick="acceptQuotation(${q.id})">قبول</button><button class="btn btn-sm btn-danger" onclick="rejectQuotation(${q.id})">رفض</button>` : ''}
          ${q.status === 'accepted' ? `<button class="btn btn-sm btn-primary" onclick="convertToInvoice(${q.id})">تحويل لفاتورة</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="printQuotationPDF(${q.id})">📄 PDF</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function filterQuotations() {
  const search = document.getElementById('quo-search').value;
  const status = document.getElementById('quo-status').value;
  const { data } = await api.quotations({ search, status });
  document.getElementById('quo-tbody').innerHTML = renderQuotationRows(data);
}

function openNewQuotationModal() {
  const customers = DB.getAll('customers');
  const products  = DB.getAll('products');
  const custOptions = customers.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('');
  const prodOptions = products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (${p.unit})</option>`).join('');
  openModal('عرض سعر جديد', `
    <div class="form-grid">
      <div class="form-group">
        <label>العميل *</label>
        <select id="quo-customer" required>
          <option value="">اختر العميل</option>
          ${custOptions}
        </select>
      </div>
      <div class="form-group">
        <label>التاريخ *</label>
        <input type="date" id="quo-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>صالح حتى</label>
        <input type="date" id="quo-valid-until" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>العملة</label>
        ${currencyDropdown('quo-currency', 'EGP')}
      </div>
      <div class="form-group form-full">
        <label>ملاحظات</label>
        <textarea id="quo-notes" rows="2" style="width:100%;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text-primary);font-family:inherit;resize:vertical"></textarea>
      </div>
    </div>
    <div style="margin:16px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <label style="font-weight:600">بنود العرض</label>
        <button class="btn btn-sm btn-secondary" onclick="addQuoItem()">＋ بند</button>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;font-size:12px;color:var(--text-muted);font-weight:600">
        <span>المنتج</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span>
      </div>
      <div id="quo-items">
        <div class="quo-item-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center">
          <select class="quo-prod" style="padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px">
            <option value="">اختر المنتج</option>${prodOptions}
          </select>
          <input type="number" class="quo-qty" value="1" min="1" style="padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px" oninput="calcQuoTotal()">
          <input type="number" class="quo-price" value="0" min="0" style="padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px" oninput="calcQuoTotal()">
          <input type="number" class="quo-subtotal" value="0" readonly style="padding:8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--accent);font-family:inherit;font-size:13px">
          <button onclick="this.closest('.quo-item-row').remove();calcQuoTotal()" style="background:var(--danger);border:none;color:#fff;border-radius:6px;padding:8px 10px;cursor:pointer">✕</button>
        </div>
      </div>
    </div>
    <div style="background:var(--bg-input);border-radius:var(--radius);padding:14px;margin-top:8px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span>المجموع الفرعي:</span><span id="quo-tot-sub" class="number">0</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:14px">
        <span>الضريبة (%):</span>
        <input type="number" id="quo-tax-rate" value="14" min="0" max="100" style="width:70px;padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit" oninput="calcQuoTotal()">
      </div>
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;color:var(--accent)"><span>الإجمالي الكلي:</span><span id="quo-tot-total" class="number">0</span></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveQuotation()">💾 حفظ العرض</button>
    </div>
  `);
  // تفعيل حدث تغيير المنتج
  document.querySelectorAll('.quo-prod').forEach(s => s.addEventListener('change', function() {
    const price = this.options[this.selectedIndex]?.getAttribute('data-price') || 0;
    this.closest('.quo-item-row').querySelector('.quo-price').value = price;
    calcQuoTotal();
  }));
}

function addQuoItem() {
  const products = DB.getAll('products');
  const prodOptions = products.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (${p.unit})</option>`).join('');
  const row = document.createElement('div');
  row.className = 'quo-item-row';
  row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center';
  row.innerHTML = `
    <select class="quo-prod" style="padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px">
      <option value="">اختر المنتج</option>${prodOptions}
    </select>
    <input type="number" class="quo-qty" value="1" min="1" style="padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px" oninput="calcQuoTotal()">
    <input type="number" class="quo-price" value="0" min="0" style="padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);font-family:inherit;font-size:13px" oninput="calcQuoTotal()">
    <input type="number" class="quo-subtotal" value="0" readonly style="padding:8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--accent);font-family:inherit;font-size:13px">
    <button onclick="this.closest('.quo-item-row').remove();calcQuoTotal()" style="background:var(--danger);border:none;color:#fff;border-radius:6px;padding:8px 10px;cursor:pointer">✕</button>
  `;
  row.querySelector('.quo-prod').addEventListener('change', function() {
    const price = this.options[this.selectedIndex]?.getAttribute('data-price') || 0;
    this.closest('.quo-item-row').querySelector('.quo-price').value = price;
    calcQuoTotal();
  });
  document.getElementById('quo-items').appendChild(row);
}

function calcQuoTotal() {
  let subtotal = 0;
  document.querySelectorAll('.quo-item-row').forEach(row => {
    const qty   = parseFloat(row.querySelector('.quo-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.quo-price')?.value) || 0;
    const sub   = qty * price;
    const subEl = row.querySelector('.quo-subtotal');
    if (subEl) subEl.value = sub.toFixed(2);
    subtotal += sub;
  });
  const taxRate = parseFloat(document.getElementById('quo-tax-rate')?.value) || 0;
  const tax     = subtotal * taxRate / 100;
  const total   = subtotal + tax;
  const subEl   = document.getElementById('quo-tot-sub');
  const totEl   = document.getElementById('quo-tot-total');
  if (subEl) subEl.textContent = formatMoney(subtotal);
  if (totEl) totEl.textContent = formatMoney(total);
}

async function saveQuotation() {
  const customerSel = document.getElementById('quo-customer');
  const customer_id = parseInt(customerSel?.value);
  if (!customer_id) { toast('يرجى اختيار العميل', 'error'); return; }
  const customer    = customerSel.options[customerSel.selectedIndex].text;
  const date        = document.getElementById('quo-date').value;
  const valid_until = document.getElementById('quo-valid-until').value;
  const currency    = document.getElementById('quo-currency').value;
  const notes       = document.getElementById('quo-notes').value;
  const taxRate     = parseFloat(document.getElementById('quo-tax-rate').value) || 0;

  const items = [];
  let subtotal = 0;
  document.querySelectorAll('.quo-item-row').forEach(row => {
    const prodSel    = row.querySelector('.quo-prod');
    const product_id = parseInt(prodSel?.value);
    if (!product_id) return;
    const product    = prodSel.options[prodSel.selectedIndex].text.split(' (')[0];
    const qty        = parseFloat(row.querySelector('.quo-qty').value) || 0;
    const unit_price = parseFloat(row.querySelector('.quo-price').value) || 0;
    const sub        = qty * unit_price;
    items.push({ product_id, product, qty, unit_price, subtotal: sub });
    subtotal += sub;
  });

  if (!items.length) { toast('يرجى إضافة منتج على الأقل', 'error'); return; }

  const tax          = subtotal * taxRate / 100;
  const total_amount = subtotal + tax;

  try {
    await api.createQuotation({ customer_id, customer, date, valid_until, items, subtotal, tax, total_amount, currency, notes });
    toast('تم حفظ عرض السعر', 'success');
    closeModal();
    renderQuotations();
  } catch(e) { toast(e.message, 'error'); }
}

async function sendQuotation(id) {
  try { await api.updateQuotationStatus(id, 'sent'); toast('تم إرسال عرض السعر', 'success'); renderQuotations(); }
  catch(e) { toast(e.message, 'error'); }
}

async function acceptQuotation(id) {
  try { await api.updateQuotationStatus(id, 'accepted'); toast('تم قبول عرض السعر', 'success'); renderQuotations(); }
  catch(e) { toast(e.message, 'error'); }
}

async function rejectQuotation(id) {
  if (!confirmDelete('هل أنت متأكد من رفض عرض السعر؟')) return;
  try { await api.updateQuotationStatus(id, 'rejected'); toast('تم رفض عرض السعر', 'warning'); renderQuotations(); }
  catch(e) { toast(e.message, 'error'); }
}

async function convertToInvoice(id) {
  if (!confirm('هل تريد تحويل عرض السعر إلى فاتورة مبيعات؟')) return;
  try {
    const invoice = await api.convertQuotationToInvoice(id);
    toast(`تم إنشاء الفاتورة ${invoice.invoice_number} بنجاح`, 'success');
    renderQuotations();
  } catch(e) { toast(e.message, 'error'); }
}

function printQuotationPDF(id) {
  const q = DB.findById('quotations', id);
  if (!q) { toast('عرض السعر غير موجود', 'error'); return; }
  const settings    = DB.get('settings') || {};
  const companyName = settings.company_name || 'شركة الرخام والجرانيت';
  const statusMap   = { draft:'مسودة', sent:'مرسل', accepted:'مقبول', rejected:'مرفوض', invoiced:'محوّل لفاتورة' };

  const itemRows = (q.items || []).map((item, i) => `
    <tr>
      <td>${i+1}</td>
      <td style="text-align:right">${item.product}</td>
      <td>${item.qty}</td>
      <td>${(item.unit_price||0).toLocaleString('ar-EG')}</td>
      <td>${(item.subtotal||0).toLocaleString('ar-EG')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
  <title>عرض السعر ${q.quotation_number}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Cairo',Arial,sans-serif;direction:rtl;color:#1a1a1a;background:#fff;padding:14mm 18mm}
    .hdr{text-align:center;border-bottom:3px solid #c8a96e;padding-bottom:14px;margin-bottom:18px}
    .hdr .co{font-size:13px;color:#555;font-weight:600}.hdr h1{font-size:22px;font-weight:900}
    .hdr .num{font-size:13px;color:#555;margin-top:4px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;font-size:13px}
    .mb{background:#f8f7f5;padding:10px;border-radius:6px}.mb strong{display:block;color:#c8a96e;font-size:11px;margin-bottom:3px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px}
    th{background:#2c2c2c;color:#fff;padding:8px;text-align:center}
    td{padding:7px;text-align:center;border:1px solid #ddd}
    tr:nth-child(even) td{background:#f8f7f5}
    .tots{float:left;min-width:260px;margin-top:4px}
    .tots table{font-size:13px}.tots td{border:none;padding:5px 10px}
    .tots tr:last-child td{font-weight:700;font-size:15px;color:#c8a96e;border-top:2px solid #c8a96e}
    .notes{margin-top:20px;font-size:12px;color:#555;border-top:1px dashed #ddd;padding-top:10px;clear:both}
    .stamp{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
    .stamp div{border-top:1px solid #999;padding-top:8px;text-align:center;font-size:12px;color:#666}
    @media print{@page{size:A4 portrait;margin:12mm 16mm}body{padding:0}}
  </style></head><body>
  <div class="hdr"><div class="co">${companyName}</div><h1>عرض سعر</h1><div class="num">${q.quotation_number} &nbsp;|&nbsp; الحالة: ${statusMap[q.status]||q.status}</div></div>
  <div class="meta">
    <div class="mb"><strong>العميل</strong>${q.customer}</div>
    <div class="mb"><strong>تاريخ العرض</strong>${q.date}</div>
    <div class="mb"><strong>صالح حتى</strong>${q.valid_until||'-'}</div>
    <div class="mb"><strong>العملة</strong>${q.currency||'EGP'}</div>
  </div>
  <table><thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
  <tbody>${itemRows}</tbody></table>
  <div class="tots"><table><tbody>
    <tr><td>المجموع الفرعي:</td><td>${(q.subtotal||0).toLocaleString('ar-EG')} ${q.currency||'EGP'}</td></tr>
    <tr><td>الضريبة:</td><td>${(q.tax||0).toLocaleString('ar-EG')} ${q.currency||'EGP'}</td></tr>
    <tr><td>الإجمالي الكلي:</td><td>${(q.total_amount||0).toLocaleString('ar-EG')} ${q.currency||'EGP'}</td></tr>
  </tbody></table></div>
  ${q.notes ? `<div class="notes">ملاحظات: ${q.notes}</div>` : ''}
  <div class="stamp" style="margin-top:60px">
    <div>توقيع المورد<br><br><br></div>
    <div>توقيع العميل<br><br><br></div>
  </div>
  <script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),400))<\/script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) { toast('يرجى السماح بالنوافذ المنبثقة', 'error'); return; }
  win.document.write(html);
  win.document.close();
}
