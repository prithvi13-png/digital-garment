from django.contrib import admin

from apps.quality.models import DefectType, QualityInspection, QualityInspectionDefect


class QualityInspectionDefectInline(admin.TabularInline):
    model = QualityInspectionDefect
    extra = 0


@admin.register(DefectType)
class DefectTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "severity", "is_active", "updated_at")
    list_filter = ("severity", "is_active")
    search_fields = ("code", "name")


@admin.register(QualityInspection)
class QualityInspectionAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "date",
        "inspection_stage",
        "production_line",
        "inspector",
        "checked_qty",
        "defective_qty",
        "rejected_qty",
    )
    list_filter = ("date", "inspection_stage", "production_line")
    search_fields = ("order__order_code", "inspector__username", "barcode_value")
    inlines = (QualityInspectionDefectInline,)
