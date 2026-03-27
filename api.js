// ============================================
// API Client - Marble ERP
// ============================================
const API_BASE = '/api';

const api = {
  token: localStorage.getItem('marble_token'),

  setToken(t) {
    this.token = t;
    localStorage.setItem('marble_token', t);
  },

  clearToken() {
    this.token = null;
    localStorage.removeItem('marble_token');
    localStorage.removeItem('marble_user');
  },

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  },

  async request(method, path, data) {
    try {
      const opts = { method, headers: this.headers() };
      if (data) opts.body = JSON.stringify(data);
      const res = await fetch(API_BASE + path, opts);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'حدث خطأ');
      return json;
    } catch (e) {
      if (e.message === 'Invalid token') {
        this.clearToken();
        location.reload();
      }
      throw e;
    }
  },

  get(path)         { return this.request('GET', path); },
  post(path, data)  { return this.request('POST', path, data); },
  put(path, data)   { return this.request('PUT', path, data); },
  delete(path)      { return this.request('DELETE', path); },

  // Auth
  login(email, password) { return this.post('/auth/login', { email, password }); },
  me()                   { return this.get('/auth/me'); },

  // Dashboard
  dashboard()            { return this.get('/dashboard'); },

  // Accounting
  journal(params = {})   { return this.get('/journal?' + new URLSearchParams(params)); },
  journalEntry(id)       { return this.get('/journal/' + id); },
  createJournal(data)    { return this.post('/journal', data); },
  trialBalance(p)        { return this.get('/journal/reports/trial-balance?' + new URLSearchParams(p||{})); },
  accounts(p)            { return this.get('/accounts?' + new URLSearchParams(p||{})); },
  createAccount(d)       { return this.post('/accounts', d); },

  // Sales
  sales(p)               { return this.get('/sales?' + new URLSearchParams(p||{})); },
  saleDetail(id)         { return this.get('/sales/' + id); },
  createSale(d)          { return this.post('/sales', d); },
  cancelSale(id)         { return this.post('/sales/' + id + '/cancel'); },
  aging()                { return this.get('/sales/reports/aging'); },

  // Purchases
  purchases(p)           { return this.get('/purchases?' + new URLSearchParams(p||{})); },
  createPurchase(d)      { return this.post('/purchases', d); },

  // Payments
  payments(p)            { return this.get('/payments?' + new URLSearchParams(p||{})); },
  createPayment(d)       { return this.post('/payments', d); },

  // Expenses
  expenses(p)            { return this.get('/expenses?' + new URLSearchParams(p||{})); },
  createExpense(d)       { return this.post('/expenses', d); },

  // Customers
  customers(p)           { return this.get('/customers?' + new URLSearchParams(p||{})); },
  createCustomer(d)      { return this.post('/customers', d); },
  updateCustomer(id, d)  { return this.put('/customers/' + id, d); },

  // Suppliers
  suppliers(p)           { return this.get('/suppliers?' + new URLSearchParams(p||{})); },
  createSupplier(d)      { return this.post('/suppliers', d); },

  // Products
  products(p)            { return this.get('/products?' + new URLSearchParams(p||{})); },
  createProduct(d)       { return this.post('/products', d); },
  updateProduct(id, d)   { return this.put('/products/' + id, d); },

  // Blocks
  blocks(p)              { return this.get('/blocks?' + new URLSearchParams(p||{})); },
  createBlock(d)         { return this.post('/blocks', d); },

  // Slabs
  slabs(p)               { return this.get('/slabs?' + new URLSearchParams(p||{})); },

  // Cutting
  cuttingBatches(p)      { return this.get('/cutting?' + new URLSearchParams(p||{})); },
  cuttingDetail(id)      { return this.get('/cutting/' + id); },
  createCutting(d)       { return this.post('/cutting', d); },

  // Projects
  projects(p)            { return this.get('/projects?' + new URLSearchParams(p||{})); },
  createProject(d)       { return this.post('/projects', d); },

  // Reports
  reportPL(p)            { return this.get('/reports/profit-loss?' + new URLSearchParams(p||{})); },
  reportBS(p)            { return this.get('/reports/balance-sheet?' + new URLSearchParams(p||{})); },
  reportWaste(p)         { return this.get('/reports/waste?' + new URLSearchParams(p||{})); },
  reportInventory()      { return this.get('/reports/inventory'); },
  reportCustomerPL(p)    { return this.get('/reports/customer-profitability?' + new URLSearchParams(p||{})); },
  reportProductPL()      { return this.get('/reports/product-profitability'); },

  // Settings
  settings()             { return this.get('/settings'); },
  saveSettings(d)        { return this.put('/settings', d); },

  // Notifications
  notifications()        { return this.get('/notifications'); },
};
