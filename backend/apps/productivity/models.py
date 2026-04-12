from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.core.models import TimeStampedModel
from apps.orders.models import Order
from apps.production_lines.models import ProductionLine


class Worker(TimeStampedModel):
    worker_code = models.CharField(max_length=40, unique=True, db_index=True)
    name = models.CharField(max_length=160)
    mobile = models.CharField(max_length=20, blank=True)
    skill_type = models.CharField(max_length=80, blank=True)
    assigned_line = models.ForeignKey(
        ProductionLine,
        related_name="workers",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    barcode_value = models.CharField(max_length=120, blank=True, null=True, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name", "worker_code"]

    def __str__(self) -> str:
        return f"{self.worker_code} - {self.name}"


class WorkerProductivityEntry(TimeStampedModel):
    worker = models.ForeignKey(Worker, related_name="productivity_entries", on_delete=models.PROTECT)
    order = models.ForeignKey(Order, related_name="worker_productivity_entries", on_delete=models.PROTECT)
    production_line = models.ForeignKey(
        ProductionLine,
        related_name="worker_productivity_entries",
        on_delete=models.PROTECT,
    )
    date = models.DateField()
    target_qty = models.PositiveIntegerField()
    actual_qty = models.PositiveIntegerField(default=0)
    rework_qty = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="worker_productivity_entries",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(target_qty__gt=0), name="worker_productivity_target_gt_zero"),
            models.CheckConstraint(condition=Q(rework_qty__lte=F("actual_qty")), name="worker_rework_lte_actual"),
        ]

    def __str__(self) -> str:
        return f"{self.worker.worker_code} - {self.date}"

    @property
    def efficiency(self) -> float:
        if self.target_qty <= 0:
            return 0.0
        return round((self.actual_qty / self.target_qty) * 100, 2)
