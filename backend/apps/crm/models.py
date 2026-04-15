from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import Group
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.models import TimeStampedModel


class CRMModule(models.TextChoices):
    LEAD = "lead", "Lead"
    OPPORTUNITY = "opportunity", "Opportunity"
    TASK = "task", "Task"
    ORDER = "order", "Order"
    SUPPORT_TICKET = "support_ticket", "Support Ticket"
    APPROVAL = "approval", "Approval"
    COLLECTION = "collection", "Collection"
    PROCUREMENT = "procurement", "Procurement"


class CRMPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class AddressMixin(models.Model):
    address_line_1 = models.CharField(max_length=255, blank=True)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)

    class Meta:
        abstract = True


class OrganizationMixin(models.Model):
    organization_key = models.CharField(max_length=100, default="default", db_index=True)

    class Meta:
        abstract = True


def assign_human_code(instance: models.Model, *, field_name: str, prefix: str, padding: int = 5) -> None:
    existing = getattr(instance, field_name, None)
    if existing or not instance.pk:
        return

    code = f"{prefix}-{instance.pk:0{padding}d}"
    instance.__class__.objects.filter(pk=instance.pk).update(**{field_name: code})
    setattr(instance, field_name, code)


class CRMOption(TimeStampedModel, OrganizationMixin):
    class Category(models.TextChoices):
        LEAD_SOURCE = "lead_source", "Lead Source"
        LEAD_STATUS = "lead_status", "Lead Status"
        PRIORITY = "priority", "Priority"
        LOSS_REASON = "loss_reason", "Loss Reason"
        WIN_REASON = "win_reason", "Win Reason"
        ACTIVITY_TYPE = "activity_type", "Activity Type"
        TASK_STATUS = "task_status", "Task Status"
        TAG = "tag", "Tag"

    category = models.CharField(max_length=40, choices=Category.choices)
    key = models.SlugField(max_length=80)
    label = models.CharField(max_length=120)
    metadata = models.JSONField(default=dict, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["category", "sort_order", "label"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "category", "key"],
                name="crm_opt_unique",
            )
        ]


class CRMTag(TimeStampedModel, OrganizationMixin):
    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=90)
    color = models.CharField(max_length=20, default="#2563eb")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "slug"],
                name="crm_tag_unique_slug",
            )
        ]

    def __str__(self) -> str:
        return self.name


class CRMPipeline(TimeStampedModel, OrganizationMixin):
    module_key = models.CharField(max_length=32, choices=CRMModule.choices)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_pipelines_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_pipelines_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["module_key", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "module_key", "name"],
                name="crm_pipeline_unique_name",
            ),
            models.UniqueConstraint(
                fields=["organization_key", "module_key"],
                condition=Q(is_default=True),
                name="crm_pipeline_single_default",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.get_module_key_display()} - {self.name}"


class CRMPipelineStage(TimeStampedModel, OrganizationMixin):
    pipeline = models.ForeignKey(CRMPipeline, related_name="stages", on_delete=models.CASCADE)
    key = models.SlugField(max_length=80)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default="#2563eb")
    sort_order = models.PositiveIntegerField(default=0)
    probability = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    is_closed_won = models.BooleanField(default=False)
    is_closed_lost = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    wip_limit = models.PositiveIntegerField(null=True, blank=True)
    required_fields = models.JSONField(default=list, blank=True)
    allowed_from_stage_ids = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["pipeline", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "pipeline", "key"],
                name="crm_stage_unique_key",
            ),
            models.CheckConstraint(
                condition=~(Q(is_closed_won=True) & Q(is_closed_lost=True)),
                name="crm_stage_not_both_closed",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.pipeline.name} - {self.name}"


class CRMKanbanBoardConfig(TimeStampedModel, OrganizationMixin):
    module_key = models.CharField(max_length=32, choices=CRMModule.choices)
    card_layout = models.JSONField(default=dict, blank=True)
    filter_schema = models.JSONField(default=dict, blank=True)
    summary_schema = models.JSONField(default=dict, blank=True)
    allow_card_reordering = models.BooleanField(default=True)
    show_aging = models.BooleanField(default=True)
    show_sla = models.BooleanField(default=True)
    show_blocked = models.BooleanField(default=True)
    load_more_size = models.PositiveIntegerField(default=30)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "module_key"],
                name="crm_board_cfg_unique",
            )
        ]


class CRMCustomFieldDefinition(TimeStampedModel, OrganizationMixin):
    FIELD_TEXT = "text"
    FIELD_TEXTAREA = "textarea"
    FIELD_NUMBER = "number"
    FIELD_DATE = "date"
    FIELD_DATETIME = "datetime"
    FIELD_SELECT = "select"
    FIELD_MULTISELECT = "multiselect"
    FIELD_CHECKBOX = "checkbox"
    FIELD_EMAIL = "email"
    FIELD_PHONE = "phone"

    FIELD_TYPE_CHOICES = (
        (FIELD_TEXT, "Text"),
        (FIELD_TEXTAREA, "Textarea"),
        (FIELD_NUMBER, "Number"),
        (FIELD_DATE, "Date"),
        (FIELD_DATETIME, "Datetime"),
        (FIELD_SELECT, "Select"),
        (FIELD_MULTISELECT, "Multi Select"),
        (FIELD_CHECKBOX, "Checkbox"),
        (FIELD_EMAIL, "Email"),
        (FIELD_PHONE, "Phone"),
    )

    module_key = models.CharField(max_length=32, choices=CRMModule.choices)
    entity_key = models.CharField(max_length=50, db_index=True)
    field_key = models.SlugField(max_length=80)
    label = models.CharField(max_length=120)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    options = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["module_key", "entity_key", "sort_order", "label"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "entity_key", "field_key"],
                name="crm_cf_unique_key",
            )
        ]


class CRMCustomFieldValue(TimeStampedModel, OrganizationMixin):
    field_definition = models.ForeignKey(
        CRMCustomFieldDefinition,
        related_name="values",
        on_delete=models.CASCADE,
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    value = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization_key", "field_definition", "content_type", "object_id"],
                name="crm_cf_val_unique",
            )
        ]
        indexes = [models.Index(fields=["content_type", "object_id"])]


class CRMAccount(TimeStampedModel, AddressMixin, OrganizationMixin):
    class AccountType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        PROSPECT = "prospect", "Prospect"
        PARTNER = "partner", "Partner"
        VENDOR = "vendor", "Vendor"
        DISTRIBUTOR = "distributor", "Distributor"
        CORPORATE = "corporate", "Corporate"

    class AccountStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        PROSPECT = "prospect", "Prospect"
        BLOCKED = "blocked", "Blocked"
        ARCHIVED = "archived", "Archived"

    account_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    name = models.CharField(max_length=180)
    legal_name = models.CharField(max_length=200, blank=True)
    display_name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=30, choices=AccountType.choices, default=AccountType.PROSPECT)
    industry = models.CharField(max_length=120, blank=True)
    website = models.URLField(blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    alternate_phone = models.CharField(max_length=30, blank=True)
    gst_number = models.CharField(max_length=40, blank=True)
    tax_identifier = models.CharField(max_length=50, blank=True)
    annual_revenue = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)
    ownership_type = models.CharField(max_length=100, blank=True)
    billing_address = models.JSONField(default=dict, blank=True)
    shipping_address = models.JSONField(default=dict, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_accounts_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    account_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_accounts_managed",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_accounts_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_accounts_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    tags = models.ManyToManyField(CRMTag, blank=True, related_name="accounts")
    custom_fields = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=AccountStatus.choices, default=AccountStatus.PROSPECT)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["organization_key", "status"]),
            models.Index(fields=["organization_key", "account_type"]),
            models.Index(fields=["organization_key", "assigned_to"]),
            models.Index(fields=["organization_key", "name"]),
        ]

    def __str__(self) -> str:
        return self.display_name or self.name

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.name
        super().save(*args, **kwargs)
        assign_human_code(self, field_name="account_number", prefix="ACC")


class CRMContact(TimeStampedModel, AddressMixin, OrganizationMixin):
    class ContactMode(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        WHATSAPP = "whatsapp", "WhatsApp"
        MEETING = "meeting", "Meeting"

    contact_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    alternate_phone = models.CharField(max_length=30, blank=True)
    designation = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=120, blank=True)
    linked_account = models.ForeignKey(
        CRMAccount,
        related_name="contacts",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    linked_lead = models.ForeignKey(
        "CRMLead",
        related_name="linked_contacts",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_contacts_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_contacts_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_contacts_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    birthday = models.DateField(null=True, blank=True)
    linkedin = models.URLField(blank=True)
    tags = models.ManyToManyField(CRMTag, blank=True, related_name="contacts")
    preferred_contact_mode = models.CharField(
        max_length=20,
        choices=ContactMode.choices,
        default=ContactMode.EMAIL,
    )
    is_primary_contact = models.BooleanField(default=False)
    notes_summary = models.TextField(blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["first_name", "last_name"]
        indexes = [
            models.Index(fields=["organization_key", "assigned_to"]),
            models.Index(fields=["organization_key", "linked_account"]),
            models.Index(fields=["organization_key", "email"]),
            models.Index(fields=["organization_key", "phone"]),
        ]

    @property
    def full_name(self) -> str:
        return " ".join(part for part in [self.first_name, self.last_name] if part).strip()

    def __str__(self) -> str:
        return self.full_name or self.email or f"Contact {self.pk}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        assign_human_code(self, field_name="contact_number", prefix="CNT")


class CRMLead(TimeStampedModel, AddressMixin, OrganizationMixin):
    class LeadStatus(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        NURTURING = "nurturing", "Nurturing"
        PROPOSAL_SENT = "proposal_sent", "Proposal Sent"
        NEGOTIATION = "negotiation", "Negotiation"
        WON = "won", "Won"
        LOST = "lost", "Lost"
        JUNK = "junk", "Junk"
        UNQUALIFIED = "unqualified", "Unqualified"

    lead_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True)
    company_name = models.CharField(max_length=180, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    alternate_phone = models.CharField(max_length=30, blank=True)
    website = models.URLField(blank=True)
    job_title = models.CharField(max_length=120, blank=True)
    source = models.CharField(max_length=80, default="manual", db_index=True)
    source_details = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=30, choices=LeadStatus.choices, default=LeadStatus.NEW)
    priority = models.CharField(max_length=10, choices=CRMPriority.choices, default=CRMPriority.MEDIUM)
    estimated_value = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    expected_close_date = models.DateField(null=True, blank=True)
    lead_score = models.PositiveSmallIntegerField(null=True, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_leads_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    team = models.ForeignKey(Group, related_name="crm_leads", on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_leads_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_leads_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    converted_to_contact = models.ForeignKey(
        CRMContact,
        related_name="converted_from_leads",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    converted_to_account = models.ForeignKey(
        CRMAccount,
        related_name="converted_from_leads",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    converted_to_opportunity = models.ForeignKey(
        "CRMOpportunity",
        related_name="converted_from_leads",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    is_converted = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)
    lost_reason = models.CharField(max_length=200, blank=True)
    tags = models.ManyToManyField(CRMTag, blank=True, related_name="leads")
    custom_fields = models.JSONField(default=dict, blank=True)
    last_activity_at = models.DateTimeField(null=True, blank=True)
    next_follow_up_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    pipeline = models.ForeignKey(
        CRMPipeline,
        related_name="leads",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"module_key": CRMModule.LEAD},
    )
    stage = models.ForeignKey(
        CRMPipelineStage,
        related_name="leads",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    kanban_position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_key", "status"]),
            models.Index(fields=["organization_key", "priority"]),
            models.Index(fields=["organization_key", "assigned_to"]),
            models.Index(fields=["organization_key", "source"]),
            models.Index(fields=["organization_key", "is_converted"]),
            models.Index(fields=["organization_key", "is_archived"]),
            models.Index(fields=["organization_key", "pipeline", "stage"]),
            models.Index(fields=["organization_key", "kanban_position"]),
        ]

    @property
    def full_name(self) -> str:
        return " ".join(part for part in [self.first_name, self.last_name] if part).strip()

    def __str__(self) -> str:
        return self.full_name or self.email or f"Lead {self.pk}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        assign_human_code(self, field_name="lead_number", prefix="LEAD")


class CRMOpportunity(TimeStampedModel, OrganizationMixin):
    class OpportunitySource(models.TextChoices):
        WEBSITE = "website", "Website"
        REFERRAL = "referral", "Referral"
        CAMPAIGN = "campaign", "Campaign"
        PARTNER = "partner", "Partner"
        MANUAL = "manual", "Manual"
        IMPORT = "import", "Import"
        PHONE = "phone", "Phone"
        WHATSAPP = "whatsapp", "WhatsApp"

    opportunity_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    name = models.CharField(max_length=220)
    linked_account = models.ForeignKey(
        CRMAccount,
        related_name="opportunities",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    linked_contact = models.ForeignKey(
        CRMContact,
        related_name="opportunities",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    linked_lead = models.ForeignKey(
        CRMLead,
        related_name="opportunities",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_opportunities_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    deal_value = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal("0.00"))
    weighted_value = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, default="INR")
    pipeline = models.ForeignKey(
        CRMPipeline,
        related_name="opportunities",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"module_key": CRMModule.OPPORTUNITY},
    )
    stage = models.ForeignKey(
        CRMPipelineStage,
        related_name="opportunities",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    probability = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    expected_close_date = models.DateField(null=True, blank=True)
    source = models.CharField(max_length=30, choices=OpportunitySource.choices, default=OpportunitySource.MANUAL)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=CRMPriority.choices, default=CRMPriority.MEDIUM)
    loss_reason = models.CharField(max_length=200, blank=True)
    win_reason = models.CharField(max_length=200, blank=True)
    competitors = models.CharField(max_length=200, blank=True)
    campaign = models.CharField(max_length=120, blank=True)
    tags = models.ManyToManyField(CRMTag, blank=True, related_name="opportunities")
    custom_fields = models.JSONField(default=dict, blank=True)
    last_activity_at = models.DateTimeField(null=True, blank=True)
    next_follow_up_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_opportunities_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_opportunities_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    is_won = models.BooleanField(default=False)
    is_lost = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    kanban_position = models.PositiveIntegerField(default=0)
    is_blocked = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=~(Q(is_won=True) & Q(is_lost=True)),
                name="crm_opp_not_won_lost",
            )
        ]
        indexes = [
            models.Index(fields=["organization_key", "pipeline"]),
            models.Index(fields=["organization_key", "stage"]),
            models.Index(fields=["organization_key", "assigned_to"]),
            models.Index(fields=["organization_key", "expected_close_date"]),
            models.Index(fields=["organization_key", "is_won", "is_lost"]),
            models.Index(fields=["organization_key", "kanban_position"]),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if self.deal_value is not None and self.probability is not None:
            self.weighted_value = (self.deal_value * Decimal(self.probability)) / Decimal("100")
        super().save(*args, **kwargs)
        assign_human_code(self, field_name="opportunity_number", prefix="OPP")


class CRMActivity(TimeStampedModel, OrganizationMixin):
    class ActivityType(models.TextChoices):
        CALL = "call", "Call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"
        WHATSAPP = "whatsapp", "WhatsApp"
        DEMO = "demo", "Demo"
        VISIT = "visit", "Visit"
        FOLLOW_UP = "follow_up", "Follow Up"
        NOTE = "note", "Note"
        TASK = "task", "Task"
        STATUS_CHANGE = "status_change", "Status Change"
        ASSIGNMENT_CHANGE = "assignment_change", "Assignment Change"
        QUOTATION_SENT = "quotation_sent", "Quotation Sent"

    class ActivityStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        MISSED = "missed", "Missed"
        CANCELLED = "cancelled", "Cancelled"

    activity_type = models.CharField(max_length=30, choices=ActivityType.choices)
    subject = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    related_lead = models.ForeignKey(CRMLead, related_name="activities", on_delete=models.CASCADE, null=True, blank=True)
    related_account = models.ForeignKey(CRMAccount, related_name="activities", on_delete=models.CASCADE, null=True, blank=True)
    related_contact = models.ForeignKey(CRMContact, related_name="activities", on_delete=models.CASCADE, null=True, blank=True)
    related_opportunity = models.ForeignKey(
        CRMOpportunity,
        related_name="activities",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=ActivityStatus.choices, default=ActivityStatus.PENDING)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_activities_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_activities_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_activities_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    outcome = models.TextField(blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(related_lead__isnull=False)
                    | Q(related_account__isnull=False)
                    | Q(related_contact__isnull=False)
                    | Q(related_opportunity__isnull=False)
                ),
                name="crm_act_has_parent",
            )
        ]
        indexes = [
            models.Index(fields=["organization_key", "activity_type"]),
            models.Index(fields=["organization_key", "status"]),
            models.Index(fields=["organization_key", "due_at"]),
            models.Index(fields=["organization_key", "assigned_to"]),
        ]

    def save(self, *args, **kwargs):
        if self.status == self.ActivityStatus.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)


class CRMTask(TimeStampedModel, OrganizationMixin):
    class TaskStatus(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        BLOCKED = "blocked", "Blocked"

    task_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    related_lead = models.ForeignKey(CRMLead, related_name="tasks", on_delete=models.CASCADE, null=True, blank=True)
    related_account = models.ForeignKey(CRMAccount, related_name="tasks", on_delete=models.CASCADE, null=True, blank=True)
    related_contact = models.ForeignKey(CRMContact, related_name="tasks", on_delete=models.CASCADE, null=True, blank=True)
    related_opportunity = models.ForeignKey(CRMOpportunity, related_name="tasks", on_delete=models.CASCADE, null=True, blank=True)
    priority = models.CharField(max_length=10, choices=CRMPriority.choices, default=CRMPriority.MEDIUM)
    status = models.CharField(max_length=20, choices=TaskStatus.choices, default=TaskStatus.OPEN)
    due_date = models.DateField()
    start_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_tasks_assigned",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_tasks_assigned_by",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_tasks_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_tasks_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    tags = models.ManyToManyField(CRMTag, blank=True, related_name="tasks")
    pipeline = models.ForeignKey(
        CRMPipeline,
        related_name="tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"module_key": CRMModule.TASK},
    )
    stage = models.ForeignKey(
        CRMPipelineStage,
        related_name="tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    kanban_position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["due_date", "-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(related_lead__isnull=False)
                    | Q(related_account__isnull=False)
                    | Q(related_contact__isnull=False)
                    | Q(related_opportunity__isnull=False)
                ),
                name="crm_task_has_parent",
            )
        ]
        indexes = [
            models.Index(fields=["organization_key", "status"]),
            models.Index(fields=["organization_key", "due_date"]),
            models.Index(fields=["organization_key", "assigned_to"]),
            models.Index(fields=["organization_key", "pipeline", "stage"]),
            models.Index(fields=["organization_key", "kanban_position"]),
        ]

    def save(self, *args, **kwargs):
        if self.status == self.TaskStatus.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)
        assign_human_code(self, field_name="task_number", prefix="TSK")


class CRMNote(TimeStampedModel, OrganizationMixin):
    body = models.TextField()
    is_internal = models.BooleanField(default=True)
    related_lead = models.ForeignKey(CRMLead, related_name="notes", on_delete=models.CASCADE, null=True, blank=True)
    related_account = models.ForeignKey(CRMAccount, related_name="notes", on_delete=models.CASCADE, null=True, blank=True)
    related_contact = models.ForeignKey(CRMContact, related_name="notes", on_delete=models.CASCADE, null=True, blank=True)
    related_opportunity = models.ForeignKey(CRMOpportunity, related_name="notes", on_delete=models.CASCADE, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_notes_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_notes_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(related_lead__isnull=False)
                    | Q(related_account__isnull=False)
                    | Q(related_contact__isnull=False)
                    | Q(related_opportunity__isnull=False)
                ),
                name="crm_note_has_parent",
            )
        ]


class CRMQuotation(TimeStampedModel, OrganizationMixin):
    class QuoteStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent"
        VIEWED = "viewed", "Viewed"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"
        REVISED = "revised", "Revised"

    quote_number = models.CharField(max_length=30, unique=True, null=True, blank=True, db_index=True)
    related_opportunity = models.ForeignKey(CRMOpportunity, related_name="quotations", on_delete=models.CASCADE)
    related_account = models.ForeignKey(CRMAccount, related_name="quotations", on_delete=models.SET_NULL, null=True, blank=True)
    related_contact = models.ForeignKey(CRMContact, related_name="quotations", on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=QuoteStatus.choices, default=QuoteStatus.DRAFT)
    quote_date = models.DateField(default=timezone.localdate)
    valid_until = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal("0.00"))
    discount_total = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal("0.00"))
    tax_total = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal("0.00"))
    grand_total = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal("0.00"))
    currency = models.CharField(max_length=10, default="INR")
    terms = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    attachment_url = models.URLField(blank=True)
    converted_order = models.ForeignKey(
        "orders.Order",
        related_name="crm_quotations",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_quotations_created",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_quotations_updated",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_key", "status"]),
            models.Index(fields=["organization_key", "quote_date"]),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        assign_human_code(self, field_name="quote_number", prefix="QTN")


class CRMQuotationItem(TimeStampedModel, OrganizationMixin):
    quotation = models.ForeignKey(CRMQuotation, related_name="items", on_delete=models.CASCADE)
    item_code = models.CharField(max_length=80, blank=True)
    item_name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=Decimal("1.000"))
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    discount_percent = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    tax_percent = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal("0.00"))
    line_total = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        gross = self.quantity * self.unit_price
        discount_value = gross * (self.discount_percent / Decimal("100"))
        net = gross - discount_value
        tax_value = net * (self.tax_percent / Decimal("100"))
        self.line_total = net + tax_value
        super().save(*args, **kwargs)


class CRMAuditEvent(TimeStampedModel, OrganizationMixin):
    module_key = models.CharField(max_length=32, choices=CRMModule.choices, db_index=True)
    entity_type = models.CharField(max_length=80, db_index=True)
    entity_id = models.PositiveBigIntegerField(db_index=True)
    action = models.CharField(max_length=120)
    label = models.CharField(max_length=180)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_audit_events",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_key", "module_key", "entity_type", "entity_id"]),
        ]


class CRMStageTransitionHistory(TimeStampedModel, OrganizationMixin):
    module_key = models.CharField(max_length=32, choices=CRMModule.choices)
    entity_type = models.CharField(max_length=80)
    entity_id = models.PositiveBigIntegerField()
    pipeline = models.ForeignKey(CRMPipeline, related_name="stage_history", on_delete=models.SET_NULL, null=True, blank=True)
    from_stage = models.ForeignKey(
        CRMPipelineStage,
        related_name="stage_history_from",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    to_stage = models.ForeignKey(
        CRMPipelineStage,
        related_name="stage_history_to",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    moved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_stage_transitions",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_key", "module_key", "entity_type", "entity_id"]),
        ]


class CRMAssignmentHistory(TimeStampedModel, OrganizationMixin):
    module_key = models.CharField(max_length=32, choices=CRMModule.choices)
    entity_type = models.CharField(max_length=80)
    entity_id = models.PositiveBigIntegerField()
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_assignment_from",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_assignment_to",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_assignment_changed_by",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_key", "module_key", "entity_type", "entity_id"]),
        ]


class CRMReminder(TimeStampedModel, OrganizationMixin):
    title = models.CharField(max_length=160)
    reminder_at = models.DateTimeField()
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_reminders",
        on_delete=models.CASCADE,
    )
    related_activity = models.ForeignKey(
        CRMActivity,
        related_name="reminders",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    related_task = models.ForeignKey(
        CRMTask,
        related_name="reminders",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["reminder_at"]
        indexes = [
            models.Index(fields=["organization_key", "assigned_to", "is_read"]),
            models.Index(fields=["organization_key", "reminder_at"]),
        ]


class CRMImportJob(TimeStampedModel, OrganizationMixin):
    class ImportStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    module_key = models.CharField(max_length=32, choices=CRMModule.choices)
    file_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=ImportStatus.choices, default=ImportStatus.PENDING)
    total_rows = models.PositiveIntegerField(default=0)
    processed_rows = models.PositiveIntegerField(default=0)
    success_rows = models.PositiveIntegerField(default=0)
    failed_rows = models.PositiveIntegerField(default=0)
    summary = models.JSONField(default=dict, blank=True)
    error_log = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="crm_import_jobs",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_key", "module_key", "status"]),
        ]


def touch_related_last_activity(*, lead: CRMLead | None = None, opportunity: CRMOpportunity | None = None) -> None:
    now = timezone.now()
    if lead:
        CRMLead.objects.filter(pk=lead.pk).update(last_activity_at=now)
    if opportunity:
        CRMOpportunity.objects.filter(pk=opportunity.pk).update(last_activity_at=now)


def validate_conversion_context(lead: CRMLead) -> None:
    if lead.is_archived:
        raise ValueError("Archived leads cannot be converted")
    if lead.is_converted:
        raise ValueError("Lead is already converted")
