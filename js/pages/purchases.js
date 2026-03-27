// ============================================
// Purchases & Suppliers Pages
// ============================================

// ===== PURCHASES =====
async function renderPurchases() {
  const content = document.getElementById('page-content');
  try {
    const suppliers = await api.suppliers();
    const { data: purchases } = await api.purchases();
    window._suppliersData = suppliers;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>فواتير الشراء</h2><p>إدارة وتتبع مشتريات المصنع</p></div>
        <button class="btn btn-primary" onclick="openNewPurchaseModal()">＋ فاتورة شراء جديدة</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="pur-search" placeholder="بحث برقم الفاتورة أو المورد..." oninput="filterPurchases()" style="flex:1">
        <select id="pur-status-filter" onchange="filterPurchases()">
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="sent">مستلمة</option>
          <option value="partial">جزئي</option>
          <option value="paid">مسددة</option>
        </select>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الفاتورة</th><th>المورد</th><th>التاريخ</th><th>تاريخ الاستحقاق</th>
              <th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th>
            </tr></thead>
            <tbody id="pur-tbody">${renderPurchaseRows(purchases)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderPurchaseRows(purchases) {
  if (!purchases.length) return `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="empty-icon">🛒</div><h3>لا توجد فواتير شراء</h3></div></td></tr>`;
  return purchases.map(p => `
    <tr>
      <td class="number"><strong>${p.invoice_number}</strong></td>
      <td>${p.supplier}</td>
      <td>${formatDate(p.invoice_date)}</td>
      <td>${formatDate(p.due_date)}</td>
      <td class="number">${formatMoney(p.total_amount)}</td>
      <td class="number text-success">${formatMoney(p.paid_amount)}</td>
      <td class="number ${p.total_amount - p.paid_amount > 0 ? 'text-danger' : 'text-success'}">${formatMoney(p.total_amount - p.paid_amount)}</td>
      <td>${statusBadge(p.status)}</td>
    </tr>
  `).join('');
}

async function filterPurchases() {
  const search = document.getElementById('pur-search').value;
  const status = document.getElementById('pur-status-filter').value;
  const { data } = await api.purchases({ search, status });
  document.getElementById('pur-tbody').innerHTML = renderPurchaseRows(data);
}

function openNewPurchaseModal() {
  const suppliers = window._suppliersData || [];
  openModal('فاتورة شراء جديدة', `
    <div class="form-grid">
      <div class="form-group">
        <label>المورد *</label>
        <select id="np-supplier">
          <option value="">اختر المورد</option>
          ${suppliers.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>تاريخ الفاتورة *</label>
        <input type="date" id="np-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>تاريخ الاستحقاق</label>
        <input type="date" id="np-due" value="${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>الحالة</label>
        <select id="np-status">
          <option value="sent">مستلمة</option>
          <option value="draft">مسودة</option>
        </select>
      </div>
    </div>
    <hr class="divider">
    <div id="np-items-list">${newPurchaseItemRow(0)}</div>
    <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addPurchaseItemRow()">＋ إضافة بند</button>
    <div style="text-align:left;margin-top:16px;padding:12px;background:var(--bg-input);border-radius:8px">
      <div style="display:flex;justify-content:space-between"><span>الإجمالي:</span><strong id="np-total" style="color:var(--accent)">0.00 EGP</strong></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="savePurchase()">💾 حفظ</button>
    </div>
  `);
}

window._purchaseItemCount = 0;
function newPurchaseItemRow(idx) {
  return `
    <div id="np-item-${idx}" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center">
      <input type="text" placeholder="وصف البند" id="np-item-desc-${idx}" oninput="calcPurchaseTotals()">
      <input type="number" placeholder="الكمية" id="np-item-qty-${idx}" value="1" min="1" oninput="calcPurchaseTotals()">
      <input type="number" placeholder="السعر" id="np-item-price-${idx}" value="0" oninput="calcPurchaseTotals()">
      <button class="btn btn-danger btn-sm" onclick="this.closest('div').remove();calcPurchaseTotals()">✕</button>
    </div>
  `;
}

function addPurchaseItemRow() {
  window._purchaseItemCount++;
  document.getElementById('np-items-list').insertAdjacentHTML('beforeend', newPurchaseItemRow(window._purchaseItemCount));
}

function calcPurchaseTotals() {
  let total = 0;
  document.querySelectorAll('[id^="np-item-qty-"]').forEach(qtyEl => {
    const idx   = qtyEl.id.split('-').pop();
    const qty   = parseFloat(qtyEl.value) || 0;
    const price = parseFloat(document.getElementById(`np-item-price-${idx}`)?.value) || 0;
    total += qty * price;
  });
  document.getElementById('np-total').textContent = formatMoney(total);
}

async function savePurchase() {
  const suppEl = document.getElementById('np-supplier');
  if (!suppEl.value) { toast('الرجاء اختيار المورد', 'error'); return; }
  const items = [];
  document.querySelectorAll('[id^="np-item-qty-"]').forEach(qtyEl => {
    const idx   = qtyEl.id.split('-').pop();
    const desc  = document.getElementById(`np-item-desc-${idx}`)?.value?.trim();
    const qty   = parseFloat(qtyEl.value) || 0;
    const price = parseFloat(document.getElementById(`np-item-price-${idx}`)?.value) || 0;
    if (desc && qty > 0) items.push({ description: desc, qty, unit_price: price, subtotal: qty * price });
  });
  if (!items.length) { toast('أضف بندًا واحدًا على الأقل', 'error'); return; }
  const total = items.reduce((s, i) => s + i.subtotal, 0);
  await api.createPurchase({
    supplier_id:   parseInt(suppEl.value),
    supplier:      suppEl.options[suppEl.selectedIndex].dataset.name,
    invoice_date:  document.getElementById('np-date').value,
    due_date:      document.getElementById('np-due').value,
    status:        document.getElementById('np-status').value,
    items, total_amount: total, paid_amount: 0,
  });
  closeModal();
  toast('تم حفظ فاتورة الشراء', 'success');
  renderPurchases();
}

// ===== SUPPLIERS =====
async function renderSuppliers() {
  const content = document.getElementById('page-content');
  try {
    const suppliers = await api.suppliers();
    content.innerHTML = `
      <div class="page-header">
        <div><h2>الموردون</h2><p>إدارة بيانات الموردين</p></div>
        <button class="btn btn-primary" onclick="openNewSupplierModal()">＋ مورد جديد</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="supp-search" placeholder="بحث باسم المورد..." oninput="filterSuppliers()" style="flex:1">
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>البريد الإلكتروني</th><th>العنوان</th><th>المستحق عليه</th></tr></thead>
            <tbody id="supp-tbody">${renderSupplierRows(suppliers)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderSupplierRows(suppliers) {
  if (!suppliers.length) return `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><div class="empty-icon">🏭</div><h3>لا يوجد موردون</h3></div></td></tr>`;
  return suppliers.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.phone || '-'}</td>
      <td>${s.email || '-'}</td>
      <td>${s.address || '-'}</td>
      <td class="number ${s.balance > 0 ? 'text-danger' : 'text-success'}">${formatMoney(s.balance)}</td>
    </tr>
  `).join('');
}

async function filterSuppliers() {
  const search    = document.getElementById('supp-search').value;
  const suppliers = await api.suppliers({ search });
  document.getElementById('supp-tbody').innerHTML = renderSupplierRows(suppliers);
}

function openNewSupplierModal() {
  openModal('مورد جديد', `
    <div class="form-grid">
      <div class="form-group form-full"><label>اسم المورد *</label><input type="text" id="nsupp-name" placeholder="اسم الشركة"></div>
      <div class="form-group"><label>الهاتف</label><input type="text" id="nsupp-phone"></div>
      <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="nsupp-email"></div>
      <div class="form-group form-full"><label>العنوان</label><input type="text" id="nsupp-address"></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveSupplier()">💾 حفظ</button>
    </div>
  `);
}

async function saveSupplier() {
  const name = document.getElementById('nsupp-name').value.trim();
  if (!name) { toast('الرجاء إدخال اسم المورد', 'error'); return; }
  await api.createSupplier({ name, phone: document.getElementById('nsupp-phone').value, email: document.getElementById('nsupp-email').value, address: document.getElementById('nsupp-address').value });
  closeModal();
  toast('تم إضافة المورد بنجاح', 'success');
  renderSuppliers();
}
