// ============================================
// الوحدة 5 — نظام CRM كامل لإدارة علاقات العملاء
// رخام وجرانيت ERP
// ============================================

// ===== حالة التبويبات والفلترة =====
let _crmDebtFilter      = '';   // فلتر المديونية
let _crmLastDealFilter  = '';   // فلتر آخر تعامل
let _crmCityFilter      = '';   // فلتر المدينة
let _crmCardTab         = 'basic'; // التبويب النشط في بطاقة العميل
let _crmInteractionTypeFilter = ''; // فلتر نوع التفاعل

// ===== أيقونات أنواع التفاعل =====
const INTERACTION_ICONS = {
  call:         '📞',
  email:        '📧',
  visit:        '🚗',
  whatsapp:     '💬',
  complaint:    '⚠️',
  sample:       '🧪',
  quote_accept: '✅',
  payment:      '💰',
};

// ===== تسميات أنواع التفاعل =====
const INTERACTION_LABELS = {
  call:         'مكالمة هاتفية',
  email:        'بريد إلكتروني',
  visit:        'زيارة ميدانية',
  whatsapp:     'واتساب',
  complaint:    'شكوى',
  sample:       'طلب عينة',
  quote_accept: 'قبول عرض سعر',
  payment:      'تسديد دفعة',
};

// ===== تسميات حالات طلبات العينات =====
const SAMPLE_STATUS_LABELS = {
  pending:  'قيد الانتظار',
  sent:     'تم الإرسال',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

// ============================================
// الدوال المساعدة العالمية
// ============================================

// حساب الرصيد المستحق للعميل من الفواتير غير المسددة
function calcCustomerBalance(customerId) {
  return DB.getAll('sales')
    .filter(s => s.customer_id === customerId
              && s.status !== 'paid'
              && s.status !== 'cancelled')
    .reduce((sum, s) => sum + ((s.total_amount || 0) - (s.paid_amount || 0)), 0);
}

// التحقق من حد الائتمان قبل إضافة مبلغ جديد
function checkCreditLimit(customerId, newAmount) {
  const crmRec       = DB.getAll('crm_customers').find(c => c.id === customerId) || {};
  const creditLimit  = crmRec.creditLimit || 0;
  // إذا لم يُضبط حد ائتمان، يُسمح دائماً
  if (creditLimit <= 0) return { ok: true };
  const currentBalance = calcCustomerBalance(customerId);
  const available      = creditLimit - currentBalance;
  if (currentBalance + newAmount > creditLimit) {
    return { ok: false, limit: creditLimit, used: currentBalance, available };
  }
  return { ok: true, limit: creditLimit, used: currentBalance, available };
}

// إضافة تفاعل جديد لسجل عميل في CRM
function addCrmInteraction(customerId, interaction) {
  const all    = DB.getAll('crm_customers');
  let   record = all.find(c => c.id === customerId);
  if (!record) {
    // إنشاء سجل CRM جديد للعميل إن لم يكن موجوداً
    record = _buildEmptyCrmRecord(customerId);
  }
  const newInteraction = {
    id:        (record.interactions.length
                  ? Math.max(...record.interactions.map(i => i.id)) + 1
                  : 1),
    date:      interaction.date || new Date().toISOString().split('T')[0],
    type:      interaction.type      || 'call',
    summary:   interaction.summary   || '',
    createdBy: interaction.createdBy ?? (currentUser?.name ?? 'النظام'),
  };
  record.interactions.push(newInteraction);
  DB.save('crm_customers', record);
  return newInteraction;
}

// إرسال فاتورة بالبريد الإلكتروني عبر عميل mail الافتراضي
function emailInvoice(invoice, customer) {
  const subject = encodeURIComponent(
    `فاتورة رقم ${invoice.invoice_number} - شركة الرخام والجرانيت`
  );
  const body = encodeURIComponent(
    `عزيزي ${customer.name},\n\nمرفق فاتورة رقم ${invoice.invoice_number}` +
    ` بتاريخ ${invoice.invoice_date}\nالإجمالي: ${invoice.total_amount}\n\nشكراً لتعاملكم معنا.`
  );
  window.open(`mailto:${customer.email}?subject=${subject}&body=${body}`);
  // تسجيل التفاعل في سجل CRM تلقائياً
  addCrmInteraction(customer.id, {
    type:    'email',
    summary: `إرسال فاتورة ${invoice.invoice_number}`,
  });
  toast('تم فتح عميل البريد الإلكتروني', 'success');
}

// ============================================
// دوال داخلية مساعدة
// ============================================

// بناء سجل CRM فارغ لعميل جديد
function _buildEmptyCrmRecord(customerId) {
  return {
    id:               customerId,
    creditLimit:      0,
    paymentTermDays:  30,
    discountPct:      0,
    priceList:        'A',
    contacts:         [],
    interactions:     [],
    sampleRequests:   [],
  };
}

// جلب سجل CRM للعميل أو إنشاء واحد فارغ
function _getCrmRecord(customerId) {
  return DB.getAll('crm_customers').find(c => c.id === customerId)
    || _buildEmptyCrmRecord(customerId);
}

// حساب نسبة استخدام حد الائتمان
function _creditUsagePct(balance, limit) {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((balance / limit) * 100));
}

// لون شريط التقدم حسب نسبة الاستخدام
function _progressColor(pct) {
  if (pct >= 90) return 'var(--danger)';
  if (pct >= 70) return 'var(--warning)';
  return 'var(--success)';
}

// استخراج مدينة العميل من العنوان
function _extractCity(address) {
  if (!address) return '';
  return address.split('،')[0].split(',')[0].trim();
}

// تنسيق تاريخ آخر تفاعل للعميل
function _lastInteractionDate(crmRecord) {
  if (!crmRecord.interactions || !crmRecord.interactions.length) return null;
  const sorted = [...crmRecord.interactions].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );
  return sorted[0].date;
}

// badge حالة طلب العينة
function _sampleStatusBadge(status) {
  const map = {
    pending:  ['badge-warning', 'قيد الانتظار'],
    sent:     ['badge-info',    'تم الإرسال'],
    approved: ['badge-success', 'معتمد'],
    rejected: ['badge-danger',  'مرفوض'],
  };
  const [cls, label] = map[status] || ['badge-info', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ============================================
// الدالة الرئيسية — عرض صفحة CRM
// ============================================
async function renderCrm() {
  const content = document.getElementById('page-content');

  const customers    = DB.getAll('customers');
  const crmRecords   = DB.getAll('crm_customers');
  const allSales     = DB.getAll('sales');

  // ===== حساب KPI الإجمالية =====
  let countExceeded  = 0; // تجاوزوا حد الائتمان
  let countOverdue   = 0; // متأخرون في السداد
  let pendingSamples = 0; // طلبات عينات معلقة

  customers.forEach(c => {
    const crm     = crmRecords.find(r => r.id === c.id) || {};
    const balance = calcCustomerBalance(c.id);
    if (crm.creditLimit > 0 && balance > crm.creditLimit) countExceeded++;
    // التحقق من وجود فواتير متأخرة
    const hasOverdue = allSales.some(s =>
      s.customer_id === c.id
      && s.status !== 'paid'
      && s.status !== 'cancelled'
      && s.due_date
      && new Date(s.due_date) < new Date()
    );
    if (hasOverdue) countOverdue++;
    // حساب طلبات العينات المعلقة
    if (crm.sampleRequests) {
      pendingSamples += crm.sampleRequests.filter(sr => sr.status === 'pending').length;
    }
  });

  // ===== جمع قائمة المدن للفلتر =====
  const cities = [...new Set(
    customers.map(c => _extractCity(c.address)).filter(Boolean)
  )].sort();

  // ===== تطبيق الفلاتر على القائمة =====
  let filtered = customers.map(c => {
    const crm     = crmRecords.find(r => r.id === c.id) || _buildEmptyCrmRecord(c.id);
    const balance = calcCustomerBalance(c.id);
    return { ...c, _crm: crm, _balance: balance };
  });

  // فلتر المديونية
  if (_crmDebtFilter === 'exceeded') {
    filtered = filtered.filter(c =>
      c._crm.creditLimit > 0 && c._balance > c._crm.creditLimit
    );
  } else if (_crmDebtFilter === 'none') {
    filtered = filtered.filter(c => c._balance === 0);
  }

  // فلتر آخر تعامل
  if (_crmLastDealFilter) {
    const days = parseInt(_crmLastDealFilter);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    filtered = filtered.filter(c => {
      const lastDate = _lastInteractionDate(c._crm);
      if (!lastDate) return false;
      return new Date(lastDate) >= cutoff;
    });
  }

  // فلتر المدينة
  if (_crmCityFilter) {
    filtered = filtered.filter(c =>
      _extractCity(c.address) === _crmCityFilter
    );
  }

  content.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div>
        <h2>إدارة علاقات العملاء (CRM)</h2>
        <p>تتبع وإدارة علاقات العملاء وحدود الائتمان وسجلات التفاعل</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="openCrmSettingsModal()">⚙️ إعدادات CRM</button>
      </div>
    </div>

    <!-- بطاقات KPI -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">👥</div>
        <div class="kpi-body">
          <div class="kpi-label">إجمالي العملاء</div>
          <div class="kpi-value">${customers.length}</div>
        </div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-icon">🚨</div>
        <div class="kpi-body">
          <div class="kpi-label">تجاوزوا حد الائتمان</div>
          <div class="kpi-value">${countExceeded}</div>
        </div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-icon">⏰</div>
        <div class="kpi-body">
          <div class="kpi-label">متأخرون في السداد</div>
          <div class="kpi-value">${countOverdue}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🧪</div>
        <div class="kpi-body">
          <div class="kpi-label">طلبات عينات معلقة</div>
          <div class="kpi-value">${pendingSamples}</div>
        </div>
      </div>
    </div>

    <!-- شريط الفلاتر -->
    <div class="filters-bar">
      <select onchange="_crmDebtFilter=this.value;renderCrm()" style="min-width:160px">
        <option value=""        ${_crmDebtFilter===''         ?'selected':''}>كل العملاء</option>
        <option value="exceeded"${_crmDebtFilter==='exceeded' ?'selected':''}>تجاوز الحد الائتماني</option>
        <option value="none"    ${_crmDebtFilter==='none'     ?'selected':''}>لا مديونية</option>
      </select>
      <select onchange="_crmLastDealFilter=this.value;renderCrm()" style="min-width:180px">
        <option value=""   ${_crmLastDealFilter===''   ?'selected':''}>كل آخر تعامل</option>
        <option value="7"  ${_crmLastDealFilter==='7'  ?'selected':''}>آخر 7 أيام</option>
        <option value="30" ${_crmLastDealFilter==='30' ?'selected':''}>آخر 30 يوم</option>
        <option value="90" ${_crmLastDealFilter==='90' ?'selected':''}>آخر 3 أشهر</option>
      </select>
      <select onchange="_crmCityFilter=this.value;renderCrm()" style="min-width:140px">
        <option value="">كل المدن</option>
        ${cities.map(city =>
          `<option value="${city}" ${_crmCityFilter===city?'selected':''}>${city}</option>`
        ).join('')}
      </select>
    </div>

    <!-- جدول العملاء -->
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table id="crm-table">
          <thead>
            <tr>
              <th>اسم العميل</th>
              <th>الرصيد المستحق</th>
              <th>حد الائتمان</th>
              <th>المستخدم%</th>
              <th>آخر تعامل</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${_renderCrmTableRows(filtered)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ===== رسم صفوف جدول CRM =====
function _renderCrmTableRows(list) {
  if (!list.length) {
    return `<tr><td colspan="7">
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">👥</div>
        <h3>لا يوجد عملاء بهذه المعايير</h3>
      </div>
    </td></tr>`;
  }
  return list.map(c => {
    const crm         = c._crm;
    const balance     = c._balance;
    const creditLimit = crm.creditLimit || 0;
    const usagePct    = _creditUsagePct(balance, creditLimit);
    const exceeded    = creditLimit > 0 && balance > creditLimit;
    const lastDate    = _lastInteractionDate(crm);

    // تلوين الصف باللون الأحمر إذا تجاوز حد الائتمان
    const rowStyle = exceeded
      ? 'background:rgba(224,82,82,0.08);'
      : '';

    // بناء شريط التقدم المصغّر داخل الجدول
    const progressBar = creditLimit > 0
      ? `<div style="background:var(--border);border-radius:4px;height:6px;margin-top:4px;overflow:hidden">
           <div style="width:${usagePct}%;background:${_progressColor(usagePct)};height:100%;border-radius:4px"></div>
         </div>`
      : '';

    // badge حالة العميل
    let statusBadgeHTML;
    if (exceeded) {
      statusBadgeHTML = '<span class="badge badge-danger">تجاوز الحد</span>';
    } else if (balance > 0) {
      statusBadgeHTML = '<span class="badge badge-warning">مدين</span>';
    } else {
      statusBadgeHTML = '<span class="badge badge-success">سليم</span>';
    }

    return `
      <tr style="${rowStyle}">
        <td>
          <strong>${c.name}</strong>
          <div style="font-size:12px;color:var(--text-secondary)">${c.phone || ''}</div>
        </td>
        <td class="number ${balance > 0 ? 'text-danger' : ''}">${formatMoney(balance)}</td>
        <td class="number">${creditLimit > 0 ? formatMoney(creditLimit) : '<span style="color:var(--text-secondary)">—</span>'}</td>
        <td>
          ${creditLimit > 0
            ? `<span style="font-weight:600;color:${_progressColor(usagePct)}">${usagePct}%</span>${progressBar}`
            : '<span style="color:var(--text-secondary)">—</span>'}
        </td>
        <td>${lastDate ? formatDate(lastDate) : '<span style="color:var(--text-secondary)">—</span>'}</td>
        <td>${statusBadgeHTML}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="showCrmCard(${c.id})">👁 عرض البطاقة</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// بطاقة العميل الكاملة
// ============================================

// عرض بطاقة عميل داخل محتوى الصفحة
function showCrmCard(customerId) {
  const content  = document.getElementById('page-content');
  const customer = DB.getAll('customers').find(c => c.id === customerId);
  if (!customer) { toast('العميل غير موجود', 'error'); return; }

  const crm      = _getCrmRecord(customerId);
  const balance  = calcCustomerBalance(customerId);
  const limit    = crm.creditLimit || 0;
  const usagePct = _creditUsagePct(balance, limit);

  // إعادة تعيين التبويب الافتراضي
  _crmCardTab = 'basic';

  content.innerHTML = `
    <!-- زر العودة -->
    <div style="margin-bottom:16px">
      <button class="btn btn-secondary" onclick="renderCrm()">
        ← العودة للقائمة
      </button>
    </div>

    <!-- رأس بطاقة العميل -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
        <div>
          <h2 style="margin:0 0 4px">${customer.name}</h2>
          <div style="color:var(--text-secondary);font-size:14px">
            ${customer.phone || ''} ${customer.email ? `· ${customer.email}` : ''}
          </div>
          <div style="margin-top:8px">
            ${balance > 0
              ? `<span class="badge badge-danger">رصيد مستحق: ${formatMoney(balance)}</span>`
              : `<span class="badge badge-success">لا مديونية</span>`}
            ${limit > 0
              ? `<span class="badge badge-info" style="margin-right:6px">حد الائتمان: ${formatMoney(limit)}</span>`
              : ''}
          </div>
        </div>
        <!-- شريط تقدم حد الائتمان -->
        ${limit > 0 ? `
        <div style="min-width:220px;flex:1;max-width:300px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:4px">
            <span>استخدام الائتمان</span>
            <span style="font-weight:600;color:${_progressColor(usagePct)}">${usagePct}%</span>
          </div>
          <div style="background:var(--border);border-radius:8px;height:10px;overflow:hidden">
            <div style="width:${usagePct}%;background:${_progressColor(usagePct)};height:100%;border-radius:8px;transition:width 0.4s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary);margin-top:4px">
            <span>مستخدم: ${formatMoney(balance)}</span>
            <span>المتاح: ${formatMoney(Math.max(0, limit - balance))}</span>
          </div>
        </div>` : ''}
      </div>
    </div>

    <!-- شريط التبويبات -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg-card);overflow-x:auto">
        ${_buildCrmTabBtn('basic',        '📋 بيانات أساسية',     customerId)}
        ${_buildCrmTabBtn('contacts',     '👤 جهات الاتصال',      customerId)}
        ${_buildCrmTabBtn('interactions', '📅 سجل التفاعلات',     customerId)}
        ${_buildCrmTabBtn('invoices',     '🧾 الفواتير',           customerId)}
        ${_buildCrmTabBtn('samples',      '🧪 طلبات العينات',     customerId)}
      </div>
      <div id="crm-card-tab-content" style="padding:20px">
        ${_renderCrmCardTab(_crmCardTab, customerId, customer, crm)}
      </div>
    </div>
  `;
}

// ===== بناء زر التبويب في بطاقة العميل =====
function _buildCrmTabBtn(name, label, customerId) {
  const active = _crmCardTab === name;
  return `
    <button
      onclick="_crmCardTab='${name}';_switchCrmCardTab(${customerId})"
      style="padding:12px 18px;border:none;background:${active ? 'var(--accent)' : 'transparent'};
             color:${active ? '#fff' : 'var(--text-secondary)'};cursor:pointer;white-space:nowrap;
             font-size:13px;font-family:inherit;border-bottom:2px solid ${active ? 'var(--accent)' : 'transparent'};
             transition:all 0.2s">
      ${label}
    </button>
  `;
}

// ===== تبديل تبويب بطاقة العميل دون إعادة رسم الصفحة بالكامل =====
function _switchCrmCardTab(customerId) {
  const customer = DB.getAll('customers').find(c => c.id === customerId);
  if (!customer) return;
  const crm = _getCrmRecord(customerId);

  // تحديث أزرار التبويبات
  const tabBar = document.querySelector('#crm-card-tab-content')
    ?.parentElement?.previousElementSibling;
  if (tabBar) {
    tabBar.innerHTML = `
      ${_buildCrmTabBtn('basic',        '📋 بيانات أساسية',     customerId)}
      ${_buildCrmTabBtn('contacts',     '👤 جهات الاتصال',      customerId)}
      ${_buildCrmTabBtn('interactions', '📅 سجل التفاعلات',     customerId)}
      ${_buildCrmTabBtn('invoices',     '🧾 الفواتير',           customerId)}
      ${_buildCrmTabBtn('samples',      '🧪 طلبات العينات',     customerId)}
    `;
  }

  const tabContent = document.getElementById('crm-card-tab-content');
  if (tabContent) {
    tabContent.innerHTML = _renderCrmCardTab(_crmCardTab, customerId, customer, crm);
  }
}

// ===== اختيار محتوى التبويب المناسب =====
function _renderCrmCardTab(tab, customerId, customer, crm) {
  switch (tab) {
    case 'basic':        return _renderTabBasic(customer, crm, customerId);
    case 'contacts':     return _renderTabContacts(crm, customerId);
    case 'interactions': return _renderTabInteractions(crm, customerId);
    case 'invoices':     return _renderTabInvoices(customerId, customer);
    case 'samples':      return _renderTabSamples(crm, customerId);
    default:             return '';
  }
}

// ============================================
// تبويب: البيانات الأساسية
// ============================================
function _renderTabBasic(customer, crm, customerId) {
  // حساب إحصائيات المبيعات للعميل
  const allOrders = DB.getAll('export_orders') || [];
  const custOrders = allOrders.filter(o => o.customerId === customerId || String(o.customerId) === String(customerId));
  const completedOrders = custOrders.filter(o => o.status === 'delivered' || o.status === 'paid');
  const totalSales = custOrders.reduce((sum, o) => sum + (parseFloat(o.totalRevenue) || 0), 0);
  const avgOrderValue = completedOrders.length > 0 ? (totalSales / completedOrders.length) : 0;

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
      <!-- بيانات العميل الأساسية -->
      <div>
        <h4 style="margin:0 0 12px;color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px">
          بيانات العميل
        </h4>
        <table style="width:100%;border-collapse:collapse">
          ${_infoRow('الاسم',     customer.name)}
          ${_infoRow('الهاتف',    customer.phone    || '—')}
          ${_infoRow('البريد',    customer.email    || '—')}
          ${_infoRow('العنوان',   customer.address  || '—')}
          ${_infoRow('البلد',     customer.country  || '—')}
          ${_infoRow('نوع العميل', customer.customerType || '—')}
          ${_infoRow('العملة المفضلة', customer.preferredCurrency || '—')}
        </table>
      </div>
      <!-- بيانات CRM -->
      <div>
        <h4 style="margin:0 0 12px;color:var(--text-secondary);font-size:12px;text-transform:uppercase;letter-spacing:1px">
          إعدادات CRM
        </h4>
        <table style="width:100%;border-collapse:collapse">
          ${_infoRow('حد الائتمان',    crm.creditLimit    ? formatMoney(crm.creditLimit) : '—')}
          ${_infoRow('مهلة السداد',    crm.paymentTermDays ? crm.paymentTermDays + ' يوم' : '—')}
          ${_infoRow('نسبة الخصم',    crm.discountPct     ? crm.discountPct + '%' : '—')}
          ${_infoRow('قائمة الأسعار', crm.priceList       ? 'قائمة ' + crm.priceList : '—')}
        </table>
      </div>
    </div>

    <!-- إحصائيات المبيعات -->
    <div class="kpi-grid" style="margin-bottom:16px;grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">
      <div class="kpi-card">
        <div class="kpi-icon">📋</div>
        <div class="kpi-body">
          <div class="kpi-label">إجمالي أوامر التصدير</div>
          <div class="kpi-value">${custOrders.length}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">✅</div>
        <div class="kpi-body">
          <div class="kpi-label">الأوامر المنجزة</div>
          <div class="kpi-value">${completedOrders.length}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <div class="kpi-body">
          <div class="kpi-label">إجمالي المبيعات</div>
          <div class="kpi-value" style="font-size:16px">${formatMoney(totalSales)}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📊</div>
        <div class="kpi-body">
          <div class="kpi-label">متوسط قيمة الأمر</div>
          <div class="kpi-value" style="font-size:16px">${formatMoney(avgOrderValue)}</div>
        </div>
      </div>
      ${crm.lastExportOrderDate ? `
      <div class="kpi-card">
        <div class="kpi-icon">📅</div>
        <div class="kpi-body">
          <div class="kpi-label">آخر أمر تصدير</div>
          <div class="kpi-value" style="font-size:14px">${formatDate(crm.lastExportOrderDate)}</div>
        </div>
      </div>` : ''}
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="openEditCrmBasicModal(${customerId})">
        ✏️ تعديل البيانات
      </button>
    </div>
  `;
}

// ===== صف معلومة مفردة =====
function _infoRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;color:var(--text-secondary);font-size:13px;width:40%">${label}</td>
      <td style="padding:8px 0;font-weight:500">${value}</td>
    </tr>
  `;
}

// ===== نافذة تعديل البيانات الأساسية =====
function openEditCrmBasicModal(customerId) {
  const customer = DB.getAll('customers').find(c => c.id === customerId);
  if (!customer) return;
  const crm = _getCrmRecord(customerId);

  openModal(`تعديل بيانات العميل — ${customer.name}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group">
        <label>الاسم *</label>
        <input type="text" id="edit-cust-name" value="${customer.name || ''}">
      </div>
      <div class="form-group">
        <label>الهاتف</label>
        <input type="text" id="edit-cust-phone" value="${customer.phone || ''}">
      </div>
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <input type="email" id="edit-cust-email" value="${customer.email || ''}">
      </div>
      <div class="form-group">
        <label>العنوان</label>
        <input type="text" id="edit-cust-address" value="${customer.address || ''}">
      </div>
    </div>
    <hr style="margin:16px 0;border-color:var(--border)">
    <h4 style="margin:0 0 12px">إعدادات CRM</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group">
        <label>حد الائتمان (EGP)</label>
        <input type="number" id="edit-crm-limit" value="${crm.creditLimit || 0}" min="0">
      </div>
      <div class="form-group">
        <label>مهلة السداد (أيام)</label>
        <input type="number" id="edit-crm-days" value="${crm.paymentTermDays || 30}" min="0">
      </div>
      <div class="form-group">
        <label>نسبة الخصم %</label>
        <input type="number" id="edit-crm-discount" value="${crm.discountPct || 0}" min="0" max="100" step="0.1">
      </div>
      <div class="form-group">
        <label>قائمة الأسعار</label>
        <select id="edit-crm-pricelist">
          <option value="A" ${crm.priceList==='A'?'selected':''}>قائمة A — أساسية</option>
          <option value="B" ${crm.priceList==='B'?'selected':''}>قائمة B — مميزة</option>
          <option value="C" ${crm.priceList==='C'?'selected':''}>قائمة C — خاصة</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="_saveBasicCrmData(${customerId})">💾 حفظ التغييرات</button>
    </div>
  `);
}

// ===== حفظ تعديلات البيانات الأساسية =====
function _saveBasicCrmData(customerId) {
  const name    = document.getElementById('edit-cust-name').value.trim();
  if (!name) { toast('الاسم مطلوب', 'error'); return; }

  // تحديث بيانات العميل الأساسية
  const customer = DB.getAll('customers').find(c => c.id === customerId);
  if (customer) {
    DB.save('customers', {
      ...customer,
      name:    sanitize(name),
      phone:   sanitize(document.getElementById('edit-cust-phone').value.trim()),
      email:   sanitize(document.getElementById('edit-cust-email').value.trim()),
      address: sanitize(document.getElementById('edit-cust-address').value.trim()),
    });
  }

  // تحديث أو إنشاء سجل CRM
  const crm = _getCrmRecord(customerId);
  DB.save('crm_customers', {
    ...crm,
    id:              customerId,
    creditLimit:     parseFloat(document.getElementById('edit-crm-limit').value)    || 0,
    paymentTermDays: parseInt(document.getElementById('edit-crm-days').value)        || 30,
    discountPct:     parseFloat(document.getElementById('edit-crm-discount').value) || 0,
    priceList:       document.getElementById('edit-crm-pricelist').value,
  });

  closeModal();
  toast('تم حفظ البيانات بنجاح', 'success');
  showCrmCard(customerId);
}

// ============================================
// تبويب: جهات الاتصال
// ============================================
function _renderTabContacts(crm, customerId) {
  const contacts = crm.contacts || [];
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h4 style="margin:0">جهات الاتصال (${contacts.length})</h4>
      <button class="btn btn-primary btn-sm" onclick="openAddContactModal(${customerId})">
        ＋ إضافة جهة اتصال
      </button>
    </div>
    ${contacts.length === 0
      ? `<div class="empty-state" style="padding:30px">
           <div class="empty-icon">👤</div>
           <h3>لا توجد جهات اتصال مضافة</h3>
         </div>`
      : `<div class="data-table-wrapper">
           <table>
             <thead>
               <tr>
                 <th>الاسم</th>
                 <th>الدور</th>
                 <th>الهاتف</th>
                 <th>البريد الإلكتروني</th>
                 <th>واتساب</th>
                 <th>إجراءات</th>
               </tr>
             </thead>
             <tbody>
               ${contacts.map((ct, idx) => `
                 <tr>
                   <td><strong>${ct.name}</strong></td>
                   <td>${ct.role || '—'}</td>
                   <td>${ct.phone  ? `<a href="tel:${ct.phone}" style="color:var(--accent)">${ct.phone}</a>` : '—'}</td>
                   <td>${ct.email  ? `<a href="mailto:${ct.email}" style="color:var(--accent)">${ct.email}</a>` : '—'}</td>
                   <td>${ct.whatsapp
                     ? `<a href="https://wa.me/${ct.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:#25D366">💬 ${ct.whatsapp}</a>`
                     : '—'}</td>
                   <td style="display:flex;gap:4px">
                     <button class="btn btn-secondary btn-sm" onclick="openEditContactModal(${customerId},${idx})">تعديل</button>
                     <button class="btn btn-danger btn-sm" onclick="_deleteContact(${customerId},${idx})">حذف</button>
                   </td>
                 </tr>
               `).join('')}
             </tbody>
           </table>
         </div>`
    }
  `;
}

// ===== نافذة إضافة جهة اتصال =====
function openAddContactModal(customerId) {
  openModal('إضافة جهة اتصال', _contactFormHTML(customerId, null, null));
}

// ===== نافذة تعديل جهة اتصال =====
function openEditContactModal(customerId, idx) {
  const crm = _getCrmRecord(customerId);
  const ct  = crm.contacts[idx];
  if (!ct) return;
  openModal('تعديل جهة اتصال', _contactFormHTML(customerId, idx, ct));
}

// ===== نموذج إضافة / تعديل جهة اتصال =====
function _contactFormHTML(customerId, idx, ct) {
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group">
        <label>الاسم *</label>
        <input type="text" id="ct-name" value="${ct?.name || ''}">
      </div>
      <div class="form-group">
        <label>الدور / المنصب</label>
        <input type="text" id="ct-role" value="${ct?.role || ''}" placeholder="مدير المشتريات">
      </div>
      <div class="form-group">
        <label>رقم الهاتف</label>
        <input type="text" id="ct-phone" value="${ct?.phone || ''}">
      </div>
      <div class="form-group">
        <label>البريد الإلكتروني</label>
        <input type="email" id="ct-email" value="${ct?.email || ''}">
      </div>
      <div class="form-group">
        <label>رقم الواتساب</label>
        <input type="text" id="ct-whatsapp" value="${ct?.whatsapp || ''}" placeholder="01XXXXXXXXX">
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="_saveContact(${customerId},${idx ?? 'null'})">💾 حفظ</button>
    </div>
  `;
}

// ===== حفظ جهة الاتصال =====
function _saveContact(customerId, idx) {
  const name = document.getElementById('ct-name').value.trim();
  if (!name) { toast('الاسم مطلوب', 'error'); return; }

  const crm = _getCrmRecord(customerId);
  const newContact = {
    name:     sanitize(name),
    role:     sanitize(document.getElementById('ct-role').value.trim()),
    phone:    sanitize(document.getElementById('ct-phone').value.trim()),
    email:    sanitize(document.getElementById('ct-email').value.trim()),
    whatsapp: sanitize(document.getElementById('ct-whatsapp').value.trim()),
  };

  if (idx === null || idx === 'null' || idx === undefined) {
    // إضافة جديدة
    crm.contacts.push(newContact);
  } else {
    // تعديل موجودة
    crm.contacts[idx] = newContact;
  }

  DB.save('crm_customers', crm);
  closeModal();
  toast('تم حفظ جهة الاتصال', 'success');
  _crmCardTab = 'contacts';
  _switchCrmCardTab(customerId);
}

// ===== حذف جهة اتصال =====
function _deleteContact(customerId, idx) {
  if (!confirm('هل تريد حذف جهة الاتصال هذه؟')) return;
  const crm = _getCrmRecord(customerId);
  crm.contacts.splice(idx, 1);
  DB.save('crm_customers', crm);
  toast('تم حذف جهة الاتصال', 'success');
  _crmCardTab = 'contacts';
  _switchCrmCardTab(customerId);
}

// ============================================
// تبويب: سجل التفاعلات (Timeline)
// ============================================
function _renderTabInteractions(crm, customerId) {
  let interactions = [...(crm.interactions || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // تطبيق فلتر نوع التفاعل
  if (_crmInteractionTypeFilter) {
    interactions = interactions.filter(i => i.type === _crmInteractionTypeFilter);
  }

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <h4 style="margin:0">سجل التفاعلات (${(crm.interactions||[]).length})</h4>
        <select onchange="_crmInteractionTypeFilter=this.value;_crmCardTab='interactions';_switchCrmCardTab(${customerId})"
                style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:13px">
          <option value="" ${_crmInteractionTypeFilter===''?'selected':''}>كل الأنواع</option>
          ${Object.entries(INTERACTION_LABELS).map(([val, lbl]) =>
            `<option value="${val}" ${_crmInteractionTypeFilter===val?'selected':''}>${INTERACTION_ICONS[val]} ${lbl}</option>`
          ).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openAddInteractionModal(${customerId})">
        ＋ إضافة تفاعل
      </button>
    </div>

    ${interactions.length === 0
      ? `<div class="empty-state" style="padding:30px">
           <div class="empty-icon">📅</div>
           <h3>لا توجد تفاعلات مسجّلة</h3>
         </div>`
      : `<div class="crm-timeline">
           ${interactions.map(inter => `
             <div class="crm-timeline-item">
               <div class="crm-timeline-icon">${INTERACTION_ICONS[inter.type] || '📌'}</div>
               <div class="crm-timeline-body">
                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                   <strong>${INTERACTION_LABELS[inter.type] || inter.type}</strong>
                   <span style="font-size:12px;color:var(--text-secondary)">${formatDate(inter.date)}</span>
                 </div>
                 <p style="margin:0;color:var(--text-secondary);font-size:13px">${inter.summary}</p>
                 ${inter.createdBy
                   ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:4px">بواسطة: ${inter.createdBy}</div>`
                   : ''}
               </div>
             </div>
           `).join('')}
         </div>`
    }
  `;
}

// ===== نافذة إضافة تفاعل =====
function openAddInteractionModal(customerId) {
  const today = new Date().toISOString().split('T')[0];
  openModal('إضافة تفاعل جديد', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group">
        <label>نوع التفاعل *</label>
        <select id="inter-type">
          ${Object.entries(INTERACTION_LABELS).map(([val, lbl]) =>
            `<option value="${val}">${INTERACTION_ICONS[val]} ${lbl}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>التاريخ *</label>
        <input type="date" id="inter-date" value="${today}">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>ملخص التفاعل *</label>
        <textarea id="inter-summary" rows="3" placeholder="أدخل تفاصيل التفاعل..."></textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="_saveInteraction(${customerId})">💾 حفظ</button>
    </div>
  `);
}

// ===== حفظ التفاعل =====
function _saveInteraction(customerId) {
  const type    = document.getElementById('inter-type').value;
  const date    = document.getElementById('inter-date').value;
  const summary = document.getElementById('inter-summary').value.trim();
  if (!summary) { toast('ملخص التفاعل مطلوب', 'error'); return; }
  if (!date)    { toast('التاريخ مطلوب', 'error'); return; }

  addCrmInteraction(customerId, {
    type,
    date,
    summary: sanitize(summary),
  });

  closeModal();
  toast('تم تسجيل التفاعل بنجاح', 'success');
  _crmCardTab = 'interactions';
  _switchCrmCardTab(customerId);
}

// ============================================
// تبويب: الفواتير
// ============================================
function _renderTabInvoices(customerId, customer) {
  const invoices = DB.getAll('sales')
    .filter(s => s.customer_id === customerId)
    .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date));

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h4 style="margin:0">الفواتير (${invoices.length})</h4>
    </div>

    ${invoices.length === 0
      ? `<div class="empty-state" style="padding:30px">
           <div class="empty-icon">🧾</div>
           <h3>لا توجد فواتير لهذا العميل</h3>
         </div>`
      : `<div class="data-table-wrapper">
           <table>
             <thead>
               <tr>
                 <th>رقم الفاتورة</th>
                 <th>التاريخ</th>
                 <th>الإجمالي</th>
                 <th>المدفوع</th>
                 <th>المتبقي</th>
                 <th>الحالة</th>
                 <th>إجراءات</th>
               </tr>
             </thead>
             <tbody>
               ${invoices.map(inv => {
                 const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
                 return `
                   <tr>
                     <td class="number"><strong>${buildNavLink(inv.invoice_number, 'sales', inv.id)}</strong></td>
                     <td>${formatDate(inv.invoice_date)}</td>
                     <td class="number">${formatMoney(inv.total_amount)}</td>
                     <td class="number text-success">${formatMoney(inv.paid_amount || 0)}</td>
                     <td class="number ${remaining > 0 ? 'text-danger' : ''}">${formatMoney(remaining)}</td>
                     <td>${statusBadge(inv.status)}</td>
                     <td>
                       ${customer.email
                         ? `<button class="btn btn-secondary btn-sm"
                              onclick="emailInvoice(
                                DB.getAll('sales').find(s=>s.id===${inv.id}),
                                DB.getAll('customers').find(c=>c.id===${customerId})
                              )">
                              📧 إرسال
                            </button>`
                         : '<span style="color:var(--text-secondary);font-size:12px">لا يوجد بريد</span>'}
                     </td>
                   </tr>
                 `;
               }).join('')}
             </tbody>
           </table>
         </div>`
    }
  `;
}

// ============================================
// تبويب: طلبات العينات
// ============================================
function _renderTabSamples(crm, customerId) {
  const samples = crm.sampleRequests || [];
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h4 style="margin:0">طلبات العينات (${samples.length})</h4>
      <button class="btn btn-primary btn-sm" onclick="openAddSampleModal(${customerId})">
        ＋ إضافة طلب عينة
      </button>
    </div>

    ${samples.length === 0
      ? `<div class="empty-state" style="padding:30px">
           <div class="empty-icon">🧪</div>
           <h3>لا توجد طلبات عينات</h3>
         </div>`
      : `<div class="data-table-wrapper">
           <table>
             <thead>
               <tr>
                 <th>التاريخ</th>
                 <th>الأصناف</th>
                 <th>الحالة</th>
                 <th>ملاحظات</th>
                 <th>إجراءات</th>
               </tr>
             </thead>
             <tbody>
               ${samples.map((sr, idx) => `
                 <tr>
                   <td>${formatDate(sr.date)}</td>
                   <td>${sr.items || '—'}</td>
                   <td>${_sampleStatusBadge(sr.status)}</td>
                   <td style="color:var(--text-secondary);font-size:13px">${sr.notes || '—'}</td>
                   <td style="display:flex;gap:4px">
                     <button class="btn btn-secondary btn-sm" onclick="openEditSampleModal(${customerId},${idx})">تعديل</button>
                     <button class="btn btn-danger btn-sm" onclick="_deleteSample(${customerId},${idx})">حذف</button>
                   </td>
                 </tr>
               `).join('')}
             </tbody>
           </table>
         </div>`
    }
  `;
}

// ===== نافذة إضافة طلب عينة =====
function openAddSampleModal(customerId) {
  openModal('إضافة طلب عينة', _sampleFormHTML(customerId, null, null));
}

// ===== نافذة تعديل طلب عينة =====
function openEditSampleModal(customerId, idx) {
  const crm = _getCrmRecord(customerId);
  const sr  = crm.sampleRequests[idx];
  if (!sr) return;
  openModal('تعديل طلب عينة', _sampleFormHTML(customerId, idx, sr));
}

// ===== نموذج طلب العينة =====
function _sampleFormHTML(customerId, idx, sr) {
  const today = new Date().toISOString().split('T')[0];
  const slabs = DB.getAll('quality_records').filter(r => r.status === 'in_stock');
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="form-group">
        <label>تاريخ الطلب *</label>
        <input type="date" id="sr-date" value="${sr?.date || today}">
      </div>
      <div class="form-group">
        <label>الحالة</label>
        <select id="sr-status">
          ${Object.entries(SAMPLE_STATUS_LABELS).map(([val, lbl]) =>
            `<option value="${val}" ${sr?.status===val?'selected':''}>${lbl}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>اللوح المُرسل كعينة</label>
        <select id="sr-slabId">
          <option value="">— اختر لوحاً —</option>
          ${slabs.map(s =>
            `<option value="${s.id}" ${String(sr?.slabId) === String(s.id) ? 'selected' : ''}>${s.slabCode} (${s.color || ''} | ${GRADE_LABELS[s.qualityGrade] || s.qualityGrade})</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>الأصناف المطلوبة *</label>
        <input type="text" id="sr-items" value="${sr?.items || ''}" placeholder="رخام أبيض، جرانيت أسود...">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>ملاحظات</label>
        <textarea id="sr-notes" rows="2">${sr?.notes || ''}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="_saveSample(${customerId},${idx ?? 'null'})">💾 حفظ</button>
    </div>
  `;
}

// ===== حفظ طلب العينة =====
function _saveSample(customerId, idx) {
  const items = document.getElementById('sr-items').value.trim();
  const date  = document.getElementById('sr-date').value;
  if (!items) { toast('الأصناف مطلوبة', 'error'); return; }
  if (!date)  { toast('التاريخ مطلوب', 'error'); return; }

  const slabId = document.getElementById('sr-slabId')?.value || '';

  const crm = _getCrmRecord(customerId);
  const newStatus = document.getElementById('sr-status').value;
  const newSr = {
    id:     idx !== null && idx !== 'null'
              ? (crm.sampleRequests[idx]?.id || Date.now())
              : (crm.sampleRequests.length
                  ? Math.max(...crm.sampleRequests.map(s => s.id || 0)) + 1
                  : 1),
    date:   date,
    items:  sanitize(items),
    status: newStatus,
    slabId: slabId,
    notes:  sanitize(document.getElementById('sr-notes').value.trim()),
  };

  if (idx === null || idx === 'null' || idx === undefined) {
    crm.sampleRequests.push(newSr);
  } else {
    crm.sampleRequests[idx] = newSr;
  }

  DB.save('crm_customers', crm);

  // عند إرسال العينة: تحديث حالة اللوح
  if (newStatus === 'sent' && slabId && typeof api !== 'undefined' && api.updateSlabStatus) {
    api.updateSlabStatus(slabId, 'عينة مُرسلة');
  }

  closeModal();
  toast('تم حفظ طلب العينة', 'success');
  _crmCardTab = 'samples';
  _switchCrmCardTab(customerId);
}

// ===== حذف طلب عينة =====
function _deleteSample(customerId, idx) {
  if (!confirm('هل تريد حذف طلب العينة هذا؟')) return;
  const crm = _getCrmRecord(customerId);
  crm.sampleRequests.splice(idx, 1);
  DB.save('crm_customers', crm);
  toast('تم حذف طلب العينة', 'success');
  _crmCardTab = 'samples';
  _switchCrmCardTab(customerId);
}

// ============================================
// نافذة إعدادات CRM العامة
// ============================================
function openCrmSettingsModal() {
  const settings = DB.getAll('settings') || {};
  openModal('إعدادات CRM', `
    <div class="form-group">
      <label>حد الائتمان الافتراضي للعملاء الجدد (EGP)</label>
      <input type="number" id="crm-default-limit"
        value="${settings.crm_default_credit_limit || 0}" min="0">
    </div>
    <div class="form-group">
      <label>مهلة السداد الافتراضية (أيام)</label>
      <input type="number" id="crm-default-days"
        value="${settings.crm_default_payment_days || 30}" min="1">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="_saveCrmSettings()">💾 حفظ الإعدادات</button>
    </div>
  `);
}

// ===== حفظ إعدادات CRM العامة =====
function _saveCrmSettings() {
  const current = DB.getAll('settings') || {};
  DB.save('settings', {
    ...current,
    crm_default_credit_limit: parseFloat(document.getElementById('crm-default-limit').value) || 0,
    crm_default_payment_days: parseInt(document.getElementById('crm-default-days').value)    || 30,
  });
  closeModal();
  toast('تم حفظ إعدادات CRM', 'success');
}

// ============================================
// CSS مخصص لـ Timeline التفاعلات
// (يُحقن مرة واحدة عند تحميل الملف)
// ============================================
(function _injectCrmStyles() {
  if (document.getElementById('crm-styles')) return;
  const style = document.createElement('style');
  style.id = 'crm-styles';
  style.textContent = `
    /* مخطط الزمني للتفاعلات */
    .crm-timeline {
      position: relative;
      padding-right: 32px;
    }
    .crm-timeline::before {
      content: '';
      position: absolute;
      right: 14px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border);
    }
    .crm-timeline-item {
      position: relative;
      margin-bottom: 20px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .crm-timeline-icon {
      position: absolute;
      right: -32px;
      top: 0;
      width: 28px;
      height: 28px;
      background: var(--bg-card);
      border: 2px solid var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      z-index: 1;
    }
    .crm-timeline-body {
      flex: 1;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
    }
    /* زر صغير الحجم */
    .btn-sm {
      padding: 4px 10px !important;
      font-size: 12px !important;
    }
  `;
  document.head.appendChild(style);
})();
