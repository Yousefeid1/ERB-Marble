// ============================================
// Mock API Client - Marble ERP (localStorage)
// ============================================

// ===== تشفير كلمات المرور بـ SHA-256 =====
async function hashPassword(str) {
  if (!str) return '';
  // إذا كانت القيمة هاش بالفعل (تبدأ بـ sha256:) أعدها كما هي
  if (typeof str === 'string' && str.startsWith('sha256:')) return str;
  try {
    const enc  = new TextEncoder().encode(str);
    const buf  = await crypto.subtle.digest('SHA-256', enc);
    const hex  = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return 'sha256:' + hex;
  } catch (_) {
    // fallback بسيط إذا لم يكن SubtleCrypto متاحاً (بيئة قديمة)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return 'sha256_fb:' + Math.abs(hash).toString(36);
  }
}

// ===== SEED DATA =====
// Default employee accounts added during migration
const DEFAULT_EMPLOYEES = [
  { email: 'accountant@marble.com',  password: 'acc123',     name: 'أحمد المحاسب',         role: 'محاسب',              phone: '01012345679', department: 'المحاسبة',    active: true, work_status: 'active', national_id: '28901011234567', salary: 8000  },
  { email: 'sales@marble.com',       password: 'sales123',   name: 'محمد موظف مبيعات',     role: 'موظف مبيعات',       phone: '01112345678', department: 'المبيعات',    active: true, work_status: 'active', national_id: '29001021234567', salary: 6000  },
  { email: 'purchase@marble.com',    password: 'pur123',     name: 'علي موظف مشتريات',     role: 'موظف مشتريات',     phone: '01512345679', department: 'المشتريات',   active: true, work_status: 'active', national_id: '29101031234567', salary: 6000  },
  { email: 'production@marble.com',  password: 'prod123',    name: 'خالد موظف تصنيع',      role: 'موظف تصنيع',       phone: '01234567891', department: 'التصنيع',     active: true, work_status: 'active', national_id: '29201041234567', salary: 5500  },
  { email: 'prodmgr@marble.com',     password: 'prodmgr123', name: 'سامي مدير التصنيع',    role: 'مدير تصنيع',       phone: '01234567892', department: 'التصنيع',     active: true, work_status: 'active', national_id: '28801051234567', salary: 10000 },
  { email: 'supervisor@marble.com',  password: 'sup123',     name: 'رامي مشرف التصنيع',    role: 'مشرف تصنيع',       phone: '01234567893', department: 'التصنيع',     active: true, work_status: 'active', national_id: '29301061234567', salary: 7000  },
  { email: 'logistics@marble.com',   password: 'log123',     name: 'طارق اللوجستيك',       role: 'موظف لوجستيك',     phone: '01234567894', department: 'اللوجستيك',   active: true, work_status: 'active', national_id: '29401071234567', salary: 6500  },
  { email: 'deptmgr@marble.com',     password: 'dept123',    name: 'نادية مدير القسم',      role: 'مدير قسم',          phone: '01234567895', department: 'المبيعات',    active: true, work_status: 'active', national_id: '28701081234567', salary: 9000  },
  { email: 'employee@marble.com',    password: 'emp123',     name: 'سارة موظفة',            role: 'موظف عادي',         phone: '01234567896', department: 'الإدارة',     active: true, work_status: 'active', national_id: '29501091234567', salary: 4500  },
];

const SEED_DATA = {
  users: [
    { id: 1, email: 'admin@marble.com', password: 'admin123', name: 'مدير النظام', role: 'مدير عام', phone: '', department: 'الإدارة العامة', active: true, work_status: 'active', national_id: '', salary: 0, must_change_password: true }
  ],
  quotations: [],
  activity_log: [],
  settings: {
    company_name: 'شركة النخبة للتصدير',
    currency: 'EGP',
    tax_rate: 14,
    exchange_rate: 31,
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
    { id: 1, invoice_number: 'INV-2024-001', customer_id: 1, customer: 'مقاولون مصر للإنشاء',  invoice_date: '2024-02-10', due_date: '2024-03-10', items: [{ product_id: 1, product: 'رخام أبيض كراراني', qty: 50, unit_price: 850, subtotal: 42500 }],                                                                                                                              subtotal: 42500,  tax: 5950,  total_amount: 48450,  paid_amount: 48450, status: 'paid',    notes: '' , currency: 'EGP', negotiated_price: null },
    { id: 2, invoice_number: 'INV-2024-002', customer_id: 2, customer: 'شركة الإعمار المصرية',  invoice_date: '2024-02-20', due_date: '2024-03-20', items: [{ product_id: 2, product: 'جرانيت أسود مطلق', qty: 100, unit_price: 650, subtotal: 65000 }, { product_id: 4, product: 'جرانيت رمادي صواني', qty: 50, unit_price: 580, subtotal: 29000 }], subtotal: 94000,  tax: 13160, total_amount: 107160, paid_amount: 50000, status: 'partial', notes: '' , currency: 'EGP', negotiated_price: null },
    { id: 3, invoice_number: 'INV-2024-003', customer_id: 3, customer: 'مشاريع النيل العقارية', invoice_date: '2024-03-05', due_date: '2024-04-05', items: [{ product_id: 5, product: 'رخام أخضر زمرد', qty: 30, unit_price: 1200, subtotal: 36000 }],                                                                                                                             subtotal: 36000,  tax: 5040,  total_amount: 41040,  paid_amount: 0,     status: 'sent',    notes: '' , currency: 'EGP', negotiated_price: null },
    { id: 4, invoice_number: 'INV-2024-004', customer_id: 4, customer: 'فيلا مودرن للديكور',    invoice_date: '2024-03-10', due_date: '2024-04-10', items: [{ product_id: 1, product: 'رخام أبيض كراراني', qty: 20, unit_price: 850, subtotal: 17000 }],                                                                                                                             subtotal: 17000,  tax: 2380,  total_amount: 19380,  paid_amount: 19380, status: 'paid',    notes: '' , currency: 'EGP', negotiated_price: null },
    { id: 5, invoice_number: 'INV-2024-005', customer_id: 5, customer: 'مجموعة الهرم للبناء',   invoice_date: '2024-03-15', due_date: '2024-04-15', items: [{ product_id: 3, product: 'رخام بيج تونسي', qty: 80, unit_price: 720, subtotal: 57600 }],                                                                                                                                subtotal: 57600,  tax: 8064,  total_amount: 65664,  paid_amount: 0,     status: 'draft',   notes: '' , currency: 'EGP', negotiated_price: null },
  ],
  purchases: [
    { id: 1, invoice_number: 'PUR-2024-001', supplier_id: 1, supplier: 'محاجر سيناء للرخام',      invoice_date: '2024-01-10', due_date: '2024-02-10', items: [{ description: 'بلوك رخام BLK-2024-001', qty: 1, unit_price: 85000, subtotal: 85000 }],                                                                                   total_amount: 85000,  paid_amount: 85000, status: 'paid'    , currency: 'EGP' },
    { id: 2, invoice_number: 'PUR-2024-002', supplier_id: 2, supplier: 'إيطاليا ستون للاستيراد', invoice_date: '2024-02-15', due_date: '2024-03-15', items: [{ description: 'بلوك جرانيت BLK-2024-002', qty: 1, unit_price: 95000, subtotal: 95000 }],                                                                                  total_amount: 95000,  paid_amount: 50000, status: 'partial' , currency: 'EGP' },
    { id: 3, invoice_number: 'PUR-2024-003', supplier_id: 3, supplier: 'محاجر الصعيد',            invoice_date: '2024-03-01', due_date: '2024-04-01', items: [{ description: 'بلوك BLK-2024-003', qty: 1, unit_price: 65000, subtotal: 65000 }, { description: 'بلوك BLK-2024-004', qty: 1, unit_price: 110000, subtotal: 110000 }], total_amount: 175000, paid_amount: 0,     status: 'sent'    , currency: 'EGP' },
  ],
  payments: [
    { id: 1, type: 'receipt', party_id: 1, party: 'مقاولون مصر للإنشاء',      party_type: 'customer', amount: 48450, date: '2024-02-15', method: 'bank',  reference: 'TRF-001',  notes: 'سداد INV-2024-001' , currency: 'EGP' },
    { id: 2, type: 'receipt', party_id: 2, party: 'شركة الإعمار المصرية',      party_type: 'customer', amount: 50000, date: '2024-03-01', method: 'bank',  reference: 'TRF-002',  notes: 'دفعة جزئية INV-2024-002' , currency: 'EGP' },
    { id: 3, type: 'receipt', party_id: 4, party: 'فيلا مودرن للديكور',        party_type: 'customer', amount: 19380, date: '2024-03-12', method: 'cash',  reference: 'CASH-001', notes: 'سداد INV-2024-004' , currency: 'EGP' },
    { id: 4, type: 'payment', party_id: 1, party: 'محاجر سيناء للرخام',        party_type: 'supplier', amount: 85000, date: '2024-01-20', method: 'bank',  reference: 'PAY-001',  notes: 'سداد PUR-2024-001' , currency: 'EGP' },
    { id: 5, type: 'payment', party_id: 2, party: 'إيطاليا ستون للاستيراد',   party_type: 'supplier', amount: 50000, date: '2024-03-01', method: 'bank',  reference: 'PAY-002',  notes: 'دفعة جزئية PUR-2024-002' , currency: 'EGP' },
  ],
  expenses: [
    { id: 1, category: 'مواد استهلاكية',  description: 'مواد تشغيل المصانع الخارجية',  amount: 15000, date: '2024-02-01', project_id: null , currency: 'EGP' },
    { id: 2, category: 'رواتب وأجور',      description: 'رواتب عمال الإنتاج - يناير',   amount: 45000, date: '2024-01-31', project_id: null , currency: 'EGP' },
    { id: 3, category: 'مواد استهلاكية',  description: 'أقراص قطع ومواد صرف',           amount: 8500,  date: '2024-02-10', project_id: 1 , currency: 'EGP' },
    { id: 4, category: 'مرافق',             description: 'فاتورة كهرباء',                 amount: 12000, date: '2024-02-28', project_id: null , currency: 'EGP' },
    { id: 5, category: 'نقل وشحن',         description: 'نقل بضاعة لمشروع النيل',       amount: 5500,  date: '2024-03-05', project_id: 2 , currency: 'EGP' },
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
    { id: 25, code: '1141', name: 'مخزون كتل خام',            type: 'asset',     parent_id: 2,    balance: 0 },
    { id: 26, code: '1142', name: 'مخزون ألواح تحت التصنيع', type: 'asset',     parent_id: 2,    balance: 0 },
    { id: 27, code: '1143', name: 'مخزون ألواح جاهزة',       type: 'asset',     parent_id: 2,    balance: 0 },
    { id: 28, code: '5260', name: 'تكاليف تصنيع',             type: 'expense',   parent_id: 19,   balance: 0 },
    { id: 29, code: '4110', name: 'إيرادات تصدير',            type: 'revenue',   parent_id: 15,   balance: 0 },
    { id: 30, code: '5110', name: 'تكلفة البضاعة المصدّرة',  type: 'expense',   parent_id: 17,   balance: 0 },
    { id: 31, code: '5270', name: 'مصاريف شحن وجمارك',       type: 'expense',   parent_id: 19,   balance: 0 },
    { id: 32, code: '5280', name: 'عمولات تصدير',             type: 'expense',   parent_id: 19,   balance: 0 },
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
  warehouses: [
    { id: 1, name: 'المستودع الرئيسي',    location: 'القاهرة - المنطقة الصناعية', manager: 'طارق اللوجستيك', capacity: 5000, status: 'active', notes: 'المستودع الرئيسي للرخام والجرانيت' },
    { id: 2, name: 'مستودع الإسكندرية',   location: 'الإسكندرية - المنطقة الصناعية', manager: 'طارق اللوجستيك', capacity: 2000, status: 'active', notes: 'مستودع الشحن والتوزيع للساحل الشمالي' },
    { id: 3, name: 'مستودع مواد خام',     location: 'القاهرة - مدينة بدر', manager: 'خالد موظف تصنيع', capacity: 8000, status: 'active', notes: 'تخزين البلوكات الخام قبل التصنيع' },
  ],
  shipments: [
    { id: 1, shipment_number: 'SHP-2024-001', invoice_id: 1, invoice_number: 'INV-2024-001', customer: 'مقاولون مصر للإنشاء', ship_type: 'بري', origin: 'المستودع الرئيسي', destination: 'القاهرة - مشروع فيلا الساحل', driver: 'عمرو السائق', vehicle: 'نقل ثقيل - ق ج ن 123', weight_tons: 5.5, bill_of_lading: 'BOL-2024-001', convoy_number: null, receiver: 'مهندس أحمد محمود', shipment_date: '2024-02-12', delivery_date: '2024-02-13', status: 'delivered', currency: 'EGP', exchange_rate: null, products: [{ name: 'رخام أبيض كراراني', qty: 50, unit: 'م²' }], customs_notes: '', notes: 'تم التسليم بسلامة' },
    { id: 2, shipment_number: 'SHP-2024-002', invoice_id: 2, invoice_number: 'INV-2024-002', customer: 'شركة الإعمار المصرية', ship_type: 'بري', origin: 'المستودع الرئيسي', destination: 'الجيزة - برج الإعمار', driver: 'حسن السائق', vehicle: 'نقل ثقيل - ق م ص 456', weight_tons: 12.0, bill_of_lading: 'BOL-2024-002', convoy_number: null, receiver: 'مهندس سامي علي', shipment_date: '2024-02-25', delivery_date: null, status: 'in_transit', currency: 'EGP', exchange_rate: null, products: [{ name: 'جرانيت أسود مطلق', qty: 100, unit: 'م²' }, { name: 'جرانيت رمادي صواني', qty: 50, unit: 'م²' }], customs_notes: '', notes: 'في الطريق' },
    { id: 3, shipment_number: 'SHP-2024-003', invoice_id: 3, invoice_number: 'INV-2024-003', customer: 'مشاريع النيل العقارية', ship_type: 'بحري', origin: 'المستودع الرئيسي', destination: 'الإسكندرية - كمباوند النيل', driver: 'عمرو السائق', vehicle: 'نقل ثقيل - ق ج ن 123', weight_tons: 3.6, bill_of_lading: null, convoy_number: 'CNV-2024-001', receiver: null, shipment_date: '2024-03-10', delivery_date: null, status: 'ready_to_ship', currency: 'USD', exchange_rate: 31, products: [{ name: 'رخام أخضر زمرد', qty: 30, unit: 'م²' }], customs_notes: 'خاضع لضريبة تصدير 5%', notes: 'في انتظار التحميل' , currency: 'EGP', negotiated_price: null },
  ],
  warehouse_inventory: [
    { id: 1, warehouse_id: 1, product_id: 1, product_code: 'MBL-001', product_name: 'رخام أبيض كراراني', qty: 150, min_qty: 30 },
    { id: 2, warehouse_id: 1, product_id: 2, product_code: 'GRN-001', product_name: 'جرانيت أسود مطلق',  qty: 100, min_qty: 20 },
    { id: 3, warehouse_id: 2, product_id: 3, product_code: 'MBL-002', product_name: 'رخام بيج تونسي',    qty: 30,  min_qty: 20 },
    { id: 4, warehouse_id: 3, product_id: 4, product_code: 'GRN-002', product_name: 'جرانيت رمادي صواني', qty: 200, min_qty: 40 },
  ],
};

// ===== MOCK DB =====
const DB = {
  // ===== طبقة الـ Cache لتجنب إعادة JSON.parse في كل استدعاء =====
  _cache: {},
  _invalidateCache(key) { delete this._cache[key]; },

  get(key) {
    try {
      if (this._cache[key] !== undefined) return this._cache[key];
      const data = localStorage.getItem('marble_db_' + key);
      const parsed = data ? JSON.parse(data) : null;
      this._cache[key] = parsed;
      return parsed;
    } catch { return null; }
  },
  set(key, value) {
    localStorage.setItem('marble_db_' + key, JSON.stringify(value));
    this._cache[key] = value;
  },
  init() {
    if (!this.get('seeded')) {
      for (const [key, value] of Object.entries(SEED_DATA)) {
        this.set(key, value);
      }
      this.set('seeded', true);
    }
    // Migration: add activity_log if missing
    if (!this.get('activity_log')) this.set('activity_log', []);
    // Migration: add quotations if missing
    if (!this.get('quotations')) this.set('quotations', []);
    // Migration: add warehouses/shipments if missing
    if (!this.get('warehouses'))          this.set('warehouses',          SEED_DATA.warehouses);
    if (!this.get('shipments'))           this.set('shipments',           SEED_DATA.shipments);
    if (!this.get('warehouse_inventory')) this.set('warehouse_inventory', SEED_DATA.warehouse_inventory);
    // Migration: add exchange_rate to settings if missing
    const _settings = this.get('settings') || SEED_DATA.settings;
    if (!('exchange_rate' in _settings)) { _settings.exchange_rate = 31; this.set('settings', _settings); }
    // Migration: add bill_of_lading/receiver to existing shipments if missing
    const _shipments = this.getAll('shipments');
    let shipsMigrated = false;
    _shipments.forEach(s => {
      if (!('bill_of_lading'  in s)) { s.bill_of_lading  = null;   shipsMigrated = true; }
      if (!('receiver'        in s)) { s.receiver        = null;   shipsMigrated = true; }
      if (!('ship_type'       in s)) { s.ship_type       = 'بري';  shipsMigrated = true; }
      if (!('convoy_number'   in s)) { s.convoy_number   = null;   shipsMigrated = true; }
      if (!('customs_notes'   in s)) { s.customs_notes   = '';     shipsMigrated = true; }
      if (!('currency'        in s)) { s.currency        = 'EGP';  shipsMigrated = true; }
      if (!('exchange_rate'   in s)) { s.exchange_rate   = null;   shipsMigrated = true; }
      if (!('products'        in s)) { s.products        = [];     shipsMigrated = true; }
    });
    if (shipsMigrated) this.set('shipments', _shipments);

    // Migration: add currency / salesperson fields to sales
    const _sales = this.getAll('sales');
    let salesMigrated = false;
    _sales.forEach(s => {
      if (!('currency'          in s)) { s.currency          = 'EGP'; salesMigrated = true; }
      if (!('negotiated_price'  in s)) { s.negotiated_price  = null;  salesMigrated = true; }
      if (!('salesperson_id'    in s)) { s.salesperson_id    = null;  salesMigrated = true; }
      if (!('salesperson_name'  in s)) { s.salesperson_name  = '';    salesMigrated = true; }
    });
    if (salesMigrated) this.set('sales', _sales);

    // Migration: add currency to purchases
    const _purchases = this.getAll('purchases');
    let purMigrated = false;
    _purchases.forEach(p => {
      if (!('currency' in p)) { p.currency = 'EGP'; purMigrated = true; }
    });
    if (purMigrated) this.set('purchases', _purchases);

    // Migration: add currency to expenses
    const _expenses = this.getAll('expenses');
    let expMigrated = false;
    _expenses.forEach(e => {
      if (!('currency' in e)) { e.currency = 'EGP'; expMigrated = true; }
    });
    if (expMigrated) this.set('expenses', _expenses);

    // Migration: add currency to payments
    const _payments = this.getAll('payments');
    let payMigrated = false;
    _payments.forEach(p => {
      if (!('currency' in p)) { p.currency = 'EGP'; payMigrated = true; }
    });
    if (payMigrated) this.set('payments', _payments);

    // Migration: add missing fields to existing users
    const users = this.getAll('users');
    let usersMigrated = false;
    users.forEach(u => {
      if (!('active'      in u)) { u.active      = true;     usersMigrated = true; }
      if (!('phone'       in u)) { u.phone       = '';       usersMigrated = true; }
      if (!('department'  in u)) { u.department  = '';       usersMigrated = true; }
      if (!('work_status' in u)) { u.work_status = u.active !== false ? 'active' : 'terminated'; usersMigrated = true; }
      if (!('national_id' in u)) { u.national_id = '';       usersMigrated = true; }
      if (!('salary'          in u)) { u.salary          = 0;     usersMigrated = true; }
      if (!('must_change_password' in u)) { u.must_change_password = false; usersMigrated = true; }
      if (!('commission_rate' in u)) { u.commission_rate  = 0;     usersMigrated = true; }
      // Migrate role 'مدير' to 'مدير عام'
      if (u.role === 'مدير') { u.role = 'مدير عام'; usersMigrated = true; }
    });
    if (usersMigrated) this.set('users', users);
    // Migration: add default employee accounts if missing
    DEFAULT_EMPLOYEES.forEach(emp => {
      const existing = this.getAll('users').find(u => u.email === emp.email);
      if (!existing) {
        const id = DB.nextId('users');
        DB.save('users', { ...emp, id });
      }
    });
    // Migration: add commissions collection if missing
    if (!this.get('commissions')) this.set('commissions', []);
    // Migration: add type/region to existing customers
    const _customers = this.getAll('customers');
    let custMigrated = false;
    _customers.forEach(c => {
      if (!('type'   in c)) { c.type   = '';  custMigrated = true; }
      if (!('region' in c)) { c.region = '';  custMigrated = true; }
    });
    if (custMigrated) this.set('customers', _customers);
  },
  getAll(key) { return this.get(key) || []; },
  findById(key, id) { return this.getAll(key).find(i => i.id === parseInt(id)); },

  // ===== حدود التحقق من الحقول الرقمية =====
  _numericLimits: {
    amount:       { min: 0, max: 1e10 },
    total_amount: { min: 0, max: 1e10 },
    paid_amount:  { min: 0, max: 1e10 },
  },

  save(key, item) {
    // تنظيف الحقول النصية قبل الحفظ في localStorage
    const cleaned = {};
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === 'string' && k !== 'password' && k !== 'email') {
        try { cleaned[k] = sanitize(v); } catch { cleaned[k] = v; }
      } else {
        cleaned[k] = v;
      }
    }
    // التحقق من الحقول الرقمية
    for (const [field, limits] of Object.entries(this._numericLimits)) {
      if (field in cleaned) {
        const val = parseFloat(cleaned[field]);
        if (isNaN(val) || val < limits.min || val > limits.max) {
          throw new Error(`قيمة غير صالحة للحقل "${field}": ${cleaned[field]}`);
        }
      }
    }
    const items = this.getAll(key);
    const idx = items.findIndex(i => i.id === cleaned.id);
    if (idx >= 0) items[idx] = cleaned; else items.push(cleaned);
    this.set(key, items);
    this._invalidateCache(key);
    DB._broadcast(key, 'save');
    return cleaned;
  },
  remove(key, id) {
    this.set(key, this.getAll(key).filter(i => i.id !== parseInt(id)));
    this._invalidateCache(key);
    DB._broadcast(key, 'remove');
  },
  nextId(key) {
    const items = this.getAll(key);
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  },
  _channel: null,
  _broadcast(key, op) {
    if (!this._channel) return;
    try { this._channel.postMessage({ type: 'db_change', key, op, ts: Date.now() }); } catch (_) {}
  },
  _initChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this._channel = new BroadcastChannel('marble_erp_sync');
      }
    } catch (_) {}
  },
  // ===== التحقق من سلامة البيانات =====
  validateIntegrity() {
    const required = [
      'users', 'settings', 'customers', 'suppliers', 'products',
      'sales', 'purchases', 'payments', 'expenses', 'blocks',
      'slabs', 'cutting', 'journal', 'accounts',
    ];
    const corrupted = [];
    for (const key of required) {
      const raw = localStorage.getItem('marble_db_' + key);
      if (raw !== null) {
        try { JSON.parse(raw); } catch { corrupted.push(key); }
      }
    }
    return corrupted;
  },
};

DB.init();
DB._initChannel();

// ===== فحص سلامة البيانات =====
function checkDataIntegrity() {
  const keys = [
    'settings','employees','customers','suppliers','products',
    'sales','purchases','payments','expenses','blocks',
    'slabs','accounts','journal','warehouses','shipments'
  ];
  const corrupted = [];
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      if (v === null || (!Array.isArray(v) && typeof v !== 'object')) corrupted.push(key);
    } catch { corrupted.push(key); }
  });

  if (corrupted.length === 0) return true;

  // عرض رسالة الخطأ فوق المحتوى الحالي
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;
    display:flex;align-items:center;justify-content:center;
    direction:rtl;font-family:Cairo,sans-serif`;
  div.innerHTML = `
    <div style="background:var(--bg-primary,#fff);border-radius:16px;
                padding:28px;max-width:420px;width:90%;text-align:center">
      <div style="font-size:40px;margin-bottom:12px">⚠️</div>
      <h3 style="color:#a32d2d;margin-bottom:10px">تلف في البيانات</h3>
      <p style="color:#555;margin-bottom:8px">
        تم اكتشاف تلف في: <strong>${corrupted.join(' ، ')}</strong>
      </p>
      <p style="color:#888;font-size:13px;margin-bottom:20px">
        يُنصح باستعادة نسخة احتياطية قبل المتابعة
      </p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button onclick="document.querySelector('[data-backup-restore]')?.click();
                         this.closest('div[style*=fixed]').remove()"
                style="padding:10px 18px;background:#185fa5;color:#fff;
                       border:none;border-radius:8px;cursor:pointer">
          استعادة نسخة احتياطية
        </button>
        <button onclick="this.closest('div[style*=fixed]').remove()"
                style="padding:10px 18px;background:#888;color:#fff;
                       border:none;border-radius:8px;cursor:pointer">
          تجاهل والمتابعة
        </button>
      </div>
    </div>`;
  document.body.appendChild(div);
  return false;
}

// ===== MOCK API =====
const api = {
  token: sessionStorage.getItem('marble_token') || localStorage.getItem('marble_token'),

  setToken(t)  { this.token = t; sessionStorage.setItem('marble_token', t); },
  clearToken() { this.token = null; sessionStorage.removeItem('marble_token'); sessionStorage.removeItem('marble_user'); sessionStorage.removeItem('_xt'); localStorage.removeItem('marble_token'); localStorage.removeItem('marble_user'); },

  // ===== AUTH =====
  async login(email, password) {
    const hashedInput = await hashPassword(password);
    const user = DB.getAll('users').find(u => {
      if (u.email !== email) return false;
      const stored = u.password || '';
      // مقارنة الهاش المحسوب بالهاش المخزن
      if (stored.startsWith('sha256:') || stored.startsWith('sha256_fb:')) {
        return stored === hashedInput;
      }
      // ترحيل: المستخدم لا يزال بكلمة مرور صريحة — قارنها ثم حوّلها
      if (stored === password) {
        hashPassword(password).then(h => { u.password = h; DB.save('users', u); });
        return true;
      }
      return false;
    });
    if (!user) throw new Error('بريد إلكتروني أو كلمة مرور غير صحيحة');
    if (user.active === false) throw new Error('تم إيقاف هذا الحساب. تواصل مع المدير.');
    if (user.work_status === 'terminated') throw new Error('تم فصل هذا الموظف. تواصل مع المدير.');
    if (user.work_status === 'resigned')   throw new Error('لقد قدّم هذا الموظف استقالته. تواصل مع المدير.');
    return { token: 'mock_token_' + Date.now(), user: { id: user.id, name: user.name, role: user.role, email: user.email }, must_change_password: !!user.must_change_password };
  },
  async me() { return JSON.parse(sessionStorage.getItem('marble_user') || localStorage.getItem('marble_user') || '{}'); },

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

    // حساب مبيعات الشهر السابق للمقارنة
    const prevMonth = m === 0 ? 11 : m - 1;
    const prevYear  = m === 0 ? y - 1 : y;
    const prevMonthlySales = sales.filter(s => { const d = new Date(s.invoice_date); return d.getMonth() === prevMonth && d.getFullYear() === prevYear; });
    const prevTotal = prevMonthlySales.reduce((s, i) => s + i.total_amount, 0);
    const currTotal = monthlySales.reduce((s, i) => s + i.total_amount, 0);
    const salesGrowth = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal * 100).toFixed(1) : null;

    // أعلى 5 منتجات مبيعاً
    const productSales = {};
    sales.forEach(inv => (inv.items || []).forEach(item => {
      productSales[item.product] = (productSales[item.product] || 0) + item.qty;
    }));
    const topProducts = Object.entries(productSales).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // المنتجات ذات المخزون المنخفض
    const lowStockProducts = products.filter(p => p.stock_qty <= p.min_stock);

    return {
      kpis: {
        monthly_sales:       currTotal,
        monthly_sales_count: monthlySales.length,
        cash_balance:        85000,
        bank_balance:        320000,
        overdue_amount:      overdueSales.reduce((s, i) => s + (i.total_amount - i.paid_amount), 0),
        overdue_count:       overdueSales.length,
        inventory_value:     products.reduce((s, p) => s + p.cost * p.stock_qty, 0),
        monthly_purchases:   monthlyPurchases.reduce((s, p) => s + p.total_amount, 0),
        low_stock_count:     products.filter(p => p.stock_qty <= p.min_stock).length,
      },
      charts:            { monthly_sales: months },
      top_customers:     topCustomers,
      recent_invoices:   [...sales].sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)).slice(0, 5),
      sales_growth:      salesGrowth,
      top_products:      topProducts,
      low_stock_products: lowStockProducts,
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
    if (params.status)         items = items.filter(i => i.status === params.status);
    if (params.customer_id)    items = items.filter(i => i.customer_id === parseInt(params.customer_id));
    if (params.salesperson_id) items = items.filter(i => i.salesperson_id === parseInt(params.salesperson_id));
    if (params.search)         { const q = params.search.toLowerCase(); items = items.filter(i => i.invoice_number.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)) };
  },
  async saleDetail(id) { return DB.findById('sales', id); },
  async createSale(d) {
    const id  = DB.nextId('sales');
    const num = `INV-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    // نظام الموافقات: إذا تجاوزت الفاتورة الحد وكان المستخدم غير مدير → pending_approval
    let status = d.status || 'draft';
    const s = DB.get('settings') || {};
    const approvalLimit = parseFloat(s.approval_limit || 0);
    const userRole = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : '';
    const isManagerRole = ['مدير عام', 'مدير', 'مدير مبيعات', 'مدير قسم'].includes(userRole);
    if (approvalLimit > 0 && (d.total_amount || 0) > approvalLimit && !isManagerRole && status === 'draft') {
      status = 'pending_approval';
      DB.save('notifications', { id: DB.nextId('notifications'), title: 'فاتورة معلقة للموافقة', message: `الفاتورة ${num} (${d.customer}) - ${formatMoney(d.total_amount)} تحتاج موافقة المدير`, type: 'warning', is_read: false, created_at: new Date().toISOString() });
    }
    const sale = DB.save('sales', attachExchangeRate({ ...d, id, invoice_number: num, paid_amount: d.paid_amount || 0, status }));
    this.logActivity('create', 'sale', id, `فاتورة مبيعات: ${num} - ${d.customer}`);
    return sale;
  },
  async cancelSale(id) {
    const s = DB.findById('sales', id);
    if (s) { s.status = 'cancelled'; DB.save('sales', s); this.logActivity('update', 'sale', parseInt(id), `إلغاء فاتورة: ${s.invoice_number}`); }
    return s;
  },
  async approveSale(id) {
    const s = DB.findById('sales', id);
    if (!s) throw new Error('الفاتورة غير موجودة');
    s.status = 'draft';
    DB.save('sales', s);
    this.logActivity('update', 'sale', parseInt(id), `موافقة على الفاتورة ${s.invoice_number}`);
    return s;
  },
  async rejectSale(id, reason) {
    const s = DB.findById('sales', id);
    if (!s) throw new Error('الفاتورة غير موجودة');
    s.status = 'rejected';
    s.notes = (s.notes ? s.notes + '\n' : '') + 'سبب الرفض: ' + (reason || '');
    DB.save('sales', s);
    this.logActivity('update', 'sale', parseInt(id), `رفض الفاتورة ${s.invoice_number}: ${reason}`);
    return s;
  },
  async updateSaleStatus(id, newStatus) {
    const s = DB.findById('sales', id);
    if (!s) throw new Error('الفاتورة غير موجودة');
    const allowedStatuses = ['draft', 'sent', 'partial', 'paid', 'cancelled', 'rejected', 'pending_approval'];
    if (!allowedStatuses.includes(newStatus)) throw new Error('حالة غير صالحة');
    const oldStatus = s.status;
    s.status = newStatus;
    DB.save('sales', s);
    this.logActivity('update', 'sale', parseInt(id), `تغيير حالة فاتورة ${s.invoice_number}: ${oldStatus} ← ${newStatus}`);
    // Auto-calculate commission when sale becomes paid
    if (newStatus === 'paid' && oldStatus !== 'paid') {
      this._calcCommission(s);
    }
    // Add notification for status change
    const notifMsg = `تم تغيير حالة الفاتورة ${s.invoice_number} (${s.customer}) إلى: ${{ draft:'مسودة', sent:'مرسلة', partial:'جزئي مدفوع', paid:'مدفوعة', cancelled:'ملغاة', rejected:'مرفوضة', pending_approval:'معلقة للموافقة' }[newStatus] || newStatus}`;
    DB.save('notifications', { id: DB.nextId('notifications'), title: 'تغيير حالة فاتورة', message: notifMsg, type: newStatus === 'paid' ? 'success' : newStatus === 'rejected' || newStatus === 'cancelled' ? 'danger' : 'warning', is_read: false, created_at: new Date().toISOString() });
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
  async createCustomer(d)    { return DB.save('customers', { type: '', region: '', ...d, id: DB.nextId('customers'), balance: 0, created_at: new Date().toISOString().split('T')[0] }); },
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
    const num = `PUR-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    const pur = DB.save('purchases', attachExchangeRate({ ...d, id, invoice_number: num, paid_amount: d.paid_amount || 0, status: d.status || 'draft' }));
    this.logActivity('create', 'purchase', id, `فاتورة شراء: ${num} - ${d.supplier}`);
    return pur;
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
  async createPayment(d) {
    // Validate and update linked invoice before saving payment
    if (d.invoice_id && d.invoice_type === 'sale') {
      const inv = DB.findById('sales', d.invoice_id);
      if (!inv) throw new Error('الفاتورة المرتبطة غير موجودة');
    }
    if (d.invoice_id && d.invoice_type === 'purchase') {
      const inv = DB.findById('purchases', d.invoice_id);
      if (!inv) throw new Error('الفاتورة المرتبطة غير موجودة');
    }
    const payment = DB.save('payments', { ...d, id: DB.nextId('payments') });
    if (d.invoice_id && d.invoice_type === 'sale')     this.updateSalePaid(d.invoice_id, d.amount);
    if (d.invoice_id && d.invoice_type === 'purchase') this.updatePurchasePaid(d.invoice_id, d.amount);
    this.logActivity('create', 'payment', payment.id,
      `${d.type === 'receipt' ? 'مقبوض' : 'مدفوع'}: ${d.amount} - ${d.party}${d.invoice_id ? ' (مرتبط بفاتورة)' : ''}`);
    return payment;
  },

  // ===== EXPENSES =====
  async expenses(params = {}) {
    let items = DB.getAll('expenses');
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.date) - new Date(a.date)) };
  },
  async createExpense(d) {
    const exp = DB.save('expenses', { ...d, id: DB.nextId('expenses') });
    this.logActivity('create', 'expense', exp.id, `مصروف: ${d.category} - ${d.description} (${d.amount})`);
    return exp;
  },

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
    const num = `CUT-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    const cut = DB.save('cutting', { ...d, id, batch_number: num, status: 'in_progress' });
    this.logActivity('create', 'cutting', id, `دفعة تصنيع: ${num} - ${d.block_code || ''}`);
    return cut;
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

  // ===== WAREHOUSES =====
  async warehouses(params = {}) {
    let items = DB.getAll('warehouses');
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)); }
    return items;
  },
  async createWarehouse(d) {
    const w = DB.save('warehouses', { ...d, id: DB.nextId('warehouses'), status: 'active' });
    this.logActivity('create', 'logistics', w.id, `إضافة مستودع: ${d.name}`);
    return w;
  },
  async updateWarehouse(id, d) {
    const existing = DB.findById('warehouses', id);
    if (!existing) throw new Error('المستودع غير موجود');
    const updated = DB.save('warehouses', { ...existing, ...d, id: parseInt(id) });
    this.logActivity('update', 'logistics', parseInt(id), `تعديل مستودع: ${updated.name}`);
    return updated;
  },

  // ===== SHIPMENTS =====
  async shipments(params = {}) {
    let items = DB.getAll('shipments');
    if (params.status)   items = items.filter(i => i.status === params.status);
    if (params.search)   { const q = params.search.toLowerCase(); items = items.filter(i => i.shipment_number.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q) || (i.invoice_number || '').toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.shipment_date) - new Date(a.shipment_date)) };
  },
  async createShipment(d) {
    const id  = DB.nextId('shipments');
    const num = `SHP-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    const shp = DB.save('shipments', { ...d, id, shipment_number: num, status: d.status || 'pending' });
    this.logActivity('create', 'logistics', id, `شحنة جديدة: ${num} - ${d.customer}`);
    return shp;
  },
  async updateShipmentStatus(id, newStatus, extraData) {
    const s = DB.findById('shipments', id);
    if (!s) throw new Error('الشحنة غير موجودة');
    const allowedStatuses = ['pending', 'ready_to_ship', 'in_transit', 'arrived', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(newStatus)) throw new Error('حالة غير صالحة');
    s.status = newStatus;
    if (extraData) Object.assign(s, extraData);
    if (newStatus === 'delivered') {
      s.delivery_date = s.delivery_date || new Date().toISOString().split('T')[0];
      // Auto-update linked sale invoice status
      if (s.invoice_id) {
        const inv = DB.findById('sales', s.invoice_id);
        if (inv && inv.status !== 'cancelled' && inv.status !== 'rejected') {
          const newInvStatus = inv.paid_amount >= inv.total_amount ? 'paid' : 'sent';
          if (inv.status !== newInvStatus) {
            inv.status = newInvStatus;
            DB.save('sales', inv);
            this.logActivity('update', 'sale', inv.id, `تحديث حالة الفاتورة ${inv.invoice_number} تلقائياً عند اكتمال الشحن`);
            DB.save('notifications', { id: DB.nextId('notifications'), title: 'اكتمال الشحن', message: `تم تسليم الشحنة ${s.shipment_number} وتحديث الفاتورة ${inv.invoice_number}`, type: 'success', is_read: false, created_at: new Date().toISOString() });
          }
        }
      }
    }
    DB.save('shipments', s);
    this.logActivity('update', 'logistics', parseInt(id), `تحديث حالة شحنة ${s.shipment_number}: ${newStatus}`);
    return s;
  },

  // ===== SHIPMENT REPORTS =====
  async reportShipments(params = {}) {
    const DELAYED_SLA_DAYS = 7; // Shipments older than this without delivery are considered delayed
    let items = DB.getAll('shipments');
    if (params.ship_type) items = items.filter(i => i.ship_type === params.ship_type);
    if (params.status)    items = items.filter(i => i.status === params.status);
    if (params.date_from) items = items.filter(i => i.shipment_date >= params.date_from);
    if (params.date_to)   items = items.filter(i => i.shipment_date <= params.date_to);

    const seaShipments   = items.filter(i => i.ship_type === 'بحري');
    const landShipments  = items.filter(i => i.ship_type === 'بري');
    const delivered      = items.filter(i => i.status === 'delivered');
    const delayed        = items.filter(i => {
      if (i.status === 'delivered' || i.status === 'cancelled') return false;
      const expected = new Date(i.shipment_date);
      expected.setDate(expected.getDate() + DELAYED_SLA_DAYS);
      return new Date() > expected;
    });

    return {
      total: items.length,
      sea_count: seaShipments.length,
      land_count: landShipments.length,
      delivered_count: delivered.length,
      delayed_count: delayed.length,
      items: items.sort((a, b) => new Date(b.shipment_date) - new Date(a.shipment_date)),
      delayed,
    };
  },

  // ===== WAREHOUSE INVENTORY =====
  async warehouseInventory(warehouseId) {
    return DB.getAll('warehouse_inventory').filter(i => i.warehouse_id === parseInt(warehouseId));
  },
  async addWarehouseStock(warehouseId, data) {
    const { product_id, product_code, product_name, qty, min_qty } = data;
    if (!product_id || !qty || qty <= 0) throw new Error('بيانات غير صحيحة');
    const items = DB.getAll('warehouse_inventory');
    const existing = items.find(i => i.warehouse_id === parseInt(warehouseId) && i.product_id === parseInt(product_id));
    if (existing) {
      existing.qty += parseFloat(qty);
      DB.save('warehouse_inventory', existing);
      this.logActivity('update', 'logistics', existing.id, `إضافة ${qty} وحدة من ${product_name} للمستودع`);
      return existing;
    } else {
      const item = DB.save('warehouse_inventory', { id: DB.nextId('warehouse_inventory'), warehouse_id: parseInt(warehouseId), product_id: parseInt(product_id), product_code: product_code || '', product_name: product_name || '', qty: parseFloat(qty), min_qty: parseFloat(min_qty) || 0 });
      this.logActivity('create', 'logistics', item.id, `إضافة منتج ${product_name} للمستودع`);
      return item;
    }
  },
  async adjustWarehouseStock(itemId, newQty) {
    const item = DB.findById('warehouse_inventory', itemId);
    if (!item) throw new Error('البند غير موجود');
    const oldQty = item.qty;
    item.qty = parseFloat(newQty);
    if (item.qty < 0) throw new Error('لا يمكن أن تكون الكمية سالبة');
    DB.save('warehouse_inventory', item);
    this.logActivity('update', 'logistics', itemId, `تعديل كمية ${item.product_name}: ${oldQty} → ${newQty}`);
    return item;
  },
  async deleteWarehouseInventoryItem(itemId) {
    const item = DB.findById('warehouse_inventory', itemId);
    if (!item) throw new Error('البند غير موجود');
    DB.remove('warehouse_inventory', itemId);
    this.logActivity('update', 'logistics', itemId, `حذف منتج ${item.product_name} من المستودع`);
  },

  // ===== NOTIFICATIONS =====
  async notifications() { return DB.getAll('notifications'); },
  async markNotificationRead(id) {
    const n = DB.findById('notifications', id);
    if (n) { n.is_read = true; DB.save('notifications', n); }
    return n;
  },

  // ===== USERS / EMPLOYEES =====
  async users(params = {}) {
    let items = DB.getAll('users').map(({ password, ...u }) => u);
    if (params.search) {
      const q = params.search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q));
    }
    return items;
  },
  async createUser(d) {
    const existing = DB.getAll('users').find(u => u.email === d.email);
    if (existing) throw new Error('البريد الإلكتروني مستخدم بالفعل');
    const newUser = DB.save('users', { ...d, id: DB.nextId('users'), active: true });
    this.logActivity('create', 'employee', newUser.id, `إضافة موظف: ${d.name} (${d.role})`);
    return newUser;
  },
  async updateUser(id, d) {
    const existing = DB.findById('users', id);
    if (!existing) throw new Error('المستخدم غير موجود');
    if (d.email && d.email !== existing.email) {
      const dup = DB.getAll('users').find(u => u.email === d.email && u.id !== parseInt(id));
      if (dup) throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }
    const updated = { ...existing, ...d, id: parseInt(id) };
    if (!d.password) updated.password = existing.password;
    DB.save('users', updated);
    this.logActivity('update', 'employee', parseInt(id), `تعديل بيانات موظف: ${updated.name}`);
    return updated;
  },
  async deleteUser(id) {
    if (parseInt(id) === 1) throw new Error('لا يمكن حذف حساب المدير الرئيسي');
    DB.remove('users', id);
  },

  // ===== ACTIVITY LOG =====
  logActivity(action, entityType, entityId, description) {
    const user = JSON.parse(sessionStorage.getItem('marble_user') || localStorage.getItem('marble_user') || '{}');
    if (!user.id) return;
    DB.save('activity_log', {
      id: DB.nextId('activity_log'),
      user_id:     user.id,
      user_name:   user.name || 'مجهول',
      action,
      entity_type: entityType,
      entity_id:   entityId,
      description,
      created_at:  new Date().toISOString(),
    });
  },
  async activityLog(params = {}) {
    let items = DB.getAll('activity_log');
    if (params.user_id)     items = items.filter(i => i.user_id     === parseInt(params.user_id));
    if (params.entity_type) items = items.filter(i => i.entity_type === params.entity_type);
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 500);
  },

  // ===== عروض الأسعار =====
  async quotations(params = {}) {
    let items = DB.getAll('quotations');
    if (params.status) items = items.filter(i => i.status === params.status);
    if (params.search) { const q = params.search.toLowerCase(); items = items.filter(i => i.quotation_number.toLowerCase().includes(q) || i.customer.toLowerCase().includes(q)); }
    return { data: items.sort((a, b) => new Date(b.date) - new Date(a.date)) };
  },
  async createQuotation(d) {
    const id  = DB.nextId('quotations');
    const num = `QUO-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    const quo = DB.save('quotations', { ...d, id, quotation_number: num, status: d.status || 'draft', created_at: new Date().toISOString() });
    this.logActivity('create', 'quotation', id, `عرض سعر: ${num} - ${d.customer}`);
    return quo;
  },
  async updateQuotationStatus(id, newStatus) {
    const q = DB.findById('quotations', id);
    if (!q) throw new Error('عرض السعر غير موجود');
    const allowed = ['draft', 'sent', 'accepted', 'rejected', 'invoiced'];
    if (!allowed.includes(newStatus)) throw new Error('حالة غير صالحة');
    q.status = newStatus;
    DB.save('quotations', q);
    this.logActivity('update', 'quotation', parseInt(id), `تغيير حالة عرض السعر ${q.quotation_number}: ${newStatus}`);
    return q;
  },
  async convertQuotationToInvoice(id) {
    const q = DB.findById('quotations', id);
    if (!q) throw new Error('عرض السعر غير موجود');
    if (q.status === 'invoiced') throw new Error('تم تحويل عرض السعر مسبقاً');
    const sale = await this.createSale({
      customer_id:    q.customer_id,
      customer:       q.customer,
      invoice_date:   new Date().toISOString().split('T')[0],
      due_date:       q.valid_until || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
      items:          q.items,
      subtotal:       q.subtotal,
      tax:            q.tax || 0,
      total_amount:   q.total_amount,
      paid_amount:    0,
      status:         'draft',
      notes:          `محوّلة من عرض السعر ${q.quotation_number}`,
      currency:       q.currency || 'EGP',
      negotiated_price: null,
    });
    q.status = 'invoiced';
    q.invoice_id = sale.id;
    DB.save('quotations', q);
    this.logActivity('update', 'quotation', parseInt(id), `تحويل عرض السعر ${q.quotation_number} إلى فاتورة ${sale.invoice_number}`);
    return sale;
  },

  // ===== INVOICE-PAYMENT HELPERS =====
  updateSalePaid(id, addAmount) {
    const s = DB.findById('sales', id);
    if (!s) return;
    const wasPaid = s.status === 'paid';
    s.paid_amount = Math.min((s.paid_amount || 0) + addAmount, s.total_amount);
    if (s.paid_amount >= s.total_amount)  s.status = 'paid';
    else if (s.paid_amount > 0)           s.status = 'partial';
    DB.save('sales', s);
    // Auto-calculate commission when sale becomes fully paid
    if (!wasPaid && s.status === 'paid') {
      this._calcCommission(s);
    }
    return s;
  },
  updatePurchasePaid(id, addAmount) {
    const p = DB.findById('purchases', id);
    if (!p) return;
    p.paid_amount = Math.min((p.paid_amount || 0) + addAmount, p.total_amount);
    if (p.paid_amount >= p.total_amount)  p.status = 'paid';
    else if (p.paid_amount > 0)           p.status = 'partial';
    DB.save('purchases', p);
    return p;
  },

  // ===== COMMISSION HELPERS =====
  _calcCommission(sale) {
    if (!sale.salesperson_id) return;
    // Avoid duplicate commission for the same invoice
    const existing = DB.getAll('commissions').find(c => c.sale_id === sale.id);
    if (existing) return;
    const sp = DB.findById('users', sale.salesperson_id);
    const rate = parseFloat(sp?.commission_rate || 0);
    if (rate <= 0) return;
    const amount = Math.round((sale.total_amount || 0) * rate) / 100;
    DB.save('commissions', {
      id:               DB.nextId('commissions'),
      sale_id:          sale.id,
      invoice_number:   sale.invoice_number,
      salesperson_id:   sale.salesperson_id,
      salesperson_name: sale.salesperson_name || sp?.name || '',
      customer:         sale.customer,
      sale_amount:      sale.total_amount,
      commission_rate:  rate,
      commission_amount: amount,
      status:           'pending',
      created_at:       new Date().toISOString(),
    });
    DB.save('notifications', {
      id: DB.nextId('notifications'),
      title: 'عمولة جديدة',
      message: `عمولة ${sale.salesperson_name || sp?.name || ''} على الفاتورة ${sale.invoice_number}: ${amount.toFixed(2)} EGP`,
      type: 'success',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  },

  // ===== COMMISSIONS =====
  async commissions(params = {}) {
    let items = DB.getAll('commissions');
    if (params.salesperson_id) items = items.filter(i => i.salesperson_id === parseInt(params.salesperson_id));
    if (params.status)         items = items.filter(i => i.status === params.status);
    return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async payCommission(id) {
    const c = DB.findById('commissions', id);
    if (!c) throw new Error('العمولة غير موجودة');
    c.status = 'paid';
    c.paid_at = new Date().toISOString();
    DB.save('commissions', c);
    this.logActivity('update', 'commission', parseInt(id), `صرف عمولة ${c.salesperson_name}: ${c.commission_amount}`);
    return c;
  },

  // ===== SALES PERFORMANCE =====
  async salesPerformance(params = {}) {
    let sales = DB.getAll('sales').filter(s => s.status !== 'cancelled' && s.status !== 'rejected');
    // Date range filter
    if (params.date_from) sales = sales.filter(s => s.invoice_date >= params.date_from);
    if (params.date_to)   sales = sales.filter(s => s.invoice_date <= params.date_to);

    // By salesperson
    const spMap = {};
    sales.forEach(s => {
      const key  = s.salesperson_id || 0;
      const name = s.salesperson_name || (s.salesperson_id ? `موظف #${s.salesperson_id}` : 'بدون سيلز');
      if (!spMap[key]) spMap[key] = { id: key, name, total: 0, paid: 0, count: 0 };
      spMap[key].total += s.total_amount || 0;
      spMap[key].paid  += s.paid_amount  || 0;
      spMap[key].count++;
    });
    const bySalesperson = Object.values(spMap).sort((a, b) => b.total - a.total);

    // Top products
    const prodMap = {};
    sales.forEach(s => (s.items || []).forEach(item => {
      const k = item.product || item.product_id || 'غير محدد';
      if (!prodMap[k]) prodMap[k] = { name: k, qty: 0, total: 0 };
      prodMap[k].qty   += item.qty || 0;
      prodMap[k].total += item.subtotal || 0;
    }));
    const topProducts = Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 10);

    // By region
    const customers = DB.getAll('customers');
    const regionMap = {};
    sales.forEach(s => {
      const cust   = customers.find(c => c.id === s.customer_id);
      const region = cust?.region || 'غير محددة';
      if (!regionMap[region]) regionMap[region] = { region, total: 0, count: 0 };
      regionMap[region].total += s.total_amount || 0;
      regionMap[region].count++;
    });
    const byRegion = Object.values(regionMap).sort((a, b) => b.total - a.total);

    // By customer type
    const typeMap = {};
    sales.forEach(s => {
      const cust = customers.find(c => c.id === s.customer_id);
      const type = cust?.type || 'غير مصنف';
      if (!typeMap[type]) typeMap[type] = { type, total: 0, count: 0 };
      typeMap[type].total += s.total_amount || 0;
      typeMap[type].count++;
    });
    const byCustomerType = Object.values(typeMap).sort((a, b) => b.total - a.total);

    // Monthly trend
    const monthMap = {};
    sales.forEach(s => {
      const d = new Date(s.invoice_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { month: key, total: 0, count: 0 };
      monthMap[key].total += s.total_amount || 0;
      monthMap[key].count++;
    });
    const monthlyTrend = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

    // Commission summary
    const commissions = DB.getAll('commissions');
    const commMap = {};
    commissions.forEach(c => {
      const k = c.salesperson_id || 0;
      if (!commMap[k]) commMap[k] = { id: k, name: c.salesperson_name, pending: 0, paid: 0 };
      if (c.status === 'paid') commMap[k].paid    += c.commission_amount;
      else                     commMap[k].pending  += c.commission_amount;
    });
    const commissionSummary = Object.values(commMap);

    return {
      total_sales:    sales.reduce((s, i) => s + i.total_amount, 0),
      total_count:    sales.length,
      bySalesperson,
      topProducts,
      byRegion,
      byCustomerType,
      monthlyTrend,
      commissionSummary,
    };
  },

  // ===== دوال الربط التلقائي بين الوحدات =====

  /** تحديث درجة جودة لوح */
  updateSlabGrade(slabId, newGrade) {
    const records = DB.getAll('quality_records');
    const rec = records.find(r => r.slabId === slabId || r.slabCode === slabId);
    if (rec) { rec.qualityGrade = newGrade; DB.save('quality_records', rec); }
  },

  /** نقل لوح مرفوض إلى المعزل */
  moveSlabToRejected(slabId) {
    const records = DB.getAll('quality_records');
    const rec = records.find(r => r.slabId === slabId || r.slabCode === slabId);
    if (rec) { rec.status = 'rejected'; DB.save('quality_records', rec); }
  },

  /** تحديث حالة لوح */
  updateSlabStatus(slabId, status) {
    const records = DB.getAll('quality_records');
    const rec = records.find(r => r.slabId === slabId || r.slabCode === slabId || String(r.id) === String(slabId));
    if (rec) { rec.status = status; DB.save('quality_records', rec); }
  },

  /** حجز ألواح المخزن لأمر تصدير */
  reserveSlabs(orderItems) {
    (orderItems || []).forEach(item => {
      if (item.slabId) this.updateSlabStatus(item.slabId, 'reserved');
    });
  },

  /** خصم الألواح من المخزن نهائياً عند الشحن */
  deductInventory(orderItems) {
    (orderItems || []).forEach(item => {
      if (item.slabId) this.updateSlabStatus(item.slabId, 'sold');
    });
  },

  /** إنشاء عرض سعر تلقائي من أمر التصدير */
  createQuotationFromOrder(orderId) {
    const order = DB.findById('export_orders', orderId);
    if (!order) return null;
    const quotes = DB.getAll('quotations') || [];
    const exists = quotes.find(q => q.exportOrderId === orderId);
    if (exists) return exists;
    const newQuote = {
      id:            DB.nextId('quotations'),
      exportOrderId: orderId,
      customerId:    order.customerId,
      customerName:  order.customerName,
      date:          new Date().toISOString().split('T')[0],
      status:        'auto',
      items:         order.items || [],
      total:         order.totalRevenue || 0,
      currency:      order.currency || 'EGP',
      notes:         'عرض سعر تلقائي من أمر التصدير ' + order.exportOrderNo,
    };
    quotes.push(newQuote);
    DB.set('quotations', quotes);
    return newQuote;
  },

  /** إنشاء فاتورة مبيعات تلقائياً من أمر التصدير */
  createSalesInvoice(orderId) {
    const order = DB.findById('export_orders', orderId);
    if (!order) return null;
    const invoiceNo = 'INV-EXP-' + orderId + '-' + Date.now().toString(36).toUpperCase();
    const invoice = {
      id:             DB.nextId('sales'),
      invoice_number: invoiceNo,
      exportOrderId:  orderId,
      customer_id:    order.customerId,
      customer:       order.customerName,
      invoice_date:   new Date().toISOString().split('T')[0],
      due_date:       new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status:         'sent',
      currency:       order.currency || 'EGP',
      items:          (order.items || []).map(i => ({
        product:    i.description || i.slabCode || '',
        qty:        i.quantity || 1,
        unit_price: i.unitPrice || 0,
        subtotal:   (i.quantity || 1) * (i.unitPrice || 0),
      })),
      subtotal:      order.totalRevenue || 0,
      tax:           0,
      total_amount:  order.totalRevenue || 0,
      paid_amount:   0,
      notes:         'فاتورة تلقائية - أمر تصدير ' + (order.exportOrderNo || orderId),
    };
    DB.save('sales', invoice);
    return invoice;
  },

  /** إنشاء فاتورة من عرض سعر */
  createInvoiceFromQuote(quoteId) {
    const quotes = DB.getAll('quotations') || [];
    const quote = quotes.find(q => q.id === quoteId || String(q.id) === String(quoteId));
    if (!quote) return null;
    const invoiceNo = 'INV-Q-' + quoteId + '-' + Date.now().toString(36).toUpperCase();
    const invoice = {
      id:             DB.nextId('sales'),
      invoice_number: invoiceNo,
      quoteId:        quoteId,
      customer_id:    quote.customerId,
      customer:       quote.customerName,
      invoice_date:   new Date().toISOString().split('T')[0],
      due_date:       new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status:         'draft',
      currency:       quote.currency || 'EGP',
      items:          quote.items || [],
      subtotal:       quote.total || 0,
      tax:            0,
      total_amount:   quote.total || 0,
      paid_amount:    0,
      notes:          'فاتورة من عرض سعر #' + quoteId,
    };
    DB.save('sales', invoice);
    // تحديث حالة عرض السعر
    quote.status = 'invoiced';
    DB.save('quotations', quote);
    return invoice;
  },

  /** تسجيل تفاعل في CRM */
  updateCRMInteraction(customerId, type, refId) {
    if (typeof addCrmInteraction === 'function') {
      addCrmInteraction(customerId, {
        type:    'quote_accept',
        summary: type + (refId ? ' #' + refId : ''),
        date:    new Date().toISOString().split('T')[0],
      });
    }
  },

  /** تحديث تاريخ آخر صفقة في CRM */
  updateCRMLastDeal(customerId, date, orderId) {
    const all = DB.getAll('crm_customers') || [];
    let rec = all.find(c => c.id === customerId);
    if (!rec) { rec = { id: customerId, interactions: [], sampleRequests: [], contacts: [] }; all.push(rec); }
    rec.lastExportOrderDate  = date || new Date().toISOString().split('T')[0];
    rec.lastExportOrderId    = orderId;
    DB.set('crm_customers', all);
  },

  /** تحديث رصيد العميل في CRM */
  updateCRMBalance(customerId, delta) {
    const all = DB.getAll('crm_customers') || [];
    let rec = all.find(c => c.id === customerId);
    if (!rec) { rec = { id: customerId, interactions: [], sampleRequests: [], contacts: [] }; all.push(rec); }
    rec.crmBalance = (rec.crmBalance || 0) + delta;
    DB.set('crm_customers', all);
  },

};

// ===== دوال الربط التلقائي بين الجداول =====

// تحديث المخزون (إضافة / خصم)
function updateInventory(itemId, qty, direction, warehouseId) {
  try {
    const blocks = DB.getAll('blocks');
    const block  = blocks.find(b => b.id === parseInt(itemId) || b.code === itemId);
    if (block && direction === 'in') {
      // تحديث حالة الكتلة الخام
      block.status = 'in_stock';
      DB.save('blocks', block);
    }
    // تسجيل في سجل حركة المخزون
    DB.save('inventory_movements', {
      id:          DB.nextId('inventory_movements'),
      item_id:     itemId,
      qty:         parseFloat(qty) || 0,
      direction,
      warehouse_id: warehouseId || '',
      date:        new Date().toISOString().split('T')[0],
    });
  } catch (_) {}
}

// إنشاء قيد محاسبي تلقائي
function createAutoJournal({ debit, credit, amount, ref, date }) {
  try {
    const accounts = DB.getAll('accounts');
    const getAccountId = (name) => {
      const acc = accounts.find(a => a.name && a.name.includes(name));
      return acc ? acc.id : null;
    };
    const id  = DB.nextId('journal');
    const num = `AJ-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`;
    DB.save('journal', {
      id,
      number:      num,
      date:        date || new Date().toISOString().split('T')[0],
      description: `قيد تلقائي — ${ref || ''}`,
      lines: [
        { account_id: getAccountId(debit),  account_name: debit,  debit: parseFloat(amount) || 0, credit: 0 },
        { account_id: getAccountId(credit), account_name: credit, debit: 0, credit: parseFloat(amount) || 0 },
      ],
    });
  } catch (_) {}
}

// تحديث تكلفة بند (كتلة أو لوح)
function updateItemCost(itemId, stageCost) {
  try {
    const block = DB.findById('blocks', itemId);
    if (block) {
      block.cost = (block.cost || 0) + (parseFloat(stageCost) || 0);
      DB.save('blocks', block);
      return;
    }
    const slab = DB.findById('slabs', itemId);
    if (slab) {
      slab.cost = (slab.cost || 0) + (parseFloat(stageCost) || 0);
      DB.save('slabs', slab);
    }
  } catch (_) {}
}

// تحديث تكلفة لوح
function updateSlabCost(slabId, stageCost) {
  try {
    const slab = DB.findById('slabs', slabId);
    if (slab) {
      slab.cost = (slab.cost || 0) + (parseFloat(stageCost) || 0);
      DB.save('slabs', slab);
    }
  } catch (_) {}
}

// تحديث حالة لوح
function updateSlabStatus(slabId, newStatus) {
  try {
    const slab = DB.findById('slabs', slabId);
    if (slab) {
      slab.status = newStatus;
      DB.save('slabs', slab);
    }
  } catch (_) {}
}

// حجز ألواح لأمر تصدير
function reserveInventory(items) {
  try {
    (items || []).forEach(item => {
      if (item.slab_id) {
        const slab = DB.findById('slabs', item.slab_id);
        if (slab) { slab.status = 'محجوز'; DB.save('slabs', slab); }
      }
    });
  } catch (_) {}
}

// تحديث آخر صفقة في سجل العميل (CRM)
function updateCRMLastDeal(customerId, date, orderId) {
  try {
    const crm = DB.getAll('crm_records');
    const rec = crm.find(r => r.customer_id === parseInt(customerId));
    if (rec) {
      rec.last_deal_date  = date || new Date().toISOString().split('T')[0];
      rec.last_deal_id    = orderId;
      DB.save('crm_records', rec);
    }
  } catch (_) {}
}

// تحديث حالة فاتورة بناءً على المبلغ المدفوع
function updateInvoiceStatus(invoiceId, amountPaid) {
  try {
    const inv = DB.findById('sales', invoiceId);
    if (!inv) return;
    inv.paid_amount = Math.min((inv.paid_amount || 0) + (parseFloat(amountPaid) || 0), inv.total_amount);
    if (inv.paid_amount >= inv.total_amount) inv.status = 'paid';
    else if (inv.paid_amount > 0)            inv.status = 'partial';
    DB.save('sales', inv);
  } catch (_) {}
}

// تحديث رصيد العميل في CRM
function updateCRMBalance(customerId, amount) {
  try {
    const crm = DB.getAll('crm_records');
    const rec = crm.find(r => r.customer_id === parseInt(customerId));
    if (rec) {
      rec.balance = (rec.balance || 0) - (parseFloat(amount) || 0);
      DB.save('crm_records', rec);
    }
  } catch (_) {}
}

// تحديث رصيد المورد
function updateSupplierBalance(supplierId, amount, operation) {
  try {
    const supplier = DB.findById('suppliers', supplierId);
    if (!supplier) return;
    const amt = parseFloat(amount) || 0;
    if (operation === 'add') {
      supplier.balance = (supplier.balance || 0) + amt;
    } else {
      supplier.balance = Math.max(0, (supplier.balance || 0) - amt);
    }
    DB.save('suppliers', supplier);
  } catch (_) {}
}

// تحديث حالة كتلة خام
function updateBlockStatus(blockId, newStatus) {
  try {
    const block = DB.findById('blocks', blockId);
    if (block) {
      block.status = newStatus;
      DB.save('blocks', block);
    }
  } catch (_) {}
}

// إنشاء ألواح من عملية نشر
function createSlabsFromCutting(cuttingData) {
  try {
    const { blockId, slabs_count, grade_a, grade_b, grade_c, waste, block_type, cutting_id } = cuttingData;
    let slabNum = DB.nextId('slabs');
    const block = DB.findById('blocks', parseInt(blockId));
    const blockCode = block ? block.code : '';

    // إنشاء ألواح درجة أولى
    for (let i = 0; i < (grade_a || 0); i++) {
      const id = slabNum++;
      DB.save('slabs', {
        id,
        code:       `SLB-${String(id).padStart(4, '0')}`,
        block_id:   parseInt(blockId),
        block_code: blockCode,
        type:       block_type || '',
        grade:      'درجة أولى',
        width:      0, height: 0, thickness: 2, area_m2: 0,
        status:     'متاح',
        cutting_id: cutting_id || null,
      });
    }
    // إنشاء ألواح درجة ثانية
    for (let i = 0; i < (grade_b || 0); i++) {
      const id = slabNum++;
      DB.save('slabs', {
        id,
        code:       `SLB-${String(id).padStart(4, '0')}`,
        block_id:   parseInt(blockId),
        block_code: blockCode,
        type:       block_type || '',
        grade:      'درجة ثانية',
        width:      0, height: 0, thickness: 2, area_m2: 0,
        status:     'متاح',
        cutting_id: cutting_id || null,
      });
    }
    // إنشاء ألواح درجة ثالثة
    for (let i = 0; i < (grade_c || 0); i++) {
      const id = slabNum++;
      DB.save('slabs', {
        id,
        code:       `SLB-${String(id).padStart(4, '0')}`,
        block_id:   parseInt(blockId),
        block_code: blockCode,
        type:       block_type || '',
        grade:      'درجة ثالثة',
        width:      0, height: 0, thickness: 2, area_m2: 0,
        status:     'متاح',
        cutting_id: cutting_id || null,
      });
    }
  } catch (_) {}
}

// ===== سجل أسعار الصرف التاريخي =====

// توليد معرف فريد بسيط
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// حفظ سعر صرف جديد مع تاريخه
function saveExchangeRate(currency, rate, date) {
  date = date || new Date().toISOString();
  const rates = JSON.parse(
    localStorage.getItem('exchange_rates') || '[]'
  );
  rates.push({
    id: generateId(), currency, rate: parseFloat(rate), date
  });
  localStorage.setItem('exchange_rates', JSON.stringify(rates));
}

// الحصول على سعر الصرف في تاريخ معين
function getExchangeRateAtDate(currency, date) {
  const rates  = JSON.parse(
    localStorage.getItem('exchange_rates') || '[]'
  );
  const target = new Date(date);
  const match  = rates
    .filter(r => r.currency === currency && new Date(r.date) <= target)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (match.length) return match[0].rate;
  const s = JSON.parse(localStorage.getItem('settings') || '{}');
  return s.exchangeRate || 31;
}

// إرفاق لقطة سعر الصرف الحالي بمستند (فاتورة مبيعات أو مشتريات)
function attachExchangeRate(doc) {
  const s = JSON.parse(localStorage.getItem('settings') || '{}');
  return Object.assign({}, doc, {
    exchangeRateSnapshot: s.exchangeRate || 31,
    rateDate: new Date().toISOString()
  });
}
