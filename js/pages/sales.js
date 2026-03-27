// ============================================
// Sales Pages
// ============================================

// ===== SALES =====
async function renderSales() {
  const content = document.getElementById('page-content');
  try {
    const customers = await api.customers();
    const { data: sales } = await api.sales();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h2>فواتير المبيعات</h2>
          <p>إدارة وتتبع جميع فواتير البيع</p>
        </div>
        <button class="btn btn-primary" onclick="openNewSaleModal()">＋ فاتورة جديدة</button>
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
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr></thead>
            <tbody id="sales-tbody">
              ${renderSalesRows(sales)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window._salesData     = sales;
    window._customersData = customers;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderSalesRows(sales) {
  if (!sales.length) return `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="empty-icon">🧾</div><h3>لا توجد فواتير</h3></div></td></tr>`;
  return sales.map(s => `
    <tr>
      <td class="number"><strong>${s.invoice_number}</strong></td>
      <td>${s.customer}</td>
      <td>${formatDate(s.invoice_date)}</td>
      <td>${formatDate(s.due_date)}</td>
      <td class="number">${formatMoney(s.total_amount)}</td>
      <td class="number text-success">${formatMoney(s.paid_amount)}</td>
      <td class="number ${s.total_amount - s.paid_amount > 0 ? 'text-danger' : 'text-success'}">${formatMoney(s.total_amount - s.paid_amount)}</td>
      <td>${statusBadge(s.status)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewSaleDetail(${s.id})">عرض</button>
        ${s.status !== 'paid' && s.status !== 'cancelled' ? `<button class="btn btn-danger btn-sm" onclick="cancelSale(${s.id})">إلغاء</button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function filterSales() {
  const search = document.getElementById('sales-search').value;
  const status = document.getElementById('sales-status-filter').value;
  const { data } = await api.sales({ search, status });
  document.getElementById('sales-tbody').innerHTML = renderSalesRows(data);
  window._salesData = data;
}

async function cancelSale(id) {
  if (!confirm('هل تريد إلغاء هذه الفاتورة؟')) return;
  await api.cancelSale(id);
  toast('تم إلغاء الفاتورة', 'success');
  renderSales();
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
        <button class="btn btn-primary" onclick="openNewCustomerModal()">＋ عميل جديد</button>
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
