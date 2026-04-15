from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.buyers.models import Buyer
from apps.crm.models import CRMAuditEvent, CRMLead, CRMModule, CRMOpportunity, CRMPipeline, CRMPipelineStage, CRMQuotation
from apps.orders.models import Order

User = get_user_model()


class CRMAPITestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin_crm",
            email="admin.crm@example.com",
            password="Admin@123",
            role=User.Role.ADMIN,
        )
        self.viewer = User.objects.create_user(
            username="viewer_crm",
            email="viewer.crm@example.com",
            password="Viewer@123",
            role=User.Role.VIEWER,
        )
        self.rep = User.objects.create_user(
            username="rep_crm",
            email="rep.crm@example.com",
            password="Rep@123",
            role=User.Role.PRODUCTION_SUPERVISOR,
        )

        self.lead_pipeline = CRMPipeline.objects.create(
            organization_key="default",
            module_key=CRMModule.LEAD,
            name="Lead Pipeline",
            is_default=True,
        )
        self.lead_stage_new = CRMPipelineStage.objects.create(
            organization_key="default",
            pipeline=self.lead_pipeline,
            key="new",
            name="New",
            sort_order=1,
            probability=10,
        )
        self.lead_stage_qualified = CRMPipelineStage.objects.create(
            organization_key="default",
            pipeline=self.lead_pipeline,
            key="qualified",
            name="Qualified",
            sort_order=2,
            probability=60,
            required_fields=["estimated_value"],
        )

        self.opp_pipeline = CRMPipeline.objects.create(
            organization_key="default",
            module_key=CRMModule.OPPORTUNITY,
            name="Sales Pipeline",
            is_default=True,
        )
        self.opp_stage_open = CRMPipelineStage.objects.create(
            organization_key="default",
            pipeline=self.opp_pipeline,
            key="prospecting",
            name="Prospecting",
            sort_order=1,
            probability=20,
        )
        self.opp_stage_won = CRMPipelineStage.objects.create(
            organization_key="default",
            pipeline=self.opp_pipeline,
            key="won",
            name="Won",
            sort_order=2,
            probability=100,
            is_closed_won=True,
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def test_lead_crud_and_filter(self):
        self.auth(self.admin)
        create_res = self.client.post(
            "/api/v1/crm/leads/",
            {
                "first_name": "Aarav",
                "last_name": "Patel",
                "email": "aarav@example.com",
                "phone": "+919999000001",
                "source": "website",
                "status": CRMLead.LeadStatus.NEW,
                "priority": "high",
                "pipeline": self.lead_pipeline.id,
                "stage": self.lead_stage_new.id,
                "assigned_to": self.rep.id,
            },
            format="json",
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_res.data.get("lead_number"))

        list_res = self.client.get("/api/v1/crm/leads/?status=new&search=Aarav")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(list_res.data["count"], 1)

        lead_id = create_res.data["id"]
        patch_res = self.client.patch(f"/api/v1/crm/leads/{lead_id}/", {"status": CRMLead.LeadStatus.CONTACTED}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["status"], CRMLead.LeadStatus.CONTACTED)

    def test_viewer_cannot_create_lead(self):
        self.auth(self.viewer)
        res = self.client.post(
            "/api/v1/crm/leads/",
            {
                "first_name": "No",
                "last_name": "Write",
                "email": "readonly@example.com",
                "pipeline": self.lead_pipeline.id,
                "stage": self.lead_stage_new.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_convert_lead_creates_account_contact_and_opportunity(self):
        self.auth(self.admin)
        lead = CRMLead.objects.create(
            organization_key="default",
            first_name="Riya",
            last_name="Sharma",
            company_name="Riya Labs",
            email="riya@example.com",
            phone="9999000002",
            source="website",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.rep,
            estimated_value=Decimal("250000.00"),
        )
        res = self.client.post(
            f"/api/v1/crm/leads/{lead.id}/convert/",
            {
                "account_name": "Riya Labs Pvt Ltd",
                "create_opportunity": True,
                "pipeline_id": self.opp_pipeline.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertTrue(lead.is_converted)
        self.assertIsNotNone(lead.converted_to_account_id)
        self.assertIsNotNone(lead.converted_to_contact_id)
        self.assertIsNotNone(lead.converted_to_opportunity_id)

    def test_kanban_fetch_groups_cards_by_stage(self):
        self.auth(self.admin)
        CRMLead.objects.create(
            organization_key="default",
            first_name="Lead",
            last_name="One",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.rep,
        )
        CRMLead.objects.create(
            organization_key="default",
            first_name="Lead",
            last_name="Two",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_qualified,
            assigned_to=self.rep,
            estimated_value=Decimal("50000"),
        )

        res = self.client.get(f"/api/v1/crm/kanban/boards/lead/?pipeline_id={self.lead_pipeline.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["meta"]["module_key"], CRMModule.LEAD)
        self.assertEqual(len(res.data["columns"]), 2)

    def test_stage_move_validation_required_fields(self):
        self.auth(self.admin)
        lead = CRMLead.objects.create(
            organization_key="default",
            first_name="Need",
            last_name="Value",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.rep,
        )

        res = self.client.post(
            "/api/v1/crm/kanban/move/",
            {
                "module_key": CRMModule.LEAD,
                "record_id": lead.id,
                "to_stage_id": self.lead_stage_qualified.id,
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("required_fields", str(res.data))

    def test_stage_move_creates_audit_event(self):
        self.auth(self.admin)
        lead = CRMLead.objects.create(
            organization_key="default",
            first_name="Move",
            last_name="Me",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.rep,
            estimated_value=Decimal("20000"),
        )

        res = self.client.post(
            "/api/v1/crm/kanban/move/",
            {
                "module_key": CRMModule.LEAD,
                "record_id": lead.id,
                "to_stage_id": self.lead_stage_qualified.id,
                "reason": "Qualified after discovery",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(
            CRMAuditEvent.objects.filter(
                organization_key="default",
                module_key=CRMModule.LEAD,
                entity_type="CRMLead",
                entity_id=lead.id,
                action="stage_changed",
            ).exists()
        )

    def test_bulk_assign_and_archive_actions(self):
        self.auth(self.admin)
        lead1 = CRMLead.objects.create(
            organization_key="default",
            first_name="Bulk",
            last_name="One",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.admin,
            estimated_value=Decimal("10000"),
        )
        lead2 = CRMLead.objects.create(
            organization_key="default",
            first_name="Bulk",
            last_name="Two",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.admin,
            estimated_value=Decimal("20000"),
        )

        assign_res = self.client.post(
            "/api/v1/crm/bulk-actions/",
            {
                "module_key": CRMModule.LEAD,
                "ids": [lead1.id, lead2.id],
                "action": "assign",
                "payload": {"to_user_id": self.rep.id, "reason": "Round robin"},
            },
            format="json",
        )
        self.assertEqual(assign_res.status_code, status.HTTP_200_OK)

        archive_res = self.client.post(
            "/api/v1/crm/bulk-actions/",
            {
                "module_key": CRMModule.LEAD,
                "ids": [lead1.id, lead2.id],
                "action": "archive",
                "payload": {},
            },
            format="json",
        )
        self.assertEqual(archive_res.status_code, status.HTTP_200_OK)

        lead1.refresh_from_db()
        lead2.refresh_from_db()
        self.assertEqual(lead1.assigned_to_id, self.rep.id)
        self.assertTrue(lead1.is_archived)
        self.assertTrue(lead2.is_archived)

    def test_dashboard_summary_endpoint(self):
        self.auth(self.admin)
        CRMLead.objects.create(
            organization_key="default",
            first_name="Dash",
            last_name="Lead",
            status=CRMLead.LeadStatus.NEW,
            source="website",
            pipeline=self.lead_pipeline,
            stage=self.lead_stage_new,
            assigned_to=self.rep,
        )
        CRMOpportunity.objects.create(
            organization_key="default",
            name="Dashboard Deal",
            pipeline=self.opp_pipeline,
            stage=self.opp_stage_open,
            assigned_to=self.rep,
            deal_value=Decimal("90000"),
            probability=20,
        )

        res = self.client.get("/api/v1/crm/dashboard/summary/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("total_leads", res.data)
        self.assertIn("pipeline_value", res.data)

    def test_quotation_can_link_to_order_for_conversion_readiness(self):
        self.auth(self.admin)
        buyer = Buyer.objects.create(name="Buyer User", company_name="Buyer Co")
        order = Order.objects.create(
            buyer=buyer,
            style_name="Polo",
            quantity=100,
            delivery_date=date.today() + timedelta(days=10),
            current_stage=Order.Stage.CUTTING,
            priority=Order.Priority.MEDIUM,
            created_by=self.admin,
        )
        opp = CRMOpportunity.objects.create(
            organization_key="default",
            name="Quote Opp",
            pipeline=self.opp_pipeline,
            stage=self.opp_stage_open,
            assigned_to=self.rep,
            deal_value=Decimal("110000"),
            probability=20,
        )
        quote = CRMQuotation.objects.create(
            organization_key="default",
            related_opportunity=opp,
            status=CRMQuotation.QuoteStatus.ACCEPTED,
            quote_date=date.today(),
            converted_order=order,
            created_by=self.admin,
            updated_by=self.admin,
        )

        res = self.client.get(f"/api/v1/crm/quotations/{quote.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["converted_order"], order.id)
