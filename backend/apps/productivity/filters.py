import django_filters

from apps.productivity.models import Worker, WorkerProductivityEntry


class WorkerFilter(django_filters.FilterSet):
    assigned_line = django_filters.NumberFilter(field_name="assigned_line_id")

    class Meta:
        model = Worker
        fields = ["assigned_line", "is_active"]


class WorkerProductivityEntryFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    worker = django_filters.NumberFilter(field_name="worker_id")
    line = django_filters.NumberFilter(field_name="production_line_id")
    order = django_filters.NumberFilter(field_name="order_id")
    supervisor = django_filters.NumberFilter(field_name="created_by_id")

    class Meta:
        model = WorkerProductivityEntry
        fields = ["worker", "order", "production_line", "line", "date", "supervisor"]
