from rest_framework import serializers

from apps.accounts.serializers import MeSerializer
from apps.productivity.models import Worker, WorkerProductivityEntry


class WorkerSerializer(serializers.ModelSerializer):
    assigned_line_name = serializers.CharField(source="assigned_line.name", read_only=True)

    class Meta:
        model = Worker
        fields = (
            "id",
            "worker_code",
            "name",
            "mobile",
            "skill_type",
            "assigned_line",
            "assigned_line_name",
            "barcode_value",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value: str) -> str:
        if not value or not value.strip():
            raise serializers.ValidationError("Worker name is required.")
        return value.strip()


class WorkerProductivityEntrySerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.name", read_only=True)
    worker_code = serializers.CharField(source="worker.worker_code", read_only=True)
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    line_name = serializers.CharField(source="production_line.name", read_only=True)
    created_by_detail = MeSerializer(source="created_by", read_only=True)
    efficiency = serializers.FloatField(read_only=True)

    class Meta:
        model = WorkerProductivityEntry
        fields = (
            "id",
            "worker",
            "worker_name",
            "worker_code",
            "order",
            "order_code",
            "production_line",
            "line_name",
            "date",
            "target_qty",
            "actual_qty",
            "rework_qty",
            "efficiency",
            "remarks",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "efficiency",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )

    def validate_target_qty(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Target quantity must be greater than zero.")
        return value

    def validate_actual_qty(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Actual quantity cannot be negative.")
        return value

    def validate_rework_qty(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Rework quantity cannot be negative.")
        return value

    def validate(self, attrs):
        target_qty = attrs.get("target_qty", self.instance.target_qty if self.instance else None)
        actual_qty = attrs.get("actual_qty", self.instance.actual_qty if self.instance else None)
        rework_qty = attrs.get("rework_qty", self.instance.rework_qty if self.instance else None)

        if target_qty is None:
            raise serializers.ValidationError({"target_qty": "Target quantity is required."})

        if actual_qty is None:
            raise serializers.ValidationError({"actual_qty": "Actual quantity is required."})

        if rework_qty is None:
            raise serializers.ValidationError({"rework_qty": "Rework quantity is required."})

        if rework_qty > actual_qty:
            raise serializers.ValidationError({"rework_qty": "Rework quantity cannot exceed actual quantity."})

        return attrs


class ProductivityLineSummarySerializer(serializers.Serializer):
    line_id = serializers.IntegerField(allow_null=True)
    line_name = serializers.CharField(allow_null=True)
    total_entries = serializers.IntegerField()
    total_target = serializers.IntegerField()
    total_actual = serializers.IntegerField()
    total_rework = serializers.IntegerField()
    efficiency = serializers.FloatField()


class ProductivityWorkerSummarySerializer(serializers.Serializer):
    worker_id = serializers.IntegerField(allow_null=True)
    worker_code = serializers.CharField(allow_null=True)
    worker_name = serializers.CharField(allow_null=True)
    total_entries = serializers.IntegerField()
    total_target = serializers.IntegerField()
    total_actual = serializers.IntegerField()
    total_rework = serializers.IntegerField()
    efficiency = serializers.FloatField()


class WorkerOrderOutputSerializer(serializers.Serializer):
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
