from rest_framework import viewsets

from apps.core.permissions import IsAdminOrReadOnly
from apps.core.services import log_activity, log_instance_activity
from apps.production_lines.models import ProductionLine
from apps.production_lines.serializers import ProductionLineSerializer


class ProductionLineViewSet(viewsets.ModelViewSet):
    queryset = ProductionLine.objects.all()
    serializer_class = ProductionLineSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        line = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="line_created",
            instance=line,
            description=f"Created production line {line.name}.",
        )

    def perform_update(self, serializer):
        line = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="line_updated",
            instance=line,
            description=f"Updated production line {line.name}.",
        )

    def perform_destroy(self, instance):
        line_id = instance.id
        line_name = instance.name
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="line_deleted",
            entity_type="ProductionLine",
            entity_id=line_id,
            description=f"Deleted production line {line_name}.",
        )
