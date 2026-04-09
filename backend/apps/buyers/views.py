from rest_framework import viewsets

from apps.buyers.models import Buyer
from apps.buyers.serializers import BuyerSerializer
from apps.core.permissions import IsAdminOrReadOnly
from apps.core.services import log_activity, log_instance_activity


class BuyerViewSet(viewsets.ModelViewSet):
    queryset = Buyer.objects.all()
    serializer_class = BuyerSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ["company_name"]
    search_fields = ["name", "company_name", "email", "phone"]
    ordering_fields = ["created_at", "name", "company_name"]

    def perform_create(self, serializer):
        buyer = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="buyer_created",
            instance=buyer,
            description=f"Created buyer {buyer.company_name}.",
        )

    def perform_update(self, serializer):
        buyer = serializer.save()
        log_instance_activity(
            user=self.request.user,
            action="buyer_updated",
            instance=buyer,
            description=f"Updated buyer {buyer.company_name}.",
        )

    def perform_destroy(self, instance):
        buyer_id = instance.id
        buyer_name = instance.company_name
        super().perform_destroy(instance)
        log_activity(
            user=self.request.user,
            action="buyer_deleted",
            entity_type="Buyer",
            entity_id=buyer_id,
            description=f"Deleted buyer {buyer_name}.",
        )
