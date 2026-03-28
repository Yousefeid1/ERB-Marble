// ============================================
// Logistics Pages - Warehouses & Shipments
// ============================================

// Statuses that make an invoice ineligible for new shipments
const INVALID_INVOICE_STATUSES = ['cancelled', 'rejected'];

// ===== WAREHOUSES =====
async function renderWarehouses() {
  const content = document.getElementById('page-content');
  try {
    const warehouses = await api.warehouses();
    const shipments  = (await api.shipments()).data;

    const pendingCount   = shipments.filter(s => s.status === 'pending').length;
    const inTransitCount = shipments.filter(s => s.status === 'in_transit').length;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>إدارة المستودعات</h2><p>متابعة المخازن والمخزون</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportWarehousesExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportWarehousesPDF()">📄 PDF</button>
          <button class="btn btn-secondary" onclick="showPage('shipments')">🚛 الشحن والتوصيل</button>
          <button class="btn btn-primary" onclick="openNewWarehouseModal()">＋ مستودع جديد</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي المستودعات</div><div class="value">${warehouses.length}</div></div>
        <div class="summary-box profit"><div class="label">مستودعات نشطة</div><div class="value">${warehouses.filter(w => w.status === 'active').length}</div></div>
        <div class="summary-box"><div class="label">شحنات قيد التنفيذ</div><div class="value">${pendingCount}</div></div>
        <div class="summary-box loss"><div class="label">في الطريق</div><div class="value">${inTransitCount}</div></div>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>اسم المستودع</th><th>الموقع</th><th>المسؤول</th>
              <th>السعة (م²)</th><th>الحالة</th><th>ملاحظات</th><th>إجراءات</th>
            </tr></thead>
            <tbody id="wh-tbody">${renderWarehouseRows(warehouses)}</tbody>
          </table>
        </div>
      </div>

      <div class="page-header" style="margin-top:24px">
        <div><h2>آخر الشحنات</h2><p>أحدث عمليات الشحن والتوصيل</p></div>
        <button class="btn btn-secondary" onclick="showPage('shipments')">عرض الكل</button>
      </div>
      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الشحنة</th><th>العميل</th><th>الوجهة</th><th>تاريخ الشحن</th><th>الحالة</th>
            </tr></thead>
            <tbody>
              ${renderShipmentPreviewRows(shipments.slice(0, 5))}
            </tbody>
          </table>
        </div>
      </div>
    `;
    window._warehouseData = warehouses;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderWarehouseRows(warehouses) {
  if (!warehouses.length) return `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><div class="empty-icon">🏭</div><h3>لا توجد مستودعات</h3></div></td></tr>`;
  return warehouses.map(w => `
    <tr>
      <td><strong>${w.name}</strong></td>
      <td>${w.location || '-'}</td>
      <td>${w.manager || '-'}</td>
      <td class="number">${(w.capacity || 0).toLocaleString('ar-EG')} م²</td>
      <td>${w.status === 'active' ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-danger">مغلق</span>'}</td>
      <td class="text-muted" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${w.notes || '-'}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="openEditWarehouseModal(${w.id})">تعديل</button>
        <button class="btn btn-sm ${w.status === 'active' ? 'btn-danger' : 'btn-success'}"
          data-wh-id="${w.id}" data-wh-status="${w.status}"
          onclick="toggleWarehouseStatus(parseInt(this.dataset.whId), this.dataset.whStatus)">
          ${w.status === 'active' ? 'إغلاق' : 'تفعيل'}
        </button>
      </td>
    </tr>
  `).join('');
}

function renderShipmentPreviewRows(shipments) {
  if (!shipments.length) return `<tr><td colspan="5"><div class="empty-state" style="padding:20px"><div class="empty-icon">🚛</div><h3>لا توجد شحنات</h3></div></td></tr>`;
  return shipments.map(s => `
    <tr>
      <td class="number"><strong>${s.shipment_number}</strong></td>
      <td>${s.customer}</td>
      <td>${s.destination || '-'}</td>
      <td>${formatDate(s.shipment_date)}</td>
      <td>${statusBadge(s.status)}</td>
    </tr>
  `).join('');
}

function openNewWarehouseModal() {
  openModal('إضافة مستودع جديد', `
    <div class="form-grid">
      <div class="form-group form-full">
        <label>اسم المستودع *</label>
        <input type="text" id="nwh-name" placeholder="اسم المستودع">
      </div>
      <div class="form-group">
        <label>الموقع *</label>
        <input type="text" id="nwh-location" placeholder="المدينة، المنطقة">
      </div>
      <div class="form-group">
        <label>المسؤول</label>
        <input type="text" id="nwh-manager" placeholder="اسم المسؤول">
      </div>
      <div class="form-group">
        <label>السعة الاستيعابية (م²)</label>
        <input type="number" id="nwh-capacity" placeholder="0" min="0">
      </div>
      <div class="form-group form-full">
        <label>ملاحظات</label>
        <input type="text" id="nwh-notes" placeholder="ملاحظات إضافية">
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveNewWarehouse()">💾 حفظ</button>
    </div>
  `);
}

async function saveNewWarehouse() {
  const name = document.getElementById('nwh-name').value.trim();
  if (!name) { toast('الرجاء إدخال اسم المستودع', 'error'); return; }
  try {
    await api.createWarehouse({
      name,
      location: document.getElementById('nwh-location').value,
      manager:  document.getElementById('nwh-manager').value,
      capacity: parseFloat(document.getElementById('nwh-capacity').value) || 0,
      notes:    document.getElementById('nwh-notes').value,
    });
    closeModal();
    toast('تم إضافة المستودع بنجاح', 'success');
    renderWarehouses();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openEditWarehouseModal(id) {
  const warehouses = window._warehouseData || [];
  const w = warehouses.find(x => x.id === id);
  if (!w) return;
  openModal('تعديل المستودع', `
    <div class="form-grid">
      <div class="form-group form-full">
        <label>اسم المستودع *</label>
        <input type="text" id="ewh-name" value="${w.name}">
      </div>
      <div class="form-group">
        <label>الموقع</label>
        <input type="text" id="ewh-location" value="${w.location || ''}">
      </div>
      <div class="form-group">
        <label>المسؤول</label>
        <input type="text" id="ewh-manager" value="${w.manager || ''}">
      </div>
      <div class="form-group">
        <label>السعة الاستيعابية (م²)</label>
        <input type="number" id="ewh-capacity" value="${w.capacity || 0}" min="0">
      </div>
      <div class="form-group form-full">
        <label>ملاحظات</label>
        <input type="text" id="ewh-notes" value="${w.notes || ''}">
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveEditWarehouse(${id})">💾 حفظ التغييرات</button>
    </div>
  `);
}

async function saveEditWarehouse(id) {
  const name = document.getElementById('ewh-name').value.trim();
  if (!name) { toast('الرجاء إدخال اسم المستودع', 'error'); return; }
  try {
    await api.updateWarehouse(id, {
      name,
      location: document.getElementById('ewh-location').value,
      manager:  document.getElementById('ewh-manager').value,
      capacity: parseFloat(document.getElementById('ewh-capacity').value) || 0,
      notes:    document.getElementById('ewh-notes').value,
    });
    closeModal();
    toast('تم تحديث المستودع بنجاح', 'success');
    renderWarehouses();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function toggleWarehouseStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  try {
    await api.updateWarehouse(id, { status: newStatus });
    toast(newStatus === 'active' ? 'تم تفعيل المستودع' : 'تم إغلاق المستودع', 'success');
    renderWarehouses();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== SHIPMENTS =====
async function renderShipments() {
  const content = document.getElementById('page-content');
  try {
    const [{ data: shipments }, sales] = await Promise.all([
      api.shipments(),
      api.sales().then(r => r.data),
    ]);

    const delivered  = shipments.filter(s => s.status === 'delivered').length;
    const inTransit  = shipments.filter(s => s.status === 'in_transit').length;
    const pending    = shipments.filter(s => s.status === 'pending').length;
    const cancelled  = shipments.filter(s => s.status === 'cancelled').length;

    content.innerHTML = `
      <div class="page-header">
        <div><h2>الشحن والتوصيل</h2><p>تتبع جميع عمليات الشحن وحالاتها</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportShipmentsExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportShipmentsPDF()">📄 PDF</button>
          <button class="btn btn-secondary" onclick="showPage('warehouses')">🏭 المستودعات</button>
          <button class="btn btn-primary" onclick="openNewShipmentModal()">＋ شحنة جديدة</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي الشحنات</div><div class="value">${shipments.length}</div></div>
        <div class="summary-box"><div class="label">قيد التنفيذ / مستعد</div><div class="value">${pending + shipments.filter(s => s.status === 'ready_to_ship').length}</div></div>
        <div class="summary-box loss"><div class="label">في الطريق</div><div class="value">${inTransit}</div></div>
        <div class="summary-box profit"><div class="label">تم التسليم</div><div class="value">${delivered}</div></div>
      </div>

      <div class="filters-bar">
        <input type="text" id="shp-search" placeholder="بحث برقم الشحنة أو العميل..." oninput="filterShipments()" style="flex:1;min-width:200px">
        <select id="shp-status-filter" onchange="filterShipments()">
          <option value="">كل الحالات</option>
          <option value="pending">قيد التنفيذ</option>
          <option value="ready_to_ship">مستعد للشحن</option>
          <option value="in_transit">في الطريق</option>
          <option value="arrived">وصل المخزن/العميل</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <select id="shp-type-filter" onchange="filterShipments()">
          <option value="">كل أنواع الشحن</option>
          <option value="بري">بري 🚛</option>
          <option value="بحري">بحري 🚢</option>
        </select>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الشحنة</th>
              <th>نوع الشحن</th>
              <th>الفاتورة</th>
              <th>العميل</th>
              <th>الوجهة</th>
              <th>السائق / المركبة</th>
              <th>تاريخ الشحن</th>
              <th>تاريخ التسليم</th>
              <th>العملة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr></thead>
            <tbody id="shp-tbody">${renderShipmentRows(shipments)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._shipmentData = shipments;
    window._salesForShipment = sales;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderShipmentRows(shipments) {
  if (!shipments.length) return `<tr><td colspan="11"><div class="empty-state" style="padding:40px"><div class="empty-icon">🚛</div><h3>لا توجد شحنات</h3></div></td></tr>`;
  return shipments.map(s => `
    <tr>
      <td class="number"><strong>${s.shipment_number}</strong></td>
      <td><span class="badge ${s.ship_type === 'بحري' ? 'badge-info' : 'badge-warning'}">${s.ship_type === 'بحري' ? '🚢 بحري' : '🚛 بري'}</span></td>
      <td class="number">${s.invoice_number ? `<span style="color:var(--accent)">${s.invoice_number}</span>` : '-'}</td>
      <td>${s.customer}</td>
      <td>${s.destination || '-'}</td>
      <td>
        <span>${s.driver || '-'}</span>
        ${s.vehicle ? `<br><small class="text-muted">${s.vehicle}</small>` : ''}
      </td>
      <td>${formatDate(s.shipment_date)}</td>
      <td>${s.delivery_date ? formatDate(s.delivery_date) : '<span class="text-muted">-</span>'}</td>
      <td><span class="badge ${s.currency === 'USD' ? 'badge-gold' : 'badge-info'}">${s.currency || 'EGP'}${s.currency === 'USD' && s.exchange_rate ? ' (' + s.exchange_rate + ')' : ''}</span></td>
      <td>${statusBadge(s.status)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="viewShipmentDetail(${s.id})">عرض</button>
        ${s.status !== 'delivered' && s.status !== 'cancelled'
          ? `<button class="btn btn-secondary btn-sm" onclick="openUpdateShipmentStatusModal(${s.id})">تحديث</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

async function filterShipments() {
  const search   = document.getElementById('shp-search').value;
  const status   = document.getElementById('shp-status-filter').value;
  const shipType = document.getElementById('shp-type-filter')?.value || '';
  let { data } = await api.shipments({ search, status });
  if (shipType) data = data.filter(s => s.ship_type === shipType);
  document.getElementById('shp-tbody').innerHTML = renderShipmentRows(data);
  window._shipmentData = data;
}

async function viewShipmentDetail(id) {
  const shipments = window._shipmentData || [];
  const s = shipments.find(x => x.id === id);
  if (!s) return;

  const productsTable = (s.products && s.products.length)
    ? `<div style="margin-top:12px">
        <strong>المنتجات المشحونة:</strong>
        <table style="width:100%;margin-top:8px">
          <thead><tr style="background:var(--bg-input)"><th style="padding:6px">المنتج</th><th style="padding:6px">الكمية</th><th style="padding:6px">الوحدة</th></tr></thead>
          <tbody>${s.products.map(p => `<tr><td style="padding:6px">${p.name}</td><td style="padding:6px;text-align:center">${p.qty}</td><td style="padding:6px;text-align:center">${p.unit || 'م²'}</td></tr>`).join('')}</tbody>
        </table>
       </div>`
    : '';

  openModal(`شحنة ${s.shipment_number}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div><span class="text-muted">العميل:</span> <strong>${s.customer}</strong></div>
      <div><span class="text-muted">الفاتورة:</span> <strong>${s.invoice_number || '-'}</strong></div>
      <div><span class="text-muted">نوع الشحن:</span> <strong>${s.ship_type === 'بحري' ? '🚢 بحري' : '🚛 بري'}</strong></div>
      <div><span class="text-muted">الحالة:</span> ${statusBadge(s.status)}</div>
      <div><span class="text-muted">مصدر الشحنة:</span> <strong>${s.origin || '-'}</strong></div>
      <div><span class="text-muted">الوجهة:</span> <strong>${s.destination || '-'}</strong></div>
      <div><span class="text-muted">السائق:</span> <strong>${s.driver || '-'}</strong></div>
      <div><span class="text-muted">المركبة:</span> <strong>${s.vehicle || '-'}</strong></div>
      <div><span class="text-muted">الوزن:</span> <strong>${s.weight_tons ? s.weight_tons + ' طن' : '-'}</strong></div>
      <div><span class="text-muted">العملة:</span> <strong>${s.currency || 'EGP'}${s.currency === 'USD' && s.exchange_rate ? ' (سعر: ' + s.exchange_rate + ' ج.م)' : ''}</strong></div>
      <div><span class="text-muted">بوليصة الشحن:</span> <strong>${s.bill_of_lading || '-'}</strong></div>
      <div><span class="text-muted">رقم القافلة:</span> <strong>${s.convoy_number || '-'}</strong></div>
      <div><span class="text-muted">المستلم:</span> <strong>${s.receiver || '-'}</strong></div>
      <div></div>
      <div><span class="text-muted">تاريخ الشحن:</span> <strong>${formatDate(s.shipment_date)}</strong></div>
      <div><span class="text-muted">تاريخ التسليم:</span> <strong>${s.delivery_date ? formatDate(s.delivery_date) : 'لم يُسلَّم بعد'}</strong></div>
    </div>
    ${productsTable}
    ${s.customs_notes ? `<div style="margin-top:12px;padding:12px;background:var(--bg-input);border-radius:8px"><strong>ملاحظات الجمارك/الضرائب:</strong> ${s.customs_notes}</div>` : ''}
    ${s.notes ? `<div style="margin-top:8px;padding:12px;background:var(--bg-input);border-radius:8px"><strong>ملاحظات:</strong> ${s.notes}</div>` : ''}
    ${s.status !== 'delivered' && s.status !== 'cancelled' ? `
      <div style="margin-top:16px;text-align:left">
        <button class="btn btn-primary" onclick="closeModal();openUpdateShipmentStatusModal(${s.id})">تحديث الحالة</button>
      </div>` : ''}
  `);
}

function openUpdateShipmentStatusModal(id) {
  const shipments = window._shipmentData || [];
  const s = shipments.find(x => x.id === id);
  if (!s) return;
  openModal(`تحديث حالة الشحنة ${s.shipment_number}`, `
    <div style="margin-bottom:16px">
      <p>العميل: <strong>${s.customer}</strong></p>
      <p>الوجهة: <strong>${s.destination || '-'}</strong></p>
      <p>الحالة الحالية: ${statusBadge(s.status)}</p>
    </div>
    <div class="form-group">
      <label>الحالة الجديدة *</label>
      <select id="shp-new-status">
        <option value="pending"       ${s.status==='pending'       ?'selected':''}>قيد التنفيذ</option>
        <option value="ready_to_ship" ${s.status==='ready_to_ship' ?'selected':''}>مستعد للشحن</option>
        <option value="in_transit"    ${s.status==='in_transit'    ?'selected':''}>في الطريق</option>
        <option value="arrived"       ${s.status==='arrived'       ?'selected':''}>وصل المخزن/العميل</option>
        <option value="delivered"     ${s.status==='delivered'     ?'selected':''}>تم التسليم</option>
        <option value="cancelled"     ${s.status==='cancelled'     ?'selected':''}>ملغاة</option>
      </select>
    </div>
    <div class="form-group" id="delivery-date-group" style="display:none">
      <label>تاريخ التسليم الفعلي</label>
      <input type="date" id="shp-delivery-date" value="${new Date().toISOString().split('T')[0]}">
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="confirmUpdateShipmentStatus(${id})">💾 تحديث</button>
    </div>
  `);
  document.getElementById('shp-new-status').addEventListener('change', function() {
    document.getElementById('delivery-date-group').style.display = this.value === 'delivered' ? '' : 'none';
  });
  if (s.status === 'delivered') document.getElementById('delivery-date-group').style.display = '';
}

async function confirmUpdateShipmentStatus(id) {
  const newStatus    = document.getElementById('shp-new-status').value;
  const deliveryDate = document.getElementById('shp-delivery-date')?.value;
  const extraData    = newStatus === 'delivered' && deliveryDate ? { delivery_date: deliveryDate } : undefined;
  try {
    await api.updateShipmentStatus(id, newStatus, extraData);
    closeModal();
    toast('تم تحديث حالة الشحنة بنجاح', 'success');
    renderShipments();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== SHIPMENT PRODUCTS EDITOR =====
let _shipmentProducts = [];

function addShipmentProductRow() {
  _shipmentProducts.push({ name: '', qty: 1, unit: 'م²' });
  renderShipmentProductsTable();
}

function removeShipmentProduct(idx) {
  _shipmentProducts.splice(idx, 1);
  renderShipmentProductsTable();
}

function renderShipmentProductsTable() {
  const tbody = document.getElementById('nshp-products-body');
  if (!tbody) return;
  if (!_shipmentProducts.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:8px">لا توجد منتجات. اضغط "إضافة منتج".</td></tr>`;
    return;
  }
  tbody.innerHTML = _shipmentProducts.map((p, i) => `
    <tr>
      <td><input type="text" class="form-control" style="min-width:150px" value="${p.name}" oninput="_shipmentProducts[${i}].name=this.value" placeholder="اسم المنتج"></td>
      <td><input type="number" class="form-control" style="width:80px" value="${p.qty}" min="0" oninput="_shipmentProducts[${i}].qty=parseFloat(this.value)||0"></td>
      <td>
        <select class="form-control" style="width:80px" onchange="_shipmentProducts[${i}].unit=this.value">
          <option value="م²" ${p.unit==='م²'?'selected':''}>م²</option>
          <option value="طن" ${p.unit==='طن'?'selected':''}>طن</option>
          <option value="قطعة" ${p.unit==='قطعة'?'selected':''}>قطعة</option>
          <option value="م³" ${p.unit==='م³'?'selected':''}>م³</option>
        </select>
      </td>
      <td><button class="btn btn-danger btn-sm" onclick="removeShipmentProduct(${i})">✕</button></td>
    </tr>
  `).join('');
}

function openNewShipmentModal() {
  const sales = (window._salesForShipment || []).filter(s => !INVALID_INVOICE_STATUSES.includes(s.status));
  const warehouses = window._warehouseData || [];
  _shipmentProducts = [];
  openModal('شحنة جديدة', `
    <div class="form-grid">
      <div class="form-group">
        <label>ربط بفاتورة</label>
        <select id="nshp-invoice" onchange="prefillShipmentCustomer()">
          <option value="">-- اختر فاتورة (اختياري) --</option>
          ${sales.map(s => `<option value="${s.id}" data-customer="${s.customer}" data-num="${s.invoice_number}">${s.invoice_number} - ${s.customer}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>العميل *</label>
        <input type="text" id="nshp-customer" placeholder="اسم العميل">
      </div>
      <div class="form-group">
        <label>نوع الشحن *</label>
        <select id="nshp-ship-type">
          <option value="بري">🚛 بري</option>
          <option value="بحري">🚢 بحري</option>
        </select>
      </div>
      <div class="form-group">
        <label>المستودع / مصدر الشحنة</label>
        <select id="nshp-origin">
          <option value="">-- اختر المستودع --</option>
          ${warehouses.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>الوجهة *</label>
        <input type="text" id="nshp-dest" placeholder="عنوان التسليم">
      </div>
      <div class="form-group">
        <label>السائق</label>
        <input type="text" id="nshp-driver" placeholder="اسم السائق">
      </div>
      <div class="form-group">
        <label>رقم المركبة</label>
        <input type="text" id="nshp-vehicle" placeholder="لوحة / نوع السيارة">
      </div>
      <div class="form-group">
        <label>الوزن (طن)</label>
        <input type="number" id="nshp-weight" placeholder="0.0" min="0" step="0.1">
      </div>
      <div class="form-group">
        <label>بوليصة الشحن (Bill of Lading)</label>
        <input type="text" id="nshp-bol" placeholder="رقم بوليصة الشحن">
      </div>
      <div class="form-group">
        <label>رقم القافلة</label>
        <input type="text" id="nshp-convoy" placeholder="رقم القافلة (للشحن البري)">
      </div>
      <div class="form-group">
        <label>اسم المستلم</label>
        <input type="text" id="nshp-receiver" placeholder="اسم المستلم عند الوصول">
      </div>
      <div class="form-group">
        <label>تاريخ الشحن *</label>
        <input type="date" id="nshp-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>العملة</label>
        <select id="nshp-currency" onchange="toggleExchangeRate()">
          <option value="EGP">EGP - جنيه مصري</option>
          <option value="USD">USD - دولار أمريكي</option>
        </select>
      </div>
      <div class="form-group" id="nshp-rate-group" style="display:none">
        <label>سعر الصرف (جنيه/دولار)</label>
        <input type="number" id="nshp-rate" placeholder="مثال: 31" min="1" step="0.1">
      </div>
      <div class="form-group form-full">
        <label>ملاحظات الجمارك / الضرائب / السلامة</label>
        <input type="text" id="nshp-customs" placeholder="مثال: خاضع لضريبة تصدير 5%، يحتاج شهادة جمركية...">
      </div>
      <div class="form-group form-full">
        <label>ملاحظات إضافية</label>
        <input type="text" id="nshp-notes" placeholder="ملاحظات إضافية">
      </div>
    </div>

    <div style="margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>المنتجات المصدرة</strong>
        <button class="btn btn-secondary btn-sm" onclick="addShipmentProductRow()">＋ إضافة منتج</button>
      </div>
      <div class="data-table-wrapper" style="max-height:200px;overflow-y:auto">
        <table style="width:100%">
          <thead><tr><th>المنتج</th><th>الكمية</th><th>الوحدة</th><th></th></tr></thead>
          <tbody id="nshp-products-body"></tbody>
        </table>
      </div>
    </div>

    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveNewShipment()">💾 حفظ الشحنة</button>
    </div>
  `);
  renderShipmentProductsTable();
}

function toggleExchangeRate() {
  const currency = document.getElementById('nshp-currency')?.value;
  const group    = document.getElementById('nshp-rate-group');
  if (group) group.style.display = currency === 'USD' ? '' : 'none';
}

function prefillShipmentCustomer() {
  const sel = document.getElementById('nshp-invoice');
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.customer) {
    document.getElementById('nshp-customer').value = opt.dataset.customer;
  }
}

async function saveNewShipment() {
  const customer = document.getElementById('nshp-customer').value.trim();
  const dest     = document.getElementById('nshp-dest').value.trim();
  const date     = document.getElementById('nshp-date').value;
  const currency = document.getElementById('nshp-currency').value;

  if (!customer) { toast('الرجاء إدخال اسم العميل', 'error'); return; }
  if (!dest)     { toast('الرجاء إدخال الوجهة', 'error'); return; }
  if (!date)     { toast('الرجاء إدخال تاريخ الشحن', 'error'); return; }

  const invSel       = document.getElementById('nshp-invoice');
  const invOpt       = invSel.options[invSel.selectedIndex];
  const invId        = invSel.value ? parseInt(invSel.value) : null;
  const invNum       = invOpt && invId ? invOpt.dataset.num : null;
  const exchangeRate = currency === 'USD' ? (parseFloat(document.getElementById('nshp-rate').value) || null) : null;

  try {
    await api.createShipment({
      invoice_id:     invId,
      invoice_number: invNum,
      customer,
      ship_type:     document.getElementById('nshp-ship-type').value,
      origin:        document.getElementById('nshp-origin').value,
      destination:   dest,
      driver:        document.getElementById('nshp-driver').value,
      vehicle:       document.getElementById('nshp-vehicle').value,
      weight_tons:   parseFloat(document.getElementById('nshp-weight').value) || 0,
      bill_of_lading: document.getElementById('nshp-bol').value || null,
      convoy_number:  document.getElementById('nshp-convoy').value || null,
      receiver:       document.getElementById('nshp-receiver').value || null,
      shipment_date:  date,
      currency,
      exchange_rate:  exchangeRate,
      products:       _shipmentProducts.filter(p => p.name.trim()),
      customs_notes:  document.getElementById('nshp-customs').value,
      notes:          document.getElementById('nshp-notes').value,
    });
    closeModal();
    toast('تم إنشاء الشحنة بنجاح', 'success');
    renderShipments();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== EXPORT: SHIPMENTS PDF =====
function exportShipmentsPDF() {
  const shipments = window._shipmentData || [];
  if (!shipments.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof window.jspdf === 'undefined') { toast('مكتبة PDF غير محملة بعد، حاول مجدداً', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.text('تقرير الشحنات - نظام ERP الرخام والجرانيت', 148, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`, 148, 22, { align: 'center' });

  const statusLabel = { pending: 'قيد التنفيذ', ready_to_ship: 'مستعد للشحن', in_transit: 'في الطريق', arrived: 'وصل', delivered: 'تم التسليم', cancelled: 'ملغاة' };
  let y = 32;
  const cols = [15, 40, 55, 70, 105, 140, 170, 200, 220, 250];
  const headers = ['#', 'رقم الشحنة', 'نوع الشحن', 'العميل', 'الوجهة', 'تاريخ الشحن', 'تاريخ التسليم', 'العملة', 'الحالة'];

  doc.setFillColor(40, 40, 40);
  doc.rect(10, y - 5, 277, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  headers.forEach((h, i) => doc.text(h, cols[i], y, { align: 'left' }));
  doc.setTextColor(0, 0, 0);
  y += 8;

  shipments.forEach((s, idx) => {
    if (y > 185) { doc.addPage(); y = 20; }
    const row = [
      String(idx + 1),
      s.shipment_number,
      s.ship_type || 'بري',
      (s.customer || '').substring(0, 18),
      (s.destination || '-').substring(0, 22),
      formatDate(s.shipment_date),
      s.delivery_date ? formatDate(s.delivery_date) : '-',
      s.currency || 'EGP',
      statusLabel[s.status] || s.status,
    ];
    doc.setFontSize(8);
    row.forEach((cell, i) => doc.text(cell, cols[i], y));
    y += 7;
  });

  doc.save(`shipments-${new Date().toISOString().split('T')[0]}.pdf`);
  toast('تم تصدير PDF بنجاح', 'success');
}

// ===== EXPORT: SHIPMENTS EXCEL =====
function exportShipmentsExcel() {
  const shipments = window._shipmentData || [];
  if (!shipments.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('مكتبة Excel غير محملة بعد، حاول مجدداً', 'error'); return; }

  const statusLabel = { pending: 'قيد التنفيذ', ready_to_ship: 'مستعد للشحن', in_transit: 'في الطريق', arrived: 'وصل', delivered: 'تم التسليم', cancelled: 'ملغاة' };
  const rows = shipments.map(s => ({
    'رقم الشحنة':      s.shipment_number,
    'نوع الشحن':       s.ship_type || 'بري',
    'الفاتورة':        s.invoice_number || '-',
    'العميل':          s.customer,
    'المصدر':          s.origin || '-',
    'الوجهة':          s.destination || '-',
    'السائق':          s.driver || '-',
    'المركبة':         s.vehicle || '-',
    'الوزن (طن)':      s.weight_tons || 0,
    'بوليصة الشحن':   s.bill_of_lading || '-',
    'رقم القافلة':     s.convoy_number || '-',
    'المستلم':         s.receiver || '-',
    'تاريخ الشحن':     s.shipment_date,
    'تاريخ التسليم':   s.delivery_date || '-',
    'العملة':          s.currency || 'EGP',
    'سعر الصرف':       s.exchange_rate || '-',
    'المنتجات':        (s.products || []).map(p => `${p.name} (${p.qty} ${p.unit || 'م²'})`).join(' | ') || '-',
    'ملاحظات الجمارك': s.customs_notes || '-',
    'ملاحظات':         s.notes || '-',
    'الحالة':          statusLabel[s.status] || s.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الشحنات');
  XLSX.writeFile(wb, `shipments-${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('تم تصدير Excel بنجاح', 'success');
}

// ===== SHIPMENT REPORTS PAGE =====
async function renderShipmentReport() {
  const content = document.getElementById('page-content');
  try {
    const r = await api.reportShipments();

    content.innerHTML = `
      <div class="page-header">
        <div><h2>تقارير التصدير</h2><p>إحصائيات وتقارير شحنات التصدير</p></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="exportShipmentReportExcel()">📊 Excel</button>
          <button class="btn btn-secondary" onclick="exportShipmentReportPDF()">📄 PDF</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box gold">  <div class="label">إجمالي الشحنات</div>       <div class="value">${r.total}</div></div>
        <div class="summary-box">       <div class="label">شحن بحري 🚢</div>           <div class="value">${r.sea_count}</div></div>
        <div class="summary-box">       <div class="label">شحن بري 🚛</div>            <div class="value">${r.land_count}</div></div>
        <div class="summary-box profit"><div class="label">تم التسليم</div>             <div class="value">${r.delivered_count}</div></div>
        <div class="summary-box loss">  <div class="label">متأخرة</div>                <div class="value">${r.delayed_count}</div></div>
      </div>

      <div class="filters-bar">
        <select id="rpt-type-filter" onchange="filterShipmentReport()">
          <option value="">كل أنواع الشحن</option>
          <option value="بري">🚛 بري</option>
          <option value="بحري">🚢 بحري</option>
        </select>
        <select id="rpt-status-filter" onchange="filterShipmentReport()">
          <option value="">كل الحالات</option>
          <option value="pending">قيد التنفيذ</option>
          <option value="ready_to_ship">مستعد للشحن</option>
          <option value="in_transit">في الطريق</option>
          <option value="arrived">وصل المخزن/العميل</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <input type="date" id="rpt-date-from" onchange="filterShipmentReport()" title="من تاريخ">
        <input type="date" id="rpt-date-to"   onchange="filterShipmentReport()" title="إلى تاريخ">
      </div>

      ${r.delayed_count > 0 ? `
      <div class="card" style="border-color:var(--danger);background:rgba(239,68,68,0.05)">
        <div class="card-header">
          <span class="card-title" style="color:var(--danger)">⚠️ شحنات متأخرة (${r.delayed_count})</span>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr><th>رقم الشحنة</th><th>العميل</th><th>الوجهة</th><th>تاريخ الشحن</th><th>الحالة</th></tr></thead>
            <tbody>
              ${r.delayed.map(s => `
                <tr>
                  <td class="number"><strong>${s.shipment_number}</strong></td>
                  <td>${s.customer}</td>
                  <td>${s.destination || '-'}</td>
                  <td>${formatDate(s.shipment_date)}</td>
                  <td>${statusBadge(s.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <div class="card" style="padding:0">
        <div class="card-header" style="padding:16px 20px">
          <span class="card-title">جميع الشحنات</span>
        </div>
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الشحنة</th>
              <th>نوع الشحن</th>
              <th>الفاتورة</th>
              <th>العميل</th>
              <th>المنتجات</th>
              <th>الوجهة</th>
              <th>تاريخ الشحن</th>
              <th>تاريخ التسليم</th>
              <th>العملة</th>
              <th>الحالة</th>
            </tr></thead>
            <tbody id="rpt-tbody">${renderShipmentReportRows(r.items)}</tbody>
          </table>
        </div>
      </div>
    `;
    window._shipmentReportData = r.items;
  } catch (e) {
    content.innerHTML = `<div class="card"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

function renderShipmentReportRows(items) {
  if (!items.length) return `<tr><td colspan="10"><div class="empty-state" style="padding:40px"><div class="empty-icon">📦</div><h3>لا توجد شحنات</h3></div></td></tr>`;
  return items.map(s => `
    <tr>
      <td class="number"><strong>${s.shipment_number}</strong></td>
      <td><span class="badge ${s.ship_type === 'بحري' ? 'badge-info' : 'badge-warning'}">${s.ship_type === 'بحري' ? '🚢 بحري' : '🚛 بري'}</span></td>
      <td class="number">${s.invoice_number ? `<span style="color:var(--accent)">${s.invoice_number}</span>` : '-'}</td>
      <td>${s.customer}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${(s.products && s.products.length) ? s.products.map(p => `${p.name} (${p.qty})`).join(' | ') : '-'}
      </td>
      <td>${s.destination || '-'}</td>
      <td>${formatDate(s.shipment_date)}</td>
      <td>${s.delivery_date ? formatDate(s.delivery_date) : '-'}</td>
      <td><span class="badge ${s.currency === 'USD' ? 'badge-gold' : 'badge-info'}">${s.currency || 'EGP'}</span></td>
      <td>${statusBadge(s.status)}</td>
    </tr>
  `).join('');
}

async function filterShipmentReport() {
  const ship_type = document.getElementById('rpt-type-filter').value;
  const status    = document.getElementById('rpt-status-filter').value;
  const date_from = document.getElementById('rpt-date-from').value;
  const date_to   = document.getElementById('rpt-date-to').value;
  const r = await api.reportShipments({ ship_type, status, date_from, date_to });
  document.getElementById('rpt-tbody').innerHTML = renderShipmentReportRows(r.items);
  window._shipmentReportData = r.items;
}

function exportShipmentReportExcel() {
  const items = window._shipmentReportData || [];
  if (!items.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof XLSX === 'undefined') { toast('مكتبة Excel غير محملة بعد', 'error'); return; }

  const statusLabel = { pending: 'قيد التنفيذ', ready_to_ship: 'مستعد للشحن', in_transit: 'في الطريق', arrived: 'وصل', delivered: 'تم التسليم', cancelled: 'ملغاة' };
  const rows = items.map(s => ({
    'رقم الشحنة':      s.shipment_number,
    'نوع الشحن':       s.ship_type || '-',
    'الفاتورة':        s.invoice_number || '-',
    'العميل':          s.customer,
    'المنتجات':        (s.products || []).map(p => `${p.name} (${p.qty} ${p.unit || 'م²'})`).join(' | ') || '-',
    'الوجهة':          s.destination || '-',
    'تاريخ الشحن':     s.shipment_date,
    'تاريخ التسليم':   s.delivery_date || '-',
    'العملة':          s.currency || 'EGP',
    'سعر الصرف':       s.exchange_rate || '-',
    'الحالة':          statusLabel[s.status] || s.status,
    'ملاحظات الجمارك': s.customs_notes || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير الشحنات');
  XLSX.writeFile(wb, `shipment-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  toast('تم تصدير Excel بنجاح', 'success');
}

function exportShipmentReportPDF() {
  const items = window._shipmentReportData || [];
  if (!items.length) { toast('لا توجد بيانات للتصدير', 'error'); return; }
  if (typeof window.jspdf === 'undefined') { toast('مكتبة PDF غير محملة بعد', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.text('تقرير التصدير - نظام ERP الرخام والجرانيت', 148, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}`, 148, 22, { align: 'center' });

  const statusLabel = { pending: 'قيد التنفيذ', ready_to_ship: 'مستعد للشحن', in_transit: 'في الطريق', arrived: 'وصل', delivered: 'تم التسليم', cancelled: 'ملغاة' };
  let y = 32;
  const cols = [15, 40, 60, 75, 115, 160, 190, 220, 250];
  const headers = ['#', 'رقم الشحنة', 'نوع الشحن', 'العميل', 'الوجهة', 'تاريخ الشحن', 'تاريخ التسليم', 'العملة', 'الحالة'];

  doc.setFillColor(40, 40, 40);
  doc.rect(10, y - 5, 277, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  headers.forEach((h, i) => doc.text(h, cols[i], y));
  doc.setTextColor(0, 0, 0);
  y += 8;

  items.forEach((s, idx) => {
    if (y > 185) { doc.addPage(); y = 20; }
    const row = [
      String(idx + 1),
      s.shipment_number,
      s.ship_type || 'بري',
      (s.customer || '').substring(0, 18),
      (s.destination || '-').substring(0, 26),
      formatDate(s.shipment_date),
      s.delivery_date ? formatDate(s.delivery_date) : '-',
      s.currency || 'EGP',
      statusLabel[s.status] || s.status,
    ];
    doc.setFontSize(8);
    row.forEach((cell, i) => doc.text(cell, cols[i], y));
    y += 7;
  });

  doc.save(`shipment-report-${new Date().toISOString().split('T')[0]}.pdf`);
  toast('تم تصدير PDF بنجاح', 'success');
}

// ===== EXPORT: WAREHOUSES =====
function exportWarehousesPDF() {
  const warehouses = window._warehouseData || [];
  const headers = ['#', 'اسم المستودع', 'الموقع', 'المسؤول', 'السعة (م²)', 'الحالة'];
  const rows = warehouses.map((w, i) => [i + 1, (w.name || '').substring(0, 20), (w.location || '-').substring(0, 18), w.manager || '-', (w.capacity || 0).toLocaleString('ar-EG'), w.status === 'active' ? 'نشط' : 'مغلق']);
  exportGenericPDF({ title: 'إدارة المستودعات', subtitle: 'نظام ERP - الرخام والجرانيت', headers, rows, filename: `warehouses-${new Date().toISOString().split('T')[0]}.pdf`, orientation: 'portrait' });
}

function exportWarehousesExcel() {
  const warehouses = window._warehouseData || [];
  const headers = ['اسم المستودع', 'الموقع', 'المسؤول', 'السعة (م²)', 'الحالة', 'ملاحظات'];
  const rows = warehouses.map(w => [w.name, w.location || '-', w.manager || '-', w.capacity || 0, w.status === 'active' ? 'نشط' : 'مغلق', w.notes || '-']);
  exportGenericExcel({ sheetName: 'المستودعات', headers, rows, filename: `warehouses-${new Date().toISOString().split('T')[0]}.xlsx` });
}
