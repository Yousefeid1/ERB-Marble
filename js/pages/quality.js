// ============================================
// وحدة إدارة الجودة — نظام ERP الرخام والجرانيت
// Module 4: إدارة الجودة
// ============================================

'use strict';

// ===== معاملات تسعير درجات الجودة الافتراضية =====
const GRADE_MULTIPLIERS_DEFAULT = { A: 1.00, B: 0.75, C: 0.50, D: 0.00 };

// ===== تسميات درجات الجودة بالعربية =====
const GRADE_LABELS = { A: 'درجة أولى', B: 'درجة ثانية', C: 'درجة ثالثة', D: 'مرفوض' };

/** استرجاع معاملات الجودة من قاعدة البيانات أو القيم الافتراضية */
function getGradeMultipliers() {
  return DB.get('grade_multipliers') || { ...GRADE_MULTIPLIERS_DEFAULT };
}

/** حساب السعر بعد تطبيق معامل درجة الجودة */
function calcPriceByGrade(basePrice, grade) {
  const multipliers = getGradeMultipliers();
  return (parseFloat(basePrice) || 0) * (multipliers[grade] ?? 1);
}

// ===== معالجة الصور =====

/** ضغط صورة وتصغيرها للرفع المحلي */
async function compressImage(file, maxWidth, quality) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = URL.createObjectURL(file);
  });
}

/** رفع صور اللوح مع الضغط التلقائي (بحد أقصى 5 صور) */
async function uploadSlabImages(files) {
  const images = [];
  for (const file of Array.from(files).slice(0, 5)) {
    if (file.size > 1024 * 1024) {
      // ضغط الصور الكبيرة تلقائياً
      const compressed = await compressImage(file, 800, 0.7);
      images.push(compressed);
    } else {
      images.push(await new Promise(resolve => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(file);
      }));
    }
  }
  return images;
}

// ===== سلة المشتريات =====

/** إضافة سجل جودة إلى السلة */
function addToQualityCart(recordId) {
  if (!window._qualityCart) window._qualityCart = [];
  const records = DB.getAll('quality_records');
  const record  = records.find(r => r.id === parseInt(recordId));
  if (!record) return;

  if (window._qualityCart.find(item => item.id === record.id)) {
    toast('هذا اللوح موجود في السلة مسبقاً', 'warning');
    return;
  }

  window._qualityCart.push({ ...record });
  toast(`تمت إضافة ${record.slabCode} إلى السلة`, 'success');
  _updateQualityCartSummary();
}

/** إزالة عنصر من السلة */
function removeFromQualityCart(recordId) {
  if (!window._qualityCart) window._qualityCart = [];
  window._qualityCart = window._qualityCart.filter(item => item.id !== parseInt(recordId));
  _updateQualityCartSummary();
}

/** تحديث شريط ملخص السلة */
function _updateQualityCartSummary() {
  const cartEl = document.getElementById('quality-cart-summary');
  if (!cartEl) return;
  const cart = window._qualityCart || [];

  if (cart.length === 0) {
    cartEl.style.display = 'none';
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.costByGrade || 0), 0);
  cartEl.style.display = 'flex';
  const countEl = document.getElementById('quality-cart-count');
  const totalEl = document.getElementById('quality-cart-total');
  if (countEl) countEl.textContent = cart.length;
  if (totalEl) totalEl.textContent = formatMoney(total);
}

/** فتح نافذة إنشاء فاتورة من السلة */
function createInvoiceFromCart() {
  const cart = window._qualityCart || [];
  if (!cart.length) { toast('السلة فارغة', 'warning'); return; }

  const total = cart.reduce((sum, item) => sum + (item.costByGrade || 0), 0);

  openModal('إنشاء فاتورة من سلة الجودة', `
    <div class="data-table-wrapper" style="margin-bottom:16px">
      <table>
        <thead>
          <tr>
            <th>الكود</th><th>الجودة</th><th>المساحة (م²)</th><th>السعر</th><th></th>
          </tr>
        </thead>
        <tbody id="cart-modal-tbody">
          ${_renderCartModalRows(cart)}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px;background:var(--bg-input);border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between">
      <span style="font-weight:600">إجمالي الفاتورة:</span>
      <strong style="color:var(--accent)">${formatMoney(total)}</strong>
    </div>
    <div class="form-group">
      <label>اسم العميل *</label>
      <input type="text" id="cart-customer-name" placeholder="أدخل اسم العميل أو الشركة">
    </div>
    <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="confirmQualityInvoice()">💾 تأكيد إنشاء الفاتورة</button>
    </div>
  `);
}

/** رسم صفوف جدول سلة المودال */
function _renderCartModalRows(cart) {
  if (!cart.length) return `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">السلة فارغة</td></tr>`;
  return cart.map(item => `
    <tr>
      <td><strong>${item.slabCode || '-'}</strong></td>
      <td>
        <span style="background:${_qualityGradeColor(item.qualityGrade)};color:#fff;padding:2px 8px;border-radius:10px;font-weight:700">
          ${item.qualityGrade || '-'}
        </span>
      </td>
      <td class="number">${(item.areaM2 || 0).toFixed(2)} م²</td>
      <td class="number" style="color:var(--accent)">${formatMoney(item.costByGrade || 0)}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="removeFromCartModal(${item.id})">✕</button>
      </td>
    </tr>
  `).join('');
}

/** إزالة عنصر من السلة عبر مودال الفاتورة */
function removeFromCartModal(recordId) {
  removeFromQualityCart(recordId);
  const cart  = window._qualityCart || [];
  const total = cart.reduce((sum, item) => sum + (item.costByGrade || 0), 0);
  const tbody = document.getElementById('cart-modal-tbody');
  if (tbody) tbody.innerHTML = _renderCartModalRows(cart);
  // تحديث الإجمالي
  const totalEls = document.querySelectorAll('#cart-modal-tbody').length
    ? document.querySelectorAll('[data-cart-total]')
    : [];
  // إعادة رسم الإجمالي إذا تغيّر
  const totalDisplay = document.querySelector('[data-cart-total-display]');
  if (totalDisplay) totalDisplay.textContent = formatMoney(total);
}

/** تأكيد إنشاء الفاتورة من السلة */
async function confirmQualityInvoice() {
  const customerEl = document.getElementById('cart-customer-name');
  const customer   = customerEl?.value?.trim();
  if (!customer) { toast('الرجاء إدخال اسم العميل', 'error'); return; }

  const cart = window._qualityCart || [];
  if (!cart.length) { toast('السلة فارغة', 'warning'); return; }

  const items    = cart.map(item => ({
    product:    item.slabCode,
    qty:        1,
    unit_price: item.costByGrade || 0,
    subtotal:   item.costByGrade || 0,
  }));
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const tax      = subtotal * 0.14;

  try {
    await api.createSale({
      customer_id:      null,
      customer,
      invoice_date:     new Date().toISOString().split('T')[0],
      due_date:         new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status:           'draft',
      currency:         'EGP',
      negotiated_price: null,
      items, subtotal, tax, total_amount: subtotal + tax, paid_amount: 0,
      notes: 'فاتورة صادرة من وحدة إدارة الجودة',
    });

    // تحديث حالة الألواح المباعة إلى "مباعة"
    cart.forEach(item => {
      const rec = DB.findById('quality_records', item.id);
      if (rec) _saveQualityRecordDirect({ ...rec, status: 'sold' });
    });

    window._qualityCart = [];
    closeModal();
    toast('تم إنشاء الفاتورة بنجاح وتحديث حالة الألواح', 'success');
    renderQuality();
  } catch (e) {
    toast(e.message || 'حدث خطأ أثناء إنشاء الفاتورة', 'error');
  }
}

// ===== الدالة الرئيسية =====

/** الدالة الرئيسية لتهيئة وعرض صفحة إدارة الجودة */
async function renderQuality() {
  if (!window._qualityCart) window._qualityCart = [];

  const content = document.getElementById('page-content');
  const records = DB.getAll('quality_records');
  const blocks  = DB.getAll('blocks');

  // ===== حساب مؤشرات الأداء الرئيسية =====
  const totalRecords = records.length;
  const gradeA  = records.filter(r => r.qualityGrade === 'A').length;
  const gradeB  = records.filter(r => r.qualityGrade === 'B').length;
  const gradeC  = records.filter(r => r.qualityGrade === 'C').length;
  const gradeD  = records.filter(r => r.qualityGrade === 'D').length;
  const inStock = records.filter(r => r.status === 'in_stock').length;
  const totalArea = records.reduce((sum, r) => sum + (r.areaM2 || 0), 0);
  const totalValue = records
    .filter(r => r.status === 'in_stock')
    .reduce((sum, r) => sum + (r.costByGrade || 0), 0);

  content.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="page-header">
      <div>
        <h2>إدارة الجودة</h2>
        <p>فحص وتصنيف وتسعير ألواح الرخام والجرانيت</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openQualityModal()">＋ سجل جودة جديد</button>
      </div>
    </div>

    <!-- مؤشرات الأداء الرئيسية -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">إجمالي السجلات</div>
        <div class="kpi-value">${totalRecords}</div>
        <div class="kpi-sub">لوح مسجل في النظام</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">درجة أولى (A)</div>
        <div class="kpi-value">${gradeA}</div>
        <div class="kpi-sub">${totalRecords ? ((gradeA / totalRecords) * 100).toFixed(1) : 0}% من الإجمالي</div>
      </div>
      <div class="kpi-card gold">
        <div class="kpi-label">المخزون المتاح</div>
        <div class="kpi-value">${inStock}</div>
        <div class="kpi-sub">${totalArea.toFixed(1)} م² إجمالي المساحة</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">قيمة المخزون</div>
        <div class="kpi-value" style="font-size:18px">${formatMoney(totalValue)}</div>
        <div class="kpi-sub">بعد تطبيق معاملات الجودة</div>
      </div>
    </div>

    <!-- شريط التبويبات -->
    <div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border-color)">
      <button id="qtab-btn-cards"
        onclick="showQualityTab('cards')"
        style="padding:12px 20px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:14px;color:var(--accent);border-bottom:3px solid var(--accent);margin-bottom:-2px;font-weight:600;transition:all 0.2s">
        🃏 بطاقات الجودة
      </button>
      <button id="qtab-btn-list"
        onclick="showQualityTab('list')"
        style="padding:12px 20px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:14px;color:var(--text-secondary);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s">
        📋 قائمة السجلات
      </button>
      <button id="qtab-btn-report"
        onclick="showQualityTab('report')"
        style="padding:12px 20px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:14px;color:var(--text-secondary);border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s">
        📊 تقرير الجودة
      </button>
    </div>

    <!-- شريط السلة -->
    <div id="quality-cart-summary"
      style="display:none;align-items:center;gap:12px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--accent);border-radius:8px;margin-bottom:16px;flex-wrap:wrap">
      <span>🛒 <strong>السلة:</strong></span>
      <strong id="quality-cart-count" style="color:var(--accent)">0</strong>
      <span>عنصر</span>
      <span style="color:var(--border-color)">|</span>
      <span>الإجمالي:</span>
      <strong id="quality-cart-total" style="color:var(--accent)">0.00 EGP</strong>
      <div style="margin-right:auto;display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" onclick="createInvoiceFromCart()">🧾 إنشاء فاتورة</button>
        <button class="btn btn-secondary btn-sm" onclick="window._qualityCart=[];_updateQualityCartSummary()">🗑 إفراغ السلة</button>
      </div>
    </div>

    <!-- محتوى تبويب 1: البطاقات -->
    <div id="quality-tab-cards">
      ${_buildQualityCardsTab(records)}
    </div>

    <!-- محتوى تبويب 2: القائمة -->
    <div id="quality-tab-list" style="display:none">
      ${_buildQualityListTab(records)}
    </div>

    <!-- محتوى تبويب 3: التقرير -->
    <div id="quality-tab-report" style="display:none">
      ${_buildQualityReportTab(records)}
    </div>
  `;

  // حفظ البيانات للفلترة اللاحقة
  window._qualityRecords = records;
  window._qualityBlocks  = blocks;

  // تحديث شريط السلة
  _updateQualityCartSummary();
}

// ===== تبديل التبويبات =====

/** إظهار التبويب المحدد وإخفاء الباقي */
function showQualityTab(tab) {
  ['cards', 'list', 'report'].forEach(t => {
    const el  = document.getElementById(`quality-tab-${t}`);
    const btn = document.getElementById(`qtab-btn-${t}`);
    if (el)  el.style.display  = 'none';
    if (btn) {
      btn.style.color        = 'var(--text-secondary)';
      btn.style.borderBottom = '3px solid transparent';
      btn.style.fontWeight   = '400';
    }
  });

  const activeEl  = document.getElementById(`quality-tab-${tab}`);
  const activeBtn = document.getElementById(`qtab-btn-${tab}`);
  if (activeEl)  activeEl.style.display  = 'block';
  if (activeBtn) {
    activeBtn.style.color        = 'var(--accent)';
    activeBtn.style.borderBottom = '3px solid var(--accent)';
    activeBtn.style.fontWeight   = '600';
  }

  // رسم مخطط الجودة عند فتح تبويب التقرير
  if (tab === 'report') setTimeout(_drawQualityPieChart, 80);
}

// ===== مساعد لون درجة الجودة =====
function _qualityGradeColor(grade) {
  return { A: '#4caf50', B: '#2196f3', C: '#ff9800', D: '#f44336' }[grade] || '#8892aa';
}

/** التحقق من أن مصدر الصورة هو data URI آمن للصور فقط — رفض أي مصادر خارجية */
function _safeImgSrc(src) {
  if (typeof src !== 'string') return '';
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(src) ? src : '';
}


// ============================================================
// التبويب الأول: بطاقات الجودة (Grid View)
// ============================================================

/** بناء HTML لتبويب البطاقات كاملاً */
function _buildQualityCardsTab(records) {
  // استخراج قيم الفلاتر الفريدة من السجلات الحالية
  const colors      = [...new Set(records.map(r => r.color).filter(Boolean))];
  const warehouses  = [...new Set(records.map(r => r.warehouse).filter(Boolean))];
  const countries   = [...new Set(records.map(r => r.countryOfOrigin).filter(Boolean))];
  const thicknesses = [...new Set(records.map(r => r.thickness).filter(t => t))].sort((a, b) => a - b);

  return `
    <!-- شريط الفلاتر المتعددة -->
    <div class="filters-bar" style="flex-wrap:wrap;gap:8px;align-items:center">
      <input type="text" id="qcard-search"
        placeholder="🔍 بحث بالكود أو اللون أو الملاحظات..."
        oninput="filterQualityCards()"
        style="flex:1;min-width:200px">
      <select id="qcard-grade" onchange="filterQualityCards()">
        <option value="">كل درجات الجودة</option>
        <option value="A">A — درجة أولى</option>
        <option value="B">B — درجة ثانية</option>
        <option value="C">C — درجة ثالثة</option>
        <option value="D">D — مرفوض</option>
      </select>
      <select id="qcard-color" onchange="filterQualityCards()">
        <option value="">كل الألوان</option>
        ${colors.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="qcard-finish" onchange="filterQualityCards()">
        <option value="">كل الفنشات</option>
        <option value="بوليش">بوليش</option>
        <option value="مسطح">مسطح</option>
        <option value="حبيبي">حبيبي</option>
        <option value="فرشاة">فرشاة</option>
        <option value="أنتيكا">أنتيكا</option>
      </select>
      <select id="qcard-thickness" onchange="filterQualityCards()">
        <option value="">كل السماكات</option>
        ${thicknesses.map(t => `<option value="${t}">${t} سم</option>`).join('')}
      </select>
      <select id="qcard-warehouse" onchange="filterQualityCards()">
        <option value="">كل المستودعات</option>
        ${warehouses.map(w => `<option value="${w}">${w}</option>`).join('')}
      </select>
      <select id="qcard-country" onchange="filterQualityCards()">
        <option value="">كل بلدان المنشأ</option>
        ${countries.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="qcard-status" onchange="filterQualityCards()">
        <option value="">كل الحالات</option>
        <option value="in_stock">في المخزن</option>
        <option value="sold">مباعة</option>
        <option value="reserved">محجوزة</option>
      </select>
    </div>

    <!-- شبكة البطاقات -->
    <div id="quality-cards-grid"
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:16px">
      ${_renderCardItems(records)}
    </div>
  `;
}

/** رسم عناصر بطاقات الجودة */
function _renderCardItems(records) {
  if (!records.length) {
    return `
      <div class="empty-state" style="grid-column:1/-1;padding:60px 20px">
        <div class="empty-icon">🪨</div>
        <h3>لا توجد سجلات جودة</h3>
        <p>أضف سجل جودة جديد للبدء</p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="openQualityModal()">＋ إضافة أول سجل</button>
      </div>
    `;
  }

  return records.map(r => {
    const gradeColor = _qualityGradeColor(r.qualityGrade);
    const statusInfo = {
      in_stock: { color: '#4caf50', label: 'في المخزن' },
      sold:     { color: '#2196f3', label: 'مباعة' },
      reserved: { color: '#ff9800', label: 'محجوزة' },
    }[r.status] || { color: '#8892aa', label: r.status || '-' };

    // صورة اللوح أو أيقونة افتراضية (يتم التحقق من صحة المصدر قبل العرض)
    const _firstImg = _safeImgSrc(r.images && r.images.length ? r.images[0] : '');
    const imgHTML = _firstImg
      ? `<img src="${_firstImg}"
            style="width:100%;height:160px;object-fit:cover;border-radius:8px 8px 0 0"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            loading="lazy">
         <div style="display:none;height:160px;background:var(--bg-input);border-radius:8px 8px 0 0;align-items:center;justify-content:center;font-size:48px">🪨</div>`
      : `<div style="height:160px;background:var(--bg-input);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:48px">🪨</div>`;

    const isAvailable = r.status === 'in_stock';

    return `
      <div class="card" style="padding:0;overflow:hidden;cursor:default;transition:transform 0.2s,box-shadow 0.2s"
        onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.25)'"
        onmouseout="this.style.transform='';this.style.boxShadow=''">
        <!-- صورة اللوح مع شارات الجودة والحالة -->
        <div style="position:relative">
          ${imgHTML}
          <span style="position:absolute;top:8px;right:8px;background:${gradeColor};color:#fff;
            padding:4px 12px;border-radius:20px;font-weight:800;font-size:15px;
            box-shadow:0 2px 6px rgba(0,0,0,0.3)">
            ${r.qualityGrade || '?'}
          </span>
          <span style="position:absolute;top:8px;left:8px;background:${statusInfo.color};color:#fff;
            padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600">
            ${statusInfo.label}
          </span>
          ${r.images && r.images.length > 1
            ? `<span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.6);color:#fff;
                padding:2px 6px;border-radius:8px;font-size:11px">📷 ${r.images.length}</span>`
            : ''}
        </div>
        <!-- تفاصيل البطاقة -->
        <div style="padding:12px 14px">
          <div style="font-size:15px;font-weight:700;margin-bottom:4px;color:var(--text-primary)">
            ${r.slabCode || '-'}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">
            ${[r.color, r.colorIntensity, r.finish].filter(Boolean).join(' · ') || '-'}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px">
            <span>📏 ${r.length || '-'} × ${r.width || '-'} × ${r.thickness || '-'} سم</span>
            <span>📐 ${(r.areaM2 || 0).toFixed(2)} م²</span>
          </div>
          ${r.countryOfOrigin
            ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">🌍 ${r.countryOfOrigin}</div>`
            : ''}
          ${r.warehouse
            ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">🏭 ${r.warehouse}</div>`
            : ''}
          <div style="font-size:15px;font-weight:700;color:var(--accent);margin-bottom:10px">
            ${formatMoney(r.costByGrade || 0)}
            ${r.basePrice && r.basePrice !== r.costByGrade
              ? `<span style="font-size:11px;color:var(--text-muted);font-weight:400;margin-right:6px">
                  (أساسي: ${formatMoney(r.basePrice)})
                 </span>`
              : ''}
          </div>
          <!-- أزرار الإجراءات -->
          <div style="display:flex;gap:6px">
            <button class="btn btn-secondary btn-sm" style="flex:1;font-size:12px"
              onclick="openQualityModal(${r.id})">✏️ تعديل</button>
            ${isAvailable
              ? `<button class="btn btn-primary btn-sm" style="flex:1;font-size:12px"
                  onclick="addToQualityCart(${r.id})">🛒 للسلة</button>`
              : `<button class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;opacity:0.5" disabled>
                  ${statusInfo.label}
                 </button>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/** تطبيق الفلاتر على بطاقات الجودة */
function filterQualityCards() {
  const search    = (document.getElementById('qcard-search')?.value    || '').toLowerCase();
  const grade     =  document.getElementById('qcard-grade')?.value     || '';
  const color     =  document.getElementById('qcard-color')?.value     || '';
  const finish    =  document.getElementById('qcard-finish')?.value    || '';
  const thickness =  document.getElementById('qcard-thickness')?.value || '';
  const warehouse =  document.getElementById('qcard-warehouse')?.value || '';
  const country   =  document.getElementById('qcard-country')?.value   || '';
  const status    =  document.getElementById('qcard-status')?.value    || '';

  let records = window._qualityRecords || [];

  if (search)    records = records.filter(r =>
    (r.slabCode  || '').toLowerCase().includes(search) ||
    (r.color     || '').toLowerCase().includes(search) ||
    (r.notes     || '').toLowerCase().includes(search) ||
    (r.defects   || '').toLowerCase().includes(search)
  );
  if (grade)     records = records.filter(r => r.qualityGrade === grade);
  if (color)     records = records.filter(r => r.color === color);
  if (finish)    records = records.filter(r => r.finish === finish);
  if (thickness) records = records.filter(r => String(r.thickness) === String(thickness));
  if (warehouse) records = records.filter(r => r.warehouse === warehouse);
  if (country)   records = records.filter(r => r.countryOfOrigin === country);
  if (status)    records = records.filter(r => r.status === status);

  const grid = document.getElementById('quality-cards-grid');
  if (grid) grid.innerHTML = _renderCardItems(records);
}

// ============================================================
// التبويب الثاني: قائمة سجلات الجودة (Table View)
// ============================================================

/** بناء HTML لتبويب القائمة كاملاً */
function _buildQualityListTab(records) {
  return `
    <!-- شريط الفلاتر -->
    <div class="filters-bar">
      <input type="text" id="qlist-search"
        placeholder="🔍 بحث بالكود أو الفاحص أو المستودع..."
        oninput="filterQualityList()"
        style="flex:1;min-width:200px">
      <select id="qlist-grade" onchange="filterQualityList()">
        <option value="">كل الجودات</option>
        <option value="A">A — درجة أولى</option>
        <option value="B">B — درجة ثانية</option>
        <option value="C">C — درجة ثالثة</option>
        <option value="D">D — مرفوض</option>
      </select>
      <select id="qlist-status" onchange="filterQualityList()">
        <option value="">كل الحالات</option>
        <option value="in_stock">في المخزن</option>
        <option value="sold">مباعة</option>
        <option value="reserved">محجوزة</option>
      </select>
    </div>

    <!-- جدول السجلات -->
    <div class="card" style="padding:0;margin-top:12px">
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th onclick="sortQualityList('slabCode')" style="cursor:pointer;user-select:none">الكود ↕</th>
              <th onclick="sortQualityList('qualityGrade')" style="cursor:pointer;user-select:none">الجودة ↕</th>
              <th>اللون / الفنش</th>
              <th onclick="sortQualityList('areaM2')" style="cursor:pointer;user-select:none">المساحة ↕</th>
              <th>السماكة</th>
              <th>المستودع</th>
              <th onclick="sortQualityList('costByGrade')" style="cursor:pointer;user-select:none">السعر ↕</th>
              <th>الحالة</th>
              <th onclick="sortQualityList('inspectionDate')" style="cursor:pointer;user-select:none">تاريخ الفحص ↕</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody id="quality-list-tbody">
            ${_renderListRows(records)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/** رسم صفوف جدول القائمة */
function _renderListRows(records) {
  if (!records.length) {
    return `<tr><td colspan="10">
      <div class="empty-state" style="padding:40px">
        <div class="empty-icon">📋</div>
        <h3>لا توجد سجلات</h3>
      </div>
    </td></tr>`;
  }

  return records.map(r => `
    <tr>
      <td>
        <strong>${r.slabCode || '-'}</strong>
        ${r.images && r.images.length
          ? `<span style="margin-right:4px;font-size:11px;color:var(--text-muted)">📷${r.images.length}</span>`
          : ''}
      </td>
      <td>
        <span style="background:${_qualityGradeColor(r.qualityGrade)};color:#fff;
          padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px">
          ${r.qualityGrade || '-'}
        </span>
      </td>
      <td>${[r.color, r.finish].filter(Boolean).join(' / ') || '-'}</td>
      <td class="number">${(r.areaM2 || 0).toFixed(2)} م²</td>
      <td>${r.thickness ? r.thickness + ' سم' : '-'}</td>
      <td>${r.warehouse || '-'}</td>
      <td class="number" style="color:var(--accent);font-weight:600">${formatMoney(r.costByGrade || 0)}</td>
      <td>${_qualityStatusBadge(r.status)}</td>
      <td>${formatDate(r.inspectionDate)}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="openQualityModal(${r.id})">تعديل</button>
          <button class="btn btn-secondary btn-sm" onclick="showQualityQR(${r.id})">QR</button>
          <button class="btn btn-danger btn-sm" onclick="deleteQualityRecord(${r.id})">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/** شارة الحالة الخاصة بسجلات الجودة */
function _qualityStatusBadge(status) {
  const map = {
    in_stock: ['badge-success', 'في المخزن'],
    sold:     ['badge-info',    'مباعة'],
    reserved: ['badge-warning', 'محجوزة'],
    rejected: ['badge-danger',  'مرفوض — معزول'],
  };
  const [cls, label] = map[status] || ['badge-info', status || '-'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// متغيرات الترتيب
let _qualityListSortField = 'slabCode';
let _qualityListSortDir   = 1;

/** ترتيب قائمة السجلات بحقل محدد */
function sortQualityList(field) {
  _qualityListSortDir = (_qualityListSortField === field) ? _qualityListSortDir * -1 : 1;
  _qualityListSortField = field;

  const records = [...(window._qualityRecords || [])].sort((a, b) => {
    const av = a[field] ?? '';
    const bv = b[field] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * _qualityListSortDir;
    return String(av).localeCompare(String(bv), 'ar') * _qualityListSortDir;
  });

  const tbody = document.getElementById('quality-list-tbody');
  if (tbody) tbody.innerHTML = _renderListRows(records);
}

/** تصفية القائمة */
function filterQualityList() {
  const search = (document.getElementById('qlist-search')?.value || '').toLowerCase();
  const grade  =  document.getElementById('qlist-grade')?.value  || '';
  const status =  document.getElementById('qlist-status')?.value || '';

  let records = window._qualityRecords || [];

  if (search)  records = records.filter(r =>
    (r.slabCode    || '').toLowerCase().includes(search) ||
    (r.color       || '').toLowerCase().includes(search) ||
    (r.warehouse   || '').toLowerCase().includes(search) ||
    (r.inspectedBy || '').toLowerCase().includes(search)
  );
  if (grade)  records = records.filter(r => r.qualityGrade === grade);
  if (status) records = records.filter(r => r.status === status);

  const tbody = document.getElementById('quality-list-tbody');
  if (tbody) tbody.innerHTML = _renderListRows(records);
}

// ============================================================
// التبويب الثالث: تقرير الجودة
// ============================================================

/** بناء HTML لتبويب التقرير كاملاً */
function _buildQualityReportTab(records) {
  const multipliers = getGradeMultipliers();

  // ===== إحصائيات توزيع الجودة حسب اللون =====
  const typeStats = {};
  records.forEach(r => {
    const key = r.color || 'غير محدد';
    if (!typeStats[key]) typeStats[key] = { A: 0, B: 0, C: 0, D: 0, total: 0, totalArea: 0 };
    if (['A', 'B', 'C', 'D'].includes(r.qualityGrade)) typeStats[key][r.qualityGrade]++;
    typeStats[key].total++;
    typeStats[key].totalArea += r.areaM2 || 0;
  });

  const typeRows = Object.entries(typeStats).map(([type, s]) => `
    <tr>
      <td><strong>${type}</strong></td>
      <td style="color:#4caf50;font-weight:600;text-align:center">${s.A}</td>
      <td style="color:#2196f3;font-weight:600;text-align:center">${s.B}</td>
      <td style="color:#ff9800;font-weight:600;text-align:center">${s.C}</td>
      <td style="color:#f44336;font-weight:600;text-align:center">${s.D}</td>
      <td style="text-align:center">${s.total}</td>
      <td style="text-align:center">${s.totalArea.toFixed(2)} م²</td>
      <td style="text-align:center;font-weight:600">
        ${s.total ? ((s.A / s.total) * 100).toFixed(1) + '%' : '-'}
      </td>
    </tr>
  `).join('');

  // ===== إحصائيات ملخص درجات الجودة =====
  const total = records.length;
  const gradeStats = ['A', 'B', 'C', 'D'].map(g => {
    const count = records.filter(r => r.qualityGrade === g).length;
    const value = records
      .filter(r => r.qualityGrade === g && r.status !== 'rejected')
      .reduce((sum, r) => sum + (r.costByGrade || 0), 0);
    const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    return { g, label: GRADE_LABELS[g], count, pct, value };
  });
  const totalValue = gradeStats.reduce((sum, s) => sum + s.value, 0);

  const gradeSummaryRows = gradeStats.map(s => `
    <tr>
      <td>
        <span style="background:${_qualityGradeColor(s.g)};color:#fff;
          padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px;margin-left:6px">${s.g}</span>
        ${s.label}
      </td>
      <td style="text-align:center;font-weight:600">${s.count}</td>
      <td style="text-align:center">${s.pct}%</td>
      <td class="number" style="color:var(--accent);font-weight:600">${formatMoney(s.value)}</td>
    </tr>
  `).join('');

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- مخطط توزيع درجات الجودة -->
      <div class="card">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:700">📊 توزيع درجات الجودة</h3>
        ${records.length
          ? `<div style="position:relative;max-width:320px;margin:0 auto">
               <canvas id="quality-grade-chart"></canvas>
             </div>`
          : `<div class="empty-state" style="padding:40px">
               <div class="empty-icon">📊</div>
               <p>لا توجد بيانات كافية لعرض المخطط</p>
             </div>`}
      </div>

      <!-- إعدادات معاملات التسعير -->
      <div class="card">
        <h3 style="margin:0 0 8px;font-size:15px;font-weight:700">⚙️ معاملات تسعير درجات الجودة</h3>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">
          تحديد نسبة السعر الأساسي المطبقة على كل درجة جودة
          (مثال: A=1.00 → 100% درجة أولى | B=0.75 → 75% درجة ثانية | C=0.50 → 50% درجة ثالثة | D=0.00 → 0% مرفوض)
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="form-group">
            <label style="color:#4caf50;font-weight:700">🟢 درجة أولى (A) — 100%</label>
            <input type="number" id="gm-A" value="${multipliers.A}"
              min="0" max="5" step="0.05"
              style="border-color:#4caf50"
              placeholder="1.00">
          </div>
          <div class="form-group">
            <label style="color:#2196f3;font-weight:700">🔵 درجة ثانية (B) — 75%</label>
            <input type="number" id="gm-B" value="${multipliers.B}"
              min="0" max="5" step="0.05"
              style="border-color:#2196f3"
              placeholder="0.75">
          </div>
          <div class="form-group">
            <label style="color:#ff9800;font-weight:700">🟠 درجة ثالثة (C) — 50%</label>
            <input type="number" id="gm-C" value="${multipliers.C}"
              min="0" max="5" step="0.05"
              style="border-color:#ff9800"
              placeholder="0.50">
          </div>
          <div class="form-group">
            <label style="color:#f44336;font-weight:700">🔴 مرفوض (D) — 0%</label>
            <input type="number" id="gm-D" value="${multipliers.D}"
              min="0" max="5" step="0.05"
              style="border-color:#f44336"
              placeholder="0.25">
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveGradeMultipliers()">💾 حفظ المعاملات</button>
      </div>
    </div>

    <!-- جدول توزيع الجودة حسب اللون / النوع -->
    <div class="card" style="padding:0">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border-color)">
        <h3 style="margin:0;font-size:15px;font-weight:700">📋 توزيع الجودة حسب اللون / النوع</h3>
      </div>
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>اللون / النوع</th>
              <th style="color:#4caf50;text-align:center">عدد A</th>
              <th style="color:#2196f3;text-align:center">عدد B</th>
              <th style="color:#ff9800;text-align:center">عدد C</th>
              <th style="color:#f44336;text-align:center">عدد D</th>
              <th style="text-align:center">الإجمالي</th>
              <th style="text-align:center">المساحة الكلية</th>
              <th style="text-align:center">نسبة A</th>
            </tr>
          </thead>
          <tbody>
            ${typeRows ||
              `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">
                لا توجد بيانات
              </td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ===== جدول ملخص درجات الجودة ===== -->
    <div class="card" style="padding:0" id="quality-grade-report">
      <div style="padding:14px 16px;border-bottom:1px solid var(--border-color)">
        <h3 style="margin:0;font-size:15px;font-weight:700">📊 ملخص درجات الجودة</h3>
      </div>
      <div class="data-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>درجة الجودة</th>
              <th style="text-align:center">عدد الألواح</th>
              <th style="text-align:center">النسبة %</th>
              <th style="text-align:center">إجمالي القيمة</th>
            </tr>
          </thead>
          <tbody>
            ${gradeSummaryRows}
            <tr style="background:var(--bg-input);font-weight:700">
              <td>الإجمالي</td>
              <td style="text-align:center">${total}</td>
              <td style="text-align:center">100%</td>
              <td class="number" style="color:var(--accent)">${formatMoney(totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/** رسم مخطط الدائرة لتوزيع درجات الجودة */
function _drawQualityPieChart() {
  const canvas = document.getElementById('quality-grade-chart');
  if (!canvas) return;

  const records = window._qualityRecords || [];
  if (!records.length) return;

  // تدمير المخطط السابق لتجنب التكرار
  if (window._qualityPieChart instanceof Chart) {
    window._qualityPieChart.destroy();
    window._qualityPieChart = null;
  }

  const counts = {
    A: records.filter(r => r.qualityGrade === 'A').length,
    B: records.filter(r => r.qualityGrade === 'B').length,
    C: records.filter(r => r.qualityGrade === 'C').length,
    D: records.filter(r => r.qualityGrade === 'D').length,
  };
  const total = records.length;

  window._qualityPieChart = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['A — درجة أولى', 'B — درجة ثانية', 'C — درجة ثالثة', 'D — مرفوض'],
      datasets: [{
        data:            [counts.A, counts.B, counts.C, counts.D],
        backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336'],
        borderColor:     ['#388e3c', '#1565c0', '#e65100', '#c62828'],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:      '#8892aa',
            font:       { family: 'Cairo', size: 13 },
            padding:    16,
            boxWidth:   14,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} لوح (${total ? ((ctx.raw / total) * 100).toFixed(1) : 0}%)`,
          },
        },
      },
    },
  });
}

/** حفظ معاملات الجودة المعدّلة */
function saveGradeMultipliers() {
  const A = parseFloat(document.getElementById('gm-A')?.value);
  const B = parseFloat(document.getElementById('gm-B')?.value);
  const C = parseFloat(document.getElementById('gm-C')?.value);
  const D = parseFloat(document.getElementById('gm-D')?.value);

  if ([A, B, C, D].some(v => isNaN(v) || v < 0 || v > 5)) {
    toast('يجب أن تكون المعاملات أرقاماً بين 0 و 5', 'error');
    return;
  }

  DB.set('grade_multipliers', { A, B, C, D });
  toast('تم حفظ معاملات الجودة بنجاح', 'success');
}

// ============================================================
// نافذة الإضافة / التعديل (Modal)
// ============================================================

/** فتح نافذة إضافة أو تعديل سجل جودة */
function openQualityModal(id) {
  const blocks = DB.getAll('blocks');
  const record = id ? DB.findById('quality_records', parseInt(id)) : null;
  const isEdit = !!record;

  // قيم افتراضية للسجل الجديد
  const v = record || {
    slabCode: '', blockId: '', qualityGrade: 'A',
    color: '', colorIntensity: 'متوسط', finish: 'بوليش',
    thickness: '', length: '', width: '', areaM2: 0,
    countryOfOrigin: '', warehouse: '',
    basePrice: 0, costByGrade: 0, status: 'in_stock',
    inspectedBy: '', inspectionDate: new Date().toISOString().split('T')[0],
    defects: '', notes: '', images: [],
  };

  openModal(
    isEdit ? `✏️ تعديل سجل الجودة — ${v.slabCode}` : '➕ إضافة سجل جودة جديد',
    `
    <div class="form-grid">

      <!-- ===== معلومات اللوح الأساسية ===== -->
      <div class="form-group">
        <label>كود اللوح *</label>
        <input type="text" id="qm-slabCode" value="${v.slabCode || ''}"
          placeholder="SLB-2024-001">
      </div>
      <div class="form-group">
        <label>الكتلة المصدر</label>
        <select id="qm-blockId">
          <option value="">— اختر الكتلة —</option>
          ${blocks.map(b =>
            `<option value="${b.id}" ${String(v.blockId) === String(b.id) ? 'selected' : ''}>
              ${b.code} — ${b.type || ''}
            </option>`
          ).join('')}
        </select>
      </div>

      <!-- ===== درجة الجودة ===== -->
      <div class="form-group form-full">
        <label>درجة الجودة *</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
          ${['A', 'B', 'C', 'D'].map(g => {
            const color    = _qualityGradeColor(g);
            const labels   = { A: 'درجة أولى', B: 'درجة ثانية', C: 'درجة ثالثة', D: 'مرفوض' };
            const selected = v.qualityGrade === g;
            return `
              <button type="button" id="qm-grade-${g}" onclick="selectQualityGrade('${g}')"
                style="padding:10px 22px;border:2px solid ${color};border-radius:10px;
                       background:${selected ? color : 'transparent'};
                       color:${selected ? '#fff' : color};
                       font-weight:700;font-size:15px;cursor:pointer;
                       font-family:inherit;transition:all 0.2s;min-width:80px">
                ${g}
                <div style="font-size:11px;font-weight:400;margin-top:2px">${labels[g]}</div>
              </button>
            `;
          }).join('')}
        </div>
        <input type="hidden" id="qm-qualityGrade" value="${v.qualityGrade || 'A'}">
      </div>

      <!-- ===== مواصفات اللوح ===== -->
      <div class="form-group">
        <label>اللون</label>
        <input type="text" id="qm-color" value="${v.color || ''}"
          placeholder="أبيض / رمادي / بيج / أسود...">
      </div>
      <div class="form-group">
        <label>كثافة اللون</label>
        <select id="qm-colorIntensity">
          <option value="فاتح"   ${v.colorIntensity === 'فاتح'   ? 'selected' : ''}>فاتح</option>
          <option value="متوسط"  ${v.colorIntensity === 'متوسط'  ? 'selected' : ''}>متوسط</option>
          <option value="غامق"   ${v.colorIntensity === 'غامق'   ? 'selected' : ''}>غامق</option>
        </select>
      </div>
      <div class="form-group">
        <label>نوع الفنش</label>
        <select id="qm-finish">
          ${['بوليش', 'مسطح', 'حبيبي', 'فرشاة', 'أنتيكا'].map(f =>
            `<option value="${f}" ${v.finish === f ? 'selected' : ''}>${f}</option>`
          ).join('')}
        </select>
      </div>

      <!-- ===== الأبعاد ===== -->
      <div class="form-group">
        <label>السماكة (سم)</label>
        <input type="number" id="qm-thickness" value="${v.thickness || ''}"
          min="0" step="0.5" placeholder="2 / 3 / 5"
          oninput="calcQualityArea()">
      </div>
      <div class="form-group">
        <label>الطول (سم)</label>
        <input type="number" id="qm-length" value="${v.length || ''}"
          min="0" placeholder="240"
          oninput="calcQualityArea()">
      </div>
      <div class="form-group">
        <label>العرض (سم)</label>
        <input type="number" id="qm-width" value="${v.width || ''}"
          min="0" placeholder="120"
          oninput="calcQualityArea()">
      </div>
      <div class="form-group">
        <label>المساحة (م²) — محسوبة تلقائياً</label>
        <input type="number" id="qm-areaM2" value="${(v.areaM2 || 0).toFixed(4)}"
          readonly style="opacity:0.7;background:var(--bg-input)">
      </div>

      <!-- ===== التسعير ===== -->
      <div class="form-group">
        <label>السعر الأساسي (ج.م / م²)</label>
        <input type="number" id="qm-basePrice" value="${v.basePrice || 0}"
          min="0" step="0.01" placeholder="0.00"
          oninput="calcQualityPrice()">
      </div>
      <div class="form-group">
        <label>السعر بعد الجودة — محسوب</label>
        <input type="number" id="qm-costByGrade" value="${(v.costByGrade || 0).toFixed(2)}"
          readonly
          style="opacity:0.9;background:var(--bg-input);color:var(--accent);font-weight:700">
      </div>

      <!-- ===== الموقع والمنشأ ===== -->
      <div class="form-group">
        <label>بلد المنشأ</label>
        <input type="text" id="qm-countryOfOrigin" value="${v.countryOfOrigin || ''}"
          placeholder="مصر / إيطاليا / البرازيل / الصين...">
      </div>
      <div class="form-group">
        <label>المستودع</label>
        <input type="text" id="qm-warehouse" value="${v.warehouse || ''}"
          placeholder="المستودع الرئيسي / مستودع 2...">
      </div>

      <!-- ===== الحالة والفحص ===== -->
      <div class="form-group">
        <label>حالة اللوح</label>
        <select id="qm-status">
          <option value="in_stock" ${v.status === 'in_stock'  ? 'selected' : ''}>في المخزن</option>
          <option value="sold"     ${v.status === 'sold'      ? 'selected' : ''}>مباعة</option>
          <option value="reserved" ${v.status === 'reserved'  ? 'selected' : ''}>محجوزة</option>
          <option value="rejected" ${v.status === 'rejected'  ? 'selected' : ''}>مرفوض — معزول</option>
        </select>
      </div>
      <div class="form-group">
        <label>اسم الفاحص</label>
        <input type="text" id="qm-inspectedBy" value="${v.inspectedBy || ''}"
          placeholder="اسم موظف فحص الجودة">
      </div>
      <div class="form-group">
        <label>تاريخ الفحص</label>
        <input type="date" id="qm-inspectionDate"
          value="${v.inspectionDate || new Date().toISOString().split('T')[0]}">
      </div>

      <!-- ===== العيوب والملاحظات ===== -->
      <div class="form-group form-full">
        <label>العيوب المرصودة</label>
        <textarea id="qm-defects" rows="2"
          placeholder="صف أي عيوب أو شقوق أو تلف في اللوح...">${v.defects || ''}</textarea>
      </div>
      <div class="form-group form-full">
        <label>ملاحظات</label>
        <textarea id="qm-notes" rows="2"
          placeholder="ملاحظات إضافية...">${v.notes || ''}</textarea>
      </div>

      <!-- ===== بيانات الفرز ===== -->
      <div class="form-group form-full">
        <label>ملاحظات الفرز</label>
        <textarea id="qm-sortingNotes" rows="2"
          placeholder="ملاحظات خاصة بعملية الفرز...">${v.sortingNotes || ''}</textarea>
      </div>
      <div class="form-group">
        <label>المسؤول عن الفرز</label>
        <select id="qm-sortingResponsible">
          <option value="">— اختر الموظف —</option>
          ${DB.getAll('employees').map(emp =>
            `<option value="${emp.id}" ${String(v.sortingResponsible) === String(emp.id) ? 'selected' : ''}>${emp.name || emp.email}</option>`
          ).join('')}
        </select>
      </div>

      <!-- ===== رفع الصور ===== -->
      <div class="form-group form-full">
        <label>صور اللوح (بحد أقصى 5 صور)</label>
        <input type="file" id="qm-images-input" accept="image/*" multiple
          onchange="handleQualityImages(this.files)"
          style="margin-bottom:8px">
        <div id="qm-images-preview"
          style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
          ${(v.images || []).map((img, idx) => {
            const safe = _safeImgSrc(img);
            if (!safe) return '';
            return `
            <div style="position:relative;display:inline-block">
              <img src="${safe}"
                style="width:80px;height:80px;object-fit:cover;border-radius:6px;
                       border:2px solid var(--border-color)"
                loading="lazy">
              <button type="button" onclick="removeQualityImage(${idx})"
                style="position:absolute;top:-6px;left:-6px;
                       background:#f44336;color:#fff;border:none;
                       border-radius:50%;width:20px;height:20px;
                       cursor:pointer;font-size:11px;
                       display:flex;align-items:center;justify-content:center;
                       line-height:1;padding:0">✕</button>
            </div>
          `; }).join('')}
        </div>
        <small style="color:var(--text-muted)">
          الصور الأكبر من 1 MB ستُضغط تلقائياً للتوفير في مساحة التخزين
        </small>
      </div>

    </div>

    <!-- أزرار الحفظ والإلغاء -->
    <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btn-secondary" onclick="closeModal()">إلغاء</button>
      <button class="btn btn-primary" onclick="saveQualityRecord(${id ? parseInt(id) : 'null'})">
        💾 ${isEdit ? 'حفظ التغييرات' : 'إضافة السجل'}
      </button>
    </div>
  `);

  // تخزين الصور الحالية في متغير مؤقت للتعديل
  window._qualityModalImages = [...(v.images || [])];

  // حساب القيم الأولية
  calcQualityArea();
}

/** تحديد درجة الجودة وتحديث أزرار التحديد بصرياً */
function selectQualityGrade(grade) {
  const hidden = document.getElementById('qm-qualityGrade');
  if (hidden) hidden.value = grade;

  ['A', 'B', 'C', 'D'].forEach(g => {
    const btn   = document.getElementById(`qm-grade-${g}`);
    if (!btn) return;
    const color = _qualityGradeColor(g);
    if (g === grade) {
      btn.style.background = color;
      btn.style.color      = '#fff';
    } else {
      btn.style.background = 'transparent';
      btn.style.color      = color;
    }
  });

  calcQualityPrice();
}

/** حساب المساحة تلقائياً من الطول والعرض */
function calcQualityArea() {
  const len  = parseFloat(document.getElementById('qm-length')?.value)  || 0;
  const wid  = parseFloat(document.getElementById('qm-width')?.value)   || 0;
  // تحويل من سنتيمتر² إلى متر²
  const area = (len * wid) / 10000;
  const el   = document.getElementById('qm-areaM2');
  if (el) el.value = area.toFixed(4);
  calcQualityPrice();
}

/** حساب السعر بعد تطبيق معامل الجودة */
function calcQualityPrice() {
  const base  = parseFloat(document.getElementById('qm-basePrice')?.value) || 0;
  const grade = document.getElementById('qm-qualityGrade')?.value || 'A';
  const cost  = calcPriceByGrade(base, grade);
  const el    = document.getElementById('qm-costByGrade');
  if (el) el.value = cost.toFixed(2);
}

/** معالجة رفع الصور واستيرادها */
async function handleQualityImages(files) {
  if (!files || !files.length) return;
  const current   = window._qualityModalImages || [];
  const remaining = 5 - current.length;

  if (remaining <= 0) {
    toast('تم الوصول إلى الحد الأقصى (5 صور)', 'warning');
    // إعادة ضبط حقل الإدخال
    const inp = document.getElementById('qm-images-input');
    if (inp) inp.value = '';
    return;
  }

  try {
    const newImages = await uploadSlabImages(Array.from(files).slice(0, remaining));
    window._qualityModalImages = [...current, ...newImages];
    _refreshQualityImagePreviews();
    toast(`تم رفع ${newImages.length} صورة بنجاح`, 'success');
  } catch (e) {
    toast('حدث خطأ أثناء معالجة الصور', 'error');
  }

  // إعادة ضبط حقل الإدخال للسماح برفع صور إضافية
  const inp = document.getElementById('qm-images-input');
  if (inp) inp.value = '';
}

/** إزالة صورة من معاينة النموذج */
function removeQualityImage(idx) {
  if (!window._qualityModalImages) return;
  window._qualityModalImages.splice(idx, 1);
  _refreshQualityImagePreviews();
}

/** تحديث معاينة الصور في النموذج */
function _refreshQualityImagePreviews() {
  const container = document.getElementById('qm-images-preview');
  if (!container) return;
  const images = window._qualityModalImages || [];

  container.innerHTML = images.map((img, idx) => {
    const safe = _safeImgSrc(img);
    if (!safe) return '';
    return `
    <div style="position:relative;display:inline-block">
      <img src="${safe}"
        style="width:80px;height:80px;object-fit:cover;border-radius:6px;
               border:2px solid var(--border-color)"
        loading="lazy">
      <button type="button" onclick="removeQualityImage(${idx})"
        style="position:absolute;top:-6px;left:-6px;
               background:#f44336;color:#fff;border:none;
               border-radius:50%;width:20px;height:20px;
               cursor:pointer;font-size:11px;
               display:flex;align-items:center;justify-content:center;
               line-height:1;padding:0">✕</button>
    </div>
  `; }).join('');
}

// ============================================================
// حفظ وحذف سجلات الجودة
// ============================================================

/** حفظ سجل جودة مع دعم الإنشاء والتعديل */
async function saveQualityRecord(id) {
  const slabCode = document.getElementById('qm-slabCode')?.value?.trim();
  if (!slabCode) {
    toast('الرجاء إدخال كود اللوح', 'error');
    return;
  }

  const blockEl    = document.getElementById('qm-blockId');
  const blockId    = blockEl?.value || '';

  const length     = parseFloat(document.getElementById('qm-length')?.value)  || 0;
  const width      = parseFloat(document.getElementById('qm-width')?.value)   || 0;
  const areaM2     = (length * width) / 10000;
  const basePrice  = parseFloat(document.getElementById('qm-basePrice')?.value) || 0;
  const grade      = document.getElementById('qm-qualityGrade')?.value || 'A';
  const costByGrade = calcPriceByGrade(basePrice, grade);

  const recordId = id ? parseInt(id) : DB.nextId('quality_records');
  const existing = id ? DB.findById('quality_records', recordId) : null;

  const record = {
    id:              recordId,
    slabId:          slabCode,
    blockId,
    slabCode,
    qualityGrade:    grade,
    color:           document.getElementById('qm-color')?.value?.trim()           || '',
    colorIntensity:  document.getElementById('qm-colorIntensity')?.value          || 'متوسط',
    finish:          document.getElementById('qm-finish')?.value                  || 'بوليش',
    thickness:       parseFloat(document.getElementById('qm-thickness')?.value)   || 0,
    length,
    width,
    areaM2,
    countryOfOrigin: document.getElementById('qm-countryOfOrigin')?.value?.trim() || '',
    images:          window._qualityModalImages || [],
    defects:         document.getElementById('qm-defects')?.value?.trim()         || '',
    basePrice,
    costByGrade,
    warehouse:       document.getElementById('qm-warehouse')?.value?.trim()       || '',
    status:          document.getElementById('qm-status')?.value                  || 'in_stock',
    inspectedBy:     document.getElementById('qm-inspectedBy')?.value?.trim()     || '',
    inspectionDate:  document.getElementById('qm-inspectionDate')?.value          || '',
    notes:           document.getElementById('qm-notes')?.value?.trim()           || '',
    sortingNotes:    document.getElementById('qm-sortingNotes')?.value?.trim()    || '',
    sortingResponsible: document.getElementById('qm-sortingResponsible')?.value   || '',
    createdAt:       existing?.createdAt || new Date().toISOString(),
  };

  _saveQualityRecordDirect(record);

  // ===== استدعاء API عند تغيير درجة الجودة =====
  if (existing && existing.qualityGrade !== grade) {
    if (typeof api !== 'undefined') {
      if (api.updateSlabGrade) api.updateSlabGrade(record.slabId, grade);
      if (grade === 'D' && api.moveSlabToRejected) {
        api.moveSlabToRejected(record.slabId);
        // تحديث حالة اللوح إلى مرفوض
        record.status = 'rejected';
        _saveQualityRecordDirect(record);
      }
    }
    toast('تم تحديث درجة الجودة وتعديل قيمة المخزون تلقائياً', 'success');
  } else {
    closeModal();
    toast(id ? 'تم تحديث سجل الجودة بنجاح' : 'تمت إضافة سجل الجودة بنجاح', 'success');
    renderQuality();
    return;
  }

  closeModal();
  toast(id ? 'تم تحديث سجل الجودة بنجاح' : 'تمت إضافة سجل الجودة بنجاح', 'success');
  renderQuality();
}

/**
 * حفظ سجل الجودة مع الحفاظ على الصور بدون تمريرها عبر sanitize
 * (يُستخدم داخلياً لتجنب مشكلة حجم نص base64)
 */
function _saveQualityRecordDirect(record) {
  // فصل الصور مؤقتاً لتمرير باقي الحقول عبر DB.save للتنقية
  const images = record.images || [];
  const recordWithoutImages = { ...record, images: [] };

  // حفظ الحقول النصية مع التنقية
  DB.save('quality_records', recordWithoutImages);

  // إعادة إضافة الصور مباشرةً لتجاوز حد 1000 حرف في sanitize
  const allRecords = DB.getAll('quality_records');
  const savedIdx   = allRecords.findIndex(i => i.id === record.id);
  if (savedIdx >= 0) {
    allRecords[savedIdx].images = images;
    DB.set('quality_records', allRecords);
  }
}

/** حذف سجل جودة بعد التأكيد */
function deleteQualityRecord(id) {
  if (!confirm('هل تريد حذف هذا السجل نهائياً؟ لا يمكن التراجع عن هذه العملية.')) return;
  DB.remove('quality_records', parseInt(id));
  // إزالة من السلة إن كان موجوداً
  if (window._qualityCart) {
    window._qualityCart = window._qualityCart.filter(item => item.id !== parseInt(id));
  }
  toast('تم حذف السجل بنجاح', 'success');
  renderQuality();
}

// ===== عرض QR Code لسجل الجودة =====
function showQualityQR(id) {
  const r = DB.findById('quality_records', id);
  if (!r) { toast('السجل غير موجود', 'error'); return; }
  const qrData = JSON.stringify({
    code:      r.slabCode,
    grade:     r.qualityGrade,
    dimensions: (r.areaM2 || 0).toFixed(2) + ' م²',
    thickness:  r.thickness,
    color:      r.color,
    warehouse:  r.warehouse,
    price:      r.costByGrade || 0,
    status:     r.status,
    inspDate:   r.inspectionDate,
  });

  openModal('QR Code — ' + (r.slabCode || 'لوح'), `
    <div style="text-align:center;padding:16px">
      <div id="quality-qr-canvas" style="display:inline-block;padding:16px;background:#fff;border-radius:8px;margin-bottom:16px"></div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
        <strong>${r.slabCode || '—'}</strong> | جودة: <strong>${r.qualityGrade}</strong>
        | مساحة: <strong>${(r.areaM2 || 0).toFixed(2)} م²</strong>
        | مستودع: <strong>${r.warehouse || '—'}</strong>
        | سعر: <strong>${formatMoney(r.costByGrade || 0)}</strong>
      </div>
      <button class="btn btn-primary" onclick="_printQualityQR(${id})">🖨 طباعة</button>
    </div>
  `);

  setTimeout(() => {
    const container = document.getElementById('quality-qr-canvas');
    if (!container) return;
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, {
        text:   qrData,
        width:  180,
        height: 180,
        colorDark:  '#000',
        colorLight: '#fff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      container.innerHTML = '<p style="color:var(--danger);font-size:12px">مكتبة QR غير محملة</p>';
    }
  }, 100);
}

function _printQualityQR(id) {
  const r = DB.findById('quality_records', id);
  if (!r) return;
  const canvas = document.querySelector('#quality-qr-canvas canvas') || document.querySelector('#quality-qr-canvas img');
  const qrSrc  = canvas ? (canvas.tagName === 'CANVAS' ? canvas.toDataURL() : canvas.src) : '';
  const w = window.open('', '_blank');
  w.document.write(`
    <html dir="rtl"><head><title>ملصق لوح — ${r.slabCode || ''}</title>
    <style>
      body { font-family: Cairo, Arial, sans-serif; direction: rtl; margin: 0; padding: 20px; }
      .label-card { border: 2px solid #333; border-radius: 8px; padding: 20px; max-width: 320px; margin: 0 auto; text-align: center; }
      h2 { margin: 0 0 8px; font-size: 22px; }
      p  { margin: 4px 0; font-size: 14px; }
      img { width: 160px; height: 160px; }
    </style></head><body>
    <div class="label-card">
      ${qrSrc ? `<img src="${qrSrc}" alt="QR">` : ''}
      <h2>${r.slabCode || '—'}</h2>
      <p>الجودة: <strong>${r.qualityGrade}</strong></p>
      <p>المساحة: ${(r.areaM2 || 0).toFixed(2)} م²</p>
      <p>السماكة: ${r.thickness || '—'} سم</p>
      <p>المستودع: ${r.warehouse || '—'}</p>
      <p>السعر: ${formatMoney(r.costByGrade || 0)}</p>
      <p style="color:#666;font-size:12px">تاريخ الفحص: ${r.inspectionDate || '—'}</p>
    </div>
    <script>window.onload = function(){ window.print(); window.close(); }<\/script>
    </body></html>
  `);
  w.document.close();
}
