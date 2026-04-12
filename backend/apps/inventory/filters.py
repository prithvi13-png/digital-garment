import django_filters
from django.db.models import Q

from apps.inventory.models import Material, MaterialStockInward, MaterialStockIssue, StockAdjustment


class MaterialFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_q")

    class Meta:
        model = Material
        fields = ["material_type", "is_active"]

    def filter_q(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(code__icontains=value)
            | Q(name__icontains=value)
            | Q(barcode_value__icontains=value)
        )


class MaterialStockInwardFilter(django_filters.FilterSet):
    inward_date_from = django_filters.DateFilter(field_name="inward_date", lookup_expr="gte")
    inward_date_to = django_filters.DateFilter(field_name="inward_date", lookup_expr="lte")
    material = django_filters.NumberFilter(field_name="material_id")
    supplier = django_filters.CharFilter(field_name="supplier_name", lookup_expr="icontains")

    class Meta:
        model = MaterialStockInward
        fields = ["material", "inward_date", "supplier"]


class MaterialStockIssueFilter(django_filters.FilterSet):
    issue_date_from = django_filters.DateFilter(field_name="issue_date", lookup_expr="gte")
    issue_date_to = django_filters.DateFilter(field_name="issue_date", lookup_expr="lte")
    material = django_filters.NumberFilter(field_name="material_id")
    order = django_filters.NumberFilter(field_name="order_id")
    line = django_filters.NumberFilter(field_name="production_line_id")
    buyer = django_filters.NumberFilter(field_name="order__buyer_id")

    class Meta:
        model = MaterialStockIssue
        fields = ["material", "order", "production_line", "line", "issue_date", "buyer"]


class StockAdjustmentFilter(django_filters.FilterSet):
    adjustment_date_from = django_filters.DateFilter(field_name="adjustment_date", lookup_expr="gte")
    adjustment_date_to = django_filters.DateFilter(field_name="adjustment_date", lookup_expr="lte")
    material = django_filters.NumberFilter(field_name="material_id")

    class Meta:
        model = StockAdjustment
        fields = ["material", "adjustment_type", "adjustment_date"]
