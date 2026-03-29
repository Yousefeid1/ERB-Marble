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
    window._journalData = entries;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>القيود المحاسبية</h2><p>سجل جميع الحركات المالية</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportJournalExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportJournalPDF()">📄 PDF</button>
          <button class="btn btn-primary" onclick="openNewJournalModal()">＋ قيد جديد</button>
        </div>
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
    const totalDebit = total_debit;
    const totalCredit = total_credit;
    window._trialBalanceData = { accounts, total_debit, total_credit };
    const typeNames = { asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };

    content.innerHTML = `
      <div class="page-header"><div><h2>ميزان المراجعة</h2><p>مراجعة أرصدة جميع الحسابات</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="exportTrialBalanceExcel()">📊 Excel</button><button class="btn btn-secondary" onclick="exportTrialBalancePDF()">📄 PDF</button></div></div>
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

// ===== EXPORT: JOURNAL =====
function exportJournalPDF() {
  const entries = window._journalData || [];
  const headers = ['#','رقم القيد','التاريخ','الوصف','المدين','الدائن'];
  const rows = entries.map((e,i)=>{
    const debit  = e.lines.reduce((s,l)=>s+l.debit,0);
    const credit = e.lines.reduce((s,l)=>s+l.credit,0);
    return [i+1,e.number,formatDate(e.date),(e.description||'').substring(0,30),debit.toFixed(2)+' EGP',credit.toFixed(2)+' EGP'];
  });
  const totalD = entries.reduce((s,e)=>s+e.lines.reduce((ss,l)=>ss+l.debit,0),0);
  const totalC = entries.reduce((s,e)=>s+e.lines.reduce((ss,l)=>ss+l.credit,0),0);
  exportGenericPDF({ title:'القيود المحاسبية', subtitle:'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow:['','','','الإجمالي',totalD.toFixed(2)+' EGP',totalC.toFixed(2)+' EGP'], filename:`journal-${new Date().toISOString().split('T')[0]}.pdf`, orientation:'portrait' });
}
function exportJournalExcel() {
  const entries = window._journalData || [];
  const headers = ['رقم القيد','التاريخ','الوصف','المدين (EGP)','الدائن (EGP)'];
  const rows = entries.map(e=>{
    const debit  = e.lines.reduce((s,l)=>s+l.debit,0);
    const credit = e.lines.reduce((s,l)=>s+l.credit,0);
    return [e.number,e.date,e.description,debit,credit];
  });
  const totalD = entries.reduce((s,e)=>s+e.lines.reduce((ss,l)=>ss+l.debit,0),0);
  const totalC = entries.reduce((s,e)=>s+e.lines.reduce((ss,l)=>ss+l.credit,0),0);
  exportGenericExcel({ sheetName:'القيود المحاسبية', headers, rows, totalsRow:['الإجمالي','','',totalD,totalC], filename:`journal-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== EXPORT: TRIAL BALANCE =====
function exportTrialBalancePDF() {
  const d = window._trialBalanceData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const headers = ['كود الحساب','اسم الحساب','النوع','مدين','دائن'];
  const typeMap = { asset:'أصل', liability:'خصم', equity:'حقوق ملكية', revenue:'إيراد', expense:'مصروف' };
  const rows = d.accounts.map(a=>[a.code,a.name,typeMap[a.type]||a.type,['asset','expense'].includes(a.type)?parseFloat(a.balance).toFixed(2)+' EGP':'-',['liability','equity','revenue'].includes(a.type)?parseFloat(a.balance).toFixed(2)+' EGP':'-']);
  exportGenericPDF({ title:'ميزان المراجعة', subtitle:'نظام ERP - الرخام والجرانيت', headers, rows, totalsRow:['','','الإجمالي',d.total_debit.toFixed(2)+' EGP',d.total_credit.toFixed(2)+' EGP'], filename:`trial-balance-${new Date().toISOString().split('T')[0]}.pdf`, orientation:'portrait' });
}
function exportTrialBalanceExcel() {
  const d = window._trialBalanceData;
  if (!d) { toast('لا توجد بيانات', 'error'); return; }
  const typeMap = { asset:'أصل', liability:'خصم', equity:'حقوق ملكية', revenue:'إيراد', expense:'مصروف' };
  const headers = ['كود الحساب','اسم الحساب','النوع','مدين (EGP)','دائن (EGP)'];
  const rows = d.accounts.map(a=>[a.code,a.name,typeMap[a.type]||a.type,['asset','expense'].includes(a.type)?a.balance:0,['liability','equity','revenue'].includes(a.type)?a.balance:0]);
  exportGenericExcel({ sheetName:'ميزان المراجعة', headers, rows, totalsRow:['','','الإجمالي',d.total_debit,d.total_credit], filename:`trial-balance-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ============================================================
// إدارة الشيكات
// ============================================================

// هيكل بيانات الشيك
// { id, type:'received'|'issued', checkNo, bank, amount, currency, issueDate, dueDate, partyId, partyName, status:'pending'|'deposited'|'cleared'|'bounced', notes, createdAt }

// الشيكات المستحقة خلال 7 أيام
function checksDueSoon() {
  const today = new Date();
  const in7   = new Date(today.getTime() + 7 * 86400000);
  return DB.getAll('checks').filter(c => {
    const due = new Date(c.dueDate);
    return c.status === 'pending' && due >= today && due <= in7;
  });
}

// تحديث حالة الشيك وإنشاء قيد تلقائي عند التحصيل
async function updateCheckStatus(id, newStatus) {
  const chk = DB.findById('checks', id);
  if (!chk) return;
  chk.status = newStatus;
  DB.save('checks', chk);
  // إنشاء قيد محاسبي تلقائي عند التحصيل
  if (newStatus === 'cleared') {
    const entryId  = DB.nextId('journal');
    const entryNum = 'JV-CHK-' + String(entryId).padStart(4,'0');
    DB.save('journal', {
      id: entryId,
      number: entryNum,
      date: new Date().toISOString().split('T')[0],
      description: `تحصيل شيك رقم ${chk.checkNo} - ${chk.partyName}`,
      lines: [
        { account_name: 'البنك', account_code: '1020', debit: chk.type==='received'?chk.amount:0, credit: chk.type==='issued'?chk.amount:0 },
        { account_name: 'شيكات برسم التحصيل', account_code: '1025', debit: chk.type==='issued'?chk.amount:0, credit: chk.type==='received'?chk.amount:0 }
      ]
    });
    toast('تم تسجيل قيد التحصيل تلقائياً', 'success');
  }
  if (newStatus === 'bounced') toast('تم تسجيل الشيك المرتجع', 'error');
  renderChecks();
}

// صفحة إدارة الشيكات
async function renderChecks() {
  const content = document.getElementById('page-content');
  const checks  = DB.getAll('checks');
  const received = checks.filter(c => c.type === 'received');
  const issued   = checks.filter(c => c.type === 'issued');
  const dueSoon  = checksDueSoon();

  content.innerHTML = `
    <div class="page-header">
      <div><h2>إدارة الشيكات</h2><p>متابعة الشيكات المستلمة والمصدرة</p></div>
      <button class="btn btn-primary" onclick="openAddCheckModal()">＋ شيك جديد</button>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card gold"><div class="kpi-icon">📥</div><div class="kpi-value number">${received.length}</div><div class="kpi-label">شيكات مستلمة</div></div>
      <div class="kpi-card"><div class="kpi-icon">📤</div><div class="kpi-value number">${issued.length}</div><div class="kpi-label">شيكات مصدرة</div></div>
      <div class="kpi-card ${dueSoon.length>0?'red':'green'}"><div class="kpi-icon">⏰</div><div class="kpi-value number">${dueSoon.length}</div><div class="kpi-label">تستحق خلال 7 أيام</div></div>
    </div>
    <div class="filters-bar">
      <select id="chk-type" onchange="filterChecks()"><option value="">كل الأنواع</option><option value="received">مستلمة</option><option value="issued">مصدرة</option></select>
      <select id="chk-status" onchange="filterChecks()"><option value="">كل الحالات</option><option value="pending">معلق</option><option value="deposited">مودع</option><option value="cleared">محصّل</option><option value="bounced">مرتجع</option></select>
      <input type="text" id="chk-search" placeholder="بحث بالطرف أو رقم الشيك..." oninput="filterChecks()">
    </div>
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead><tr><th>رقم الشيك</th><th>النوع</th><th>البنك</th><th>الطرف</th><th>المبلغ</th><th>تاريخ الإصدار</th><th>تاريخ الاستحقاق</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody id="chk-tbody">${renderCheckRows(checks)}</tbody>
        </table>
      </div>
    </div>`;
  window._checksData = checks;
}

function renderCheckRows(list) {
  if (!list.length) return `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="empty-icon">🏦</div><h3>لا توجد شيكات</h3></div></td></tr>`;
  const statusMap = { pending:'badge-warning', deposited:'badge-info', cleared:'badge-success', bounced:'badge-danger' };
  const statusLbl = { pending:'معلق', deposited:'مودع', cleared:'محصّل', bounced:'مرتجع' };
  return list.map(c => `
    <tr>
      <td><strong>${c.checkNo||'-'}</strong></td>
      <td><span class="badge ${c.type==='received'?'badge-success':'badge-info'}">${c.type==='received'?'مستلم':'مصدر'}</span></td>
      <td>${c.bank||'-'}</td>
      <td>${c.partyName||'-'}</td>
      <td class="number">${formatMoney(c.amount, c.currency||'EGP')}</td>
      <td>${formatDate(c.issueDate)}</td>
      <td>${formatDate(c.dueDate)}</td>
      <td><span class="badge ${statusMap[c.status]||'badge-info'}">${statusLbl[c.status]||c.status}</span></td>
      <td>
        <select class="btn btn-secondary btn-sm" onchange="updateCheckStatus(${c.id},this.value);this.value=''">
          <option value="">تغيير الحالة</option>
          <option value="deposited">إيداع</option>
          <option value="cleared">تحصيل</option>
          <option value="bounced">ارتجاع</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="deleteCheck(${c.id})">حذف</button>
      </td>
    </tr>`).join('');
}

function filterChecks() {
  const type   = document.getElementById('chk-type').value;
  const status = document.getElementById('chk-status').value;
  const search = document.getElementById('chk-search').value.toLowerCase();
  let list = window._checksData || DB.getAll('checks');
  if (type)   list = list.filter(c => c.type === type);
  if (status) list = list.filter(c => c.status === status);
  if (search) list = list.filter(c => (c.partyName||'').toLowerCase().includes(search) || (c.checkNo||'').toLowerCase().includes(search));
  document.getElementById('chk-tbody').innerHTML = renderCheckRows(list);
}

function deleteCheck(id) {
  if (!confirmDelete('حذف هذا الشيك؟')) return;
  DB.remove('checks', id);
  renderChecks();
  toast('تم حذف الشيك', 'success');
}

function openAddCheckModal() {
  const customers = DB.getAll('customers');
  const suppliers = DB.getAll('suppliers');
  const parties   = [...customers.map(c=>({id:c.id,name:c.name,t:'عميل'})), ...suppliers.map(s=>({id:s.id,name:s.name,t:'مورد'}))];
  openModal('شيك جديد', `
    <div class="form-grid">
      <div class="form-group">
        <label>النوع</label>
        <select id="chk-type-inp">
          <option value="received">مستلم</option>
          <option value="issued">مصدر</option>
        </select>
      </div>
      <div class="form-group">
        <label>رقم الشيك</label>
        <input type="text" id="chk-no-inp" placeholder="رقم الشيك">
      </div>
      <div class="form-group">
        <label>البنك</label>
        <input type="text" id="chk-bank-inp" placeholder="اسم البنك">
      </div>
      <div class="form-group">
        <label>الطرف</label>
        <select id="chk-party-inp">
          <option value="">اختر الطرف</option>
          ${parties.map(p=>`<option value="${p.id}|${p.name}">${p.name} (${p.t})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>المبلغ</label>
        <input type="number" id="chk-amount-inp" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>العملة</label>
        <select id="chk-currency-inp">
          <option value="EGP">جنيه مصري</option>
          <option value="USD">دولار</option>
          <option value="EUR">يورو</option>
        </select>
      </div>
      <div class="form-group">
        <label>تاريخ الإصدار</label>
        <input type="date" id="chk-issue-inp">
      </div>
      <div class="form-group">
        <label>تاريخ الاستحقاق</label>
        <input type="date" id="chk-due-inp">
      </div>
      <div class="form-group" style="grid-column:span 2">
        <label>ملاحظات</label>
        <textarea id="chk-notes-inp" rows="2"></textarea>
      </div>
    </div>
    <div style="text-align:left;margin-top:12px">
      <button class="btn btn-primary" onclick="saveCheck()">💾 حفظ</button>
    </div>`);
}

function saveCheck() {
  const partyRaw = document.getElementById('chk-party-inp').value.split('|');
  const chk = {
    id: DB.nextId('checks'),
    type: document.getElementById('chk-type-inp').value,
    checkNo: document.getElementById('chk-no-inp').value.trim(),
    bank: document.getElementById('chk-bank-inp').value.trim(),
    partyId: parseInt(partyRaw[0])||0,
    partyName: partyRaw[1]||'',
    amount: parseFloat(document.getElementById('chk-amount-inp').value)||0,
    currency: document.getElementById('chk-currency-inp').value,
    issueDate: document.getElementById('chk-issue-inp').value,
    dueDate: document.getElementById('chk-due-inp').value,
    status: 'pending',
    notes: document.getElementById('chk-notes-inp').value.trim(),
    createdAt: new Date().toISOString()
  };
  if (!chk.checkNo) { toast('أدخل رقم الشيك', 'error'); return; }
  if (!chk.amount)  { toast('أدخل المبلغ', 'error'); return; }
  DB.save('checks', chk);
  closeModal();
  toast('تم حفظ الشيك بنجاح', 'success');
  renderChecks();
}

// ============================================================
// إغلاق السنة المالية
// ============================================================

async function renderYearClosing() {
  const content = document.getElementById('page-content');
  const closedYears = DB.getAll('closed_years');
  const currentYear = new Date().getFullYear();
  content.innerHTML = `
    <div class="page-header">
      <div><h2>إغلاق السنة المالية</h2><p>قيود الإغلاق ونقل الأرباح المحتجزة</p></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">إغلاق سنة مالية</span></div>
      <div class="form-grid" style="padding:16px">
        <div class="form-group">
          <label>اختر السنة المالية</label>
          <select id="year-sel">
            ${[currentYear-1, currentYear-2, currentYear-3].map(y=>`<option value="${y}">${y}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="padding:0 16px 16px">
        <button class="btn btn-secondary" onclick="previewYearClose()">📊 معاينة الأرصدة</button>
        <button class="btn btn-danger" style="margin-right:8px" onclick="confirmCloseYear()">🔒 إغلاق السنة</button>
      </div>
      <div id="year-preview"></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">السنوات المغلقة</span></div>
      <div class="data-table-wrapper">
        <table>
          <thead><tr><th>السنة</th><th>صافي الربح/الخسارة</th><th>تاريخ الإغلاق</th><th>تم بواسطة</th></tr></thead>
          <tbody>
            ${closedYears.length ? closedYears.map(y=>`
              <tr>
                <td><strong>${y.year}</strong></td>
                <td class="number ${y.netProfit>=0?'text-success':'text-danger'}">${formatMoney(y.netProfit)}</td>
                <td>${formatDate(y.closedAt)}</td>
                <td>${y.closedBy||'-'}</td>
              </tr>`).join('') : '<tr><td colspan="4"><div class="empty-state" style="padding:20px"><p>لا توجد سنوات مغلقة</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function previewYearClose() {
  const year = parseInt(document.getElementById('year-sel').value);
  const accounts = DB.getAll('accounts');
  const revenues  = accounts.filter(a => a.type === 'revenue' && a.balance > 0);
  const expenses  = accounts.filter(a => a.type === 'expense' && a.balance > 0);
  const totalRev  = revenues.reduce((s,a)=>s+a.balance,0);
  const totalExp  = expenses.reduce((s,a)=>s+a.balance,0);
  const netProfit = totalRev - totalExp;
  document.getElementById('year-preview').innerHTML = `
    <div style="padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div class="kpi-card green"><div class="kpi-icon">📈</div><div class="kpi-value number">${formatMoney(totalRev)}</div><div class="kpi-label">إجمالي الإيرادات</div></div>
      <div class="kpi-card red"><div class="kpi-icon">📉</div><div class="kpi-value number">${formatMoney(totalExp)}</div><div class="kpi-label">إجمالي المصروفات</div></div>
      <div class="kpi-card ${netProfit>=0?'gold':'red'}"><div class="kpi-icon">${netProfit>=0?'💰':'🔴'}</div><div class="kpi-value number">${formatMoney(Math.abs(netProfit))}</div><div class="kpi-label">${netProfit>=0?'صافي الربح':'صافي الخسارة'}</div></div>
    </div>`;
}

function confirmCloseYear() {
  const year = parseInt(document.getElementById('year-sel').value);
  if (!confirm(`هل أنت متأكد من إغلاق السنة المالية ${year}؟ لا يمكن التراجع.`)) return;
  closeFinancialYear(year);
}

async function closeFinancialYear(year) {
  const accounts  = DB.getAll('accounts');
  const revenues  = accounts.filter(a => a.type === 'revenue' && a.balance > 0);
  const expenses  = accounts.filter(a => a.type === 'expense' && a.balance > 0);
  const totalRev  = revenues.reduce((s,a)=>s+a.balance,0);
  const totalExp  = expenses.reduce((s,a)=>s+a.balance,0);
  const netProfit = totalRev - totalExp;

  // قيد الإغلاق
  const lines = [
    ...revenues.map(a => ({ account_name: a.name, account_code: a.code||'', debit: a.balance, credit: 0 })),
    ...expenses.map(a => ({ account_name: a.name, account_code: a.code||'', debit: 0, credit: a.balance })),
    { account_name: 'الأرباح المحتجزة', account_code: '3100', debit: netProfit<0?Math.abs(netProfit):0, credit: netProfit>0?netProfit:0 }
  ];

  const entryId  = DB.nextId('journal');
  DB.save('journal', {
    id: entryId,
    number: 'JV-CLOSE-' + year,
    date: `${year}-12-31`,
    description: `قيد إغلاق السنة المالية ${year}`,
    lines,
    locked: true
  });

  // صفر أرصدة الإيرادات والمصروفات
  accounts.forEach(a => {
    if (a.type === 'revenue' || a.type === 'expense') { a.balance = 0; DB.save('accounts', a); }
  });

  // تحديث الأرباح المحتجزة
  const retainedAcc = accounts.find(a => a.name === 'الأرباح المحتجزة' || a.code === '3100');
  if (retainedAcc) { retainedAcc.balance = (retainedAcc.balance||0) + netProfit; DB.save('accounts', retainedAcc); }

  // تسجيل السنة المغلقة
  DB.save('closed_years', { id: DB.nextId('closed_years'), year, netProfit, closedAt: new Date().toISOString(), closedBy: (window.currentUser||{}).name||'مدير النظام' });

  toast(`تم إغلاق السنة المالية ${year} بنجاح`, 'success');
  renderYearClosing();
}

// ============================================================
// القيود المتكررة
// ============================================================

// هيكل القيد المتكرر:
// { id, name, frequency:'monthly'|'quarterly'|'yearly', nextDueDate, lines:[{account_name,account_code,debit,credit}], description, isActive, createdAt }

// فحص القيود المتكررة المستحقة وإنشاؤها تلقائياً
function checkRecurringEntries() {
  const today     = new Date();
  const recurring = DB.getAll('recurring_entries').filter(r => r.isActive && new Date(r.nextDueDate) <= today);
  recurring.forEach(r => {
    const id  = DB.nextId('journal');
    DB.save('journal', {
      id,
      number: 'JV-REC-' + String(id).padStart(4,'0'),
      date: today.toISOString().split('T')[0],
      description: r.name + ' (قيد متكرر)',
      lines: r.lines || []
    });
    // تحديث تاريخ الاستحقاق التالي
    const next = new Date(r.nextDueDate);
    if (r.frequency === 'monthly')   next.setMonth(next.getMonth() + 1);
    else if (r.frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
    else if (r.frequency === 'yearly')    next.setFullYear(next.getFullYear() + 1);
    r.nextDueDate = next.toISOString().split('T')[0];
    DB.save('recurring_entries', r);
  });
  if (recurring.length > 0) toast(`تم إنشاء ${recurring.length} قيد متكرر تلقائياً`, 'success');
}

async function renderRecurringEntries() {
  const content = document.getElementById('page-content');
  const entries = DB.getAll('recurring_entries');
  content.innerHTML = `
    <div class="page-header">
      <div><h2>القيود المتكررة</h2><p>قيود تنشأ تلقائياً بشكل دوري</p></div>
      <button class="btn btn-primary" onclick="openAddRecurringModal()">＋ قيد متكرر جديد</button>
    </div>
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead><tr><th>الاسم</th><th>التكرار</th><th>تاريخ الاستحقاق التالي</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            ${entries.length ? entries.map(r=>`
              <tr>
                <td><strong>${r.name}</strong></td>
                <td>${{monthly:'شهري',quarterly:'ربع سنوي',yearly:'سنوي'}[r.frequency]||r.frequency}</td>
                <td>${formatDate(r.nextDueDate)}</td>
                <td><span class="badge ${r.isActive?'badge-success':'badge-danger'}">${r.isActive?'نشط':'موقوف'}</span></td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="toggleRecurring(${r.id})">${r.isActive?'إيقاف':'تفعيل'}</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteRecurring(${r.id})">حذف</button>
                </td>
              </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state" style="padding:40px"><div class="empty-icon">🔄</div><h3>لا توجد قيود متكررة</h3></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function toggleRecurring(id) {
  const r = DB.findById('recurring_entries', id);
  if (!r) return;
  r.isActive = !r.isActive;
  DB.save('recurring_entries', r);
  toast(r.isActive ? 'تم تفعيل القيد المتكرر' : 'تم إيقاف القيد المتكرر', 'success');
  renderRecurringEntries();
}

function deleteRecurring(id) {
  if (!confirmDelete('حذف هذا القيد المتكرر؟')) return;
  DB.remove('recurring_entries', id);
  renderRecurringEntries();
  toast('تم الحذف', 'success');
}

function openAddRecurringModal() {
  openModal('قيد متكرر جديد', `
    <div class="form-grid">
      <div class="form-group"><label>الاسم</label><input type="text" id="rec-name" placeholder="مثال: إيجار شهري"></div>
      <div class="form-group"><label>التكرار</label>
        <select id="rec-freq"><option value="monthly">شهري</option><option value="quarterly">ربع سنوي</option><option value="yearly">سنوي</option></select>
      </div>
      <div class="form-group"><label>تاريخ الاستحقاق الأول</label><input type="date" id="rec-date"></div>
      <div class="form-group"><label>الوصف</label><input type="text" id="rec-desc" placeholder="وصف القيد"></div>
    </div>
    <p style="color:var(--text-muted);font-size:12px;margin:8px 0">ملاحظة: يمكن إضافة سطور القيد لاحقاً من خلال التعديل.</p>
    <div style="text-align:left;margin-top:12px">
      <button class="btn btn-primary" onclick="saveRecurringEntry()">💾 حفظ</button>
    </div>`);
}

function saveRecurringEntry() {
  const name = document.getElementById('rec-name').value.trim();
  const date = document.getElementById('rec-date').value;
  if (!name) { toast('أدخل اسم القيد', 'error'); return; }
  if (!date) { toast('حدد تاريخ الاستحقاق', 'error'); return; }
  DB.save('recurring_entries', {
    id: DB.nextId('recurring_entries'),
    name,
    frequency: document.getElementById('rec-freq').value,
    nextDueDate: date,
    description: document.getElementById('rec-desc').value.trim(),
    lines: [],
    isActive: true,
    createdAt: new Date().toISOString()
  });
  closeModal();
  toast('تم حفظ القيد المتكرر', 'success');
  renderRecurringEntries();
}

// تشغيل فحص القيود المتكررة عند تحميل الصفحة
checkRecurringEntries();
