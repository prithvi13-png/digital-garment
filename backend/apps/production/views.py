from rest_framework import viewsets

from apps.core.permissions import ProductionEntryPermission
from apps.core.services import log_activity, log_instance_activity
from apps.orders.services import sync_order_after_production_change, sync_order_status, sync_overdue_orders
from apps.production.filters import ProductionEntryFilter
from apps.production.models import ProductionEntry
from apps.production.serializers import ProductionEntrySerializer


class ProductionEntryViewSet(viewsets.ModelViewSet):
    queryset = ProductionEntry.objects.select_related(
        "order",
        "order__buyer",
        "production_line",
        "supervisor",
    )
    serializer_class = ProductionEntrySerializer
    permission_classes = [ProductionEntryPermission]
    filterset_class = ProductionEntryFilter
    search_fields = ["order__order_code", "order__style_name", "remarks", "supervisor__username"]
    ordering_fields = ["date", "created_at", "produced_qty", "rejected_qty"]

    def get_queryset(self):
        sync_overdue_orders()
        return super().get_queryset()

    def perform_create(self, serializer):
        supervisor = self.request.user if self.request.user.role == self.request.user.Role.SUPERVISOR else None
        entry = serializer.save(supervisor=supervisor or serializer.validated_data.get("supervisor"))
        sync_order_status(entry.order, has_production_started=True)

        log_instance_activity(
            user=self.request.user,
            action="production_entry_created",
            instance=entry,
            description=(
                f"Logged production for order {entry.order.order_code} on line {entry.production_line.name}. "
                f"Produced: {entry.produced_qty}, rejected: {entry.rejected_qty}."
            ),
        )

    def perform_update(self, serializer):
        entry = serializer.save()
        sync_order_status(entry.order, has_production_started=True)

        log_instance_activity(
            user=self.request.user,
            action="production_entry_updated",
            instance=entry,
            description=(
                f"Updated production entry {entry.id} for order {entry.order.order_code}. "
                f"Produced: {entry.produced_qty}, rejected: {entry.rejected_qty}."
            ),
        )

    def perform_destroy(self, instance):
        order = instance.order
        entry_id = instance.id
        order_code = order.order_code

        super().perform_destroy(instance)
        sync_order_after_production_change(order)

        log_activity(
            user=self.request.user,
            action="production_entry_deleted",
            entity_type="ProductionEntry",
            entity_id=entry_id,
            description=f"Deleted production entry {entry_id} for order {order_code}.",
        )
