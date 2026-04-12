from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.serializers import MeSerializer
from apps.planning.models import ProductionPlan


class ProductionPlanSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    line_name = serializers.CharField(source="production_line.name", read_only=True)
    created_by_detail = MeSerializer(source="created_by", read_only=True)

    class Meta:
        model = ProductionPlan
        fields = (
            "id",
            "order",
            "order_code",
            "production_line",
            "line_name",
            "planned_start_date",
            "planned_end_date",
            "planned_daily_target",
            "planned_total_qty",
            "remarks",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_detail", "created_at", "updated_at")

    def validate_planned_daily_target(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Planned daily target must be greater than zero.")
        return value

    def validate_planned_total_qty(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Planned total quantity must be greater than zero.")
        return value

    def validate(self, attrs):
        data = {
            "order": attrs.get("order", self.instance.order if self.instance else None),
            "production_line": attrs.get(
                "production_line",
                self.instance.production_line if self.instance else None,
            ),
            "planned_start_date": attrs.get(
                "planned_start_date",
                self.instance.planned_start_date if self.instance else None,
            ),
            "planned_end_date": attrs.get(
                "planned_end_date",
                self.instance.planned_end_date if self.instance else None,
            ),
            "planned_daily_target": attrs.get(
                "planned_daily_target",
                self.instance.planned_daily_target if self.instance else None,
            ),
            "planned_total_qty": attrs.get(
                "planned_total_qty",
                self.instance.planned_total_qty if self.instance else None,
            ),
            "remarks": attrs.get("remarks", self.instance.remarks if self.instance else ""),
            "created_by": self.instance.created_by if self.instance else None,
        }

        if data["planned_start_date"] and data["planned_end_date"] and data["planned_start_date"] > data["planned_end_date"]:
            raise serializers.ValidationError(
                {"planned_end_date": "Planned end date must be after or equal to planned start date."}
            )

        candidate = ProductionPlan(**data)
        if self.instance:
            candidate.pk = self.instance.pk

        try:
            candidate.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

        return attrs


class ProductionPlanCalendarSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    order_id = serializers.IntegerField()
    order_code = serializers.CharField()
    line_id = serializers.IntegerField()
    line_name = serializers.CharField()
    planned_start_date = serializers.DateField()
    planned_end_date = serializers.DateField()
    planned_daily_target = serializers.IntegerField()
    planned_total_qty = serializers.IntegerField()
    remarks = serializers.CharField(allow_blank=True)


class PlannedVsActualRowSerializer(serializers.Serializer):
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
