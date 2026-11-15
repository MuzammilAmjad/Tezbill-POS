from decimal import Decimal
import unittest

from pos_system import POSSystem


class POSSystemTests(unittest.TestCase):
    def test_multi_tenant_isolation(self):
        pos = POSSystem()
        pos.register_tenant("alpha")
        pos.register_tenant("beta")
        pos.add_product("alpha", "SKU-1", "Milk", "111", "3.50")

        with self.assertRaises(KeyError):
            pos.scan_barcode("beta", "111")

    def test_barcode_scanning_and_billing(self):
        pos = POSSystem(tax_rate="0.10")
        pos.register_tenant("store")
        pos.add_product("store", "SKU-1", "Milk", "111", "3.50")
        pos.add_product("store", "SKU-2", "Bread", "222", "2.00")

        invoice = pos.create_invoice("store", [("111", 2), ("222", 1)])

        self.assertEqual(invoice.subtotal, Decimal("9.00"))
        self.assertEqual(invoice.tax, Decimal("0.90"))
        self.assertEqual(invoice.total, Decimal("9.90"))
        self.assertEqual(invoice.invoice_id, "store-000001")

    def test_sales_report(self):
        pos = POSSystem(tax_rate="0.05")
        pos.register_tenant("store")
        pos.add_product("store", "SKU-1", "Milk", "111", "3.00")
        pos.add_product("store", "SKU-2", "Bread", "222", "2.00")

        pos.create_invoice("store", [("111", 2), ("222", 1)])
        pos.create_invoice("store", [("111", 1)])

        report = pos.sales_report("store")

        self.assertEqual(report["invoice_count"], 2)
        self.assertEqual(report["items_sold"], 4)
        self.assertEqual(report["revenue"], Decimal("11.55"))
        self.assertEqual(report["top_selling_sku"], "SKU-1")


if __name__ == "__main__":
    unittest.main()
