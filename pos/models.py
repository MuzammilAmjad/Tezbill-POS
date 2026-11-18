from decimal import Decimal
from django.db import models
from django.utils import timezone


class Subsidiary(models.Model):
    sbs_sid = models.BigAutoField(primary_key=True)
    sbs_no = models.IntegerField(unique=True)
    sbs_name = models.CharField(max_length=150)
    base_currency_code = models.CharField(max_length=10, default="PKR")
    active_price_lvl_sid = models.IntegerField(default=1)
    active = models.BooleanField(default=True)
    created_datetime = models.DateTimeField(default=timezone.now)
    modified_datetime = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subsidiary"
        verbose_name_plural = "Subsidiaries"

    def __str__(self):
        return f"{self.sbs_name} (#{self.sbs_no})"


class Currency(models.Model):
    currency_sid = models.BigAutoField(primary_key=True)
    currency_code = models.CharField(max_length=10, unique=True)
    currency_name = models.CharField(max_length=80)
    alphabetic_code = models.CharField(max_length=10)
    symbol = models.CharField(max_length=15, default="Rs.")

    class Meta:
        db_table = "currency"
        verbose_name_plural = "Currencies"

    def __str__(self):
        return f"{self.currency_code} ({self.symbol})"


class CurrencyDenomination(models.Model):
    denom_sid = models.BigAutoField(primary_key=True)
    currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        db_column="currency_sid",
        related_name="denominations",
    )
    denom_name = models.CharField(max_length=40)
    multiplier = models.DecimalField(max_digits=12, decimal_places=2)
    bill_coin = models.CharField(max_length=10, default="BILL")
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = "currency_denomination"
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.denom_name} ({self.bill_coin})"


class TaxCode(models.Model):
    tax_code_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="tax_codes",
    )
    tax_code = models.CharField(max_length=30)
    tax_name = models.CharField(max_length=100)
    tax_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    is_default = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "tax_code"
        unique_together = [("sbs", "tax_code")]

    def __str__(self):
        return f"{self.tax_code} - {self.tax_name}"


class PriceLevel(models.Model):
    price_lvl_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="price_levels",
    )
    price_lvl = models.IntegerField()
    price_lvl_name = models.CharField(max_length=80)
    disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "price_level"
        unique_together = [("sbs", "price_lvl")]
        ordering = ["price_lvl"]

    def __str__(self):
        return f"Level {self.price_lvl}: {self.price_lvl_name}"


class Store(models.Model):
    store_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="stores",
    )
    store_no = models.IntegerField()
    store_code = models.CharField(max_length=30, unique=True)
    store_name = models.CharField(max_length=150)
    address1 = models.CharField(max_length=200)
    address2 = models.CharField(max_length=200, blank=True, default="")
    city = models.CharField(max_length=80)
    state = models.CharField(max_length=80, default="Punjab")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    phone1 = models.CharField(max_length=40)
    ntn_no = models.CharField(max_length=40, blank=True, default="")
    strn_no = models.CharField(max_length=40, blank=True, default="")
    receipt_header = models.CharField(max_length=255, blank=True, default="")
    receipt_footer = models.CharField(
        max_length=500,
        blank=True,
        default="Thank you for shopping at Tezbill. Unused sealed items may be exchanged within 7 days with original invoice.",
    )
    active = models.BooleanField(default=True)
    created_datetime = models.DateTimeField(default=timezone.now)
    modified_datetime = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "store"
        ordering = ["store_no"]

    def __str__(self):
        return f"[{self.store_code}] {self.store_name}"


class Workstation(models.Model):
    workstation_sid = models.BigAutoField(primary_key=True)
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        db_column="store_sid",
        related_name="workstations",
    )
    workstation_no = models.IntegerField()
    workstation_name = models.CharField(max_length=120)
    fqdn = models.CharField(max_length=150, default="pos-terminal.local")
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "workstation"
        unique_together = [("store", "workstation_no")]
        ordering = ["store_id", "workstation_no"]

    def __str__(self):
        return f"{self.workstation_name} ({self.store.store_code})"


class Employee(models.Model):
    empl_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="employees",
    )
    base_store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        db_column="base_store_sid",
        related_name="employees",
    )
    empl_no = models.CharField(max_length=30, unique=True)
    empl_name = models.CharField(max_length=80)
    full_name = models.CharField(max_length=120)
    user_name = models.CharField(max_length=60, unique=True)
    pin_code = models.CharField(max_length=20)
    job_name = models.CharField(max_length=80, default="Cashier")
    admin = models.BooleanField(default=False)
    max_disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("10.00"))
    user_active = models.BooleanField(default=True)
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "employee"
        ordering = ["empl_sid"]

    def __str__(self):
        return f"{self.full_name} ({self.empl_no})"


class Dcs(models.Model):
    dcs_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="dcs_categories",
    )
    dcs_code = models.CharField(max_length=30)
    d_code = models.CharField(max_length=10)
    c_code = models.CharField(max_length=10)
    s_code = models.CharField(max_length=10)
    d_name = models.CharField(max_length=100)
    c_name = models.CharField(max_length=100)
    s_name = models.CharField(max_length=100)
    tax_code = models.ForeignKey(
        TaxCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="tax_code_sid",
    )
    margin_value = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "dcs"
        unique_together = [("sbs", "dcs_code")]
        verbose_name = "DCS Category"
        verbose_name_plural = "DCS Categories"
        ordering = ["dcs_code"]

    def __str__(self):
        return f"[{self.dcs_code}] {self.d_name} / {self.s_name}"


class Vendor(models.Model):
    vend_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="vendors",
    )
    vend_code = models.CharField(max_length=30)
    vend_name = models.CharField(max_length=150)
    contact_name = models.CharField(max_length=120, blank=True, default="")
    phone1 = models.CharField(max_length=40, blank=True, default="")
    email = models.CharField(max_length=120, blank=True, default="")
    address1 = models.CharField(max_length=200, blank=True, default="")
    city = models.CharField(max_length=80, blank=True, default="")
    ntn_no = models.CharField(max_length=40, blank=True, default="")
    strn_no = models.CharField(max_length=40, blank=True, default="")
    account_no = models.CharField(max_length=60, blank=True, default="")
    trade_disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    payment_terms = models.CharField(max_length=60, default="Net 30")
    active = models.BooleanField(default=True)
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "vendor"
        unique_together = [("sbs", "vend_code")]
        ordering = ["vend_code"]

    def __str__(self):
        return f"[{self.vend_code}] {self.vend_name}"


class InvnSbsItem(models.Model):
    item_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="items",
    )
    alu = models.CharField(max_length=40, db_index=True)
    upc = models.CharField(max_length=40, db_index=True)
    description1 = models.CharField(max_length=200)
    description2 = models.CharField(max_length=200, blank=True, default="")
    attribute = models.CharField(max_length=80, blank=True, default="")
    item_size = models.CharField(max_length=40, blank=True, default="")
    uom = models.CharField(max_length=20, default="EA")
    dcs = models.ForeignKey(
        Dcs,
        on_delete=models.PROTECT,
        db_column="dcs_sid",
        related_name="items",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="vend_sid",
        related_name="items",
    )
    tax_code = models.ForeignKey(
        TaxCode,
        on_delete=models.PROTECT,
        db_column="tax_code_sid",
        related_name="items",
    )
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    spif = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    min_ord_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1.00"))
    active = models.BooleanField(default=True)
    created_datetime = models.DateTimeField(default=timezone.now)
    modified_datetime = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invn_sbs_item"
        unique_together = [("sbs", "alu"), ("sbs", "upc")]
        verbose_name = "Inventory Item"
        verbose_name_plural = "Inventory Items"
        ordering = ["alu"]

    def __str__(self):
        return f"[{self.alu}] {self.description1}"


class InvnSbsPrice(models.Model):
    price_sid = models.BigAutoField(primary_key=True)
    item = models.ForeignKey(
        InvnSbsItem,
        on_delete=models.CASCADE,
        db_column="item_sid",
        related_name="prices",
    )
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
    )
    price_level = models.ForeignKey(
        PriceLevel,
        on_delete=models.CASCADE,
        db_column="price_lvl_sid",
    )
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "invn_sbs_price"
        unique_together = [("item", "price_level")]


class InvnSbsItemQty(models.Model):
    qty_sid = models.BigAutoField(primary_key=True)
    item = models.ForeignKey(
        InvnSbsItem,
        on_delete=models.CASCADE,
        db_column="item_sid",
        related_name="quantities",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        db_column="store_sid",
        related_name="item_quantities",
    )
    qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    min_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("5.00"))
    max_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("250.00"))
    sold_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    rcvd_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    on_ordered_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    modified_datetime = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invn_sbs_item_qty"
        unique_together = [("item", "store")]


class Customer(models.Model):
    cust_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="customers",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        db_column="store_sid",
        related_name="customers",
    )
    cust_id = models.CharField(max_length=30)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    company_name = models.CharField(max_length=150, blank=True, default="")
    phone_no = models.CharField(max_length=40, db_index=True)
    email = models.CharField(max_length=120, blank=True, default="")
    address1 = models.CharField(max_length=200, blank=True, default="")
    city = models.CharField(max_length=80, blank=True, default="")
    ntn_no = models.CharField(max_length=40, blank=True, default="")
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    credit_used = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    store_credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    suggested_disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    max_disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("15.00"))
    total_transactions = models.IntegerField(default=0)
    ytd_sale = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    lty_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    active = models.BooleanField(default=True)
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "customer"
        unique_together = [("sbs", "cust_id")]
        ordering = ["cust_sid"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.cust_id})"


class PrefReason(models.Model):
    reason_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
        related_name="reasons",
    )
    reason_type = models.CharField(max_length=30)
    reason_code = models.CharField(max_length=30)
    reason_name = models.CharField(max_length=120)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "pref_reason"
        unique_together = [("sbs", "reason_type", "reason_code")]
        ordering = ["reason_type", "reason_code"]

    def __str__(self):
        return f"[{self.reason_type}] {self.reason_name}"


class Document(models.Model):
    doc_sid = models.BigAutoField(primary_key=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        db_column="store_sid",
        related_name="documents",
    )
    workstation = models.ForeignKey(
        Workstation,
        on_delete=models.PROTECT,
        db_column="workstation_sid",
    )
    doc_no = models.CharField(max_length=40, unique=True)
    receipt_type = models.SmallIntegerField(default=0)
    status = models.SmallIntegerField(default=3)
    is_held = models.BooleanField(default=False, db_index=True)
    price_level = models.ForeignKey(
        PriceLevel,
        on_delete=models.PROTECT,
        db_column="price_lvl_sid",
        default=1,
    )
    cashier = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        db_column="cashier_sid",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="bt_cuid",
        related_name="documents",
    )
    bt_first_name = models.CharField(max_length=80, default="Walk-in")
    bt_last_name = models.CharField(max_length=80, default="Customer")
    bt_primary_phone_no = models.CharField(max_length=40, blank=True, default="")
    sale_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    disc_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_discount_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    sale_total_tax_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    transaction_total_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    taken_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    given_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    due_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    fbr_invoice_no = models.CharField(max_length=60, blank=True, default="")
    reason_code = models.CharField(max_length=30, blank=True, default="")
    notes_general = models.CharField(max_length=300, blank=True, default="")
    ref_doc = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="ref_doc_sid",
    )
    invc_post_date = models.DateTimeField(default=timezone.now)
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "document"
        ordering = ["-doc_sid"]

    def __str__(self):
        return f"{self.doc_no} ({self.transaction_total_amt})"


class DocumentItem(models.Model):
    doc_item_sid = models.BigAutoField(primary_key=True)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        db_column="doc_sid",
        related_name="items",
    )
    item_pos = models.IntegerField()
    item = models.ForeignKey(
        InvnSbsItem,
        on_delete=models.PROTECT,
        db_column="item_sid",
    )
    item_type = models.SmallIntegerField(default=1)
    scan_upc = models.CharField(max_length=40)
    alu = models.CharField(max_length=40)
    description1 = models.CharField(max_length=200)
    dcs_code = models.CharField(max_length=30)
    uom = models.CharField(max_length=20, default="EA")
    qty = models.DecimalField(max_digits=12, decimal_places=2)
    orig_price = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    disc_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    disc_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_perc = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    tax_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    ext_price = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "document_item"
        ordering = ["item_pos"]


class Tender(models.Model):
    tender_sid = models.BigAutoField(primary_key=True)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        db_column="doc_sid",
        related_name="tenders",
    )
    tender_type = models.CharField(max_length=30)
    tender_name = models.CharField(max_length=80)
    tender_pos = models.IntegerField(default=1)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    taken = models.DecimalField(max_digits=12, decimal_places=2)
    given = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reference_no = models.CharField(max_length=80, blank=True, default="")
    auth_code = models.CharField(max_length=40, blank=True, default="")
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tender"
        ordering = ["tender_pos"]


class PurchaseOrder(models.Model):
    po_sid = models.BigAutoField(primary_key=True)
    po_no = models.CharField(max_length=40, unique=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        db_column="store_sid",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        db_column="vend_sid",
        related_name="purchase_orders",
    )
    status = models.SmallIntegerField(default=1)
    po_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    disc_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    po_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    ord_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    rcvd_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    order_date = models.DateField(default=timezone.now)
    expected_date = models.CharField(max_length=20, blank=True, default="")
    notes = models.CharField(max_length=300, blank=True, default="")
    created_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="created_by",
    )
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "po"
        ordering = ["-po_sid"]

    def __str__(self):
        return self.po_no


class PoItem(models.Model):
    po_item_sid = models.BigAutoField(primary_key=True)
    po = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        db_column="po_sid",
        related_name="items",
    )
    item_pos = models.IntegerField()
    item = models.ForeignKey(
        InvnSbsItem,
        on_delete=models.PROTECT,
        db_column="item_sid",
    )
    ord_qty = models.DecimalField(max_digits=12, decimal_places=2)
    rcvd_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    ext_cost = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "po_item"
        ordering = ["item_pos"]


class Voucher(models.Model):
    vou_sid = models.BigAutoField(primary_key=True)
    vou_no = models.CharField(max_length=40, unique=True)
    vou_type = models.SmallIntegerField(default=0)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        db_column="store_sid",
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.PROTECT,
        db_column="vend_sid",
        related_name="vouchers",
    )
    po = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="po_sid",
    )
    pkg_no = models.CharField(max_length=60, blank=True, default="")
    vendor_invoice_no = models.CharField(max_length=60, blank=True, default="")
    vou_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    disc_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    vou_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    status = models.SmallIntegerField(default=3)
    notes = models.CharField(max_length=300, blank=True, default="")
    created_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="created_by",
    )
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "voucher"
        ordering = ["-vou_sid"]

    def __str__(self):
        return self.vou_no


class VouItem(models.Model):
    vou_item_sid = models.BigAutoField(primary_key=True)
    voucher = models.ForeignKey(
        Voucher,
        on_delete=models.CASCADE,
        db_column="vou_sid",
        related_name="items",
    )
    item_pos = models.IntegerField()
    item = models.ForeignKey(
        InvnSbsItem,
        on_delete=models.PROTECT,
        db_column="item_sid",
    )
    qty = models.DecimalField(max_digits=12, decimal_places=2)
    orig_qty = models.DecimalField(max_digits=12, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    ext_cost = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "vou_item"
        ordering = ["item_pos"]


class Adjustment(models.Model):
    adj_sid = models.BigAutoField(primary_key=True)
    adj_no = models.CharField(max_length=40, unique=True)
    sbs = models.ForeignKey(
        Subsidiary,
        on_delete=models.CASCADE,
        db_column="sbs_sid",
    )
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        db_column="store_sid",
    )
    adj_type = models.SmallIntegerField(default=0)
    adj_reason = models.ForeignKey(
        PrefReason,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="adj_reason_sid",
    )
    status = models.SmallIntegerField(default=3)
    tot_orig_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tot_adj_qty = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    orig_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    adj_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    comments = models.CharField(max_length=300, blank=True, default="")
    created_by = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="created_by",
    )
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "adjustment"
        ordering = ["-adj_sid"]


class AdjItem(models.Model):
    adj_item_sid = models.BigAutoField(primary_key=True)
    adjustment = models.ForeignKey(
        Adjustment,
        on_delete=models.CASCADE,
        db_column="adj_sid",
        related_name="items",
    )
    item_pos = models.IntegerField()
    item = models.ForeignKey(
        InvnSbsItem,
        on_delete=models.PROTECT,
        db_column="item_sid",
    )
    orig_qty = models.DecimalField(max_digits=12, decimal_places=2)
    adj_qty = models.DecimalField(max_digits=12, decimal_places=2)
    diff_qty = models.DecimalField(max_digits=12, decimal_places=2)
    orig_value = models.DecimalField(max_digits=12, decimal_places=2)
    adj_value = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "adj_item"
        ordering = ["item_pos"]


class ZoutControl(models.Model):
    zout_sid = models.BigAutoField(primary_key=True)
    zout_no = models.CharField(max_length=40, unique=True)
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        db_column="store_sid",
    )
    workstation = models.ForeignKey(
        Workstation,
        on_delete=models.PROTECT,
        db_column="workstation_sid",
    )
    cashier = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        db_column="cashier_sid",
    )
    period_begin = models.DateTimeField(default=timezone.now)
    period_end = models.DateTimeField(null=True, blank=True)
    opening_float = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cash_sales = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cash_returns = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    paid_in = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    paid_out = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cash_drops = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    counted_cash = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    over_short_amt = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    card_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    jazzcash_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    easypaisa_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    raast_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    credit_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_net_sales = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_discounts = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    transaction_count = models.IntegerField(default=0)
    denom_breakdown_json = models.TextField(blank=True, default="{}")
    status = models.CharField(max_length=15, default="OPEN")
    notes = models.CharField(max_length=300, blank=True, default="")
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "zout_control"
        ordering = ["-zout_sid"]


class DrawerEvent(models.Model):
    event_sid = models.BigAutoField(primary_key=True)
    store = models.ForeignKey(
        Store,
        on_delete=models.PROTECT,
        db_column="store_sid",
    )
    workstation = models.ForeignKey(
        Workstation,
        on_delete=models.PROTECT,
        db_column="workstation_sid",
    )
    zout = models.ForeignKey(
        ZoutControl,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="zout_sid",
        related_name="events",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        db_column="empl_sid",
    )
    event_type = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    reason_code = models.CharField(max_length=30, blank=True, default="")
    notes = models.CharField(max_length=300, blank=True, default="")
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "drawer_event"
        ordering = ["-event_sid"]


class AuditLog(models.Model):
    log_sid = models.BigAutoField(primary_key=True)
    store = models.ForeignKey(
        Store,
        on_delete=models.CASCADE,
        db_column="store_sid",
        null=True,
        blank=True,
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        db_column="empl_sid",
        null=True,
        blank=True,
    )
    actor_name = models.CharField(max_length=120)
    actor_role = models.CharField(max_length=80)
    action_type = models.CharField(max_length=50)
    entity_ref = models.CharField(max_length=80, blank=True, default="")
    details = models.CharField(max_length=500)
    created_datetime = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "audit_log"
        ordering = ["-log_sid"]

    def __str__(self):
        return f"[{self.action_type}] {self.actor_name}: {self.details}"
