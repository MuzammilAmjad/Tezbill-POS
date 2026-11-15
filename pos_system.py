from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

TWOPLACES = Decimal("0.01")


def to_money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    barcode: str
    price: Decimal


@dataclass(frozen=True)
class LineItem:
    product: Product
    quantity: int
    subtotal: Decimal


@dataclass(frozen=True)
class Invoice:
    invoice_id: str
    tenant_id: str
    items: list[LineItem]
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    created_at: datetime


class POSSystem:
    """Minimal in-memory POS supporting multi-tenant products, billing and reports."""

    def __init__(self, tax_rate: Decimal | int | float | str = "0.00") -> None:
        self.tax_rate = Decimal(str(tax_rate))
        self._tenants: dict[str, dict[str, object]] = {}

    def register_tenant(self, tenant_id: str) -> None:
        if tenant_id not in self._tenants:
            self._tenants[tenant_id] = {
                "products_by_barcode": {},
                "invoices": [],
                "next_invoice_number": 1,
            }

    def add_product(self, tenant_id: str, sku: str, name: str, barcode: str, price: Decimal | int | float | str) -> Product:
        tenant = self._require_tenant(tenant_id)
        product = Product(sku=sku, name=name, barcode=barcode, price=to_money(price))
        products = tenant["products_by_barcode"]
        products[barcode] = product
        return product

    def scan_barcode(self, tenant_id: str, barcode: str) -> Product:
        tenant = self._require_tenant(tenant_id)
        product = tenant["products_by_barcode"].get(barcode)
        if product is None:
            raise KeyError(f"Unknown barcode '{barcode}' for tenant '{tenant_id}'")
        return product

    def create_invoice(self, tenant_id: str, barcode_quantities: list[tuple[str, int]]) -> Invoice:
        tenant = self._require_tenant(tenant_id)
        items: list[LineItem] = []
        subtotal = Decimal("0.00")

        for barcode, quantity in barcode_quantities:
            if quantity <= 0:
                raise ValueError("Quantity must be a positive integer")
            product = self.scan_barcode(tenant_id, barcode)
            line_subtotal = to_money(product.price * quantity)
            subtotal += line_subtotal
            items.append(LineItem(product=product, quantity=quantity, subtotal=line_subtotal))

        subtotal = to_money(subtotal)
        tax = to_money(subtotal * self.tax_rate)
        total = to_money(subtotal + tax)

        invoice_id = f"{tenant_id}-{tenant['next_invoice_number']:06d}"
        tenant["next_invoice_number"] = tenant["next_invoice_number"] + 1

        invoice = Invoice(
            invoice_id=invoice_id,
            tenant_id=tenant_id,
            items=items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            created_at=datetime.now(timezone.utc),
        )
        tenant["invoices"].append(invoice)
        return invoice

    def sales_report(self, tenant_id: str) -> dict[str, object]:
        tenant = self._require_tenant(tenant_id)
        invoices: list[Invoice] = tenant["invoices"]

        revenue = Decimal("0.00")
        item_count = 0
        by_sku: dict[str, int] = {}

        for invoice in invoices:
            revenue += invoice.total
            for line in invoice.items:
                item_count += line.quantity
                by_sku[line.product.sku] = by_sku.get(line.product.sku, 0) + line.quantity

        top_selling_sku = None
        if by_sku:
            top_selling_sku = max(by_sku, key=by_sku.get)

        return {
            "tenant_id": tenant_id,
            "invoice_count": len(invoices),
            "items_sold": item_count,
            "revenue": to_money(revenue),
            "top_selling_sku": top_selling_sku,
        }

    def _require_tenant(self, tenant_id: str) -> dict[str, object]:
        tenant = self._tenants.get(tenant_id)
        if tenant is None:
            raise KeyError(f"Tenant '{tenant_id}' is not registered")
        return tenant
