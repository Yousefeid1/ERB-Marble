// ============================================
// Payments & Receipts Page
// ============================================

// ===== PAYMENTS =====
let _paymentsPage = 1;

async function renderPayments(page) {
  if (page) _paymentsPage = page;
  const content = document.getElementById('page-content');
  try {
    const customers = await api.customers();
    const suppliers = await api.suppliers();
    const { data: payments } = await api.payments();
    window._paymentsCustomers = customers;
    window._paymentsSuppliers = suppliers;
    window._paymentsData = payments;

    const totalReceipts = payments.filter(p => p.type === 'receipt').reduce((s, p) => s + p.amount, 0);
    const totalPayments = payments.filter(p => p.type === 'payment').reduce((s, p) => s + p.amount, 0);

    const paged      = slicePage(payments, _paymentsPage);
    const pagination = renderPaginationBar(_paymentsPage, payments.length, 'renderPayments');

    content.innerHTML = `
      <div class="page-header">
        <div><h2>المدفوعات والمقبوضات</h2><p>تتبع التدفق النقدي</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportPaymentsExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportPaymentsPDF()">📄 PDF</button>
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
              <th>النوع</th><th>الطرف</th><th>المبلغ</th><th>التاريخ</th><th>طريقة الدفع</th><th>المرجع</th><th>ملاحظات</th><th>العملة</th>
            </tr></thead>
            <tbody id="pay-tbody">${renderPaymentRows(paged)}</tbody>
          </table>
        </div>
        ${pagination}
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderPaymentRows(payments) {
  if (!payments.length) return `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="empty-icon">💸</div><h3>لا توجد معاملات</h3></div></td></tr>`;
  return payments.map(p => `
    <tr>
      <td>
        <span class="badge ${p.type === 'receipt' ? 'badge-success' : 'badge-danger'}">
          ${p.type === 'receipt' ? '⬇ مقبوض' : '⬆ مدفوع'}
        </span>
      </td>
      <td><strong>${buildNavLink(p.party, p.type === 'receipt' ? 'customers' : 'suppliers', p.party_id)}</strong><br><small class="text-muted">${p.party_type === 'customer' ? 'عميل' : 'مورد'}</small></td>
      <td class="number ${p.type === 'receipt' ? 'text-success' : 'text-danger'}"><strong>${formatMoney(p.amount)}</strong></td>
      <td>${formatDate(p.date)}</td>
      <td>${p.method === 'bank' ? '🏦 تحويل بنكي' : p.method === 'cash' ? '💵 نقدي' : p.method === 'cheque' ? '📄 شيك' : p.method}</td>
      <td class="number">${buildNavLink(p.reference, p.type === 'receipt' ? 'sales' : 'purchases', p.invoice_id) || '-'}</td>
      <td class="text-muted">${p.notes || '-'}</td>
      <td>${p.currency || 'EGP'}</td>
    </tr>
  `).join('');
}

async function filterPayments() {
  const search = document.getElementById('pay-search').value;
  const type   = document.getElementById('pay-type-filter').value;
  const { data } = await api.payments({ search, type });
  _paymentsPage = 1;
  window._paymentsData = data;
  _updateTableWithPagination('pay-tbody', renderPaymentRows, data, 1, 'renderPayments');
}

async function openNewPaymentModal(type) {
  const isReceipt = type === 'receipt';
  const customers = window._paymentsCustomers || [];
  const suppliers = window._paymentsSuppliers || [];
  const parties   = isReceipt ? customers : suppliers;
  const partyType = isReceipt ? 'customer' : 'supplier';

  // Load unpaid/partial invoices for linking
  let invoices = [];
  try {
    if (isReceipt) {
      const { data } = await api.sales();
      invoices = data.filter(s => s.status !== 'paid' && s.status !== 'cancelled' && s.total_amount > s.paid_amount);
    } else {
      const { data } = await api.purchases();
      invoices = data.filter(p => p.status !== 'paid' && p.total_amount > p.paid_amount);
    }
  } catch(e) {}

  const invoiceOptions = invoices.map(inv => {
    const remaining = inv.total_amount - inv.paid_amount;
    const partyName = isReceipt ? inv.customer : inv.supplier;
    const partyId   = isReceipt ? inv.customer_id : inv.supplier_id;
    return `<option value="${inv.id}"
      data-party-id="${partyId}"
      data-party="${partyName}"
      data-remaining="${remaining.toFixed(2)}"
      data-invoice-number="${inv.invoice_number}">
      ${inv.invoice_number} — ${partyName} (المتبقي: ${remaining.toLocaleString('ar-EG', {minimumFractionDigits:2, maximumFractionDigits:2})})
    </option>`;
  }).join('');

  openModal(isReceipt ? 'تسجيل مقبوضات' : 'تسجيل مدفوعات', `
    <div class="form-grid">
      <div class="form-group form-full">
        <label>ربط بفاتورة موجودة (اختياري)</label>
        <select id="np-invoice" onchange="onPaymentInvoiceChange('${type}')">
          <option value="">— بدون ربط بفاتورة —</option>
          ${invoiceOptions}
        </select>
      </div>
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
        <label>العملة</label>
        <select id="np-currency">
          <option value="EGP">ج.م (EGP)</option>
          <option value="USD">دولار (USD)</option>
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

function onPaymentInvoiceChange(type) {
  const sel = document.getElementById('np-invoice');
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;

  const partyId      = opt.dataset.partyId;
  const remaining    = parseFloat(opt.dataset.remaining);
  const invoiceNum   = opt.dataset.invoiceNumber;

  // Auto-select matching party
  const partyEl = document.getElementById('np-party');
  for (let i = 0; i < partyEl.options.length; i++) {
    if (partyEl.options[i].value === partyId) { partyEl.selectedIndex = i; break; }
  }

  // Auto-fill amount (remaining balance) and reference
  document.getElementById('np-amount').value = remaining.toFixed(2);
  document.getElementById('np-ref').value    = invoiceNum;
  document.getElementById('np-notes').value  = `سداد ${invoiceNum}`;
}

async function savePayment(type, partyType) {
  const partyEl = document.getElementById('np-party');
  if (!partyEl.value) { toast('الرجاء اختيار الطرف', 'error'); return; }
  const amount = parseFloat(document.getElementById('np-amount').value);
  if (!amount || amount <= 0) { toast('الرجاء إدخال مبلغ صحيح', 'error'); return; }

  const invoiceEl   = document.getElementById('np-invoice');
  const invoiceId   = invoiceEl?.value ? parseInt(invoiceEl.value) : null;
  const invoiceType = type === 'receipt' ? 'sale' : 'purchase';

  await api.createPayment({
    type, party_type: partyType,
    party_id:     parseInt(partyEl.value),
    party:        partyEl.options[partyEl.selectedIndex].dataset.name,
    amount,
    date:         document.getElementById('np-date').value,
    method:       document.getElementById('np-method').value,
    currency:     document.getElementById('np-currency')?.value || 'EGP',
    reference:    document.getElementById('np-ref').value,
    notes:        document.getElementById('np-notes').value,
    invoice_id:   invoiceId,
    invoice_type: invoiceType,
  });
  closeModal();
  toast('تم تسجيل المعاملة بنجاح', 'success');
  renderPayments();
}

function exportPaymentsPDF() {
  const payments = window._paymentsData || [];
  const headers = ['#','النوع','الطرف','المبلغ','العملة','التاريخ','طريقة الدفع','المرجع'];
  const rows = payments.map((p,i)=>[i+1,p.type==='receipt'?'مقبوض':'مدفوع',(p.party||'').substring(0,18),parseFloat(p.amount||0).toFixed(2),p.currency||'EGP',formatDate(p.date),p.method==='bank'?'بنكي':p.method==='cash'?'نقدي':'شيك',p.reference||'-']);
  const totalR = payments.filter(p=>p.type==='receipt').reduce((s,p)=>s+(p.amount||0),0);
  const totalP = payments.filter(p=>p.type==='payment').reduce((s,p)=>s+(p.amount||0),0);
  exportGenericPDF({ title:'المدفوعات والمقبوضات', subtitle:'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow:['','','الإجمالي','مقبوض: '+totalR.toFixed(2),'','مدفوع: '+totalP.toFixed(2),'صافي: '+(totalR-totalP).toFixed(2),''], filename:`payments-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportPaymentsExcel() {
  const payments = window._paymentsData || [];
  const headers = ['النوع','الطرف','نوع الطرف','المبلغ','العملة','التاريخ','طريقة الدفع','المرجع','ملاحظات'];
  const rows = payments.map(p=>[p.type==='receipt'?'مقبوض':'مدفوع',p.party,p.party_type==='customer'?'عميل':'مورد',p.amount||0,p.currency||'EGP',p.date,p.method,p.reference||'-',p.notes||'-']);
  const totalR = payments.filter(p=>p.type==='receipt').reduce((s,p)=>s+(p.amount||0),0);
  const totalP = payments.filter(p=>p.type==='payment').reduce((s,p)=>s+(p.amount||0),0);
  exportGenericExcel({ sheetName:'المدفوعات', headers, rows, totalsRow:['الإجمالي','','','','','','','','مقبوض: '+totalR+' | مدفوع: '+totalP], filename:`payments-${new Date().toISOString().split('T')[0]}.xlsx` });
}
