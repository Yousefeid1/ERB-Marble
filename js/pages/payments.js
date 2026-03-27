// ============================================
// Payments & Receipts Page
// ============================================

async function renderPayments() {
  const content = document.getElementById('page-content');
  try {
    const customers = await api.customers();
    const suppliers = await api.suppliers();
    const { data: payments } = await api.payments();
    window._paymentsCustomers = customers;
    window._paymentsSuppliers = suppliers;

    const totalReceipts = payments.filter(p => p.type === 'receipt').reduce((s, p) => s + p.amount, 0);
    const totalPayments = payments.filter(p => p.type === 'payment').reduce((s, p) => s + p.amount, 0);

    content.innerHTML = `
      <div class="page-header">
        <div><h2>المدفوعات والمقبوضات</h2><p>تتبع التدفق النقدي</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success" onclick="openNewPaymentModal('receipt')">＋ مقبوضات</button>
          <button class="btn btn-danger"  onclick="openNewPaymentModal('payment')">＋ مدفوعات</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box profit"><div class="label">إجمالي المقبوضات</div><div class="value">${formatMoney(totalReceipts)}</div></div>
        <div class="summary-box loss">  <div class="label">إجمالي المدفوعات</div><div class="value">${formatMoney(totalPayments)}</div></div>
        <div class="summary-box gold">  <div class="label">صافي التدفق النقدي</div><div class="value">${formatMoney(totalReceipts - totalPayments)}</div></div>
      </div>

      <div class="filters-bar">
        <input type="text" id="pay-search" placeholder="بحث باسم الطرف..." oninput="filterPayments()" style="flex:1">
        <select id="pay-type-filter" onchange="filterPayments()">
          <option value="">الكل</option>
          <option value="receipt">مقبوضات</option>
          <option value="payment">مدفوعات</option>
        </select>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>النوع</th><th>الطرف</th><th>المبلغ</th><th>التاريخ</th><th>طريقة الدفع</th><th>المرجع</th><th>ملاحظات</th>
            </tr></thead>
            <tbody id="pay-tbody">${renderPaymentRows(payments)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderPaymentRows(payments) {
  if (!payments.length) return `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="empty-icon">💸</div><h3>لا توجد معاملات</h3></div></td></tr>`;
  return payments.map(p => `
    <tr>
      <td>
        <span class="badge ${p.type === 'receipt' ? 'badge-success' : 'badge-danger'}">
          ${p.type === 'receipt' ? '⬇ مقبوض' : '⬆ مدفوع'}
        </span>
      </td>
      <td><strong>${p.party}</strong><br><small class="text-muted">${p.party_type === 'customer' ? 'عميل' : 'مورد'}</small></td>
      <td class="number ${p.type === 'receipt' ? 'text-success' : 'text-danger'}"><strong>${formatMoney(p.amount)}</strong></td>
      <td>${formatDate(p.date)}</td>
      <td>${p.method === 'bank' ? '🏦 تحويل بنكي' : p.method === 'cash' ? '💵 نقدي' : p.method === 'cheque' ? '📄 شيك' : p.method}</td>
      <td class="number">${p.reference || '-'}</td>
      <td class="text-muted">${p.notes || '-'}</td>
    </tr>
  `).join('');
}

async function filterPayments() {
  const search = document.getElementById('pay-search').value;
  const type   = document.getElementById('pay-type-filter').value;
  const { data } = await api.payments({ search, type });
  document.getElementById('pay-tbody').innerHTML = renderPaymentRows(data);
}

function openNewPaymentModal(type) {
  const isReceipt  = type === 'receipt';
  const customers  = window._paymentsCustomers || [];
  const suppliers  = window._paymentsSuppliers || [];
  const parties    = isReceipt ? customers : suppliers;
  const partyType  = isReceipt ? 'customer' : 'supplier';

  openModal(isReceipt ? 'تسجيل مقبوضات' : 'تسجيل مدفوعات', `
    <div class="form-grid">
      <div class="form-group">
        <label>${isReceipt ? 'العميل' : 'المورد'} *</label>
        <select id="np-party">
          <option value="">اختر...</option>
          ${parties.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>المبلغ *</label>
        <input type="number" id="np-amount" placeholder="0.00" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>التاريخ *</label>
        <input type="date" id="np-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>طريقة الدفع</label>
        <select id="np-method">
          <option value="bank">تحويل بنكي</option>
          <option value="cash">نقدي</option>
          <option value="cheque">شيك</option>
        </select>
      </div>
      <div class="form-group">
        <label>رقم المرجع</label>
        <input type="text" id="np-ref" placeholder="رقم الحوالة أو الشيك">
      </div>
      <div class="form-group form-full">
        <label>ملاحظات</label>
        <textarea id="np-notes" placeholder="ملاحظات اختيارية..."></textarea>
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="savePayment('${type}','${partyType}')">💾 حفظ</button>
    </div>
  `);
}

async function savePayment(type, partyType) {
  const partyEl = document.getElementById('np-party');
  if (!partyEl.value) { toast('الرجاء اختيار الطرف', 'error'); return; }
  const amount = parseFloat(document.getElementById('np-amount').value);
  if (!amount || amount <= 0) { toast('الرجاء إدخال مبلغ صحيح', 'error'); return; }
  await api.createPayment({
    type, party_type: partyType,
    party_id:  parseInt(partyEl.value),
    party:     partyEl.options[partyEl.selectedIndex].dataset.name,
    amount,
    date:      document.getElementById('np-date').value,
    method:    document.getElementById('np-method').value,
    reference: document.getElementById('np-ref').value,
    notes:     document.getElementById('np-notes').value,
  });
  closeModal();
  toast('تم تسجيل المعاملة بنجاح', 'success');
  renderPayments();
}
