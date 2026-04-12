from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, QuerySet, Sum
from django.db.models.functions import Coalesce

from apps.productivity.models import WorkerProductivityEntry


def _safe_efficiency(*, actual: int | Decimal, target: int | Decimal) -> float:
    target_decimal = Decimal(str(target or 0))
    if target_decimal <= 0:
        return 0.0
    actual_decimal = Decimal(str(actual or 0))
    return round(float((actual_decimal / target_decimal) * Decimal("100")), 2)


def productivity_summary(queryset: QuerySet[WorkerProductivityEntry]) -> dict:
    aggregates = queryset.aggregate(
        total_entries=Count("id"),
        total_target=Coalesce(Sum("target_qty"), 0),
        total_actual=Coalesce(Sum("actual_qty"), 0),
        total_rework=Coalesce(Sum("rework_qty"), 0),
    )

    total_target = aggregates["total_target"] or 0
    total_actual = aggregates["total_actual"] or 0

    return {
        "total_entries": aggregates["total_entries"] or 0,
        "total_target": total_target,
        "total_actual": total_actual,
        "total_rework": aggregates["total_rework"] or 0,
        "overall_efficiency": _safe_efficiency(actual=total_actual, target=total_target),
    }


def line_productivity_summary(queryset: QuerySet[WorkerProductivityEntry]) -> list[dict]:
    grouped = (
        queryset.values("production_line_id", "production_line__name")
        .annotate(
            total_entries=Count("id"),
            total_target=Coalesce(Sum("target_qty"), 0),
            total_actual=Coalesce(Sum("actual_qty"), 0),
            total_rework=Coalesce(Sum("rework_qty"), 0),
        )
        .order_by("production_line__name")
    )

    rows: list[dict] = []
    for row in grouped:
        rows.append(
            {
                "line_id": row["production_line_id"],
                "line_name": row["production_line__name"],
                "total_entries": row["total_entries"],
                "total_target": row["total_target"],
                "total_actual": row["total_actual"],
                "total_rework": row["total_rework"],
                "efficiency": _safe_efficiency(
                    actual=row["total_actual"],
                    target=row["total_target"],
                ),
            }
        )
    return rows


def worker_productivity_summary(queryset: QuerySet[WorkerProductivityEntry]) -> list[dict]:
    grouped = (
        queryset.values("worker_id", "worker__worker_code", "worker__name")
        .annotate(
            total_entries=Count("id"),
            total_target=Coalesce(Sum("target_qty"), 0),
            total_actual=Coalesce(Sum("actual_qty"), 0),
            total_rework=Coalesce(Sum("rework_qty"), 0),
        )
        .order_by("worker__name", "worker__worker_code")
    )

    rows: list[dict] = []
    for row in grouped:
        rows.append(
            {
                "worker_id": row["worker_id"],
                "worker_code": row["worker__worker_code"],
                "worker_name": row["worker__name"],
                "total_entries": row["total_entries"],
                "total_target": row["total_target"],
                "total_actual": row["total_actual"],
                "total_rework": row["total_rework"],
                "efficiency": _safe_efficiency(
                    actual=row["total_actual"],
                    target=row["total_target"],
                ),
            }
        )
    return rows


def worker_order_output_rows(queryset: QuerySet[WorkerProductivityEntry]) -> list[dict]:
    grouped = (
        queryset.values(
            "worker_id",
            "worker__worker_code",
            "worker__name",
            "order_id",
            "order__order_code",
            "production_line_id",
            "production_line__name",
        )
        .annotate(
            total_target=Coalesce(Sum("target_qty"), 0),
            total_actual=Coalesce(Sum("actual_qty"), 0),
            total_rework=Coalesce(Sum("rework_qty"), 0),
            total_entries=Count("id"),
        )
        .order_by("worker__name", "order__order_code")
    )

    rows: list[dict] = []
    for row in grouped:
        rows.append(
            {
                "worker_id": row["worker_id"],
                "worker_code": row["worker__worker_code"],
                "worker_name": row["worker__name"],
                "order_id": row["order_id"],
                "order_code": row["order__order_code"],
                "line_id": row["production_line_id"],
                "line_name": row["production_line__name"],
                "total_entries": row["total_entries"],
                "total_target": row["total_target"],
                "total_actual": row["total_actual"],
                "total_rework": row["total_rework"],
                "efficiency": _safe_efficiency(actual=row["total_actual"], target=row["total_target"]),
            }
        )
    return rows
