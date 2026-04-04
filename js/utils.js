// ================================================
// utils.js — دوال مشتركة بين جميع صفحات النظام
// لا تكرر أي دالة من هنا في ملف آخر
// ================================================

function formatMoney(amount, currency) {
  const s = JSON.parse(localStorage.getItem('marble_db_settings') || localStorage.getItem('settings') || '{}');
  const cur = currency || s.currency || 'EGP';
  const sym = { EGP:'ج.م', USD:'$', EUR:'€', GBP:'£', SAR:'ر.س', AED:'د.إ' };
  const n = parseFloat(amount || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  return `${n} ${sym[cur] || cur}`;
}

// Alias kept for backwards compatibility within this file
function formatCurrency(amount, currency) { return formatMoney(amount, currency); }

// ===== 8. تحويل العملة =====
// تحويل مبلغ من عملة إلى أخرى باستخدام سعر الصرف من الإعدادات
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return parseFloat(amount) || 0;
  const s = JSON.parse(localStorage.getItem('marble_db_settings') || '{}');
  const rate = parseFloat(s.exchange_rate || 31);
  const amountNum = parseFloat(amount) || 0;
  // EGP → Foreign
  if (fromCurrency === 'EGP') return amountNum / rate;
  // Foreign → EGP
  if (toCurrency === 'EGP') return amountNum * rate;
  // Foreign → Foreign (تحويل عبر EGP كعملة وسيطة)
  // تحويل العملة الأولى إلى EGP ثم إلى العملة الثانية
  // ملاحظة: يفترض أن سعر الصرف لكلتا العملتين مقابل EGP هو نفسه (مبسّط)
  const toEgp = amountNum * rate;
  return toEgp / rate;
}

// ===== 8. حساب ضريبة القيمة المضافة =====
// يطبق Math.round للحصول على قيمة صحيحة
function calculateTax(amount, rate) {
  const taxRate = rate !== undefined ? rate : (() => {
    const s = JSON.parse(localStorage.getItem('marble_db_settings') || '{}');
    return parseFloat(s.tax_rate || 14);
  })();
  return Math.round((parseFloat(amount) || 0) * taxRate / 100);
}

function formatDate(d, withTime) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  const date = dt.toLocaleDateString('ar-EG', {
    year:'numeric', month:'2-digit', day:'2-digit'
  });
  if (!withTime) return date;
  return date + ' ' + dt.toLocaleTimeString('ar-EG', {
    hour:'2-digit', minute:'2-digit'
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  // رفض النصوص التي تتجاوز الحد الأقصى المسموح
  if (str.length > 1000) throw new Error('النص طويل جداً — الحد الأقصى 1000 حرف');
  return str
    .replace(/<[^>]*>/g, '')        // إزالة وسوم HTML
    .replace(/&/g,  '&amp;')        // ترميز الرموز الخاصة لمنع XSS
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

function showToast(msg, type, duration) {
  type     = type     || 'info';
  duration = duration || 3500;
  document.getElementById('_toast')?.remove();
  const colors = {
    success:'#1d9e75', error:'#e24b4a',
    warning:'#ba7517', info:'#378add'
  };
  const icons = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' };
  const el = document.createElement('div');
  el.id = '_toast';
  el.setAttribute('style',
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
    'background:' + colors[type] + ';color:#fff;padding:12px 20px;' +
    'border-radius:10px;font-size:14px;direction:rtl;z-index:9999;' +
    'display:flex;align-items:center;gap:8px;max-width:90vw;' +
    'box-shadow:0 4px 16px rgba(0,0,0,.2)');
  el.innerHTML = icons[type] + ' ' + msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function showConfirmDialog(message, onConfirm, onCancel) {
  const ov = document.createElement('div');
  ov.setAttribute('style',
    'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;' +
    'display:flex;align-items:center;justify-content:center;padding:16px');
  ov.innerHTML =
    '<div style="background:#fff;border-radius:12px;padding:24px;max-width:400px;width:100%;direction:rtl;text-align:center">' +
    '<p style="margin:0 0 20px;font-size:16px">' + message + '</p>' +
    '<div style="display:flex;gap:12px;justify-content:center">' +
    '<button id="_cYes" style="background:#e24b4a;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px">تأكيد</button>' +
    '<button id="_cNo"  style="background:#6c757d;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px">إلغاء</button>' +
    '</div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#_cYes').onclick = () => { ov.remove(); onConfirm?.(); };
  ov.querySelector('#_cNo' ).onclick = () => { ov.remove(); onCancel?.();  };
}

function showEmptyState(msg, icon) {
  msg  = msg  || 'لا توجد بيانات';
  icon = icon || '📭';
  return '<div style="text-align:center;padding:40px;color:#999"><div style="font-size:48px">' + icon + '</div><p>' + msg + '</p></div>';
}

function filterTable(tableId, term) {
  const t = term.toLowerCase();
  document.querySelectorAll('#' + tableId + ' tbody tr').forEach(row => {
    row.style.display =
      row.textContent.toLowerCase().includes(t) ? '' : 'none';
  });
}

function daysBetween(d1, d2) {
  return Math.floor((new Date(d2||new Date()) - new Date(d1)) / 86400000);
}

function shortNumber(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'م';
  if (n >= 1000)    return (n/1000).toFixed(1)    + 'ك';
  return (n||0).toString();
}

function logActivity(action, entity, entityId, details) {
  const user = (typeof getCurrentUser === 'function' && getCurrentUser())
               || { name: 'النظام' };
  const logs = JSON.parse(localStorage.getItem('activity_log') || '[]');
  logs.unshift({
    id: generateId(),
    userName: user.name,
    userId:   user.id,
    action, entity, entityId,
    details:  details || {},
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('activity_log', JSON.stringify(logs.slice(0, 500)));
}

function exportTableToExcel(tableId, filename) {
  if (typeof XLSX === 'undefined') {
    showToast('مكتبة Excel غير محملة', 'error'); return;
  }
  const t = document.getElementById(tableId);
  if (!t) return;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(t), 'Sheet1');
  XLSX.writeFile(wb, filename + '.xlsx');
}

// ===== 11. طباعة RTL محسّنة مع خط Cairo وترويسة وتذييل =====
function printSection(contentId, title) {
  const html = document.getElementById(contentId)?.innerHTML;
  if (!html) return;

  const settings = JSON.parse(localStorage.getItem('marble_db_settings') || '{}');
  const company  = settings.company_name || 'شركة الرخام والجرانيت';
  const phone    = settings.phone    || '';
  const email    = settings.email    || '';
  const today    = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family:'Cairo','Arial',sans-serif;
      direction:rtl;
      color:#1a1a1a;
      background:#fff;
      padding:12mm 16mm;
      font-size:12px;
    }
    .print-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      border-bottom:3px solid #c8a96e;
      padding-bottom:12px;
      margin-bottom:16px;
    }
    .print-header .company-info h1 {
      font-size:18px; font-weight:900; color:#1a1a1a; margin-bottom:4px;
    }
    .print-header .company-info p { font-size:11px; color:#666; margin-bottom:2px; }
    .print-header .logo {
      font-size:36px; color:#c8a96e; font-weight:900;
    }
    .print-title {
      text-align:center;
      font-size:16px;
      font-weight:700;
      margin-bottom:16px;
      color:#1a1a1a;
    }
    table { border-collapse:collapse; width:100%; margin-top:8px; }
    td, th { border:1px solid #ccc; padding:6px 9px; text-align:right; font-size:11px; }
    th { background:#2c2c2c; color:#fff; font-weight:700; }
    /* الأرقام تُعرض من اليسار إلى اليمين داخل السياق العربي */
    .number, td.number { direction:ltr; text-align:left; unicode-bidi:plaintext; }
    tr:nth-child(even) td { background:#f9f8f6; }
    .print-footer {
      position:fixed; bottom:8mm; left:16mm; right:16mm;
      display:flex; justify-content:space-between; align-items:center;
      border-top:1px solid #ddd; padding-top:8px;
      font-size:10px; color:#999;
    }
    @media print {
      @page { size:A4; margin:12mm 16mm; }
      body { padding:0; }
      .print-footer { position:fixed; bottom:0; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="company-info">
      <h1>${company}</h1>
      ${phone ? `<p>📞 ${phone}</p>` : ''}
      ${email ? `<p>✉ ${email}</p>` : ''}
    </div>
    <div class="logo">◈</div>
  </div>
  <div class="print-title">${title}</div>
  ${html}
  <div class="print-footer">
    <span>${company}</span>
    <span>${today}</span>
    <span>نظام ERP الرخام والجرانيت</span>
  </div>
  <script>
    document.fonts.ready.then(function(){ setTimeout(function(){ window.print(); window.close(); }, 400); });
  <\/script>
</body>
</html>`);
  w.document.close();
}

// ===== عرض رسالة خطأ أسفل حقل إدخال =====
function showFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  let errEl = field.parentElement.querySelector('.field-error-msg');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field-error-msg';
    errEl.style.cssText = 'display:block;color:#e24b4a;font-size:12px;margin-top:4px;direction:rtl';
    field.parentElement.appendChild(errEl);
  }
  errEl.textContent = msg;
  field.style.borderColor = '#e24b4a';
  const clearErr = () => {
    errEl.remove();
    field.style.borderColor = '';
    field.removeEventListener('input', clearErr);
  };
  field.addEventListener('input', clearErr);
}

// ===== كائن تتبع مخططات Chart.js النشطة =====
const _activeCharts = {};

function _destroyActiveCharts() {
  Object.keys(_activeCharts).forEach(k => {
    try { _activeCharts[k].destroy(); } catch (_) {}
    delete _activeCharts[k];
  });
}

function _registerChart(id, chart) {
  if (_activeCharts[id]) {
    try { _activeCharts[id].destroy(); } catch (_) {}
  }
  _activeCharts[id] = chart;
  return chart;
}
