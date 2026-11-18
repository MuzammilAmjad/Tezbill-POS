# Tezbill POS

Tezbill is a Point of Sale (POS) and retail management system built with **Django**, **MySQL**, and **React** for retail shops in Pakistan. Its database architecture is derived from the Retail Pro Prism 2.0 enterprise retail specification, structured around stores, workstations, inventory items, price levels, stock quantities, vendors, customers, documents, tenders, shift drawer controls, and tamper-evident audit logs.

---

## System Overview & Role Separation

Tezbill enforces strict separation of duties between counter cashiers and store administrators.

| Role | Username | Default PIN | Available Modules | Restricted Modules |
| :--- | :--- | :--- | :--- | :--- |
| **Main Admin** (Hamza Tariq) | `admin` | `1111` | Dashboard, Sales, Purchases, Products, Stock, Suppliers, Customers, Profit / Loss, Reports, Audit Log, Settings | POS / New Sale counter billing |
| **Shop Cashier** (Bilal Ahmed) | `cashier` | `2222` | POS / New Sale, Sales, Products, Stock, Customers | Purchases, Profit / Loss, Reports, Audit Log, Store Settings |

---

## How Tezbill POS Works

### 1. Counter Billing & Checkout Workflow (Cashier)
1. **Product Lookup & Barcode Scanning**:
   - Cashiers can press `F2` from anywhere on the billing screen to immediately focus the search bar.
   - Products can be looked up by SKU code (ALU), barcode (UPC), or item name.
   - Category filter pills (`All Products`, `Dairy & Bakery`, `Beverages`, `Grocery`) allow quick visual selection.
2. **Dynamic Cart & Price Editing**:
   - Adding a product puts it into the active cart with current stock validation.
   - Cashiers can adjust quantity or override the unit selling price on the spot for special promotions or open-market price fluctuations.
3. **Hold Sale & Resume Held Bills**:
   - If a customer needs to fetch an extra item while in line, the cashier clicks **Hold Sale**. The bill is securely saved as a held transaction (`is_held = 1`), and the register is immediately cleared for the next customer.
   - When the customer returns, the cashier clicks **Resume Held**, selects the customer's parked bill, and resumes checkout without re-scanning items.
4. **Discount & Payment Processing**:
   - A bill-level discount can be applied in rupees (`Rs.`).
   - Payment methods supported: **Cash**, **Card**, **JazzCash**, and **Easypaisa**.
   - For cash transactions, entering the cash received automatically calculates the exact change due to return.
5. **Printable Invoice Receipt**:
   - Completing the sale generates a sequential invoice number (`INV-01-XXXXX`), automatically deducts sold quantities from store inventory, updates workstation cash drawer figures, and opens a clean, print-ready receipt modal formatted for thermal or laser printers.

---

### 2. Store Overview & Executive Dashboard (Admin)
The administrative dashboard provides immediate operational visibility into store performance:
- **Core KPI Strip**: Real-time sales total, bill count, active product count, and drawer cash balance.
- **Weekly Sales Overview**: Visual bar chart plotting daily sales performance over the past 7 days.
- **Profit & Loss Summary**: Instant gross sales, Cost of Goods Sold (COGS), gross profit, and overall profit margin percentage.
- **Low Stock Alerts**: Real-time alert list highlighting items that have reached or fallen below minimum threshold levels.
- **Recent Transactions & Purchases**: Live feed of the latest sales invoices and vendor deliveries.

---

### 3. Vendor Purchasing & Stock Receiving (Admin)
Stock replenishment is managed through formal purchasing vouchers (`VOUCHER` and `VOU_ITEM`):
1. Navigate to **Purchases** and click **New Purchase**.
2. Select an active supplier from the directory.
3. Add item lines with received quantities and wholesale unit purchase costs.
4. Save the purchase voucher (`PUR-01-XXXXX`).
5. The system instantly updates physical inventory (`invn_sbs_item_qty`), adjusts the item's purchase cost basis, updates supplier purchase totals, and creates an audit record.

---

### 4. Product Catalog & Bulk Daily Price Updates (Admin)
Retail markets require frequent price adjustments. Tezbill provides:
- **Product Management**: Create new inventory items, edit SKU codes, UPC barcodes, descriptions, units of measure, and reorder levels.
- **Status Toggle**: One-click activation or deactivation of products to control register availability without losing sales history.
- **Update Daily Prices**: A dedicated bulk pricing modal allowing the administrator to review and update wholesale cost prices and retail selling prices across the entire catalog in a single save.

---

### 5. Stock Control & Movement History (Admin & Cashier)
- **Real-Time Stock Monitoring**: View current physical stock against minimum reorder quantities with visual status tags (`In Stock`, `Low Stock`, `Out of Stock`).
- **Stock Adjustments**: Record manual stock count adjustments with mandatory audit reason notes (e.g., physical count correction, damage, or expiration).
- **Stock Movement History Ledger**: Click **History** on any product to inspect a complete chronological audit trail showing every stock increment (`Purchase +In`), decrement (`Sale -Out`), and adjustment (`Adjustment +/-`) along with the resulting running stock balance.

---

### 6. Supplier & Customer Management
- **Suppliers Directory**: Maintain vendor codes, business names, contact persons, phone numbers, and addresses. Inspect historical purchase vouchers issued to each vendor.
- **Customers Directory**: Manage walk-in and registered customer profiles with contact details, loyalty tracking, and full purchase invoice history.

---

### 7. Profit & Loss Analysis (Admin)
Dedicated analytical views provide clear margin transparency:
- **Product-wise Analysis**: Revenue, unit cost, gross profit, and margin percentage per product.
- **Sale-wise Analysis**: Profit calculated per individual completed invoice.
- **Sale Items Breakdown**: Granular line-item margin inspector showing exact profit earned per sold unit.
- **Date Filters**: Filter profit analytics by Today, Yesterday, Last 7 Days, This Month, or All Time.

---

### 8. Printable Daily, Weekly & Monthly Reports (Admin)
The **Reports** module provides comprehensive, printable audit documentation:
- **Itemized Detailed Sales Report**: Includes Invoice Number, Date & Time, Customer Name & Phone, Cashier Name, Itemized Products Sold (with quantities and rates), Payment Method, Bill Discount, Total Sale Amount, and Gross Profit.
- **Purchases Report**: Detailed vendor receiving history with voucher numbers, line items, and total spend.
- **Stock Inventory Report**: Complete physical stock valuation report including SKU, category, stock on hand, cost value, retail value, and projected gross profit.
- **Period Presets**: Quick selection for **Daily Report (Today)**, **Yesterday**, **Weekly Report (7 Days)**, **Monthly Report (This Month)**, **All Time**, or custom date ranges.
- **Output Options**: Clean A4 printable layout optimized for physical print/PDF export and one-click **Export CSV**.

---

### 9. Tamper-Evident Audit Log & System Configuration (Admin)
- **Audit Log**: Every critical event is permanently logged with timestamp, operator ID, action type (`USER_LOGIN`, `USER_LOGOUT`, `SALE_COMPLETED`, `SALE_HELD`, `PURCHASE_RECORDED`, `PRODUCT_CREATED`, `PRICE_UPDATED`, `STOCK_ADJUSTED`, `SETTINGS_UPDATED`), and detailed metadata.
- **Store Settings**: Configure shop trade name, physical address, contact telephone, tax registration number, and receipt header/footer policy.
- **Operator Security**: Administrators and cashiers can update their access PIN codes directly within the secure settings panel.

---

## Automated End-to-End Testing

Tezbill includes an automated Playwright test suite (`e2e/pos.spec.js`) that verifies all 15 operational workflows sequentially:

```
01 Cashier signs in and sees only cashier screens
02 Cashier filters categories and builds a bill
03 Cashier holds the bill and resumes it
04 Cashier applies a discount and completes the sale
05 Cashier logs out and Main Admin signs in
06 Admin dashboard shows sales chart and profit summary
07 Admin inspects a sale and its item profit
08 Admin records a supplier purchase
09 Admin updates daily product prices
10 Admin reviews stock movement history
11 Admin opens supplier history and customer directory
12 Admin switches profit and loss views
13 Admin opens daily, weekly and monthly printable reports
14 Admin checks the audit log
15 Admin saves store settings
```

### Running the Tests
To run the automated test suite with a visible browser window:

1. Ensure the development servers are running (`npm run dev`).
2. **Option A**: Double-click `run-e2e-tests.bat` in the project root.
3. **Option B**: Run from your terminal:
   ```powershell
   npx playwright test
   ```
4. To step through tests interactively with the Playwright inspector:
   ```powershell
   npx playwright test --debug
   ```

---

## Technology Stack

- **Backend**: Python 3.10+, Django 5 (`tezbill` project & `pos` application), Django REST Framework, `django-cors-headers`
- **Database**: MySQL 8.0+
  - Standalone SQL DDL: [`database/mysql_schema.sql`](database/mysql_schema.sql)
  - Django ORM Models: [`pos/models.py`](pos/models.py)
  - Schema Documentation: [`docs/schema-reference.md`](docs/schema-reference.md)
- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Lucide Icons
- **End-to-End Testing**: Playwright Test Suite (`e2e/pos.spec.js`)

---

## Installation & Setup

### 1. Database Configuration
Create the MySQL database:

```sql
CREATE DATABASE IF NOT EXISTS tezbill_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Optionally import the schema definition:
```bash
mysql -u root -p < database/mysql_schema.sql
```

Configure your `.env` file in the project root:
```env
DB_ENGINE=django.db.backends.mysql
DB_NAME=tezbill_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
npm install
```

### 3. Run Migrations & Seed Default Data
```bash
python manage.py migrate
python manage.py seed_tezbill
```

### 4. Start Development Servers
```bash
npm run dev
```

- **POS Frontend**: `http://localhost:5173`
- **Django REST API**: `http://127.0.0.1:8000/api/health`
- **Django Admin**: `http://127.0.0.1:8000/admin`
