// ============================================
// Module 1 — مراحل التصنيع
// إدارة مراحل تصنيع الرخام والجرانيت
// ============================================

// ===== معدلات تكلفة المناولة =====
const HANDLING_RATES = { forkLift: 15, crane: 25, labor: 8 };

// ===== قائمة مراحل الإنتاج المدعومة =====
const MANUFACTURING_STAGES = [
  'شراء الأحجار',
  'مسح الأحجار',
  'نشر رخام',
  'نشر جرانيت',
  'إعادة نشر',
  'تقطيع طاولات',
  'معالجة بالريزن',
  'معالجة بالإيبوكسي',
  'تلميع',
  'عمليات وتر جيت',
  'تصنيع أحواض ومغاسل',
  'كبريشن',
  'فلاقة',
  'هوند',
  'براشد',
  'بوش همر',
  'طمبل',
  'شطف',
  'سنفرة',
  'حرق',
  'مرحلة مخصصة',
];

// ===== وحدات القياس =====
const UNITS = ['م²', 'م³', 'طن', 'لوح', 'قطعة'];

// ===== درجات الجودة =====
const QUALITY_GRADES = ['A', 'B', 'C', 'D'];

// ===== حساب تكلفة المناولة =====
// تُحسب بناءً على المسافة وعدد الرفعات والعمال وساعات العمل
function calcHandlingCost(distance, lifts, workers, hours) {
  return {
    forkLiftCost: distance * HANDLING_RATES.forkLift,
    craneCost:    lifts   * HANDLING_RATES.crane,
    laborCost:    workers * hours * HANDLING_RATES.labor,
  };
}

// ===== دوال مساعدة عامة =====

// استرداد جميع مراحل تصنيع كتلة معينة
function getManufacturingStagesByBlock(blockId) {
  return DB.getAll('manufacturing_stages')
    .filter(s => String(s.blockId) === String(blockId))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// إجمالي تكاليف التصنيع لكتلة معينة
function getTotalManufacturingCost(blockId) {
  return getManufacturingStagesByBlock(blockId)
    .reduce((sum, s) => sum + (s.directCost || 0) + (s.laborCost || 0) +
                               (s.materialCost || 0) + (s.transportCost || 0), 0);
}

// ===== عرض صفحة مراحل التصنيع الرئيسية =====
function renderManufacturing() {
  const content = document.getElementById('page-content');

  // جلب بيانات المراحل والبلوكات
  const stages = DB.getAll('manufacturing_stages');
  const blocks  = DB.getAll('blocks');

  // حساب الإحصائيات الإجمالية
  const totalStages = stages.length;
  const totalCost   = stages.reduce((s, r) =>
    s + (r.directCost || 0) + (r.laborCost || 0) +
        (r.materialCost || 0) + (r.transportCost || 0), 0);
  const totalWaste  = stages.reduce((s, r) => s + (r.wasteQuantity || 0), 0);

  // بناء خيارات فلتر الكتلة
  const blockOptions = blocks.map(b =>
    `<option value="${b.code}">${b.code} — ${b.type}</option>`
  ).join('');

  // بناء خيارات فلتر نوع المرحلة
  const stageOptions = MANUFACTURING_STAGES.map(st =>
    `<option value="${st}">${st}</option>`
  ).join('');

  content.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div>
        <h2>مراحل التصنيع</h2>
        <p>تتبع وإدارة مراحل تصنيع الرخام والجرانيت</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="showProductionChainModal()">🔗 سلسلة الإنتاج</button>
        <button class="btn btn-primary"   onclick="openAddStageModal()">＋ إضافة مرحلة</button>
      </div>
    </div>

    <!-- بطاقات الملخص -->
    <div class="report-summary">
      <div class="summary-box gold">
        <div class="label">إجمالي المراحل</div>
        <div class="value">${totalStages}</div>
      </div>
      <div class="summary-box profit">
        <div class="label">إجمالي التكاليف</div>
        <div class="value">${formatMoney(totalCost)}</div>
      </div>
      <div class="summary-box loss">
        <div class="label">إجمالي الهالك</div>
        <div class="value">${totalWaste.toFixed(2)}</div>
      </div>
      <div class="summary-box">
        <div class="label">عدد الكتل المصنّعة</div>
        <div class="value">${new Set(stages.map(s => s.blockId)).size}</div>
      </div>
    </div>

    <!-- شريط الفلاتر -->
    <div class="filters-bar">
      <select id="mfg-filter-block" onchange="filterManufacturingStages()" style="min-width:180px">
        <option value="">كل الكتل</option>
        ${blockOptions}
      </select>
      <select id="mfg-filter-stage" onchange="filterManufacturingStages()" style="min-width:160px">
        <option value="">كل المراحل</option>
        ${stageOptions}
      </select>
      <input type="date" id="mfg-filter-from" onchange="filterManufacturingStages()"
             title="من تاريخ" style="width:140px">
      <input type="date" id="mfg-filter-to"   onchange="filterManufacturingStages()"
             title="إلى تاريخ" style="width:140px">
      <button class="btn btn-secondary btn-sm" onclick="clearManufacturingFilters()">✕ مسح</button>
    </div>

    <!-- جدول المراحل -->
    <div class="card" style="padding:0">
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>الكتلة</th>
              <th>المرحلة</th>
              <th>الماكينة</th>
              <th>المشغل</th>
              <th>الكمية الداخلة</th>
              <th>الكمية الخارجة</th>
              <th>الهالك</th>
              <th>الجودة</th>
              <th>إجمالي التكلفة</th>
              <th>التاريخ</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="mfg-tbody">
            ${renderManufacturingRows(stages)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // حفظ البيانات في الذاكرة للفلترة
  window._mfgStages = stages;
  window._mfgBlocks = blocks;
}

// ===== عرض صفوف جدول المراحل =====
function renderManufacturingRows(stages) {
  if (!stages.length) {
    return `<tr><td colspan="11">
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">🏭</div>
        <h3>لا توجد مراحل تصنيع</h3>
        <p>ابدأ بإضافة مرحلة تصنيع جديدة</p>
      </div>
    </td></tr>`;
  }

  // ترتيب حسب التاريخ تنازلياً
  const sorted = [...stages].sort((a, b) => new Date(b.date) - new Date(a.date));

  return sorted.map(s => {
    const totalCost = (s.directCost || 0) + (s.laborCost || 0) +
                      (s.materialCost || 0) + (s.transportCost || 0);
    const gradeClass = { A: 'badge-success', B: 'badge-info', C: 'badge-warning', D: 'badge-danger' };
    const stageName  = s.customStage || s.stage;

    return `
      <tr>
        <td class="number"><strong>${buildNavLink(s.blockId, 'cutting', s.blockId)}</strong></td>
        <td>${stageName}</td>
        <td>${s.machineId || '—'}</td>
        <td>${s.operatorName || '—'}</td>
        <td class="number">${(s.inputQuantity || 0).toFixed(2)} ${s.inputUnit || ''}</td>
        <td class="number text-success">${(s.outputQuantity || 0).toFixed(2)} ${s.outputUnit || ''}</td>
        <td class="number ${s.wasteQuantity > 0 ? 'text-danger' : ''}">
          ${(s.wasteQuantity || 0).toFixed(2)}
        </td>
        <td>
          <span class="badge ${gradeClass[s.qualityGrade] || 'badge-info'}">
            ${s.qualityGrade || '—'}
          </span>
        </td>
        <td class="number">${formatMoney(totalCost)}</td>
        <td>${formatDate(s.date)}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-secondary btn-sm" onclick="viewManufacturingStage(${s.id})">تفاصيل</button>
            <button class="btn btn-danger btn-sm"    onclick="deleteManufacturingStage(${s.id})">حذف</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== فلترة المراحل =====
function filterManufacturingStages() {
  const blockFilter = document.getElementById('mfg-filter-block').value;
  const stageFilter = document.getElementById('mfg-filter-stage').value;
  const fromDate    = document.getElementById('mfg-filter-from').value;
  const toDate      = document.getElementById('mfg-filter-to').value;

  let data = DB.getAll('manufacturing_stages');

  if (blockFilter) data = data.filter(s => String(s.blockId) === blockFilter);
  if (stageFilter) data = data.filter(s => s.stage === stageFilter);
  if (fromDate)    data = data.filter(s => s.date >= fromDate);
  if (toDate)      data = data.filter(s => s.date <= toDate);

  document.getElementById('mfg-tbody').innerHTML = renderManufacturingRows(data);
}

// ===== مسح الفلاتر =====
function clearManufacturingFilters() {
  document.getElementById('mfg-filter-block').value = '';
  document.getElementById('mfg-filter-stage').value = '';
  document.getElementById('mfg-filter-from').value  = '';
  document.getElementById('mfg-filter-to').value    = '';
  filterManufacturingStages();
}

// ===== نموذج إضافة مرحلة جديدة =====
function openAddStageModal() {
  const blocks = DB.getAll('blocks');
  const blockOpts = blocks.map(b =>
    `<option value="${b.code}">${b.code} — ${b.type}</option>`
  ).join('');
  const stageOpts = MANUFACTURING_STAGES.map(st =>
    `<option value="${st}">${st}</option>`
  ).join('');
  const unitOpts = UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
  const gradeOpts = QUALITY_GRADES.map(g => `<option value="${g}">${g}</option>`).join('');
  const today = new Date().toISOString().split('T')[0];

  openModal('إضافة مرحلة تصنيع', `
    <div style="max-height:65vh;overflow-y:auto;padding-left:4px">

      <!-- بيانات أساسية -->
      <div class="form-grid">
        <div class="form-group">
          <label>رقم الكتلة الأم *</label>
          <select id="ns-blockId">
            <option value="">اختر الكتلة</option>
            ${blockOpts}
          </select>
        </div>
        <div class="form-group">
          <label>رقم دفعة العمليات</label>
          <input type="text" id="ns-operationId" placeholder="مثال: OP-2024-001">
        </div>
        <div class="form-group">
          <label>نوع المرحلة *</label>
          <select id="ns-stage" onchange="toggleCustomStage()">
            <option value="">اختر المرحلة</option>
            ${stageOpts}
          </select>
        </div>
        <div class="form-group" id="ns-custom-stage-group" style="display:none">
          <label>اسم المرحلة المخصصة *</label>
          <input type="text" id="ns-customStage" placeholder="أدخل اسم المرحلة">
        </div>
        <div class="form-group">
          <label>رقم الماكينة</label>
          <input type="text" id="ns-machineId" placeholder="مثال: MC-01">
        </div>
        <div class="form-group">
          <label>اسم المشغل</label>
          <input type="text" id="ns-operatorName" placeholder="اسم العامل أو المشغل">
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="ns-date" value="${today}">
        </div>
        <div class="form-group">
          <label>درجة الجودة</label>
          <select id="ns-qualityGrade">
            <option value="">اختر الدرجة</option>
            ${gradeOpts}
          </select>
        </div>
      </div>

      <!-- الكميات -->
      <hr class="divider" style="margin:12px 0">
      <p style="color:var(--accent);font-size:13px;margin-bottom:10px;font-weight:600">📦 الكميات</p>
      <div class="form-grid">
        <div class="form-group">
          <label>الكمية الداخلة</label>
          <input type="number" id="ns-inputQuantity" min="0" step="0.01" value="0"
                 oninput="calcManufacturingWaste()">
        </div>
        <div class="form-group">
          <label>وحدة الداخلة</label>
          <select id="ns-inputUnit">${unitOpts}</select>
        </div>
        <div class="form-group">
          <label>الكمية الخارجة</label>
          <input type="number" id="ns-outputQuantity" min="0" step="0.01" value="0"
                 oninput="calcManufacturingWaste()">
        </div>
        <div class="form-group">
          <label>وحدة الخارجة</label>
          <select id="ns-outputUnit">${unitOpts}</select>
        </div>
        <div class="form-group">
          <label>الهالك (محسوب)</label>
          <input type="number" id="ns-wasteQuantity" min="0" step="0.01" value="0" readonly
                 style="background:var(--bg-secondary);color:var(--danger)">
        </div>
        <div class="form-group">
          <label>سبب الهالك</label>
          <input type="text" id="ns-wasteReason" placeholder="وصف سبب الهالك">
        </div>
      </div>

      <!-- التكاليف -->
      <hr class="divider" style="margin:12px 0">
      <p style="color:var(--accent);font-size:13px;margin-bottom:10px;font-weight:600">💰 التكاليف (ج.م)</p>
      <div class="form-grid">
        <div class="form-group">
          <label>التكلفة المباشرة</label>
          <input type="number" id="ns-directCost" min="0" step="0.01" value="0"
                 oninput="updateManufacturingTotalCost()">
        </div>
        <div class="form-group">
          <label>تكلفة العمالة</label>
          <input type="number" id="ns-laborCost" min="0" step="0.01" value="0"
                 oninput="updateManufacturingTotalCost()">
        </div>
        <div class="form-group">
          <label>تكلفة المواد</label>
          <input type="number" id="ns-materialCost" min="0" step="0.01" value="0"
                 oninput="updateManufacturingTotalCost()">
        </div>
        <div class="form-group">
          <label>تكلفة النقل</label>
          <input type="number" id="ns-transportCost" min="0" step="0.01" value="0"
                 oninput="updateManufacturingTotalCost()">
        </div>
      </div>

      <!-- حاسبة تكلفة المناولة -->
      <div style="background:rgba(200,169,110,0.06);border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:4px">
        <p style="font-size:12px;color:var(--accent);margin-bottom:10px;font-weight:600">
          🔧 حاسبة تكلفة المناولة (اختياري)
        </p>
        <div class="form-grid" style="grid-template-columns:repeat(4,1fr)">
          <div class="form-group">
            <label style="font-size:11px">المسافة (م)</label>
            <input type="number" id="ns-hc-distance" min="0" step="1" value="0"
                   oninput="applyHandlingCost()">
          </div>
          <div class="form-group">
            <label style="font-size:11px">عدد الرفعات</label>
            <input type="number" id="ns-hc-lifts" min="0" step="1" value="0"
                   oninput="applyHandlingCost()">
          </div>
          <div class="form-group">
            <label style="font-size:11px">عدد العمال</label>
            <input type="number" id="ns-hc-workers" min="0" step="1" value="0"
                   oninput="applyHandlingCost()">
          </div>
          <div class="form-group">
            <label style="font-size:11px">الساعات</label>
            <input type="number" id="ns-hc-hours" min="0" step="0.5" value="0"
                   oninput="applyHandlingCost()">
          </div>
        </div>
        <div id="ns-hc-result" style="font-size:12px;color:var(--text-secondary);margin-top:4px"></div>
      </div>

      <!-- إجمالي التكلفة -->
      <div id="ns-total-cost-display"
           style="margin-top:12px;padding:10px;border-radius:6px;background:rgba(200,169,110,0.08);
                  text-align:center;font-weight:700;color:var(--accent);font-size:15px">
        إجمالي التكلفة: ${formatMoney(0)}
      </div>

      <!-- ملاحظات -->
      <div class="form-group form-full" style="margin-top:12px">
        <label>ملاحظات</label>
        <textarea id="ns-notes" rows="2" placeholder="أي ملاحظات إضافية..."></textarea>
      </div>

    </div>

    <div style="margin-top:16px;text-align:left;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary"   onclick="saveManufacturingStage()">💾 حفظ المرحلة</button>
    </div>
  `);
}

// ===== إظهار / إخفاء حقل المرحلة المخصصة =====
function toggleCustomStage() {
  const stage = document.getElementById('ns-stage').value;
  const customGroup = document.getElementById('ns-custom-stage-group');
  if (customGroup) {
    customGroup.style.display = (stage === 'مرحلة مخصصة') ? '' : 'none';
  }
}

// ===== حساب الهالك تلقائياً =====
function calcManufacturingWaste() {
  const input  = parseFloat(document.getElementById('ns-inputQuantity').value)  || 0;
  const output = parseFloat(document.getElementById('ns-outputQuantity').value) || 0;
  const waste  = Math.max(0, input - output);
  const wasteEl = document.getElementById('ns-wasteQuantity');
  if (wasteEl) wasteEl.value = waste.toFixed(2);
}

// ===== تحديث عرض إجمالي التكلفة =====
function updateManufacturingTotalCost() {
  const direct    = parseFloat(document.getElementById('ns-directCost').value)    || 0;
  const labor     = parseFloat(document.getElementById('ns-laborCost').value)     || 0;
  const material  = parseFloat(document.getElementById('ns-materialCost').value)  || 0;
  const transport = parseFloat(document.getElementById('ns-transportCost').value) || 0;
  const total     = direct + labor + material + transport;
  const display   = document.getElementById('ns-total-cost-display');
  if (display) display.textContent = `إجمالي التكلفة: ${formatMoney(total)}`;
}

// ===== تطبيق حاسبة تكلفة المناولة على حقول التكلفة =====
function applyHandlingCost() {
  const distance = parseFloat(document.getElementById('ns-hc-distance').value) || 0;
  const lifts    = parseFloat(document.getElementById('ns-hc-lifts').value)    || 0;
  const workers  = parseFloat(document.getElementById('ns-hc-workers').value)  || 0;
  const hours    = parseFloat(document.getElementById('ns-hc-hours').value)    || 0;

  const hc     = calcHandlingCost(distance, lifts, workers, hours);
  const result = document.getElementById('ns-hc-result');
  if (result) {
    result.innerHTML = `
      رافعة شوكية: <strong>${formatMoney(hc.forkLiftCost)}</strong> &nbsp;|&nbsp;
      رافعة: <strong>${formatMoney(hc.craneCost)}</strong> &nbsp;|&nbsp;
      عمالة: <strong>${formatMoney(hc.laborCost)}</strong>
    `;
  }

  // إضافة تكاليف المناولة تلقائياً إلى الحقول المقابلة
  const transportEl = document.getElementById('ns-transportCost');
  const laborEl     = document.getElementById('ns-laborCost');

  if (transportEl) {
    transportEl.value = (hc.forkLiftCost + hc.craneCost).toFixed(2);
  }
  if (laborEl) {
    laborEl.value = hc.laborCost.toFixed(2);
  }
  updateManufacturingTotalCost();
}

// ===== حفظ مرحلة التصنيع =====
function saveManufacturingStage() {
  const blockId       = document.getElementById('ns-blockId').value.trim();
  const stage         = document.getElementById('ns-stage').value;
  const customStage   = document.getElementById('ns-customStage')?.value.trim() || '';
  const date          = document.getElementById('ns-date').value;

  // التحقق من الحقول الإلزامية
  if (!blockId) { toast('الرجاء اختيار رقم الكتلة', 'error'); return; }
  if (!stage)   { toast('الرجاء اختيار نوع المرحلة', 'error'); return; }
  if (stage === 'مرحلة مخصصة' && !customStage) {
    toast('الرجاء إدخال اسم المرحلة المخصصة', 'error'); return;
  }
  if (!date) { toast('الرجاء تحديد التاريخ', 'error'); return; }

  const record = {
    id:              DB.nextId('manufacturing_stages'),
    blockId,
    operationId:     document.getElementById('ns-operationId').value.trim(),
    stage,
    customStage:     stage === 'مرحلة مخصصة' ? customStage : '',
    machineId:       document.getElementById('ns-machineId').value.trim(),
    operatorName:    document.getElementById('ns-operatorName').value.trim(),
    date,
    inputQuantity:   parseFloat(document.getElementById('ns-inputQuantity').value)  || 0,
    inputUnit:       document.getElementById('ns-inputUnit').value,
    outputQuantity:  parseFloat(document.getElementById('ns-outputQuantity').value) || 0,
    outputUnit:      document.getElementById('ns-outputUnit').value,
    wasteQuantity:   parseFloat(document.getElementById('ns-wasteQuantity').value)  || 0,
    wasteReason:     document.getElementById('ns-wasteReason').value.trim(),
    directCost:      parseFloat(document.getElementById('ns-directCost').value)    || 0,
    laborCost:       parseFloat(document.getElementById('ns-laborCost').value)     || 0,
    materialCost:    parseFloat(document.getElementById('ns-materialCost').value)  || 0,
    transportCost:   parseFloat(document.getElementById('ns-transportCost').value) || 0,
    qualityGrade:    document.getElementById('ns-qualityGrade').value,
    notes:           document.getElementById('ns-notes').value.trim(),
    createdAt:       new Date().toISOString(),
  };

  DB.save('manufacturing_stages', record);
  closeModal();
  toast('تم حفظ مرحلة التصنيع بنجاح', 'success');
  renderManufacturing();
}

// ===== عرض تفاصيل مرحلة =====
function viewManufacturingStage(id) {
  const s = DB.findById('manufacturing_stages', id);
  if (!s) { toast('المرحلة غير موجودة', 'error'); return; }

  const totalCost   = (s.directCost || 0) + (s.laborCost || 0) +
                      (s.materialCost || 0) + (s.transportCost || 0);
  const stageName   = s.customStage || s.stage;
  const gradeClass  = { A: 'badge-success', B: 'badge-info', C: 'badge-warning', D: 'badge-danger' };
  const blockTotal  = getTotalManufacturingCost(s.blockId);

  openModal(`تفاصيل المرحلة — ${stageName}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="padding:12px">
        <p style="color:var(--text-muted);font-size:11px;margin-bottom:6px">معلومات عامة</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="color:var(--text-secondary);padding:4px 0">رقم الكتلة</td><td><strong>${s.blockId}</strong></td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">رقم الدفعة</td><td>${s.operationId || '—'}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">المرحلة</td><td><strong>${stageName}</strong></td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">الماكينة</td><td>${s.machineId || '—'}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">المشغل</td><td>${s.operatorName || '—'}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">التاريخ</td><td>${formatDate(s.date)}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">الجودة</td>
            <td><span class="badge ${gradeClass[s.qualityGrade] || 'badge-info'}">${s.qualityGrade || '—'}</span></td></tr>
        </table>
      </div>
      <div class="card" style="padding:12px">
        <p style="color:var(--text-muted);font-size:11px;margin-bottom:6px">الكميات والتكاليف</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="color:var(--text-secondary);padding:4px 0">الداخلة</td><td class="number">${(s.inputQuantity || 0).toFixed(2)} ${s.inputUnit}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">الخارجة</td><td class="number text-success">${(s.outputQuantity || 0).toFixed(2)} ${s.outputUnit}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">الهالك</td><td class="number text-danger">${(s.wasteQuantity || 0).toFixed(2)}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">سبب الهالك</td><td>${s.wasteReason || '—'}</td></tr>
          <tr style="border-top:1px solid var(--border)">
            <td style="color:var(--text-secondary);padding:4px 0">التكلفة المباشرة</td><td class="number">${formatMoney(s.directCost)}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">تكلفة العمالة</td><td class="number">${formatMoney(s.laborCost)}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">تكلفة المواد</td><td class="number">${formatMoney(s.materialCost)}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">تكلفة النقل</td><td class="number">${formatMoney(s.transportCost)}</td></tr>
          <tr style="border-top:1px solid var(--border);font-weight:700">
            <td style="color:var(--accent);padding:4px 0">إجمالي هذه المرحلة</td>
            <td class="number" style="color:var(--accent)">${formatMoney(totalCost)}</td></tr>
          <tr><td style="color:var(--text-secondary);padding:4px 0">تكلفة الكتلة التراكمية</td>
            <td class="number text-warning">${formatMoney(blockTotal)}</td></tr>
        </table>
      </div>
    </div>
    ${s.notes ? `<div class="card" style="padding:10px;font-size:13px"><strong>ملاحظات:</strong> ${s.notes}</div>` : ''}
  `);
}

// ===== حذف مرحلة تصنيع =====
function deleteManufacturingStage(id) {
  const s = DB.findById('manufacturing_stages', id);
  if (!s) return;
  const stageName = s.customStage || s.stage;

  openModal('تأكيد الحذف', `
    <p style="margin-bottom:16px">
      هل أنت متأكد من حذف مرحلة <strong>${stageName}</strong>
      للكتلة <strong>${s.blockId}</strong>؟
    </p>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-danger" onclick="confirmDeleteManufacturingStage(${id})">حذف</button>
    </div>
  `);
}

// ===== تأكيد الحذف =====
function confirmDeleteManufacturingStage(id) {
  DB.remove('manufacturing_stages', id);
  closeModal();
  toast('تم حذف المرحلة بنجاح', 'success');
  renderManufacturing();
}

// ===== نافذة سلسلة الإنتاج =====
function showProductionChainModal() {
  const blocks = DB.getAll('blocks');
  const blockOpts = blocks.map(b =>
    `<option value="${b.code}">${b.code} — ${b.type}</option>`
  ).join('');

  openModal('🔗 سلسلة الإنتاج', `
    <div class="form-group" style="margin-bottom:16px">
      <label>اختر الكتلة</label>
      <select id="chain-blockId" onchange="renderProductionChain()">
        <option value="">اختر الكتلة لعرض سلسلة الإنتاج</option>
        ${blockOpts}
      </select>
    </div>
    <div id="chain-content">
      <div class="empty-state" style="padding:32px">
        <div class="empty-icon">🔗</div>
        <h3>اختر كتلة لعرض سلسلة الإنتاج</h3>
      </div>
    </div>
  `);
}

// ===== عرض سلسلة الإنتاج لكتلة معينة =====
function renderProductionChain() {
  const blockId  = document.getElementById('chain-blockId').value;
  const container = document.getElementById('chain-content');
  if (!blockId) {
    container.innerHTML = `<div class="empty-state" style="padding:32px">
      <div class="empty-icon">🔗</div><h3>اختر كتلة لعرض سلسلة الإنتاج</h3></div>`;
    return;
  }

  const stages    = getManufacturingStagesByBlock(blockId);
  const totalCost = getTotalManufacturingCost(blockId);

  if (!stages.length) {
    container.innerHTML = `<div class="empty-state" style="padding:32px">
      <div class="empty-icon">🏭</div><h3>لا توجد مراحل لهذه الكتلة</h3></div>`;
    return;
  }

  // بناء خط زمني مرئي لسلسلة الإنتاج
  const timelineItems = stages.map((s, idx) => {
    const stageName  = s.customStage || s.stage;
    const cost       = (s.directCost || 0) + (s.laborCost || 0) +
                       (s.materialCost || 0) + (s.transportCost || 0);
    const gradeColor = { A: 'var(--success)', B: 'var(--info)', C: 'var(--warning)', D: 'var(--danger)' };
    const dotColor   = gradeColor[s.qualityGrade] || 'var(--accent)';
    const isLast     = idx === stages.length - 1;

    return `
      <div style="display:flex;gap:0;align-items:stretch">
        <!-- عمود المؤشر والخط -->
        <div style="display:flex;flex-direction:column;align-items:center;width:32px;flex-shrink:0">
          <div style="width:16px;height:16px;border-radius:50%;background:${dotColor};
                      border:2px solid var(--bg-card);box-shadow:0 0 0 3px ${dotColor}33;
                      flex-shrink:0;margin-top:14px"></div>
          ${!isLast ? `<div style="width:2px;flex:1;background:var(--border);margin-top:4px;min-height:20px"></div>` : ''}
        </div>
        <!-- محتوى المرحلة -->
        <div style="flex:1;padding:10px 12px ${isLast ? '0' : '16px'} 12px">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div>
                <strong style="color:var(--accent);font-size:14px">${stageName}</strong>
                ${s.qualityGrade ? `<span class="badge" style="margin-right:8px;background:${dotColor}22;color:${dotColor};border:1px solid ${dotColor}44">${s.qualityGrade}</span>` : ''}
              </div>
              <span style="font-size:12px;color:var(--text-muted)">${formatDate(s.date)}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px">
              <div>
                <span style="color:var(--text-muted)">الداخلة: </span>
                <strong>${(s.inputQuantity || 0).toFixed(2)} ${s.inputUnit}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted)">الخارجة: </span>
                <strong style="color:var(--success)">${(s.outputQuantity || 0).toFixed(2)} ${s.outputUnit}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted)">الهالك: </span>
                <strong style="color:${s.wasteQuantity > 0 ? 'var(--danger)' : 'var(--text-secondary)'}">
                  ${(s.wasteQuantity || 0).toFixed(2)}
                </strong>
              </div>
              ${s.machineId    ? `<div><span style="color:var(--text-muted)">الماكينة: </span><strong>${s.machineId}</strong></div>` : ''}
              ${s.operatorName ? `<div><span style="color:var(--text-muted)">المشغل: </span><strong>${s.operatorName}</strong></div>` : ''}
              <div>
                <span style="color:var(--text-muted)">التكلفة: </span>
                <strong style="color:var(--accent)">${formatMoney(cost)}</strong>
              </div>
            </div>
            ${s.notes ? `<div style="margin-top:8px;font-size:12px;color:var(--text-secondary);
                                     border-top:1px solid var(--border);padding-top:6px">
              ${s.notes}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <!-- ملخص الكتلة -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;
                  padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">عدد المراحل</div>
        <div style="font-size:22px;font-weight:700;color:var(--accent)">${stages.length}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;
                  padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">إجمالي التكلفة التراكمية</div>
        <div style="font-size:18px;font-weight:700;color:var(--success)">${formatMoney(totalCost)}</div>
      </div>
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;
                  padding:12px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">إجمالي الهالك</div>
        <div style="font-size:22px;font-weight:700;color:var(--danger)">
          ${stages.reduce((s, r) => s + (r.wasteQuantity || 0), 0).toFixed(2)}
        </div>
      </div>
    </div>

    <!-- الخط الزمني -->
    <div style="max-height:50vh;overflow-y:auto;padding-left:4px">
      ${timelineItems}
    </div>
  `;
}
