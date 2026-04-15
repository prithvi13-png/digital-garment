from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Model, Q, QuerySet, Sum
from django.utils import timezone
from rest_framework import serializers

from apps.crm.models import (
    CRMAssignmentHistory,
    CRMAuditEvent,
    CRMLead,
    CRMModule,
    CRMOpportunity,
    CRMPipeline,
    CRMPipelineStage,
    CRMQuotation,
    CRMStageTransitionHistory,
    CRMTag,
    CRMTask,
    validate_conversion_context,
)

User = get_user_model()


MODULE_MODEL_MAP: dict[str, type[Model]] = {
    CRMModule.LEAD: CRMLead,
    CRMModule.OPPORTUNITY: CRMOpportunity,
    CRMModule.TASK: CRMTask,
}


@dataclass
class KanbanAdapter:
    module_key: str
    model: type[Model]
    title_field: str
    subtitle_fields: tuple[str, ...]
    value_field: str | None
    owner_field: str
    due_field: str | None


KANBAN_ADAPTERS: dict[str, KanbanAdapter] = {
    CRMModule.LEAD: KanbanAdapter(
        module_key=CRMModule.LEAD,
        model=CRMLead,
        title_field="full_name",
        subtitle_fields=("company_name", "source"),
        value_field="estimated_value",
        owner_field="assigned_to",
        due_field="next_follow_up_at",
    ),
    CRMModule.OPPORTUNITY: KanbanAdapter(
        module_key=CRMModule.OPPORTUNITY,
        model=CRMOpportunity,
        title_field="name",
        subtitle_fields=("linked_account.name", "source"),
        value_field="deal_value",
        owner_field="assigned_to",
        due_field="expected_close_date",
    ),
    CRMModule.TASK: KanbanAdapter(
        module_key=CRMModule.TASK,
        model=CRMTask,
        title_field="title",
        subtitle_fields=("priority", "status"),
        value_field=None,
        owner_field="assigned_to",
        due_field="due_date",
    ),
}


def get_organization_key_from_request(request) -> str:
    query_org = request.query_params.get("organization_key") if hasattr(request, "query_params") else None
    if query_org:
        return query_org

    payload_org = None
    if hasattr(request, "data") and isinstance(request.data, dict):
        payload_org = request.data.get("organization_key")

    return payload_org or "default"


def _resolve_attr_path(instance: Any, path: str) -> Any:
    current = instance
    for piece in path.split("."):
        if current is None:
            return None
        current = getattr(current, piece, None)
    return current


def create_audit_event(
    *,
    organization_key: str,
    module_key: str,
    entity_type: str,
    entity_id: int,
    action: str,
    label: str,
    actor,
    details: dict[str, Any] | None = None,
) -> None:
    CRMAuditEvent.objects.create(
        organization_key=organization_key,
        module_key=module_key,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        label=label,
        actor=actor if actor and actor.is_authenticated else None,
        details=details or {},
    )


def _get_default_pipeline(*, module_key: str, organization_key: str) -> CRMPipeline | None:
    return (
        CRMPipeline.objects.filter(organization_key=organization_key, module_key=module_key, is_active=True)
        .order_by("-is_default", "sort_order", "id")
        .first()
    )


def _get_default_stage(pipeline: CRMPipeline | None) -> CRMPipelineStage | None:
    if not pipeline:
        return None
    return pipeline.stages.filter(is_active=True).order_by("sort_order", "id").first()


def validate_stage_transition(*, entity: Any, to_stage: CRMPipelineStage) -> None:
    if getattr(entity, "pipeline_id", None) and entity.pipeline_id != to_stage.pipeline_id:
        raise serializers.ValidationError({"to_stage_id": "Stage does not belong to record pipeline."})

    from_stage_id = getattr(entity, "stage_id", None)
    allowed_from = to_stage.allowed_from_stage_ids or []
    if allowed_from and from_stage_id not in allowed_from:
        raise serializers.ValidationError({"to_stage_id": "Transition is not allowed by pipeline rules."})

    missing_fields: list[str] = []
    for field_name in to_stage.required_fields or []:
        if not getattr(entity, field_name, None):
            missing_fields.append(field_name)

    if missing_fields:
        raise serializers.ValidationError(
            {"required_fields": f"Please fill required fields before moving stage: {', '.join(missing_fields)}"}
        )


def _serialize_owner(owner: Any) -> dict[str, Any] | None:
    if owner is None:
        return None
    return {
        "id": owner.id,
        "name": owner.get_full_name() or owner.username,
        "role": getattr(owner, "role", ""),
    }


def _serialize_card(record: Any, adapter: KanbanAdapter) -> dict[str, Any]:
    title = _resolve_attr_path(record, adapter.title_field) or f"#{record.pk}"

    subtitles: list[str] = []
    for field_path in adapter.subtitle_fields:
        value = _resolve_attr_path(record, field_path)
        if value:
            subtitles.append(str(value))

    value = _resolve_attr_path(record, adapter.value_field) if adapter.value_field else None
    owner = _resolve_attr_path(record, adapter.owner_field)
    due_at = _resolve_attr_path(record, adapter.due_field) if adapter.due_field else None

    return {
        "id": record.id,
        "title": title,
        "subtitle": " | ".join(subtitles),
        "value": value,
        "owner": _serialize_owner(owner),
        "priority": getattr(record, "priority", None),
        "tags": [{"id": tag.id, "name": tag.name, "color": tag.color} for tag in getattr(record, "tags", []).all()] if hasattr(record, "tags") else [],
        "due_at": due_at,
        "is_blocked": getattr(record, "is_blocked", False),
        "next_action": getattr(record, "next_follow_up_at", None),
        "last_activity_at": getattr(record, "last_activity_at", None),
        "stage_id": getattr(record, "stage_id", None),
        "position": getattr(record, "kanban_position", 0),
        "updated_at": getattr(record, "updated_at", None),
    }


def _apply_kanban_filters(queryset: QuerySet, *, module_key: str, filters: dict[str, Any]) -> QuerySet:
    search = (filters.get("search") or "").strip()
    owner = filters.get("owner")
    priority = filters.get("priority")
    tags = filters.get("tags") or []

    if owner:
        queryset = queryset.filter(assigned_to_id=owner)
    if priority and hasattr(queryset.model, "priority"):
        queryset = queryset.filter(priority=priority)

    if tags:
        queryset = queryset.filter(tags__id__in=tags).distinct()

    if module_key == CRMModule.LEAD:
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])
        if filters.get("source"):
            queryset = queryset.filter(source=filters["source"])
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(company_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(lead_number__icontains=search)
            )

    if module_key == CRMModule.OPPORTUNITY:
        if filters.get("is_open"):
            queryset = queryset.filter(is_won=False, is_lost=False)
        if filters.get("source"):
            queryset = queryset.filter(source=filters["source"])
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(opportunity_number__icontains=search)
                | Q(linked_account__name__icontains=search)
            )

    if module_key == CRMModule.TASK:
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(task_number__icontains=search))

    return queryset


def get_kanban_board(
    *,
    module_key: str,
    organization_key: str,
    filters: dict[str, Any] | None = None,
    page_size: int = 30,
) -> dict[str, Any]:
    adapter = KANBAN_ADAPTERS.get(module_key)
    if adapter is None:
        raise serializers.ValidationError({"module_key": "Kanban board not supported for this module yet."})

    filters = filters or {}

    pipeline_id = filters.get("pipeline_id")
    pipeline_qs = CRMPipeline.objects.filter(organization_key=organization_key, module_key=module_key, is_active=True)
    if pipeline_id:
        pipeline = pipeline_qs.filter(id=pipeline_id).first()
    else:
        pipeline = pipeline_qs.order_by("-is_default", "sort_order", "id").first()

    if pipeline is None:
        return {
            "meta": {
                "module_key": module_key,
                "organization_key": organization_key,
                "pipeline": None,
                "applied_filters": filters,
                "allowed_actions": {"move": False, "bulk": False},
            },
            "summary": {"total_cards": 0, "total_value": 0, "open_cards": 0},
            "columns": [],
        }

    base_qs = adapter.model.objects.filter(organization_key=organization_key, pipeline=pipeline).select_related("stage", "assigned_to")
    if hasattr(adapter.model, "tags"):
        base_qs = base_qs.prefetch_related("tags")

    base_qs = _apply_kanban_filters(base_qs, module_key=module_key, filters=filters)

    columns: list[dict[str, Any]] = []
    stages = list(pipeline.stages.filter(is_active=True).order_by("sort_order", "id"))

    for stage in stages:
        stage_qs = base_qs.filter(stage=stage).order_by("kanban_position", "-updated_at")
        total = stage_qs.count()
        cards = [_serialize_card(item, adapter) for item in stage_qs[:page_size]]
        columns.append(
            {
                "stage": {
                    "id": stage.id,
                    "key": stage.key,
                    "name": stage.name,
                    "color": stage.color,
                    "probability": stage.probability,
                    "is_closed_won": stage.is_closed_won,
                    "is_closed_lost": stage.is_closed_lost,
                    "wip_limit": stage.wip_limit,
                },
                "count": total,
                "has_more": total > len(cards),
                "cards": cards,
            }
        )

    summary = {
        "total_cards": base_qs.count(),
        "open_cards": base_qs.exclude(stage__is_closed_won=True).exclude(stage__is_closed_lost=True).count(),
        "total_value": str(base_qs.aggregate(total=Sum("deal_value"))["total"] or Decimal("0"))
        if module_key == CRMModule.OPPORTUNITY
        else "0",
    }

    return {
        "meta": {
            "module_key": module_key,
            "organization_key": organization_key,
            "pipeline": {"id": pipeline.id, "name": pipeline.name},
            "applied_filters": filters,
            "allowed_actions": {"move": True, "bulk": True},
        },
        "summary": summary,
        "columns": columns,
    }


@transaction.atomic
def move_kanban_card(
    *,
    module_key: str,
    organization_key: str,
    record_id: int,
    to_stage_id: int,
    moved_by,
    reason: str = "",
    position: int | None = None,
) -> Model:
    adapter = KANBAN_ADAPTERS.get(module_key)
    if adapter is None:
        raise serializers.ValidationError({"module_key": "Unsupported module for stage transitions."})

    try:
        entity = adapter.model.objects.select_related("stage", "pipeline").get(
            pk=record_id,
            organization_key=organization_key,
        )
    except adapter.model.DoesNotExist as exc:
        raise serializers.ValidationError({"record_id": "Record not found."}) from exc

    try:
        to_stage = CRMPipelineStage.objects.select_related("pipeline").get(
            pk=to_stage_id,
            organization_key=organization_key,
            is_active=True,
        )
    except CRMPipelineStage.DoesNotExist as exc:
        raise serializers.ValidationError({"to_stage_id": "Destination stage not found."}) from exc

    validate_stage_transition(entity=entity, to_stage=to_stage)

    from_stage = getattr(entity, "stage", None)
    entity.pipeline = to_stage.pipeline
    entity.stage = to_stage
    if position is not None and hasattr(entity, "kanban_position"):
        entity.kanban_position = max(0, int(position))

    if isinstance(entity, CRMOpportunity):
        entity.probability = to_stage.probability
        entity.is_won = to_stage.is_closed_won
        entity.is_lost = to_stage.is_closed_lost
        if to_stage.is_closed_won or to_stage.is_closed_lost:
            entity.closed_at = timezone.now()
        else:
            entity.closed_at = None

    if isinstance(entity, CRMLead):
        if to_stage.is_closed_won:
            entity.status = CRMLead.LeadStatus.WON
        elif to_stage.is_closed_lost:
            entity.status = CRMLead.LeadStatus.LOST

    if hasattr(entity, "updated_by_id"):
        entity.updated_by = moved_by

    entity.save()

    CRMStageTransitionHistory.objects.create(
        organization_key=organization_key,
        module_key=module_key,
        entity_type=entity.__class__.__name__,
        entity_id=entity.id,
        pipeline=to_stage.pipeline,
        from_stage=from_stage,
        to_stage=to_stage,
        moved_by=moved_by if moved_by and moved_by.is_authenticated else None,
        reason=reason,
        metadata={"position": position},
    )

    create_audit_event(
        organization_key=organization_key,
        module_key=module_key,
        entity_type=entity.__class__.__name__,
        entity_id=entity.id,
        action="stage_changed",
        label=f"Stage moved to {to_stage.name}",
        actor=moved_by,
        details={
            "from_stage_id": from_stage.id if from_stage else None,
            "from_stage": from_stage.name if from_stage else None,
            "to_stage_id": to_stage.id,
            "to_stage": to_stage.name,
            "reason": reason,
        },
    )

    return entity


@transaction.atomic
def convert_lead(
    *,
    lead: CRMLead,
    actor,
    organization_key: str,
    account_name: str | None = None,
    create_opportunity: bool = True,
    opportunity_name: str | None = None,
    pipeline_id: int | None = None,
) -> dict[str, Any]:
    validate_conversion_context(lead)

    from apps.crm.models import CRMAccount, CRMContact

    account = CRMAccount.objects.create(
        organization_key=organization_key,
        name=account_name or lead.company_name or lead.full_name,
        display_name=account_name or lead.company_name or lead.full_name,
        email=lead.email,
        phone=lead.phone,
        industry=lead.industry,
        assigned_to=lead.assigned_to,
        created_by=actor,
        updated_by=actor,
        description=lead.description,
        address_line_1=lead.address_line_1,
        address_line_2=lead.address_line_2,
        city=lead.city,
        state=lead.state,
        country=lead.country,
        pincode=lead.pincode,
    )

    contact = CRMContact.objects.create(
        organization_key=organization_key,
        first_name=lead.first_name,
        last_name=lead.last_name,
        email=lead.email,
        phone=lead.phone,
        alternate_phone=lead.alternate_phone,
        designation=lead.job_title,
        linked_account=account,
        linked_lead=lead,
        assigned_to=lead.assigned_to,
        created_by=actor,
        updated_by=actor,
        address_line_1=lead.address_line_1,
        address_line_2=lead.address_line_2,
        city=lead.city,
        state=lead.state,
        country=lead.country,
        pincode=lead.pincode,
    )

    opportunity = None
    if create_opportunity:
        pipeline = None
        if pipeline_id:
            pipeline = CRMPipeline.objects.filter(
                id=pipeline_id,
                organization_key=organization_key,
                module_key=CRMModule.OPPORTUNITY,
                is_active=True,
            ).first()
        if pipeline is None:
            pipeline = _get_default_pipeline(module_key=CRMModule.OPPORTUNITY, organization_key=organization_key)

        stage = _get_default_stage(pipeline)
        opportunity = CRMOpportunity.objects.create(
            organization_key=organization_key,
            name=opportunity_name or f"{lead.full_name or lead.company_name} Deal",
            linked_account=account,
            linked_contact=contact,
            linked_lead=lead,
            assigned_to=lead.assigned_to,
            deal_value=lead.estimated_value or Decimal("0.00"),
            currency="INR",
            pipeline=pipeline,
            stage=stage,
            probability=stage.probability if stage else 0,
            expected_close_date=lead.expected_close_date,
            source=lead.source if lead.source in CRMOpportunity.OpportunitySource.values else CRMOpportunity.OpportunitySource.MANUAL,
            description=lead.description,
            priority=lead.priority,
            created_by=actor,
            updated_by=actor,
            next_follow_up_at=lead.next_follow_up_at,
        )

    lead.is_converted = True
    lead.converted_at = timezone.now()
    lead.converted_to_account = account
    lead.converted_to_contact = contact
    lead.converted_to_opportunity = opportunity
    lead.status = CRMLead.LeadStatus.QUALIFIED
    lead.updated_by = actor
    lead.save()

    CRMAssignmentHistory.objects.create(
        organization_key=organization_key,
        module_key=CRMModule.LEAD,
        entity_type="CRMLead",
        entity_id=lead.id,
        from_user=lead.assigned_to,
        to_user=lead.assigned_to,
        changed_by=actor if actor and actor.is_authenticated else None,
        reason="Lead converted",
    )

    create_audit_event(
        organization_key=organization_key,
        module_key=CRMModule.LEAD,
        entity_type="CRMLead",
        entity_id=lead.id,
        action="lead_converted",
        label="Lead converted to account/contact/opportunity",
        actor=actor,
        details={
            "account_id": account.id,
            "contact_id": contact.id,
            "opportunity_id": opportunity.id if opportunity else None,
        },
    )

    return {
        "lead": lead,
        "account": account,
        "contact": contact,
        "opportunity": opportunity,
    }


def assign_record(
    *,
    module_key: str,
    organization_key: str,
    record_id: int,
    to_user_id: int,
    actor,
    reason: str = "",
) -> Model:
    model_cls = MODULE_MODEL_MAP.get(module_key)
    if model_cls is None:
        raise serializers.ValidationError({"module_key": "Assignment not supported for this module."})

    try:
        record = model_cls.objects.get(pk=record_id, organization_key=organization_key)
    except model_cls.DoesNotExist as exc:
        raise serializers.ValidationError({"record_id": "Record not found."}) from exc

    try:
        to_user = User.objects.get(pk=to_user_id, is_active=True)
    except User.DoesNotExist as exc:
        raise serializers.ValidationError({"to_user_id": "Assignee not found or inactive."}) from exc

    from_user = getattr(record, "assigned_to", None)
    record.assigned_to = to_user
    if hasattr(record, "updated_by"):
        record.updated_by = actor
    record.save(update_fields=["assigned_to", "updated_by", "updated_at"] if hasattr(record, "updated_by") else ["assigned_to", "updated_at"])

    CRMAssignmentHistory.objects.create(
        organization_key=organization_key,
        module_key=module_key,
        entity_type=record.__class__.__name__,
        entity_id=record.id,
        from_user=from_user,
        to_user=to_user,
        changed_by=actor if actor and actor.is_authenticated else None,
        reason=reason,
    )

    create_audit_event(
        organization_key=organization_key,
        module_key=module_key,
        entity_type=record.__class__.__name__,
        entity_id=record.id,
        action="assignment_changed",
        label=f"Assigned to {(to_user.get_full_name() or to_user.username)}",
        actor=actor,
        details={
            "from_user_id": from_user.id if from_user else None,
            "to_user_id": to_user.id,
            "reason": reason,
        },
    )

    return record


@transaction.atomic
def apply_bulk_action(
    *,
    module_key: str,
    organization_key: str,
    ids: list[int],
    action: str,
    actor,
    payload: dict[str, Any],
) -> dict[str, Any]:
    model_cls = MODULE_MODEL_MAP.get(module_key)
    if model_cls is None:
        raise serializers.ValidationError({"module_key": "Bulk action not supported for this module."})

    queryset = model_cls.objects.filter(organization_key=organization_key, id__in=ids)
    matched_ids = list(queryset.values_list("id", flat=True))

    if action == "assign":
        to_user_id = payload.get("to_user_id")
        if not to_user_id:
            raise serializers.ValidationError({"to_user_id": "Assignee is required for assign action."})
        for record_id in matched_ids:
            assign_record(
                module_key=module_key,
                organization_key=organization_key,
                record_id=record_id,
                to_user_id=int(to_user_id),
                actor=actor,
                reason=payload.get("reason", "Bulk assign"),
            )

    elif action == "archive":
        if not hasattr(model_cls, "is_archived"):
            raise serializers.ValidationError({"action": "Archive action is not supported for this module."})
        queryset.update(is_archived=True, updated_at=timezone.now())

    elif action == "change_status":
        status_value = payload.get("status")
        if not status_value or not hasattr(model_cls, "status"):
            raise serializers.ValidationError({"status": "Status is required for change_status action."})
        queryset.update(status=status_value, updated_at=timezone.now())

    elif action == "add_tags":
        tag_ids = payload.get("tag_ids") or []
        if not hasattr(model_cls, "tags"):
            raise serializers.ValidationError({"action": "Tagging is not supported for this module."})
        tags = list(CRMTag.objects.filter(organization_key=organization_key, id__in=tag_ids))
        for obj in queryset:
            obj.tags.add(*tags)

    elif action == "move_stage":
        to_stage_id = payload.get("to_stage_id")
        if not to_stage_id:
            raise serializers.ValidationError({"to_stage_id": "to_stage_id is required for move_stage action."})
        for record_id in matched_ids:
            move_kanban_card(
                module_key=module_key,
                organization_key=organization_key,
                record_id=record_id,
                to_stage_id=int(to_stage_id),
                moved_by=actor,
                reason=payload.get("reason", "Bulk stage move"),
            )

    elif action == "delete":
        queryset.delete()

    else:
        raise serializers.ValidationError({"action": "Unsupported bulk action."})

    return {
        "module_key": module_key,
        "action": action,
        "processed_count": len(matched_ids),
        "processed_ids": matched_ids,
    }


def fetch_timeline(*, organization_key: str, entity_type: str, entity_id: int, limit: int = 100) -> list[dict[str, Any]]:
    from apps.crm.models import CRMActivity, CRMNote, CRMTask

    key_map = {
        "lead": "related_lead_id",
        "account": "related_account_id",
        "contact": "related_contact_id",
        "opportunity": "related_opportunity_id",
    }
    relation_field = key_map.get(entity_type.lower())
    if not relation_field:
        raise serializers.ValidationError({"entity_type": "Unsupported entity type for timeline."})

    entries: list[dict[str, Any]] = []

    audits = CRMAuditEvent.objects.filter(
        organization_key=organization_key,
        entity_type__iexact=f"CRM{entity_type.capitalize()}",
        entity_id=entity_id,
    ).select_related("actor")[:limit]
    for row in audits:
        entries.append(
            {
                "type": "audit",
                "action": row.action,
                "label": row.label,
                "actor": row.actor.get_full_name() or row.actor.username if row.actor else "System",
                "timestamp": row.created_at,
                "details": row.details,
            }
        )

    activities = CRMActivity.objects.filter(organization_key=organization_key, **{relation_field: entity_id}).select_related("assigned_to")[:limit]
    for row in activities:
        entries.append(
            {
                "type": "activity",
                "action": row.activity_type,
                "label": row.subject,
                "actor": row.assigned_to.get_full_name() or row.assigned_to.username if row.assigned_to else "Unassigned",
                "timestamp": row.created_at,
                "details": {
                    "status": row.status,
                    "due_at": row.due_at,
                    "completed_at": row.completed_at,
                },
            }
        )

    notes = CRMNote.objects.filter(organization_key=organization_key, **{relation_field: entity_id}).select_related("created_by")[:limit]
    for row in notes:
        entries.append(
            {
                "type": "note",
                "action": "note_added",
                "label": "Internal note" if row.is_internal else "Note",
                "actor": row.created_by.get_full_name() or row.created_by.username if row.created_by else "Unknown",
                "timestamp": row.created_at,
                "details": {"body": row.body, "is_internal": row.is_internal},
            }
        )

    tasks = CRMTask.objects.filter(organization_key=organization_key, **{relation_field: entity_id}).select_related("assigned_to")[:limit]
    for row in tasks:
        entries.append(
            {
                "type": "task",
                "action": "task_updated",
                "label": row.title,
                "actor": row.assigned_to.get_full_name() or row.assigned_to.username if row.assigned_to else "Unassigned",
                "timestamp": row.created_at,
                "details": {"status": row.status, "due_date": row.due_date, "priority": row.priority},
            }
        )

    if entity_type.lower() == "opportunity":
        quotations = CRMQuotation.objects.filter(organization_key=organization_key, related_opportunity_id=entity_id).select_related("created_by")[:limit]
        for row in quotations:
            entries.append(
                {
                    "type": "quotation",
                    "action": "quotation_updated",
                    "label": f"Quotation {row.quote_number or row.id}",
                    "actor": row.created_by.get_full_name() or row.created_by.username if row.created_by else "Unknown",
                    "timestamp": row.created_at,
                    "details": {"status": row.status, "grand_total": str(row.grand_total), "currency": row.currency},
                }
            )

    entries.sort(key=lambda item: item["timestamp"], reverse=True)
    return entries[:limit]
