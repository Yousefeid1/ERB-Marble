// ============================================
// Journal, Accounts & Trial Balance Pages
// ============================================

// ===== JOURNAL ENTRIES =====
async function renderJournal() {
  const content = document.getElementById('page-content');
  try {
    const accounts = await api.accounts();
    const { data: entries } = await api.journal();
    window._journalAccounts = accounts;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>القيود المحاسبية</h2><p>سجل جميع الحركات المالية</p></div>
        <button class="btn btn-primary" onclick="openNewJournalModal()">＋ قيد جديد</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="je-search" placeholder="بحث في الوصف أو رقم القيد..." oninput="filterJournal()" style="flex:1">
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم القيد</th><th>التاريخ</th><th>الوصف</th><th>إجمالي المدين</th><th>إجمالي الدائن</th><th>إجراءات</th>
            </tr></thead>
            <tbody id="je-tbody">${renderJournalRows(entries)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderJournalRows(entries) {
  if (!entries.length) return `<tr><td colspan="6"><div class="empty-state" style="padding:40px"><div class="empty-icon">⊞</div><h3>لا توجد قيود</h3></div></td></tr>`;
  return entries.map(e => {
    const debit  = e.lines.reduce((s, l) => s + l.debit, 0);
    const credit = e.lines.reduce((s, l) => s + l.credit, 0);
    return `
      <tr>
        <td class="number"><strong>${e.number}</strong></td>
        <td>${formatDate(e.date)}</td>
        <td>${e.description}</td>
        <td class="number text-success">${formatMoney(debit)}</td>
        <td class="number text-danger">${formatMoney(credit)}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewJournalEntry(${e.id})">تفاصيل</button></td>
      </tr>
    `;
  }).join('');
}

async function filterJournal() {
  const search = document.getElementById('je-search').value;
  const { data } = await api.journal({ search });
  document.getElementById('je-tbody').innerHTML = renderJournalRows(data);
}

async function viewJournalEntry(id) {
  const entry = await api.journalEntry(id);
  if (!entry) return;
  openModal(`قيد ${entry.number}`, `
    <div style="display:flex;gap:24px;margin-bottom:16px">
      <div><span class="text-muted">التاريخ:</span> <strong>${formatDate(entry.date)}</strong></div>
      <div><span class="text-muted">الوصف:</span> <strong>${entry.description}</strong></div>
    </div>
    <div class="data-table-wrapper">
      <table>
        <thead><tr><th>الحساب</th><th>كود الحساب</th><th>مدين</th><th>دائن</th></tr></thead>
        <tbody>
          ${entry.lines.map(l => `
            <tr>
              <td>${l.account_name}</td>
              <td class="number">${l.account_code}</td>
              <td class="number text-success">${l.debit ? formatMoney(l.debit) : '-'}</td>
              <td class="number text-danger">${l.credit ? formatMoney(l.credit) : '-'}</td>
            </tr>
          `).join('')}
          <tr style="border-top:2px solid var(--border);font-weight:700">
            <td colspan="2" style="text-align:center">الإجمالي</td>
            <td class="number text-success">${formatMoney(entry.lines.reduce((s,l)=>s+l.debit,0))}</td>
            <td class="number text-danger">${formatMoney(entry.lines.reduce((s,l)=>s+l.credit,0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `);
}

function openNewJournalModal() {
  const accounts = window._journalAccounts || [];
  openModal('قيد محاسبي جديد', `
    <div class="form-grid">
      <div class="form-group">
        <label>التاريخ *</label>
        <input type="date" id="nj-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group form-full">
        <label>الوصف *</label>
        <input type="text" id="nj-desc" placeholder="وصف القيد المحاسبي">
      </div>
    </div>
    <hr class="divider">
    <div style="font-size:12px;color:var(--text-muted);display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;padding:0 4px">
      <span>الحساب</span><span>مدين</span><span>دائن</span><span></span>
    </div>
    <div id="nj-lines-list">
      ${newJournalLine(0, accounts)}
      ${newJournalLine(1, accounts)}
    </div>
    <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addJournalLine()">＋ سطر</button>
    <div id="nj-balance-msg" style="margin-top:12px;padding:8px;border-radius:6px;font-size:13px;text-align:center"></div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveJournalEntry()">💾 حفظ القيد</button>
    </div>
  `);
  window._jeAccounts  = accounts;
  window._jeLineCount = 1;
}

function newJournalLine(idx, accounts) {
  const opts = (accounts || window._jeAccounts || []).filter(a => a.parent_id !== null).map(a => `<option value="${a.id}" data-name="${a.name}" data-code="${a.code}">${a.code} - ${a.name}</option>`).join('');
  return `
    <div id="nj-line-${idx}" style="display:grid;grid-template-columns:3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center">
      <select id="nj-acc-${idx}" onchange="checkJEBalance()">
        <option value="">اختر الحساب</option>
        ${opts}
      </select>
      <input type="number" id="nj-debit-${idx}" placeholder="0.00" min="0" value="" oninput="checkJEBalance()">
      <input type="number" id="nj-credit-${idx}" placeholder="0.00" min="0" value="" oninput="checkJEBalance()">
      <button class="btn btn-danger btn-sm" onclick="this.closest('div').remove();checkJEBalance()">✕</button>
    </div>
  `;
}

function addJournalLine() {
  window._jeLineCount++;
  document.getElementById('nj-lines-list').insertAdjacentHTML('beforeend', newJournalLine(window._jeLineCount, window._jeAccounts));
}

function checkJEBalance() {
  let totalDebit = 0, totalCredit = 0;
  document.querySelectorAll('[id^="nj-debit-"]').forEach(el => { totalDebit  += parseFloat(el.value) || 0; });
  document.querySelectorAll('[id^="nj-credit-"]').forEach(el => { totalCredit += parseFloat(el.value) || 0; });
  const msg = document.getElementById('nj-balance-msg');
  if (!msg) return;
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff < 0.01) {
    msg.style.background = 'rgba(76,175,125,0.1)';
    msg.style.color      = 'var(--success)';
    msg.textContent      = `✓ القيد متوازن  |  مدين: ${formatMoney(totalDebit)}  =  دائن: ${formatMoney(totalCredit)}`;
  } else {
    msg.style.background = 'rgba(224,82,82,0.1)';
    msg.style.color      = 'var(--danger)';
    msg.textContent      = `✗ غير متوازن  |  مدين: ${formatMoney(totalDebit)}  ≠  دائن: ${formatMoney(totalCredit)}  |  الفرق: ${formatMoney(diff)}`;
  }
}

async function saveJournalEntry() {
  const date = document.getElementById('nj-date').value;
  const desc = document.getElementById('nj-desc').value.trim();
  if (!date || !desc) { toast('الرجاء إدخال التاريخ والوصف', 'error'); return; }

  const lines = [];
  document.querySelectorAll('[id^="nj-acc-"]').forEach(accEl => {
    const idx    = accEl.id.split('-').pop();
    const debit  = parseFloat(document.getElementById(`nj-debit-${idx}`)?.value)  || 0;
    const credit = parseFloat(document.getElementById(`nj-credit-${idx}`)?.value) || 0;
    if (accEl.value && (debit > 0 || credit > 0)) {
      const opt = accEl.options[accEl.selectedIndex];
      lines.push({ account_id: parseInt(accEl.value), account_name: opt.dataset.name, account_code: opt.dataset.code, debit, credit });
    }
  });
  if (lines.length < 2) { toast('القيد يحتاج سطرين على الأقل', 'error'); return; }

  const totalDebit  = lines.reduce((s, l) => s + l.debit,  0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) { toast('القيد غير متوازن - مدين لا يساوي دائن', 'error'); return; }

  const { data: existing } = await api.journal();
  const id  = existing.length > 0 ? Math.max(...existing.map(e => e.id)) + 1 : 1;
  const num = `JE-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
  await api.createJournal({ number: num, date, description: desc, lines });
  closeModal();
  toast('تم حفظ القيد بنجاح', 'success');
  renderJournal();
}

// ===== CHART OF ACCOUNTS =====
async function renderAccounts() {
  const content = document.getElementById('page-content');
  try {
    const accounts = await api.accounts();
    const typeNames = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
    const typeColors = { asset: 'badge-success', liability: 'badge-danger', equity: 'badge-gold', revenue: 'badge-info', expense: 'badge-warning' };

    const roots = accounts.filter(a => a.parent_id === null);
    const children = (pid) => accounts.filter(a => a.parent_id === pid);

    let html = '';
    roots.forEach(root => {
      html += `<tr style="background:rgba(200,169,110,0.06)">
        <td colspan="4"><strong style="color:var(--accent)">${root.code} - ${root.name}</strong></td>
      </tr>`;
      children(root.id).forEach(child => {
        const sub = children(child.id);
        html += `<tr>
          <td style="padding-right:32px">${child.code} - ${child.name}</td>
          <td><span class="badge ${typeColors[child.type]}">${typeNames[child.type]}</span></td>
          <td class="number">${child.balance ? formatMoney(child.balance) : '-'}</td>
          <td></td>
        </tr>`;
        sub.forEach(s => {
          html += `<tr>
            <td style="padding-right:52px;color:var(--text-secondary)">${s.code} - ${s.name}</td>
            <td><span class="badge ${typeColors[s.type]}">${typeNames[s.type]}</span></td>
            <td class="number ${s.balance > 0 ? 'text-success' : ''}">${s.balance ? formatMoney(s.balance) : '-'}</td>
            <td></td>
          </tr>`;
        });
      });
    });

    content.innerHTML = `
      <div class="page-header">
        <div><h2>شجرة الحسابات</h2><p>دليل الحسابات المحاسبية</p></div>
        <button class="btn btn-primary" onclick="openNewAccountModal()">＋ حساب جديد</button>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>اسم الحساب</th><th>النوع</th><th>الرصيد</th><th></th></tr></thead>
            <tbody>${html}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function openNewAccountModal() {
  openModal('حساب جديد', `
    <div class="form-grid">
      <div class="form-group"><label>كود الحساب *</label><input type="text" id="na-code" placeholder="مثال: 1150"></div>
      <div class="form-group"><label>اسم الحساب *</label><input type="text" id="na-name" placeholder="اسم الحساب"></div>
      <div class="form-group">
        <label>نوع الحساب *</label>
        <select id="na-type">
          <option value="asset">أصل</option>
          <option value="liability">خصوم</option>
          <option value="equity">حقوق ملكية</option>
          <option value="revenue">إيراد</option>
          <option value="expense">مصروف</option>
        </select>
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveAccount()">💾 حفظ</button>
    </div>
  `);
}

async function saveAccount() {
  const code = document.getElementById('na-code').value.trim();
  const name = document.getElementById('na-name').value.trim();
  if (!code || !name) { toast('الرجاء إدخال الكود والاسم', 'error'); return; }
  await api.createAccount({ code, name, type: document.getElementById('na-type').value, parent_id: 1 });
  closeModal();
  toast('تم إضافة الحساب', 'success');
  renderAccounts();
}

// ===== TRIAL BALANCE =====
async function renderTrialBalance() {
  const content = document.getElementById('page-content');
  try {
    const { accounts, total_debit, total_credit } = await api.trialBalance();
    const typeNames = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };

    content.innerHTML = `
      <div class="page-header"><div><h2>ميزان المراجعة</h2><p>مراجعة أرصدة جميع الحسابات</p></div></div>
      <div class="report-summary">
        <div class="summary-box profit"><div class="label">إجمالي المدين</div><div class="value">${formatMoney(total_debit)}</div></div>
        <div class="summary-box loss"><div class="label">إجمالي الدائن</div><div class="value">${formatMoney(total_credit)}</div></div>
        <div class="summary-box ${Math.abs(total_debit - total_credit) < 1 ? 'profit' : 'loss'}">
          <div class="label">الفرق</div>
          <div class="value">${formatMoney(Math.abs(total_debit - total_credit))}</div>
        </div>
      </div>
      ${Math.abs(total_debit - total_credit) < 1
        ? `<div style="background:rgba(76,175,125,0.1);border:1px solid rgba(76,175,125,0.3);border-radius:8px;padding:12px;text-align:center;color:var(--success);margin-bottom:20px">✓ الميزان متوازن</div>`
        : `<div style="background:rgba(224,82,82,0.1);border:1px solid rgba(224,82,82,0.3);border-radius:8px;padding:12px;text-align:center;color:var(--danger);margin-bottom:20px">✗ الميزان غير متوازن</div>`}
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>كود الحساب</th><th>اسم الحساب</th><th>النوع</th><th>مدين</th><th>دائن</th></tr></thead>
            <tbody>
              ${accounts.map(a => {
                const isDebit = ['asset','expense'].includes(a.type);
                return `
                  <tr>
                    <td class="number">${a.code}</td>
                    <td>${a.name}</td>
                    <td>${typeNames[a.type] || a.type}</td>
                    <td class="number text-success">${isDebit  ? formatMoney(a.balance) : '-'}</td>
                    <td class="number text-danger">${!isDebit ? formatMoney(a.balance) : '-'}</td>
                  </tr>
                `;
              }).join('')}
              <tr style="border-top:2px solid var(--border);background:rgba(200,169,110,0.06)">
                <td colspan="3"><strong style="color:var(--accent)">الإجمالي</strong></td>
                <td class="number"><strong class="text-success">${formatMoney(total_debit)}</strong></td>
                <td class="number"><strong class="text-danger">${formatMoney(total_credit)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}
