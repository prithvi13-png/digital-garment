from __future__ import annotations

from datetime import datetime

from django.db.models import QuerySet
from django.utils.dateparse import parse_datetime
from rest_framework import response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from apps.crm.filters import (
    CRMAccountFilter,
    CRMActivityFilter,
    CRMContactFilter,
    CRMLeadFilter,
    CRMOpportunityFilter,
    CRMQuotationFilter,
    CRMTaskFilter,
)
from apps.crm.models import (
    CRMAccount,
    CRMActivity,
    CRMContact,
    CRMLead,
    CRMOption,
    CRMOpportunity,
    CRMPipeline,
    CRMPipelineStage,
    CRMQuotation,
    CRMTag,
    CRMTask,
    CRMCustomFieldDefinition,
    CRMKanbanBoardConfig,
    CRMNote,
)
from apps.crm.permissions import CRMDashboardPermission, CRMEntityPermission, CRMSettingsPermission
from apps.crm.selectors import (
    accounts_queryset,
    activities_queryset,
    contacts_queryset,
    crm_dashboard_summary,
    crm_filter_metadata,
    leads_queryset,
    opportunities_queryset,
    quotations_queryset,
    tasks_queryset,
)
from apps.crm.serializers import (
    CRMAccountSerializer,
    CRMActivitySerializer,
    CRMAssignmentSerializer,
    CRMBulkActionSerializer,
    CRMContactSerializer,
    CRMCustomFieldDefinitionSerializer,
    CRMKanbanMoveSerializer,
    CRMLeadConvertSerializer,
    CRMLeadSerializer,
    CRMNoteSerializer,
    CRMOpportunitySerializer,
    CRMOptionSerializer,
    CRMPipelineSerializer,
    CRMPipelineStageSerializer,
    CRMQuotationSerializer,
    CRMTagSerializer,
    CRMTaskSerializer,
    UserLiteSerializer,
)
from apps.crm.services import (
    apply_bulk_action,
    assign_record,
    convert_lead,
    fetch_timeline,
    get_kanban_board,
    get_organization_key_from_request,
    move_kanban_card,
)


class CRMBaseModelViewSet(viewsets.ModelViewSet):
    permission_classes = [CRMEntityPermission]

    def get_organization_key(self) -> str:
        return get_organization_key_from_request(self.request)

    def get_queryset(self) -> QuerySet:
        raise NotImplementedError

    def _base_write_kwargs(self) -> dict:
        org_key = self.get_organization_key()
        kwargs = {"organization_key": org_key}
        if "created_by" in {field.name for field in self.queryset.model._meta.fields}:
            kwargs["created_by"] = self.request.user
        if "updated_by" in {field.name for field in self.queryset.model._meta.fields}:
            kwargs["updated_by"] = self.request.user
        if "assigned_by" in {field.name for field in self.queryset.model._meta.fields}:
            kwargs["assigned_by"] = self.request.user
        return kwargs

    def perform_create(self, serializer):
        serializer.save(**self._base_write_kwargs())

    def perform_update(self, serializer):
        kwargs = {}
        if "updated_by" in {field.name for field in self.queryset.model._meta.fields}:
            kwargs["updated_by"] = self.request.user
        serializer.save(**kwargs)


class CRMLeadViewSet(CRMBaseModelViewSet):
    queryset = CRMLead.objects.all()
    serializer_class = CRMLeadSerializer
    filterset_class = CRMLeadFilter
    search_fields = [
        "lead_number",
        "first_name",
        "last_name",
        "company_name",
        "email",
        "phone",
        "source",
    ]
    ordering_fields = ["created_at", "updated_at", "expected_close_date", "lead_score", "estimated_value"]

    def get_queryset(self):
        return leads_queryset(self.get_organization_key())

    @action(detail=True, methods=["post"], url_path="convert")
    def convert(self, request, pk=None):
        lead = self.get_object()
        payload = CRMLeadConvertSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        result = convert_lead(
            lead=lead,
            actor=request.user,
            organization_key=self.get_organization_key(),
            account_name=payload.validated_data.get("account_name") or None,
            create_opportunity=payload.validated_data.get("create_opportunity", True),
            opportunity_name=payload.validated_data.get("opportunity_name") or None,
            pipeline_id=payload.validated_data.get("pipeline_id"),
        )

        return response.Response(
            {
                "lead": CRMLeadSerializer(result["lead"], context={"request": request}).data,
                "account": CRMAccountSerializer(result["account"], context={"request": request}).data,
                "contact": CRMContactSerializer(result["contact"], context={"request": request}).data,
                "opportunity": CRMOpportunitySerializer(result["opportunity"], context={"request": request}).data
                if result["opportunity"]
                else None,
            },
            status=status.HTTP_200_OK,
        )


class CRMAccountViewSet(CRMBaseModelViewSet):
    queryset = CRMAccount.objects.all()
    serializer_class = CRMAccountSerializer
    filterset_class = CRMAccountFilter
    search_fields = ["account_number", "name", "display_name", "email", "phone", "industry"]
    ordering_fields = ["created_at", "updated_at", "name", "annual_revenue"]

    def get_queryset(self):
        return accounts_queryset(self.get_organization_key())


class CRMContactViewSet(CRMBaseModelViewSet):
    queryset = CRMContact.objects.all()
    serializer_class = CRMContactSerializer
    filterset_class = CRMContactFilter
    search_fields = ["contact_number", "first_name", "last_name", "email", "phone", "designation"]
    ordering_fields = ["created_at", "updated_at", "first_name", "last_name"]

    def get_queryset(self):
        return contacts_queryset(self.get_organization_key())


class CRMOpportunityViewSet(CRMBaseModelViewSet):
    queryset = CRMOpportunity.objects.all()
    serializer_class = CRMOpportunitySerializer
    filterset_class = CRMOpportunityFilter
    search_fields = ["opportunity_number", "name", "linked_account__name", "description"]
    ordering_fields = ["created_at", "updated_at", "expected_close_date", "deal_value", "weighted_value", "probability"]

    def get_queryset(self):
        return opportunities_queryset(self.get_organization_key())


class CRMActivityViewSet(CRMBaseModelViewSet):
    queryset = CRMActivity.objects.all()
    serializer_class = CRMActivitySerializer
    filterset_class = CRMActivityFilter
    search_fields = ["subject", "description", "outcome"]
    ordering_fields = ["created_at", "updated_at", "due_at", "completed_at"]

    def get_queryset(self):
        return activities_queryset(self.get_organization_key())


class CRMTaskViewSet(CRMBaseModelViewSet):
    queryset = CRMTask.objects.all()
    serializer_class = CRMTaskSerializer
    filterset_class = CRMTaskFilter
    search_fields = ["task_number", "title", "description"]
    ordering_fields = ["created_at", "updated_at", "due_date", "priority", "status"]

    def get_queryset(self):
        return tasks_queryset(self.get_organization_key())


class CRMNoteViewSet(CRMBaseModelViewSet):
    queryset = CRMNote.objects.all()
    serializer_class = CRMNoteSerializer
    filterset_fields = ["related_lead", "related_account", "related_contact", "related_opportunity", "is_internal"]
    search_fields = ["body"]
    ordering_fields = ["created_at", "updated_at"]

    def get_queryset(self):
        return CRMNote.objects.filter(organization_key=self.get_organization_key()).select_related("created_by", "updated_by")


class CRMQuotationViewSet(CRMBaseModelViewSet):
    queryset = CRMQuotation.objects.all()
    serializer_class = CRMQuotationSerializer
    filterset_class = CRMQuotationFilter
    search_fields = ["quote_number", "notes", "related_opportunity__name", "related_account__name"]
    ordering_fields = ["created_at", "updated_at", "quote_date", "valid_until", "grand_total"]

    def get_queryset(self):
        return quotations_queryset(self.get_organization_key())


class CRMTagViewSet(CRMBaseModelViewSet):
    queryset = CRMTag.objects.all()
    serializer_class = CRMTagSerializer
    permission_classes = [CRMSettingsPermission]
    filterset_fields = ["is_active"]
    search_fields = ["name", "slug"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        return CRMTag.objects.filter(organization_key=self.get_organization_key())


class CRMPipelineViewSet(CRMBaseModelViewSet):
    queryset = CRMPipeline.objects.all()
    serializer_class = CRMPipelineSerializer
    permission_classes = [CRMSettingsPermission]
    filterset_fields = ["module_key", "is_active", "is_default"]
    search_fields = ["name", "description"]
    ordering_fields = ["sort_order", "created_at"]

    def get_queryset(self):
        return CRMPipeline.objects.filter(organization_key=self.get_organization_key()).prefetch_related("stages")


class CRMPipelineStageViewSet(CRMBaseModelViewSet):
    queryset = CRMPipelineStage.objects.all()
    serializer_class = CRMPipelineStageSerializer
    permission_classes = [CRMSettingsPermission]
    filterset_fields = ["pipeline", "is_active", "is_closed_won", "is_closed_lost"]
    search_fields = ["key", "name", "description"]
    ordering_fields = ["sort_order", "created_at"]

    def get_queryset(self):
        return CRMPipelineStage.objects.filter(organization_key=self.get_organization_key()).select_related("pipeline")


class CRMOptionViewSet(CRMBaseModelViewSet):
    queryset = CRMOption.objects.all()
    serializer_class = CRMOptionSerializer
    permission_classes = [CRMSettingsPermission]
    filterset_fields = ["category", "is_active"]
    search_fields = ["key", "label"]
    ordering_fields = ["sort_order", "created_at"]

    def get_queryset(self):
        return CRMOption.objects.filter(organization_key=self.get_organization_key())


class CRMCustomFieldDefinitionViewSet(CRMBaseModelViewSet):
    queryset = CRMCustomFieldDefinition.objects.all()
    serializer_class = CRMCustomFieldDefinitionSerializer
    permission_classes = [CRMSettingsPermission]
    filterset_fields = ["module_key", "entity_key", "is_active", "field_type"]
    search_fields = ["field_key", "label"]
    ordering_fields = ["sort_order", "created_at"]

    def get_queryset(self):
        return CRMCustomFieldDefinition.objects.filter(organization_key=self.get_organization_key())


class CRMKanbanBoardConfigViewSet(CRMBaseModelViewSet):
    queryset = CRMKanbanBoardConfig.objects.all()
    permission_classes = [CRMSettingsPermission]
    serializer_class = None  # overwritten in get_serializer_class
    filterset_fields = ["module_key"]

    def get_queryset(self):
        return CRMKanbanBoardConfig.objects.filter(organization_key=self.get_organization_key())

    def get_serializer_class(self):
        from rest_framework import serializers as drf_serializers

        class _Serializer(drf_serializers.ModelSerializer):
            class Meta:
                model = CRMKanbanBoardConfig
                fields = (
                    "id",
                    "module_key",
                    "card_layout",
                    "filter_schema",
                    "summary_schema",
                    "allow_card_reordering",
                    "show_aging",
                    "show_sla",
                    "show_blocked",
                    "load_more_size",
                    "created_at",
                    "updated_at",
                )
                read_only_fields = ("id", "created_at", "updated_at")

        return _Serializer


class CRMKanbanBoardAPIView(APIView):
    permission_classes = [CRMEntityPermission]

    def get(self, request, module_key: str):
        organization_key = get_organization_key_from_request(request)
        filters = {
            "pipeline_id": request.query_params.get("pipeline_id"),
            "search": request.query_params.get("search"),
            "owner": request.query_params.get("owner"),
            "priority": request.query_params.get("priority"),
            "status": request.query_params.get("status"),
            "source": request.query_params.get("source"),
            "is_open": request.query_params.get("is_open"),
        }
        tag_values = request.query_params.getlist("tags")
        filters["tags"] = [int(tag_id) for tag_id in tag_values if str(tag_id).isdigit()]

        page_size = int(request.query_params.get("page_size", "30"))
        board = get_kanban_board(
            module_key=module_key,
            organization_key=organization_key,
            filters=filters,
            page_size=max(10, min(page_size, 100)),
        )
        return response.Response(board, status=status.HTTP_200_OK)


class CRMKanbanMoveAPIView(APIView):
    permission_classes = [CRMEntityPermission]

    def post(self, request):
        payload = CRMKanbanMoveSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        data = payload.validated_data
        organization_key = data.get("organization_key") or get_organization_key_from_request(request)

        moved = move_kanban_card(
            module_key=data["module_key"],
            organization_key=organization_key,
            record_id=data["record_id"],
            to_stage_id=data["to_stage_id"],
            moved_by=request.user,
            reason=data.get("reason", ""),
            position=data.get("position"),
        )

        serializer_map = {
            "CRMLead": CRMLeadSerializer,
            "CRMOpportunity": CRMOpportunitySerializer,
            "CRMTask": CRMTaskSerializer,
        }
        serializer_class = serializer_map[moved.__class__.__name__]
        return response.Response(serializer_class(moved, context={"request": request}).data, status=status.HTTP_200_OK)


class CRMTimelineAPIView(APIView):
    permission_classes = [CRMEntityPermission]

    def get(self, request):
        organization_key = get_organization_key_from_request(request)
        entity_type = (request.query_params.get("entity_type") or "").strip().lower()
        entity_id = request.query_params.get("entity_id")
        limit = int(request.query_params.get("limit", "100"))

        if not entity_type or not entity_id or not entity_id.isdigit():
            return response.Response(
                {"detail": "entity_type and numeric entity_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        timeline = fetch_timeline(
            organization_key=organization_key,
            entity_type=entity_type,
            entity_id=int(entity_id),
            limit=max(10, min(limit, 300)),
        )
        return response.Response({"results": timeline}, status=status.HTTP_200_OK)


class CRMDashboardSummaryAPIView(APIView):
    permission_classes = [CRMDashboardPermission]

    def get(self, request):
        organization_key = get_organization_key_from_request(request)

        date_from = parse_datetime(request.query_params.get("date_from", "") or "")
        date_to = parse_datetime(request.query_params.get("date_to", "") or "")

        summary = crm_dashboard_summary(organization_key=organization_key, date_from=date_from, date_to=date_to)
        return response.Response(summary, status=status.HTTP_200_OK)


class CRMFilterMetadataAPIView(APIView):
    permission_classes = [CRMEntityPermission]

    def get(self, request):
        organization_key = get_organization_key_from_request(request)
        return response.Response(crm_filter_metadata(organization_key), status=status.HTTP_200_OK)


class CRMBulkActionAPIView(APIView):
    permission_classes = [CRMEntityPermission]

    def post(self, request):
        payload = CRMBulkActionSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        result = apply_bulk_action(
            module_key=data["module_key"],
            organization_key=data.get("organization_key") or get_organization_key_from_request(request),
            ids=data["ids"],
            action=data["action"],
            actor=request.user,
            payload=data.get("payload", {}),
        )
        return response.Response(result, status=status.HTTP_200_OK)


class CRMAssignmentAPIView(APIView):
    permission_classes = [CRMEntityPermission]

    def post(self, request):
        payload = CRMAssignmentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        assigned = assign_record(
            module_key=data["module_key"],
            organization_key=data.get("organization_key") or get_organization_key_from_request(request),
            record_id=data["record_id"],
            to_user_id=data["to_user_id"],
            actor=request.user,
            reason=data.get("reason", ""),
        )

        assignee = getattr(assigned, "assigned_to", None)
        return response.Response(
            {
                "record_id": assigned.id,
                "module_key": data["module_key"],
                "assigned_to": UserLiteSerializer(assignee).data if assignee else None,
            },
            status=status.HTTP_200_OK,
        )
