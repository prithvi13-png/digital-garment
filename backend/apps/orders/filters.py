import django_filters

from apps.orders.models import Order


class OrderFilter(django_filters.FilterSet):
    delivery_date_from = django_filters.DateFilter(field_name="delivery_date", lookup_expr="gte")
    delivery_date_to = django_filters.DateFilter(field_name="delivery_date", lookup_expr="lte")
    buyer = django_filters.NumberFilter(field_name="buyer_id")
    stage = django_filters.ChoiceFilter(field_name="current_stage", choices=Order.Stage.choices)
    status = django_filters.ChoiceFilter(field_name="status", choices=Order.Status.choices)
    priority = django_filters.ChoiceFilter(field_name="priority", choices=Order.Priority.choices)
    order = django_filters.NumberFilter(field_name="id")

    class Meta:
        model = Order
        fields = ["buyer", "current_stage", "stage", "status", "priority", "order"]
