# Tezbill POS

Tezbill is a Point of Sale (POS) and retail store management system built with **Django**, **MySQL**, and **React** for Pakistani retail shops, supermarkets, and multi-branch merchants. Its relational database schema is modeled after the Retail Pro Prism 2.0 specification (`subsidiary`, `store`, `workstation`, `dcs`, `vendor`, `invn_sbs_item`, `invn_sbs_price`, `invn_sbs_item_qty`, `customer`, `document`, `document_item`, `tender`, `po`, `po_item`, `voucher`, `vou_item`, `adjustment`, `adj_item`, `drawer_event`, and `zout_control`).

## Core Capabilities

- **POS Register Terminal**: Barcode (`UPC`) and alternate lookup (`ALU`) scanning, DCS category filtering, multi-tier price levels (`Retail`, `Wholesale`, `Corporate / Staff`), line-item and invoice-level discounts, and held/parked receipts (`is_held`).
- **Pakistani Retail & Fiscal Support**: Native `PKR` (`Rs.`) currency handling with standard Pakistani note and coin denominations (`Rs. 5000` down to `Rs. 1`), configurable GST tax codes (`18% Standard GST`, `5% Reduced GST`, `Zero Rated`, `Tax Exempt`), store `NTN`/`STRN` registration numbers, FBR invoice numbering, and 80mm thermal receipt print formatting.
- **Local Payment Tenders**: Support for `Cash (PKR)`, `Debit / Credit Card`, `JazzCash Wallet`, `Easypaisa Wallet`, `Raast / Bank Transfer`, and `Customer Credit Account` with credit limit validation.
- **Inventory & Merchandising**: Multi-store stock tracking (`invn_sbs_item_qty`), low-stock reorder alerts, DCS (`Department / Class / Subclass`) hierarchy management, and audited stock quantity adjustments (`adjustment` and `adj_item`).
- **Procurement & Receiving**: Vendor management (`vendor`), purchase order creation (`po` and `po_item`), and receiving vouchers (`voucher` and `vou_item`) that automatically increment on-hand stock and update item cost.
- **Customers & Credit Ledger**: Customer directory (`customer`), credit limit enforcement, outstanding balance settlement, loyalty point accrual, and customer invoice history.
- **Cash Drawer & Z-Out Shift Control**: Shift opening floats, non-sale cash movements (`PAID_IN`, `PAID_OUT`, `CASH_DROP`), and end-of-shift `Z-Out` reconciliation with a denomination counter and over/short variance calculation.

## Technology Stack

- **Backend**: Python 3, Django (`tezbill` project & `pos` app), Django REST Framework, `django-cors-headers`
- **Database**: MySQL 8.0+ (`django.db.backends.mysql` via `PyMySQL` / `mysqlclient`)
  - SQL DDL Schema: [`database/mysql_schema.sql`](database/mysql_schema.sql)
  - Django ORM Models: [`pos/models.py`](pos/models.py)
  - Schema Documentation: [`docs/schema-reference.md`](docs/schema-reference.md)
- **Frontend**: React 19, Vite 6, Tailwind CSS 4, Lucide Icons

## Getting Started

### 1. MySQL Database Setup

Create the MySQL database (or run the full DDL script directly):

```sql
CREATE DATABASE IF NOT EXISTS tezbill_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Or import the standalone MySQL schema directly:

```bash
mysql -u root -p < database/mysql_schema.sql
```

Copy `.env.example` to `.env` and configure your MySQL connection credentials:

```env
DB_ENGINE=django.db.backends.mysql
DB_NAME=tezbill_db
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
```

### 2. Install Dependencies

Install the Python and frontend packages:

```bash
pip install -r requirements.txt
npm install
```

### 3. Run Migrations & Seed Retail Data

```bash
python manage.py migrate
python manage.py seed_tezbill
```

### 4. Start the Application

Run both the Django API server (`http://127.0.0.1:8000`) and Vite frontend (`http://localhost:5173`):

```bash
npm run dev
```

Or run them separately:

```bash
python manage.py runserver 8000
npm run dev:web
```

### 5. Run Tests

```bash
python manage.py test
```

## Default Operator Accounts

| Employee Name | Username | PIN Code | Role | Max Discount |
| :--- | :--- | :--- | :--- | :--- |
| Hamza Tariq | `htariq` | `1111` | Store Manager | `25%` |
| Bilal Ahmed | `bahmed` | `2222` | Senior Cashier | `10%` |
| Zainab Raza | `zraza` | `3333` | Inventory Supervisor | `15%` |
