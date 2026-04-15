from __future__ import annotations

import django_filters
from django.utils import timezone

from apps.crm.models import (
    CRMAccount,
    CRMActivity,
    CRMContact,
    CRMLead,
    CRMOpportunity,
    CRMQuotation,
    CRMTask,
)


class CRMLeadFilter(django_filters.FilterSet):
    created_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    expected_close_from = django_filters.DateFilter(field_name="expected_close_date", lookup_expr="gte")
    expected_close_to = django_filters.DateFilter(field_name="expected_close_date", lookup_expr="lte")
    next_follow_up_from = django_filters.DateTimeFilter(field_name="next_follow_up_at", lookup_expr="gte")
    next_follow_up_to = django_filters.DateTimeFilter(field_name="next_follow_up_at", lookup_expr="lte")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    pipeline = django_filters.NumberFilter(field_name="pipeline_id")
    stage = django_filters.NumberFilter(field_name="stage_id")
    is_overdue = django_filters.BooleanFilter(method="filter_is_overdue")

    class Meta:
        model = CRMLead
        fields = [
            "status",
            "source",
            "priority",
            "assigned_to",
            "pipeline",
            "stage",
            "is_converted",
            "is_archived",
            "industry",
        ]

    def filter_is_overdue(self, queryset, name, value):
        if value:
            return queryset.filter(next_follow_up_at__isnull=False, next_follow_up_at__lt=timezone.now())
        return queryset


class CRMAccountFilter(django_filters.FilterSet):
    created_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")

    class Meta:
        model = CRMAccount
        fields = ["status", "account_type", "industry", "assigned_to"]


class CRMContactFilter(django_filters.FilterSet):
    created_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    linked_account = django_filters.NumberFilter(field_name="linked_account_id")

    class Meta:
        model = CRMContact
        fields = ["assigned_to", "linked_account", "is_primary_contact", "preferred_contact_mode"]


class CRMOpportunityFilter(django_filters.FilterSet):
    created_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")
    expected_close_from = django_filters.DateFilter(field_name="expected_close_date", lookup_expr="gte")
    expected_close_to = django_filters.DateFilter(field_name="expected_close_date", lookup_expr="lte")
    deal_value_min = django_filters.NumberFilter(field_name="deal_value", lookup_expr="gte")
    deal_value_max = django_filters.NumberFilter(field_name="deal_value", lookup_expr="lte")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    pipeline = django_filters.NumberFilter(field_name="pipeline_id")
    stage = django_filters.NumberFilter(field_name="stage_id")
    is_open = django_filters.BooleanFilter(method="filter_is_open")

    class Meta:
        model = CRMOpportunity
        fields = [
            "priority",
            "source",
            "assigned_to",
            "pipeline",
            "stage",
            "is_won",
            "is_lost",
            "is_archived",
            "is_open",
        ]

    def filter_is_open(self, queryset, name, value):
        if value:
            return queryset.filter(is_won=False, is_lost=False)
        return queryset


class CRMActivityFilter(django_filters.FilterSet):
    due_from = django_filters.DateTimeFilter(field_name="due_at", lookup_expr="gte")
    due_to = django_filters.DateTimeFilter(field_name="due_at", lookup_expr="lte")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    related_lead = django_filters.NumberFilter(field_name="related_lead_id")
    related_account = django_filters.NumberFilter(field_name="related_account_id")
    related_contact = django_filters.NumberFilter(field_name="related_contact_id")
    related_opportunity = django_filters.NumberFilter(field_name="related_opportunity_id")

    class Meta:
        model = CRMActivity
        fields = [
            "activity_type",
            "status",
            "assigned_to",
            "related_lead",
            "related_account",
            "related_contact",
            "related_opportunity",
        ]


class CRMTaskFilter(django_filters.FilterSet):
    due_from = django_filters.DateFilter(field_name="due_date", lookup_expr="gte")
    due_to = django_filters.DateFilter(field_name="due_date", lookup_expr="lte")
    assigned_to = django_filters.NumberFilter(field_name="assigned_to_id")
    pipeline = django_filters.NumberFilter(field_name="pipeline_id")
    stage = django_filters.NumberFilter(field_name="stage_id")
    overdue_only = django_filters.BooleanFilter(method="filter_overdue")

    class Meta:
        model = CRMTask
        fields = ["status", "priority", "assigned_to", "pipeline", "stage"]

    def filter_overdue(self, queryset, name, value):
        if value:
            today = timezone.localdate()
            return queryset.filter(status__in=[CRMTask.TaskStatus.OPEN, CRMTask.TaskStatus.IN_PROGRESS], due_date__lt=today)
        return queryset


class CRMQuotationFilter(django_filters.FilterSet):
    quote_date_from = django_filters.DateFilter(field_name="quote_date", lookup_expr="gte")
    quote_date_to = django_filters.DateFilter(field_name="quote_date", lookup_expr="lte")
    valid_until_from = django_filters.DateFilter(field_name="valid_until", lookup_expr="gte")
    valid_until_to = django_filters.DateFilter(field_name="valid_until", lookup_expr="lte")
    related_opportunity = django_filters.NumberFilter(field_name="related_opportunity_id")

    class Meta:
        model = CRMQuotation
        fields = ["status", "currency", "related_opportunity"]
