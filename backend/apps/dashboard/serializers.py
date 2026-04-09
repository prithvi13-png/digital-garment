from rest_framework import serializers

from apps.core.models import ActivityLog
from apps.orders.models import Order


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = (
            "id",
            "action",
            "entity_type",
            "entity_id",
            "description",
            "user_name",
            "created_at",
        )

    def get_user_name(self, obj):
        if obj.user is None:
            return "System"
        return obj.user.get_full_name() or obj.user.username


class RecentOrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.company_name", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_code",
            "style_name",
            "buyer_name",
            "quantity",
            "delivery_date",
            "current_stage",
            "status",
            "priority",
        )


class LinePerformanceQuerySerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be greater than or equal to start date."})
        return attrs


class RecentActivityQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)
