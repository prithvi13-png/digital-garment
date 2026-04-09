from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.core.validators import validate_lte, validate_non_negative
from apps.orders.models import Order
from apps.production.models import ProductionEntry
from apps.production_lines.serializers import ProductionLineSerializer

User = get_user_model()


class OrderLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ("id", "order_code", "style_name", "current_stage", "status", "delivery_date")


class ProductionEntrySerializer(serializers.ModelSerializer):
    order_detail = OrderLiteSerializer(source="order", read_only=True)
    production_line_detail = ProductionLineSerializer(source="production_line", read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    efficiency = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductionEntry
        fields = (
            "id",
            "date",
            "production_line",
            "production_line_detail",
            "supervisor",
            "supervisor_name",
            "order",
            "order_detail",
            "target_qty",
            "produced_qty",
            "rejected_qty",
            "efficiency",
            "remarks",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "efficiency")

    def get_supervisor_name(self, obj):
        return obj.supervisor.get_full_name() or obj.supervisor.username

    def validate_target_qty(self, value):
        return validate_non_negative(value, field_label="Target quantity")

    def validate_produced_qty(self, value):
        return validate_non_negative(value, field_label="Produced quantity")

    def validate_rejected_qty(self, value):
        return validate_non_negative(value, field_label="Rejected quantity")

    def validate_supervisor(self, value):
        if value.role not in {value.Role.SUPERVISOR, value.Role.ADMIN}:
            raise serializers.ValidationError("Supervisor must have role Supervisor or Admin.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        produced_qty = attrs.get("produced_qty", getattr(self.instance, "produced_qty", 0))
        rejected_qty = attrs.get("rejected_qty", getattr(self.instance, "rejected_qty", 0))

        validate_lte(
            left_value=rejected_qty,
            right_value=produced_qty,
            left_field_label="Rejected quantity",
            right_field_label="Produced quantity",
            left_field_name="rejected_qty",
        )

        if request and request.user.role == request.user.Role.SUPERVISOR:
            supervisor = attrs.get("supervisor")
            if supervisor and supervisor != request.user:
                raise serializers.ValidationError(
                    {"supervisor": "Supervisors can only create/update entries for themselves."}
                )
            if self.instance and self.instance.supervisor_id != request.user.id:
                raise serializers.ValidationError(
                    {"detail": "Supervisors can only update their own production entries."}
                )

        return attrs
