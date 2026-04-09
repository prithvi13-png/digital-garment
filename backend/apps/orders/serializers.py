from rest_framework import serializers

from apps.accounts.serializers import MeSerializer
from apps.buyers.serializers import BuyerSerializer
from apps.core.validators import validate_non_negative, validate_positive
from apps.orders.models import Order
from apps.orders.services import get_order_production_summary


class OrderSerializer(serializers.ModelSerializer):
    buyer_detail = BuyerSerializer(source="buyer", read_only=True)
    created_by_detail = MeSerializer(source="created_by", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_code",
            "buyer",
            "buyer_detail",
            "style_name",
            "style_code",
            "quantity",
            "target_per_day",
            "delivery_date",
            "current_stage",
            "status",
            "priority",
            "notes",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "order_code",
            "status",
            "created_by",
            "created_at",
            "updated_at",
        )

    def validate_quantity(self, value):
        return validate_positive(value, field_label="Quantity")

    def validate_target_per_day(self, value):
        return validate_non_negative(value, field_label="Target per day", allow_none=True)


class OrderProductionSummarySerializer(serializers.Serializer):
    total_target_qty = serializers.IntegerField()
    total_produced_qty = serializers.IntegerField()
    total_rejected_qty = serializers.IntegerField()
    total_entries = serializers.IntegerField()


class OrderDetailSerializer(OrderSerializer):
    production_summary = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ("production_summary",)

    def get_production_summary(self, obj):
        return get_order_production_summary(obj)
