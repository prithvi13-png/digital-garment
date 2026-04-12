import django_filters

from apps.planning.models import ProductionPlan


class ProductionPlanFilter(django_filters.FilterSet):
    start_date_from = django_filters.DateFilter(field_name="planned_start_date", lookup_expr="gte")
    start_date_to = django_filters.DateFilter(field_name="planned_start_date", lookup_expr="lte")
    end_date_from = django_filters.DateFilter(field_name="planned_end_date", lookup_expr="gte")
    end_date_to = django_filters.DateFilter(field_name="planned_end_date", lookup_expr="lte")
    order = django_filters.NumberFilter(field_name="order_id")
    line = django_filters.NumberFilter(field_name="production_line_id")

    class Meta:
        model = ProductionPlan
        fields = ["order", "production_line", "line", "planned_start_date", "planned_end_date"]
