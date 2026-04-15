from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.crm.views import (
    CRMAccountViewSet,
    CRMActivityViewSet,
    CRMAssignmentAPIView,
    CRMBulkActionAPIView,
    CRMContactViewSet,
    CRMCustomFieldDefinitionViewSet,
    CRMDashboardSummaryAPIView,
    CRMFilterMetadataAPIView,
    CRMKanbanBoardAPIView,
    CRMKanbanBoardConfigViewSet,
    CRMKanbanMoveAPIView,
    CRMLeadViewSet,
    CRMNoteViewSet,
    CRMOpportunityViewSet,
    CRMOptionViewSet,
    CRMPipelineStageViewSet,
    CRMPipelineViewSet,
    CRMQuotationViewSet,
    CRMTagViewSet,
    CRMTaskViewSet,
    CRMTimelineAPIView,
)

router = DefaultRouter()
router.register("leads", CRMLeadViewSet, basename="crm-leads")
router.register("accounts", CRMAccountViewSet, basename="crm-accounts")
router.register("contacts", CRMContactViewSet, basename="crm-contacts")
router.register("opportunities", CRMOpportunityViewSet, basename="crm-opportunities")
router.register("activities", CRMActivityViewSet, basename="crm-activities")
router.register("tasks", CRMTaskViewSet, basename="crm-tasks")
router.register("notes", CRMNoteViewSet, basename="crm-notes")
router.register("quotations", CRMQuotationViewSet, basename="crm-quotations")
router.register("tags", CRMTagViewSet, basename="crm-tags")
router.register("pipelines", CRMPipelineViewSet, basename="crm-pipelines")
router.register("pipeline-stages", CRMPipelineStageViewSet, basename="crm-pipeline-stages")
router.register("options", CRMOptionViewSet, basename="crm-options")
router.register("custom-fields", CRMCustomFieldDefinitionViewSet, basename="crm-custom-fields")
router.register("kanban-config", CRMKanbanBoardConfigViewSet, basename="crm-kanban-config")

urlpatterns = [
    path("kanban/boards/<str:module_key>/", CRMKanbanBoardAPIView.as_view(), name="crm-kanban-board"),
    path("kanban/move/", CRMKanbanMoveAPIView.as_view(), name="crm-kanban-move"),
    path("timeline/", CRMTimelineAPIView.as_view(), name="crm-timeline"),
    path("dashboard/summary/", CRMDashboardSummaryAPIView.as_view(), name="crm-dashboard-summary"),
    path("filters/metadata/", CRMFilterMetadataAPIView.as_view(), name="crm-filter-metadata"),
    path("bulk-actions/", CRMBulkActionAPIView.as_view(), name="crm-bulk-actions"),
    path("assign/", CRMAssignmentAPIView.as_view(), name="crm-assign"),
    path("", include(router.urls)),
]
