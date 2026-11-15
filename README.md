# Tezbill-POS

A lightweight POS core implementation that includes:

- Multi-tenant store separation
- Product catalog with barcodes
- Barcode scanning
- Billing/invoice creation with tax calculation
- Basic sales reports

## Quick start

```python
from pos_system import POSSystem

pos = POSSystem(tax_rate="0.10")
pos.register_tenant("store-1")
pos.add_product("store-1", "SKU-1", "Coffee", "890100000001", "5.00")
invoice = pos.create_invoice("store-1", [("890100000001", 2)])
report = pos.sales_report("store-1")
```

## Run tests

```bash
python -m unittest -v
```
