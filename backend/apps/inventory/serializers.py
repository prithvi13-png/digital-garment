from decimal import Decimal

from rest_framework import serializers

from apps.accounts.serializers import MeSerializer
from apps.inventory.models import Material, MaterialStockInward, MaterialStockIssue, StockAdjustment
from apps.inventory.services import (
    MaterialStockBreakdown,
    get_material_stock_breakdown,
    validate_decrease_adjustment_allowed,
    validate_issue_quantity_available,
)


class MaterialSerializer(serializers.ModelSerializer):
    inward_total = serializers.SerializerMethodField()
    issued_total = serializers.SerializerMethodField()
    adjustment_increase_total = serializers.SerializerMethodField()
    adjustment_decrease_total = serializers.SerializerMethodField()
    current_stock = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = (
            "id",
            "code",
            "name",
            "material_type",
            "unit",
            "description",
            "is_active",
            "barcode_value",
            "inward_total",
            "issued_total",
            "adjustment_increase_total",
            "adjustment_decrease_total",
            "current_stock",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "inward_total",
            "issued_total",
            "adjustment_increase_total",
            "adjustment_decrease_total",
            "current_stock",
        )

    def _breakdown(self, obj: Material) -> MaterialStockBreakdown:
        stock_map = self.context.get("stock_map")
        if stock_map and obj.id in stock_map:
            return stock_map[obj.id]
        return get_material_stock_breakdown(obj.id)

    def get_inward_total(self, obj: Material) -> Decimal:
        return self._breakdown(obj).inward_total

    def get_issued_total(self, obj: Material) -> Decimal:
        return self._breakdown(obj).issued_total

    def get_adjustment_increase_total(self, obj: Material) -> Decimal:
        return self._breakdown(obj).adjustment_increase_total

    def get_adjustment_decrease_total(self, obj: Material) -> Decimal:
        return self._breakdown(obj).adjustment_decrease_total

    def get_current_stock(self, obj: Material) -> Decimal:
        return self._breakdown(obj).current_stock


class MaterialLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ("id", "code", "name", "material_type", "unit", "is_active")


class MaterialStockInwardSerializer(serializers.ModelSerializer):
    material_detail = MaterialLiteSerializer(source="material", read_only=True)
    created_by_detail = MeSerializer(source="created_by", read_only=True)

    class Meta:
        model = MaterialStockInward
        fields = (
            "id",
            "material",
            "material_detail",
            "batch_no",
            "roll_no",
            "inward_date",
            "quantity",
            "rate",
            "supplier_name",
            "remarks",
            "barcode_value",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_detail", "created_at", "updated_at")

    def validate_quantity(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_rate(self, value: Decimal | None) -> Decimal | None:
        if value is None:
            return value
        if value < 0:
            raise serializers.ValidationError("Rate cannot be negative.")
        return value


class MaterialStockIssueSerializer(serializers.ModelSerializer):
    material_detail = MaterialLiteSerializer(source="material", read_only=True)
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    line_name = serializers.CharField(source="production_line.name", read_only=True)
    created_by_detail = MeSerializer(source="created_by", read_only=True)

    class Meta:
        model = MaterialStockIssue
        fields = (
            "id",
            "material",
            "material_detail",
            "order",
            "order_code",
            "production_line",
            "line_name",
            "issue_date",
            "quantity",
            "issued_to",
            "remarks",
            "barcode_value",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_detail", "created_at", "updated_at")

    def validate_quantity(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate(self, attrs):
        material = attrs.get("material") or (self.instance.material if self.instance else None)
        quantity = attrs.get("quantity") or (self.instance.quantity if self.instance else None)

        if material is None:
            raise serializers.ValidationError({"material": "Material is required."})

        if quantity is None:
            raise serializers.ValidationError({"quantity": "Quantity is required."})

        validate_issue_quantity_available(
            material=material,
            quantity=quantity,
            existing_issue=self.instance,
        )
        return attrs


class StockAdjustmentSerializer(serializers.ModelSerializer):
    material_detail = MaterialLiteSerializer(source="material", read_only=True)
    created_by_detail = MeSerializer(source="created_by", read_only=True)

    class Meta:
        model = StockAdjustment
        fields = (
            "id",
            "material",
            "material_detail",
            "adjustment_date",
            "adjustment_type",
            "quantity",
            "reason",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_detail", "created_at", "updated_at")

    def validate_quantity(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_reason(self, value: str) -> str:
        if not value or not value.strip():
            raise serializers.ValidationError("Reason is required.")
        return value.strip()

    def validate(self, attrs):
        material = attrs.get("material") or (self.instance.material if self.instance else None)
        quantity = attrs.get("quantity") or (self.instance.quantity if self.instance else None)
        adjustment_type = attrs.get("adjustment_type") or (
            self.instance.adjustment_type if self.instance else None
        )

        if material is None:
            raise serializers.ValidationError({"material": "Material is required."})

        if adjustment_type == StockAdjustment.AdjustmentType.DECREASE and quantity is not None:
            validate_decrease_adjustment_allowed(
                material=material,
                quantity=quantity,
                existing_adjustment=self.instance,
            )

        return attrs


class MaterialStockSummaryRowSerializer(serializers.Serializer):
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
    is_low_stock = serializers.BooleanField(required=False)


class MaterialMovementSerializer(serializers.Serializer):
    movement_type = serializers.CharField()
    date = serializers.DateField()
    material_id = serializers.IntegerField()
    material_code = serializers.CharField()
    material_name = serializers.CharField()
    unit = serializers.CharField()
    quantity_in = serializers.DecimalField(max_digits=14, decimal_places=3)
    quantity_out = serializers.DecimalField(max_digits=14, decimal_places=3)
    net_quantity = serializers.DecimalField(max_digits=14, decimal_places=3)
    reference_id = serializers.IntegerField()
    batch_no = serializers.CharField(allow_blank=True, allow_null=True)
    roll_no = serializers.CharField(allow_blank=True, allow_null=True)
    order_code = serializers.CharField(allow_null=True)
    line_name = serializers.CharField(allow_null=True)
    remarks = serializers.CharField(allow_blank=True, allow_null=True)
    barcode_value = serializers.CharField(allow_blank=True, allow_null=True)
    created_by_name = serializers.CharField()


class ConsumptionVarianceRowSerializer(serializers.Serializer):
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
