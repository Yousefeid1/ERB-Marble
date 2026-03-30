// ================================================
// utils.js — دوال مشتركة بين جميع صفحات النظام
// لا تكرر أي دالة من هنا في ملف آخر
// ================================================

function formatCurrency(amount, currency) {
  const s = JSON.parse(localStorage.getItem('settings') || '{}');
  const cur = currency || s.currency || 'EGP';
  const sym = { EGP:'ج.م', USD:'$', EUR:'€', GBP:'£', SAR:'ر.س', AED:'د.إ' };
  const n = parseFloat(amount || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  return `${n} ${sym[cur] || cur}`;
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

function printSection(contentId, title) {
  const html = document.getElementById(contentId)?.innerHTML;
  if (!html) return;
  const w = window.open('', '_blank');
  w.document.write(
    '<html dir="rtl"><head><title>' + title + '</title>' +
    '<style>body{font-family:Arial,sans-serif;direction:rtl}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px}</style>' +
    '</head><body>' +
    '<h2>' + title + '</h2>' + html + '</body></html>'
  );
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 500);
}
