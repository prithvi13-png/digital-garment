from __future__ import annotations

from datetime import datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.crm.models import (
    CRMAccount,
    CRMActivity,
    CRMContact,
    CRMLead,
    CRMModule,
    CRMOpportunity,
    CRMOption,
    CRMPipeline,
    CRMQuotation,
    CRMTag,
    CRMTask,
)

User = get_user_model()


def leads_queryset(organization_key: str):
    return (
        CRMLead.objects.filter(organization_key=organization_key)
        .select_related("assigned_to", "team", "pipeline", "stage", "created_by", "updated_by")
        .prefetch_related("tags")
    )


def accounts_queryset(organization_key: str):
    return (
        CRMAccount.objects.filter(organization_key=organization_key)
        .select_related("assigned_to", "account_manager", "created_by", "updated_by")
        .prefetch_related("tags")
    )


def contacts_queryset(organization_key: str):
    return (
        CRMContact.objects.filter(organization_key=organization_key)
        .select_related("linked_account", "linked_lead", "assigned_to", "created_by", "updated_by")
        .prefetch_related("tags")
    )


def opportunities_queryset(organization_key: str):
    return (
        CRMOpportunity.objects.filter(organization_key=organization_key)
        .select_related(
            "linked_account",
            "linked_contact",
            "linked_lead",
            "assigned_to",
            "pipeline",
            "stage",
            "created_by",
            "updated_by",
        )
        .prefetch_related("tags")
    )


def activities_queryset(organization_key: str):
    return CRMActivity.objects.filter(organization_key=organization_key).select_related(
        "related_lead",
        "related_account",
        "related_contact",
        "related_opportunity",
        "assigned_to",
        "created_by",
        "updated_by",
    )


def tasks_queryset(organization_key: str):
    return (
        CRMTask.objects.filter(organization_key=organization_key)
        .select_related(
            "related_lead",
            "related_account",
            "related_contact",
            "related_opportunity",
            "assigned_to",
            "assigned_by",
            "pipeline",
            "stage",
            "created_by",
            "updated_by",
        )
        .prefetch_related("tags")
    )


def quotations_queryset(organization_key: str):
    return CRMQuotation.objects.filter(organization_key=organization_key).select_related(
        "related_opportunity",
        "related_account",
        "related_contact",
        "converted_order",
        "created_by",
        "updated_by",
    )


def crm_dashboard_summary(*, organization_key: str, date_from: datetime | None = None, date_to: datetime | None = None):
    lead_qs = CRMLead.objects.filter(organization_key=organization_key)
    opp_qs = CRMOpportunity.objects.filter(organization_key=organization_key)
    activity_qs = CRMActivity.objects.filter(organization_key=organization_key)

    if date_from:
        lead_qs = lead_qs.filter(created_at__gte=date_from)
        opp_qs = opp_qs.filter(created_at__gte=date_from)
        activity_qs = activity_qs.filter(created_at__gte=date_from)

    if date_to:
        lead_qs = lead_qs.filter(created_at__lte=date_to)
        opp_qs = opp_qs.filter(created_at__lte=date_to)
        activity_qs = activity_qs.filter(created_at__lte=date_to)

    leads_total = lead_qs.count()
    leads_by_status = list(lead_qs.values("status").annotate(count=Count("id")).order_by("status"))
    leads_by_source = list(lead_qs.values("source").annotate(count=Count("id")).order_by("-count"))
    leads_by_owner = list(
        lead_qs.values("assigned_to_id", "assigned_to__first_name", "assigned_to__last_name", "assigned_to__username")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    opp_by_stage = list(
        opp_qs.values("stage_id", "stage__name")
        .annotate(count=Count("id"), value=Sum("deal_value"), weighted=Sum("weighted_value"))
        .order_by("stage__name")
    )

    pipeline_value = opp_qs.aggregate(total=Sum("deal_value"))["total"] or 0
    weighted_pipeline_value = opp_qs.aggregate(total=Sum("weighted_value"))["total"] or 0
    won_deals = opp_qs.filter(is_won=True).count()
    lost_deals = opp_qs.filter(is_lost=True).count()
    open_deals = opp_qs.filter(is_won=False, is_lost=False).count()

    conversion_rate = 0
    if leads_total:
        conversion_rate = round((lead_qs.filter(is_converted=True).count() / leads_total) * 100, 2)

    overdue_activities = activity_qs.filter(status=CRMActivity.ActivityStatus.PENDING, due_at__lt=timezone.now()).count()
    upcoming_followups = CRMTask.objects.filter(
        organization_key=organization_key,
        status__in=[CRMTask.TaskStatus.OPEN, CRMTask.TaskStatus.IN_PROGRESS],
    ).count()

    top_performers = list(
        opp_qs.values("assigned_to_id", "assigned_to__first_name", "assigned_to__last_name", "assigned_to__username")
        .annotate(
            won_count=Count("id", filter=Q(is_won=True)),
            total_value=Sum("deal_value", filter=Q(is_won=True)),
        )
        .order_by("-won_count", "-total_value")[:10]
    )

    return {
        "total_leads": leads_total,
        "leads_by_status": leads_by_status,
        "leads_by_source": leads_by_source,
        "leads_by_owner": leads_by_owner,
        "opportunities_by_stage": opp_by_stage,
        "pipeline_value": pipeline_value,
        "weighted_pipeline_value": weighted_pipeline_value,
        "won_deals": won_deals,
        "lost_deals": lost_deals,
        "open_deals": open_deals,
        "conversion_rate": conversion_rate,
        "upcoming_followups": upcoming_followups,
        "overdue_activities": overdue_activities,
        "top_performers": top_performers,
    }


def crm_filter_metadata(organization_key: str):
    return {
        "sources": list(
            CRMOption.objects.filter(organization_key=organization_key, category=CRMOption.Category.LEAD_SOURCE, is_active=True)
            .values("key", "label")
            .order_by("sort_order", "label")
        ),
        "lead_statuses": list(
            CRMOption.objects.filter(organization_key=organization_key, category=CRMOption.Category.LEAD_STATUS, is_active=True)
            .values("key", "label")
            .order_by("sort_order", "label")
        ),
        "priorities": list(
            CRMOption.objects.filter(organization_key=organization_key, category=CRMOption.Category.PRIORITY, is_active=True)
            .values("key", "label")
            .order_by("sort_order", "label")
        ),
        "pipelines": list(
            CRMPipeline.objects.filter(organization_key=organization_key, is_active=True)
            .values("id", "module_key", "name", "is_default")
            .order_by("module_key", "sort_order", "name")
        ),
        "tags": list(CRMTag.objects.filter(organization_key=organization_key, is_active=True).values("id", "name", "color")),
        "owners": list(
            User.objects.filter(is_active=True)
            .values("id", "first_name", "last_name", "username", "role")
            .order_by("first_name", "last_name", "username")
        ),
        "module_keys": [choice[0] for choice in CRMModule.choices],
    }
