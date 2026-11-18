# Tezbill Database Schema Reference

Tezbill implements a relational retail database modeled after the Retail Pro Prism 2.0 schema specification, adapted for Pakistani retail operations.

## Core Table Mapping

| Domain Area | Table Name | Primary Key | Key Columns & Relationships |
| :--- | :--- | :--- | :--- |
| **Organization** | `subsidiary` | `sbs_sid` | `sbs_no`, `sbs_name`, `base_currency_code` (`PKR`), `active_price_lvl_sid` |
| **Locations** | `store` | `store_sid` | `sbs_sid`, `store_no`, `store_code`, `store_name`, `city`, `ntn_no`, `strn_no` |
| **Registers** | `workstation` | `workstation_sid` | `store_sid`, `workstation_no`, `workstation_name`, `fqdn` |
| **Currency** | `currency` | `currency_sid` | `currency_code` (`PKR`), `symbol` (`Rs.`) |
| **Denominations** | `currency_denomination` | `denom_sid` | `currency_sid`, `denom_name`, `multiplier` (`5000`..`1`), `bill_coin` |
| **Taxation** | `tax_code` | `tax_code_sid` | `sbs_sid`, `tax_code` (`STD-GST`, `RED-GST`, `ZERO`, `EXEMPT`), `tax_perc` |
| **Pricing Tiers** | `price_level` | `price_lvl_sid` | `sbs_sid`, `price_lvl`, `price_lvl_name` (`Retail`, `Wholesale`, `Corporate`), `disc_perc` |
| **Staff & Roles** | `employee` | `empl_sid` | `sbs_sid`, `base_store_sid`, `empl_no`, `user_name`, `pin_code`, `job_name`, `max_disc_perc` |
| **Classification** | `dcs` | `dcs_sid` | `dcs_code`, `d_code`, `c_code`, `s_code`, `d_name`, `c_name`, `s_name`, `tax_code_sid` |
| **Suppliers** | `vendor` | `vend_sid` | `vend_code`, `vend_name`, `contact_name`, `phone1`, `ntn_no`, `strn_no`, `payment_terms` |
| **Catalog Master** | `invn_sbs_item` | `item_sid` | `alu`, `upc`, `description1`, `item_size`, `uom`, `dcs_sid`, `vend_sid`, `tax_code_sid`, `cost` |
| **Item Prices** | `invn_sbs_price` | `price_sid` | `item_sid`, `price_lvl_sid`, `price` |
| **Store Stock** | `invn_sbs_item_qty` | `qty_sid` | `item_sid`, `store_sid`, `qty`, `min_qty`, `max_qty`, `sold_qty`, `rcvd_qty`, `on_ordered_qty` |
| **Customers** | `customer` | `cust_sid` | `cust_id`, `first_name`, `last_name`, `phone_no`, `credit_limit`, `credit_used`, `lty_balance` |
| **POS Header** | `document` | `doc_sid` | `doc_no`, `receipt_type` (`0`=Sale, `1`=Return, `2`=Payment), `status`, `is_held`, `bt_cuid`, `fbr_invoice_no` |
| **POS Line Items** | `document_item` | `doc_item_sid` | `doc_sid`, `item_pos`, `item_sid`, `scan_upc`, `alu`, `qty`, `orig_price`, `price`, `tax_amt`, `ext_price` |
| **POS Tenders** | `tender` | `tender_sid` | `doc_sid`, `tender_type` (`CASH`, `CARD`, `JAZZCASH`, `EASYPAISA`, `RAAST`, `CUSTOMER_CREDIT`), `amount` |
| **Purchase Orders** | `po` / `po_item` | `po_sid` | `po_no`, `store_sid`, `vend_sid`, `status`, `po_subtotal`, `po_total`, `ord_qty`, `rcvd_qty` |
| **Receiving** | `voucher` / `vou_item` | `vou_sid` | `vou_no`, `vou_type`, `store_sid`, `vend_sid`, `po_sid`, `vendor_invoice_no`, `vou_total` |
| **Stock Audits** | `adjustment` / `adj_item` | `adj_sid` | `adj_no`, `store_sid`, `adj_reason_sid`, `tot_orig_qty`, `tot_adj_qty`, `orig_value`, `adj_value` |
| **Shift Control** | `zout_control` | `zout_sid` | `zout_no`, `store_sid`, `workstation_sid`, `opening_float`, `expected_cash`, `counted_cash`, `over_short_amt` |
| **Cash Events** | `drawer_event` | `event_sid` | `zout_sid`, `event_type` (`OPEN`, `PAID_IN`, `PAID_OUT`, `CASH_DROP`, `CLOSE`), `amount`, `reason_code` |
| **Reason Codes** | `pref_reason` | `reason_sid` | `reason_type` (`ADJUSTMENT`, `DISCOUNT`, `RETURN`, `DRAWER`), `reason_code`, `reason_name` |
