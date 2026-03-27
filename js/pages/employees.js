// ============================================
// Employees Management & Activity Log Pages
// ============================================

const ROLE_BADGE = {
  'مدير عام':       'badge-danger',
  'مدير':           'badge-danger',
  'محاسب':          'badge-gold',
  'موظف مبيعات':   'badge-success',
  'مدير مبيعات':   'badge-success',
  'موظف مشتريات': 'badge-info',
  'موظف تصنيع':   'badge-warning',
  'مدير تصنيع':   'badge-info',
  'مشرف تصنيع':   'badge-warning',
  'موظف لوجستيك': 'badge-info',
  'مدير قسم':      'badge-gold',
  'موظف عادي':     'badge-info',
};

const WORK_STATUS_BADGE = {
  'active':     ['badge-success', 'نشط'],
  'on_leave':   ['badge-warning', 'إجازة'],
  'resigned':   ['badge-danger',  'مستقيل'],
  'terminated': ['badge-danger',  'تم الفصل'],
};

const EMPLOYEE_ROLES = ['مدير عام', 'مدير قسم', 'محاسب', 'موظف مبيعات', 'مدير مبيعات', 'موظف مشتريات', 'موظف تصنيع', 'مشرف تصنيع', 'مدير تصنيع', 'موظف لوجستيك', 'موظف عادي'];

// ===== EMPLOYEES PAGE =====
async function renderEmployees() {
  const content = document.getElementById('page-content');
  try {
    const users = await api.users();

    content.innerHTML = `
      <div class="page-header">
        <div><h2>إدارة الموظفين</h2><p>إدارة حسابات الموظفين وصلاحياتهم</p></div>
        <button class="btn btn-primary" onclick="openNewEmployeeModal()">＋ موظف جديد</button>
      </div>

      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي الموظفين</div><div class="value">${users.length}</div></div>
        <div class="summary-box profit"><div class="label">نشطون</div><div class="value">${users.filter(u => (u.work_status || 'active') === 'active').length}</div></div>
        <div class="summary-box"><div class="label">إجازة</div><div class="value">${users.filter(u => u.work_status === 'on_leave').length}</div></div>
        <div class="summary-box loss"><div class="label">مستقيل / مفصول</div><div class="value">${users.filter(u => u.work_status === 'resigned' || u.work_status === 'terminated').length}</div></div>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>الاسم</th><th>البريد الإلكتروني</th><th>الدور الوظيفي</th>
              <th>القسم</th><th>الهاتف</th><th>الراتب</th><th>حالة العمل</th><th>إجراءات</th>
            </tr></thead>
            <tbody id="emp-tbody">${renderEmployeeRows(users)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._empData = users;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderEmployeeRows(users) {
  if (!users.length) return `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="empty-icon">👥</div><h3>لا يوجد موظفون</h3></div></td></tr>`;
  return users.map(u => {
    const ws = u.work_status || 'active';
    const [wsCls, wsLabel] = WORK_STATUS_BADGE[ws] || ['badge-info', ws];
    return `
    <tr>
      <td><strong>${u.name}</strong>${u.national_id ? `<br><small class="text-muted">${u.national_id}</small>` : ''}</td>
      <td class="text-muted">${u.email}</td>
      <td><span class="badge ${ROLE_BADGE[u.role] || 'badge-info'}">${u.role}</span></td>
      <td>${u.department || '-'}</td>
      <td>${u.phone || '-'}</td>
      <td class="number">${u.salary ? formatMoney(u.salary) : '-'}</td>
      <td><span class="badge ${wsCls}">${wsLabel}</span></td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="openEditEmployeeModal(${u.id})">تعديل</button>
        ${u.id !== 1
          ? `<button class="btn btn-sm ${ws === 'active' ? 'btn-danger' : 'btn-success'}"
               data-emp-id="${u.id}" data-work-status="${ws}"
               onclick="cycleEmployeeStatus(parseInt(this.dataset.empId), this.dataset.workStatus)">
               ${ws === 'active' ? 'إيقاف' : 'تفعيل'}
             </button>`
          : ''}
        <button class="btn btn-secondary btn-sm" data-emp-id="${u.id}" data-emp-name="${u.name.replace(/"/g,'&quot;')}"
          onclick="viewEmployeeActivity(parseInt(this.dataset.empId), this.dataset.empName)">📋 النشاط</button>
      </td>
    </tr>
  `}).join('');
}

function openNewEmployeeModal() {
  openModal('إضافة موظف جديد', `
    <div class="form-grid">
      <div class="form-group form-full">
        <label>الاسم الكامل *</label>
        <input type="text" id="nemp-name" placeholder="الاسم الكامل للموظف">
      </div>
      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <input type="email" id="nemp-email" placeholder="employee@company.com">
      </div>
      <div class="form-group">
        <label>كلمة المرور *</label>
        <input type="password" id="nemp-pass" placeholder="كلمة المرور">
      </div>
      <div class="form-group">
        <label>الرقم القومي / ID</label>
        <input type="text" id="nemp-national" placeholder="14 رقم">
      </div>
      <div class="form-group">
        <label>الدور الوظيفي *</label>
        <select id="nemp-role">
          ${EMPLOYEE_ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>القسم</label>
        <input type="text" id="nemp-dept" placeholder="مثال: المحاسبة، المبيعات...">
      </div>
      <div class="form-group">
        <label>الهاتف</label>
        <input type="text" id="nemp-phone" placeholder="01xxxxxxxxx">
      </div>
      <div class="form-group">
        <label>الراتب (EGP)</label>
        <input type="number" id="nemp-salary" placeholder="0" min="0">
      </div>
      <div class="form-group">
        <label>حالة العمل</label>
        <select id="nemp-workstatus">
          <option value="active">نشط</option>
          <option value="on_leave">إجازة</option>
          <option value="resigned">مستقيل</option>
          <option value="terminated">تم الفصل</option>
        </select>
      </div>
    </div>
    <div style="margin-top:8px;padding:12px;background:var(--bg-input);border-radius:8px;font-size:13px">
      <strong>الصلاحيات المتاحة:</strong>
      <div id="nemp-role-hint" style="margin-top:4px;color:var(--text-secondary)"></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveNewEmployee()">💾 حفظ</button>
    </div>
  `);
  document.getElementById('nemp-role').addEventListener('change', updateRoleHint);
  updateRoleHint();
}

function updateRoleHint() {
  const role = document.getElementById('nemp-role')?.value;
  const hintEl = document.getElementById('nemp-role-hint');
  if (!hintEl) return;
  const pages = (typeof ROLE_PAGES !== 'undefined') ? ROLE_PAGES[role] : null;
  if (pages === null || pages === undefined) {
    hintEl.textContent = 'صلاحيات كاملة على جميع أقسام النظام';
  } else {
    hintEl.textContent = 'يرى: ' + pages.filter(p => p !== 'dashboard' && p !== 'notifications').join('، ');
  }
}

async function saveNewEmployee() {
  const name  = document.getElementById('nemp-name').value.trim();
  const email = document.getElementById('nemp-email').value.trim();
  const pass  = document.getElementById('nemp-pass').value;
  const role  = document.getElementById('nemp-role').value;

  if (!name)  { toast('الرجاء إدخال الاسم', 'error'); return; }
  if (!email) { toast('الرجاء إدخال البريد الإلكتروني', 'error'); return; }
  if (!pass)  { toast('الرجاء إدخال كلمة المرور', 'error'); return; }

  try {
    await api.createUser({
      name, email, password: pass, role,
      department:  document.getElementById('nemp-dept').value,
      phone:       document.getElementById('nemp-phone').value,
      national_id: document.getElementById('nemp-national').value,
      salary:      parseFloat(document.getElementById('nemp-salary').value) || 0,
      work_status: document.getElementById('nemp-workstatus').value,
    });
    closeModal();
    toast('تم إضافة الموظف بنجاح', 'success');
    renderEmployees();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openEditEmployeeModal(id) {
  const users = window._empData || [];
  const u = users.find(x => x.id === id);
  if (!u) return;

  openModal('تعديل بيانات الموظف', `
    <div class="form-grid">
      <div class="form-group form-full">
        <label>الاسم الكامل *</label>
        <input type="text" id="eemp-name" value="${u.name}">
      </div>
      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <input type="email" id="eemp-email" value="${u.email}">
      </div>
      <div class="form-group">
        <label>كلمة المرور الجديدة (اتركها فارغة إن لم تريد التغيير)</label>
        <input type="password" id="eemp-pass" placeholder="كلمة مرور جديدة">
      </div>
      <div class="form-group">
        <label>الرقم القومي / ID</label>
        <input type="text" id="eemp-national" value="${u.national_id || ''}" placeholder="14 رقم">
      </div>
      <div class="form-group">
        <label>الدور الوظيفي *</label>
        <select id="eemp-role" ${u.id === 1 ? 'disabled' : ''}>
          ${EMPLOYEE_ROLES.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>القسم</label>
        <input type="text" id="eemp-dept" value="${u.department || ''}">
      </div>
      <div class="form-group">
        <label>الهاتف</label>
        <input type="text" id="eemp-phone" value="${u.phone || ''}">
      </div>
      <div class="form-group">
        <label>الراتب (EGP)</label>
        <input type="number" id="eemp-salary" value="${u.salary || 0}" min="0">
      </div>
      <div class="form-group">
        <label>حالة العمل</label>
        <select id="eemp-workstatus" ${u.id === 1 ? 'disabled' : ''}>
          <option value="active"     ${(u.work_status||'active') === 'active'     ? 'selected':''}>نشط</option>
          <option value="on_leave"   ${u.work_status === 'on_leave'               ? 'selected':''}>إجازة</option>
          <option value="resigned"   ${u.work_status === 'resigned'               ? 'selected':''}>مستقيل</option>
          <option value="terminated" ${u.work_status === 'terminated'             ? 'selected':''}>تم الفصل</option>
        </select>
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveEditEmployee(${id})">💾 حفظ التغييرات</button>
    </div>
  `);
}

async function saveEditEmployee(id) {
  const name  = document.getElementById('eemp-name').value.trim();
  const email = document.getElementById('eemp-email').value.trim();
  const pass  = document.getElementById('eemp-pass').value;

  if (!name)  { toast('الرجاء إدخال الاسم', 'error'); return; }
  if (!email) { toast('الرجاء إدخال البريد الإلكتروني', 'error'); return; }

  const data = {
    name, email,
    role:        document.getElementById('eemp-role').value,
    department:  document.getElementById('eemp-dept').value,
    phone:       document.getElementById('eemp-phone').value,
    national_id: document.getElementById('eemp-national').value,
    salary:      parseFloat(document.getElementById('eemp-salary').value) || 0,
    work_status: document.getElementById('eemp-workstatus').value,
    active:      document.getElementById('eemp-workstatus').value === 'active',
  };
  if (pass) data.password = pass;

  try {
    await api.updateUser(id, data);
    closeModal();
    toast('تم تحديث بيانات الموظف', 'success');
    renderEmployees();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// Rename to clarify toggle behavior (active ↔ terminated)
async function toggleEmployeeActiveStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'terminated' : 'active';
  try {
    await api.updateUser(id, { work_status: newStatus, active: newStatus === 'active' });
    toast(newStatus === 'active' ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب', 'success');
    renderEmployees();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// Keep backward-compatible alias
async function cycleEmployeeStatus(id, currentStatus) {
  return toggleEmployeeActiveStatus(id, currentStatus);
}

// Keep for backward compatibility
async function toggleEmployeeActive(id, currentlyActive) {
  return toggleEmployeeActiveStatus(id, currentlyActive ? 'active' : 'terminated');
}

async function viewEmployeeActivity(userId, userName) {
  const logs = await api.activityLog({ user_id: userId });
  const actionColors = { create: 'badge-success', update: 'badge-info', delete: 'badge-danger', login: 'badge-gold' };
  const actionLabels = { create: 'إنشاء', update: 'تعديل', delete: 'حذف', login: 'دخول' };

  const rows = !logs.length
    ? `<tr><td colspan="4"><div class="empty-state" style="padding:20px"><div class="empty-icon">📋</div><h3>لا توجد أنشطة مسجلة</h3></div></td></tr>`
    : logs.map(l => `
      <tr>
        <td style="white-space:nowrap">
          ${new Date(l.created_at).toLocaleDateString('ar-EG')}
          <br><small class="text-muted">${new Date(l.created_at).toLocaleTimeString('ar-EG')}</small>
        </td>
        <td><span class="badge ${actionColors[l.action] || 'badge-info'}">${actionLabels[l.action] || l.action}</span></td>
        <td>${l.entity_type}</td>
        <td>${l.description}</td>
      </tr>
    `).join('');

  openModal(`سجل نشاط: ${userName}`, `
    <div class="data-table-wrapper">
      <table>
        <thead><tr><th>التاريخ والوقت</th><th>الإجراء</th><th>النوع</th><th>التفاصيل</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

// ===== ACTIVITY LOG PAGE =====
async function renderActivityLog() {
  const content = document.getElementById('page-content');
  try {
    const [logs, users] = await Promise.all([api.activityLog(), api.users()]);

    content.innerHTML = `
      <div class="page-header">
        <div><h2>سجل الأنشطة</h2><p>مراجعة آخر العمليات المنفذة من الموظفين</p></div>
      </div>

      <div class="filters-bar">
        <select id="log-user-filter" onchange="filterActivityLog()" style="min-width:180px">
          <option value="">كل الموظفين</option>
          ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
        <select id="log-type-filter" onchange="filterActivityLog()" style="min-width:160px">
          <option value="">كل الأنواع</option>
          <option value="payment">مدفوعات/مقبوضات</option>
          <option value="sale">مبيعات</option>
          <option value="purchase">مشتريات</option>
          <option value="expense">مصروفات</option>
          <option value="cutting">تصنيع</option>
          <option value="employee">موظفون</option>
          <option value="auth">تسجيل دخول</option>
        </select>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>التاريخ والوقت</th><th>الموظف</th><th>الإجراء</th><th>النوع</th><th>التفاصيل</th>
            </tr></thead>
            <tbody id="log-tbody">${renderActivityLogRows(logs)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._activityLogs  = logs;
    window._activityUsers = users;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderActivityLogRows(logs) {
  if (!logs.length) return `<tr><td colspan="5"><div class="empty-state" style="padding:40px"><div class="empty-icon">📋</div><h3>لا توجد أنشطة مسجلة بعد</h3></div></td></tr>`;

  const actionColors = { create: 'badge-success', update: 'badge-info', delete: 'badge-danger', login: 'badge-gold' };
  const actionLabels = { create: 'إنشاء', update: 'تعديل', delete: 'حذف', login: 'دخول' };

  return logs.map(l => `
    <tr>
      <td style="white-space:nowrap">
        ${new Date(l.created_at).toLocaleDateString('ar-EG')}
        <br><small class="text-muted">${new Date(l.created_at).toLocaleTimeString('ar-EG')}</small>
      </td>
      <td><strong>${l.user_name}</strong></td>
      <td><span class="badge ${actionColors[l.action] || 'badge-info'}">${actionLabels[l.action] || l.action}</span></td>
      <td>${l.entity_type}</td>
      <td>${l.description}</td>
    </tr>
  `).join('');
}

async function filterActivityLog() {
  const userId     = document.getElementById('log-user-filter').value;
  const entityType = document.getElementById('log-type-filter').value;
  const params = {};
  if (userId)     params.user_id     = parseInt(userId);
  if (entityType) params.entity_type = entityType;
  const logs = await api.activityLog(params);
  document.getElementById('log-tbody').innerHTML = renderActivityLogRows(logs);
}
