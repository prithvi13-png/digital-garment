import django_filters

from apps.quality.models import DefectType, QualityInspection


class DefectTypeFilter(django_filters.FilterSet):
    class Meta:
        model = DefectType
        fields = ["severity", "is_active"]


class QualityInspectionFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    order = django_filters.NumberFilter(field_name="order_id")
    line = django_filters.NumberFilter(field_name="production_line_id")
    inspector = django_filters.NumberFilter(field_name="inspector_id")

    class Meta:
        model = QualityInspection
        fields = ["order", "production_line", "line", "inspector", "inspection_stage", "date"]
