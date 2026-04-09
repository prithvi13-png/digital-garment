import django_filters

from apps.orders.models import Order
from apps.production.models import ProductionEntry


class ProductionEntryFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    buyer = django_filters.NumberFilter(field_name="order__buyer_id")
    stage = django_filters.ChoiceFilter(field_name="order__current_stage", choices=Order.Stage.choices)
    status = django_filters.ChoiceFilter(field_name="order__status", choices=Order.Status.choices)
    line = django_filters.NumberFilter(field_name="production_line_id")
    order = django_filters.NumberFilter(field_name="order_id")
    supervisor = django_filters.NumberFilter(field_name="supervisor_id")

    class Meta:
        model = ProductionEntry
        fields = [
            "order",
            "production_line",
            "line",
            "supervisor",
            "date",
            "buyer",
            "stage",
            "status",
        ]
