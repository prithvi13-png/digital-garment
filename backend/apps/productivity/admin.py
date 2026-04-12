from django.contrib import admin

from apps.productivity.models import Worker, WorkerProductivityEntry


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("worker_code", "name", "skill_type", "assigned_line", "is_active", "updated_at")
    list_filter = ("is_active", "assigned_line")
    search_fields = ("worker_code", "name", "mobile", "barcode_value")


@admin.register(WorkerProductivityEntry)
class WorkerProductivityEntryAdmin(admin.ModelAdmin):
    list_display = ("worker", "date", "order", "production_line", "target_qty", "actual_qty", "rework_qty")
    list_filter = ("date", "production_line")
    search_fields = ("worker__worker_code", "worker__name", "order__order_code")
