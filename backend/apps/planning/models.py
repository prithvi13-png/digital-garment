from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.db.models.functions import Coalesce

from apps.core.models import TimeStampedModel
from apps.orders.models import Order
from apps.production_lines.models import ProductionLine


class ProductionPlan(TimeStampedModel):
    order = models.ForeignKey(Order, related_name="production_plans", on_delete=models.PROTECT)
    production_line = models.ForeignKey(
        ProductionLine,
        related_name="production_plans",
        on_delete=models.PROTECT,
    )
    planned_start_date = models.DateField()
    planned_end_date = models.DateField()
    planned_daily_target = models.PositiveIntegerField()
    planned_total_qty = models.PositiveIntegerField()
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="production_plans",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-planned_start_date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.order.order_code} @ {self.production_line.name}"

    def clean(self):
        if self.planned_start_date and self.planned_end_date and self.planned_start_date > self.planned_end_date:
            raise ValidationError(
                {"planned_end_date": "Planned end date must be greater than or equal to planned start date."}
            )

        overlap_qs = ProductionPlan.objects.filter(
            production_line=self.production_line,
            planned_start_date__lte=self.planned_end_date,
            planned_end_date__gte=self.planned_start_date,
        )
        if self.pk:
            overlap_qs = overlap_qs.exclude(pk=self.pk)

        if overlap_qs.exists():
            raise ValidationError(
                {"production_line": "Production line already has an overlapping plan for the selected dates."}
            )

        produced_total = (
            self.order.production_entries.aggregate(total=Coalesce(Sum("produced_qty"), 0)).get("total") or 0
        )
        remaining_qty = max(self.order.quantity - produced_total, 0)

        existing_planned = ProductionPlan.objects.filter(order=self.order)
        if self.pk:
            existing_planned = existing_planned.exclude(pk=self.pk)

        existing_planned_total = existing_planned.aggregate(total=Coalesce(Sum("planned_total_qty"), 0)).get("total") or 0

        if existing_planned_total + self.planned_total_qty > remaining_qty:
            raise ValidationError(
                {
                    "planned_total_qty": (
                        "Planned total quantity exceeds remaining order quantity. "
                        f"Remaining qty: {remaining_qty}, already planned: {existing_planned_total}."
                    )
                }
            )
