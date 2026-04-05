// ============================================
// Main App Controller
// ============================================

// ===== معالج الأخطاء العام =====
window.onerror = function(msg, src, line, col, err) {
  console.error('خطأ في النظام:', msg, 'في', src, 'سطر', line);
  showToast('حدث خطأ غير متوقع — تم تسجيله تلقائياً', 'error');
  const errors = JSON.parse(localStorage.getItem('_errorLog') || '[]');
  errors.unshift({
    msg, src, line,
    stack: err?.stack,
    time:  new Date().toISOString()
  });
  localStorage.setItem('_errorLog', JSON.stringify(errors.slice(0, 50)));
  return true;
};

window.addEventListener('unhandledrejection', e => {
  console.error('خطأ في Promise:', e.reason);
  showToast('حدث خطأ في العملية — يرجى المحاولة مرة أخرى', 'error');
  e.preventDefault();
});

let currentUser = null;

// ===== تشفير التوكن بـ XOR =====
// يُشتق مفتاح التشفير من بيانات المتصفح لتعزيز الأمان
function _xorKey() {
  const raw = (navigator.userAgent || '') + (screen.width || 0);
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36) || 'k';
}

// تشفير التوكن قبل تخزينه
function _encToken(t) {
  const k = _xorKey();
  let r = '';
  for (let i = 0; i < t.length; i++) {
    r += String.fromCharCode(t.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  try { return btoa(unescape(encodeURIComponent(r))); } catch { return btoa(r); }
}

// فك تشفير التوكن عند القراءة
function _decToken(e) {
  try {
    const raw = decodeURIComponent(escape(atob(e)));
    const k = _xorKey();
    let t = '';
    for (let i = 0; i < raw.length; i++) {
      t += String.fromCharCode(raw.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return t;
  } catch { return null; }
}

// حفظ التوكن بشكل مشفر (دالة موحدة)
function saveToken(token) {
  const encrypted = token.split('').map((c, i) => {
    const k = _key();
    return String.fromCharCode(
      c.charCodeAt(0) ^ k.charCodeAt(i % k.length)
    );
  }).join('').split('').map(c =>
    c.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('');

  sessionStorage.setItem(_TK, JSON.stringify({
    t:    encrypted,
    exp:  Date.now() + _TOKEN_EXPIRY_MS,
    last: Date.now()
  }));
  // حذف أي نسخة قديمة غير مشفرة
  localStorage.removeItem('marble_token');
  sessionStorage.removeItem('marble_token');
  sessionStorage.removeItem('marble_token_ts');
}

// ===== مؤقت عدم النشاط (تسجيل خروج تلقائي بعد 8 ساعات) =====
const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000; // 8 ساعات بالميلي ثانية

function _resetActivityTimer() {
  sessionStorage.setItem('marble_last_activity', Date.now());
}

function _checkInactivity() {
  // لا تتحقق إذا كان المستخدم غير مسجل الدخول
  if (!currentUser) return;
  const last = parseInt(sessionStorage.getItem('marble_last_activity') || '0');
  if (last && (Date.now() - last) > INACTIVITY_LIMIT) {
    doLogout();
    // عرض رسالة بعد تحديث الواجهة
    setTimeout(() => {
      const errEl = document.getElementById('login-error');
      if (errEl) errEl.textContent = 'تم تسجيل الخروج تلقائياً بسبب عدم النشاط لمدة 8 ساعات';
    }, 100);
  }
}

// إعادة ضبط المؤقت عند أي تفاعل من المستخدم
document.addEventListener('click',    _resetActivityTimer, { passive: true });
document.addEventListener('keypress', _resetActivityTimer, { passive: true });

// فحص عدم النشاط كل دقيقة
setInterval(_checkInactivity, 60000);

// ===== أمان التوكن المحسّن =====
const _TK = '_xt';
const _TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 ساعات
const _key = () => (navigator.userAgent.length * 7 + screen.width).toString(16);

// حفظ التوكن مشفراً مع بيانات انتهاء الصلاحية — انظر دالة saveToken الموحدة أعلاه

// قراءة التوكن مع التحقق من الصلاحية
function getToken() {
  try {
    const raw = sessionStorage.getItem(_TK);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Date.now() > p.exp ||
        Date.now() - p.last > _TOKEN_EXPIRY_MS) {
      sessionStorage.removeItem(_TK);
      showToast('انتهت جلستك — يرجى تسجيل الدخول مجدداً', 'warning');
      return null;
    }
    p.last = Date.now();
    sessionStorage.setItem(_TK, JSON.stringify(p));
    const k = _key();
    return p.t.match(/.{2}/g)
      .map(h => String.fromCharCode(parseInt(h, 16)))
      .map((c, i) => String.fromCharCode(
        c.charCodeAt(0) ^ k.charCodeAt(i % k.length)
      )).join('');
  } catch { return null; }
}

// تحديث النشاط عند أي تفاعل مستخدم (بحد أقصى مرة في الدقيقة)
let _lastActivityUpdate = 0;
['click', 'keypress', 'touchstart'].forEach(ev => {
  document.addEventListener(ev, () => {
    const now = Date.now();
    if (now - _lastActivityUpdate < 60000) return;
    _lastActivityUpdate = now;
    const raw = sessionStorage.getItem(_TK);
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      p.last = now;
      sessionStorage.setItem(_TK, JSON.stringify(p));
    } catch {}
  }, { passive: true });
});

// ===== حد محاولات تسجيل الدخول =====
const LOGIN_RATE_LIMIT = {
  max: 5,
  window: 15 * 60 * 1000,
  key: 'marble_login_attempts',
  checkAndRecord() {
    const now = Date.now();
    const data = JSON.parse(sessionStorage.getItem(this.key) || '{"attempts":[],"blocked_until":0}');
    if (data.blocked_until > now) {
      const mins = Math.ceil((data.blocked_until - now) / 60000);
      throw new Error(`تم تجميد الحساب مؤقتاً. حاول مرة أخرى بعد ${mins} دقيقة`);
    }
    data.attempts = data.attempts.filter(t => now - t < this.window);
    if (data.attempts.length >= this.max) {
      data.blocked_until = now + this.window;
      sessionStorage.setItem(this.key, JSON.stringify(data));
      throw new Error('تم تجميد الحساب مؤقتاً بسبب كثرة المحاولات الفاشلة. حاول بعد 15 دقيقة');
    }
    data.attempts.push(now);
    sessionStorage.setItem(this.key, JSON.stringify(data));
  },
  reset() { sessionStorage.removeItem(this.key); }
};

// تنظيف المدخلات — مُعرَّف في api.js ويمكن استخدامه هنا مباشرة
// (sanitize مُعرَّف بالفعل في api.js الذي يُحمَّل أولاً)

// نافذة تأكيد قبل الحذف
function confirmDelete(message = 'هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه العملية.') {
  return confirm(message);
}

// ===== ROLE-BASED ACCESS =====
const ROLE_PAGES = {
  'مدير عام':        null, // null = all pages visible
  'مدير':            null,
  'محاسب':           ['dashboard', 'journal', 'accounts', 'trial-balance', 'payments', 'expenses', 'report-pl', 'report-bs', 'report-waste', 'report-inventory', 'cost-centers', 'checks', 'year-closing', 'recurring-entries', 'settings', 'notifications'],
  'موظف مبيعات':    ['dashboard', 'export', 'customers', 'crm', 'quotations', 'sales', 'notifications', 'slab-tracker'],
  'مدير مبيعات':    ['dashboard', 'export', 'customers', 'crm', 'quotations', 'sales', 'payments', 'report-pl', 'report-customer-credit', 'notifications', 'slab-tracker'],
  'موظف مشتريات':  ['dashboard', 'purchases', 'suppliers', 'blocks', 'slabs', 'payments', 'notifications', 'slab-tracker'],
  'موظف تصنيع':    ['dashboard', 'blocks', 'cutting', 'slabs', 'quality', 'manufacturing', 'notifications', 'slab-tracker'],
  'مدير تصنيع':    ['dashboard', 'blocks', 'cutting', 'slabs', 'quality', 'manufacturing', 'cost-centers', 'report-inventory', 'notifications', 'slab-tracker'],
  'مشرف تصنيع':    ['dashboard', 'blocks', 'cutting', 'slabs', 'quality', 'manufacturing', 'notifications', 'slab-tracker'],
  'موظف لوجستيك':  ['dashboard', 'export', 'warehouses', 'shipments', 'shipment-report', 'notifications', 'slab-tracker'],
  'مدير قسم':       ['dashboard', 'employees', 'activity-log', 'sales', 'customers', 'crm', 'export', 'report-pl', 'sales-performance', 'commissions', 'notifications', 'slab-tracker'],
  'موظف عادي':      ['dashboard', 'notifications'],
};

// ===== AUTH =====
async function doLogin() {
  const email    = sanitize(document.getElementById('login-email').value.trim());
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  try {
    LOGIN_RATE_LIMIT.checkAndRecord();
    const data = await api.login(email, password);
    LOGIN_RATE_LIMIT.reset();
    // حفظ التوكن بشكل مشفر وتسجيل وقت آخر نشاط
    api.token = data.token;
    saveToken(data.token);
    _resetActivityTimer();
    currentUser = data.user;
    sessionStorage.setItem('marble_user', JSON.stringify(data.user));
    api.logActivity('login', 'auth', data.user.id, `تسجيل دخول: ${data.user.name} (${data.user.role})`);
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
    if (data.must_change_password) {
      setTimeout(() => showForceChangePassword(), 500);
    }
  } catch (e) {
    errEl.textContent = e.message || 'بيانات الدخول خاطئة';
  }
}

function doLogout() {
  api.clearToken();
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

// ===== INIT =====
async function initApp() {
  // فحص سلامة بيانات localStorage عند بدء التطبيق
  checkDataIntegrity();

  // Set user info in UI
  const name = currentUser?.name || 'مستخدم';
  const role = currentUser?.role || '';
  document.getElementById('user-name-top').textContent = name;
  document.getElementById('user-role-sidebar').textContent = role;
  
  // Load settings
  try {
    const s = await api.settings();
    if (s.company_name) document.getElementById('company-name-sidebar').textContent = s.company_name;
  } catch(e) {}

  // Apply role-based sidebar
  filterSidebarByRole();

  // تطبيق صلاحية عرض التكاليف بناءً على الدور
  applyCostVisibility();

  // Check for delayed shipments and create notifications
  checkDelayedShipments();

  // Load notifications
  loadNotifications();
  setInterval(loadNotifications, 60000);

  // فحص النسخ الاحتياطي التلقائي
  autoBackupCheck();

  // فحص القيود المتكررة بعد تسجيل الدخول الناجح
  if (typeof checkRecurringEntries === 'function') checkRecurringEntries();

  // فحص التنبيهات الذكية عند تسجيل الدخول وكل 30 دقيقة
  setTimeout(checkAllAlerts, 2000);
  setInterval(checkAllAlerts, 30 * 60 * 1000);

  // Show dashboard
  showPage('dashboard');
  initMobileMenu();
  convertTablesToCards();
}

async function checkDelayedShipments() {
  try {
    const r = await api.reportShipments();
    if (r.delayed && r.delayed.length > 0) {
      const existingNotifs = await api.notifications();
      r.delayed.forEach(s => {
        const alreadyNotified = existingNotifs.some(n => n.message && n.message.includes(s.shipment_number) && n.title === 'شحنة متأخرة');
        if (!alreadyNotified) {
          DB.save('notifications', {
            id: DB.nextId('notifications'),
            title: 'شحنة متأخرة',
            message: `الشحنة ${s.shipment_number} (${s.customer}) متأخرة عن الموعد المتوقع`,
            type: 'danger',
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      });
    }
  } catch(e) {}
}

async function loadNotifications() {
  try {
    const notifs = await api.notifications();
    const unread = notifs.filter(n => !n.is_read).length;
    document.getElementById('notif-count').textContent = unread;
  } catch(e) {}
}

// فحص النسخ الاحتياطية وتذكير المستخدم
function autoBackupCheck() {
  const last = localStorage.getItem('_lastBackup');
  // احسب المدة منذ آخر نسخة بالساعات
  const hoursSinceLast = last
    ? Math.floor((Date.now() - Date.parse(last)) / 3600000)
    : Infinity;

  // إذا مرّ أكثر من 24 ساعة منذ آخر نسخة → تذكير مع زر التصدير
  if (!last || hoursSinceLast > 24) {
    const msg = hoursSinceLast === Infinity
      ? 'لم يتم إنشاء نسخة احتياطية من قبل'
      : `لم يتم عمل نسخة احتياطية منذ ${hoursSinceLast} ساعة`;

    // عرض toast مع زر التصدير بعد ثانيتين من تحميل التطبيق
    setTimeout(() => {
      // إنشاء toast مخصص مع زر التصدير المباشر
      const el = document.createElement('div');
      el.className = 'toast warning';
      el.setAttribute('style',
        'display:flex;align-items:center;gap:10px;flex-wrap:wrap;max-width:380px'
      );
      el.innerHTML =
        '<span>⚠️ ' + msg + '</span>' +
        '<button onclick="exportBackup();this.closest(\'.toast\')?.remove()" ' +
          'style="background:#fff;color:#ba7517;border:none;padding:4px 10px;' +
                 'border-radius:6px;cursor:pointer;font-family:Cairo,sans-serif;' +
                 'font-size:12px;white-space:nowrap">' +
          'نسخ الآن' +
        '</button>';
      const container = document.getElementById('toast-container');
      if (container) {
        container.appendChild(el);
        setTimeout(() => el.remove(), 8000);
      }
    }, 2000);
  }
}

// ===== SIDEBAR ROLE FILTER =====
function filterSidebarByRole() {
  const role    = currentUser?.role || 'مدير';
  const allowed = ROLE_PAGES[role]; // null = admin sees all

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (allowed === null) {
      item.style.display = '';
    } else {
      item.style.display = allowed.includes(item.dataset.page) ? '' : 'none';
    }
  });

  // Hide section labels whose items are all hidden
  document.querySelectorAll('.nav-section-label').forEach(label => {
    let next = label.nextElementSibling;
    let anyVisible = false;
    while (next && !next.classList.contains('nav-section-label')) {
      if (next.classList.contains('nav-item') && next.style.display !== 'none') {
        anyVisible = true;
        break;
      }
      next = next.nextElementSibling;
    }
    label.style.display = anyVisible ? '' : 'none';
  });
}


// تبديل وضع النهار/الليل
function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme === 'dark' ? '' : 'light');
  localStorage.setItem('marble_theme', newTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
}

const pageTitles = {
  'dashboard':        'لوحة التحكم',
  'journal':          'القيود المحاسبية',
  'accounts':         'شجرة الحسابات',
  'trial-balance':    'ميزان المراجعة',
  'sales':            'فواتير المبيعات',
  'customers':        'العملاء',
  'aging':            'مديونية العملاء',
  'purchases':        'فواتير الشراء',
  'suppliers':        'الموردون',
  'payments':         'المدفوعات والمقبوضات',
  'blocks':           'الكتل الخام',
  'cutting':          'عمليات النشر',
  'slabs':            'الألواح',
  'products':         'المنتجات',
  'expenses':         'المصروفات',
  'report-pl':             'تقرير الأرباح والخسائر',
  'report-bs':             'الميزانية العمومية',
  'report-waste':          'تقرير الهالك',
  'report-inventory':      'تقرير المخزون',
  'report-cashflow':       'تقرير التدفقات النقدية',
  'report-cost-per-meter': 'تقرير تكلفة المتر المصنع',
  'report-export-profit':  'تقرير ربحية التصدير',
  'report-inv-movement':   'تقرير حركة المخزون',
  'report-customer-credit':'مديونية العملاء',
  'settings':         'الإعدادات',
  'employees':        'إدارة الموظفين',
  'activity-log':     'سجل الأنشطة',
  'warehouses':       'إدارة المستودعات',
  'shipments':        'الشحن والتوصيل',
  'shipment-report':  'تقارير التصدير',
  'quotations':       'عروض الأسعار',
  'cost-centers':       'مراكز التكلفة الفعلية',
  'export':             'نظام التصدير',
  'quality':            'إدارة الجودة',
  'crm':                'إدارة علاقات العملاء',
  'manufacturing':      'مراحل التصنيع',
  'checks':             'إدارة الشيكات',
  'year-closing':       'إغلاق السنة المالية',
  'recurring-entries':  'القيود المتكررة',
  'report-project-profit': 'تقرير ربحية المشاريع',
  'sales-performance': 'أداء المبيعات والسيلز',
  'commissions':       'إدارة العمولات',
  'commission-report': 'تقرير عمولات المبيعات',
  'slab-tracker':      'تتبع مسار اللوح',
};

// Track current page for real-time refresh
let _currentPage = 'dashboard';

function showPage(pageName) {
  // Access control: redirect to dashboard if user lacks permission
  const role    = currentUser?.role || 'مدير';
  const allowed = ROLE_PAGES[role];
  if (allowed !== null && pageName !== 'dashboard' && !allowed.includes(pageName)) {
    pageName = 'dashboard';
  }

  _currentPage = pageName;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageName);
  });

  // Update title
  document.getElementById('page-title').textContent = pageTitles[pageName] || pageName;

  // تحديث breadcrumb
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = pageTitles[pageName] || pageName;

  // Render page
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loader"></div>';

  const renders = {
    'dashboard':        renderDashboard,
    'journal':          renderJournal,
    'accounts':         renderAccounts,
    'trial-balance':    renderTrialBalance,
    'sales':            renderSales,
    'customers':        renderCustomers,
    'aging':            renderAging,
    'purchases':        renderPurchases,
    'suppliers':        renderSuppliers,
    'payments':         renderPayments,
    'blocks':           renderBlocks,
    'cutting':          renderCutting,
    'slabs':            renderSlabs,
    'products':         renderProducts,
    'expenses':         renderExpenses,
    'report-pl':             renderReportPL,
    'report-bs':             renderReportBS,
    'report-waste':          renderReportWaste,
    'report-inventory':      renderReportInventory,
    'report-cashflow':       renderReportCashFlow,
    'report-cost-per-meter': renderReportCostPerMeter,
    'report-export-profit':  renderReportExportProfit,
    'report-inv-movement':   renderReportInventoryMovement,
    'report-customer-credit':renderReportCustomerCredit,
    'settings':         renderSettings,
    'notifications':    renderNotifications,
    'employees':        renderEmployees,
    'activity-log':     renderActivityLog,
    'warehouses':       renderWarehouses,
    'shipments':        renderShipments,
    'shipment-report':  renderShipmentReport,
    'quotations':       renderQuotations,
    'cost-centers':     renderCostCenters,
    'export':           renderExport,
    'quality':          renderQuality,
    'crm':              renderCrm,
    'manufacturing':    renderManufacturing,
    'checks':           renderChecks,
    'year-closing':     renderYearClosing,
    'recurring-entries': renderRecurringEntries,
    'machines':         () => {},  // removed — kept as stub to avoid errors
    'report-project-profit': renderReportProjectProfit,
    'sales-performance': renderSalesPerformance,
    'commissions':       renderCommissions,
    'commission-report': renderCommissionReport,
    'slab-tracker':      renderSlabTracker,
  };

  if (renders[pageName]) {
    // تدمير المخططات النشطة قبل رسم الصفحة الجديدة لمنع تسرب الذاكرة
    _destroyActiveCharts();
    try { renders[pageName](); }
    catch(err) { console.error(err); showPageError(pageName, err.message); }
  }
  else content.innerHTML = `<div class="empty-state"><div class="empty-icon">🚧</div><h3>قريباً</h3></div>`;
  // انتظار انتهاء رسم الصفحة قبل تحويل الجداول
  setTimeout(convertTablesToCards, 350);
}

// ===== REAL-TIME REFRESH =====
// Debounced refresh: avoids rapid re-renders when multiple DB changes fire at once
let _refreshTimer = null;
function _scheduleRefresh() {
  clearTimeout(_refreshTimer);
  // احفظ الصفحة الحالية لحظة جدولة التحديث
  const _scheduledPage = _currentPage;
  _refreshTimer = setTimeout(() => {
    // Only refresh if the app is visible and user is logged in
    if (!document.getElementById('app').classList.contains('hidden') && currentUser) {
      // إلغاء التحديث إذا تغيّرت الصفحة منذ الجدولة
      if (_currentPage !== _scheduledPage) return;
      const renders = {
        'dashboard': renderDashboard, 'journal': renderJournal, 'accounts': renderAccounts,
        'trial-balance': renderTrialBalance, 'sales': renderSales, 'customers': renderCustomers,
        'aging': renderAging, 'purchases': renderPurchases, 'suppliers': renderSuppliers,
        'payments': renderPayments, 'blocks': renderBlocks, 'cutting': renderCutting,
        'slabs': renderSlabs, 'products': renderProducts, 'expenses': renderExpenses,
        'report-pl': renderReportPL, 'report-bs': renderReportBS, 'report-waste': renderReportWaste,
        'report-inventory': renderReportInventory,
        'report-cashflow': renderReportCashFlow, 'report-cost-per-meter': renderReportCostPerMeter,
        'report-export-profit': renderReportExportProfit, 'report-inv-movement': renderReportInventoryMovement,
        'report-customer-credit': renderReportCustomerCredit,
        'settings': renderSettings,
        'notifications': renderNotifications, 'employees': renderEmployees,
        'activity-log': renderActivityLog, 'warehouses': renderWarehouses,
        'shipments': renderShipments, 'shipment-report': renderShipmentReport,
        'quotations': renderQuotations,
        'cost-centers': renderCostCenters,
        'export': renderExport,
        'quality': renderQuality,
        'crm': renderCrm,
        'manufacturing': renderManufacturing,
        'checks': renderChecks,
        'year-closing': renderYearClosing,
        'recurring-entries': renderRecurringEntries,
        'machines': () => {},
        'slab-tracker': renderSlabTracker,
      };
      if (renders[_currentPage]) renders[_currentPage]();
      loadNotifications();
    }
  }, 500);
}

// ===== SIDEBAR =====
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    sidebar.classList.toggle('mobile-open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// ===== تهيئة قائمة الموبايل =====
function initMobileMenu() {
  const btn     = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!btn || !sidebar || btn.dataset.mobileMenuInit) return;
  btn.dataset.mobileMenuInit = 'true';

  btn.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('active', open);
    btn.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  if (overlay) {
    overlay.addEventListener('click', closeMobileMenu);
  }

  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) closeMobileMenu();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileMenu();
  });
}

function closeMobileMenu() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
  document.getElementById('hamburgerBtn')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ===== تحويل الجداول لبطاقات على الموبايل =====
function convertTablesToCards() {
  if (window.innerWidth >= 768) return;
  document.querySelectorAll('.data-table').forEach(table => {
    if (table.dataset.mobileConverted) return;
    const headers = [...table.querySelectorAll('thead th')]
                      .map(th => th.textContent.trim());
    const wrap = document.createElement('div');
    wrap.className = 'table-card-container';
    table.querySelectorAll('tbody tr').forEach(row => {
      const card = document.createElement('div');
      card.className = 'table-card';
      [...row.querySelectorAll('td')].forEach((cell, i) => {
        if (!headers[i]) return;
        const div = document.createElement('div');
        div.className = 'table-card-row';
        div.innerHTML =
          `<span class="table-card-label">${headers[i]}</span>` +
          `<span class="table-card-value">${cell.innerHTML}</span>`;
        card.appendChild(div);
      });
      wrap.appendChild(card);
    });
    table.insertAdjacentElement('afterend', wrap);
    table.dataset.mobileConverted = 'true';
  });
}

// ===== MODAL =====
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('global-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('global-modal').classList.remove('open');
}

// ===== TOAST =====
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// واجهة موحدة لعرض الإشعارات
function showToast(msg, type = 'success') { toast(msg, type); }

// ===== عرض خطأ تحميل الصفحة =====
function showPageError(pageName, msg) {
  const container = document.getElementById('page-content')
                 || document.getElementById('pageContainer')
                 || document.querySelector('.main-content');
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:60px 20px;direction:rtl">
      <div style="font-size:48px;margin-bottom:16px">⚠️</div>
      <h3 style="color:var(--text-primary);margin-bottom:8px">
        تعذر تحميل الصفحة
      </h3>
      <p style="color:var(--text-secondary);margin-bottom:24px">${msg}</p>
      <button class="btn btn-primary"
              onclick="showPage('${pageName}')">
        إعادة المحاولة
      </button>
    </div>`;
}

// formatMoney مُعرَّفة في utils.js — لا تكرارها هنا


function statusBadge(status) {
  const map = {
    'pending_approval': ['badge-warning', 'معلقة للموافقة'],
    'draft':      ['badge-warning', 'مسودة'],
    'sent':       ['badge-info',    'مرسلة'],
    'partial':    ['badge-warning', 'جزئي'],
    'paid':       ['badge-success', 'مسددة'],
    'cancelled':  ['badge-danger',  'ملغاة'],
    'rejected':   ['badge-danger',  'مرفوضة'],
    'active':     ['badge-success', 'نشط'],
    'completed':  ['badge-info',    'مكتمل'],
    'in_stock':   ['badge-success', 'في المخزن'],
    'sold':       ['badge-info',    'مباعة'],
    'waste':      ['badge-danger',  'هالك'],
    'processed':  ['badge-gold',    'مُصنَّع'],
    'in_cutting': ['badge-warning', 'في القطع'],
    'pending':    ['badge-warning', 'قيد التنفيذ'],
    'ready_to_ship': ['badge-info', 'مستعد للشحن'],
    'in_transit': ['badge-info',    'في الطريق'],
    'arrived':    ['badge-warning', 'وصل المخزن/العميل'],
    'delivered':  ['badge-success', 'تم التسليم'],
    'on_leave':   ['badge-warning', 'إجازة'],
    'resigned':   ['badge-danger',  'مستقيل'],
    'terminated': ['badge-danger',  'تم الفصل'],
  };
  const [cls, label] = map[status] || ['badge-info', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function tableLoader() {
  return '<div class="loader"></div>';
}

// Barcode generator (simple Code128-style visual)
function generateBarcodeHTML(code) {
  return `<div style="font-family:monospace;font-size:12px;letter-spacing:2px;padding:4px 8px;background:#fff;color:#000;border-radius:4px;display:inline-block;">
    ||||| ${code} |||||
  </div>`;
}

// ===== STARTUP =====
window.addEventListener('load', () => {
  // تحميل الثيم المحفوظ
  const savedTheme = localStorage.getItem('marble_theme');
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = '☀️';
  }

  // ===== فحص سلامة البيانات قبل تحميل التطبيق =====
  const corrupted = DB.validateIntegrity();
  if (corrupted.length > 0) {
    const appEl   = document.getElementById('app');
    const loginEl = document.getElementById('login-screen');
    if (appEl)   appEl.classList.add('hidden');
    if (loginEl) loginEl.classList.add('hidden');
    // عرض رسالة الخطأ مع زر إعادة الضبط
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg-primary,#1a1a1a);color:var(--text-primary,#fff);font-family:Cairo,sans-serif;direction:rtl;padding:32px;text-align:center;z-index:9999';
    errDiv.innerHTML = `
      <div style="font-size:48px;margin-bottom:16px">⚠️</div>
      <h2 style="font-size:22px;margin-bottom:12px;color:#e74c3c">تحذير: بيانات تالفة</h2>
      <p style="font-size:15px;color:#aaa;max-width:480px;margin-bottom:8px">
        تم اكتشاف تلف في بيانات التطبيق المحفوظة. قد يتعذر تشغيل النظام بشكل صحيح.
      </p>
      <p style="font-size:13px;color:#888;margin-bottom:24px">
        المفاتيح المتأثرة: <strong style="color:#e74c3c">${corrupted.join('، ')}</strong>
      </p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center">
        <button onclick="location.reload()" style="padding:10px 28px;background:#555;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-family:inherit">
          تجاهل والمتابعة
        </button>
        <button onclick="_confirmResetData()" style="padding:10px 28px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer;font-family:inherit">
          إعادة ضبط البيانات
        </button>
      </div>
    `;
    document.body.appendChild(errDiv);
    return; // إيقاف التحميل
  }

  // ===== التحقق من التوكن المشفر وانتهاء صلاحيته =====
  const token = getToken();
  const user  = sessionStorage.getItem('marble_user') || localStorage.getItem('marble_user');

  if (token && user) {
    api.token = token;
    currentUser = JSON.parse(user);
    // ترحيل إلى sessionStorage إن كانت البيانات في localStorage فقط
    if (!sessionStorage.getItem('marble_user')) sessionStorage.setItem('marble_user', user);
    _resetActivityTimer();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
  } else if (!token && sessionStorage.getItem(_TK) === null) {
    // تنظيف أي توكنات قديمة من الجلسات السابقة
    sessionStorage.removeItem('marble_token');
    sessionStorage.removeItem('marble_token_ts');
    sessionStorage.removeItem('marble_last_activity');
    localStorage.removeItem('marble_token');
    localStorage.removeItem('marble_user');
  }

  // ===== REAL-TIME SYNC (BroadcastChannel) =====
  // الاستماع لتغييرات قاعدة البيانات من التبويبات الأخرى وتحديث الصفحة
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const syncListener = new BroadcastChannel('marble_erp_sync');
      syncListener.onmessage = (e) => {
        if (e.data && e.data.type === 'db_change') {
          _scheduleRefresh();
        }
      };
    }
  } catch (_) {}

});

// إعادة ضبط جميع البيانات بعد تأكيد المستخدم
function _confirmResetData() {
  if (confirm('هل أنت متأكد من حذف جميع البيانات المحفوظة وإعادة البدء من الصفر؟ لا يمكن التراجع عن هذه العملية.')) {
    // حذف جميع مفاتيح التطبيق من localStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith('marble_'))
      .forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    location.reload();
  }
}

// ===== اختصارات لوحة المفاتيح =====
document.addEventListener('keydown', (e) => {
  // تسجيل الدخول بـ Enter
  if (e.key === 'Enter' && !document.getElementById('login-screen').classList.contains('hidden')) {
    doLogin();
    return;
  }

  // لا تفعّل الاختصارات داخل حقول الإدخال
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    if (e.key === 'Escape') closeModal();
    return;
  }

  if (document.getElementById('app').classList.contains('hidden')) return;

  // Escape: إغلاق Modal
  if (e.key === 'Escape') { closeModal(); return; }

  // Ctrl+F: بحث
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    const searchInput = document.querySelector('.filters-bar input[type="text"]');
    if (searchInput) { searchInput.focus(); searchInput.select(); }
    return;
  }

  // Ctrl+N: جديد
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    const newBtns = document.querySelectorAll('.page-header .btn-primary');
    if (newBtns.length) newBtns[newBtns.length - 1].click();
    return;
  }

  // Ctrl+S: حفظ
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    const modal = document.getElementById('global-modal');
    if (modal.classList.contains('open')) {
      const saveBtn = modal.querySelector('.btn-primary');
      if (saveBtn) saveBtn.click();
    }
    return;
  }
});

// ===== تحذير عند مغادرة الصفحة مع نماذج مفتوحة =====
window.addEventListener('beforeunload', (e) => {
  const modal = document.getElementById('global-modal');
  if (!modal || !modal.classList.contains('open')) return;
  const hasInput = [...modal.querySelectorAll('input, textarea, select')]
    .some(el => el.value && el.value.trim() !== '');
  if (hasInput) {
    e.preventDefault();
    e.returnValue = 'لديك بيانات غير محفوظة. هل أنت متأكد من المغادرة؟';
  }
});

// بناء skeleton loader للجداول
function tableSkeletonHTML(rows = 5, cols = 4) {
  const skeletonRows = Array(rows).fill(0).map(() => `
    <div class="skeleton-row">
      ${Array(cols).fill('<div class="skeleton"></div>').join('')}
    </div>
  `).join('');
  return `<div class="card" style="padding:0">${skeletonRows}</div>`;
}

// ===== ROLE HELPERS =====
function isManager() {
  const role = currentUser?.role || '';
  return ['مدير عام', 'مدير', 'مدير مبيعات', 'مدير قسم'].includes(role);
}

// ===== 1. صلاحية عرض التكاليف =====
// يعيد true فقط لأدوار: مدير عام، مدير، محاسب
function canViewCost() {
  const role = currentUser?.role || '';
  return ['مدير عام', 'مدير', 'محاسب'].includes(role);
}

// تطبيق صلاحية التكلفة عبر class على body
// body.no-cost-view .cost-sensitive-field { display:none }
function applyCostVisibility() {
  document.body.classList.toggle('no-cost-view', !canViewCost());
}

// ===== 12. البحث العالمي في شريط التنقل =====
function globalSearch(term) {
  const wrap = document.getElementById('globalSearchResults');
  if (!wrap) return;

  // إخفاء النتائج إذا كان البحث فارغاً
  if (!term || term.trim().length < 2) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';

  const q = term.trim().toLowerCase();
  const results = [];

  // بحث في العملاء
  DB.getAll('customers').forEach(c => {
    if ((c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)) {
      results.push({ cat: 'العملاء', icon: '👤', title: c.name, sub: c.phone || '', page: 'customers', id: c.id });
    }
  });

  // بحث في الفواتير
  DB.getAll('sales').forEach(s => {
    if ((s.invoice_number || '').toLowerCase().includes(q) || (s.customer || '').toLowerCase().includes(q)) {
      results.push({ cat: 'الفواتير', icon: '🧾', title: s.invoice_number, sub: s.customer + ' — ' + formatMoney(s.total_amount), page: 'sales', id: s.id });
    }
  });

  // بحث في الكتل الخام
  DB.getAll('blocks').forEach(b => {
    if ((b.code || '').toLowerCase().includes(q) || (b.type || '').toLowerCase().includes(q)) {
      results.push({ cat: 'الكتل الخام', icon: '🪨', title: b.code, sub: b.type + ' — ' + b.origin, page: 'blocks', id: b.id });
    }
  });

  // بحث في الألواح
  DB.getAll('slabs').forEach(s => {
    if ((s.code || '').toLowerCase().includes(q) || (s.type || '').toLowerCase().includes(q)) {
      results.push({ cat: 'الألواح', icon: '🔳', title: s.code, sub: s.type + ' — ' + (s.grade || ''), page: 'slabs', id: s.id });
    }
  });

  // بحث في الموظفين (إذا كان لديه صلاحية)
  if (['مدير عام', 'مدير', 'مدير قسم'].includes(currentUser?.role || '')) {
    DB.getAll('users').forEach(u => {
      if ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) {
        results.push({ cat: 'الموظفون', icon: '👥', title: u.name, sub: u.role + ' — ' + (u.email || ''), page: 'employees', id: u.id });
      }
    });
  }

  if (!results.length) {
    wrap.innerHTML = `<div class="search-no-results">لا توجد نتائج لـ "${term}"</div>`;
    return;
  }

  // تجميع النتائج حسب الفئة
  const groups = {};
  results.slice(0, 30).forEach(r => {
    if (!groups[r.cat]) groups[r.cat] = [];
    groups[r.cat].push(r);
  });

  let html = '';
  for (const [cat, items] of Object.entries(groups)) {
    html += `<div class="search-category">${cat}</div>`;
    items.forEach(item => {
      // تمييز النص المطابق بشكل آمن
      const safeTitle = sanitize ? sanitize(item.title) : item.title;
      const safeSub   = sanitize ? sanitize(item.sub)   : item.sub;
      const hlTitle = safeTitle.replace(
        new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
        '<span class="search-highlight">$1</span>'
      );
      // حفظ البيانات في data attributes لتجنب حقن الكود
      html += `<div class="search-result-item"
        data-page="${encodeURIComponent(item.page)}"
        data-id="${encodeURIComponent(String(item.id))}"
        style="cursor:pointer">
        <span class="sri-icon">${item.icon}</span>
        <div>
          <div class="sri-title">${hlTitle}</div>
          <div class="sri-sub">${safeSub}</div>
        </div>
      </div>`;
    });
  }
  wrap.innerHTML = html;

  // تسجيل أحداث النقر بعد رسم النتائج (event delegation آمن)
  wrap.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const page = decodeURIComponent(el.dataset.page || '');
      const id   = decodeURIComponent(el.dataset.id || '');
      closeGlobalSearch();
      if (page) navigateToEntity(page, id);
    });
  });
}

function closeGlobalSearch() {
  const wrap = document.getElementById('globalSearchResults');
  if (wrap) wrap.style.display = 'none';
  const inp = document.getElementById('globalSearchInput');
  if (inp) inp.value = '';
}

// ===== 5. التنبيهات الذكية =====
// يعمل عند تسجيل الدخول وكل 30 دقيقة
function checkAllAlerts() {
  const today  = new Date();
  const role   = currentUser?.role || '';
  const in7Days = new Date(today.getTime() + 7 * 86400000);
  const newNotifs = [];

  // 1. كتل لم يتم نشرها أكثر من 90 يوم
  if (['مدير عام', 'مدير', 'مدير تصنيع', 'موظف تصنيع', 'مشرف تصنيع'].includes(role)) {
    DB.getAll('blocks').forEach(b => {
      if (b.status === 'in_stock' && b.received_date) {
        const days = daysBetween(b.received_date);
        if (days > 90) {
          newNotifs.push({
            title: 'كتلة خام بدون نشر',
            message: `الكتلة ${b.code} (${b.type}) — في المخزن منذ ${days} يوم دون نشر`,
            type: 'warning',
          });
        }
      }
    });
  }

  // 2. ألواح لم تُباع أكثر من 180 يوم
  if (['مدير عام', 'مدير', 'موظف مبيعات', 'مدير مبيعات', 'مدير قسم'].includes(role)) {
    const cutting = DB.getAll('cutting');
    DB.getAll('slabs').forEach(s => {
      if (s.status === 'in_stock') {
        const batch = cutting.find(c => String(c.id) === String(s.cutting_id));
        const refDate = batch?.date;
        if (refDate && daysBetween(refDate) > 180) {
          newNotifs.push({
            title: 'لوح غير مباع',
            message: `اللوح ${s.code} (${s.type}) — في المخزن منذ ${daysBetween(refDate)} يوم`,
            type: 'warning',
          });
        }
      }
    });
  }

  // 3. قيود محاسبية مفقودة للفواتير
  if (['مدير عام', 'مدير', 'محاسب'].includes(role)) {
    const journalEntries = DB.getAll('journal_entries');
    const journalMain    = DB.getAll('journal');
    DB.getAll('sales').filter(s => s.status !== 'cancelled' && s.status !== 'draft').forEach(inv => {
      const hasEntry =
        journalEntries.some(j => (j.ref && j.ref === inv.invoice_number) ||
                                  (j.description && j.description.includes(inv.invoice_number))) ||
        journalMain.some(j => j.description && j.description.includes(inv.invoice_number));
      if (!hasEntry) {
        newNotifs.push({
          title: 'قيد محاسبي مفقود',
          message: `لا يوجد قيد محاسبي للفاتورة ${inv.invoice_number}`,
          type: 'danger',
        });
      }
    });
  }

  // 4. شيكات تستحق خلال 7 أيام
  if (['مدير عام', 'مدير', 'محاسب'].includes(role)) {
    DB.getAll('checks').forEach(chk => {
      if (chk.status !== 'pending' || !chk.dueDate) return;
      const due = new Date(chk.dueDate);
      if (!isNaN(due) && due >= today && due <= in7Days) {
        newNotifs.push({
          title: 'شيك يستحق قريباً',
          message: `${chk.partyName || ''} — ${formatCurrency(chk.amount)} — ${formatDate(chk.dueDate)}`,
          type: 'info',
        });
      }
    });
  }

  // 5. عملاء لم يتم التواصل معهم أكثر من 30 يوم
  if (['مدير عام', 'مدير', 'موظف مبيعات', 'مدير مبيعات', 'مدير قسم'].includes(role)) {
    const crmContacts = DB.getAll('crm_contacts') || [];
    const crmCustomers = DB.getAll('crm_customers') || [];
    crmCustomers.forEach(c => {
      const lastContact = crmContacts
        .filter(item => String(item.customer_id) === String(c.id))
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const refDate = lastContact?.date || c.created_at;
      if (refDate && daysBetween(refDate) > 30) {
        newNotifs.push({
          title: 'عميل بدون تواصل',
          message: `العميل ${c.name} — آخر تواصل منذ ${daysBetween(refDate)} يوم`,
          type: 'warning',
        });
      }
    });
  }

  // حفظ التنبيهات الجديدة (تجنب التكرار خلال 24 ساعة)
  const existing = DB.getAll('notifications');
  const cutoff   = new Date(today.getTime() - 24 * 3600000).toISOString();
  let added = false;
  newNotifs.forEach(n => {
    const alreadyExists = existing.some(e =>
      e.title === n.title &&
      e.message === n.message &&
      e.created_at > cutoff
    );
    if (!alreadyExists) {
      DB.save('notifications', {
        id:         DB.nextId('notifications'),
        title:      n.title,
        message:    n.message,
        type:       n.type,
        is_read:    false,
        created_at: new Date().toISOString(),
      });
      added = true;
    }
  });

  // تحديث عداد الإشعارات إذا أُضيف شيء جديد
  if (added) loadNotifications();
}

function currencyDropdown(id, selectedValue = 'EGP') {
  return `<select id="${id}">
    <option value="EGP" ${selectedValue === 'EGP' ? 'selected' : ''}>ج.م (EGP)</option>
    <option value="USD" ${selectedValue === 'USD' ? 'selected' : ''}>دولار (USD)</option>
  </select>`;
}

// ===== SHARED EXPORT UTILITIES =====

/**
 * Export table data as PDF using the browser's native print/PDF dialog.
 * This approach renders a proper HTML page with Cairo font which gives
 * perfect Arabic RTL support—far better than jsPDF alone.
 */
function exportGenericPDF({ title, subtitle, headers, rows, totalsRow, filename, orientation }) {
  if (!rows || !rows.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }

  const settings = DB.get('settings') || {};
  const companyName = settings.company_name || 'شركة الرخام والجرانيت';

  const tableRows = rows.map((row, rIdx) =>
    `<tr class="${rIdx % 2 === 0 ? 'even' : ''}">${row.map(cell => `<td>${cell === null || cell === undefined ? '-' : String(cell)}</td>`).join('')}</tr>`
  ).join('');

  const totalsHTML = totalsRow
    ? `<tr class="totals">${totalsRow.map(cell => `<td><strong>${cell === null || cell === undefined ? '' : String(cell)}</strong></td>`).join('')}</tr>`
    : '';

  const pageSize = orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Cairo','Arial',sans-serif;direction:rtl;color:#1a1a1a;background:#fff;padding:14mm 18mm}
    .report-header{text-align:center;margin-bottom:18px;border-bottom:3px solid #c8a96e;padding-bottom:14px}
    .report-header .company{font-size:13px;color:#555;font-weight:600;margin-bottom:6px}
    .report-header h1{font-size:20px;font-weight:900;color:#1a1a1a;margin-bottom:5px}
    .report-header .sub{font-size:12px;color:#666;margin-bottom:4px}
    .report-header .date{color:#999;font-size:11px}
    table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10.5px}
    th{background:#2c2c2c;color:#fff;padding:7px 9px;text-align:center;font-weight:700;border:1px solid #444}
    td{padding:6px 9px;text-align:center;border:1px solid #ddd;color:#333}
    tr.even td{background:#f8f7f5}
    tr.totals td{background:#2c2c2c;color:#c8a96e;font-size:11.5px;border-top:2px solid #c8a96e}
    .footer{margin-top:18px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px}
    @media print{@page{size:${pageSize};margin:12mm 16mm}body{padding:0}}
  </style>
</head>
<body>
  <div class="report-header">
    <div class="company">${companyName}</div>
    <h1>${title}</h1>
    ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
    <div class="date">تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}${totalsHTML}</tbody>
  </table>
  <div class="footer">${companyName} &mdash; نظام ERP للرخام والجرانيت</div>
  <script>
    document.fonts.ready.then(function(){setTimeout(function(){window.print();},300)});
  </scr` + `ipt>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) { toast('يرجى السماح بالنوافذ المنبثقة لتصدير PDF', 'error'); return; }
  win.document.write(html);
  win.document.close();
  toast('جاري فتح نافذة الطباعة — اختر "حفظ كـ PDF"', 'success');
}

function exportGenericExcel({ sheetName, headers, rows, totalsRow, filename }) {
  if (!rows || !rows.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('مكتبة Excel غير محملة', 'error'); return; }
  const data = [headers, ...rows];
  if (totalsRow) data.push(totalsRow);
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  // Auto-filter on header row
  ws['!autofilter'] = { ref: `A1:${String.fromCharCode(64 + headers.length)}1` };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'تقرير');
  XLSX.writeFile(wb, filename || `report-${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('تم تصدير Excel بنجاح', 'success');
}

// ===== PAGINATION HELPERS =====
const ROWS_PER_PAGE = 25;

/**
 * Returns a slice of `items` for the given 1-based `page`.
 */
function slicePage(items, page, pageSize = ROWS_PER_PAGE) {
  if (!Array.isArray(items)) return [];
  const size  = pageSize > 0 ? pageSize : ROWS_PER_PAGE;
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

/**
 * Renders a pagination bar HTML string.
 * @param {number} currentPage  1-based current page
 * @param {number} total        total number of items
 * @param {string} onClickFn    name of the JS function to call with the new page number
 * @param {number} [pageSize]   rows per page (default ROWS_PER_PAGE)
 */
function renderPaginationBar(currentPage, total, onClickFn, pageSize = ROWS_PER_PAGE) {
  const size       = pageSize > 0 ? pageSize : ROWS_PER_PAGE;
  const totalPages = Math.ceil(total / size);
  if (totalPages <= 1) return '';

  const MAX_BTNS = 5;
  let start = Math.max(1, currentPage - Math.floor(MAX_BTNS / 2));
  let end   = Math.min(totalPages, start + MAX_BTNS - 1);
  if (end - start < MAX_BTNS - 1) start = Math.max(1, end - MAX_BTNS + 1);

  const btns = [];
  if (currentPage > 1)          btns.push(`<button class="page-btn" onclick="${onClickFn}(${currentPage - 1})">&#8249;</button>`);
  for (let i = start; i <= end; i++) {
    btns.push(`<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="${onClickFn}(${i})">${i}</button>`);
  }
  if (currentPage < totalPages) btns.push(`<button class="page-btn" onclick="${onClickFn}(${currentPage + 1})">&#8250;</button>`);

  const from = (currentPage - 1) * size + 1;
  const to   = Math.min(currentPage * size, total);

  return `<div class="pagination-bar">
    <span class="pagination-info">${from}–${to} من ${total} سجل</span>
    <div class="pagination-btns">${btns.join('')}</div>
  </div>`;
}

/** Helper: update tbody + pagination bar in a table card */
function _updateTableWithPagination(tbodyId, rowsFn, data, page, renderFn) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = rowsFn(slicePage(data, page));
  const newPbHtml = renderPaginationBar(page, data.length, renderFn);
  const card = tbody ? tbody.closest('.card') : null;
  if (card) {
    const existing = card.querySelector('.pagination-bar');
    if (existing) {
      if (newPbHtml) existing.outerHTML = newPbHtml;
      else existing.remove();
    } else if (newPbHtml) {
      const tmp = document.createElement('div');
      tmp.innerHTML = newPbHtml;
      if (tmp.firstElementChild) card.appendChild(tmp.firstElementChild);
    }
  }
}

// ===== إجبار تغيير كلمة المرور =====
function showForceChangePassword() {
  openModal('يجب تغيير كلمة المرور', `
    <p style="color:var(--warning);margin-bottom:16px">لأسباب أمنية، يجب عليك تغيير كلمة المرور قبل المتابعة.</p>
    <div class="form-grid">
      <div class="form-group form-full">
        <label>كلمة المرور الجديدة *</label>
        <input type="password" id="fcp-new" placeholder="8 أحرف على الأقل">
      </div>
      <div class="form-group form-full">
        <label>تأكيد كلمة المرور *</label>
        <input type="password" id="fcp-confirm" placeholder="أعد كتابة كلمة المرور">
      </div>
    </div>
    <div id="fcp-error" style="color:var(--danger);font-size:13px;margin:8px 0"></div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="submitForceChangePassword()">تغيير كلمة المرور</button>
    </div>
  `);
  // منع إغلاق المودال بالضغط على overlay
  document.getElementById('modal-overlay').onclick = null;
}

async function submitForceChangePassword() {
  const newPass     = document.getElementById('fcp-new').value;
  const confirmPass = document.getElementById('fcp-confirm').value;
  const errEl       = document.getElementById('fcp-error');
  errEl.textContent = '';
  if (newPass.length < 8) { errEl.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'; return; }
  if (newPass !== confirmPass) { errEl.textContent = 'كلمتا المرور غير متطابقتين'; return; }
  try {
    const userId = currentUser.id;
    const users = DB.getAll('users');
    const user = users.find(u => u.id === userId);
    if (user) {
      user.password = await hashPassword(newPass);
      user.must_change_password = false;
      DB.save('users', user);
    }
    toast('تم تغيير كلمة المرور بنجاح', 'success');
    document.getElementById('modal-overlay').onclick = closeModal;
    closeModal();
  } catch(e) { errEl.textContent = e.message; }
}

// ===== روابط التنقل بين الصفحات =====
const _NAV_ALLOWED_PAGES = new Set([
  'dashboard', 'journal', 'accounts', 'trial-balance', 'sales', 'customers',
  'aging', 'purchases', 'suppliers', 'payments', 'blocks', 'cutting', 'slabs',
  'products', 'expenses', 'report-pl', 'report-bs', 'report-waste',
  'report-inventory', 'report-cashflow', 'report-cost-per-meter',
  'report-export-profit', 'report-inv-movement', 'report-customer-credit',
  'report-project-profit', 'settings', 'notifications', 'employees',
  'activity-log', 'warehouses', 'shipments', 'shipment-report', 'quotations',
  'cost-centers', 'export', 'quality', 'crm', 'manufacturing', 'checks',
  'year-closing', 'recurring-entries',
]);

function buildNavLink(text, page, id, cssClass) {
  if (!text || !page || !id) return text || '—';
  // تشفير النص لتجنب XSS
  const safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeId = parseInt(id) || 0;
  if (!safeId) return safe;
  // التحقق من القائمة البيضاء للصفحات المسموح بها
  if (!_NAV_ALLOWED_PAGES.has(page)) return safe;
  cssClass = cssClass || '';
  return '<a class="nav-ref ' + cssClass + '" onclick="navigateToEntity(\'' + page + '\',' + safeId + ')">' + safe + '</a>';
}

function navigateToEntity(page, id) {
  // التحقق من صحة اسم الصفحة — قائمة بيضاء للحماية
  const allowedPages = [
    'dashboard', 'sales', 'customers', 'purchases', 'suppliers',
    'payments', 'cutting', 'slabs', 'manufacturing', 'export',
    'logistics', 'shipments', 'reports', 'crm', 'journal',
    'employees', 'quality', 'cost-centers', 'settings', 'inventory'
  ];
  if (!allowedPages.includes(page)) return;

  // استخدم الدالة الموجودة للتنقل
  if (typeof showPage === 'function') showPage(page);
  else if (typeof navigateTo === 'function') navigateTo(page);
  else if (typeof loadPage === 'function') loadPage(page);

  setTimeout(() => {
    // محاولة فتح تفاصيل العنصر لو في دالة مخصصة
    const fn = window['openDetail_' + page];
    if (typeof fn === 'function') { fn(id); return; }
    // وإلا — ابحث عن الصف وميّزه
    const row = document.querySelector('[data-id="' + id + '"]') ||
                document.querySelector('[data-record-id="' + id + '"]');
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const orig = row.style.background;
    row.style.background = 'var(--primary-light, #e6f1fb)';
    row.style.transition  = 'background .5s';
    setTimeout(() => {
      row.style.background = orig;
    }, 2000);
  }, 400);
}
