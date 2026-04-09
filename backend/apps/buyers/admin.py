from django.contrib import admin

from apps.buyers.models import Buyer


@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ("name", "company_name", "email", "phone", "created_at")
    search_fields = ("name", "company_name", "email", "phone")
    list_filter = ("created_at",)
