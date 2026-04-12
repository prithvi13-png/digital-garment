from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.utils.dateparse import parse_date
from rest_framework import decorators, response, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from apps.core.permissions import (
    InventoryMaterialPermission,
    MaterialInwardPermission,
    MaterialIssuePermission,
    ReportReadPermission,
    StockAdjustmentPermission,
)
from apps.core.responses import paginated_payload
from apps.core.services import log_activity, log_instance_activity
from apps.inventory.filters import (
    MaterialFilter,
    MaterialStockInwardFilter,
    MaterialStockIssueFilter,
    StockAdjustmentFilter,
)
from apps.inventory.models import Material, MaterialStockInward, MaterialStockIssue, StockAdjustment
from apps.inventory.serializers import (
    ConsumptionVarianceRowSerializer,
    MaterialMovementSerializer,
    MaterialSerializer,
    MaterialStockInwardSerializer,
    MaterialStockIssueSerializer,
    MaterialStockSummaryRowSerializer,
    StockAdjustmentSerializer,
)
from apps.inventory.services import (
    build_consumption_variance_rows,
    build_low_stock_rows,
    build_material_stock_rows,
    get_material_movements,
    get_material_stock_breakdown_map,
    summarize_consumption_rows,
    summarize_inventory_rows,
    summarize_movements,
)


class InventoryPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


def _decimal_param(value: str | None, *, default: Decimal) -> Decimal:
    if value in (None, ""):
        return default
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError):
        return default


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [InventoryMaterialPermission]
    filterset_class = MaterialFilter
    search_fields = ["code", "name", "barcode_value"]
    ordering_fields = ["created_at", "updated_at", "code", "name"]

    def _serializer_with_stock_map(self, objects, *, many: bool):
        object_list = list(objects) if many else [objects]
        stock_map = get_material_stock_breakdown_map([obj.id for obj in object_list])
        context = {**self.get_serializer_context(), "stock_map": stock_map}
        return self.get_serializer(objects, many=many, context=context)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self._serializer_with_stock_map(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self._serializer_with_stock_map(queryset, many=True)
        return response.Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self._serializer_with_stock_map(instance, many=False)
        return response.Response(serializer.data)

    def perform_create(self, serializer):
        material = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="material_created",
            instance=material,
            description=f"Created material {material.code} - {material.name}.",
        )

    def perform_update(self, serializer):
        material = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="material_updated",
            instance=material,
            description=f"Updated material {material.code} - {material.name}.",
        )

    def perform_destroy(self, instance):
        material_id = instance.id
        material_code = instance.code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="material_deleted",
            entity_type="Material",
            entity_id=material_id,
            description=f"Deleted material {material_code}.",
        )

    @decorators.action(detail=False, methods=["get"], url_path="stock-summary")
    def stock_summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        rows = build_material_stock_rows(queryset)
        threshold = _decimal_param(request.query_params.get("low_stock_threshold"), default=Decimal("100"))

        for row in rows:
            row["is_low_stock"] = row["current_stock"] <= threshold

        paginator = InventoryPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = MaterialStockSummaryRowSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summarize_inventory_rows(rows, low_stock_threshold=threshold),
            )
        )

    @decorators.action(detail=True, methods=["get"], url_path="movements")
    def movements(self, request, pk=None):
        material = self.get_object()
        rows = get_material_movements(
            material_id=material.id,
            date_from=parse_date(request.query_params.get("date_from", ""))
            if request.query_params.get("date_from")
            else None,
            date_to=parse_date(request.query_params.get("date_to", ""))
            if request.query_params.get("date_to")
            else None,
        )

        paginator = InventoryPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = MaterialMovementSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summarize_movements(rows),
            )
        )


class MaterialStockInwardViewSet(viewsets.ModelViewSet):
    queryset = MaterialStockInward.objects.select_related("material", "created_by")
    serializer_class = MaterialStockInwardSerializer
    permission_classes = [MaterialInwardPermission]
    filterset_class = MaterialStockInwardFilter
    search_fields = ["material__code", "material__name", "supplier_name", "batch_no", "roll_no", "remarks"]
    ordering_fields = ["inward_date", "created_at", "quantity", "rate"]

    def perform_create(self, serializer):
        inward = serializer.save(created_by=self.request.user)
        log_instance_activity(
            user=self.request.user,
            action="material_inward_created",
            instance=inward,
            description=f"Created inward entry for material {inward.material.code} with quantity {inward.quantity}.",
        )

    def perform_update(self, serializer):
        inward = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="material_inward_updated",
            instance=inward,
            description=f"Updated inward entry #{inward.id} for material {inward.material.code}.",
        )

    def perform_destroy(self, instance):
        inward_id = instance.id
        material_code = instance.material.code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="material_inward_deleted",
            entity_type="MaterialStockInward",
            entity_id=inward_id,
            description=f"Deleted inward entry #{inward_id} for material {material_code}.",
        )


class MaterialStockIssueViewSet(viewsets.ModelViewSet):
    queryset = MaterialStockIssue.objects.select_related(
        "material",
        "order",
        "order__buyer",
        "production_line",
        "created_by",
    )
    serializer_class = MaterialStockIssueSerializer
    permission_classes = [MaterialIssuePermission]
    filterset_class = MaterialStockIssueFilter
    search_fields = [
        "material__code",
        "material__name",
        "order__order_code",
        "production_line__name",
        "issued_to",
        "remarks",
    ]
    ordering_fields = ["issue_date", "created_at", "quantity"]

    def perform_create(self, serializer):
        issue = serializer.save(created_by=self.request.user)
        log_instance_activity(
            user=self.request.user,
            action="material_issue_created",
            instance=issue,
            description=f"Issued material {issue.material.code} quantity {issue.quantity}.",
        )

    def perform_update(self, serializer):
        issue = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="material_issue_updated",
            instance=issue,
            description=f"Updated issue entry #{issue.id} for material {issue.material.code}.",
        )

    def perform_destroy(self, instance):
        issue_id = instance.id
        material_code = instance.material.code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="material_issue_deleted",
            entity_type="MaterialStockIssue",
            entity_id=issue_id,
            description=f"Deleted issue entry #{issue_id} for material {material_code}.",
        )


class StockAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = StockAdjustment.objects.select_related("material", "created_by")
    serializer_class = StockAdjustmentSerializer
    permission_classes = [StockAdjustmentPermission]
    filterset_class = StockAdjustmentFilter
    search_fields = ["material__code", "material__name", "reason"]
    ordering_fields = ["adjustment_date", "created_at", "quantity"]

    def perform_create(self, serializer):
        adjustment = serializer.save(created_by=self.request.user)
        log_instance_activity(
            user=self.request.user,
            action="stock_adjusted",
            instance=adjustment,
            description=(
                f"Stock {adjustment.adjustment_type} for {adjustment.material.code} by {adjustment.quantity}."
            ),
        )

    def perform_update(self, serializer):
        adjustment = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="stock_adjustment_updated",
            instance=adjustment,
            description=f"Updated stock adjustment #{adjustment.id} for {adjustment.material.code}.",
        )

    def perform_destroy(self, instance):
        adjustment_id = instance.id
        material_code = instance.material.code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="stock_adjustment_deleted",
            entity_type="StockAdjustment",
            entity_id=adjustment_id,
            description=f"Deleted stock adjustment #{adjustment_id} for material {material_code}.",
        )


class InventoryStockSummaryAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        filterset = MaterialFilter(data=request.query_params, queryset=Material.objects.all())
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)
        queryset = filterset.qs
        rows = build_material_stock_rows(queryset)
        threshold = _decimal_param(request.query_params.get("low_stock_threshold"), default=Decimal("100"))

        for row in rows:
            row["is_low_stock"] = row["current_stock"] <= threshold

        paginator = InventoryPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = MaterialStockSummaryRowSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summarize_inventory_rows(rows, low_stock_threshold=threshold),
            ),
            status=status.HTTP_200_OK,
        )


class InventoryStockMovementsAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        material_id = request.query_params.get("material")
        parsed_material_id = None
        if material_id:
            try:
                parsed_material_id = int(material_id)
            except ValueError:
                return response.Response(
                    {"material": "Material must be a valid numeric id."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        rows = get_material_movements(
            material_id=parsed_material_id,
            date_from=parse_date(request.query_params.get("date_from", ""))
            if request.query_params.get("date_from")
            else None,
            date_to=parse_date(request.query_params.get("date_to", ""))
            if request.query_params.get("date_to")
            else None,
        )

        paginator = InventoryPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = MaterialMovementSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summarize_movements(rows),
            ),
            status=status.HTTP_200_OK,
        )


class InventoryLowStockAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        filterset = MaterialFilter(data=request.query_params, queryset=Material.objects.all())
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)
        queryset = filterset.qs
        threshold = _decimal_param(request.query_params.get("low_stock_threshold"), default=Decimal("100"))
        rows = build_low_stock_rows(queryset, low_stock_threshold=threshold)

        paginator = InventoryPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = MaterialStockSummaryRowSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={
                    "low_stock_count": len(rows),
                    "low_stock_threshold": threshold,
                },
            ),
            status=status.HTTP_200_OK,
        )


class InventoryConsumptionVarianceAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = MaterialStockIssue.objects.select_related(
            "material",
            "order",
            "order__buyer",
            "production_line",
            "created_by",
        )
        filterset = MaterialStockIssueFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = build_consumption_variance_rows(filterset.qs)

        paginator = InventoryPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = ConsumptionVarianceRowSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summarize_consumption_rows(rows),
            ),
            status=status.HTTP_200_OK,
        )
