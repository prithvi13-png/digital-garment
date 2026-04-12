from django.db.models import QuerySet
from rest_framework.exceptions import ValidationError

from apps.inventory.filters import MaterialFilter, MaterialStockIssueFilter
from apps.orders.filters import OrderFilter
from apps.planning.filters import ProductionPlanFilter
from apps.production.filters import ProductionEntryFilter
from apps.productivity.filters import WorkerProductivityEntryFilter
from apps.quality.filters import QualityInspectionFilter


def _apply_filterset(filterset_cls, queryset: QuerySet, params):
    filterset = filterset_cls(data=params, queryset=queryset)
    if not filterset.is_valid():
        raise ValidationError(filterset.errors)
    return filterset.qs


def apply_production_filters(queryset: QuerySet, params):
    return _apply_filterset(ProductionEntryFilter, queryset, params)


def apply_order_filters(queryset: QuerySet, params):
    return _apply_filterset(OrderFilter, queryset, params)


def apply_material_filters(queryset: QuerySet, params):
    return _apply_filterset(MaterialFilter, queryset, params)


def apply_material_issue_filters(queryset: QuerySet, params):
    return _apply_filterset(MaterialStockIssueFilter, queryset, params)


def apply_worker_productivity_filters(queryset: QuerySet, params):
    return _apply_filterset(WorkerProductivityEntryFilter, queryset, params)


def apply_quality_inspection_filters(queryset: QuerySet, params):
    return _apply_filterset(QualityInspectionFilter, queryset, params)


def apply_production_plan_filters(queryset: QuerySet, params):
    return _apply_filterset(ProductionPlanFilter, queryset, params)
