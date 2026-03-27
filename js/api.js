// ============================================
// Mock API Client - Marble ERP (localStorage)
// ============================================

// ===== SEED DATA =====
const SEED_DATA = {
  users: [
    { id: 1, email: 'admin@marble.com', password: 'admin123', name: 'مدير النظام', role: 'مدير' }
  ],
  settings: {
    company_name: 'شركة الرخام والجرانيت',
    currency: 'EGP',
    tax_rate: 14,
    address: 'القاهرة، مصر',
    phone: '01234567890',
    email: 'info@marble.com'
  },
  customers: [
    { id: 1, name: 'مقاولون مصر للإنشاء',    phone: '01012345678', email: 'info@masrco.com',  address: 'القاهرة',     balance: 0,      created_at: '2024-01-15' },
    { id: 2, name: 'شركة الإعمار المصرية',     phone: '01123456789', email: 'info@iemr.com',    address: 'الجيزة',      balance: 57160,  created_at: '2024-02-10' },
    { id: 3, name: 'مشاريع النيل العقارية',   phone: '01234567890', email: 'info@nile.com',    address: 'الإسكندرية',  balance: 41040,  created_at: '2024-01-20' },
    { id: 4, name: 'فيلا مودرن للديكور',      phone: '01112345678', email: 'info@villa.com',   address: 'القاهرة',     balance: 0,      created_at: '2024-03-05' },
    { id: 5, name: 'مجموعة الهرم للبناء',     phone: '01512345678', email: 'info@pyramid.com', address: 'الجيزة',      balance: 65664,  created_at: '2024-02-20' },
  ],
  suppliers: [
    { id: 1, name: 'محاجر سيناء للرخام',      phone: '0693456789', email: 'info@sinai.com',     address: 'سيناء',  balance: 0,      created_at: '2024-01-01' },
    { id: 2, name: 'إيطاليا ستون للاستيراد', phone: '0223456789', email: 'info@italystone.com', address: 'القاهرة', balance: 45000,  created_at: '2024-01-01' },
    { id: 3, name: 'محاجر الصعيد',            phone: '0962345678', email: 'info@saeed.com',     address: 'أسوان',  balance: 175000, created_at: '2024-01-10' },
  ],
  products: [
    { id: 1, code: 'MBL-001', name: 'رخام أبيض كراراني',    category: 'رخام',    unit: 'م²', price: 850,  cost: 450, stock_qty: 240, min_stock: 50, status: 'in_stock' },
    { id: 2, code: 'GRN-001', name: 'جرانيت أسود مطلق',     category: 'جرانيت', unit: 'م²', price: 650,  cost: 320, stock_qty: 180, min_stock: 40, status: 'in_stock' },
    { id: 3, code: 'MBL-002', name: 'رخام بيج تونسي',       category: 'رخام',    unit: 'م²', price: 720,  cost: 380, stock_qty: 30,  min_stock: 50, status: 'in_stock' },
    { id: 4, code: 'GRN-002', name: 'جرانيت رمادي صواني',   category: 'جرانيت', unit: 'م²', price: 580,  cost: 280, stock_qty: 200, min_stock: 40, status: 'in_stock' },
    { id: 5, code: 'MBL-003', name: 'رخام أخضر زمرد',       category: 'رخام',    unit: 'م²', price: 1200, cost: 650, stock_qty: 85,  min_stock: 20, status: 'in_stock' },
    { id: 6, code: 'GRN-003', name: 'جرانيت أحمر وردي',     category: 'جرانيت', unit: 'م²', price: 700,  cost: 350, stock_qty: 15,  min_stock: 30, status: 'in_stock' },
  ],
  blocks: [
    { id: 1, code: 'BLK-2024-001', type: 'رخام أبيض كراراني',  origin: 'إيطاليا',  weight_tons: 18.5, width: 280, height: 180, length: 320, cost: 85000,  status: 'processed',  received_date: '2024-01-10' },
    { id: 2, code: 'BLK-2024-002', type: 'جرانيت أسود مطلق',   origin: 'الهند',    weight_tons: 22,   width: 300, height: 200, length: 350, cost: 95000,  status: 'in_cutting', received_date: '2024-02-15' },
    { id: 3, code: 'BLK-2024-003', type: 'رخام بيج تونسي',     origin: 'تونس',     weight_tons: 15,   width: 260, height: 160, length: 290, cost: 65000,  status: 'in_stock',   received_date: '2024-03-01' },
    { id: 4, code: 'BLK-2024-004', type: 'جرانيت رمادي صواني', origin: 'الصين',    weight_tons: 25,   width: 320, height: 220, length: 380, cost: 110000, status: 'in_stock',   received_date: '2024-03-10' },
    { id: 5, code: 'BLK-2024-005', type: 'رخام أخضر زمرد',     origin: 'البرازيل', weight_tons: 12,   width: 240, height: 150, length: 260, cost: 120000, status: 'processed',  received_date: '2024-02-05' },
  ],
  slabs: [
    { id: 1, code: 'SLB-001', block_id: 1, block_code: 'BLK-2024-001', type: 'رخام أبيض كراراني', grade: 'A', width: 280, height: 160, thickness: 2, area_m2: 4.48, status: 'in_stock', cutting_id: 1 },
    { id: 2, code: 'SLB-002', block_id: 1, block_code: 'BLK-2024-001', type: 'رخام أبيض كراراني', grade: 'A', width: 280, height: 160, thickness: 2, area_m2: 4.48, status: 'sold',     cutting_id: 1 },
    { id: 3, code: 'SLB-003', block_id: 1, block_code: 'BLK-2024-001', type: 'رخام أبيض كراراني', grade: 'B', width: 280, height: 150, thickness: 2, area_m2: 4.20, status: 'in_stock', cutting_id: 1 },
    { id: 4, code: 'SLB-004', block_id: 5, block_code: 'BLK-2024-005', type: 'رخام أخضر زمرد',   grade: 'A', width: 240, height: 140, thickness: 2, area_m2: 3.36, status: 'in_stock', cutting_id: 2 },
    { id: 5, code: 'SLB-005', block_id: 5, block_code: 'BLK-2024-005', type: 'رخام أخضر زمرد',   grade: 'A', width: 240, height: 140, thickness: 2, area_m2: 3.36, status: 'in_stock', cutting_id: 2 },
  ],
  sales: [
    { id: 1, invoice_number: 'INV-2024-001', customer_id: 1, customer: 'مقاولون مصر للإنشاء',  invoice_date: '2024-02-10', due_date: '2024-03-10', items: [{ product_id: 1, product: 'رخام أبيض كراراني', qty: 50, unit_price: 850, subtotal: 42500 }],                                                                                                                              subtotal: 42500,  tax: 5950,  total_amount: 48450,  paid_amount: 48450, status: 'paid',    notes: '' },
    { id: 2, invoice_number: 'INV-2024-002', customer_id: 2, customer: 'شركة الإعمار المصرية',  invoice_date: '2024-02-20', due_date: '2024-03-20', items: [{ product_id: 2, product: 'جرانيت أسود مطلق', qty: 100, unit_price: 650, subtotal: 65000 }, { product_id: 4, product: 'جرانيت رمادي صواني', qty: 50, unit_price: 580, subtotal: 29000 }], subtotal: 94000,  tax: 13160, total_amount: 107160, paid_amount: 50000, status: 'partial', notes: '' },
    { id: 3, invoice_number: 'INV-2024-003', customer_id: 3, customer: 'مشاريع النيل العقارية', invoice_date: '2024-03-05', due_date: '2024-04-05', items: [{ product_id: 5, product: 'رخام أخضر زمرد', qty: 30, unit_price: 1200, subtotal: 36000 }],                                                                                                                             subtotal: 36000,  tax: 5040,  total_amount: 41040,  paid_amount: 0,     status: 'sent',    notes: '' },
    { id: 4, invoice_number: 'INV-2024-004', customer_id: 4, customer: 'فيلا مودرن للديكور',    invoice_date: '2024-03-10', due_date: '2024-04-10', items: [{ product_id: 1, product: 'رخام أبيض كراراني', qty: 20, unit_price: 850, subtotal: 17000 }],                                                                                                                             subtotal: 17000,  tax: 2380,  total_amount: 19380,  paid_amount: 19380, status: 'paid',    notes: '' },
    { id: 5, invoice_number: 'INV-2024-005', customer_id: 5, customer: 'مجموعة الهرم للبناء',   invoice_date: '2024-03-15', due_date: '2024-04-15', items: [{ product_id: 3, product: 'رخام بيج تونسي', qty: 80, unit_price: 720, subtotal: 57600 }],                                                                                                                                subtotal: 57600,  tax: 8064,  total_amount: 65664,  paid_amount: 0,     status: 'draft',   notes: '' },
  ],
  purchases: [
    { id: 1, invoice_number: 'PUR-2024-001', supplier_id: 1, supplier: 'محاجر سيناء للرخام',      invoice_date: '2024-01-10', due_date: '2024-02-10', items: [{ description: 'بلوك رخام BLK-2024-001', qty: 1, unit_price: 85000, subtotal: 85000 }],                                                                                   total_amount: 85000,  paid_amount: 85000, status: 'paid'    },
    { id: 2, invoice_number: 'PUR-2024-002', supplier_id: 2, supplier: 'إيطاليا ستون للاستيراد', invoice_date: '2024-02-15', due_date: '2024-03-15', items: [{ description: 'بلوك جرانيت BLK-2024-002', qty: 1, unit_price: 95000, subtotal: 95000 }],                                                                                  total_amount: 95000,  paid_amount: 50000, status: 'partial' },
    { id: 3, invoice_number: 'PUR-2024-003', supplier_id: 3, supplier: 'محاجر الصعيد',            invoice_date: '2024-03-01', due_date: '2024-04-01', items: [{ description: 'بلوك BLK-2024-003', qty: 1, unit_price: 65000, subtotal: 65000 }, { description: 'بلوك BLK-2024-004', qty: 1, unit_price: 110000, subtotal: 110000 }], total_amount: 175000, paid_amount: 0,     status: 'sent'    },
  ],
  payments: [
    { id: 1, type: 'receipt', party_id: 1, party: 'مقاولون مصر للإنشاء',      party_type: 'customer', amount: 48450, date: '2024-02-15', method: 'bank',  reference: 'TRF-001',  notes: 'سداد INV-2024-001' },
    { id: 2, type: 'receipt', party_id: 2, party: 'شركة الإعمار المصرية',      party_type: 'customer', amount: 50000, date: '2024-03-01', method: 'bank',  reference: 'TRF-002',  notes: 'دفعة جزئية INV-2024-002' },
    { id: 3, type: 'receipt', party_id: 4, party: 'فيلا مودرن للديكور',        party_type: 'customer', amount: 19380, date: '2024-03-12', method: 'cash',  reference: 'CASH-001', notes: 'سداد INV-2024-004' },
    { id: 4, type: 'payment', party_id: 1, party: 'محاجر سيناء للرخام',        party_type: 'supplier', amount: 85000, date: '2024-01-20', method: 'bank',  reference: 'PAY-001',  notes: 'سداد PUR-2024-001' },
    { id: 5, type: 'payment', party_id: 2, party: 'إيطاليا ستون للاستيراد',   party_type: 'supplier', amount: 50000, date: '2024-03-01', method: 'bank',  reference: 'PAY-002',  notes: 'دفعة جزئية PUR-2024-002' },
  ],
  expenses: [
    { id: 1, category: 'صيانة وإصلاح',    description: 'صيانة ماكينات القطع',           amount: 15000, date: '2024-02-01', project_id: null },
    { id: 2, category: 'رواتب وأجور',      description: 'رواتب عمال الإنتاج - يناير',   amount: 45000, date: '2024-01-31', project_id: null },
    { id: 3, category: 'مواد استهلاكية',  description: 'أقراص قطع ومواد صرف',           amount: 8500,  date: '2024-02-10', project_id: 1 },
    { id: 4, category: 'مرافق',             description: 'فاتورة كهرباء',                 amount: 12000, date: '2024-02-28', project_id: null },
    { id: 5, category: 'نقل وشحن',         description: 'نقل بضاعة لمشروع النيل',       amount: 5500,  date: '2024-03-05', project_id: 2 },
  ],
  projects: [
    { id: 1, name: 'مشروع تشطيب فيلا الشيخ زايد', customer_id: 4, customer: 'فيلا مودرن للديكور',    start_date: '2024-02-01', end_date: '2024-05-01', budget: 250000,  spent: 85000,  status: 'active',    description: 'تشطيب أرضيات وحوائط بالرخام' },
    { id: 2, name: 'مشروع كمباوند النيل',            customer_id: 3, customer: 'مشاريع النيل العقارية', start_date: '2024-03-01', end_date: '2024-12-01', budget: 1200000, spent: 41040,  status: 'active',    description: 'توريد وتركيب رخام 50 شقة' },
    { id: 3, name: 'مشروع برج الإعمار',              customer_id: 2, customer: 'شركة الإعمار المصرية',  start_date: '2024-01-15', end_date: '2024-06-30', budget: 800000,  spent: 107160, status: 'active',    description: 'واجهات وأرضيات برج تجاري' },
    { id: 4, name: 'مشروع فيلا الساحل',              customer_id: 1, customer: 'مقاولون مصر للإنشاء',  start_date: '2023-06-01', end_date: '2023-12-31', budget: 350000,  spent: 340000, status: 'completed', description: 'تشطيب كامل بالرخام الإيطالي' },
  ],
  accounts: [
    { id: 1,  code: '1000', name: 'الأصول',                    type: 'asset',     parent_id: null, balance: 0 },
    { id: 2,  code: '1100', name: 'الأصول المتداولة',          type: 'asset',     parent_id: 1,    balance: 0 },
    { id: 3,  code: '1110', name: 'النقدية',                    type: 'asset',     parent_id: 2,    balance: 85000 },
    { id: 4,  code: '1120', name: 'البنك',                      type: 'asset',     parent_id: 2,    balance: 320000 },
    { id: 5,  code: '1130', name: 'الذمم المدينة',             type: 'asset',     parent_id: 2,    balance: 163864 },
    { id: 6,  code: '1140', name: 'المخزون',                    type: 'asset',     parent_id: 2,    balance: 650000 },
    { id: 7,  code: '1200', name: 'الأصول الثابتة',           type: 'asset',     parent_id: 1,    balance: 0 },
    { id: 8,  code: '1210', name: 'المعدات والآلات',          type: 'asset',     parent_id: 7,    balance: 450000 },
    { id: 9,  code: '2000', name: 'الخصوم',                    type: 'liability', parent_id: null, balance: 0 },
    { id: 10, code: '2100', name: 'الخصوم المتداولة',          type: 'liability', parent_id: 9,    balance: 0 },
    { id: 11, code: '2110', name: 'الذمم الدائنة',             type: 'liability', parent_id: 10,   balance: 170000 },
    { id: 12, code: '3000', name: 'حقوق الملكية',              type: 'equity',    parent_id: null, balance: 0 },
    { id: 13, code: '3100', name: 'رأس المال',                 type: 'equity',    parent_id: 12,   balance: 1000000 },
    { id: 14, code: '3200', name: 'الأرباح المحتجزة',         type: 'equity',    parent_id: 12,   balance: 498864 },
    { id: 15, code: '4000', name: 'الإيرادات',                 type: 'revenue',   parent_id: null, balance: 0 },
    { id: 16, code: '4100', name: 'إيرادات المبيعات',         type: 'revenue',   parent_id: 15,   balance: 247100 },
    { id: 17, code: '5000', name: 'المصروفات',                 type: 'expense',   parent_id: null, balance: 0 },
    { id: 18, code: '5100', name: 'تكلفة البضاعة المباعة',   type: 'expense',   parent_id: 17,   balance: 138500 },
    { id: 19, code: '5200', name: 'مصروفات تشغيل',            type: 'expense',   parent_id: 17,   balance: 0 },
    { id: 20, code: '5210', name: 'رواتب وأجور',               type: 'expense',   parent_id: 19,   balance: 45000 },
    { id: 21, code: '5220', name: 'صيانة وإصلاح',             type: 'expense',   parent_id: 19,   balance: 15000 },
    { id: 22, code: '5230', name: 'مرافق',                     type: 'expense',   parent_id: 19,   balance: 12000 },
    { id: 23, code: '5240', name: 'نقل وشحن',                  type: 'expense',   parent_id: 19,   balance: 5500 },
    { id: 24, code: '5250', name: 'مواد استهلاكية',           type: 'expense',   parent_id: 19,   balance: 8500 },
  ],
  journal: [
    { id: 1, number: 'JE-2024-001', date: '2024-01-10', description: 'شراء بلوك رخام BLK-2024-001',      lines: [{ account_id: 6,  account_code: '1140', account_name: 'المخزون',           debit: 85000, credit: 0     }, { account_id: 4,  account_code: '1120', account_name: 'البنك',              debit: 0,     credit: 85000 }] },
    { id: 2, number: 'JE-2024-002', date: '2024-02-10', description: 'فاتورة مبيعات INV-2024-001',        lines: [{ account_id: 5,  account_code: '1130', account_name: 'الذمم المدينة',     debit: 48450, credit: 0     }, { account_id: 16, account_code: '4100', account_name: 'إيرادات المبيعات', debit: 0,     credit: 42500 }, { account_id: 11, account_code: '2110', account_name: 'الذمم الدائنة', debit: 0, credit: 5950 }] },
    { id: 3, number: 'JE-2024-003', date: '2024-02-15', description: 'تحصيل INV-2024-001',                lines: [{ account_id: 4,  account_code: '1120', account_name: 'البنك',              debit: 48450, credit: 0     }, { account_id: 5,  account_code: '1130', account_name: 'الذمم المدينة',     debit: 0,     credit: 48450 }] },
    { id: 4, number: 'JE-2024-004', date: '2024-01-31', description: 'رواتب عمال الإنتاج - يناير',       lines: [{ account_id: 20, account_code: '5210', account_name: 'رواتب وأجور',        debit: 45000, credit: 0     }, { account_id: 3,  account_code: '1110', account_name: 'النقدية',            debit: 0,     credit: 45000 }] },
    { id: 5, number: 'JE-2024-005', date: '2024-02-28', description: 'فاتورة كهرباء',                     lines: [{ account_id: 22, account_code: '5230', account_name: 'مرافق',               debit: 12000, credit: 0     }, { account_id: 3,  account_code: '1110', account_name: 'النقدية',            debit: 0,     credit: 12000 }] },
    { id: 6, number: 'JE-2024-006', date: '2024-03-05', description: 'نقل بضاعة مشروع النيل',            lines: [{ account_id: 23, account_code: '5240', account_name: 'نقل وشحن',            debit: 5500,  credit: 0     }, { account_id: 3,  account_code: '1110', account_name: 'النقدية',            debit: 0,     credit: 5500  }] },
  ],
  cutting: [
    { id: 1, batch_number: 'CUT-2024-001', block_id: 1, block_code: 'BLK-2024-001', block_type: 'رخام أبيض كراراني', date: '2024-01-25', operator: 'أحمد محمد',  slabs_count: 45, grade_a: 38, grade_b: 5, waste: 2, waste_percentage: 4.4, status: 'completed', notes: '' },
    { id: 2, batch_number: 'CUT-2024-002', block_id: 5, block_code: 'BLK-2024-005', block_type: 'رخام أخضر زمرد',   date: '2024-02-20', operator: 'محمود علي', slabs_count: 30, grade_a: 26, grade_b: 3, waste: 1, waste_percentage: 3.3, status: 'completed', notes: '' },
    { id: 3, batch_number: 'CUT-2024-003', block_id: 2, block_code: 'BLK-2024-002', block_type: 'جرانيت أسود مطلق', date: '2024-03-20', operator: 'خالد إبراهيم', slabs_count: 0,  grade_a: 0,  grade_b: 0, waste: 0, waste_percentage: 0,   status: 'in_progress', notes: 'جارٍ العمل' },
  ],
  notifications: [
    { id: 1, title: 'مخزون منخفض',   message: 'منتج رخام بيج تونسي وصل للحد الأدنى (30 م² من أصل 50)',   type: 'warning', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, title: 'مخزون منخفض',   message: 'منتج جرانيت أحمر وردي وصل للحد الأدنى (15 م² من أصل 30)', type: 'warning', is_read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, title: 'فاتورة متأخرة', message: 'فاتورة INV-2024-002 تجاوزت تاريخ الاستحقاق',               type: 'danger',  is_read: false, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 4, title: 'دفعة جديدة',    message: 'تم استلام 50,000 ج.م من شركة الإعمار المصرية',              type: 'success', is_read: true,  created_at: new Date(Date.now() - 172800000).toISOString() },
  ],
};

// ===== MOCK DB =====
const DB = {
  get(key) {
    try {
      const data = localStorage.getItem('marble_db_' + key);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },
  set(key, value) {
    localStorage.setItem('marble_db_' + key, JSON.stringify(value));
  },
  init() {
    if (!this.get('seeded')) {
      for (const [key, value] of Object.entries(SEED_DATA)) {
        this.set(key, value);
      }
      this.set('seeded', true);
    }
  },
  getAll(key) { return this.get(key) || []; },
  findById(key, id) { return this.getAll(key).find(i => i.id === parseInt(id)); },
  save(key, item) {
    const items = this.getAll(key);
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) items[idx] = item; else items.push(item);
    this.set(key, items);
    return item;
  },
  remove(key, id) {
    this.set(key, this.getAll(key).filter(i => i.id !== parseInt(id)));
  },
  nextId(key) {
    const items = this.getAll(key);
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  },
};

DB.init();

// ===== MOCK API =====
const api = {
  token: localStorage.getItem('marble_token'),

  setToken(t)  { this.token = t; localStorage.setItem('marble_token', t); },
  clearToken() { this.token = null; localStorage.removeItem('marble_token'); localStorage.removeItem('marble_user'); },

  // ===== AUTH =====
  async login(email, password) {
    const user = DB.getAll('users').find(u => u.email === email && u.password === password);
    if (!user) throw new Error('بريد إلكتروني أو كلمة مرور غير صحيحة');
    return { token: 'mock_token_' + Date.now(), user: { id: user.id, name: user.name, role: user.role, email: user.email } };
  },
  async me() { return JSON.parse(localStorage.getItem('marble_user') || '{}'); },

  // ===== DASHBOARD =====
  async dashboard() {
    const sales     = DB.getAll('sales');
    const purchases = DB.getAll('purchases');
    const products  = DB.getAll('products');
    const now       = new Date();
    const m         = now.getMonth();
    const y         = now.getFullYear();

    const monthlySales = sales.filter(s => { const d = new Date(s.invoice_date); return d.getMonth() === m && d.getFullYear() === y; });
    const overdueSales = sales.filter(s => s.status !== 'paid' && s.status !== 'cancelled' && new Date(s.due_date) < now && s.paid_amount < s.total_amount);
    const monthlyPurchases = purchases.filter(p => { const d = new Date(p.invoice_date); return d.getMonth() === m && d.getFullYear() === y; });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d     = new Date(y, m - i, 1);
      const label = d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });
      const total = sales.filter(s => { const sd = new Date(s.invoice_date); return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear(); }).reduce((s, inv) => s + inv.total_amount, 0);
      months.push({ month: label, total });
    }

    const custTotals = {};
    sales.forEach(s => { custTotals[s.customer] = (custTotals[s.customer] || 0) + s.total_amount; });
    const topCustomers = Object.entries(custTotals).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      kpis: {
        monthly_sales:       monthlySales.reduce((s, i) => s + i.total_amount, 0),
        monthly_sales_count: monthlySales.length,
        cash_balance:        85000,
        bank_balance:        320000,
        overdue_amount:      overdueSales.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0),
        overdue_count:       overdueSales.length,
        inventory_value:     products.reduce((s, p) => s + p.cost * p.stock_qty, 0),
        monthly_purchases:   monthlyPurchases.reduce((s, p) => s + p.total_amount, 0),
        low_stock_count:     products.filter(p => p.stock_qty <= p.min_stock).length,
      },
      charts:          { monthly_sales: months },
      top_customers:   topCustomers,
      recent_invoices: [...sales].sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)).slice(0, 5),
    };
  },

  // ===== JOURNAL =====
  async journal(params = {}) {
    let e = DB.getAll('journal');
    if (params.search) { const q = params.search.toLowerCase(); e = e.filter(x => x.description.toLowerCase().includes(q) || x.number.toLowerCase().includes(q)); }
    return { data: e.sort((a, b) => new Date(b.date) - new Date(a.date)) };
  },
  async journalEntry(id)  { return DB.findById('journal', id); },
  async createJournal(d)  { return DB.save('journal', { ...d, id: DB.nextId('journal') }); },
  async trialBalance() {
    const accounts   = DB.getAll('accounts').filter(a => a.parent_id !== null && a.balance !== 0);
    const totalDebit  = accounts.filter(a => ['asset','expense'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
    const totalCredit = accounts.filter(a => ['liability','equity','revenue'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
    return { accounts, total_debit: totalDebit, total_credit: totalCredit };
  },
  async accounts(params = {}) {
    let a = DB.getAll('accounts');
    if (params.type) a = a.filter(x => x.type === params.type);
    return a;
  },
  async createAccount(d) { return DB.save('accounts', { ...d, id: DB.nextId('accounts'), balance: 0 }); },

  // ===== SALES =====
  async sales(params = {}) {
    let items = DB.getAll('sales');
    if (params.status)      items = items.filter(i => i.status === params.status);
    if (params.customer_id) items = items.filter(i => i.customer_id === parseInt(params.customer_id));
    if (params.search)      { const q = params.search.toLowerCase(); items = items.filter(i => i.invoice_number.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)) };
  },
  async saleDetail(id) { return DB.findById('sales', id); },
  async createSale(d) {
    const id  = DB.nextId('sales');
    const num = String(id).padStart(3, '0');
    return DB.save('sales', { ...d, id, invoice_number: `INV-${new Date().getFullYear()}-${num}`, paid_amount: d.paid_amount || 0, status: d.status || 'draft' });
  },
  async cancelSale(id) {
    const s = DB.findById('sales', id);
    if (s) { s.status = 'cancelled'; DB.save('sales', s); }
    return s;
  },
  async aging() {
    const now = new Date();
    return DB.getAll('sales').filter(s => s.status !== 'paid' && s.status !== 'cancelled').map(s => {
      const days        = Math.floor((now - new Date(s.due_date)) / 86400000);
      const outstanding = s.total_amount - s.paid_amount;
      let bucket = 'current';
      if (days > 90) bucket = '90+'; else if (days > 60) bucket = '60-90'; else if (days > 30) bucket = '30-60'; else if (days > 0) bucket = '0-30';
      return { ...s, days_overdue: days, outstanding, bucket };
    });
  },

  // ===== CUSTOMERS =====
  async customers(params = {}) {
    let items = DB.getAll('customers');
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q)); }
    return items;
  },
  async createCustomer(d)    { return DB.save('customers', { ...d, id: DB.nextId('customers'), balance: 0, created_at: new Date().toISOString().split('T')[0] }); },
  async updateCustomer(id, d){ return DB.save('customers', { ...DB.findById('customers', id), ...d, id: parseInt(id) }); },

  // ===== PURCHASES =====
  async purchases(params = {}) {
    let items = DB.getAll('purchases');
    if (params.status) items = items.filter(i => i.status === params.status);
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.invoice_number.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)) };
  },
  async createPurchase(d) {
    const id  = DB.nextId('purchases');
    const num = String(id).padStart(3, '0');
    return DB.save('purchases', { ...d, id, invoice_number: `PUR-${new Date().getFullYear()}-${num}`, paid_amount: d.paid_amount || 0, status: d.status || 'draft' });
  },

  // ===== SUPPLIERS =====
  async suppliers(params = {}) {
    let items = DB.getAll('suppliers');
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q)); }
    return items;
  },
  async createSupplier(d) { return DB.save('suppliers', { ...d, id: DB.nextId('suppliers'), balance: 0, created_at: new Date().toISOString().split('T')[0] }); },

  // ===== PAYMENTS =====
  async payments(params = {}) {
    let items = DB.getAll('payments');
    if (params.type)   items = items.filter(i => i.type === params.type);
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.party.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.date) - new Date(a.date)) };
  },
  async createPayment(d) { return DB.save('payments', { ...d, id: DB.nextId('payments') }); },

  // ===== EXPENSES =====
  async expenses(params = {}) {
    let items = DB.getAll('expenses');
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.date) - new Date(a.date)) };
  },
  async createExpense(d) { return DB.save('expenses', { ...d, id: DB.nextId('expenses') }); },

  // ===== PRODUCTS =====
  async products(params = {}) {
    let items = DB.getAll('products');
    if (params.category) items = items.filter(i => i.category === params.category);
    if (params.search)   { const q = params.search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)); }
    return items;
  },
  async createProduct(d)    { return DB.save('products', { ...d, id: DB.nextId('products') }); },
  async updateProduct(id, d){ return DB.save('products', { ...DB.findById('products', id), ...d, id: parseInt(id) }); },

  // ===== BLOCKS =====
  async blocks(params = {}) {
    let items = DB.getAll('blocks');
    if (params.status) items = items.filter(i => i.status === params.status);
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.code.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)); }
    return items;
  },
  async createBlock(d) {
    const id  = DB.nextId('blocks');
    const num = String(id).padStart(3, '0');
    return DB.save('blocks', { ...d, id, code: `BLK-${new Date().getFullYear()}-${num}`, status: 'in_stock', received_date: new Date().toISOString().split('T')[0] });
  },

  // ===== SLABS =====
  async slabs(params = {}) {
    let items = DB.getAll('slabs');
    if (params.status)   items = items.filter(i => i.status === params.status);
    if (params.block_id) items = items.filter(i => i.block_id === parseInt(params.block_id));
    return items;
  },

  // ===== CUTTING =====
  async cuttingBatches(params = {}) {
    let items = DB.getAll('cutting');
    if (params.status) items = items.filter(i => i.status === params.status);
    return { data: items.sort((a, b) => new Date(b.date) - new Date(a.date)) };
  },
  async cuttingDetail(id) { return DB.findById('cutting', id); },
  async createCutting(d) {
    const id  = DB.nextId('cutting');
    const num = String(id).padStart(3, '0');
    return DB.save('cutting', { ...d, id, batch_number: `CUT-${new Date().getFullYear()}-${num}`, status: 'in_progress' });
  },

  // ===== PROJECTS =====
  async projects(params = {}) {
    let items = DB.getAll('projects');
    if (params.status) items = items.filter(i => i.status === params.status);
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q)); }
    return items;
  },
  async createProject(d) { return DB.save('projects', { ...d, id: DB.nextId('projects'), spent: 0 }); },

  // ===== REPORTS =====
  async reportPL() {
    const sales    = DB.getAll('sales').filter(s => s.status !== 'cancelled' && s.status !== 'draft');
    const expenses = DB.getAll('expenses');
    const products = DB.getAll('products');
    const revenue  = sales.reduce((s, i) => s + i.subtotal, 0);
    // Fallback: estimate cost as 50% of selling price when product not found
    const ESTIMATED_COST_RATIO = 0.5;
    const cogs     = sales.reduce((s, i) => s + i.items.reduce((ss, item) => { const p = products.find(x => x.id === item.product_id); return ss + (p ? p.cost * item.qty : item.subtotal * ESTIMATED_COST_RATIO); }, 0), 0);
    const opExp    = expenses.reduce((s, e) => s + e.amount, 0);
    return { revenue, cogs, gross_profit: revenue - cogs, operating_expenses: opExp, net_profit: revenue - cogs - opExp, expenses };
  },
  async reportBS() {
    const accounts       = DB.getAll('accounts');
    const totalAssets    = accounts.filter(a => a.type === 'asset'     && a.parent_id !== null).reduce((s, a) => s + a.balance, 0);
    const totalLiab      = accounts.filter(a => a.type === 'liability' && a.parent_id !== null).reduce((s, a) => s + a.balance, 0);
    const totalEquity    = accounts.filter(a => a.type === 'equity'    && a.parent_id !== null).reduce((s, a) => s + a.balance, 0);
    return { total_assets: totalAssets, total_liabilities: totalLiab, total_equity: totalEquity, accounts };
  },
  async reportWaste() {
    const cutting    = DB.getAll('cutting');
    const totalSlabs = cutting.reduce((s, c) => s + c.slabs_count, 0);
    const totalWaste = cutting.reduce((s, c) => s + c.waste, 0);
    const avgWaste   = cutting.length > 0 ? cutting.reduce((s, c) => s + c.waste_percentage, 0) / cutting.length : 0;
    return { total_batches: cutting.length, total_slabs: totalSlabs, total_waste_slabs: totalWaste, avg_waste_percentage: avgWaste, details: cutting };
  },
  async reportInventory() {
    const products = DB.getAll('products');
    const blocks   = DB.getAll('blocks');
    const slabs    = DB.getAll('slabs');
    return { products, blocks, slabs, total_inventory_value: products.reduce((s, p) => s + p.cost * p.stock_qty, 0) };
  },
  async reportCustomerPL()  { return []; },
  async reportProductPL()   { return []; },

  // ===== SETTINGS =====
  async settings()      { return DB.get('settings') || SEED_DATA.settings; },
  async saveSettings(d) { DB.set('settings', d); return d; },

  // ===== NOTIFICATIONS =====
  async notifications() { return DB.getAll('notifications'); },
  async markNotificationRead(id) {
    const n = DB.findById('notifications', id);
    if (n) { n.is_read = true; DB.save('notifications', n); }
    return n;
  },
};
