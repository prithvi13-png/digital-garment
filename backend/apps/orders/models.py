from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.buyers.models import Buyer
from apps.core.models import TimeStampedModel
from apps.orders.status import resolve_order_status


class Order(TimeStampedModel):
    class Stage(models.TextChoices):
        CUTTING = "cutting", "Cutting"
        STITCHING = "stitching", "Stitching"
        QC = "qc", "QC"
        PACKING = "packing", "Packing"
        DISPATCH = "dispatch", "Dispatch"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        DELAYED = "delayed", "Delayed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    order_code = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)
    buyer = models.ForeignKey(Buyer, related_name="orders", on_delete=models.PROTECT)
    style_name = models.CharField(max_length=160)
    style_code = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveIntegerField()
    target_per_day = models.PositiveIntegerField(null=True, blank=True)
    delivery_date = models.DateField()
    current_stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.CUTTING)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_orders",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="order_quantity_gt_zero",
            ),
        ]

    def __str__(self) -> str:
        return self.order_code or f"Order {self.pk}"

    def calculate_status(self, has_production_started: bool | None = None) -> str:
        return resolve_order_status(self, has_production_started=has_production_started)

    def sync_status(self, has_production_started: bool | None = None) -> None:
        new_status = self.calculate_status(has_production_started=has_production_started)
        if new_status != self.status:
            self.status = new_status
            if self.pk:
                type(self).objects.filter(pk=self.pk).update(status=new_status, updated_at=timezone.now())

    def save(self, *args, **kwargs):
        self.status = self.calculate_status()
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and not self.order_code:
            generated_code = f"ORD-{self.id:04d}"
            type(self).objects.filter(pk=self.pk).update(order_code=generated_code, updated_at=timezone.now())
            self.order_code = generated_code
