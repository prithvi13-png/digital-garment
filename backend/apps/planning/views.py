from __future__ import annotations

from rest_framework import response, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView

from apps.core.permissions import ProductionPlanPermission, ReportReadPermission
from apps.core.responses import paginated_payload
from apps.core.services import log_activity, log_instance_activity
from apps.planning.filters import ProductionPlanFilter
from apps.planning.models import ProductionPlan
from apps.planning.serializers import (
    PlannedVsActualRowSerializer,
    ProductionPlanCalendarSerializer,
    ProductionPlanSerializer,
)
from apps.planning.services import (
    get_planned_vs_actual_rows,
    planning_calendar_rows,
    planning_summary,
)


class PlanningPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


class ProductionPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductionPlan.objects.select_related("order", "order__buyer", "production_line", "created_by")
    serializer_class = ProductionPlanSerializer
    permission_classes = [ProductionPlanPermission]
    filterset_class = ProductionPlanFilter
    search_fields = ["order__order_code", "order__style_name", "production_line__name", "remarks"]
    ordering_fields = ["planned_start_date", "planned_end_date", "created_at", "planned_total_qty"]

    def perform_create(self, serializer):
        plan = serializer.save(created_by=self.request.user)
        log_instance_activity(
            user=self.request.user,
            action="production_plan_created",
            instance=plan,
            description=(
                f"Created production plan for order {plan.order.order_code} on line {plan.production_line.name}."
            ),
        )

    def perform_update(self, serializer):
        plan = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="production_plan_updated",
            instance=plan,
            description=f"Updated production plan #{plan.id}.",
        )

    def perform_destroy(self, instance):
        plan_id = instance.id
        order_code = instance.order.order_code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="production_plan_deleted",
            entity_type="ProductionPlan",
            entity_id=plan_id,
            description=f"Deleted production plan #{plan_id} for order {order_code}.",
        )


class ProductionPlanCalendarAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = ProductionPlan.objects.select_related("order", "production_line")
        filterset = ProductionPlanFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = planning_calendar_rows(filterset.qs)

        paginator = PlanningPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = ProductionPlanCalendarSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={"total_plans": len(rows)},
            ),
            status=status.HTTP_200_OK,
        )


class ProductionPlanPlannedVsActualAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = ProductionPlan.objects.select_related("order", "production_line")
        filterset = ProductionPlanFilter(data=request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return response.Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)

        rows = get_planned_vs_actual_rows(filterset.qs)

        paginator = PlanningPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = PlannedVsActualRowSerializer(page, many=True)

        return response.Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=planning_summary(rows),
            ),
            status=status.HTTP_200_OK,
        )
