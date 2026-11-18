import json
from django.test import Client, TestCase
from pos.services import ensure_seeded


class TezbillPosApiTests(TestCase):
    def setUp(self):
        ensure_seeded(force_reset=True)
        self.client = Client()

    def test_bootstrap_returns_store_and_categories(self):
        res = self.client.get("/api/settings/bootstrap?store_sid=1")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["subsidiary"]["base_currency_code"], "PKR")
        self.assertEqual(len(body["stores"]), 1)
        self.assertEqual(len(body["dcsCategories"]), 3)

    def test_catalog_contains_five_basic_products(self):
        res = self.client.get("/api/catalog/items?store_sid=1")
        self.assertEqual(res.status_code, 200)
        items = res.json()["items"]
        self.assertEqual(len(items), 5)

        lookup = self.client.get("/api/catalog/lookup?code=1001&store_sid=1")
        self.assertEqual(lookup.status_code, 200)
        self.assertEqual(lookup.json()["item"]["description1"], "Fresh Milk Pack 1L")

    def test_create_pos_sale_deducts_stock(self):
        before = self.client.get("/api/catalog/lookup?code=1001&store_sid=1").json()["item"]
        initial_qty = before["qty_on_hand"]
        item_sid = before["item_sid"]

        sale_res = self.client.post(
            "/api/documents",
            data=json.dumps(
                {
                    "store_sid": 1,
                    "workstation_sid": 1,
                    "cashier_sid": 1,
                    "price_lvl_sid": 1,
                    "receipt_type": 0,
                    "is_held": 0,
                    "bt_cuid": 1,
                    "items": [{"item_sid": item_sid, "qty": 2, "orig_price": 300}],
                    "tenders": [{"tender_type": "CASH", "tender_name": "Cash", "amount": 600, "taken": 1000}],
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(sale_res.status_code, 201)
        doc = sale_res.json()["document"]
        self.assertEqual(doc["transaction_total_amt"], 600.0)
        self.assertEqual(doc["given_amt"], 400.0)

        after = self.client.get("/api/catalog/lookup?code=1001&store_sid=1").json()["item"]
        self.assertEqual(after["qty_on_hand"], initial_qty - 2)
