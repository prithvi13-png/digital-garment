from django.contrib import admin

from apps.inventory.models import Material, MaterialStockInward, MaterialStockIssue, StockAdjustment


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "material_type", "unit", "is_active", "barcode_value", "updated_at")
    list_filter = ("material_type", "is_active")
    search_fields = ("code", "name", "barcode_value")
    ordering = ("name",)


@admin.register(MaterialStockInward)
class MaterialStockInwardAdmin(admin.ModelAdmin):
    list_display = ("material", "inward_date", "quantity", "supplier_name", "created_by")
    list_filter = ("inward_date", "material__material_type")
    search_fields = ("material__code", "material__name", "batch_no", "roll_no", "supplier_name")


@admin.register(MaterialStockIssue)
class MaterialStockIssueAdmin(admin.ModelAdmin):
    list_display = ("material", "issue_date", "quantity", "order", "production_line", "created_by")
    list_filter = ("issue_date", "material__material_type", "production_line")
    search_fields = ("material__code", "material__name", "order__order_code", "issued_to")


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ("material", "adjustment_date", "adjustment_type", "quantity", "created_by")
    list_filter = ("adjustment_date", "adjustment_type", "material__material_type")
    search_fields = ("material__code", "material__name", "reason")
