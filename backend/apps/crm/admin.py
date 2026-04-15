from django.contrib import admin

from apps.crm import models


@admin.register(models.CRMLead)
class CRMLeadAdmin(admin.ModelAdmin):
    list_display = ("id", "lead_number", "first_name", "last_name", "status", "assigned_to", "created_at")
    search_fields = ("lead_number", "first_name", "last_name", "email", "phone", "company_name")
    list_filter = ("status", "priority", "source", "is_converted", "is_archived")


@admin.register(models.CRMOpportunity)
class CRMOpportunityAdmin(admin.ModelAdmin):
    list_display = ("id", "opportunity_number", "name", "deal_value", "stage", "assigned_to", "created_at")
    search_fields = ("opportunity_number", "name")
    list_filter = ("priority", "is_won", "is_lost", "is_archived")


admin.site.register(models.CRMAccount)
admin.site.register(models.CRMContact)
admin.site.register(models.CRMActivity)
admin.site.register(models.CRMTask)
admin.site.register(models.CRMNote)
admin.site.register(models.CRMQuotation)
admin.site.register(models.CRMQuotationItem)
admin.site.register(models.CRMTag)
admin.site.register(models.CRMPipeline)
admin.site.register(models.CRMPipelineStage)
admin.site.register(models.CRMOption)
admin.site.register(models.CRMCustomFieldDefinition)
admin.site.register(models.CRMCustomFieldValue)
admin.site.register(models.CRMKanbanBoardConfig)
admin.site.register(models.CRMAuditEvent)
admin.site.register(models.CRMStageTransitionHistory)
admin.site.register(models.CRMAssignmentHistory)
admin.site.register(models.CRMReminder)
admin.site.register(models.CRMImportJob)
