-- Tezbill POS MySQL 8.0+ Database Schema
-- Modeled after Retail Pro Prism 2.0 Database Tables Specification

CREATE DATABASE IF NOT EXISTS tezbill_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tezbill_db;

CREATE TABLE IF NOT EXISTS subsidiary (
    sbs_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_no INT NOT NULL UNIQUE,
    sbs_name VARCHAR(150) NOT NULL,
    base_currency_code VARCHAR(10) NOT NULL DEFAULT 'PKR',
    active_price_lvl_sid INT NOT NULL DEFAULT 1,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS currency (
    currency_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    currency_code VARCHAR(10) NOT NULL UNIQUE,
    currency_name VARCHAR(80) NOT NULL,
    alphabetic_code VARCHAR(10) NOT NULL,
    symbol VARCHAR(15) NOT NULL DEFAULT 'Rs.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS currency_denomination (
    denom_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    currency_sid BIGINT NOT NULL,
    denom_name VARCHAR(40) NOT NULL,
    multiplier DECIMAL(12, 2) NOT NULL,
    bill_coin VARCHAR(10) NOT NULL DEFAULT 'BILL',
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_denom_currency FOREIGN KEY (currency_sid) REFERENCES currency(currency_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tax_code (
    tax_code_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    tax_code VARCHAR(30) NOT NULL,
    tax_name VARCHAR(100) NOT NULL,
    tax_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_sbs_tax_code (sbs_sid, tax_code),
    CONSTRAINT fk_tax_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS price_level (
    price_lvl_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    price_lvl INT NOT NULL,
    price_lvl_name VARCHAR(80) NOT NULL,
    disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_sbs_price_lvl (sbs_sid, price_lvl),
    CONSTRAINT fk_pl_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store (
    store_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    store_no INT NOT NULL,
    store_code VARCHAR(30) NOT NULL UNIQUE,
    store_name VARCHAR(150) NOT NULL,
    address1 VARCHAR(200) NOT NULL,
    address2 VARCHAR(200) DEFAULT '',
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL DEFAULT 'Punjab',
    postal_code VARCHAR(20) DEFAULT '',
    phone1 VARCHAR(40) NOT NULL,
    ntn_no VARCHAR(40) DEFAULT '',
    strn_no VARCHAR(40) DEFAULT '',
    receipt_header VARCHAR(255) DEFAULT '',
    receipt_footer VARCHAR(500) DEFAULT '',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_store_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workstation (
    workstation_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_sid BIGINT NOT NULL,
    workstation_no INT NOT NULL,
    workstation_name VARCHAR(120) NOT NULL,
    fqdn VARCHAR(150) DEFAULT 'pos-terminal.local',
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_store_ws_no (store_sid, workstation_no),
    CONSTRAINT fk_ws_store FOREIGN KEY (store_sid) REFERENCES store(store_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee (
    empl_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    base_store_sid BIGINT NOT NULL,
    empl_no VARCHAR(30) NOT NULL UNIQUE,
    empl_name VARCHAR(80) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    user_name VARCHAR(60) NOT NULL UNIQUE,
    pin_code VARCHAR(20) NOT NULL,
    job_name VARCHAR(80) NOT NULL DEFAULT 'Cashier',
    admin TINYINT(1) NOT NULL DEFAULT 0,
    max_disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 10.00,
    user_active TINYINT(1) NOT NULL DEFAULT 1,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emp_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_emp_store FOREIGN KEY (base_store_sid) REFERENCES store(store_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dcs (
    dcs_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    dcs_code VARCHAR(30) NOT NULL,
    d_code VARCHAR(10) NOT NULL,
    c_code VARCHAR(10) NOT NULL,
    s_code VARCHAR(10) NOT NULL,
    d_name VARCHAR(100) NOT NULL,
    c_name VARCHAR(100) NOT NULL,
    s_name VARCHAR(100) NOT NULL,
    tax_code_sid BIGINT NULL,
    margin_value DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_sbs_dcs_code (sbs_sid, dcs_code),
    CONSTRAINT fk_dcs_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_dcs_tax FOREIGN KEY (tax_code_sid) REFERENCES tax_code(tax_code_sid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vendor (
    vend_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    vend_code VARCHAR(30) NOT NULL,
    vend_name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(120) DEFAULT '',
    phone1 VARCHAR(40) DEFAULT '',
    email VARCHAR(120) DEFAULT '',
    address1 VARCHAR(200) DEFAULT '',
    city VARCHAR(80) DEFAULT '',
    ntn_no VARCHAR(40) DEFAULT '',
    strn_no VARCHAR(40) DEFAULT '',
    account_no VARCHAR(60) DEFAULT '',
    trade_disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    payment_terms VARCHAR(60) DEFAULT 'Net 30',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sbs_vend_code (sbs_sid, vend_code),
    CONSTRAINT fk_vend_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invn_sbs_item (
    item_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    alu VARCHAR(40) NOT NULL,
    upc VARCHAR(40) NOT NULL,
    description1 VARCHAR(200) NOT NULL,
    description2 VARCHAR(200) DEFAULT '',
    attribute VARCHAR(80) DEFAULT '',
    item_size VARCHAR(40) DEFAULT '',
    uom VARCHAR(20) NOT NULL DEFAULT 'EA',
    dcs_sid BIGINT NOT NULL,
    vend_sid BIGINT NULL,
    tax_code_sid BIGINT NOT NULL,
    cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    spif DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_ord_qty DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sbs_alu (sbs_sid, alu),
    UNIQUE KEY uq_sbs_upc (sbs_sid, upc),
    INDEX idx_item_upc (upc),
    INDEX idx_item_alu (alu),
    CONSTRAINT fk_item_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_item_dcs FOREIGN KEY (dcs_sid) REFERENCES dcs(dcs_sid),
    CONSTRAINT fk_item_vend FOREIGN KEY (vend_sid) REFERENCES vendor(vend_sid) ON DELETE SET NULL,
    CONSTRAINT fk_item_tax FOREIGN KEY (tax_code_sid) REFERENCES tax_code(tax_code_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invn_sbs_price (
    price_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_sid BIGINT NOT NULL,
    sbs_sid BIGINT NOT NULL,
    price_lvl_sid BIGINT NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    UNIQUE KEY uq_item_price_lvl (item_sid, price_lvl_sid),
    CONSTRAINT fk_price_item FOREIGN KEY (item_sid) REFERENCES invn_sbs_item(item_sid) ON DELETE CASCADE,
    CONSTRAINT fk_price_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_price_lvl FOREIGN KEY (price_lvl_sid) REFERENCES price_level(price_lvl_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invn_sbs_item_qty (
    qty_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_sid BIGINT NOT NULL,
    store_sid BIGINT NOT NULL,
    qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_qty DECIMAL(12, 2) NOT NULL DEFAULT 5.00,
    max_qty DECIMAL(12, 2) NOT NULL DEFAULT 250.00,
    sold_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    rcvd_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    on_ordered_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    modified_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_store_qty (item_sid, store_sid),
    CONSTRAINT fk_qty_item FOREIGN KEY (item_sid) REFERENCES invn_sbs_item(item_sid) ON DELETE CASCADE,
    CONSTRAINT fk_qty_store FOREIGN KEY (store_sid) REFERENCES store(store_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer (
    cust_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    store_sid BIGINT NOT NULL,
    cust_id VARCHAR(30) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    company_name VARCHAR(150) DEFAULT '',
    phone_no VARCHAR(40) NOT NULL,
    email VARCHAR(120) DEFAULT '',
    address1 VARCHAR(200) DEFAULT '',
    city VARCHAR(80) DEFAULT '',
    ntn_no VARCHAR(40) DEFAULT '',
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    credit_used DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    store_credit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    suggested_disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    max_disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 15.00,
    total_transactions INT NOT NULL DEFAULT 0,
    ytd_sale DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    lty_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sbs_cust_id (sbs_sid, cust_id),
    INDEX idx_cust_phone (phone_no),
    CONSTRAINT fk_cust_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_cust_store FOREIGN KEY (store_sid) REFERENCES store(store_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pref_reason (
    reason_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    reason_type VARCHAR(30) NOT NULL,
    reason_code VARCHAR(30) NOT NULL,
    reason_name VARCHAR(120) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_sbs_reason (sbs_sid, reason_type, reason_code),
    CONSTRAINT fk_reason_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document (
    doc_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    sbs_sid BIGINT NOT NULL,
    store_sid BIGINT NOT NULL,
    workstation_sid BIGINT NOT NULL,
    doc_no VARCHAR(40) NOT NULL UNIQUE,
    receipt_type SMALLINT NOT NULL DEFAULT 0,
    status SMALLINT NOT NULL DEFAULT 3,
    is_held TINYINT(1) NOT NULL DEFAULT 0,
    price_lvl_sid BIGINT NOT NULL DEFAULT 1,
    cashier_sid BIGINT NOT NULL,
    bt_cuid BIGINT NULL,
    bt_first_name VARCHAR(80) DEFAULT 'Walk-in',
    bt_last_name VARCHAR(80) DEFAULT 'Customer',
    bt_primary_phone_no VARCHAR(40) DEFAULT '',
    sale_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    disc_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_discount_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    sale_total_tax_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    transaction_total_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    taken_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    given_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    due_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    fbr_invoice_no VARCHAR(60) DEFAULT '',
    reason_code VARCHAR(30) DEFAULT '',
    notes_general VARCHAR(300) DEFAULT '',
    ref_doc_sid BIGINT NULL,
    invc_post_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doc_store_date (store_sid, invc_post_date),
    INDEX idx_doc_held (is_held),
    CONSTRAINT fk_doc_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_doc_store FOREIGN KEY (store_sid) REFERENCES store(store_sid),
    CONSTRAINT fk_doc_ws FOREIGN KEY (workstation_sid) REFERENCES workstation(workstation_sid),
    CONSTRAINT fk_doc_pl FOREIGN KEY (price_lvl_sid) REFERENCES price_level(price_lvl_sid),
    CONSTRAINT fk_doc_cashier FOREIGN KEY (cashier_sid) REFERENCES employee(empl_sid),
    CONSTRAINT fk_doc_cust FOREIGN KEY (bt_cuid) REFERENCES customer(cust_sid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_item (
    doc_item_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    doc_sid BIGINT NOT NULL,
    item_pos INT NOT NULL,
    item_sid BIGINT NOT NULL,
    item_type SMALLINT NOT NULL DEFAULT 1,
    scan_upc VARCHAR(40) NOT NULL,
    alu VARCHAR(40) NOT NULL,
    description1 VARCHAR(200) NOT NULL,
    dcs_code VARCHAR(30) NOT NULL,
    uom VARCHAR(20) NOT NULL DEFAULT 'EA',
    qty DECIMAL(12, 2) NOT NULL,
    orig_price DECIMAL(12, 2) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    disc_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    disc_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_perc DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    tax_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ext_price DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_docitem_doc FOREIGN KEY (doc_sid) REFERENCES document(doc_sid) ON DELETE CASCADE,
    CONSTRAINT fk_docitem_item FOREIGN KEY (item_sid) REFERENCES invn_sbs_item(item_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tender (
    tender_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    doc_sid BIGINT NOT NULL,
    tender_type VARCHAR(30) NOT NULL,
    tender_name VARCHAR(80) NOT NULL,
    tender_pos INT NOT NULL DEFAULT 1,
    amount DECIMAL(12, 2) NOT NULL,
    taken DECIMAL(12, 2) NOT NULL,
    given DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    reference_no VARCHAR(80) DEFAULT '',
    auth_code VARCHAR(40) DEFAULT '',
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tender_doc FOREIGN KEY (doc_sid) REFERENCES document(doc_sid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS po (
    po_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    po_no VARCHAR(40) NOT NULL UNIQUE,
    sbs_sid BIGINT NOT NULL,
    store_sid BIGINT NOT NULL,
    vend_sid BIGINT NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    po_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    disc_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    po_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ord_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    rcvd_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    order_date DATE NOT NULL,
    expected_date VARCHAR(20) DEFAULT '',
    notes VARCHAR(300) DEFAULT '',
    created_by BIGINT NULL,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_po_store FOREIGN KEY (store_sid) REFERENCES store(store_sid),
    CONSTRAINT fk_po_vend FOREIGN KEY (vend_sid) REFERENCES vendor(vend_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS po_item (
    po_item_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    po_sid BIGINT NOT NULL,
    item_pos INT NOT NULL,
    item_sid BIGINT NOT NULL,
    ord_qty DECIMAL(12, 2) NOT NULL,
    rcvd_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(12, 2) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    ext_cost DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_poitem_po FOREIGN KEY (po_sid) REFERENCES po(po_sid) ON DELETE CASCADE,
    CONSTRAINT fk_poitem_item FOREIGN KEY (item_sid) REFERENCES invn_sbs_item(item_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voucher (
    vou_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    vou_no VARCHAR(40) NOT NULL UNIQUE,
    vou_type SMALLINT NOT NULL DEFAULT 0,
    sbs_sid BIGINT NOT NULL,
    store_sid BIGINT NOT NULL,
    vend_sid BIGINT NOT NULL,
    po_sid BIGINT NULL,
    pkg_no VARCHAR(60) DEFAULT '',
    vendor_invoice_no VARCHAR(60) DEFAULT '',
    vou_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    disc_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    vou_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status SMALLINT NOT NULL DEFAULT 3,
    notes VARCHAR(300) DEFAULT '',
    created_by BIGINT NULL,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vou_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_vou_store FOREIGN KEY (store_sid) REFERENCES store(store_sid),
    CONSTRAINT fk_vou_vend FOREIGN KEY (vend_sid) REFERENCES vendor(vend_sid),
    CONSTRAINT fk_vou_po FOREIGN KEY (po_sid) REFERENCES po(po_sid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vou_item (
    vou_item_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    vou_sid BIGINT NOT NULL,
    item_pos INT NOT NULL,
    item_sid BIGINT NOT NULL,
    qty DECIMAL(12, 2) NOT NULL,
    orig_qty DECIMAL(12, 2) NOT NULL,
    cost DECIMAL(12, 2) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    ext_cost DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_vouitem_vou FOREIGN KEY (vou_sid) REFERENCES voucher(vou_sid) ON DELETE CASCADE,
    CONSTRAINT fk_vouitem_item FOREIGN KEY (item_sid) REFERENCES invn_sbs_item(item_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS adjustment (
    adj_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    adj_no VARCHAR(40) NOT NULL UNIQUE,
    sbs_sid BIGINT NOT NULL,
    store_sid BIGINT NOT NULL,
    adj_type SMALLINT NOT NULL DEFAULT 0,
    adj_reason_sid BIGINT NULL,
    status SMALLINT NOT NULL DEFAULT 3,
    tot_orig_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tot_adj_qty DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    orig_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    adj_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    comments VARCHAR(300) DEFAULT '',
    created_by BIGINT NULL,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_adj_sbs FOREIGN KEY (sbs_sid) REFERENCES subsidiary(sbs_sid) ON DELETE CASCADE,
    CONSTRAINT fk_adj_store FOREIGN KEY (store_sid) REFERENCES store(store_sid),
    CONSTRAINT fk_adj_reason FOREIGN KEY (adj_reason_sid) REFERENCES pref_reason(reason_sid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS adj_item (
    adj_item_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    adj_sid BIGINT NOT NULL,
    item_pos INT NOT NULL,
    item_sid BIGINT NOT NULL,
    orig_qty DECIMAL(12, 2) NOT NULL,
    adj_qty DECIMAL(12, 2) NOT NULL,
    diff_qty DECIMAL(12, 2) NOT NULL,
    orig_value DECIMAL(12, 2) NOT NULL,
    adj_value DECIMAL(12, 2) NOT NULL,
    CONSTRAINT fk_adjitem_adj FOREIGN KEY (adj_sid) REFERENCES adjustment(adj_sid) ON DELETE CASCADE,
    CONSTRAINT fk_adjitem_item FOREIGN KEY (item_sid) REFERENCES invn_sbs_item(item_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS zout_control (
    zout_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    zout_no VARCHAR(40) NOT NULL UNIQUE,
    store_sid BIGINT NOT NULL,
    workstation_sid BIGINT NOT NULL,
    cashier_sid BIGINT NOT NULL,
    period_begin DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    period_end DATETIME NULL,
    opening_float DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cash_sales DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cash_returns DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_in DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    paid_out DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    cash_drops DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    counted_cash DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    over_short_amt DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    card_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    jazzcash_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    easypaisa_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    raast_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    credit_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_net_sales DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_tax DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_discounts DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    transaction_count INT NOT NULL DEFAULT 0,
    denom_breakdown_json TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'OPEN',
    notes VARCHAR(300) DEFAULT '',
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_zout_store FOREIGN KEY (store_sid) REFERENCES store(store_sid),
    CONSTRAINT fk_zout_ws FOREIGN KEY (workstation_sid) REFERENCES workstation(workstation_sid),
    CONSTRAINT fk_zout_cashier FOREIGN KEY (cashier_sid) REFERENCES employee(empl_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drawer_event (
    event_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_sid BIGINT NOT NULL,
    workstation_sid BIGINT NOT NULL,
    zout_sid BIGINT NULL,
    empl_sid BIGINT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    reason_code VARCHAR(30) DEFAULT '',
    notes VARCHAR(300) DEFAULT '',
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_store FOREIGN KEY (store_sid) REFERENCES store(store_sid),
    CONSTRAINT fk_event_ws FOREIGN KEY (workstation_sid) REFERENCES workstation(workstation_sid),
    CONSTRAINT fk_event_zout FOREIGN KEY (zout_sid) REFERENCES zout_control(zout_sid) ON DELETE CASCADE,
    CONSTRAINT fk_event_empl FOREIGN KEY (empl_sid) REFERENCES employee(empl_sid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
    log_sid BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_sid BIGINT NULL,
    empl_sid BIGINT NULL,
    actor_name VARCHAR(120) NOT NULL,
    actor_role VARCHAR(80) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_ref VARCHAR(80) DEFAULT '',
    details VARCHAR(500) NOT NULL,
    created_datetime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_store FOREIGN KEY (store_sid) REFERENCES store(store_sid) ON DELETE CASCADE,
    CONSTRAINT fk_audit_empl FOREIGN KEY (empl_sid) REFERENCES employee(empl_sid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

