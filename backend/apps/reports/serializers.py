from rest_framework import serializers

from apps.orders.models import Order
from apps.production.models import ProductionEntry


class ProductionReportSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    buyer_name = serializers.CharField(source="order.buyer.company_name", read_only=True)
    line_name = serializers.CharField(source="production_line.name", read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    stage = serializers.CharField(source="order.current_stage", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    efficiency = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductionEntry
        fields = (
            "id",
            "date",
            "order",
            "order_code",
            "buyer_name",
            "line_name",
            "supervisor_name",
            "target_qty",
            "produced_qty",
            "rejected_qty",
            "efficiency",
            "stage",
            "order_status",
            "remarks",
            "created_at",
        )

    def get_supervisor_name(self, obj):
        return obj.supervisor.get_full_name() or obj.supervisor.username


class OrdersReportSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source="buyer.company_name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    produced_total = serializers.IntegerField(read_only=True)
    rejected_total = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_code",
            "buyer",
            "buyer_name",
            "style_name",
            "style_code",
            "quantity",
            "target_per_day",
            "delivery_date",
            "current_stage",
            "status",
            "priority",
            "produced_total",
            "rejected_total",
            "created_by_name",
            "created_at",
        )

    def get_created_by_name(self, obj):
        if obj.created_by is None:
            return "-"
        return obj.created_by.get_full_name() or obj.created_by.username
