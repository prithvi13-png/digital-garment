from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from apps.core.models import TimeStampedModel
from apps.orders.models import Order
from apps.production_lines.models import ProductionLine


class DefectType(TimeStampedModel):
    class Severity(models.TextChoices):
        MINOR = "minor", "Minor"
        MAJOR = "major", "Major"
        CRITICAL = "critical", "Critical"

    name = models.CharField(max_length=120)
    code = models.CharField(max_length=40, unique=True, db_index=True)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.MINOR)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "code"]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class QualityInspection(TimeStampedModel):
    class InspectionStage(models.TextChoices):
        INLINE = "inline", "Inline"
        ENDLINE = "endline", "Endline"
        FINAL = "final", "Final"

    order = models.ForeignKey(Order, related_name="quality_inspections", on_delete=models.PROTECT)
    production_line = models.ForeignKey(
        ProductionLine,
        related_name="quality_inspections",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="quality_inspections",
        on_delete=models.PROTECT,
    )
    inspection_stage = models.CharField(max_length=20, choices=InspectionStage.choices)
    date = models.DateField()
    checked_qty = models.PositiveIntegerField()
    passed_qty = models.PositiveIntegerField(default=0)
    defective_qty = models.PositiveIntegerField(default=0)
    rejected_qty = models.PositiveIntegerField(default=0)
    rework_qty = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True)
    barcode_value = models.CharField(max_length=120, blank=True, null=True, unique=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(checked_qty__gt=0), name="quality_checked_qty_gt_zero"),
            models.CheckConstraint(condition=Q(rejected_qty__lte=F("defective_qty")), name="quality_rejected_lte_defective"),
            models.CheckConstraint(condition=Q(rework_qty__lte=F("defective_qty")), name="quality_rework_lte_defective"),
        ]

    def __str__(self) -> str:
        return f"Inspection {self.order.order_code} ({self.date})"

    def clean(self):
        if self.passed_qty + self.defective_qty > self.checked_qty:
            raise ValidationError(
                {"defective_qty": "Passed quantity + defective quantity cannot exceed checked quantity."}
            )

        if self.rejected_qty > self.defective_qty:
            raise ValidationError({"rejected_qty": "Rejected quantity cannot exceed defective quantity."})

        if self.rework_qty > self.defective_qty:
            raise ValidationError({"rework_qty": "Rework quantity cannot exceed defective quantity."})

    @property
    def defect_rate(self) -> float:
        if self.checked_qty <= 0:
            return 0.0
        return round((self.defective_qty / self.checked_qty) * 100, 2)

    @property
    def rejection_rate(self) -> float:
        if self.checked_qty <= 0:
            return 0.0
        return round((self.rejected_qty / self.checked_qty) * 100, 2)


class QualityInspectionDefect(TimeStampedModel):
    inspection = models.ForeignKey(
        QualityInspection,
        related_name="defects",
        on_delete=models.CASCADE,
    )
    defect_type = models.ForeignKey(DefectType, related_name="inspection_defects", on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField()
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="quality_inspection_defect_qty_gt_zero"),
            models.UniqueConstraint(
                fields=["inspection", "defect_type"],
                name="quality_inspection_defect_unique",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.defect_type.code} x {self.quantity}"
