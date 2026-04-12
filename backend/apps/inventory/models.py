from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel
from apps.orders.models import Order
from apps.production_lines.models import ProductionLine


class Material(TimeStampedModel):
    class MaterialType(models.TextChoices):
        FABRIC = "fabric", "Fabric"
        THREAD = "thread", "Thread"
        LABEL = "label", "Label"
        BUTTON = "button", "Button"
        ZIPPER = "zipper", "Zipper"
        PACKAGING = "packaging", "Packaging"
        OTHER = "other", "Other"

    code = models.CharField(max_length=40, unique=True, db_index=True)
    name = models.CharField(max_length=160)
    material_type = models.CharField(max_length=20, choices=MaterialType.choices, default=MaterialType.OTHER)
    unit = models.CharField(max_length=30)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    barcode_value = models.CharField(max_length=120, blank=True, null=True, unique=True)

    class Meta:
        ordering = ["name", "code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class MaterialStockInward(TimeStampedModel):
    material = models.ForeignKey(Material, related_name="inward_entries", on_delete=models.PROTECT)
    batch_no = models.CharField(max_length=80, blank=True)
    roll_no = models.CharField(max_length=80, blank=True)
    inward_date = models.DateField()
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    rate = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    supplier_name = models.CharField(max_length=160, blank=True)
    remarks = models.TextField(blank=True)
    barcode_value = models.CharField(max_length=120, blank=True, null=True, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="material_inward_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-inward_date", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="material_inward_qty_gt_zero"),
        ]

    def __str__(self) -> str:
        return f"Inward {self.material.code} ({self.quantity})"


class MaterialStockIssue(TimeStampedModel):
    material = models.ForeignKey(Material, related_name="issue_entries", on_delete=models.PROTECT)
    order = models.ForeignKey(
        Order,
        related_name="material_issues",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    production_line = models.ForeignKey(
        ProductionLine,
        related_name="material_issues",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    issue_date = models.DateField()
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    issued_to = models.CharField(max_length=160, blank=True)
    remarks = models.TextField(blank=True)
    barcode_value = models.CharField(max_length=120, blank=True, null=True, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="material_issue_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-issue_date", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="material_issue_qty_gt_zero"),
        ]

    def __str__(self) -> str:
        order_code = self.order.order_code if self.order else "N/A"
        return f"Issue {self.material.code} ({self.quantity}) to {order_code}"


class StockAdjustment(TimeStampedModel):
    class AdjustmentType(models.TextChoices):
        INCREASE = "increase", "Increase"
        DECREASE = "decrease", "Decrease"

    material = models.ForeignKey(Material, related_name="adjustments", on_delete=models.PROTECT)
    adjustment_date = models.DateField()
    adjustment_type = models.CharField(max_length=10, choices=AdjustmentType.choices)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    reason = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="stock_adjustments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-adjustment_date", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="stock_adjustment_qty_gt_zero"),
        ]

    def __str__(self) -> str:
        sign = "+" if self.adjustment_type == self.AdjustmentType.INCREASE else "-"
        return f"{self.material.code} {sign}{self.quantity}"
