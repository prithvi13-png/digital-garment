from __future__ import annotations

from rest_framework import response, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from apps.core.permissions import ReportReadPermission, WorkerPermission, WorkerProductivityPermission
from apps.core.responses import paginated_payload
from apps.core.services import log_activity, log_instance_activity
from apps.productivity.filters import WorkerFilter, WorkerProductivityEntryFilter
from apps.productivity.models import Worker, WorkerProductivityEntry
from apps.productivity.serializers import (
    ProductivityLineSummarySerializer,
    ProductivityWorkerSummarySerializer,
    WorkerProductivityEntrySerializer,
    WorkerSerializer,
)
from apps.productivity.services import (
    line_productivity_summary,
    productivity_summary,
    worker_productivity_summary,
)


class ProductivityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


class WorkerViewSet(viewsets.ModelViewSet):
    queryset = Worker.objects.select_related("assigned_line")
    serializer_class = WorkerSerializer
    permission_classes = [WorkerPermission]
    filterset_class = WorkerFilter
    search_fields = ["worker_code", "name", "mobile", "skill_type", "barcode_value"]
    ordering_fields = ["worker_code", "name", "created_at", "updated_at"]

    def perform_create(self, serializer):
        worker = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="worker_created",
            instance=worker,
            description=f"Created worker {worker.worker_code} - {worker.name}.",
        )

    def perform_update(self, serializer):
        worker = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="worker_updated",
            instance=worker,
            description=f"Updated worker {worker.worker_code} - {worker.name}.",
        )

    def perform_destroy(self, instance):
        worker_id = instance.id
        worker_code = instance.worker_code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="worker_deleted",
            entity_type="Worker",
            entity_id=worker_id,
            description=f"Deleted worker {worker_code}.",
        )


class WorkerProductivityViewSet(viewsets.ModelViewSet):
    queryset = WorkerProductivityEntry.objects.select_related(
        "worker",
        "order",
        "order__buyer",
        "production_line",
        "created_by",
    )
    serializer_class = WorkerProductivityEntrySerializer
    permission_classes = [WorkerProductivityPermission]
    filterset_class = WorkerProductivityEntryFilter
    search_fields = [
        "worker__worker_code",
        "worker__name",
        "order__order_code",
        "order__style_name",
        "production_line__name",
        "remarks",
    ]
    ordering_fields = ["date", "created_at", "target_qty", "actual_qty"]

    def perform_create(self, serializer):
        entry = serializer.save(created_by=self.request.user)
        log_instance_activity(
            user=self.request.user,
            action="worker_productivity_entry_created",
            instance=entry,
            description=(
                f"Created worker productivity entry for {entry.worker.worker_code} on order "
                f"{entry.order.order_code} with actual {entry.actual_qty}."
            ),
        )

    def perform_update(self, serializer):
        entry = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="worker_productivity_entry_updated",
            instance=entry,
            description=f"Updated worker productivity entry #{entry.id}.",
        )

    def perform_destroy(self, instance):
        entry_id = instance.id
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="worker_productivity_entry_deleted",
            entity_type="WorkerProductivityEntry",
            entity_id=entry_id,
            description=f"Deleted worker productivity entry #{entry_id}.",
        )


class WorkerProductivitySummaryAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = WorkerProductivityEntry.objects.select_related(
            "worker",
            "order",
            "production_line",
            "created_by",
        )
        filterset = WorkerProductivityEntryFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        filtered_qs = filterset.qs
        summary = productivity_summary(filtered_qs)
        worker_rows = worker_productivity_summary(filtered_qs)
        line_rows = line_productivity_summary(filtered_qs)

        return response.Response(
            {
                "summary": summary,
                "worker_summary": ProductivityWorkerSummarySerializer(worker_rows, many=True).data,
                "line_summary": ProductivityLineSummarySerializer(line_rows, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class WorkerProductivityLineSummaryAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = WorkerProductivityEntry.objects.select_related("production_line")
        filterset = WorkerProductivityEntryFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = line_productivity_summary(filterset.qs)

        paginator = ProductivityPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = ProductivityLineSummarySerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={"total_lines": len(rows)},
            ),
            status=status.HTTP_200_OK,
        )


class WorkerProductivityWorkerSummaryAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = WorkerProductivityEntry.objects.select_related("worker")
        filterset = WorkerProductivityEntryFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = worker_productivity_summary(filterset.qs)

        paginator = ProductivityPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = ProductivityWorkerSummarySerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={"total_workers": len(rows)},
            ),
            status=status.HTTP_200_OK,
        )
