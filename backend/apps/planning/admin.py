from django.contrib import admin

from apps.planning.models import ProductionPlan


@admin.register(ProductionPlan)
class ProductionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "production_line",
        "planned_start_date",
        "planned_end_date",
        "planned_daily_target",
        "planned_total_qty",
        "created_by",
    )
    list_filter = ("planned_start_date", "planned_end_date", "production_line")
    search_fields = ("order__order_code", "order__style_name", "production_line__name")
