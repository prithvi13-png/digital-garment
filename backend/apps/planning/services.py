from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from django.db.models import QuerySet, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.planning.models import ProductionPlan
from apps.production.models import ProductionEntry


@dataclass(frozen=True)
class PlanVsActualRow:
    plan_id: int
    order_id: int
    order_code: str
    line_id: int
    line_name: str
    planned_start_date: date
    planned_end_date: date
    planned_daily_target: int
    planned_total_qty: int
    actual_total_qty: int
    variance_qty: int
    achievement_percent: float
    plan_status: str


def _status_for_plan(*, row: PlanVsActualRow) -> str:
    today = timezone.localdate()
    if row.actual_total_qty >= row.planned_total_qty:
        return "completed"
    if today > row.planned_end_date and row.actual_total_qty < row.planned_total_qty:
        return "behind"
    if row.actual_total_qty <= 0:
        return "not_started"
    return "in_progress"


def _achievement(*, actual: int, planned: int) -> float:
    if planned <= 0:
        return 0.0
    return round((actual / planned) * 100, 2)


def get_planned_vs_actual_rows(plans_queryset: QuerySet[ProductionPlan]) -> list[dict]:
    plans = list(plans_queryset.select_related("order", "production_line"))
    if not plans:
        return []

    min_date = min(plan.planned_start_date for plan in plans)
    max_date = max(plan.planned_end_date for plan in plans)

    order_ids = list({plan.order_id for plan in plans})
    line_ids = list({plan.production_line_id for plan in plans})

    entry_rows = (
        ProductionEntry.objects.filter(
            order_id__in=order_ids,
            production_line_id__in=line_ids,
            date__gte=min_date,
            date__lte=max_date,
        )
        .values("order_id", "production_line_id", "date")
        .annotate(total_produced=Coalesce(Sum("produced_qty"), 0))
    )

    entries_by_order_line: dict[tuple[int, int], list[tuple[date, int]]] = defaultdict(list)
    for row in entry_rows:
        entries_by_order_line[(row["order_id"], row["production_line_id"])].append(
            (row["date"], row["total_produced"])
        )

    output: list[dict] = []
    for plan in plans:
        key = (plan.order_id, plan.production_line_id)
        actual_total = sum(
            produced
            for entry_date, produced in entries_by_order_line.get(key, [])
            if plan.planned_start_date <= entry_date <= plan.planned_end_date
        )
        variance = actual_total - plan.planned_total_qty

        row_obj = PlanVsActualRow(
            plan_id=plan.id,
            order_id=plan.order_id,
            order_code=plan.order.order_code,
            line_id=plan.production_line_id,
            line_name=plan.production_line.name,
            planned_start_date=plan.planned_start_date,
            planned_end_date=plan.planned_end_date,
            planned_daily_target=plan.planned_daily_target,
            planned_total_qty=plan.planned_total_qty,
            actual_total_qty=actual_total,
            variance_qty=variance,
            achievement_percent=_achievement(actual=actual_total, planned=plan.planned_total_qty),
            plan_status="in_progress",
        )

        row_dict = {
            "plan_id": row_obj.plan_id,
            "order_id": row_obj.order_id,
            "order_code": row_obj.order_code,
            "line_id": row_obj.line_id,
            "line_name": row_obj.line_name,
            "planned_start_date": row_obj.planned_start_date,
            "planned_end_date": row_obj.planned_end_date,
            "planned_daily_target": row_obj.planned_daily_target,
            "planned_total_qty": row_obj.planned_total_qty,
            "actual_total_qty": row_obj.actual_total_qty,
            "variance_qty": row_obj.variance_qty,
            "achievement_percent": row_obj.achievement_percent,
            "plan_status": _status_for_plan(row=row_obj),
        }
        output.append(row_dict)

    output.sort(key=lambda row: (row["planned_start_date"], row["plan_id"]), reverse=True)
    return output


def planning_summary(rows: list[dict]) -> dict:
    total_planned = sum(row["planned_total_qty"] for row in rows)
    total_actual = sum(row["actual_total_qty"] for row in rows)

    return {
        "total_plans": len(rows),
        "total_planned_qty": total_planned,
        "total_actual_qty": total_actual,
        "total_variance_qty": total_actual - total_planned,
        "achievement_percent": _achievement(actual=total_actual, planned=total_planned),
        "completed_plans": sum(1 for row in rows if row["plan_status"] == "completed"),
        "behind_plans": sum(1 for row in rows if row["plan_status"] == "behind"),
    }


def planning_calendar_rows(plans_queryset: QuerySet[ProductionPlan]) -> list[dict]:
    plans = plans_queryset.select_related("order", "production_line").order_by(
        "production_line__name",
        "planned_start_date",
    )

    return [
        {
            "plan_id": plan.id,
            "order_id": plan.order_id,
            "order_code": plan.order.order_code,
            "line_id": plan.production_line_id,
            "line_name": plan.production_line.name,
            "planned_start_date": plan.planned_start_date,
            "planned_end_date": plan.planned_end_date,
            "planned_daily_target": plan.planned_daily_target,
            "planned_total_qty": plan.planned_total_qty,
            "remarks": plan.remarks,
        }
        for plan in plans
    ]
