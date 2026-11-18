import json
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Sum
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .models import (
    AdjItem,
    Adjustment,
    AuditLog,
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
from .services import ensure_seeded, generate_doc_no, generate_fbr_ref, record_audit, round_money, to_float


def parse_json(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}


def error_response(message: str, status: int = 400):
    return JsonResponse({"error": message}, status=status)


def resolve_store(store_sid=1) -> Store:
    return Store.objects.filter(store_sid=int(store_sid or 1)).first() or Store.objects.first()


def resolve_employee(empl_sid=1) -> Employee:
    return Employee.objects.filter(empl_sid=int(empl_sid or 1)).first() or Employee.objects.first()


def serialize_store(s: Store):
    return {
        "store_sid": s.store_sid,
        "sbs_sid": s.sbs_id,
        "store_no": s.store_no,
        "store_code": s.store_code,
        "store_name": s.store_name,
        "address1": s.address1,
        "address2": s.address2,
        "city": s.city,
        "state": s.state,
        "postal_code": s.postal_code,
        "phone1": s.phone1,
        "ntn_no": s.ntn_no,
        "strn_no": s.strn_no,
        "receipt_header": s.receipt_header,
        "receipt_footer": s.receipt_footer,
        "active": 1 if s.active else 0,
    }


def serialize_shift(z: ZoutControl):
    if not z:
        return None
    return {
        "zout_sid": z.zout_sid,
        "zout_no": z.zout_no,
        "store_sid": z.store_id,
        "workstation_sid": z.workstation_id,
        "workstation_name": z.workstation.workstation_name if z.workstation_id else "",
        "cashier_sid": z.cashier_id,
        "cashier_name": z.cashier.full_name if z.cashier_id else "",
        "period_begin": z.period_begin.isoformat() if z.period_begin else None,
        "period_end": z.period_end.isoformat() if z.period_end else None,
        "opening_float": to_float(z.opening_float),
        "cash_sales": to_float(z.cash_sales),
        "cash_returns": to_float(z.cash_returns),
        "paid_in": to_float(z.paid_in),
        "paid_out": to_float(z.paid_out),
        "cash_drops": to_float(z.cash_drops),
        "expected_cash": to_float(z.expected_cash),
        "counted_cash": to_float(z.counted_cash),
        "over_short_amt": to_float(z.over_short_amt),
        "card_total": to_float(z.card_total),
        "jazzcash_total": to_float(z.jazzcash_total),
        "easypaisa_total": to_float(z.easypaisa_total),
        "raast_total": to_float(z.raast_total),
        "credit_total": to_float(z.credit_total),
        "total_net_sales": to_float(z.total_net_sales),
        "total_tax": to_float(z.total_tax),
        "total_discounts": to_float(z.total_discounts),
        "transaction_count": z.transaction_count,
        "denom_breakdown_json": z.denom_breakdown_json,
        "status": z.status,
        "notes": z.notes,
    }


def serialize_catalog_item(item: InvnSbsItem, store_sid: int):
    quantities_list = list(item.quantities.all())
    qty_map = {q.store_id: q for q in quantities_list}
    q_obj = qty_map.get(int(store_sid)) or (quantities_list[0] if quantities_list else None)

    prices_list = list(item.prices.select_related("price_level").all())
    price_map = {p.price_level.price_lvl: p.price for p in prices_list}
    retail_val = price_map.get(1)
    if retail_val is None and prices_list:
        retail_val = prices_list[0].price

    return {
        "item_sid": item.item_sid,
        "sbs_sid": item.sbs_id,
        "alu": item.alu,
        "upc": item.upc,
        "description1": item.description1,
        "description2": item.description2,
        "attribute": item.attribute,
        "item_size": item.item_size,
        "uom": item.uom,
        "dcs_sid": item.dcs_id,
        "dcs_code": item.dcs.dcs_code,
        "d_name": item.dcs.d_name,
        "c_name": item.dcs.c_name,
        "s_name": item.dcs.s_name,
        "vend_sid": item.vendor_id,
        "vend_code": item.vendor.vend_code if item.vendor else "",
        "vend_name": item.vendor.vend_name if item.vendor else "",
        "tax_code_sid": item.tax_code_id,
        "tax_code": item.tax_code.tax_code,
        "tax_name": item.tax_code.tax_name,
        "tax_perc": to_float(item.tax_code.tax_perc),
        "cost": to_float(item.cost),
        "min_ord_qty": to_float(item.min_ord_qty),
        "qty_on_hand": to_float(q_obj.qty) if q_obj else 0.0,
        "min_qty": to_float(q_obj.min_qty) if q_obj else 5.0,
        "max_qty": to_float(q_obj.max_qty) if q_obj else 250.0,
        "sold_qty": to_float(q_obj.sold_qty) if q_obj else 0.0,
        "rcvd_qty": to_float(q_obj.rcvd_qty) if q_obj else 0.0,
        "retail_price": to_float(retail_val or Decimal("0.00")),
        "wholesale_price": to_float(price_map.get(2, retail_val or Decimal("0.00"))),
        "staff_price": to_float(price_map.get(3, retail_val or Decimal("0.00"))),
        "active": 1 if item.active else 0,
    }


def serialize_document(doc: Document):
    return {
        "doc_sid": doc.doc_sid,
        "sbs_sid": doc.sbs_id,
        "store_sid": doc.store_id,
        "store_code": doc.store.store_code,
        "store_name": doc.store.store_name,
        "address1": doc.store.address1,
        "address2": doc.store.address2,
        "city": doc.store.city,
        "phone1": doc.store.phone1,
        "ntn_no": doc.store.ntn_no,
        "strn_no": doc.store.strn_no,
        "receipt_header": doc.store.receipt_header,
        "receipt_footer": doc.store.receipt_footer,
        "workstation_sid": doc.workstation_id,
        "workstation_no": doc.workstation.workstation_no,
        "workstation_name": doc.workstation.workstation_name,
        "doc_no": doc.doc_no,
        "receipt_type": doc.receipt_type,
        "status": doc.status,
        "is_held": 1 if doc.is_held else 0,
        "price_lvl_sid": doc.price_level_id,
        "price_lvl_name": doc.price_level.price_lvl_name if doc.price_level_id else "Retail",
        "cashier_sid": doc.cashier_id,
        "cashier_name": doc.cashier.full_name,
        "bt_cuid": doc.customer_id,
        "bt_first_name": doc.bt_first_name,
        "bt_last_name": doc.bt_last_name,
        "bt_primary_phone_no": doc.bt_primary_phone_no,
        "sale_subtotal": to_float(doc.sale_subtotal),
        "disc_perc": to_float(doc.disc_perc),
        "disc_amt": to_float(doc.disc_amt),
        "total_discount_amt": to_float(doc.total_discount_amt),
        "sale_total_tax_amt": to_float(doc.sale_total_tax_amt),
        "transaction_total_amt": to_float(doc.transaction_total_amt),
        "taken_amt": to_float(doc.taken_amt),
        "given_amt": to_float(doc.given_amt),
        "due_amt": to_float(doc.due_amt),
        "fbr_invoice_no": doc.fbr_invoice_no,
        "reason_code": doc.reason_code,
        "notes_general": doc.notes_general,
        "invc_post_date": doc.invc_post_date.isoformat() if doc.invc_post_date else None,
        "created_datetime": doc.created_datetime.isoformat() if doc.created_datetime else None,
        "items": [
            {
                "doc_item_sid": it.doc_item_sid,
                "doc_sid": it.document_id,
                "item_pos": it.item_pos,
                "item_sid": it.item_id,
                "item_type": it.item_type,
                "scan_upc": it.scan_upc,
                "alu": it.alu,
                "description1": it.description1,
                "dcs_code": it.dcs_code,
                "uom": it.uom,
                "qty": to_float(it.qty),
                "orig_price": to_float(it.orig_price),
                "price": to_float(it.price),
                "cost": to_float(it.cost),
                "disc_perc": to_float(it.disc_perc),
                "disc_amt": to_float(it.disc_amt),
                "tax_perc": to_float(it.tax_perc),
                "tax_amt": to_float(it.tax_amt),
                "ext_price": to_float(it.ext_price),
            }
            for it in doc.items.all()
        ],
        "tenders": [
            {
                "tender_sid": td.tender_sid,
                "doc_sid": td.document_id,
                "tender_type": td.tender_type,
                "tender_name": td.tender_name,
                "tender_pos": td.tender_pos,
                "amount": to_float(td.amount),
                "taken": to_float(td.taken),
                "given": to_float(td.given),
                "reference_no": td.reference_no,
                "auth_code": td.auth_code,
            }
            for td in doc.tenders.all()
        ],
    }


def health_view(request):
    ensure_seeded()
    return JsonResponse(
        {
            "service": "tezbill-pos-django-api",
            "status": "ok",
            "timestamp": timezone.now().isoformat(),
        }
    )


def employees_view(request):
    ensure_seeded()
    employees = Employee.objects.filter(user_active=True).select_related("base_store")
    return JsonResponse(
        {
            "employees": [
                {
                    "empl_sid": e.empl_sid,
                    "empl_no": e.empl_no,
                    "empl_name": e.empl_name,
                    "full_name": e.full_name,
                    "user_name": e.user_name,
                    "job_name": e.job_name,
                    "admin": 1 if e.admin else 0,
                    "max_disc_perc": to_float(e.max_disc_perc),
                    "base_store_sid": e.base_store_id,
                    "store_code": e.base_store.store_code,
                    "store_name": e.base_store.store_name,
                }
                for e in employees
            ]
        }
    )


@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return error_response("Method not allowed", 405)
    ensure_seeded()
    data = parse_json(request)
    user_name = str(data.get("user_name") or "").strip()
    pin_code = str(data.get("pin_code") or "").strip()
    if not user_name or not pin_code:
        return error_response("Username and PIN code are required", 400)

    emp = (
        Employee.objects.filter(user_name__iexact=user_name, pin_code=pin_code, user_active=True)
        .select_related("base_store")
        .first()
    )
    if not emp:
        return error_response("Invalid username or PIN code", 401)

    record_audit(
        emp,
        "USER_LOGIN",
        emp.user_name,
        f"{emp.full_name} ({emp.job_name}) signed in to POS terminal",
        store=emp.base_store,
    )

    return JsonResponse(
        {
            "employee": {
                "empl_sid": emp.empl_sid,
                "empl_no": emp.empl_no,
                "empl_name": emp.empl_name,
                "full_name": emp.full_name,
                "user_name": emp.user_name,
                "job_name": emp.job_name,
                "admin": 1 if emp.admin else 0,
                "max_disc_perc": to_float(emp.max_disc_perc),
                "base_store_sid": emp.base_store_id,
                "store_code": emp.base_store.store_code,
                "store_name": emp.base_store.store_name,
            }
        }
    )


@csrf_exempt
def logout_view(request):
    if request.method != "POST":
        return error_response("Method not allowed", 405)
    ensure_seeded()
    data = parse_json(request)
    emp = resolve_employee(data.get("empl_sid"))
    if emp:
        record_audit(
            emp,
            "USER_LOGOUT",
            emp.user_name,
            f"{emp.full_name} ({emp.job_name}) logged out of POS terminal",
            store=emp.base_store,
        )
    return JsonResponse({"logged_out": True})


@csrf_exempt
def change_pin_view(request):
    if request.method != "POST":
        return error_response("Method not allowed", 405)
    data = parse_json(request)
    emp = resolve_employee(data.get("empl_sid"))
    current_pin = str(data.get("current_pin") or "").strip()
    new_pin = str(data.get("new_pin") or "").strip()

    if not emp or emp.pin_code != current_pin:
        return error_response("Current PIN code is incorrect", 400)
    if len(new_pin) < 4:
        return error_response("New PIN code must be at least 4 characters", 400)

    emp.pin_code = new_pin
    emp.save()
    record_audit(emp, "PIN_UPDATED", emp.user_name, f"{emp.full_name} updated operator PIN code", store=emp.base_store)
    return JsonResponse({"updated": True})


def audit_logs_view(request):
    ensure_seeded()
    logs = AuditLog.objects.all()[:200]
    return JsonResponse(
        {
            "logs": [
                {
                    "log_sid": lg.log_sid,
                    "actor_name": lg.actor_name,
                    "actor_role": lg.actor_role,
                    "action_type": lg.action_type,
                    "entity_ref": lg.entity_ref,
                    "details": lg.details,
                    "created_datetime": lg.created_datetime.isoformat(),
                }
                for lg in logs
            ]
        }
    )


def bootstrap_view(request):
    ensure_seeded()
    store = resolve_store(request.GET.get("store_sid"))
    sbs = Subsidiary.objects.filter(active=True).first()
    stores = Store.objects.filter(active=True)
    workstations = Workstation.objects.filter(active=True)
    price_levels = PriceLevel.objects.filter(active=True)
    tax_codes = TaxCode.objects.filter(active=True)
    dcs_list = Dcs.objects.filter(active=True).select_related("tax_code")
    denoms = CurrencyDenomination.objects.select_related("currency").all()
    reasons = PrefReason.objects.filter(active=True)
    employees = Employee.objects.filter(user_active=True)
    active_shift = (
        ZoutControl.objects.filter(store=store, status="OPEN")
        .select_related("cashier", "workstation")
        .first()
    )

    return JsonResponse(
        {
            "subsidiary": {
                "sbs_sid": sbs.sbs_sid,
                "sbs_no": sbs.sbs_no,
                "sbs_name": sbs.sbs_name,
                "base_currency_code": sbs.base_currency_code,
                "active_price_lvl_sid": sbs.active_price_lvl_sid,
            }
            if sbs
            else None,
            "stores": [serialize_store(s) for s in stores],
            "workstations": [
                {
                    "workstation_sid": w.workstation_sid,
                    "store_sid": w.store_id,
                    "workstation_no": w.workstation_no,
                    "workstation_name": w.workstation_name,
                    "fqdn": w.fqdn,
                }
                for w in workstations
            ],
            "priceLevels": [
                {
                    "price_lvl_sid": pl.price_lvl_sid,
                    "sbs_sid": pl.sbs_id,
                    "price_lvl": pl.price_lvl,
                    "price_lvl_name": pl.price_lvl_name,
                    "disc_perc": to_float(pl.disc_perc),
                }
                for pl in price_levels
            ],
            "taxCodes": [
                {
                    "tax_code_sid": t.tax_code_sid,
                    "sbs_sid": t.sbs_id,
                    "tax_code": t.tax_code,
                    "tax_name": t.tax_name,
                    "tax_perc": to_float(t.tax_perc),
                    "is_default": 1 if t.is_default else 0,
                }
                for t in tax_codes
            ],
            "dcsCategories": [
                {
                    "dcs_sid": d.dcs_sid,
                    "sbs_sid": d.sbs_id,
                    "dcs_code": d.dcs_code,
                    "d_code": d.d_code,
                    "c_code": d.c_code,
                    "s_code": d.s_code,
                    "d_name": d.d_name,
                    "c_name": d.c_name,
                    "s_name": d.s_name,
                    "tax_code_sid": d.tax_code_id,
                    "tax_code": d.tax_code.tax_code if d.tax_code else "",
                    "tax_name": d.tax_code.tax_name if d.tax_code else "",
                    "tax_perc": to_float(d.tax_code.tax_perc) if d.tax_code else 0.0,
                    "margin_value": to_float(d.margin_value),
                }
                for d in dcs_list
            ],
            "denominations": [
                {
                    "denom_sid": dm.denom_sid,
                    "currency_sid": dm.currency_id,
                    "denom_name": dm.denom_name,
                    "multiplier": to_float(dm.multiplier),
                    "bill_coin": dm.bill_coin,
                    "sort_order": dm.sort_order,
                    "currency_code": dm.currency.currency_code,
                    "symbol": dm.currency.symbol,
                }
                for dm in denoms
            ],
            "reasons": [
                {
                    "reason_sid": r.reason_sid,
                    "sbs_sid": r.sbs_id,
                    "reason_type": r.reason_type,
                    "reason_code": r.reason_code,
                    "reason_name": r.reason_name,
                }
                for r in reasons
            ],
            "employees": [
                {
                    "empl_sid": e.empl_sid,
                    "empl_no": e.empl_no,
                    "empl_name": e.empl_name,
                    "full_name": e.full_name,
                    "user_name": e.user_name,
                    "job_name": e.job_name,
                    "admin": 1 if e.admin else 0,
                    "max_disc_perc": to_float(e.max_disc_perc),
                    "base_store_sid": e.base_store_id,
                }
                for e in employees
            ],
            "activeShift": serialize_shift(active_shift),
        }
    )


@csrf_exempt
def update_store_view(request, store_sid: int):
    if request.method != "PUT":
        return error_response("Method not allowed", 405)
    store = resolve_store(store_sid)
    if not store:
        return error_response("Store not found", 404)

    data = parse_json(request)
    for field in [
        "store_name",
        "address1",
        "address2",
        "city",
        "state",
        "postal_code",
        "phone1",
        "ntn_no",
        "strn_no",
        "receipt_header",
        "receipt_footer",
    ]:
        if field in data and data[field] is not None:
            setattr(store, field, str(data[field]).strip())

    if not store.store_name or not store.address1 or not store.city or not store.phone1:
        return error_response("Store name, address, city, and phone are required", 400)

    store.save()
    emp = resolve_employee(data.get("updated_by"))
    record_audit(emp, "SETTINGS_UPDATED", store.store_code, f'Updated store settings for "{store.store_name}"', store=store)
    return JsonResponse({"store": serialize_store(store)})


@csrf_exempt
def catalog_items_view(request):
    ensure_seeded()
    if request.method == "GET":
        store = resolve_store(request.GET.get("store_sid"))
        store_sid = store.store_sid if store else 1
        search = str(request.GET.get("search") or "").strip()
        dcs_sid = request.GET.get("dcs_sid")
        low_stock = str(request.GET.get("low_stock") or "").lower() in ("1", "true")
        include_inactive = str(request.GET.get("include_inactive") or "").lower() in ("1", "true")

        qs = InvnSbsItem.objects.select_related("dcs", "vendor", "tax_code").prefetch_related(
            "quantities", "prices__price_level"
        )
        if not include_inactive:
            qs = qs.filter(active=True)

        if search:
            qs = qs.filter(
                Q(alu__icontains=search)
                | Q(upc__icontains=search)
                | Q(description1__icontains=search)
                | Q(description2__icontains=search)
            )
        if dcs_sid:
            qs = qs.filter(dcs_id=int(dcs_sid))

        items = [serialize_catalog_item(item, store_sid) for item in qs]
        if low_stock:
            items = [i for i in items if i["qty_on_hand"] <= i["min_qty"]]
        return JsonResponse({"items": items})

    if request.method == "POST":
        data = parse_json(request)
        store = resolve_store(data.get("store_sid"))
        alu = str(data.get("alu") or "").strip()
        upc = str(data.get("upc") or alu).strip()
        desc1 = str(data.get("description1") or "").strip()
        dcs_sid = data.get("dcs_sid")
        retail_price = data.get("retail_price")

        if not alu or not desc1 or not dcs_sid or retail_price is None:
            return error_response("Code, product name, category, and selling price are required", 400)

        if InvnSbsItem.objects.filter(Q(alu__iexact=alu) | Q(upc__iexact=upc)).exists():
            return error_response("An item with the same code or barcode already exists", 409)

        with transaction.atomic():
            sbs = Subsidiary.objects.first()
            tax_obj = TaxCode.objects.filter(tax_code_sid=int(data.get("tax_code_sid") or 1)).first() or TaxCode.objects.first()
            item = InvnSbsItem.objects.create(
                sbs=sbs,
                alu=alu,
                upc=upc,
                description1=desc1,
                description2=str(data.get("description2") or "").strip(),
                attribute=str(data.get("attribute") or "").strip(),
                item_size=str(data.get("item_size") or "").strip(),
                uom=str(data.get("uom") or "PKT").strip(),
                dcs_id=int(dcs_sid),
                vendor_id=int(data["vend_sid"]) if data.get("vend_sid") else None,
                tax_code=tax_obj,
                cost=round_money(data.get("cost") or 0),
                min_ord_qty=round_money(data.get("min_qty") or 5),
                active=bool(data.get("active", True)),
            )

            r_price = round_money(retail_price)
            pl = PriceLevel.objects.filter(price_lvl=1).first() or PriceLevel.objects.first()
            if pl:
                InvnSbsPrice.objects.create(item=item, sbs=sbs, price_level=pl, price=r_price)

            init_qty = round_money(data.get("initial_qty") or 0)
            min_qty = round_money(data.get("min_qty") or 5)
            for st in Store.objects.filter(active=True):
                q_val = init_qty if st.store_sid == store.store_sid else Decimal("0.00")
                InvnSbsItemQty.objects.create(
                    item=item,
                    store=st,
                    qty=q_val,
                    min_qty=min_qty,
                    max_qty=Decimal("250.00"),
                    rcvd_qty=q_val,
                )

            emp = resolve_employee(data.get("created_by"))
            record_audit(
                emp,
                "PRODUCT_ADDED",
                item.alu,
                f'Added product "{item.description1}" (Cost: Rs. {item.cost}, Selling Price: Rs. {r_price}, Opening Stock: {init_qty})',
                store=store,
            )

        item_refreshed = (
            InvnSbsItem.objects.select_related("dcs", "vendor", "tax_code")
            .prefetch_related("quantities", "prices__price_level")
            .get(item_sid=item.item_sid)
        )
        return JsonResponse({"item": serialize_catalog_item(item_refreshed, store.store_sid)}, status=201)

    return error_response("Method not allowed", 405)


@csrf_exempt
def catalog_item_detail_view(request, item_sid: int):
    if request.method != "PUT":
        return error_response("Method not allowed", 405)
    item = InvnSbsItem.objects.filter(item_sid=item_sid).first()
    if not item:
        return error_response("Inventory item not found", 404)

    data = parse_json(request)
    store = resolve_store(data.get("store_sid"))

    with transaction.atomic():
        for attr in ["alu", "upc", "description1", "description2", "attribute", "item_size", "uom"]:
            if attr in data and data[attr] is not None:
                setattr(item, attr, str(data[attr]).strip())
        if data.get("dcs_sid"):
            item.dcs_id = int(data["dcs_sid"])
        if "vend_sid" in data:
            item.vendor_id = int(data["vend_sid"]) if data["vend_sid"] else None
        if data.get("cost") is not None:
            item.cost = round_money(data["cost"])
        if data.get("min_qty") is not None:
            item.min_ord_qty = round_money(data["min_qty"])
            InvnSbsItemQty.objects.filter(item=item, store=store).update(min_qty=round_money(data["min_qty"]))
        if "active" in data:
            item.active = bool(data["active"])
        item.save()

        if data.get("retail_price") is not None:
            r_price = round_money(data["retail_price"])
            pl = PriceLevel.objects.filter(price_lvl=1).first() or PriceLevel.objects.first()
            if pl:
                InvnSbsPrice.objects.update_or_create(
                    item=item, price_level=pl, defaults={"sbs": item.sbs, "price": r_price}
                )

        emp = resolve_employee(data.get("created_by"))
        record_audit(
            emp,
            "PRODUCT_UPDATED",
            item.alu,
            f'Updated product "{item.description1}" (Cost: Rs. {item.cost}, Price: Rs. {data.get("retail_price")})',
            store=store,
        )

    item_refreshed = (
        InvnSbsItem.objects.select_related("dcs", "vendor", "tax_code")
        .prefetch_related("quantities", "prices__price_level")
        .get(item_sid=item_sid)
    )
    return JsonResponse({"item": serialize_catalog_item(item_refreshed, store.store_sid)})


@csrf_exempt
def catalog_item_active_view(request, item_sid: int):
    if request.method != "PATCH":
        return error_response("Method not allowed", 405)
    item = InvnSbsItem.objects.filter(item_sid=item_sid).first()
    if not item:
        return error_response("Product not found", 404)
    data = parse_json(request)
    item.active = bool(data.get("active", not item.active))
    item.save()
    emp = resolve_employee(data.get("updated_by"))
    status_word = "Activated" if item.active else "Deactivated"
    record_audit(emp, "PRODUCT_STATUS", item.alu, f'{status_word} product "{item.description1}"')
    return JsonResponse({"item_sid": item.item_sid, "active": 1 if item.active else 0})


@csrf_exempt
def catalog_bulk_prices_view(request):
    if request.method != "PUT":
        return error_response("Method not allowed", 405)
    data = parse_json(request)
    updates = data.get("updates") or []
    if not updates:
        return error_response("No price updates provided", 400)

    store = resolve_store(data.get("store_sid"))
    emp = resolve_employee(data.get("updated_by"))

    with transaction.atomic():
        pl = PriceLevel.objects.filter(price_lvl=1).first() or PriceLevel.objects.first()
        for u in updates:
            item = InvnSbsItem.objects.filter(item_sid=int(u["item_sid"])).first()
            if not item:
                continue
            new_cost = round_money(u.get("cost") or 0)
            new_price = round_money(u.get("retail_price") or 0)
            if new_cost < 0 or new_price < 0:
                return error_response(f"Prices for {item.description1} cannot be negative", 400)
            item.cost = new_cost
            item.save()
            if pl:
                InvnSbsPrice.objects.update_or_create(
                    item=item, price_level=pl, defaults={"sbs": item.sbs, "price": new_price}
                )

        record_audit(
            emp,
            "DAILY_PRICES_UPDATED",
            f"{len(updates)} SKUs",
            f"Bulk updated daily purchase costs and selling prices for {len(updates)} products",
            store=store,
        )

    qs = InvnSbsItem.objects.select_related("dcs", "vendor", "tax_code").prefetch_related(
        "quantities", "prices__price_level"
    )
    return JsonResponse({"items": [serialize_catalog_item(i, store.store_sid) for i in qs]})


def catalog_item_movements_view(request, item_sid: int):
    ensure_seeded()
    item = InvnSbsItem.objects.filter(item_sid=item_sid).first()
    if not item:
        return error_response("Product not found", 404)

    events = []

    # 1. Purchases (Receiving Vouchers)
    vou_items = VouItem.objects.filter(item=item).select_related("voucher")
    for vi in vou_items:
        events.append(
            {
                "timestamp": vi.voucher.created_datetime,
                "type": "Purchase",
                "reference": vi.voucher.vou_no,
                "stock_in": to_float(vi.qty),
                "stock_out": 0.0,
                "delta": to_float(vi.qty),
            }
        )

    # 2. Sales & Returns (Documents)
    doc_items = DocumentItem.objects.filter(item=item, document__is_held=False).select_related("document")
    for di in doc_items:
        is_rtn = di.document.receipt_type == 1
        qty_f = to_float(di.qty)
        events.append(
            {
                "timestamp": di.document.invc_post_date,
                "type": "Return" if is_rtn else "Sale",
                "reference": di.document.doc_no,
                "stock_in": qty_f if is_rtn else 0.0,
                "stock_out": 0.0 if is_rtn else qty_f,
                "delta": qty_f if is_rtn else -qty_f,
            }
        )

    # 3. Stock Adjustments
    adj_items = AdjItem.objects.filter(item=item).select_related("adjustment")
    for ai in adj_items:
        diff_f = to_float(ai.diff_qty)
        events.append(
            {
                "timestamp": ai.adjustment.created_datetime,
                "type": "Adjustment",
                "reference": ai.adjustment.adj_no,
                "stock_in": diff_f if diff_f > 0 else 0.0,
                "stock_out": abs(diff_f) if diff_f < 0 else 0.0,
                "delta": diff_f,
            }
        )

    events.sort(key=lambda e: e["timestamp"])
    running_balance = 0.0
    movements = []
    for idx, ev in enumerate(events, start=1):
        running_balance = round(running_balance + ev["delta"], 2)
        movements.append(
            {
                "id": idx,
                "date": ev["timestamp"].isoformat(),
                "type": ev["type"],
                "reference": ev["reference"],
                "stockIn": ev["stock_in"] if ev["stock_in"] > 0 else 0,
                "stockOut": ev["stock_out"] if ev["stock_out"] > 0 else 0,
                "balance": running_balance,
            }
        )

    movements.reverse()
    return JsonResponse({"movements": movements})


def catalog_lookup_view(request):
    ensure_seeded()
    code = str(request.GET.get("code") or "").strip()
    store = resolve_store(request.GET.get("store_sid"))
    if not code:
        return error_response("Scan barcode or ALU code is required", 400)

    item = (
        InvnSbsItem.objects.filter(active=True)
        .filter(Q(upc__iexact=code) | Q(alu__iexact=code))
        .select_related("dcs", "vendor", "tax_code")
        .prefetch_related("quantities", "prices__price_level")
        .first()
    )
    if not item:
        return error_response(f'No active product found for code "{code}"', 404)

    return JsonResponse({"item": serialize_catalog_item(item, store.store_sid)})


@csrf_exempt
def catalog_dcs_view(request):
    if request.method != "POST":
        return error_response("Method not allowed", 405)
    data = parse_json(request)
    dcs_code = str(data.get("dcs_code") or "").strip().upper()
    d_name = str(data.get("d_name") or "").strip()
    c_name = str(data.get("c_name") or d_name).strip()
    s_name = str(data.get("s_name") or d_name).strip()
    if not dcs_code or not d_name:
        return error_response("Category code and name are required", 400)

    sbs = Subsidiary.objects.first()
    tax_obj = TaxCode.objects.first()
    dcs = Dcs.objects.create(
        sbs=sbs,
        dcs_code=dcs_code,
        d_code=dcs_code[:3],
        c_code="GEN",
        s_code="ITM",
        d_name=d_name,
        c_name=c_name,
        s_name=s_name,
        tax_code=tax_obj,
        margin_value=round_money(data.get("margin_value") or 15),
        active=True,
    )
    return JsonResponse(
        {
            "dcs": {
                "dcs_sid": dcs.dcs_sid,
                "dcs_code": dcs.dcs_code,
                "d_name": dcs.d_name,
                "c_name": dcs.c_name,
                "s_name": dcs.s_name,
            }
        },
        status=201,
    )


@csrf_exempt
def catalog_adjustments_view(request):
    ensure_seeded()
    if request.method == "GET":
        store = resolve_store(request.GET.get("store_sid"))
        adjs = (
            Adjustment.objects.filter(store=store)
            .select_related("adj_reason", "created_by")
            .prefetch_related("items__item")[:100]
        )
        return JsonResponse(
            {
                "adjustments": [
                    {
                        "adj_sid": a.adj_sid,
                        "adj_no": a.adj_no,
                        "store_sid": a.store_id,
                        "tot_orig_qty": to_float(a.tot_orig_qty),
                        "tot_adj_qty": to_float(a.tot_adj_qty),
                        "comments": a.comments,
                        "created_by_name": a.created_by.full_name if a.created_by else "",
                        "created_datetime": a.created_datetime.isoformat(),
                    }
                    for a in adjs
                ]
            }
        )

    if request.method == "POST":
        data = parse_json(request)
        store = resolve_store(data.get("store_sid"))
        emp = resolve_employee(data.get("created_by"))
        items = data.get("items") or []
        if not items:
            return error_response("At least one item is required for a stock adjustment", 400)

        with transaction.atomic():
            next_seq = Adjustment.objects.count() + 1
            adj_no = generate_doc_no("ADJ", store.store_no, next_seq)

            adj = Adjustment.objects.create(
                adj_no=adj_no,
                sbs=store.sbs,
                store=store,
                adj_type=0,
                status=3,
                comments=str(data.get("comments") or "").strip(),
                created_by=emp,
            )

            tot_orig = Decimal("0.00")
            tot_new = Decimal("0.00")

            for idx, line in enumerate(items, start=1):
                item = InvnSbsItem.objects.get(item_sid=int(line["item_sid"]))
                qty_obj, _ = InvnSbsItemQty.objects.get_or_create(
                    item=item, store=store, defaults={"qty": Decimal("0.00")}
                )
                orig_q = qty_obj.qty
                new_q = round_money(line["adj_qty"])
                if new_q < 0:
                    return error_response("Stock quantity cannot be negative", 400)

                diff_q = new_q - orig_q
                AdjItem.objects.create(
                    adjustment=adj,
                    item_pos=idx,
                    item=item,
                    orig_qty=orig_q,
                    adj_qty=new_q,
                    diff_qty=diff_q,
                    orig_value=round_money(orig_q * item.cost),
                    adj_value=round_money(new_q * item.cost),
                )

                qty_obj.qty = new_q
                qty_obj.save()

                tot_orig += orig_q
                tot_new += new_q

                record_audit(
                    emp,
                    "STOCK_UPDATED",
                    item.alu,
                    f'Stock updated for "{item.description1}": {to_float(orig_q):g} -> {to_float(new_q):g}',
                    store=store,
                )

            adj.tot_orig_qty = tot_orig
            adj.tot_adj_qty = tot_new
            adj.save()

        return JsonResponse(
            {
                "adjustment": {
                    "adj_sid": adj.adj_sid,
                    "adj_no": adj.adj_no,
                    "tot_orig_qty": to_float(adj.tot_orig_qty),
                    "tot_adj_qty": to_float(adj.tot_adj_qty),
                }
            },
            status=201,
        )

    return error_response("Method not allowed", 405)


@csrf_exempt
def documents_view(request):
    ensure_seeded()
    if request.method == "GET":
        store = resolve_store(request.GET.get("store_sid"))
        is_held = request.GET.get("is_held")
        receipt_type = request.GET.get("receipt_type")
        search = str(request.GET.get("search") or "").strip()

        qs = (
            Document.objects.filter(store=store)
            .select_related("store", "workstation", "cashier", "price_level")
            .prefetch_related("items", "tenders")
        )
        if is_held is not None and is_held != "":
            qs = qs.filter(is_held=bool(int(is_held)))
        if receipt_type is not None and receipt_type != "":
            qs = qs.filter(receipt_type=int(receipt_type))
        if search:
            qs = qs.filter(
                Q(doc_no__icontains=search)
                | Q(fbr_invoice_no__icontains=search)
                | Q(bt_first_name__icontains=search)
                | Q(bt_last_name__icontains=search)
                | Q(bt_primary_phone_no__icontains=search)
            )

        return JsonResponse({"documents": [serialize_document(d) for d in qs[:200]]})

    if request.method == "POST":
        data = parse_json(request)
        store = resolve_store(data.get("store_sid"))
        ws = (
            Workstation.objects.filter(workstation_sid=int(data.get("workstation_sid") or 1)).first()
            or Workstation.objects.filter(store=store).first()
        )
        cashier = resolve_employee(data.get("cashier_sid"))
        pl = (
            PriceLevel.objects.filter(price_lvl_sid=int(data.get("price_lvl_sid") or 1)).first()
            or PriceLevel.objects.first()
        )
        receipt_type = int(data.get("receipt_type") or 0)
        is_held = bool(int(data.get("is_held") or 0))
        held_doc_sid = data.get("held_doc_sid")
        bt_cuid = data.get("bt_cuid")
        custom_customer_name = str(data.get("customer_name") or "").strip()
        items_input = data.get("items") or []
        tenders_input = data.get("tenders") or []

        if not items_input:
            return error_response("Cannot create a POS document without line items", 400)

        with transaction.atomic():
            if held_doc_sid:
                Document.objects.filter(doc_sid=int(held_doc_sid), is_held=True).delete()

            customer = (
                Customer.objects.filter(cust_sid=int(bt_cuid)).first()
                if bt_cuid
                else Customer.objects.filter(cust_id="CUST-001").first()
            ) or Customer.objects.first()

            bt_first = customer.first_name if customer else "Walk-in"
            bt_last = customer.last_name if customer else "Customer"
            if custom_customer_name:
                parts = custom_customer_name.split(" ", 1)
                bt_first = parts[0]
                bt_last = parts[1] if len(parts) > 1 else ""

            sale_subtotal = Decimal("0.00")
            line_discounts_total = Decimal("0.00")
            prepared_lines = []

            for idx, line in enumerate(items_input, start=1):
                item = (
                    InvnSbsItem.objects.select_related("dcs", "tax_code")
                    .filter(item_sid=int(line["item_sid"]))
                    .first()
                )
                if not item:
                    return error_response(f"Catalog item {line.get('item_sid')} not found", 400)

                qty = round_money(line.get("qty") or 1)
                if qty <= 0:
                    return error_response(f"Invalid quantity for {item.description1}", 400)

                qty_record = (
                    InvnSbsItemQty.objects.filter(item=item, store=store).first()
                    or InvnSbsItemQty.objects.filter(item=item).first()
                )
                if not qty_record:
                    qty_record = InvnSbsItemQty.objects.create(item=item, store=store, qty=Decimal("0.00"))

                if not is_held and receipt_type == 0 and qty_record.qty < qty:
                    return error_response(
                        f'Insufficient stock for "{item.description1}" (Available: {qty_record.qty}, Requested: {qty})',
                        400,
                    )

                pl_price_obj = InvnSbsPrice.objects.filter(item=item).first()
                default_price = pl_price_obj.price if pl_price_obj else Decimal("0.00")
                orig_price = round_money(line["orig_price"]) if line.get("orig_price") is not None else default_price
                line_disc_perc = round_money(line.get("disc_perc") or 0)
                unit_disc_amt = (
                    round_money(line["disc_amt"])
                    if line.get("disc_amt") is not None
                    else round_money((orig_price * line_disc_perc) / Decimal("100"))
                )
                eff_price = max(Decimal("0.00"), round_money(orig_price - unit_disc_amt))
                ext_price = round_money(eff_price * qty)
                tot_line_disc = round_money(unit_disc_amt * qty)
                tax_perc = item.tax_code.tax_perc

                sale_subtotal = round_money(sale_subtotal + ext_price)
                line_discounts_total = round_money(line_discounts_total + tot_line_disc)

                prepared_lines.append(
                    {
                        "item_pos": idx,
                        "item": item,
                        "qty_record": qty_record,
                        "item_type": 2 if receipt_type == 1 else 1,
                        "qty": qty,
                        "orig_price": orig_price,
                        "price": eff_price,
                        "disc_perc": line_disc_perc,
                        "disc_amt": tot_line_disc,
                        "tax_perc": tax_perc,
                        "ext_price": ext_price,
                    }
                )

            inv_disc_perc = round_money(data.get("disc_perc") or 0)
            inv_disc_amt = (
                round_money(data["disc_amt"])
                if data.get("disc_amt")
                else round_money((sale_subtotal * inv_disc_perc) / Decimal("100"))
            )
            net_before_tax = max(Decimal("0.00"), round_money(sale_subtotal - inv_disc_amt))
            disc_ratio = (net_before_tax / sale_subtotal) if sale_subtotal > 0 else Decimal("1")

            total_tax_amt = Decimal("0.00")
            for pline in prepared_lines:
                discounted_ext = round_money(pline["ext_price"] * disc_ratio)
                pline["tax_amt"] = round_money((discounted_ext * pline["tax_perc"]) / Decimal("100"))
                total_tax_amt = round_money(total_tax_amt + pline["tax_amt"])

            total_discount_amt = round_money(line_discounts_total + inv_disc_amt)
            transaction_total_amt = round_money(net_before_tax + total_tax_amt)

            next_seq = Document.objects.count() + 1
            prefix = "HLD" if is_held else ("RTN" if receipt_type == 1 else "INV")
            doc_no = generate_doc_no(prefix, store.store_no, next_seq)
            fbr_no = "" if is_held else generate_fbr_ref(store.store_no, next_seq)

            taken_amt = Decimal("0.00")
            given_amt = Decimal("0.00")
            due_amt = Decimal("0.00")
            normalized_tenders = []

            if not is_held:
                raw_tenders = tenders_input or [
                    {
                        "tender_type": "CASH",
                        "tender_name": "Cash",
                        "amount": transaction_total_amt,
                        "taken": transaction_total_amt,
                    }
                ]
                for i, t in enumerate(raw_tenders, start=1):
                    ttype = str(t.get("tender_type") or "CASH").upper()
                    amt = round_money(t["amount"]) if t.get("amount") is not None else transaction_total_amt
                    taken = round_money(t["taken"]) if t.get("taken") is not None else amt
                    given = max(Decimal("0.00"), round_money(taken - amt))
                    taken_amt = round_money(taken_amt + taken)
                    given_amt = round_money(given_amt + given)
                    normalized_tenders.append(
                        {
                            "tender_type": ttype,
                            "tender_name": str(t.get("tender_name") or ttype),
                            "tender_pos": i,
                            "amount": amt,
                            "taken": taken,
                            "given": given,
                            "reference_no": str(t.get("reference_no") or "").strip(),
                            "auth_code": str(t.get("auth_code") or "").strip(),
                        }
                    )

                total_applied = sum((t["amount"] for t in normalized_tenders), Decimal("0.00"))
                if total_applied < transaction_total_amt - Decimal("0.01"):
                    return error_response(
                        f"Tendered amount (Rs. {total_applied}) is less than invoice total (Rs. {transaction_total_amt})",
                        400,
                    )
            else:
                due_amt = transaction_total_amt

            doc = Document.objects.create(
                sbs=store.sbs,
                store=store,
                workstation=ws,
                doc_no=doc_no,
                receipt_type=receipt_type,
                status=4 if is_held else 3,
                is_held=is_held,
                price_level=pl,
                cashier=cashier,
                customer=customer,
                bt_first_name=bt_first,
                bt_last_name=bt_last,
                bt_primary_phone_no=customer.phone_no if customer else "",
                sale_subtotal=sale_subtotal,
                disc_perc=inv_disc_perc,
                disc_amt=inv_disc_amt,
                total_discount_amt=total_discount_amt,
                sale_total_tax_amt=total_tax_amt,
                transaction_total_amt=transaction_total_amt,
                taken_amt=taken_amt,
                given_amt=given_amt,
                due_amt=due_amt,
                fbr_invoice_no=fbr_no,
                reason_code=str(data.get("reason_code") or "").strip(),
                notes_general=str(data.get("notes_general") or "").strip(),
            )

            for pline in prepared_lines:
                item = pline["item"]
                DocumentItem.objects.create(
                    document=doc,
                    item_pos=pline["item_pos"],
                    item=item,
                    item_type=pline["item_type"],
                    scan_upc=item.upc,
                    alu=item.alu,
                    description1=item.description1,
                    dcs_code=item.dcs.dcs_code,
                    uom=item.uom,
                    qty=pline["qty"],
                    orig_price=pline["orig_price"],
                    price=pline["price"],
                    cost=item.cost,
                    disc_perc=pline["disc_perc"],
                    disc_amt=pline["disc_amt"],
                    tax_perc=pline["tax_perc"],
                    tax_amt=pline["tax_amt"],
                    ext_price=pline["ext_price"],
                )

                if not is_held:
                    qr = pline["qty_record"]
                    if receipt_type == 1:
                        qr.qty = round_money(qr.qty + pline["qty"])
                        qr.sold_qty = max(Decimal("0.00"), round_money(qr.sold_qty - pline["qty"]))
                    else:
                        qr.qty = round_money(qr.qty - pline["qty"])
                        qr.sold_qty = round_money(qr.sold_qty + pline["qty"])
                    qr.save()

            if not is_held:
                sign = Decimal("-1") if receipt_type == 1 else Decimal("1")
                for td in normalized_tenders:
                    Tender.objects.create(document=doc, **td)

                if customer:
                    customer.total_transactions += 1
                    customer.ytd_sale = max(Decimal("0.00"), round_money(customer.ytd_sale + sign * transaction_total_amt))
                    customer.save()

                open_shift = ZoutControl.objects.filter(store=store, status="OPEN").first()
                if open_shift:
                    for td in normalized_tenders:
                        tt = td["tender_type"]
                        amt = td["amount"]
                        if tt == "CASH":
                            if receipt_type == 1:
                                open_shift.cash_returns = round_money(open_shift.cash_returns + amt)
                                open_shift.expected_cash = round_money(open_shift.expected_cash - amt)
                            else:
                                open_shift.cash_sales = round_money(open_shift.cash_sales + amt)
                                open_shift.expected_cash = round_money(open_shift.expected_cash + amt)
                    open_shift.total_net_sales = round_money(open_shift.total_net_sales + sign * transaction_total_amt)
                    open_shift.transaction_count += 1
                    open_shift.save()

                items_summary = ", ".join(f'{to_float(l["qty"]):g}x {l["item"].description1}' for l in prepared_lines)
                tender_summary = normalized_tenders[0]["tender_name"] if normalized_tenders else "Cash"
                record_audit(
                    cashier,
                    "SALE_COMPLETED",
                    doc.doc_no,
                    f"Completed {tender_summary} sale of Rs. {to_float(transaction_total_amt):g} ({items_summary})",
                    store=store,
                )
            else:
                record_audit(
                    cashier,
                    "SALE_HELD",
                    doc.doc_no,
                    f"Held bill {doc.doc_no} of Rs. {to_float(transaction_total_amt):g} for later",
                    store=store,
                )

        doc_refreshed = (
            Document.objects.select_related("store", "workstation", "cashier", "price_level")
            .prefetch_related("items", "tenders")
            .get(doc_sid=doc.doc_sid)
        )
        return JsonResponse({"document": serialize_document(doc_refreshed)}, status=201)

    return error_response("Method not allowed", 405)


def document_detail_view(request, doc_sid: int):
    doc = (
        Document.objects.select_related("store", "workstation", "cashier", "price_level")
        .prefetch_related("items", "tenders")
        .filter(doc_sid=doc_sid)
        .first()
    )
    if not doc:
        return error_response("Document not found", 404)
    return JsonResponse({"document": serialize_document(doc)})


@csrf_exempt
def delete_held_document_view(request, doc_sid: int):
    if request.method != "DELETE":
        return error_response("Method not allowed", 405)
    doc = Document.objects.filter(doc_sid=doc_sid, is_held=True).first()
    if not doc:
        return error_response("Held receipt not found", 404)
    doc.delete()
    return JsonResponse({"deleted": True, "doc_sid": doc_sid})


@csrf_exempt
def customers_view(request):
    ensure_seeded()
    if request.method == "GET":
        search = str(request.GET.get("search") or "").strip()
        qs = Customer.objects.filter(active=True)
        if search:
            qs = qs.filter(
                Q(cust_id__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(phone_no__icontains=search)
            )
        return JsonResponse(
            {
                "customers": [
                    {
                        "cust_sid": c.cust_sid,
                        "cust_id": c.cust_id,
                        "first_name": c.first_name,
                        "last_name": c.last_name,
                        "company_name": c.company_name,
                        "phone_no": c.phone_no,
                        "email": c.email,
                        "address1": c.address1,
                        "city": c.city,
                        "credit_limit": to_float(c.credit_limit),
                        "credit_used": to_float(c.credit_used),
                        "available_credit": to_float(c.credit_limit - c.credit_used),
                        "total_transactions": c.total_transactions,
                        "ytd_sale": to_float(c.ytd_sale),
                    }
                    for c in qs
                ]
            }
        )

    if request.method == "POST":
        data = parse_json(request)
        fname = str(data.get("first_name") or "").strip()
        lname = str(data.get("last_name") or "").strip()
        phone = str(data.get("phone_no") or "").strip()
        if not fname or not lname or not phone:
            return error_response("First name, last name, and phone number are required", 400)

        store = resolve_store(data.get("store_sid"))
        cust_id = f"CUST-{Customer.objects.count() + 1:03d}"
        c = Customer.objects.create(
            sbs=store.sbs,
            store=store,
            cust_id=cust_id,
            first_name=fname,
            last_name=lname,
            phone_no=phone,
            city=str(data.get("city") or "Lahore").strip(),
            active=True,
        )
        emp = resolve_employee(data.get("created_by"))
        record_audit(
            emp,
            "CUSTOMER_ADDED",
            c.cust_id,
            f"Registered customer {c.first_name} {c.last_name} ({c.phone_no})",
            store=store,
        )
        return JsonResponse(
            {
                "customer": {
                    "cust_sid": c.cust_sid,
                    "cust_id": c.cust_id,
                    "first_name": c.first_name,
                    "last_name": c.last_name,
                    "phone_no": c.phone_no,
                    "city": c.city,
                    "total_transactions": c.total_transactions,
                    "ytd_sale": to_float(c.ytd_sale),
                }
            },
            status=201,
        )

    return error_response("Method not allowed", 405)


@csrf_exempt
def customer_detail_view(request, cust_sid: int):
    if request.method != "PUT":
        return error_response("Method not allowed", 405)
    c = Customer.objects.filter(cust_sid=cust_sid).first()
    if not c:
        return error_response("Customer not found", 404)
    data = parse_json(request)
    for field in ["first_name", "last_name", "phone_no", "city"]:
        if field in data and data[field] is not None:
            setattr(c, field, str(data[field]).strip())
    c.save()
    return JsonResponse({"customer": {"cust_sid": c.cust_sid, "first_name": c.first_name, "last_name": c.last_name}})


def customer_history_view(request, cust_sid: int):
    c = Customer.objects.filter(cust_sid=cust_sid).first()
    if not c:
        return error_response("Customer not found", 404)
    docs = Document.objects.filter(customer=c, is_held=False).select_related("cashier")[:50]
    return JsonResponse(
        {
            "customer": {"cust_sid": c.cust_sid, "first_name": c.first_name, "last_name": c.last_name},
            "documents": [
                {
                    "doc_sid": d.doc_sid,
                    "doc_no": d.doc_no,
                    "invc_post_date": d.invc_post_date.isoformat(),
                    "transaction_total_amt": to_float(d.transaction_total_amt),
                }
                for d in docs
            ],
        }
    )


@csrf_exempt
def customer_credit_payment_view(request, cust_sid: int):
    return JsonResponse({"status": "ok"})


@csrf_exempt
def vendors_view(request):
    ensure_seeded()
    if request.method == "GET":
        vendors = Vendor.objects.all()
        return JsonResponse(
            {
                "vendors": [
                    {
                        "vend_sid": v.vend_sid,
                        "vend_code": v.vend_code,
                        "vend_name": v.vend_name,
                        "contact_name": v.contact_name,
                        "phone1": v.phone1,
                        "address1": v.address1,
                        "city": v.city,
                        "payment_terms": v.payment_terms,
                        "active": 1 if v.active else 0,
                        "created_datetime": v.created_datetime.isoformat(),
                        "purchases_count": v.vouchers.count(),
                        "total_purchased": to_float(
                            v.vouchers.aggregate(s=Sum("vou_total"))["s"] or Decimal("0.00")
                        ),
                    }
                    for v in vendors
                ]
            }
        )

    if request.method == "POST":
        data = parse_json(request)
        vname = str(data.get("vend_name") or "").strip()
        vcode = str(data.get("vend_code") or "").strip().upper()
        if not vname:
            return error_response("Supplier name is required", 400)
        if not vcode:
            vcode = f"SUP-{Vendor.objects.count() + 1:03d}"

        if Vendor.objects.filter(vend_code__iexact=vcode).exists():
            return error_response("A supplier with this code already exists", 409)

        sbs = Subsidiary.objects.first()
        v = Vendor.objects.create(
            sbs=sbs,
            vend_code=vcode,
            vend_name=vname,
            contact_name=str(data.get("contact_name") or "").strip(),
            phone1=str(data.get("phone1") or "").strip(),
            address1=str(data.get("address1") or "").strip(),
            city=str(data.get("city") or "Lahore").strip(),
            payment_terms=str(data.get("payment_terms") or "Cash").strip(),
            active=bool(data.get("active", True)),
        )
        emp = resolve_employee(data.get("created_by"))
        record_audit(emp, "SUPPLIER_ADDED", v.vend_code, f'Registered supplier "{v.vend_name}" ({v.phone1})')
        return JsonResponse(
            {
                "vendor": {
                    "vend_sid": v.vend_sid,
                    "vend_code": v.vend_code,
                    "vend_name": v.vend_name,
                    "phone1": v.phone1,
                    "address1": v.address1,
                    "city": v.city,
                    "active": 1 if v.active else 0,
                }
            },
            status=201,
        )

    return error_response("Method not allowed", 405)


@csrf_exempt
def vendor_detail_view(request, vend_sid: int):
    v = Vendor.objects.filter(vend_sid=vend_sid).first()
    if not v:
        return error_response("Supplier not found", 404)

    if request.method == "PUT":
        data = parse_json(request)
        for field in ["vend_code", "vend_name", "contact_name", "phone1", "address1", "city", "payment_terms"]:
            if field in data and data[field] is not None:
                setattr(v, field, str(data[field]).strip())
        if "active" in data:
            v.active = bool(data["active"])
        v.save()
        emp = resolve_employee(data.get("updated_by"))
        record_audit(emp, "SUPPLIER_UPDATED", v.vend_code, f'Updated supplier "{v.vend_name}"')
        return JsonResponse({"vendor": {"vend_sid": v.vend_sid, "vend_code": v.vend_code, "vend_name": v.vend_name}})

    if request.method == "PATCH":
        data = parse_json(request)
        v.active = bool(data.get("active", not v.active))
        v.save()
        emp = resolve_employee(data.get("updated_by"))
        record_audit(
            emp,
            "SUPPLIER_STATUS",
            v.vend_code,
            f'{"Activated" if v.active else "Deactivated"} supplier "{v.vend_name}"',
        )
        return JsonResponse({"vend_sid": v.vend_sid, "active": 1 if v.active else 0})

    return error_response("Method not allowed", 405)


@csrf_exempt
def vouchers_view(request):
    ensure_seeded()
    if request.method == "GET":
        store = resolve_store(request.GET.get("store_sid"))
        vouchers = (
            Voucher.objects.filter(store=store)
            .select_related("vendor", "created_by")
            .prefetch_related("items__item")[:150]
        )
        return JsonResponse(
            {
                "vouchers": [
                    {
                        "vou_sid": v.vou_sid,
                        "vou_no": v.vou_no,
                        "vend_sid": v.vendor_id,
                        "vend_code": v.vendor.vend_code,
                        "vend_name": v.vendor.vend_name,
                        "vou_subtotal": to_float(v.vou_subtotal),
                        "disc_amt": to_float(v.disc_amt),
                        "vou_total": to_float(v.vou_total),
                        "notes": v.notes,
                        "created_by_name": v.created_by.full_name if v.created_by else "Admin",
                        "created_datetime": v.created_datetime.isoformat(),
                        "total_qty": to_float(sum((vi.qty for vi in v.items.all()), Decimal("0.00"))),
                        "items": [
                            {
                                "vou_item_sid": vi.vou_item_sid,
                                "item_pos": vi.item_pos,
                                "item_sid": vi.item_id,
                                "alu": vi.item.alu,
                                "description1": vi.item.description1,
                                "qty": to_float(vi.qty),
                                "cost": to_float(vi.cost),
                                "ext_cost": to_float(vi.ext_cost),
                            }
                            for vi in v.items.all()
                        ],
                    }
                    for v in vouchers
                ]
            }
        )

    if request.method == "POST":
        data = parse_json(request)
        store = resolve_store(data.get("store_sid"))
        vend_sid = data.get("vend_sid")
        items = data.get("items") or []
        disc_amt = round_money(data.get("disc_amt") or 0)
        emp = resolve_employee(data.get("created_by"))

        if not vend_sid or not items:
            return error_response("Choose an active supplier and add at least one product line", 400)

        vendor = Vendor.objects.filter(vend_sid=int(vend_sid)).first()
        if not vendor:
            return error_response("Selected supplier not found", 404)

        with transaction.atomic():
            vou_no = generate_doc_no("PUR", store.store_no, Voucher.objects.count() + 1)
            vou = Voucher.objects.create(
                vou_no=vou_no,
                vou_type=0,
                sbs=store.sbs,
                store=store,
                vendor=vendor,
                disc_amt=disc_amt,
                status=3,
                notes=str(data.get("notes") or "").strip(),
                created_by=emp,
            )

            subtotal = Decimal("0.00")
            tot_qty = Decimal("0.00")
            for idx, line in enumerate(items, start=1):
                item = InvnSbsItem.objects.filter(item_sid=int(line["item_sid"])).first()
                if not item:
                    return error_response(f"Product {line.get('item_sid')} not found", 400)

                qty = round_money(line.get("qty") or 1)
                cost = round_money(line.get("cost") if line.get("cost") is not None else item.cost)
                if qty <= 0 or cost < 0:
                    return error_response("Quantity must be positive and purchase cost nonnegative", 400)

                ext = round_money(qty * cost)
                VouItem.objects.create(
                    voucher=vou,
                    item_pos=idx,
                    item=item,
                    qty=qty,
                    orig_qty=qty,
                    cost=cost,
                    price=cost,
                    ext_cost=ext,
                )

                qty_obj, _ = InvnSbsItemQty.objects.get_or_create(
                    item=item, store=store, defaults={"qty": Decimal("0.00")}
                )
                qty_obj.qty = round_money(qty_obj.qty + qty)
                qty_obj.rcvd_qty = round_money(qty_obj.rcvd_qty + qty)
                qty_obj.save()

                item.cost = cost
                item.save()

                subtotal = round_money(subtotal + ext)
                tot_qty = round_money(tot_qty + qty)

            vou.vou_subtotal = subtotal
            vou.vou_total = max(Decimal("0.00"), round_money(subtotal - disc_amt))
            vou.save()

            record_audit(
                emp,
                "PURCHASE_RECORDED",
                vou.vou_no,
                f"Recorded purchase {vou.vou_no} from {vendor.vend_name} ({to_float(tot_qty):g} units, Total: Rs. {to_float(vou.vou_total):g})",
                store=store,
            )

        return JsonResponse(
            {
                "voucher": {
                    "vou_sid": vou.vou_sid,
                    "vou_no": vou.vou_no,
                    "vou_total": to_float(vou.vou_total),
                }
            },
            status=201,
        )

    return error_response("Method not allowed", 405)


@csrf_exempt
def purchase_orders_view(request):
    return vouchers_view(request)


def register_status_view(request):
    ensure_seeded()
    store = resolve_store(request.GET.get("store_sid"))
    active_shift = ZoutControl.objects.filter(store=store, status="OPEN").first()
    return JsonResponse({"activeShift": serialize_shift(active_shift), "events": [], "history": []})


@csrf_exempt
def register_open_view(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
def register_event_view(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
def register_close_view(request):
    return JsonResponse({"status": "ok"})


def reports_summary_view(request):
    return JsonResponse({"status": "ok"})
