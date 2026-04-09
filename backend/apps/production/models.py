from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from apps.core.models import TimeStampedModel
from apps.orders.models import Order
from apps.production_lines.models import ProductionLine


class ProductionEntry(TimeStampedModel):
    date = models.DateField()
    production_line = models.ForeignKey(
        ProductionLine,
        related_name="production_entries",
        on_delete=models.PROTECT,
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="production_entries",
        on_delete=models.PROTECT,
    )
    order = models.ForeignKey(Order, related_name="production_entries", on_delete=models.PROTECT)
    target_qty = models.PositiveIntegerField()
    produced_qty = models.PositiveIntegerField()
    rejected_qty = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(rejected_qty__lte=F("produced_qty")),
                name="production_rejected_lte_produced",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.order.order_code} - {self.date}"

    def clean(self):
        if self.rejected_qty > self.produced_qty:
            raise ValidationError({"rejected_qty": "Rejected quantity cannot exceed produced quantity."})

    @property
    def efficiency(self) -> float:
        if self.target_qty == 0:
            return 0.0
        return round((self.produced_qty / self.target_qty) * 100, 2)
