// ============================================
// Module 2 — مراكز التكلفة الفعلية
// إدارة وتحليل تكاليف مراحل الإنتاج
// ============================================

// ===== أنواع مراكز التكلفة =====
const COST_CENTER_TYPES = {
  quarry:        'محجر',
  manufacturing: 'تصنيع',
  overhead:      'تكاليف عامة',
  export:        'تصدير',
};

// ===== فئات التكاليف غير المباشرة =====
const INDIRECT_COST_CATEGORIES = ['رواتب', 'كهرباء', 'مياه', 'إيجار', 'تسويق', 'أخرى'];

// ===== أسس التوزيع =====
const ALLOCATION_BASIS_LABELS = {
  area:        'المساحة',
  hours:       'ساعات التشغيل',
  direct_cost: 'التكلفة المباشرة',
};

// ===== حالة التبويب النشط =====
let _activeCostTab = 'centers';

// ===== حالة الفلترة =====
let _costPeriodFilter    = '';
let _reportPeriodFilter  = '';
let _meterPeriodFilter   = '';

// ============================================
// دوال الحساب الأساسية (متاحة عالمياً)
// ============================================

// توزيع التكاليف غير المباشرة على مرحلة معينة وفترة زمنية
function getAllocatedOverhead(stageFilter, period) {
  const allCosts = DB.getAll('indirect_costs').filter(c => {
    return !period || c.period === period;
  });
  if (!allCosts.length) return 0;

  // حساب إجمالي التكاليف غير المباشرة للفترة
  const totalOverhead = allCosts.reduce((sum, c) => sum + (c.amount || 0), 0);

  // جلب المراحل النشطة خلال الفترة
  const allStages = DB.getAll('manufacturing_stages').filter(s => {
    return !period || s.date.startsWith(period);
  });

  // حصر المراحل الفريدة النشطة
  const uniqueStages = [...new Set(allStages.map(s => s.stage))];
  const activeCount  = uniqueStages.length;

  if (!activeCount) return 0;

  // إذا لم يُحدَّد فلتر مرحلة — نُعيد إجمالي الغير مباشرة
  if (!stageFilter) return totalOverhead;

  // توزيع بسيط: إجمالي غير المباشرة ÷ عدد المراحل النشطة
  const stageActive = uniqueStages.includes(stageFilter);
  return stageActive ? totalOverhead / activeCount : 0;
}

// حساب تكلفة المتر الفعلية لمرحلة معينة وفترة زمنية
function calcActualCostPerMeter(stageFilter, period) {
  const stages = DB.getAll('manufacturing_stages').filter(s => {
    const inPeriod = !period || s.date.startsWith(period);
    const inStage  = !stageFilter || s.stage === stageFilter;
    return inPeriod && inStage;
  });

  // مجموع التكاليف المباشرة + الغير مباشرة الموزَّعة
  const totalCost = stages.reduce((sum, op) =>
    sum + (op.directCost || 0) + (op.laborCost || 0) +
          (op.materialCost || 0) + (op.transportCost || 0), 0)
    + getAllocatedOverhead(stageFilter, period);

  // إجمالي الكميات المنتجة
  const totalOutput = stages.reduce((sum, op) => sum + (op.outputQuantity || 0), 0);

  return totalOutput > 0 ? totalCost / totalOutput : 0;
}

// تقرير مقارنة الفعلي بالمتوقع لفترة معينة
function costVarianceReport(period) {
  const allStages   = DB.getAll('manufacturing_stages');
  const uniqueNames = [...new Set(allStages.map(s => s.stage))];

  return uniqueNames.map(stageName => {
    // التكلفة المتوقعة = متوسط جميع الفترات (بدون فلتر فترة)
    const expectedCost = calcActualCostPerMeter(stageName, '');

    // التكلفة الفعلية للفترة المحددة
    const actualCost = calcActualCostPerMeter(stageName, period);

    const variance    = actualCost - expectedCost;
    const variancePct = expectedCost > 0
      ? ((variance / expectedCost) * 100).toFixed(1)
      : '—';

    // تقييم الأداء
    let judgment = 'محايد';
    if (expectedCost > 0) {
      const pct = (variance / expectedCost) * 100;
      if (pct <= -5)      judgment = 'كفء';
      else if (pct >= 10) judgment = 'غير كفء';
      else                judgment = 'مقبول';
    }

    return { stage: stageName, expectedCost, actualCost, variance, variancePct, judgment };
  }).filter(r => r.actualCost > 0 || r.expectedCost > 0);
}

// ============================================
// الدالة الرئيسية لعرض الصفحة
// ============================================
function renderCostCenters() {
  const content = document.getElementById('page-content');

  // جلب البيانات الإجمالية للـ KPI
  const centers       = DB.getAll('cost_centers');
  const indirectCosts = DB.getAll('indirect_costs');
  const stages        = DB.getAll('manufacturing_stages');

  const totalIndirect    = indirectCosts.reduce((s, c) => s + (c.amount || 0), 0);
  const uniqueStageNames = [...new Set(stages.map(s => s.stage))];

  // حساب متوسط تكلفة المتر الإجمالية
  const avgCostPerMeter = calcActualCostPerMeter('', '');

  content.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div>
        <h2>مراكز التكلفة الفعلية</h2>
        <p>تحليل وإدارة تكاليف الإنتاج الفعلية لمراحل التصنيع</p>
      </div>
    </div>

    <!-- بطاقات KPI -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">🏭</div>
        <div class="kpi-body">
          <div class="kpi-label">مراكز التكلفة</div>
          <div class="kpi-value">${centers.length}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">💰</div>
        <div class="kpi-body">
          <div class="kpi-label">إجمالي غير المباشرة</div>
          <div class="kpi-value">${formatMoney(totalIndirect)}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📐</div>
        <div class="kpi-body">
          <div class="kpi-label">متوسط تكلفة المتر</div>
          <div class="kpi-value">${formatMoney(avgCostPerMeter)}</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🔄</div>
        <div class="kpi-body">
          <div class="kpi-label">المراحل النشطة</div>
          <div class="kpi-value">${uniqueStageNames.length}</div>
        </div>
      </div>
    </div>

    <!-- التبويبات -->
    <div class="card" style="padding:0;overflow:hidden">
      <div style="display:flex;border-bottom:1px solid var(--border);background:var(--bg-card)">
        ${_buildTabBtn('centers',     '🏭 مراكز التكلفة')}
        ${_buildTabBtn('indirect',    '📋 غير المباشرة')}
        ${_buildTabBtn('variance',    '📊 المقارنة')}
        ${_buildTabBtn('cost-meter',  '📐 تكلفة المتر')}
      </div>
      <div id="cost-tab-content" style="padding:20px">
        ${_renderActiveTab()}
      </div>
    </div>
  `;

  // رسم المخطط إن كان تبويب المقارنة نشطاً
  if (_activeCostTab === 'variance') {
    _drawVarianceChart(_reportPeriodFilter);
  }
}

// ===== بناء زر التبويب =====
function _buildTabBtn(name, label) {
  const active = _activeCostTab === name;
  return `
    <button
      onclick="switchCostTab('${name}')"
      style="padding:12px 20px;border:none;background:${active ? 'var(--accent)' : 'transparent'};
             color:${active ? '#fff' : 'var(--text-secondary)'};cursor:pointer;
             font-size:13px;font-weight:${active ? '700' : '400'};
             border-bottom:${active ? '3px solid var(--accent-dark,var(--accent))' : '3px solid transparent'};
             transition:all .2s;white-space:nowrap">
      ${label}
    </button>
  `;
}

// ===== تبديل التبويبات =====
function switchCostTab(tabName) {
  _activeCostTab = tabName;
  renderCostCenters();
}

// ===== عرض محتوى التبويب النشط =====
function _renderActiveTab() {
  switch (_activeCostTab) {
    case 'centers':    return _renderCentersTab();
    case 'indirect':   return _renderIndirectTab();
    case 'variance':   return _renderVarianceTab();
    case 'cost-meter': return _renderCostMeterTab();
    default:           return '';
  }
}

// ============================================
// تبويب 1: مراكز التكلفة
// ============================================
function _renderCentersTab() {
  const stages  = DB.getAll('manufacturing_stages');
  const centers = DB.getAll('cost_centers');

  // بناء بطاقات تكلفة المتر لكل مرحلة رئيسية
  const stageNames = [...new Set(stages.map(s => s.stage))].slice(0, 8);
  const stageCostCards = stageNames.length
    ? stageNames.map(name => {
        const cpm = calcActualCostPerMeter(name, '');
        return `
          <div class="kpi-card" style="min-width:140px">
            <div class="kpi-icon">⚙️</div>
            <div class="kpi-body">
              <div class="kpi-label" style="font-size:11px;white-space:nowrap;overflow:hidden;
                                            text-overflow:ellipsis;max-width:120px" title="${name}">
                ${name}
              </div>
              <div class="kpi-value" style="font-size:16px">${formatMoney(cpm)}<span style="font-size:10px">/م²</span></div>
            </div>
          </div>
        `;
      }).join('')
    : '<p style="color:var(--text-muted);padding:12px">لا توجد مراحل تصنيع مسجلة بعد</p>';

  // جدول مراكز التكلفة
  const rows = centers.length
    ? centers.map(c => `
        <tr>
          <td>${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td><span class="badge badge-info">${COST_CENTER_TYPES[c.type] || c.type}</span></td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.description || '—'}</td>
          <td>${formatDate(c.createdAt)}</td>
          <td>
            <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px"
              onclick="openEditCenterModal(${c.id})">✏️</button>
            <button class="btn" style="padding:4px 10px;font-size:12px;background:var(--danger);color:#fff"
              onclick="deleteCostCenter(${c.id})">🗑️</button>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="6">
         <div class="empty-state" style="padding:40px">
           <div class="empty-icon">🏭</div>
           <h3>لا توجد مراكز تكلفة</h3>
           <p>أضف مركز تكلفة جديداً للبدء</p>
         </div>
       </td></tr>`;

  return `
    <!-- بطاقات تكلفة المتر الفعلية -->
    <div style="margin-bottom:20px">
      <h4 style="margin-bottom:12px;color:var(--text-secondary)">📐 تكلفة المتر الفعلية بالمرحلة</h4>
      <div class="kpi-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
        ${stageCostCards}
      </div>
    </div>

    <!-- شريط الإجراءات -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h4 style="color:var(--text-secondary)">🏭 جدول مراكز التكلفة</h4>
      <button class="btn btn-primary" onclick="openAddCenterModal()">＋ مركز تكلفة جديد</button>
    </div>

    <!-- جدول البيانات -->
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>النوع</th>
              <th>الوصف</th>
              <th>تاريخ الإنشاء</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ===== فتح مودال إضافة مركز تكلفة =====
function openAddCenterModal() {
  const typeOptions = Object.entries(COST_CENTER_TYPES)
    .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  openModal('➕ إضافة مركز تكلفة جديد', `
    <div class="form-grid">
      <div class="form-group">
        <label>اسم المركز *</label>
        <input type="text" id="cc-name" placeholder="مثال: محجر الجنوب" required>
      </div>
      <div class="form-group">
        <label>النوع *</label>
        <select id="cc-type">
          ${typeOptions}
        </select>
      </div>
      <div class="form-group" style="grid-column:span 2">
        <label>الوصف</label>
        <textarea id="cc-desc" rows="3" placeholder="وصف مختصر لمركز التكلفة..."></textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveCostCenter()">💾 حفظ</button>
    </div>
  `);
}

// ===== فتح مودال تعديل مركز تكلفة =====
function openEditCenterModal(id) {
  const c = DB.findById('cost_centers', id);
  if (!c) { toast('لم يُعثر على المركز', 'error'); return; }

  const typeOptions = Object.entries(COST_CENTER_TYPES)
    .map(([v, l]) => `<option value="${v}" ${c.type === v ? 'selected' : ''}>${l}</option>`).join('');

  openModal('✏️ تعديل مركز التكلفة', `
    <div class="form-grid">
      <div class="form-group">
        <label>اسم المركز *</label>
        <input type="text" id="cc-name" value="${c.name}" required>
      </div>
      <div class="form-group">
        <label>النوع *</label>
        <select id="cc-type">${typeOptions}</select>
      </div>
      <div class="form-group" style="grid-column:span 2">
        <label>الوصف</label>
        <textarea id="cc-desc" rows="3">${c.description || ''}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveCostCenter(${id})">💾 حفظ التعديلات</button>
    </div>
  `);
}

// ===== حفظ مركز التكلفة (إضافة أو تعديل) =====
function saveCostCenter(id) {
  const name = document.getElementById('cc-name').value.trim();
  const type = document.getElementById('cc-type').value;
  const desc = document.getElementById('cc-desc').value.trim();

  if (!name) { toast('اسم المركز مطلوب', 'error'); return; }

  const record = {
    name,
    type,
    description: desc,
    createdAt: id
      ? DB.findById('cost_centers', id)?.createdAt
      : new Date().toISOString().split('T')[0],
  };

  if (id) {
    record.id = id;
    DB.save('cost_centers', record);
    toast('تم تحديث مركز التكلفة', 'success');
  } else {
    record.id = DB.nextId('cost_centers');
    DB.save('cost_centers', record);
    toast('تمت إضافة مركز التكلفة', 'success');
  }

  closeModal();
  renderCostCenters();
}

// ===== حذف مركز تكلفة =====
function deleteCostCenter(id) {
  const c = DB.findById('cost_centers', id);
  if (!c) return;

  openModal('🗑️ تأكيد الحذف', `
    <p>هل أنت متأكد من حذف مركز التكلفة <strong>${c.name}</strong>؟</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn" style="background:var(--danger);color:#fff"
        onclick="_confirmDeleteCenter(${id})">🗑️ حذف</button>
    </div>
  `);
}

function _confirmDeleteCenter(id) {
  DB.remove('cost_centers', id);
  closeModal();
  toast('تم حذف مركز التكلفة', 'success');
  renderCostCenters();
}

// ============================================
// تبويب 2: التكاليف غير المباشرة
// ============================================
function _renderIndirectTab() {
  const allCosts = DB.getAll('indirect_costs');

  // تطبيق فلتر الفترة
  const filtered = _costPeriodFilter
    ? allCosts.filter(c => c.period === _costPeriodFilter)
    : allCosts;

  // الإجمالي المفلتر
  const filteredTotal = filtered.reduce((s, c) => s + (c.amount || 0), 0);

  // حساب التوزيع على كل مرحلة
  const stages       = DB.getAll('manufacturing_stages');
  const stageNames   = [...new Set(stages.filter(s =>
    !_costPeriodFilter || s.date.startsWith(_costPeriodFilter)
  ).map(s => s.stage))];

  const allocationRows = stageNames.map(name => {
    const allocated = getAllocatedOverhead(name, _costPeriodFilter);
    return `
      <tr>
        <td>${name}</td>
        <td class="number">${formatMoney(allocated)}</td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">لا توجد مراحل للفترة المحددة</td></tr>`;

  // صفوف جدول التكاليف
  const rows = filtered.length
    ? filtered.map(c => `
        <tr>
          <td>${c.id}</td>
          <td><strong>${c.name}</strong></td>
          <td class="number">${formatMoney(c.amount)}</td>
          <td>${c.period}</td>
          <td><span class="badge badge-info">${c.category}</span></td>
          <td>${ALLOCATION_BASIS_LABELS[c.allocationBasis] || c.allocationBasis}</td>
          <td>${formatDate(c.createdAt)}</td>
          <td>
            <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px"
              onclick="openEditIndirectModal(${c.id})">✏️</button>
            <button class="btn" style="padding:4px 10px;font-size:12px;background:var(--danger);color:#fff"
              onclick="deleteIndirectCost(${c.id})">🗑️</button>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="8">
         <div class="empty-state" style="padding:40px">
           <div class="empty-icon">📋</div>
           <h3>لا توجد تكاليف غير مباشرة</h3>
         </div>
       </td></tr>`;

  return `
    <!-- نموذج الإضافة السريعة -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><span class="card-title">➕ إضافة تكلفة غير مباشرة</span></div>
      <div style="padding:16px">
        <div class="form-grid">
          <div class="form-group">
            <label>الاسم *</label>
            <input type="text" id="ic-name" placeholder="مثال: رواتب إداريين">
          </div>
          <div class="form-group">
            <label>المبلغ *</label>
            <input type="number" id="ic-amount" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="form-group">
            <label>الفترة *</label>
            <input type="month" id="ic-period" value="${new Date().toISOString().slice(0, 7)}">
          </div>
          <div class="form-group">
            <label>الفئة</label>
            <select id="ic-category">
              ${INDIRECT_COST_CATEGORIES.map(cat =>
                `<option value="${cat}">${cat}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>أساس التوزيع</label>
            <select id="ic-basis">
              ${Object.entries(ALLOCATION_BASIS_LABELS).map(([v, l]) =>
                `<option value="${v}">${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="text-align:left;margin-top:12px">
          <button class="btn btn-primary" onclick="saveIndirectCost()">💾 إضافة التكلفة</button>
        </div>
      </div>
    </div>

    <!-- شريط الفلترة والجدول -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h4 style="color:var(--text-secondary)">📋 سجل التكاليف غير المباشرة</h4>
      <div class="filters-bar" style="margin:0;gap:8px">
        <input type="month" id="ic-filter-period" value="${_costPeriodFilter}"
          onchange="_setCostPeriodFilter(this.value)"
          placeholder="فلتر بالفترة" style="width:160px">
        <button class="btn btn-secondary" onclick="_setCostPeriodFilter('')">كل الفترات</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start">
      <!-- جدول التكاليف -->
      <div class="card" style="padding:0">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);
                    display:flex;justify-content:space-between">
          <strong>إجمالي الفترة</strong>
          <strong style="color:var(--accent)">${formatMoney(filteredTotal)}</strong>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الاسم</th>
                <th>المبلغ</th>
                <th>الفترة</th>
                <th>الفئة</th>
                <th>أساس التوزيع</th>
                <th>التاريخ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <!-- جدول التوزيع على المراحل -->
      <div class="card" style="min-width:220px;padding:0">
        <div class="card-header" style="padding:12px 16px">
          <span class="card-title">🔀 توزيع على المراحل</span>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>المرحلة</th><th>المخصَّص</th></tr></thead>
            <tbody>${allocationRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ===== تعيين فلتر الفترة للتكاليف غير المباشرة =====
function _setCostPeriodFilter(val) {
  _costPeriodFilter = val;
  renderCostCenters();
}

// ===== فتح مودال تعديل تكلفة غير مباشرة =====
function openEditIndirectModal(id) {
  const c = DB.findById('indirect_costs', id);
  if (!c) { toast('لم يُعثر على التكلفة', 'error'); return; }

  openModal('✏️ تعديل التكلفة غير المباشرة', `
    <div class="form-grid">
      <div class="form-group">
        <label>الاسم *</label>
        <input type="text" id="ic-edit-name" value="${c.name}">
      </div>
      <div class="form-group">
        <label>المبلغ *</label>
        <input type="number" id="ic-edit-amount" value="${c.amount}" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>الفترة *</label>
        <input type="month" id="ic-edit-period" value="${c.period}">
      </div>
      <div class="form-group">
        <label>الفئة</label>
        <select id="ic-edit-category">
          ${INDIRECT_COST_CATEGORIES.map(cat =>
            `<option value="${cat}" ${c.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>أساس التوزيع</label>
        <select id="ic-edit-basis">
          ${Object.entries(ALLOCATION_BASIS_LABELS).map(([v, l]) =>
            `<option value="${v}" ${c.allocationBasis === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="updateIndirectCost(${id})">💾 حفظ</button>
    </div>
  `);
}

// ===== تحديث تكلفة غير مباشرة =====
function updateIndirectCost(id) {
  const name   = document.getElementById('ic-edit-name').value.trim();
  const amount = parseFloat(document.getElementById('ic-edit-amount').value) || 0;
  const period = document.getElementById('ic-edit-period').value;
  const cat    = document.getElementById('ic-edit-category').value;
  const basis  = document.getElementById('ic-edit-basis').value;

  if (!name || !period) { toast('الاسم والفترة مطلوبان', 'error'); return; }

  const existing = DB.findById('indirect_costs', id);
  DB.save('indirect_costs', {
    id, name, amount, period,
    category: cat,
    allocationBasis: basis,
    createdAt: existing?.createdAt || new Date().toISOString().split('T')[0],
  });

  closeModal();
  toast('تم تحديث التكلفة', 'success');
  renderCostCenters();
}

// ===== حفظ تكلفة غير مباشرة جديدة =====
function saveIndirectCost() {
  const name   = document.getElementById('ic-name').value.trim();
  const amount = parseFloat(document.getElementById('ic-amount').value) || 0;
  const period = document.getElementById('ic-period').value;
  const cat    = document.getElementById('ic-category').value;
  const basis  = document.getElementById('ic-basis').value;

  if (!name)   { toast('اسم التكلفة مطلوب', 'error'); return; }
  if (!period) { toast('الفترة مطلوبة', 'error'); return; }
  if (amount <= 0) { toast('المبلغ يجب أن يكون أكبر من صفر', 'warning'); return; }

  DB.save('indirect_costs', {
    id: DB.nextId('indirect_costs'),
    name, amount, period,
    category: cat,
    allocationBasis: basis,
    createdAt: new Date().toISOString().split('T')[0],
  });

  toast('تمت إضافة التكلفة غير المباشرة', 'success');
  renderCostCenters();
}

// ===== حذف تكلفة غير مباشرة =====
function deleteIndirectCost(id) {
  const c = DB.findById('indirect_costs', id);
  if (!c) return;

  openModal('🗑️ تأكيد الحذف', `
    <p>هل أنت متأكد من حذف التكلفة <strong>${c.name}</strong> بقيمة <strong>${formatMoney(c.amount)}</strong>؟</p>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn" style="background:var(--danger);color:#fff"
        onclick="_confirmDeleteIndirect(${id})">🗑️ حذف</button>
    </div>
  `);
}

function _confirmDeleteIndirect(id) {
  DB.remove('indirect_costs', id);
  closeModal();
  toast('تم حذف التكلفة', 'success');
  renderCostCenters();
}

// ============================================
// تبويب 3: مقارنة الفعلي بالمتوقع
// ============================================
function _renderVarianceTab() {
  const report = costVarianceReport(_reportPeriodFilter);

  const rows = report.length
    ? report.map(r => {
        // تحديد لون التقييم
        const judgeColor = r.judgment === 'كفء'     ? 'var(--success)'
                         : r.judgment === 'غير كفء' ? 'var(--danger)'
                         : 'var(--text-secondary)';
        const judgeBadge = r.judgment === 'كفء'     ? 'badge-success'
                         : r.judgment === 'غير كفء' ? 'badge-danger'
                         : 'badge-warning';
        const varColor   = r.variance < 0 ? 'var(--success)' : r.variance > 0 ? 'var(--danger)' : '';

        return `
          <tr>
            <td><strong>${r.stage}</strong></td>
            <td class="number">${formatMoney(r.expectedCost)}</td>
            <td class="number">${formatMoney(r.actualCost)}</td>
            <td class="number" style="color:${varColor}">${formatMoney(r.variance)}</td>
            <td class="number" style="color:${varColor}">${r.variancePct}%</td>
            <td><span class="badge ${judgeBadge}">${r.judgment}</span></td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="6">
         <div class="empty-state" style="padding:40px">
           <div class="empty-icon">📊</div>
           <h3>لا توجد بيانات للمقارنة</h3>
           <p>يُرجى إدخال مراحل التصنيع أولاً</p>
         </div>
       </td></tr>`;

  return `
    <!-- فلتر الفترة -->
    <div class="filters-bar" style="margin-bottom:16px">
      <label style="white-space:nowrap;color:var(--text-secondary)">فترة المقارنة:</label>
      <input type="month" id="var-period" value="${_reportPeriodFilter}"
        onchange="_setReportPeriodFilter(this.value)" style="width:180px">
      <button class="btn btn-secondary" onclick="_setReportPeriodFilter('')">كل الفترات</button>
    </div>

    <!-- جدول المقارنة -->
    <div class="card" style="padding:0;margin-bottom:20px">
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>المرحلة</th>
              <th>التكلفة المتوقعة/م²</th>
              <th>التكلفة الفعلية/م²</th>
              <th>الانحراف</th>
              <th>نسبة الانحراف</th>
              <th>التقييم</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <!-- مخطط الشريطي -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📊 مقارنة التكاليف بالمخطط الشريطي</span>
      </div>
      <div style="padding:16px;position:relative;height:320px">
        <canvas id="variance-chart"></canvas>
      </div>
    </div>
  `;
}

// ===== تعيين فلتر فترة المقارنة =====
function _setReportPeriodFilter(val) {
  _reportPeriodFilter = val;
  renderCostCenters();
}

// ===== رسم مخطط الانحراف باستخدام Chart.js =====
function _drawVarianceChart(period) {
  const canvas = document.getElementById('variance-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const report = costVarianceReport(period);
  if (!report.length) return;

  // تدمير أي مخطط سابق لنفس العنصر
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: report.map(r => r.stage),
      datasets: [
        {
          label: 'التكلفة المتوقعة/م²',
          data: report.map(r => r.expectedCost),
          backgroundColor: 'rgba(99,179,237,0.7)',
          borderColor: 'rgba(99,179,237,1)',
          borderWidth: 1,
        },
        {
          label: 'التكلفة الفعلية/م²',
          data: report.map(r => r.actualCost),
          backgroundColor: report.map(r =>
            r.judgment === 'كفء'     ? 'rgba(72,187,120,0.7)' :
            r.judgment === 'غير كفء' ? 'rgba(245,101,101,0.7)' :
                                        'rgba(237,137,54,0.7)'),
          borderColor: report.map(r =>
            r.judgment === 'كفء'     ? 'rgba(72,187,120,1)' :
            r.judgment === 'غير كفء' ? 'rgba(245,101,101,1)' :
                                        'rgba(237,137,54,1)'),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            // تنسيق قيم الأدوات إلى عملة
            label: ctx => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: { ticks: { maxRotation: 30 } },
        y: {
          beginAtZero: true,
          ticks: { callback: v => formatMoney(v) },
        },
      },
    },
  });
}

// ============================================
// تبويب 4: تقرير تكلفة المتر
// ============================================
function _renderCostMeterTab() {
  const stages = DB.getAll('manufacturing_stages').filter(s =>
    !_meterPeriodFilter || s.date.startsWith(_meterPeriodFilter)
  );

  // تجميع البيانات حسب المرحلة
  const stageMap = {};
  stages.forEach(s => {
    if (!stageMap[s.stage]) {
      stageMap[s.stage] = {
        stage:        s.stage,
        directCost:   0,
        laborCost:    0,
        materialCost: 0,
        transportCost:0,
        outputQty:    0,
      };
    }
    const m = stageMap[s.stage];
    m.directCost    += s.directCost    || 0;
    m.laborCost     += s.laborCost     || 0;
    m.materialCost  += s.materialCost  || 0;
    m.transportCost += s.transportCost || 0;
    m.outputQty     += s.outputQuantity|| 0;
  });

  const reportRows = Object.values(stageMap);

  const rows = reportRows.length
    ? reportRows.map(r => {
        const directTotal   = r.directCost + r.laborCost + r.materialCost + r.transportCost;
        const indirectAlloc = getAllocatedOverhead(r.stage, _meterPeriodFilter);
        const totalCost     = directTotal + indirectAlloc;
        const cpm           = r.outputQty > 0 ? totalCost / r.outputQty : 0;

        return `
          <tr>
            <td><strong>${r.stage}</strong></td>
            <td class="number">${formatMoney(directTotal)}</td>
            <td class="number">${formatMoney(indirectAlloc)}</td>
            <td class="number"><strong style="color:var(--accent)">${formatMoney(totalCost)}</strong></td>
            <td class="number">${r.outputQty.toFixed(2)}</td>
            <td class="number"><strong style="color:var(--success)">${formatMoney(cpm)}</strong></td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="6">
         <div class="empty-state" style="padding:40px">
           <div class="empty-icon">📐</div>
           <h3>لا توجد بيانات للفترة المحددة</h3>
         </div>
       </td></tr>`;

  return `
    <!-- شريط الفلترة والتصدير -->
    <div class="filters-bar" style="margin-bottom:16px">
      <label style="white-space:nowrap;color:var(--text-secondary)">الفترة:</label>
      <input type="month" id="cm-period" value="${_meterPeriodFilter}"
        onchange="_setMeterPeriodFilter(this.value)" style="width:180px">
      <button class="btn btn-secondary" onclick="_setMeterPeriodFilter('')">كل الفترات</button>
      <button class="btn btn-secondary" onclick="exportCostMeterExcel()">📊 تصدير Excel</button>
    </div>

    <!-- جدول تكلفة المتر -->
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>المرحلة</th>
              <th>التكلفة المباشرة</th>
              <th>غير المباشرة الموزَّعة</th>
              <th>إجمالي التكلفة</th>
              <th>الكمية المنتجة (م²)</th>
              <th>تكلفة المتر</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ===== تعيين فلتر فترة تقرير تكلفة المتر =====
function _setMeterPeriodFilter(val) {
  _meterPeriodFilter = val;
  renderCostCenters();
}

// ===== تصدير تقرير تكلفة المتر إلى Excel =====
function exportCostMeterExcel() {
  if (typeof XLSX === 'undefined') {
    toast('مكتبة Excel غير محملة بعد', 'error');
    return;
  }

  const stages = DB.getAll('manufacturing_stages').filter(s =>
    !_meterPeriodFilter || s.date.startsWith(_meterPeriodFilter)
  );

  // إعادة بناء الجدول للتصدير
  const stageMap = {};
  stages.forEach(s => {
    if (!stageMap[s.stage]) {
      stageMap[s.stage] = {
        stage: s.stage,
        directCost: 0, laborCost: 0,
        materialCost: 0, transportCost: 0,
        outputQty: 0,
      };
    }
    const m = stageMap[s.stage];
    m.directCost    += s.directCost    || 0;
    m.laborCost     += s.laborCost     || 0;
    m.materialCost  += s.materialCost  || 0;
    m.transportCost += s.transportCost || 0;
    m.outputQty     += s.outputQuantity|| 0;
  });

  const excelRows = Object.values(stageMap).map(r => {
    const directTotal   = r.directCost + r.laborCost + r.materialCost + r.transportCost;
    const indirectAlloc = getAllocatedOverhead(r.stage, _meterPeriodFilter);
    const totalCost     = directTotal + indirectAlloc;
    const cpm           = r.outputQty > 0 ? totalCost / r.outputQty : 0;

    return {
      'المرحلة':                  r.stage,
      'التكلفة المباشرة':         directTotal,
      'غير المباشرة الموزعة':     indirectAlloc,
      'إجمالي التكلفة':           totalCost,
      'الكمية المنتجة (م²)':      r.outputQty,
      'تكلفة المتر (ج.م/م²)':    cpm,
    };
  });

  const ws = XLSX.utils.json_to_sheet(excelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'تكلفة المتر');

  const fileName = `cost-per-meter${_meterPeriodFilter ? '-' + _meterPeriodFilter : ''}.xlsx`;
  XLSX.writeFile(wb, fileName);
  toast('تم تصدير التقرير بنجاح', 'success');
}
