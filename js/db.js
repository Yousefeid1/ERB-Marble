// ============================================================
// db.js — طبقة قاعدة البيانات IndexedDB باستخدام Dexie.js
// تدعم: Schema Versioning، مخزن الصور كـ Blob، ترحيل localStorage
// ============================================================

(function () {
  'use strict';

  // تأخير التهيئة حتى يكون Dexie متاحاً
  function initMarbleDB() {
    if (typeof Dexie === 'undefined') return;

    const db = new Dexie('MarbleERP');

    // ===== Schema Versioning =====
    // الإصدار 1 — الهيكل الأساسي
    db.version(1).stores({
      users:                '++id, email, role',
      customers:            '++id, name',
      suppliers:            '++id, name',
      products:             '++id, code, category',
      blocks:               '++id, code, status, type',
      slabs:                '++id, code, block_id, status, grade',
      sales:                '++id, invoice_number, customer_id, status',
      purchases:            '++id, invoice_number, supplier_id, status',
      payments:             '++id, party_id, type',
      expenses:             '++id, category',
      cutting:              '++id, batch_number, block_id',
      journal:              '++id, number, date',
      journal_entries:      '++id, date',
      accounts:             '++id, code, type',
      projects:             '++id, customer_id',
      notifications:        '++id, is_read',
      warehouses:           '++id',
      shipments:            '++id, invoice_id, status',
      warehouse_inventory:  '++id, warehouse_id, product_id',
      settings:             'key',
      activity_log:         '++id, createdAt',
      quotations:           '++id',
      commissions:          '++id',
      checks:               '++id',
      manufacturing_stages: '++id, blockId, date',
      recurring_entries:    '++id',
      cost_centers:         '++id',
      // مخزن منفصل للصور كـ Blob لتوفير 33% من الذاكرة
      images:               '++id, entity_type, entity_id',
      // سجل التدقيق غير قابل للتعديل
      audit_trail:          '++id, entity, entity_id, changed_at',
    });

    // الإصدار 2 — إضافة حقول الفاتورة الإلكترونية ETA
    db.version(2).stores({
      sales: '++id, invoice_number, customer_id, status, uuid',
    }).upgrade(tx => {
      return tx.table('sales').toCollection().modify(inv => {
        if (!inv.uuid) inv.uuid = _generateUUID();
        if (!inv.eta_qr) inv.eta_qr = null;
      });
    });

    // الإصدار 3 — إضافة حقول الماكينة وحساب الهالك في النشر
    db.version(3).stores({
      cutting: '++id, batch_number, block_id, machine_type',
    }).upgrade(tx => {
      return tx.table('cutting').toCollection().modify(cut => {
        if (!cut.machine_type) cut.machine_type = 'gang_saw';
        if (cut.kerf_loss_mm === undefined) cut.kerf_loss_mm = 3.5;
        if (cut.yield_m2 === undefined) cut.yield_m2 = 0;
      });
    });

    window.MarbleDB = db;
    window._marbleDBReady = true;

    // ترحيل البيانات من localStorage إلى IndexedDB عند أول تشغيل
    _migrateFromLocalStorage(db);

    // بدء الاستماع للتغييرات من التبويبات الأخرى
    _initReceiveChannel(db);
  }

  // ===== ترحيل localStorage → IndexedDB =====
  async function _migrateFromLocalStorage(db) {
    try {
      const migrated = localStorage.getItem('_idb_migrated');
      if (migrated) return; // سبق الترحيل

      const tables = [
        'users', 'customers', 'suppliers', 'products', 'blocks', 'slabs',
        'sales', 'purchases', 'payments', 'expenses', 'cutting', 'journal',
        'journal_entries', 'accounts', 'projects', 'notifications', 'warehouses',
        'shipments', 'warehouse_inventory', 'activity_log', 'quotations',
        'commissions', 'checks', 'manufacturing_stages', 'recurring_entries',
        'cost_centers',
      ];

      for (const table of tables) {
        const raw = localStorage.getItem('marble_db_' + table);
        if (!raw) continue;
        try {
          const items = JSON.parse(raw);
          if (Array.isArray(items) && items.length > 0) {
            await db.table(table).bulkPut(items);
          }
        } catch (_) {}
      }

      // ترحيل الإعدادات
      const settingsRaw = localStorage.getItem('marble_db_settings');
      if (settingsRaw) {
        try {
          const s = JSON.parse(settingsRaw);
          await db.table('settings').put({ key: 'main', ...s });
        } catch (_) {}
      }

      localStorage.setItem('_idb_migrated', new Date().toISOString());
    } catch (e) {
      console.warn('فشل ترحيل البيانات إلى IndexedDB:', e.message);
    }
  }

  // ===== حفظ صورة كـ Blob في IndexedDB =====
  async function saveImageBlob(entityType, entityId, blob) {
    if (!window.MarbleDB) return null;
    try {
      const id = await window.MarbleDB.images.put({
        entity_type: entityType,
        entity_id:   entityId,
        blob,
        saved_at:    new Date().toISOString(),
      });
      return id;
    } catch (e) {
      console.warn('فشل حفظ الصورة:', e.message);
      return null;
    }
  }

  // ===== استرداد صورة Blob من IndexedDB =====
  async function getImageBlob(entityType, entityId) {
    if (!window.MarbleDB) return null;
    try {
      const rec = await window.MarbleDB.images
        .where({ entity_type: entityType, entity_id: entityId })
        .first();
      return rec ? rec.blob : null;
    } catch (e) {
      return null;
    }
  }

  // ===== تحويل Base64 إلى Blob (توفير ~33% ذاكرة) =====
  function base64ToBlob(base64, mimeType) {
    mimeType = mimeType || 'image/jpeg';
    const byteStr = atob(base64.split(',')[1] || base64);
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) {
      arr[i] = byteStr.charCodeAt(i);
    }
    return new Blob([arr], { type: mimeType });
  }

  // ===== استقبال تغييرات من التبويبات الأخرى =====
  function _initReceiveChannel(db) {
    try {
      if (typeof BroadcastChannel === 'undefined') return;
      const channel = new BroadcastChannel('marble_erp_sync');
      channel.onmessage = function (evt) {
        const msg = evt.data;
        if (!msg || msg.type !== 'db_change') return;

        // إبطال الكاش وإعادة عرض الصفحة الحالية إن كانت متأثرة
        if (window.DB && window.DB._cache) {
          delete window.DB._cache[msg.key];
        }

        // إعادة عرض الصفحة الحالية تلقائياً إن كانت تعرض نفس الجدول
        const currentPage = document.querySelector('.nav-item.active')?.dataset?.page;
        const pageTableMap = {
          sales:       ['sales'],
          purchases:   ['purchases'],
          payments:    ['payments'],
          journal:     ['journal', 'journal_entries'],
          cutting:     ['cutting', 'blocks', 'slabs'],
          manufacturing: ['manufacturing_stages'],
          dashboard:   ['sales', 'expenses', 'products'],
        };
        if (currentPage && pageTableMap[currentPage]?.includes(msg.key)) {
          const renderFn = 'render' + currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
          if (typeof window[renderFn] === 'function') {
            window[renderFn]();
          }
        }
      };
      window._marbleSyncChannel = channel;
    } catch (_) {}
  }

  // ===== UUID مساعد =====
  function _generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ===== كتابة غير متزامنة إلى IndexedDB من DB.save =====
  function idbWrite(table, item) {
    if (!window.MarbleDB || !window.MarbleDB[table]) return;
    try {
      window.MarbleDB.table(table).put(item).catch(() => {});
    } catch (_) {}
  }

  function idbRemove(table, id) {
    if (!window.MarbleDB || !window.MarbleDB[table]) return;
    try {
      window.MarbleDB.table(table).delete(id).catch(() => {});
    } catch (_) {}
  }

  // تصدير الدوال العامة
  window.MarbleIDB = {
    saveImageBlob,
    getImageBlob,
    base64ToBlob,
    idbWrite,
    idbRemove,
    generateUUID: _generateUUID,
  };

  // انتظار تحميل Dexie ثم تهيئة قاعدة البيانات
  if (typeof Dexie !== 'undefined') {
    initMarbleDB();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      if (typeof Dexie !== 'undefined') {
        initMarbleDB();
      }
    });
  }
})();
