from __future__ import annotations

from rest_framework import response, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from apps.core.permissions import DefectTypePermission, QualityInspectionPermission, ReportReadPermission
from apps.core.responses import paginated_payload
from apps.core.services import log_activity, log_instance_activity
from apps.quality.filters import DefectTypeFilter, QualityInspectionFilter
from apps.quality.models import DefectType, QualityInspection
from apps.quality.serializers import (
    DefectTrendSerializer,
    DefectTypeSerializer,
    QualityInspectionReadSerializer,
    QualityInspectionWriteSerializer,
    RejectionTrendSerializer,
)
from apps.quality.services import defect_trends, quality_summary, rejection_trends


class QualityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


class DefectTypeViewSet(viewsets.ModelViewSet):
    queryset = DefectType.objects.all()
    serializer_class = DefectTypeSerializer
    permission_classes = [DefectTypePermission]
    filterset_class = DefectTypeFilter
    search_fields = ["name", "code", "description"]
    ordering_fields = ["name", "severity", "created_at"]

    def perform_create(self, serializer):
        defect_type = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="defect_type_created",
            instance=defect_type,
            description=f"Created defect type {defect_type.code} - {defect_type.name}.",
        )

    def perform_update(self, serializer):
        defect_type = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="defect_type_updated",
            instance=defect_type,
            description=f"Updated defect type {defect_type.code} - {defect_type.name}.",
        )

    def perform_destroy(self, instance):
        defect_type_id = instance.id
        defect_code = instance.code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="defect_type_deleted",
            entity_type="DefectType",
            entity_id=defect_type_id,
            description=f"Deleted defect type {defect_code}.",
        )


class QualityInspectionViewSet(viewsets.ModelViewSet):
    queryset = QualityInspection.objects.select_related(
        "order",
        "order__buyer",
        "production_line",
        "inspector",
    ).prefetch_related("defects", "defects__defect_type")
    permission_classes = [QualityInspectionPermission]
    filterset_class = QualityInspectionFilter
    search_fields = ["order__order_code", "order__style_name", "production_line__name", "remarks", "barcode_value"]
    ordering_fields = ["date", "created_at", "checked_qty", "defective_qty", "rejected_qty"]

    def get_serializer_class(self):
        if self.action in {"list", "retrieve"}:
            return QualityInspectionReadSerializer
        return QualityInspectionWriteSerializer

    def perform_create(self, serializer):
        inspection = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="quality_inspection_created",
            instance=inspection,
            description=(
                f"Created quality inspection for order {inspection.order.order_code} at "
                f"stage {inspection.inspection_stage}."
            ),
        )

    def perform_update(self, serializer):
        inspection = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="quality_inspection_updated",
            instance=inspection,
            description=f"Updated quality inspection #{inspection.id}.",
        )

    def perform_destroy(self, instance):
        inspection_id = instance.id
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="quality_inspection_deleted",
            entity_type="QualityInspection",
            entity_id=inspection_id,
            description=f"Deleted quality inspection #{inspection_id}.",
        )


class QualityInspectionSummaryAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = QualityInspection.objects.select_related("order", "production_line", "inspector").prefetch_related(
            "defects",
            "defects__defect_type",
        )
        filterset = QualityInspectionFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        filtered_qs = filterset.qs
        return response.Response(
            {
                "summary": quality_summary(filtered_qs),
                "top_defects": DefectTrendSerializer(defect_trends(filtered_qs)[:10], many=True).data,
                "rejection_trends": RejectionTrendSerializer(rejection_trends(filtered_qs), many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class QualityInspectionDefectTrendsAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = QualityInspection.objects.prefetch_related("defects", "defects__defect_type")
        filterset = QualityInspectionFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = defect_trends(filterset.qs)

        paginator = QualityPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = DefectTrendSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={"total_defect_types": len(rows)},
            ),
            status=status.HTTP_200_OK,
        )


class QualityInspectionRejectionTrendsAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = QualityInspection.objects.all()
        filterset = QualityInspectionFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = rejection_trends(filterset.qs)

        paginator = QualityPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = RejectionTrendSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={"total_days": len(rows)},
            ),
            status=status.HTTP_200_OK,
        )
