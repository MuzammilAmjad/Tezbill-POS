from django.contrib import admin
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


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_datetime", "actor_name", "actor_role", "action_type", "entity_ref", "details")
    search_fields = ("actor_name", "action_type", "entity_ref", "details")
    list_filter = ("action_type", "actor_role")


class InvnSbsPriceInline(admin.TabularInline):
    model = InvnSbsPrice
    extra = 0


class InvnSbsItemQtyInline(admin.TabularInline):
    model = InvnSbsItemQty
    extra = 0


@admin.register(InvnSbsItem)
class InvnSbsItemAdmin(admin.ModelAdmin):
    list_display = ("alu", "upc", "description1", "item_size", "uom", "dcs", "cost", "active")
    search_fields = ("alu", "upc", "description1")
    list_filter = ("dcs", "tax_code", "active")
    inlines = [InvnSbsPriceInline, InvnSbsItemQtyInline]


class DocumentItemInline(admin.TabularInline):
    model = DocumentItem
    extra = 0


class TenderInline(admin.TabularInline):
    model = Tender
    extra = 0


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "doc_no",
        "receipt_type",
        "store",
        "cashier",
        "bt_first_name",
        "bt_last_name",
        "transaction_total_amt",
        "is_held",
        "invc_post_date",
    )
    search_fields = ("doc_no", "fbr_invoice_no", "bt_first_name", "bt_last_name")
    list_filter = ("receipt_type", "is_held", "store")
    inlines = [DocumentItemInline, TenderInline]


admin.site.register(Subsidiary)
admin.site.register(Currency)
admin.site.register(CurrencyDenomination)
admin.site.register(TaxCode)
admin.site.register(PriceLevel)
admin.site.register(Store)
admin.site.register(Workstation)
admin.site.register(Employee)
admin.site.register(Dcs)
admin.site.register(Vendor)
admin.site.register(Customer)
admin.site.register(PrefReason)
admin.site.register(PurchaseOrder)
admin.site.register(Voucher)
admin.site.register(Adjustment)
admin.site.register(ZoutControl)
admin.site.register(DrawerEvent)
