from django.contrib import admin

from apps.core.models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity_type", "entity_id", "user", "created_at")
    list_filter = ("action", "entity_type", "created_at")
    search_fields = ("description", "action", "entity_type")
    readonly_fields = ("action", "entity_type", "entity_id", "description", "user", "created_at")
