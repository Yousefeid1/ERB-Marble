// ============================================
// Products, Projects, Expenses, Settings & Notifications
// ============================================

// ===== PRODUCTS =====
async function renderProducts() {
  const content = document.getElementById('page-content');
  try {
    const products = await api.products();
    content.innerHTML = `
      <div class="page-header">
        <div><h2>المنتجات</h2><p>إدارة كتالوج المنتجات والمخزون</p></div>
        <button class="btn btn-primary" onclick="openNewProductModal()">＋ منتج جديد</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="prod-search" placeholder="بحث بالاسم أو الكود..." oninput="filterProducts()" style="flex:1">
        <select id="prod-cat" onchange="filterProducts()">
          <option value="">كل الفئات</option>
          <option value="رخام">رخام</option>
          <option value="جرانيت">جرانيت</option>
        </select>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>الكود</th><th>المنتج</th><th>الفئة</th><th>الوحدة</th>
              <th>سعر الكلفة</th><th>سعر البيع</th><th>المخزون</th><th>الحد الأدنى</th><th>الحالة</th>
            </tr></thead>
            <tbody id="prod-tbody">${renderProductRows(products)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderProductRows(products) {
  if (!products.length) return `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="empty-icon">▦</div><h3>لا توجد منتجات</h3></div></td></tr>`;
  return products.map(p => `
    <tr>
      <td class="number">${p.code}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge ${p.category === 'رخام' ? 'badge-gold' : 'badge-info'}">${p.category}</span></td>
      <td>${p.unit}</td>
      <td class="number">${formatMoney(p.cost)}</td>
      <td class="number">${formatMoney(p.price)}</td>
      <td class="number ${p.stock_qty <= p.min_stock ? 'text-danger' : 'text-success'}">${p.stock_qty}</td>
      <td class="number">${p.min_stock}</td>
      <td>${p.stock_qty <= p.min_stock ? '<span class="badge badge-danger">نقص مخزون</span>' : '<span class="badge badge-success">متوفر</span>'}</td>
    </tr>
  `).join('');
}

async function filterProducts() {
  const search   = document.getElementById('prod-search').value;
  const category = document.getElementById('prod-cat').value;
  const products = await api.products({ search, category });
  document.getElementById('prod-tbody').innerHTML = renderProductRows(products);
}

function openNewProductModal() {
  openModal('منتج جديد', `
    <div class="form-grid">
      <div class="form-group"><label>كود المنتج *</label><input type="text" id="np2-code" placeholder="مثال: MBL-007"></div>
      <div class="form-group form-full"><label>اسم المنتج *</label><input type="text" id="np2-name" placeholder="اسم المنتج"></div>
      <div class="form-group">
        <label>الفئة *</label>
        <select id="np2-cat">
          <option value="رخام">رخام</option>
          <option value="جرانيت">جرانيت</option>
        </select>
      </div>
      <div class="form-group">
        <label>الوحدة</label>
        <select id="np2-unit">
          <option value="م²">م²</option>
          <option value="طن">طن</option>
          <option value="قطعة">قطعة</option>
        </select>
      </div>
      <div class="form-group"><label>سعر الكلفة</label><input type="number" id="np2-cost" min="0" value="0"></div>
      <div class="form-group"><label>سعر البيع</label><input type="number" id="np2-price" min="0" value="0"></div>
      <div class="form-group"><label>المخزون الحالي</label><input type="number" id="np2-stock" min="0" value="0"></div>
      <div class="form-group"><label>الحد الأدنى للمخزون</label><input type="number" id="np2-min" min="0" value="10"></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveProduct()">💾 حفظ</button>
    </div>
  `);
}

async function saveProduct() {
  const code = document.getElementById('np2-code').value.trim();
  const name = document.getElementById('np2-name').value.trim();
  if (!code || !name) { toast('الرجاء إدخال الكود والاسم', 'error'); return; }
  await api.createProduct({
    code, name,
    category:  document.getElementById('np2-cat').value,
    unit:      document.getElementById('np2-unit').value,
    cost:      parseFloat(document.getElementById('np2-cost').value)  || 0,
    price:     parseFloat(document.getElementById('np2-price').value) || 0,
    stock_qty: parseFloat(document.getElementById('np2-stock').value) || 0,
    min_stock: parseFloat(document.getElementById('np2-min').value)   || 0,
    status:    'in_stock',
  });
  closeModal();
  toast('تم إضافة المنتج', 'success');
  renderProducts();
}

// ===== PROJECTS =====
async function renderProjects() {
  const content = document.getElementById('page-content');
  try {
    const customers = await api.customers();
    const projects  = await api.projects();
    window._projCustomers = customers;

    const active    = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent  = projects.reduce((s, p) => s + (p.spent || 0), 0);

    content.innerHTML = `
      <div class="page-header">
        <div><h2>المشاريع</h2><p>متابعة المشاريع والعقود</p></div>
        <button class="btn btn-primary" onclick="openNewProjectModal()">＋ مشروع جديد</button>
      </div>
      <div class="report-summary">
        <div class="summary-box gold">  <div class="label">إجمالي المشاريع</div>   <div class="value">${projects.length}</div></div>
        <div class="summary-box profit"><div class="label">نشطة</div>               <div class="value">${active}</div></div>
        <div class="summary-box">       <div class="label">مكتملة</div>              <div class="value">${completed}</div></div>
        <div class="summary-box gold">  <div class="label">إجمالي الميزانيات</div>  <div class="value">${formatMoney(totalBudget)}</div></div>
        <div class="summary-box">       <div class="label">إجمالي المنصرف</div>      <div class="value">${formatMoney(totalSpent)}</div></div>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>اسم المشروع</th><th>العميل</th><th>البداية</th><th>النهاية</th>
              <th>الميزانية</th><th>المنصرف</th><th>المتبقي</th><th>% الإنجاز</th><th>الحالة</th>
            </tr></thead>
            <tbody>
              ${projects.length === 0
                ? `<tr><td colspan="9"><div class="empty-state" style="padding:30px"><div class="empty-icon">◫</div><h3>لا توجد مشاريع</h3></div></td></tr>`
                : projects.map(p => {
                  const spent   = p.spent || 0;
                  const remain  = p.budget - spent;
                  const pct     = p.budget > 0 ? Math.min(100, (spent / p.budget * 100)).toFixed(0) : 0;
                  return `
                    <tr>
                      <td><strong>${p.name}</strong></td>
                      <td>${p.customer}</td>
                      <td>${formatDate(p.start_date)}</td>
                      <td>${formatDate(p.end_date)}</td>
                      <td class="number">${formatMoney(p.budget)}</td>
                      <td class="number">${formatMoney(spent)}</td>
                      <td class="number ${remain < 0 ? 'text-danger' : 'text-success'}">${formatMoney(remain)}</td>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px">
                          <div style="flex:1;height:6px;background:var(--bg-input);border-radius:3px">
                            <div style="height:100%;background:${pct > 90 ? 'var(--danger)' : 'var(--accent)'};border-radius:3px;width:${pct}%"></div>
                          </div>
                          <span style="font-size:12px">${pct}%</span>
                        </div>
                      </td>
                      <td>${statusBadge(p.status)}</td>
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

function openNewProjectModal() {
  const customers = window._projCustomers || [];
  openModal('مشروع جديد', `
    <div class="form-grid">
      <div class="form-group form-full"><label>اسم المشروع *</label><input type="text" id="nproj-name" placeholder="اسم المشروع"></div>
      <div class="form-group">
        <label>العميل</label>
        <select id="nproj-cust">
          <option value="">اختر العميل</option>
          ${customers.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>الميزانية (ج.م)</label><input type="number" id="nproj-budget" min="0" value="0"></div>
      <div class="form-group"><label>تاريخ البداية</label><input type="date" id="nproj-start" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>تاريخ النهاية المتوقعة</label><input type="date" id="nproj-end"></div>
      <div class="form-group form-full"><label>الوصف</label><textarea id="nproj-desc" placeholder="وصف المشروع..."></textarea></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveProject()">💾 حفظ</button>
    </div>
  `);
}

async function saveProject() {
  const name = document.getElementById('nproj-name').value.trim();
  if (!name) { toast('الرجاء إدخال اسم المشروع', 'error'); return; }
  const custEl = document.getElementById('nproj-cust');
  await api.createProject({
    name, description: document.getElementById('nproj-desc').value,
    customer_id: custEl.value ? parseInt(custEl.value) : null,
    customer:    custEl.value ? custEl.options[custEl.selectedIndex].dataset.name : '',
    budget:      parseFloat(document.getElementById('nproj-budget').value) || 0,
    start_date:  document.getElementById('nproj-start').value,
    end_date:    document.getElementById('nproj-end').value,
    status:      'active',
  });
  closeModal();
  toast('تم إضافة المشروع', 'success');
  renderProjects();
}

// ===== EXPENSES =====
async function renderExpenses() {
  const content = document.getElementById('page-content');
  try {
    const projects = await api.projects();
    const { data: expenses } = await api.expenses();
    window._expProjects = projects;

    const total  = expenses.reduce((s, e) => s + e.amount, 0);
    const groups = {};
    expenses.forEach(e => { groups[e.category] = (groups[e.category] || 0) + e.amount; });

    content.innerHTML = `
      <div class="page-header">
        <div><h2>المصروفات</h2><p>تتبع مصروفات التشغيل</p></div>
        <button class="btn btn-primary" onclick="openNewExpenseModal()">＋ مصروف جديد</button>
      </div>
      <div class="report-summary">
        <div class="summary-box loss"><div class="label">إجمالي المصروفات</div><div class="value">${formatMoney(total)}</div></div>
        ${Object.entries(groups).slice(0, 3).map(([cat, amt]) => `<div class="summary-box"><div class="label">${cat}</div><div class="value">${formatMoney(amt)}</div></div>`).join('')}
      </div>
      <div class="filters-bar">
        <input type="text" id="exp-search" placeholder="بحث في المصروفات..." oninput="filterExpenses()" style="flex:1">
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>الفئة</th><th>الوصف</th><th>المبلغ</th><th>التاريخ</th><th>المشروع</th></tr></thead>
            <tbody id="exp-tbody">${renderExpenseRows(expenses, projects)}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderExpenseRows(expenses, projects) {
  if (!expenses.length) return `<tr><td colspan="5"><div class="empty-state" style="padding:30px"><div class="empty-icon">◪</div><h3>لا توجد مصروفات</h3></div></td></tr>`;
  return expenses.map(e => {
    const proj = e.project_id ? (projects || []).find(p => p.id === e.project_id) : null;
    return `
      <tr>
        <td><span class="badge badge-warning">${e.category}</span></td>
        <td>${e.description}</td>
        <td class="number text-danger">${formatMoney(e.amount)}</td>
        <td>${formatDate(e.date)}</td>
        <td>${proj ? proj.name : '-'}</td>
      </tr>
    `;
  }).join('');
}

async function filterExpenses() {
  const search = document.getElementById('exp-search').value;
  const { data } = await api.expenses({ search });
  document.getElementById('exp-tbody').innerHTML = renderExpenseRows(data, window._expProjects || []);
}

function openNewExpenseModal() {
  const projects = window._expProjects || [];
  openModal('مصروف جديد', `
    <div class="form-grid">
      <div class="form-group">
        <label>الفئة *</label>
        <select id="nexp-cat">
          <option value="رواتب وأجور">رواتب وأجور</option>
          <option value="صيانة وإصلاح">صيانة وإصلاح</option>
          <option value="مرافق">مرافق</option>
          <option value="نقل وشحن">نقل وشحن</option>
          <option value="مواد استهلاكية">مواد استهلاكية</option>
          <option value="إيجارات">إيجارات</option>
          <option value="تسويق وإعلان">تسويق وإعلان</option>
          <option value="أخرى">أخرى</option>
        </select>
      </div>
      <div class="form-group"><label>المبلغ *</label><input type="number" id="nexp-amount" min="0" step="0.01"></div>
      <div class="form-group form-full"><label>الوصف *</label><input type="text" id="nexp-desc" placeholder="وصف المصروف"></div>
      <div class="form-group"><label>التاريخ</label><input type="date" id="nexp-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group">
        <label>المشروع (اختياري)</label>
        <select id="nexp-proj">
          <option value="">غير مرتبط بمشروع</option>
          ${projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveExpense()">💾 حفظ</button>
    </div>
  `);
}

async function saveExpense() {
  const desc   = document.getElementById('nexp-desc').value.trim();
  const amount = parseFloat(document.getElementById('nexp-amount').value);
  if (!desc || !amount || amount <= 0) { toast('الرجاء إدخال الوصف والمبلغ', 'error'); return; }
  const projId = document.getElementById('nexp-proj').value;
  await api.createExpense({
    category:   document.getElementById('nexp-cat').value,
    description: desc, amount,
    date:        document.getElementById('nexp-date').value,
    project_id:  projId ? parseInt(projId) : null,
  });
  closeModal();
  toast('تم تسجيل المصروف', 'success');
  renderExpenses();
}

// ===== SETTINGS =====
async function renderSettings() {
  const content = document.getElementById('page-content');
  try {
    const s = await api.settings();
    content.innerHTML = `
      <div class="page-header"><div><h2>الإعدادات</h2><p>إعدادات الشركة والنظام</p></div></div>
      <div class="card">
        <div class="card-header"><span class="card-title">🏢 بيانات الشركة</span></div>
        <div class="form-grid">
          <div class="form-group form-full"><label>اسم الشركة</label><input type="text" id="set-name"     value="${s.company_name || ''}"></div>
          <div class="form-group"><label>الهاتف</label>            <input type="text" id="set-phone"    value="${s.phone || ''}"></div>
          <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="set-email"    value="${s.email || ''}"></div>
          <div class="form-group form-full"><label>العنوان</label>  <input type="text" id="set-address"  value="${s.address || ''}"></div>
          <div class="form-group"><label>العملة</label>            <input type="text" id="set-currency" value="${s.currency || 'EGP'}"></div>
          <div class="form-group"><label>نسبة ضريبة القيمة المضافة (%)</label><input type="number" id="set-tax" value="${s.tax_rate || 14}" min="0" max="100"></div>
        </div>
        <div style="margin-top:20px;text-align:left">
          <button class="btn btn-primary" onclick="saveSettings()">💾 حفظ الإعدادات</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🔐 بيانات تسجيل الدخول التجريبي</span></div>
        <div style="background:var(--bg-input);border-radius:8px;padding:16px;font-family:monospace">
          <p>البريد: <strong>admin@marble.com</strong></p>
          <p style="margin-top:8px">كلمة المرور: <strong>admin123</strong></p>
        </div>
        <p style="margin-top:12px;font-size:12px;color:var(--text-muted)">
          ⚠ هذا نظام تجريبي - البيانات محفوظة في المتصفح (localStorage) وليست على سيرفر
        </p>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🗑 إعادة تعيين البيانات</span></div>
        <p style="color:var(--text-secondary);margin-bottom:12px">حذف جميع البيانات المحفوظة وإعادة البيانات التجريبية الافتراضية</p>
        <button class="btn btn-danger" onclick="resetAllData()">⚠ إعادة تعيين جميع البيانات</button>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

async function saveSettings() {
  const data = {
    company_name: document.getElementById('set-name').value,
    phone:        document.getElementById('set-phone').value,
    email:        document.getElementById('set-email').value,
    address:      document.getElementById('set-address').value,
    currency:     document.getElementById('set-currency').value,
    tax_rate:     parseFloat(document.getElementById('set-tax').value) || 14,
  };
  await api.saveSettings(data);
  const el = document.getElementById('company-name-sidebar');
  if (el && data.company_name) el.textContent = data.company_name;
  toast('تم حفظ الإعدادات', 'success');
}

function resetAllData() {
  if (!confirm('هل أنت متأكد من إعادة تعيين جميع البيانات؟ سيتم حذف كل البيانات المدخلة.')) return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('marble_db_'));
  keys.forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('marble_token');
  localStorage.removeItem('marble_user');
  toast('تم إعادة تعيين البيانات - يتم إعادة التحميل...', 'warning');
  setTimeout(() => location.reload(), 1500);
}

// ===== NOTIFICATIONS =====
async function renderNotifications() {
  const content = document.getElementById('page-content');
  try {
    const notifs = await api.notifications();
    const unread = notifs.filter(n => !n.is_read).length;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>الإشعارات</h2><p>${unread} إشعار غير مقروء</p></div>
        ${unread > 0 ? `<button class="btn btn-secondary" onclick="markAllRead()">✓ تحديد الكل كمقروء</button>` : ''}
      </div>
      <div class="card" style="padding:0">
        ${notifs.length === 0
          ? `<div class="empty-state" style="padding:60px"><div class="empty-icon">🔔</div><h3>لا توجد إشعارات</h3></div>`
          : notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(n => `
            <div onclick="markNotifRead(${n.id})" style="
              display:flex;align-items:flex-start;gap:16px;padding:16px 20px;
              border-bottom:1px solid var(--border);cursor:pointer;
              background:${!n.is_read ? 'rgba(200,169,110,0.04)' : 'transparent'};
              transition:background 0.15s
            " onmouseover="this.style.background='rgba(200,169,110,0.08)'" onmouseout="this.style.background='${!n.is_read ? 'rgba(200,169,110,0.04)' : 'transparent'}'">
              <div style="font-size:22px;flex-shrink:0">
                ${n.type === 'danger' ? '🚨' : n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}
              </div>
              <div style="flex:1">
                <div style="font-weight:${!n.is_read ? '700' : '500'};color:${!n.is_read ? 'var(--text-primary)' : 'var(--text-secondary)'}">
                  ${n.title}
                  ${!n.is_read ? '<span class="badge badge-danger" style="margin-right:8px;font-size:10px">جديد</span>' : ''}
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${n.message}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${formatDate(n.created_at)}</div>
              </div>
            </div>
          `).join('')}
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

async function markNotifRead(id) {
  await api.markNotificationRead(id);
  loadNotifications();
  renderNotifications();
}

async function markAllRead() {
  const notifs = await api.notifications();
  for (const n of notifs) {
    if (!n.is_read) await api.markNotificationRead(n.id);
  }
  loadNotifications();
  renderNotifications();
}
