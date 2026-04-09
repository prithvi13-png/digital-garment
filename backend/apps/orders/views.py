from rest_framework import decorators, response, status, viewsets

from apps.core.permissions import IsAdminOrReadOnly
from apps.core.services import log_activity, log_instance_activity
from apps.orders.filters import OrderFilter
from apps.orders.models import Order
from apps.orders.serializers import OrderDetailSerializer, OrderSerializer
from apps.orders.services import get_order_production_summary, sync_overdue_orders


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("buyer", "created_by")
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = OrderFilter
    search_fields = ["order_code", "style_name", "style_code", "buyer__company_name", "buyer__name"]
    ordering_fields = ["delivery_date", "created_at", "priority", "status"]

    def get_queryset(self):
        sync_overdue_orders()
        return super().get_queryset()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        order = serializer.save(created_by=self.request.user)
        log_instance_activity(
            user=self.request.user,
            action="order_created",
            instance=order,
            description=f"Created order {order.order_code} for buyer {order.buyer.company_name}.",
        )

    def perform_update(self, serializer):
        previous_stage = serializer.instance.current_stage
        order = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="order_updated",
            instance=order,
            description=(
                f"Updated order {order.order_code}. Stage {previous_stage} -> {order.current_stage}, "
                f"status is now {order.status}."
            ),
        )

    def perform_destroy(self, instance):
        order_id = instance.id
        order_code = instance.order_code
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="order_deleted",
            entity_type="Order",
            entity_id=order_id,
            description=f"Deleted order {order_code}.",
        )

    @decorators.action(detail=True, methods=["get"], url_path="production-summary")
    def production_summary(self, request, pk=None):
        order = self.get_object()
        summary = get_order_production_summary(order)

        return response.Response(
            {
                "order_id": order.id,
                "order_code": order.order_code,
                "summary": summary,
            },
            status=status.HTTP_200_OK,
        )
