from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.quality.models import DefectType, QualityInspection, QualityInspectionDefect


class DefectTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DefectType
        fields = (
            "id",
            "name",
            "code",
            "severity",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class QualityInspectionDefectSerializer(serializers.ModelSerializer):
    defect_code = serializers.CharField(source="defect_type.code", read_only=True)
    defect_name = serializers.CharField(source="defect_type.name", read_only=True)
    severity = serializers.CharField(source="defect_type.severity", read_only=True)

    class Meta:
        model = QualityInspectionDefect
        fields = (
            "id",
            "defect_type",
            "defect_code",
            "defect_name",
            "severity",
            "quantity",
            "remarks",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "defect_code", "defect_name", "severity")


class QualityInspectionDefectWriteSerializer(serializers.Serializer):
    defect_type = serializers.PrimaryKeyRelatedField(queryset=DefectType.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)
    remarks = serializers.CharField(required=False, allow_blank=True)


class QualityInspectionWriteSerializer(serializers.ModelSerializer):
    defects = QualityInspectionDefectWriteSerializer(many=True, required=False)

    class Meta:
        model = QualityInspection
        fields = (
            "id",
            "order",
            "production_line",
            "inspector",
            "inspection_stage",
            "date",
            "checked_qty",
            "passed_qty",
            "defective_qty",
            "rejected_qty",
            "rework_qty",
            "remarks",
            "barcode_value",
            "defects",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            "inspector": {"required": False},
        }

    def validate_checked_qty(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("Checked quantity must be greater than zero.")
        return value

    def validate(self, attrs):
        checked_qty = attrs.get("checked_qty", self.instance.checked_qty if self.instance else None)
        passed_qty = attrs.get("passed_qty", self.instance.passed_qty if self.instance else 0)
        defective_qty = attrs.get("defective_qty", self.instance.defective_qty if self.instance else 0)
        rejected_qty = attrs.get("rejected_qty", self.instance.rejected_qty if self.instance else 0)
        rework_qty = attrs.get("rework_qty", self.instance.rework_qty if self.instance else 0)
        defects = attrs.get("defects")

        if checked_qty is None:
            raise serializers.ValidationError({"checked_qty": "Checked quantity is required."})

        if passed_qty < 0 or defective_qty < 0 or rejected_qty < 0 or rework_qty < 0:
            raise serializers.ValidationError("Passed, defective, rejected, and rework quantities cannot be negative.")

        if passed_qty + defective_qty > checked_qty:
            raise serializers.ValidationError(
                {"defective_qty": "Passed quantity + defective quantity cannot exceed checked quantity."}
            )

        if rejected_qty > defective_qty:
            raise serializers.ValidationError({"rejected_qty": "Rejected quantity cannot exceed defective quantity."})

        if rework_qty > defective_qty:
            raise serializers.ValidationError({"rework_qty": "Rework quantity cannot exceed defective quantity."})

        if defects is not None:
            defect_ids = [item["defect_type"].id for item in defects]
            if len(defect_ids) != len(set(defect_ids)):
                raise serializers.ValidationError(
                    {"defects": "Duplicate defect type rows are not allowed in the same inspection."}
                )

            defect_total = sum(item["quantity"] for item in defects)
            if defect_total > defective_qty:
                raise serializers.ValidationError(
                    {
                        "defects": (
                            "Sum of defect quantities cannot exceed defective quantity. "
                            f"Total defect rows qty: {defect_total}, defective_qty: {defective_qty}."
                        )
                    }
                )

        return attrs

    def create(self, validated_data):
        defects_data = validated_data.pop("defects", [])
        request = self.context.get("request")
        if not validated_data.get("inspector") and request and request.user and request.user.is_authenticated:
            validated_data["inspector"] = request.user

        inspection = QualityInspection(**validated_data)
        try:
            inspection.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

        inspection.save()
        for defect in defects_data:
            QualityInspectionDefect.objects.create(inspection=inspection, **defect)

        return inspection

    def update(self, instance, validated_data):
        defects_data = validated_data.pop("defects", None)

        for key, value in validated_data.items():
            setattr(instance, key, value)

        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

        instance.save()

        if defects_data is not None:
            instance.defects.all().delete()
            for defect in defects_data:
                QualityInspectionDefect.objects.create(inspection=instance, **defect)

        return instance


class QualityInspectionReadSerializer(serializers.ModelSerializer):
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    line_name = serializers.CharField(source="production_line.name", read_only=True)
    inspector_name = serializers.SerializerMethodField()
    defects = QualityInspectionDefectSerializer(many=True, read_only=True)
    defect_rate = serializers.FloatField(read_only=True)
    rejection_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = QualityInspection
        fields = (
            "id",
            "order",
            "order_code",
            "production_line",
            "line_name",
            "inspector",
            "inspector_name",
            "inspection_stage",
            "date",
            "checked_qty",
            "passed_qty",
            "defective_qty",
            "rejected_qty",
            "rework_qty",
            "defect_rate",
            "rejection_rate",
            "remarks",
            "barcode_value",
            "defects",
            "created_at",
            "updated_at",
        )

    def get_inspector_name(self, obj):
        return obj.inspector.get_full_name() or obj.inspector.username


class DefectTrendSerializer(serializers.Serializer):
    defect_type_id = serializers.IntegerField(allow_null=True)
    defect_code = serializers.CharField(allow_null=True)
    defect_name = serializers.CharField(allow_null=True)
    severity = serializers.CharField(allow_null=True)
    total_quantity = serializers.IntegerField()


class RejectionTrendSerializer(serializers.Serializer):
    date = serializers.DateField()
    inspections = serializers.IntegerField()
    checked_qty = serializers.IntegerField()
    defective_qty = serializers.IntegerField()
    rejected_qty = serializers.IntegerField()
    rework_qty = serializers.IntegerField()
    defect_rate = serializers.FloatField()
    rejection_rate = serializers.FloatField()
