from django.contrib import admin

from apps.production.models import ProductionEntry


@admin.register(ProductionEntry)
class ProductionEntryAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "order",
        "production_line",
        "supervisor",
        "target_qty",
        "produced_qty",
        "rejected_qty",
    )
    list_filter = ("date", "production_line", "supervisor")
    search_fields = ("order__order_code", "order__style_name", "remarks")
    autocomplete_fields = ("production_line", "supervisor", "order")
