# نظام ERP - الرخام والجرانيت

A web-based **Enterprise Resource Planning (ERP)** system tailored for marble and granite businesses. Built as a single-page application (SPA) with a clean RTL Arabic interface.

🌐 **Live Demo:** [https://yousefeid1.github.io](https://yousefeid1.github.io)

---

## Features

### 📊 Accounting
- **Journal Entries** – Create and manage double-entry accounting records
- **Chart of Accounts** – Hierarchical account tree management
- **Trial Balance** – Real-time trial balance reports

### 💰 Sales
- **Sales Invoices** – Create and track customer invoices with status management (draft → sent → paid)
- **Customer Management** – Full customer profiles and ledger
- **Aging Report** – Receivables aging analysis

### 🛒 Purchases
- **Purchase Invoices** – Record supplier invoices and inventory receipts
- **Supplier Management** – Supplier profiles and payables tracking
- **Payments & Receipts** – Log all payments and collections

### 🪨 Marble & Production
- **Raw Blocks** – Track incoming raw marble/granite blocks
- **Cutting Operations** – Manage cutting batches and yield
- **Slabs** – Inventory of processed slabs
- **Products** – Finished product catalog with pricing

### 💸 Costs
- **Expenses** – Record and categorize operational expenses

### 📈 Financial Reports
- **Profit & Loss** – Income statement with date range filters
- **Balance Sheet** – Full balance sheet snapshot
- **Waste Report** – Waste/scrap tracking and analysis
- **Inventory Report** – Current stock valuation

### 🚛 Logistics
- **Warehouse Management** – Multiple warehouse support
- **Shipments** – Delivery and shipping tracking

### ⚙️ Settings & Administration
- **Employee Management** – User and staff records
- **Activity Log** – Full audit trail of system actions
- **System Settings** – Company name, currency, and preferences
- **Notifications** – Real-time in-app alerts

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Charts     | [Chart.js 4.4.1](https://www.chartjs.org/) |
| Fonts      | Google Fonts – Cairo & Tajawal      |
| Direction  | RTL (Right-to-Left) Arabic UI       |
| Backend    | REST API (`/api` endpoints)         |
| Auth       | Bearer token (JWT stored in `localStorage`) |

---

## Project Structure

```
├── index.html          # Main SPA shell with sidebar navigation & login screen
├── api.js              # Root-level API client (legacy reference)
├── app.js              # Root-level app controller (legacy reference)
├── dashboard.js        # Root-level dashboard controller (legacy reference)
├── style.css           # Root-level stylesheet (legacy reference)
├── css/
│   └── style.css       # Main stylesheet
└── js/
    ├── api.js          # API client (all REST calls)
    ├── app.js          # App bootstrap, routing, auth, helpers
    └── pages/
        ├── dashboard.js    # Dashboard widgets & KPIs
        ├── sales.js        # Sales invoices page
        ├── purchases.js    # Purchases page
        ├── payments.js     # Payments & receipts page
        ├── cutting.js      # Cutting operations page
        ├── journal.js      # Accounting journal page
        ├── reports.js      # Financial reports pages
        ├── crud-pages.js   # Generic CRUD pages (customers, suppliers, blocks, slabs, products, etc.)
        ├── employees.js    # Employee management page
        └── logistics.js    # Warehouse & shipments page
```

---

## Getting Started

### Prerequisites
- A web server capable of serving static files and routing `/api/*` requests to your backend.

### Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/Yousefeid1/Yousefeid1.github.io.git
   cd Yousefeid1.github.io
   ```

2. **Serve the frontend**  
   You can use any static file server, for example:
   ```bash
   npx serve .
   ```
   Or with Python:
   ```bash
   python3 -m http.server 8080
   ```

3. **Configure the backend API**  
   The frontend expects a REST API at `/api`. Point your server or proxy to your backend, then open `http://localhost:8080` in your browser.

### Default Login Credentials
| Field    | Value               |
|----------|---------------------|
| Email    | `admin@marble.com`  |
| Password | `admin123`          |

> **Note:** Change these credentials in production.

---

## API Overview

All API calls are made relative to `/api`. The client (`js/api.js`) handles authentication via a Bearer token stored in `localStorage`.

| Module       | Endpoints                                      |
|--------------|------------------------------------------------|
| Auth         | `POST /auth/login`, `GET /auth/me`             |
| Dashboard    | `GET /dashboard`                               |
| Journal      | `GET/POST /journal`, `GET /journal/:id`        |
| Accounts     | `GET/POST /accounts`                           |
| Sales        | `GET/POST /sales`, `POST /sales/:id/cancel`    |
| Purchases    | `GET/POST /purchases`                          |
| Payments     | `GET/POST /payments`                           |
| Expenses     | `GET/POST /expenses`                           |
| Customers    | `GET/POST /customers`, `PUT /customers/:id`    |
| Suppliers    | `GET/POST /suppliers`                          |
| Products     | `GET/POST /products`, `PUT /products/:id`      |
| Blocks       | `GET/POST /blocks`                             |
| Slabs        | `GET /slabs`                                   |
| Cutting      | `GET/POST /cutting`, `GET /cutting/:id`        |
| Projects     | `GET/POST /projects`                           |
| Reports      | `GET /reports/profit-loss`, `/balance-sheet`, `/waste`, `/inventory` |
| Settings     | `GET/PUT /settings`                            |
| Notifications| `GET /notifications`                           |

---

## License

This project is proprietary. All rights reserved.
