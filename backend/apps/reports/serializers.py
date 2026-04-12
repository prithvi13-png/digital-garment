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


class InventoryReportRowSerializer(serializers.Serializer):
    material_id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    material_type = serializers.CharField()
    unit = serializers.CharField()
    is_active = serializers.BooleanField()
    inward_total = serializers.DecimalField(max_digits=14, decimal_places=3)
    issued_total = serializers.DecimalField(max_digits=14, decimal_places=3)
    adjustment_increase_total = serializers.DecimalField(max_digits=14, decimal_places=3)
    adjustment_decrease_total = serializers.DecimalField(max_digits=14, decimal_places=3)
    current_stock = serializers.DecimalField(max_digits=14, decimal_places=3)


class ConsumptionReportRowSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(allow_null=True)
    order_code = serializers.CharField(allow_null=True)
    buyer_name = serializers.CharField(allow_null=True)
    material_id = serializers.IntegerField(allow_null=True)
    material_code = serializers.CharField(allow_null=True)
    material_name = serializers.CharField(allow_null=True)
    unit = serializers.CharField(allow_null=True)
    actual_consumption = serializers.DecimalField(max_digits=14, decimal_places=3)
    expected_consumption = serializers.DecimalField(max_digits=14, decimal_places=3, allow_null=True)
    variance = serializers.DecimalField(max_digits=14, decimal_places=3, allow_null=True)
    wastage_percent = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)


class ProductivityReportRowSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField(allow_null=True)
    worker_code = serializers.CharField(allow_null=True)
    worker_name = serializers.CharField(allow_null=True)
    order_id = serializers.IntegerField(allow_null=True)
    order_code = serializers.CharField(allow_null=True)
    line_id = serializers.IntegerField(allow_null=True)
    line_name = serializers.CharField(allow_null=True)
    total_entries = serializers.IntegerField()
    total_target = serializers.IntegerField()
    total_actual = serializers.IntegerField()
    total_rework = serializers.IntegerField()
    efficiency = serializers.FloatField()


class QualityReportRowSerializer(serializers.Serializer):
    inspection_id = serializers.IntegerField()
    date = serializers.DateField()
    order_id = serializers.IntegerField(allow_null=True)
    order_code = serializers.CharField(allow_null=True)
    line_id = serializers.IntegerField(allow_null=True)
    line_name = serializers.CharField(allow_null=True)
    inspector_id = serializers.IntegerField(allow_null=True)
    inspector_name = serializers.CharField(allow_null=True)
    inspection_stage = serializers.CharField()
    checked_qty = serializers.IntegerField()
    defective_qty = serializers.IntegerField()
    rejected_qty = serializers.IntegerField()
    rework_qty = serializers.IntegerField()
    defect_rate = serializers.FloatField()
    rejection_rate = serializers.FloatField()


class PlanningReportRowSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    order_id = serializers.IntegerField()
    order_code = serializers.CharField()
    line_id = serializers.IntegerField()
    line_name = serializers.CharField()
    planned_start_date = serializers.DateField()
    planned_end_date = serializers.DateField()
    planned_daily_target = serializers.IntegerField()
    planned_total_qty = serializers.IntegerField()
    actual_total_qty = serializers.IntegerField()
    variance_qty = serializers.IntegerField()
    achievement_percent = serializers.FloatField()
    plan_status = serializers.CharField()
