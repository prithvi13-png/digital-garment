from django.db.models import QuerySet
from rest_framework.exceptions import ValidationError

from apps.orders.filters import OrderFilter
from apps.production.filters import ProductionEntryFilter


def _apply_filterset(filterset_cls, queryset: QuerySet, params):
    filterset = filterset_cls(data=params, queryset=queryset)
    if not filterset.is_valid():
        raise ValidationError(filterset.errors)
    return filterset.qs


def apply_production_filters(queryset: QuerySet, params):
    return _apply_filterset(ProductionEntryFilter, queryset, params)


def apply_order_filters(queryset: QuerySet, params):
    return _apply_filterset(OrderFilter, queryset, params)
