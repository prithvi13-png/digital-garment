from django.contrib import admin

from apps.orders.models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_code",
        "buyer",
        "style_name",
        "quantity",
        "delivery_date",
        "current_stage",
        "status",
        "priority",
    )
    list_filter = ("status", "current_stage", "priority", "delivery_date")
    search_fields = ("order_code", "style_name", "style_code", "buyer__company_name")
    autocomplete_fields = ("buyer", "created_by")
