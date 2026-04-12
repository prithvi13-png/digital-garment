from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, QuerySet, Sum
from django.db.models.functions import Coalesce

from apps.quality.models import QualityInspection


def _safe_rate(*, numerator: int | Decimal, denominator: int | Decimal) -> float:
    denominator_value = Decimal(str(denominator or 0))
    if denominator_value <= 0:
        return 0.0
    numerator_value = Decimal(str(numerator or 0))
    return round(float((numerator_value / denominator_value) * Decimal("100")), 2)


def quality_summary(queryset: QuerySet[QualityInspection]) -> dict:
    aggregates = queryset.aggregate(
        total_inspections=Count("id"),
        total_checked=Coalesce(Sum("checked_qty"), 0),
        total_passed=Coalesce(Sum("passed_qty"), 0),
        total_defective=Coalesce(Sum("defective_qty"), 0),
        total_rejected=Coalesce(Sum("rejected_qty"), 0),
        total_rework=Coalesce(Sum("rework_qty"), 0),
    )

    total_checked = aggregates["total_checked"] or 0
    total_defective = aggregates["total_defective"] or 0
    total_rejected = aggregates["total_rejected"] or 0

    return {
        "total_inspections": aggregates["total_inspections"] or 0,
        "total_checked": total_checked,
        "total_passed": aggregates["total_passed"] or 0,
        "total_defective": total_defective,
        "total_rejected": total_rejected,
        "total_rework": aggregates["total_rework"] or 0,
        "defect_rate": _safe_rate(numerator=total_defective, denominator=total_checked),
        "rejection_rate": _safe_rate(numerator=total_rejected, denominator=total_checked),
    }


def defect_trends(queryset: QuerySet[QualityInspection]) -> list[dict]:
    grouped = (
        queryset.values("defects__defect_type_id", "defects__defect_type__code", "defects__defect_type__name", "defects__defect_type__severity")
        .annotate(total_quantity=Coalesce(Sum("defects__quantity"), 0))
        .exclude(defects__defect_type_id=None)
        .order_by("-total_quantity", "defects__defect_type__name")
    )

    rows: list[dict] = []
    for row in grouped:
        rows.append(
            {
                "defect_type_id": row["defects__defect_type_id"],
                "defect_code": row["defects__defect_type__code"],
                "defect_name": row["defects__defect_type__name"],
                "severity": row["defects__defect_type__severity"],
                "total_quantity": row["total_quantity"],
            }
        )
    return rows


def rejection_trends(queryset: QuerySet[QualityInspection]) -> list[dict]:
    grouped = (
        queryset.values("date")
        .annotate(
            checked_qty=Coalesce(Sum("checked_qty"), 0),
            defective_qty=Coalesce(Sum("defective_qty"), 0),
            rejected_qty=Coalesce(Sum("rejected_qty"), 0),
            rework_qty=Coalesce(Sum("rework_qty"), 0),
            inspections=Count("id"),
        )
        .order_by("date")
    )

    rows: list[dict] = []
    for row in grouped:
        rows.append(
            {
                "date": row["date"],
                "inspections": row["inspections"],
                "checked_qty": row["checked_qty"],
                "defective_qty": row["defective_qty"],
                "rejected_qty": row["rejected_qty"],
                "rework_qty": row["rework_qty"],
                "defect_rate": _safe_rate(
                    numerator=row["defective_qty"],
                    denominator=row["checked_qty"],
                ),
                "rejection_rate": _safe_rate(
                    numerator=row["rejected_qty"],
                    denominator=row["checked_qty"],
                ),
            }
        )
    return rows
