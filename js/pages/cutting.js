// ============================================
// المخازن والكتل والألواح
// ============================================

// ===== الكتل الخام =====
async function renderBlocks() {
  const content = document.getElementById('page-content');
  try {
    const blocks = await api.blocks();
    const inStock   = blocks.filter(b => b.status === 'in_stock').length;
    const inCutting = blocks.filter(b => b.status === 'in_cutting' || b.status === 'تحت التصنيع').length;
    const processed = blocks.filter(b => b.status === 'processed'  || b.status === 'تم تصنيعها').length;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>الكتل الخام</h2><p>إدارة مخزون الكتل الخام الواردة</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportBlocksExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportBlocksPDF()">📄 PDF</button>
          <button class="btn btn-primary" onclick="openNewBlockModal()">＋ كتلة جديدة</button>
        </div>
      </div>
      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي الكتل</div><div class="value">${blocks.length}</div></div>
        <div class="summary-box profit"><div class="label">في المخزن</div><div class="value">${inStock}</div></div>
        <div class="summary-box"><div class="label">تحت التصنيع</div><div class="value">${inCutting}</div></div>
        <div class="summary-box"><div class="label">تم تصنيعها</div><div class="value">${processed}</div></div>
      </div>
      <div class="filters-bar">
        <input type="text" id="blk-search" placeholder="بحث بالكود أو النوع..." oninput="filterBlocks()" style="flex:1">
        <select id="blk-status" onchange="filterBlocks()">
          <option value="">كل الحالات</option>
          <option value="in_stock">في المخزن</option>
          <option value="in_cutting">تحت التصنيع</option>
          <option value="processed">تم تصنيعها</option>
        </select>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الكتلة</th><th>نوع الحجر</th><th>بلد المنشأ</th><th>الوزن (طن)</th>
              <th>الأبعاد (سم)</th><th>التكلفة</th><th>تاريخ الاستلام</th><th>الحالة</th>
            </tr></thead>
            <tbody id="blk-tbody">${renderBlockRows(blocks)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._blocksData = blocks;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderBlockRows(blocks) {
  if (!blocks.length) return `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><div class="empty-icon">🪨</div><h3>لا توجد كتل خام</h3></div></td></tr>`;
  const statusMap = {
    in_stock:         ['badge-success', 'في المخزن'],
    in_cutting:       ['badge-warning', 'تحت التصنيع'],
    processed:        ['badge-gold',    'تم تصنيعها'],
    'في المخزن':      ['badge-success', 'في المخزن'],
    'تحت التصنيع':   ['badge-warning', 'تحت التصنيع'],
    'تم تصنيعها':    ['badge-gold',    'تم تصنيعها'],
  };
  return blocks.map(b => {
    const [cls, label] = statusMap[b.status] || ['badge-info', b.status];
    return `
      <tr>
        <td class="number"><strong>${b.code}</strong></td>
        <td>${b.type}</td>
        <td>${b.origin || '-'}</td>
        <td class="number">${b.weight_tons}</td>
        <td class="number">${b.width} × ${b.height} × ${b.length}</td>
        <td class="number">${formatMoney(b.cost)}</td>
        <td>${formatDate(b.received_date)}</td>
        <td><span class="badge ${cls}">${label}</span></td>
      </tr>
    `;
  }).join('');
}

async function filterBlocks() {
  const search = document.getElementById('blk-search').value;
  const status = document.getElementById('blk-status').value;
  const blocks = await api.blocks({ search, status });
  document.getElementById('blk-tbody').innerHTML = renderBlockRows(blocks);
}

function openNewBlockModal() {
  openModal('إضافة كتلة خام جديدة', `
    <div class="form-grid">
      <div class="form-group"><label>نوع الحجر *</label><input type="text" id="nb-type" placeholder="رخام أبيض كراراني"></div>
      <div class="form-group"><label>بلد المنشأ *</label><input type="text" id="nb-origin" placeholder="إيطاليا / تونس / الهند..."></div>
      <div class="form-group"><label>الوزن (طن)</label><input type="number" id="nb-weight" min="0" step="0.1" value="15"></div>
      <div class="form-group"><label>التكلفة (ج.م)</label><input type="number" id="nb-cost" min="0" value="0"></div>
      <div class="form-group"><label>العرض (سم)</label><input type="number" id="nb-width" min="0" value="260"></div>
      <div class="form-group"><label>الارتفاع (سم)</label><input type="number" id="nb-height" min="0" value="160"></div>
      <div class="form-group"><label>الطول (سم)</label><input type="number" id="nb-length" min="0" value="290"></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveBlock()">💾 حفظ</button>
    </div>
  `);
}

async function saveBlock() {
  const type = document.getElementById('nb-type').value.trim();
  if (!type) { toast('الرجاء إدخال نوع الحجر', 'error'); return; }
  await api.createBlock({
    type, origin: document.getElementById('nb-origin').value,
    weight_tons: parseFloat(document.getElementById('nb-weight').value) || 0,
    cost:   parseFloat(document.getElementById('nb-cost').value) || 0,
    width:  parseFloat(document.getElementById('nb-width').value) || 0,
    height: parseFloat(document.getElementById('nb-height').value) || 0,
    length: parseFloat(document.getElementById('nb-length').value) || 0,
  });
  closeModal();
  toast('تم إضافة الكتلة الخام بنجاح', 'success');
  renderBlocks();
}

// ===== عمليات النشر =====
async function renderCutting() {
  const content = document.getElementById('page-content');
  try {
    const { data: batches } = await api.cuttingBatches();
    const blocks = await api.blocks({ status: 'in_stock' });

    content.innerHTML = `
      <div class="page-header">
        <div><h2>عمليات النشر</h2><p>تتبع دفعات النشر وإنتاج الألواح</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportCuttingExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportCuttingPDF()">📄 PDF</button>
          <button class="btn btn-primary" onclick="openNewCuttingModal()">＋ عملية نشر جديدة</button>
        </div>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الدفعة</th><th>رقم الكتلة</th><th>نوع الحجر</th><th>التاريخ</th><th>المشرف المسؤول</th>
              <th>إجمالي الألواح</th><th>درجة أولى</th><th>درجة ثانية</th><th>الفاقد</th><th>% الفاقد</th><th>الحالة</th>
            </tr></thead>
            <tbody>
              ${batches.length === 0
                ? `<tr><td colspan="11"><div class="empty-state" style="padding:40px"><div class="empty-icon">⚙️</div><h3>لا توجد عمليات نشر</h3></div></td></tr>`
                : batches.map(b => `
                  <tr>
                    <td class="number"><strong>${b.batch_number}</strong></td>
                    <td class="number">${b.block_code}</td>
                    <td>${b.block_type}</td>
                    <td>${formatDate(b.date)}</td>
                    <td>${b.operator || b.supervisor || '-'}</td>
                    <td class="number">${b.slabs_count}</td>
                    <td class="number text-success">${b.grade_a}</td>
                    <td class="number text-warning">${b.grade_b}</td>
                    <td class="number text-danger">${b.waste}</td>
                    <td class="number ${b.waste_percentage > 5 ? 'text-danger' : 'text-success'}">${(b.waste_percentage||0).toFixed(1)}%</td>
                    <td>${statusBadge(b.status)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    window._cuttingData   = batches;
    window._cuttingBlocks = blocks;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function openNewCuttingModal() {
  const blocks = window._cuttingBlocks || [];
  openModal('عملية نشر جديدة', `
    <div class="form-grid">
      <div class="form-group">
        <label>الكتلة الخام *</label>
        <select id="nc-block">
          <option value="">اختر الكتلة</option>
          ${blocks.map(b => `<option value="${b.id}" data-code="${b.code}" data-type="${b.type}">${b.code} - ${b.type}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>التاريخ *</label><input type="date" id="nc-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>المشرف المسؤول</label><input type="text" id="nc-operator" placeholder="اسم المشرف"></div>
      <div class="form-group"><label>المصنع المنفّذ</label><input type="text" id="nc-factory" placeholder="اسم المصنع الخارجي"></div>
      <div class="form-group"><label>تكلفة النشر لكل متر (ج.م)</label><input type="number" id="nc-cost-per-meter" min="0" step="0.01" value="0"></div>
      <div class="form-group"><label>عدد الألواح الكلي</label><input type="number" id="nc-slabs" min="0" value="0"></div>
      <div class="form-group"><label>درجة أولى</label><input type="number" id="nc-grade-a" min="0" value="0"></div>
      <div class="form-group"><label>درجة ثانية</label><input type="number" id="nc-grade-b" min="0" value="0"></div>
      <div class="form-group"><label>درجة ثالثة</label><input type="number" id="nc-grade-c" min="0" value="0"></div>
      <div class="form-group"><label>الفاقد</label><input type="number" id="nc-waste" min="0" value="0"></div>
      <div class="form-group form-full"><label>ملاحظات</label><textarea id="nc-notes"></textarea></div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveCutting()">💾 حفظ</button>
    </div>
  `);
}

async function saveCutting() {
  const blockEl = document.getElementById('nc-block');
  if (!blockEl.value) { toast('الرجاء اختيار الكتلة الخام', 'error'); return; }
  const slabs  = parseInt(document.getElementById('nc-slabs').value) || 0;
  const waste  = parseInt(document.getElementById('nc-waste').value) || 0;
  const wasteP = slabs > 0 ? (waste / slabs * 100) : 0;
  const gradeA = parseInt(document.getElementById('nc-grade-a').value) || 0;
  const gradeB = parseInt(document.getElementById('nc-grade-b').value) || 0;
  const gradeC = parseInt(document.getElementById('nc-grade-c').value) || 0;
  const blockId   = parseInt(blockEl.value);
  const blockCode = blockEl.options[blockEl.selectedIndex].dataset.code;
  const blockType = blockEl.options[blockEl.selectedIndex].dataset.type;
  const date      = document.getElementById('nc-date').value;

  const cut = await api.createCutting({
    block_id:         blockId,
    block_code:       blockCode,
    block_type:       blockType,
    date,
    operator:         document.getElementById('nc-operator').value,
    factory:          document.getElementById('nc-factory').value,
    cost_per_meter:   parseFloat(document.getElementById('nc-cost-per-meter').value) || 0,
    slabs_count:      slabs,
    grade_a:          gradeA,
    grade_b:          gradeB,
    grade_c:          gradeC,
    waste,
    waste_percentage: wasteP,
    notes:            document.getElementById('nc-notes').value,
  });

  // الربط التلقائي
  try {
    updateBlockStatus(blockId, 'تحت التصنيع');
    createSlabsFromCutting({ blockId, slabs_count: slabs, grade_a: gradeA, grade_b: gradeB, grade_c: gradeC, waste, block_type: blockType, cutting_id: cut?.id });
    const totalCost = (parseFloat(document.getElementById('nc-cost-per-meter').value) || 0) * slabs;
    if (totalCost > 0) {
      createAutoJournal({ debit: 'مخزون ألواح', credit: 'مخزون كتل خام', amount: totalCost, ref: cut?.batch_number, date });
    }
  } catch(_) {}

  closeModal();
  toast('تم تسجيل عملية النشر وإنشاء الألواح تلقائياً', 'success');
  renderCutting();
}

// ===== الألواح =====
async function renderSlabs() {
  const content = document.getElementById('page-content');
  try {
    const slabs = await api.slabs();
    const inStock   = slabs.filter(s => s.status === 'in_stock' || s.status === 'متاح').length;
    const reserved  = slabs.filter(s => s.status === 'محجوز').length;
    const shipped   = slabs.filter(s => s.status === 'sold' || s.status === 'تم شحنه').length;
    const totalArea = slabs.filter(s => s.status === 'in_stock' || s.status === 'متاح').reduce((s, sl) => s + sl.area_m2, 0);

    content.innerHTML = `
      <div class="page-header"><div><h2>الألواح</h2><p>مخزون الألواح الناتجة عن عمليات النشر</p></div><div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="exportSlabsExcel()">📊 Excel</button><button class="btn btn-secondary" onclick="exportSlabsPDF()">📄 PDF</button></div></div>
      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي الألواح</div><div class="value">${slabs.length}</div></div>
        <div class="summary-box profit"><div class="label">متاح</div><div class="value">${inStock}</div></div>
        <div class="summary-box"><div class="label">محجوز لأمر تصدير</div><div class="value">${reserved}</div></div>
        <div class="summary-box"><div class="label">تم شحنه</div><div class="value">${shipped}</div></div>
        <div class="summary-box gold"><div class="label">إجمالي المساحة المتاحة</div><div class="value">${totalArea.toFixed(2)} م²</div></div>
      </div>
      <div class="filters-bar">
        <select id="slab-status" onchange="filterSlabs()">
          <option value="">كل الحالات</option>
          <option value="in_stock">متاح</option>
          <option value="محجوز">محجوز</option>
          <option value="sold">تم شحنه</option>
          <option value="waste">الفاقد</option>
        </select>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم اللوح</th><th>الكتلة المصدر</th><th>نوع الحجر</th><th>درجة الجودة</th>
              <th>العرض (سم)</th><th>الارتفاع (سم)</th><th>السماكة (سم)</th><th>المساحة (م²)</th><th>الحالة</th>
            </tr></thead>
            <tbody id="slab-tbody">${renderSlabRows(slabs)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._slabsData = slabs;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderSlabRows(slabs) {
  if (!slabs.length) return `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="empty-icon">▥</div><h3>لا توجد ألواح</h3></div></td></tr>`;
  const gradeClass = {
    'A': 'badge-success', 'درجة أولى':  'badge-success',
    'B': 'badge-info',    'درجة ثانية': 'badge-info',
    'C': 'badge-warning', 'درجة ثالثة': 'badge-warning',
    'D': 'badge-danger',  'مرفوض':      'badge-danger',
  };
  const statusLabel = {
    'in_stock': 'متاح', 'متاح': 'متاح',
    'sold': 'تم شحنه', 'تم شحنه': 'تم شحنه',
    'محجوز': 'محجوز لأمر تصدير',
    'waste': 'الفاقد',
  };
  return slabs.map(s => {
    const grCls   = gradeClass[s.grade] || 'badge-info';
    const stLabel = statusLabel[s.status] || s.status;
    return `
      <tr>
        <td class="number"><strong>${s.code}</strong></td>
        <td class="number">${buildNavLink(s.block_code, 'cutting', s.block_id)}</td>
        <td>${s.type}</td>
        <td><span class="badge ${grCls}">${s.grade}</span></td>
        <td class="number">${s.width}</td>
        <td class="number">${s.height}</td>
        <td class="number">${s.thickness}</td>
        <td class="number"><strong>${(s.area_m2||0).toFixed(2)}</strong></td>
        <td><span class="badge ${s.status === 'محجوز' ? 'badge-warning' : s.status === 'sold' || s.status === 'تم شحنه' ? 'badge-info' : 'badge-success'}">${stLabel}</span></td>
      </tr>
    `;
  }).join('');
}

async function filterSlabs() {
  const status = document.getElementById('slab-status').value;
  const slabs  = await api.slabs({ status });
  document.getElementById('slab-tbody').innerHTML = renderSlabRows(slabs);
}

// ===== تصدير: الكتل الخام =====
function exportBlocksPDF() {
  const blocks = window._blocksData || [];
  const statusLabel = { in_stock: 'في المخزن', in_cutting: 'تحت التصنيع', processed: 'تم تصنيعها' };
  const headers = ['#', 'رقم الكتلة', 'نوع الحجر', 'بلد المنشأ', 'الوزن (طن)', 'التكلفة', 'تاريخ الاستلام', 'الحالة'];
  const rows = blocks.map((b, i) => [i + 1, b.code, (b.type || '').substring(0, 18), b.origin, b.weight_tons, parseFloat(b.cost || 0).toFixed(2) + ' EGP', formatDate(b.received_date), statusLabel[b.status] || b.status]);
  const totalCost = blocks.reduce((s, b) => s + (b.cost || 0), 0);
  exportGenericPDF({ title: 'الكتل الخام', subtitle: 'شركة النخبة للتصدير', headers, rows, totalsRow: ['', '', '', 'الإجمالي', '', totalCost.toFixed(2) + ' EGP', '', ''], filename: `blocks-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportBlocksExcel() {
  const blocks = window._blocksData || [];
  const statusLabel = { in_stock: 'في المخزن', in_cutting: 'تحت التصنيع', processed: 'تم تصنيعها' };
  const headers = ['رقم الكتلة', 'نوع الحجر', 'بلد المنشأ', 'الوزن (طن)', 'العرض (سم)', 'الارتفاع (سم)', 'الطول (سم)', 'التكلفة (EGP)', 'تاريخ الاستلام', 'الحالة'];
  const rows = blocks.map(b => [b.code, b.type, b.origin, b.weight_tons, b.width, b.height, b.length, b.cost || 0, b.received_date, statusLabel[b.status] || b.status]);
  const totalCost = blocks.reduce((s, b) => s + (b.cost || 0), 0);
  exportGenericExcel({ sheetName: 'الكتل الخام', headers, rows, totalsRow: ['الإجمالي', '', '', '', '', '', '', totalCost, '', ''], filename: `blocks-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== تصدير: عمليات النشر =====
function exportCuttingPDF() {
  const batches = window._cuttingData || [];
  const headers = ['#', 'رقم الدفعة', 'رقم الكتلة', 'نوع الحجر', 'التاريخ', 'الكلي', 'درجة أولى', 'درجة ثانية', 'الفاقد', '% الفاقد'];
  const rows = batches.map((b, i) => [i + 1, b.batch_number, b.block_code, (b.block_type || '').substring(0, 16), formatDate(b.date), b.slabs_count, b.grade_a, b.grade_b, b.waste, (b.waste_percentage||0).toFixed(1) + '%']);
  const totalSlabs = batches.reduce((s, b) => s + (b.slabs_count || 0), 0);
  const totalWaste = batches.reduce((s, b) => s + (b.waste || 0), 0);
  exportGenericPDF({ title: 'عمليات النشر', subtitle: 'شركة النخبة للتصدير', headers, rows, totalsRow: ['', '', '', '', 'الإجمالي', totalSlabs, '', '', totalWaste, ''], filename: `cutting-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportCuttingExcel() {
  const batches = window._cuttingData || [];
  const headers = ['رقم الدفعة', 'رقم الكتلة', 'نوع الحجر', 'التاريخ', 'المشرف المسؤول', 'إجمالي الألواح', 'درجة أولى', 'درجة ثانية', 'الفاقد', '% الفاقد'];
  const rows = batches.map(b => [b.batch_number, b.block_code, b.block_type, b.date, b.operator || b.supervisor || '', b.slabs_count, b.grade_a, b.grade_b, b.waste, b.waste_percentage]);
  const totalSlabs = batches.reduce((s, b) => s + (b.slabs_count || 0), 0);
  const totalWaste = batches.reduce((s, b) => s + (b.waste || 0), 0);
  exportGenericExcel({ sheetName: 'عمليات النشر', headers, rows, totalsRow: ['الإجمالي', '', '', '', '', totalSlabs, '', '', totalWaste, ''], filename: `cutting-${new Date().toISOString().split('T')[0]}.xlsx` });
}

// ===== تصدير: الألواح =====
function exportSlabsPDF() {
  const slabs = window._slabsData || [];
  const statusLabel = { in_stock: 'متاح', 'متاح': 'متاح', sold: 'تم شحنه', 'تم شحنه': 'تم شحنه', 'محجوز': 'محجوز', waste: 'الفاقد' };
  const headers = ['#', 'رقم اللوح', 'الكتلة المصدر', 'نوع الحجر', 'درجة الجودة', 'العرض', 'الارتفاع', 'المساحة (م²)', 'الحالة'];
  const rows = slabs.map((s, i) => [i + 1, s.code, s.block_code, (s.type || '').substring(0, 16), s.grade, s.width, s.height, (s.area_m2||0).toFixed(2), statusLabel[s.status] || s.status]);
  const totalArea = slabs.filter(s => s.status === 'in_stock' || s.status === 'متاح').reduce((sum, s) => sum + (s.area_m2||0), 0);
  exportGenericPDF({ title: 'الألواح', subtitle: 'شركة النخبة للتصدير', headers, rows, totalsRow: ['', '', '', '', '', '', 'المتاح', totalArea.toFixed(2) + ' م²', ''], filename: `slabs-${new Date().toISOString().split('T')[0]}.pdf` });
}

function exportSlabsExcel() {
  const slabs = window._slabsData || [];
  const statusLabel = { in_stock: 'متاح', 'متاح': 'متاح', sold: 'تم شحنه', 'تم شحنه': 'تم شحنه', 'محجوز': 'محجوز', waste: 'الفاقد' };
  const headers = ['رقم اللوح', 'الكتلة المصدر', 'نوع الحجر', 'درجة الجودة', 'العرض (سم)', 'الارتفاع (سم)', 'السماكة (سم)', 'المساحة (م²)', 'الحالة'];
  const rows = slabs.map(s => [s.code, s.block_code, s.type, s.grade, s.width, s.height, s.thickness, s.area_m2||0, statusLabel[s.status] || s.status]);
  const totalArea = slabs.filter(s => s.status === 'in_stock' || s.status === 'متاح').reduce((sum, s) => sum + (s.area_m2||0), 0);
  exportGenericExcel({ sheetName: 'الألواح', headers, rows, totalsRow: ['', '', '', '', '', '', 'المتاح (م²)', totalArea, ''], filename: `slabs-${new Date().toISOString().split('T')[0]}.xlsx` });
}
