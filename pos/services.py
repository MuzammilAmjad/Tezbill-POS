from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone
from .models import (
    AdjItem,
    Adjustment,
    AuditLog,
    Currency,
    CurrencyDenomination,
    Customer,
    Dcs,
    Document,
    DocumentItem,
    DrawerEvent,
    Employee,
    InvnSbsItem,
    InvnSbsItemQty,
    InvnSbsPrice,
    PoItem,
    PrefReason,
    PriceLevel,
    PurchaseOrder,
    Store,
    Subsidiary,
    TaxCode,
    Tender,
    Vendor,
    Voucher,
    VouItem,
    Workstation,
    ZoutControl,
)

TWO_PLACES = Decimal("0.01")


def round_money(value) -> Decimal:
    if value is None or value == "":
        return Decimal("0.00")
    return Decimal(str(value)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def to_float(value) -> float:
    return float(round_money(value))


def generate_doc_no(prefix: str, store_no: int, sequence: int) -> str:
    return f"{prefix}-{int(store_no):02d}-{int(sequence):05d}"


def generate_fbr_ref(store_no: int, sequence: int) -> str:
    today_str = timezone.now().strftime("%Y%m%d")
    return f"FBR-{int(store_no):02d}-{today_str}-{int(sequence):04d}"


def record_audit(employee: Employee, action_type: str, entity_ref: str, details: str, store: Store = None):
    if not store:
        store = Store.objects.first()
    actor_name = employee.full_name if employee else "System"
    actor_role = employee.job_name if employee else "System"
    return AuditLog.objects.create(
        store=store,
        employee=employee,
        actor_name=actor_name,
        actor_role=actor_role,
        action_type=action_type,
        entity_ref=entity_ref,
        details=details,
    )


def ensure_seeded(force_reset: bool = False):
    if not force_reset and Subsidiary.objects.exists():
        return False

    with transaction.atomic():
        if force_reset:
            AuditLog.objects.all().delete()
            DrawerEvent.objects.all().delete()
            ZoutControl.objects.all().delete()
            AdjItem.objects.all().delete()
            Adjustment.objects.all().delete()
            Tender.objects.all().delete()
            DocumentItem.objects.all().delete()
            Document.objects.all().delete()
            VouItem.objects.all().delete()
            Voucher.objects.all().delete()
            PoItem.objects.all().delete()
            PurchaseOrder.objects.all().delete()
            InvnSbsItemQty.objects.all().delete()
            InvnSbsPrice.objects.all().delete()
            InvnSbsItem.objects.all().delete()
            Customer.objects.all().delete()
            Vendor.objects.all().delete()
            Dcs.objects.all().delete()
            Employee.objects.all().delete()
            Workstation.objects.all().delete()
            Store.objects.all().delete()
            PriceLevel.objects.all().delete()
            TaxCode.objects.all().delete()
            PrefReason.objects.all().delete()
            CurrencyDenomination.objects.all().delete()
            Currency.objects.all().delete()
            Subsidiary.objects.all().delete()

        sbs = Subsidiary.objects.create(
            sbs_sid=1,
            sbs_no=1,
            sbs_name="Tezbill Retail",
            base_currency_code="PKR",
            active_price_lvl_sid=1,
            active=True,
        )

        curr = Currency.objects.create(
            currency_sid=1,
            currency_code="PKR",
            currency_name="Pakistani Rupee",
            alphabetic_code="PKR",
            symbol="Rs.",
        )

        for idx, mult in enumerate([5000, 1000, 500, 100, 50, 20, 10], start=1):
            CurrencyDenomination.objects.create(
                currency=curr,
                denom_name=f"Rs. {mult}",
                multiplier=Decimal(str(mult)),
                bill_coin="BILL",
                sort_order=idx,
            )

        tax_zero = TaxCode.objects.create(
            tax_code_sid=1,
            sbs=sbs,
            tax_code="NO-TAX",
            tax_name="No Tax (0%)",
            tax_perc=Decimal("0.00"),
            is_default=True,
            active=True,
        )

        pl_retail = PriceLevel.objects.create(
            price_lvl_sid=1,
            sbs=sbs,
            price_lvl=1,
            price_lvl_name="Retail",
            disc_perc=Decimal("0.00"),
            active=True,
        )

        store = Store.objects.create(
            store_sid=1,
            sbs=sbs,
            store_no=1,
            store_code="MAIN-01",
            store_name="Tezbill General Store",
            address1="Main Market, Gulberg",
            city="Lahore",
            state="Punjab",
            postal_code="54000",
            phone1="042-35714820",
            receipt_header="Tezbill General Store",
            receipt_footer="Thank you for shopping with us. Items can be exchanged within 7 days with original receipt.",
            active=True,
        )

        ws = Workstation.objects.create(
            workstation_sid=1,
            store=store,
            workstation_no=1,
            workstation_name="Counter 1",
            fqdn="counter1.tezbill.local",
            active=True,
        )

        emp_admin = Employee.objects.create(
            empl_sid=1,
            sbs=sbs,
            base_store=store,
            empl_no="EMP-01",
            empl_name="H. Tariq",
            full_name="Hamza Tariq",
            user_name="admin",
            pin_code="1111",
            job_name="Main Admin",
            admin=True,
            max_disc_perc=Decimal("25.00"),
            user_active=True,
        )

        emp_cashier = Employee.objects.create(
            empl_sid=2,
            sbs=sbs,
            base_store=store,
            empl_no="EMP-02",
            empl_name="B. Ahmed",
            full_name="Bilal Ahmed",
            user_name="cashier",
            pin_code="2222",
            job_name="Cashier",
            admin=False,
            max_disc_perc=Decimal("10.00"),
            user_active=True,
        )

        categories = [
            ("GROCERY", "GRO", "GEN", "ITM", "Grocery", "General", "Grocery"),
            ("DAIRY", "DRY", "GEN", "ITM", "Dairy & Bakery", "Fresh", "Dairy & Bakery"),
            ("DRINKS", "BEV", "GEN", "ITM", "Beverages", "Drinks", "Beverages"),
        ]
        dcs_map = {}
        for code, d, c, s, dname, cname, sname in categories:
            dcs_map[code] = Dcs.objects.create(
                sbs=sbs,
                dcs_code=code,
                d_code=d,
                c_code=c,
                s_code=s,
                d_name=dname,
                c_name=cname,
                s_name=sname,
                tax_code=tax_zero,
                margin_value=Decimal("15.00"),
                active=True,
            )

        vendor1 = Vendor.objects.create(
            vend_sid=1,
            sbs=sbs,
            vend_code="SUP-001",
            vend_name="Lahore Foods & Dairy Supply",
            contact_name="Kamran Siddiqui",
            phone1="0300-8412090",
            address1="Industrial Area, Kot Lakhpat",
            city="Lahore",
            payment_terms="Cash",
            active=True,
        )
        Vendor.objects.create(
            vend_sid=2,
            sbs=sbs,
            vend_code="SUP-002",
            vend_name="Punjab Grocery Distributors",
            contact_name="Usman Ghani",
            phone1="0321-4509811",
            address1="Main Market, Gulberg III",
            city="Lahore",
            payment_terms="Net 15",
            active=True,
        )

        sample_items = [
            (1, "1001", "89640001", "Fresh Milk Pack 1L", "1L", "PKT", "DAIRY", 260, 300, 30),
            (2, "1002", "89640002", "White Sandwich Bread", "Large", "LOAF", "DAIRY", 170, 200, 20),
            (3, "1003", "89640003", "Cooking Oil Pouch 1L", "1L", "PCH", "GROCERY", 460, 520, 25),
            (4, "1004", "89640004", "Black Tea Pack 450g", "450g", "PKT", "DRINKS", 720, 850, 15),
            (5, "1005", "89640005", "Mineral Water Bottle 1.5L", "1.5L", "BTL", "DRINKS", 65, 90, 40),
        ]
        created_items = {}
        for item_id, alu, upc, name, size, uom, cat_key, cost, price, stock in sample_items:
            cat = dcs_map.get(cat_key) or dcs_map["DRINKS"]
            item_obj = InvnSbsItem.objects.create(
                item_sid=item_id,
                sbs=sbs,
                alu=alu,
                upc=upc,
                description1=name,
                item_size=size,
                uom=uom,
                dcs=cat,
                vendor=vendor1,
                tax_code=tax_zero,
                cost=round_money(cost),
                min_ord_qty=Decimal("5.00"),
                active=True,
            )
            created_items[alu] = item_obj
            InvnSbsPrice.objects.create(
                item=item_obj,
                sbs=sbs,
                price_level=pl_retail,
                price=round_money(price),
            )
            InvnSbsItemQty.objects.create(
                item=item_obj,
                store=store,
                qty=round_money(stock),
                min_qty=Decimal("5.00"),
                max_qty=Decimal("100.00"),
                rcvd_qty=round_money(stock),
            )

        walkin = Customer.objects.create(
            cust_sid=1,
            sbs=sbs,
            store=store,
            cust_id="CUST-001",
            first_name="Walk-in",
            last_name="Customer",
            phone_no="0300-0000000",
            city="Lahore",
            credit_limit=Decimal("0.00"),
            active=True,
        )
        Customer.objects.create(
            cust_sid=2,
            sbs=sbs,
            store=store,
            cust_id="CUST-002",
            first_name="Ali",
            last_name="Khan",
            phone_no="0300-4123456",
            city="Lahore",
            credit_limit=Decimal("10000.00"),
            total_transactions=1,
            ytd_sale=Decimal("500.00"),
            active=True,
        )

        PrefReason.objects.create(
            sbs=sbs,
            reason_type="ADJUSTMENT",
            reason_code="COUNT",
            reason_name="Stock Count Update",
            active=True,
        )

        # Sample Receiving Voucher (Purchase)
        vou = Voucher.objects.create(
            vou_sid=1,
            vou_no="PUR-01-00001",
            vou_type=0,
            sbs=sbs,
            store=store,
            vendor=vendor1,
            pkg_no="PKG-101",
            vendor_invoice_no="LFD-001",
            vou_subtotal=Decimal("11200.00"),
            vou_total=Decimal("11200.00"),
            status=3,
            notes="Initial dairy and bakery stock purchase",
            created_by=emp_admin,
        )
        m_item = created_items["1001"]
        b_item = created_items["1002"]
        VouItem.objects.create(
            voucher=vou,
            item_pos=1,
            item=m_item,
            qty=Decimal("30"),
            orig_qty=Decimal("30"),
            cost=Decimal("260.00"),
            price=Decimal("300.00"),
            ext_cost=Decimal("7800.00"),
        )
        VouItem.objects.create(
            voucher=vou,
            item_pos=2,
            item=b_item,
            qty=Decimal("20"),
            orig_qty=Decimal("20"),
            cost=Decimal("170.00"),
            price=Decimal("200.00"),
            ext_cost=Decimal("3400.00"),
        )

        zout = ZoutControl.objects.create(
            zout_sid=1,
            zout_no="SHIFT-01",
            store=store,
            workstation=ws,
            cashier=emp_admin,
            opening_float=Decimal("5000.00"),
            cash_sales=Decimal("500.00"),
            expected_cash=Decimal("5500.00"),
            total_net_sales=Decimal("500.00"),
            transaction_count=1,
            status="OPEN",
            notes="Register open",
        )
        DrawerEvent.objects.create(
            store=store,
            workstation=ws,
            zout=zout,
            employee=emp_admin,
            event_type="OPEN",
            amount=Decimal("5000.00"),
            reason_code="OPEN",
            notes="Opening float",
        )

        doc = Document.objects.create(
            doc_sid=1,
            sbs=sbs,
            store=store,
            workstation=ws,
            doc_no="INV-01-00001",
            receipt_type=0,
            status=3,
            is_held=False,
            price_level=pl_retail,
            cashier=emp_cashier,
            customer=walkin,
            bt_first_name="Walk-in",
            bt_last_name="Customer",
            sale_subtotal=Decimal("500.00"),
            transaction_total_amt=Decimal("500.00"),
            taken_amt=Decimal("500.00"),
            given_amt=Decimal("0.00"),
            fbr_invoice_no="FBR-01-20261118-0001",
        )
        DocumentItem.objects.create(
            document=doc,
            item_pos=1,
            item=m_item,
            item_type=1,
            scan_upc=m_item.upc,
            alu=m_item.alu,
            description1=m_item.description1,
            dcs_code="DAIRY",
            uom=m_item.uom,
            qty=Decimal("1"),
            orig_price=Decimal("300.00"),
            price=Decimal("300.00"),
            cost=m_item.cost,
            ext_price=Decimal("300.00"),
        )
        DocumentItem.objects.create(
            document=doc,
            item_pos=2,
            item=b_item,
            item_type=1,
            scan_upc=b_item.upc,
            alu=b_item.alu,
            description1=b_item.description1,
            dcs_code="DAIRY",
            uom=b_item.uom,
            qty=Decimal("1"),
            orig_price=Decimal("200.00"),
            price=Decimal("200.00"),
            cost=b_item.cost,
            ext_price=Decimal("200.00"),
        )
        Tender.objects.create(
            document=doc,
            tender_type="CASH",
            tender_name="Cash",
            tender_pos=1,
            amount=Decimal("500.00"),
            taken=Decimal("500.00"),
            given=Decimal("0.00"),
        )

        record_audit(
            emp_admin,
            "STORE_INITIALIZED",
            "MAIN-01",
            "Store initialized with 5 catalog products and Rs. 5,000 opening float",
            store=store,
        )
        record_audit(
            emp_admin,
            "PURCHASE_RECORDED",
            "PUR-01-00001",
            "Received stock purchase of Rs. 11,200 from Lahore Foods & Dairy Supply",
            store=store,
        )
        record_audit(
            emp_cashier,
            "SALE_COMPLETED",
            "INV-01-00001",
            "Completed Cash sale of Rs. 500 (1x Fresh Milk Pack 1L, 1x White Sandwich Bread)",
            store=store,
        )

        return True
