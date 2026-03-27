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
          <button class="btn btn-secondary" onclick="showPage('warehouses')">🏭 المستودعات</button>
          <button class="btn btn-primary" onclick="openNewShipmentModal()">＋ شحنة جديدة</button>
        </div>
      </div>

      <div class="report-summary">
        <div class="summary-box gold"><div class="label">إجمالي الشحنات</div><div class="value">${shipments.length}</div></div>
        <div class="summary-box"><div class="label">قيد التنفيذ</div><div class="value">${pending}</div></div>
        <div class="summary-box loss"><div class="label">في الطريق</div><div class="value">${inTransit}</div></div>
        <div class="summary-box profit"><div class="label">تم التسليم</div><div class="value">${delivered}</div></div>
      </div>

      <div class="filters-bar">
        <input type="text" id="shp-search" placeholder="بحث برقم الشحنة أو العميل..." oninput="filterShipments()" style="flex:1;min-width:200px">
        <select id="shp-status-filter" onchange="filterShipments()">
          <option value="">كل الحالات</option>
          <option value="pending">قيد التنفيذ</option>
          <option value="in_transit">في الطريق</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      <div class="card" style="padding:0">
        <div class="data-table-wrapper">
          <table>
            <thead><tr>
              <th>رقم الشحنة</th>
              <th>الفاتورة</th>
              <th>العميل</th>
              <th>الوجهة</th>
              <th>السائق / المركبة</th>
              <th>تاريخ الشحن</th>
              <th>تاريخ التسليم</th>
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
  if (!shipments.length) return `<tr><td colspan="9"><div class="empty-state" style="padding:40px"><div class="empty-icon">🚛</div><h3>لا توجد شحنات</h3></div></td></tr>`;
  return shipments.map(s => `
    <tr>
      <td class="number"><strong>${s.shipment_number}</strong></td>
      <td class="number">${s.invoice_number ? `<span style="color:var(--accent)">${s.invoice_number}</span>` : '-'}</td>
      <td>${s.customer}</td>
      <td>${s.destination || '-'}</td>
      <td>
        <span>${s.driver || '-'}</span>
        ${s.vehicle ? `<br><small class="text-muted">${s.vehicle}</small>` : ''}
      </td>
      <td>${formatDate(s.shipment_date)}</td>
      <td>${s.delivery_date ? formatDate(s.delivery_date) : '<span class="text-muted">-</span>'}</td>
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
  const search = document.getElementById('shp-search').value;
  const status = document.getElementById('shp-status-filter').value;
  const { data } = await api.shipments({ search, status });
  document.getElementById('shp-tbody').innerHTML = renderShipmentRows(data);
  window._shipmentData = data;
}

async function viewShipmentDetail(id) {
  const shipments = window._shipmentData || [];
  const s = shipments.find(x => x.id === id);
  if (!s) return;
  openModal(`شحنة ${s.shipment_number}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div><span class="text-muted">العميل:</span> <strong>${s.customer}</strong></div>
      <div><span class="text-muted">الفاتورة:</span> <strong>${s.invoice_number || '-'}</strong></div>
      <div><span class="text-muted">مصدر الشحنة:</span> <strong>${s.origin || '-'}</strong></div>
      <div><span class="text-muted">الوجهة:</span> <strong>${s.destination || '-'}</strong></div>
      <div><span class="text-muted">السائق:</span> <strong>${s.driver || '-'}</strong></div>
      <div><span class="text-muted">المركبة:</span> <strong>${s.vehicle || '-'}</strong></div>
      <div><span class="text-muted">الوزن:</span> <strong>${s.weight_tons ? s.weight_tons + ' طن' : '-'}</strong></div>
      <div><span class="text-muted">الحالة:</span> ${statusBadge(s.status)}</div>
      <div><span class="text-muted">تاريخ الشحن:</span> <strong>${formatDate(s.shipment_date)}</strong></div>
      <div><span class="text-muted">تاريخ التسليم:</span> <strong>${s.delivery_date ? formatDate(s.delivery_date) : 'لم يُسلَّم بعد'}</strong></div>
    </div>
    ${s.notes ? `<div style="padding:12px;background:var(--bg-input);border-radius:8px"><strong>ملاحظات:</strong> ${s.notes}</div>` : ''}
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
        <option value="pending"    ${s.status==='pending'    ?'selected':''}>قيد التنفيذ</option>
        <option value="in_transit" ${s.status==='in_transit' ?'selected':''}>في الطريق</option>
        <option value="delivered"  ${s.status==='delivered'  ?'selected':''}>تم التسليم</option>
        <option value="cancelled"  ${s.status==='cancelled'  ?'selected':''}>ملغاة</option>
      </select>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="confirmUpdateShipmentStatus(${id})">💾 تحديث</button>
    </div>
  `);
}

async function confirmUpdateShipmentStatus(id) {
  const newStatus = document.getElementById('shp-new-status').value;
  try {
    await api.updateShipmentStatus(id, newStatus);
    closeModal();
    toast('تم تحديث حالة الشحنة بنجاح', 'success');
    renderShipments();
  } catch (e) {
    toast(e.message, 'error');
  }
}

function openNewShipmentModal() {
  const sales = (window._salesForShipment || []).filter(s => !INVALID_INVOICE_STATUSES.includes(s.status));
  const warehouses = window._warehouseData || [];
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
        <label>تاريخ الشحن *</label>
        <input type="date" id="nshp-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group form-full">
        <label>ملاحظات</label>
        <input type="text" id="nshp-notes" placeholder="ملاحظات إضافية">
      </div>
    </div>
    <div style="margin-top:16px;text-align:left">
      <button class="btn btn-primary" onclick="saveNewShipment()">💾 حفظ الشحنة</button>
    </div>
  `);
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

  if (!customer) { toast('الرجاء إدخال اسم العميل', 'error'); return; }
  if (!dest)     { toast('الرجاء إدخال الوجهة', 'error'); return; }
  if (!date)     { toast('الرجاء إدخال تاريخ الشحن', 'error'); return; }

  const invSel  = document.getElementById('nshp-invoice');
  const invOpt  = invSel.options[invSel.selectedIndex];
  const invId   = invSel.value ? parseInt(invSel.value) : null;
  const invNum  = invOpt && invId ? invOpt.dataset.num : null;

  try {
    await api.createShipment({
      invoice_id:     invId,
      invoice_number: invNum,
      customer,
      origin:        document.getElementById('nshp-origin').value,
      destination:   dest,
      driver:        document.getElementById('nshp-driver').value,
      vehicle:       document.getElementById('nshp-vehicle').value,
      weight_tons:   parseFloat(document.getElementById('nshp-weight').value) || 0,
      shipment_date: date,
      notes:         document.getElementById('nshp-notes').value,
    });
    closeModal();
    toast('تم إنشاء الشحنة بنجاح', 'success');
    renderShipments();
  } catch (e) {
    toast(e.message, 'error');
  }
}
