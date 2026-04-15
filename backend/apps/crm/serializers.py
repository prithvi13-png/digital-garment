from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.crm.models import (
    CRMAuditEvent,
    CRMKanbanBoardConfig,
    CRMLead,
    CRMModule,
    CRMOption,
    CRMTag,
    CRMAccount,
    CRMActivity,
    CRMContact,
    CRMCustomFieldDefinition,
    CRMOpportunity,
    CRMPipeline,
    CRMPipelineStage,
    CRMQuotation,
    CRMQuotationItem,
    CRMTask,
    CRMNote,
)

User = get_user_model()


class UserLiteSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "full_name", "role")

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class CRMTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMTag
        fields = ("id", "name", "slug", "color", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class CRMOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMOption
        fields = ("id", "category", "key", "label", "metadata", "sort_order", "is_active", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class CRMPipelineStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMPipelineStage
        fields = (
            "id",
            "pipeline",
            "key",
            "name",
            "description",
            "color",
            "sort_order",
            "probability",
            "is_closed_won",
            "is_closed_lost",
            "is_active",
            "wip_limit",
            "required_fields",
            "allowed_from_stage_ids",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CRMPipelineSerializer(serializers.ModelSerializer):
    stages = CRMPipelineStageSerializer(many=True, read_only=True)

    class Meta:
        model = CRMPipeline
        fields = (
            "id",
            "module_key",
            "name",
            "description",
            "is_default",
            "is_active",
            "sort_order",
            "stages",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class CRMCustomFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMCustomFieldDefinition
        fields = (
            "id",
            "module_key",
            "entity_key",
            "field_key",
            "label",
            "field_type",
            "is_required",
            "is_active",
            "options",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class TaggableSerializerMixin(serializers.ModelSerializer):
    tags = CRMTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=CRMTag.objects.filter(is_active=True),
        many=True,
        required=False,
        write_only=True,
    )

    def _pop_tags(self, validated_data):
        return validated_data.pop("tag_ids", None)

    def _set_tags(self, instance, tags):
        if tags is not None:
            instance.tags.set(tags)


class CRMAccountSerializer(TaggableSerializerMixin):
    assigned_to_detail = UserLiteSerializer(source="assigned_to", read_only=True)
    account_manager_detail = UserLiteSerializer(source="account_manager", read_only=True)

    class Meta:
        model = CRMAccount
        fields = (
            "id",
            "account_number",
            "name",
            "legal_name",
            "display_name",
            "account_type",
            "industry",
            "website",
            "email",
            "phone",
            "alternate_phone",
            "gst_number",
            "tax_identifier",
            "annual_revenue",
            "employee_count",
            "ownership_type",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "country",
            "pincode",
            "billing_address",
            "shipping_address",
            "assigned_to",
            "assigned_to_detail",
            "account_manager",
            "account_manager_detail",
            "description",
            "status",
            "custom_fields",
            "tags",
            "tag_ids",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "account_number", "created_by", "updated_by", "created_at", "updated_at")

    def create(self, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().create(validated_data)
        self._set_tags(instance, tags)
        return instance

    def update(self, instance, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().update(instance, validated_data)
        self._set_tags(instance, tags)
        return instance


class CRMContactSerializer(TaggableSerializerMixin):
    assigned_to_detail = UserLiteSerializer(source="assigned_to", read_only=True)
    linked_account_name = serializers.CharField(source="linked_account.name", read_only=True)

    class Meta:
        model = CRMContact
        fields = (
            "id",
            "contact_number",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "alternate_phone",
            "designation",
            "department",
            "linked_account",
            "linked_account_name",
            "linked_lead",
            "assigned_to",
            "assigned_to_detail",
            "birthday",
            "linkedin",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "country",
            "pincode",
            "preferred_contact_mode",
            "is_primary_contact",
            "notes_summary",
            "custom_fields",
            "tags",
            "tag_ids",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "contact_number", "full_name", "created_by", "updated_by", "created_at", "updated_at")

    def create(self, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().create(validated_data)
        self._set_tags(instance, tags)
        return instance

    def update(self, instance, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().update(instance, validated_data)
        self._set_tags(instance, tags)
        return instance


class CRMLeadSerializer(TaggableSerializerMixin):
    assigned_to_detail = UserLiteSerializer(source="assigned_to", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    pipeline_name = serializers.CharField(source="pipeline.name", read_only=True)

    class Meta:
        model = CRMLead
        fields = (
            "id",
            "lead_number",
            "first_name",
            "last_name",
            "full_name",
            "company_name",
            "email",
            "phone",
            "alternate_phone",
            "website",
            "job_title",
            "source",
            "source_details",
            "status",
            "priority",
            "estimated_value",
            "expected_close_date",
            "lead_score",
            "industry",
            "description",
            "address_line_1",
            "address_line_2",
            "city",
            "state",
            "country",
            "pincode",
            "assigned_to",
            "assigned_to_detail",
            "team",
            "pipeline",
            "pipeline_name",
            "stage",
            "stage_name",
            "kanban_position",
            "is_converted",
            "converted_to_contact",
            "converted_to_account",
            "converted_to_opportunity",
            "converted_at",
            "lost_reason",
            "custom_fields",
            "last_activity_at",
            "next_follow_up_at",
            "is_archived",
            "tags",
            "tag_ids",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "lead_number",
            "full_name",
            "is_converted",
            "converted_to_contact",
            "converted_to_account",
            "converted_to_opportunity",
            "converted_at",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().create(validated_data)
        self._set_tags(instance, tags)
        return instance

    def update(self, instance, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().update(instance, validated_data)
        self._set_tags(instance, tags)
        return instance


class CRMOpportunitySerializer(TaggableSerializerMixin):
    assigned_to_detail = UserLiteSerializer(source="assigned_to", read_only=True)
    linked_account_name = serializers.CharField(source="linked_account.name", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    pipeline_name = serializers.CharField(source="pipeline.name", read_only=True)

    class Meta:
        model = CRMOpportunity
        fields = (
            "id",
            "opportunity_number",
            "name",
            "linked_account",
            "linked_account_name",
            "linked_contact",
            "linked_lead",
            "assigned_to",
            "assigned_to_detail",
            "deal_value",
            "weighted_value",
            "currency",
            "pipeline",
            "pipeline_name",
            "stage",
            "stage_name",
            "probability",
            "expected_close_date",
            "source",
            "description",
            "priority",
            "loss_reason",
            "win_reason",
            "competitors",
            "campaign",
            "custom_fields",
            "last_activity_at",
            "next_follow_up_at",
            "closed_at",
            "is_won",
            "is_lost",
            "is_archived",
            "is_blocked",
            "kanban_position",
            "tags",
            "tag_ids",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "opportunity_number",
            "weighted_value",
            "closed_at",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().create(validated_data)
        self._set_tags(instance, tags)
        return instance

    def update(self, instance, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().update(instance, validated_data)
        self._set_tags(instance, tags)
        return instance


class CRMActivitySerializer(serializers.ModelSerializer):
    assigned_to_detail = UserLiteSerializer(source="assigned_to", read_only=True)

    class Meta:
        model = CRMActivity
        fields = (
            "id",
            "activity_type",
            "subject",
            "description",
            "related_lead",
            "related_account",
            "related_contact",
            "related_opportunity",
            "due_at",
            "completed_at",
            "status",
            "assigned_to",
            "assigned_to_detail",
            "outcome",
            "reminder_at",
            "metadata",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "updated_by", "created_at", "updated_at")


class CRMTaskSerializer(TaggableSerializerMixin):
    assigned_to_detail = UserLiteSerializer(source="assigned_to", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)

    class Meta:
        model = CRMTask
        fields = (
            "id",
            "task_number",
            "title",
            "description",
            "related_lead",
            "related_account",
            "related_contact",
            "related_opportunity",
            "priority",
            "status",
            "due_date",
            "start_date",
            "completed_at",
            "assigned_to",
            "assigned_to_detail",
            "assigned_by",
            "pipeline",
            "stage",
            "stage_name",
            "kanban_position",
            "tags",
            "tag_ids",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "task_number", "assigned_by", "created_by", "updated_by", "created_at", "updated_at")

    def create(self, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().create(validated_data)
        self._set_tags(instance, tags)
        return instance

    def update(self, instance, validated_data):
        tags = self._pop_tags(validated_data)
        instance = super().update(instance, validated_data)
        self._set_tags(instance, tags)
        return instance


class CRMNoteSerializer(serializers.ModelSerializer):
    created_by_detail = UserLiteSerializer(source="created_by", read_only=True)

    class Meta:
        model = CRMNote
        fields = (
            "id",
            "body",
            "is_internal",
            "related_lead",
            "related_account",
            "related_contact",
            "related_opportunity",
            "created_by",
            "created_by_detail",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "updated_by", "created_at", "updated_at")


class CRMQuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMQuotationItem
        fields = (
            "id",
            "item_code",
            "item_name",
            "description",
            "quantity",
            "unit_price",
            "discount_percent",
            "tax_percent",
            "line_total",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "line_total", "created_at", "updated_at")


class CRMQuotationSerializer(serializers.ModelSerializer):
    items = CRMQuotationItemSerializer(many=True, required=False)
    created_by_detail = UserLiteSerializer(source="created_by", read_only=True)

    class Meta:
        model = CRMQuotation
        fields = (
            "id",
            "quote_number",
            "related_opportunity",
            "related_account",
            "related_contact",
            "status",
            "quote_date",
            "valid_until",
            "subtotal",
            "discount_total",
            "tax_total",
            "grand_total",
            "currency",
            "terms",
            "notes",
            "attachment_url",
            "converted_order",
            "items",
            "created_by",
            "created_by_detail",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "quote_number",
            "subtotal",
            "discount_total",
            "tax_total",
            "grand_total",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        )

    def _sync_items(self, quotation: CRMQuotation, items_data: list[dict]) -> None:
        quotation.items.all().delete()
        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        tax_total = Decimal("0.00")

        for row in items_data:
            item = CRMQuotationItem.objects.create(quotation=quotation, organization_key=quotation.organization_key, **row)
            gross = item.quantity * item.unit_price
            subtotal += gross
            discount_total += gross * (item.discount_percent / Decimal("100"))
            net = gross - (gross * (item.discount_percent / Decimal("100")))
            tax_total += net * (item.tax_percent / Decimal("100"))

        quotation.subtotal = subtotal
        quotation.discount_total = discount_total
        quotation.tax_total = tax_total
        quotation.grand_total = subtotal - discount_total + tax_total
        quotation.save(update_fields=["subtotal", "discount_total", "tax_total", "grand_total", "updated_at"])

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        quotation = super().create(validated_data)
        self._sync_items(quotation, items_data)
        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        quotation = super().update(instance, validated_data)
        if items_data is not None:
            self._sync_items(quotation, items_data)
        return quotation


class CRMAuditEventSerializer(serializers.ModelSerializer):
    actor_detail = UserLiteSerializer(source="actor", read_only=True)

    class Meta:
        model = CRMAuditEvent
        fields = (
            "id",
            "module_key",
            "entity_type",
            "entity_id",
            "action",
            "label",
            "actor",
            "actor_detail",
            "details",
            "created_at",
        )


class CRMKanbanMoveSerializer(serializers.Serializer):
    module_key = serializers.ChoiceField(choices=CRMModule.choices)
    record_id = serializers.IntegerField(min_value=1)
    to_stage_id = serializers.IntegerField(min_value=1)
    position = serializers.IntegerField(required=False, min_value=0)
    reason = serializers.CharField(required=False, allow_blank=True)
    organization_key = serializers.CharField(required=False)


class CRMLeadConvertSerializer(serializers.Serializer):
    account_name = serializers.CharField(required=False, allow_blank=True)
    create_opportunity = serializers.BooleanField(default=True)
    opportunity_name = serializers.CharField(required=False, allow_blank=True)
    pipeline_id = serializers.IntegerField(required=False)
    organization_key = serializers.CharField(required=False)


class CRMBulkActionSerializer(serializers.Serializer):
    module_key = serializers.ChoiceField(choices=CRMModule.choices)
    ids = serializers.ListField(child=serializers.IntegerField(min_value=1), min_length=1)
    action = serializers.ChoiceField(
        choices=(
            "assign",
            "change_status",
            "add_tags",
            "archive",
            "move_stage",
            "delete",
        )
    )
    payload = serializers.DictField(default=dict)
    organization_key = serializers.CharField(required=False)


class CRMAssignmentSerializer(serializers.Serializer):
    module_key = serializers.ChoiceField(choices=CRMModule.choices)
    record_id = serializers.IntegerField(min_value=1)
    to_user_id = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(required=False, allow_blank=True)
    organization_key = serializers.CharField(required=False)
