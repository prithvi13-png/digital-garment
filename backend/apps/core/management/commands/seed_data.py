from datetime import timedelta
from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.buyers.models import Buyer
from apps.core.demo_users import ensure_demo_users
from apps.crm.models import (
    CRMAccount,
    CRMActivity,
    CRMAssignmentHistory,
    CRMAuditEvent,
    CRMContact,
    CRMCustomFieldDefinition,
    CRMCustomFieldValue,
    CRMImportJob,
    CRMKanbanBoardConfig,
    CRMLead,
    CRMModule,
    CRMNote,
    CRMOpportunity,
    CRMOption,
    CRMPipeline,
    CRMPipelineStage,
    CRMQuotation,
    CRMQuotationItem,
    CRMReminder,
    CRMStageTransitionHistory,
    CRMTag,
    CRMTask,
)
from apps.inventory.models import Material, MaterialStockInward, MaterialStockIssue, StockAdjustment
from apps.orders.models import Order
from apps.planning.models import ProductionPlan
from apps.production.models import ProductionEntry
from apps.production_lines.models import ProductionLine
from apps.productivity.models import Worker, WorkerProductivityEntry
from apps.quality.models import DefectType, QualityInspection, QualityInspectionDefect

class Command(BaseCommand):
    help = "Seed development data for Digital Factory Management System"

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Seed only when database has no users/orders/production entries.",
        )
        parser.add_argument(
            "--reset-crm",
            action="store_true",
            help="Reset CRM records and seed fresh CRM demo data.",
        )

    def handle(self, *args, **options):
        today = timezone.localdate()
        demo_users = ensure_demo_users()
        admin_user = demo_users["admin"]
        sup1 = demo_users["sup_amit"]
        sup2 = demo_users["sup_neha"]
        store_manager = demo_users["store_maya"]
        planner = demo_users["planner_om"]
        quality_inspector = demo_users["qc_riya"]
        production_supervisor = demo_users["prod_arun"]

        if options.get("if_empty"):
            has_domain_data = (
                Buyer.objects.exists()
                or ProductionLine.objects.exists()
                or Order.objects.exists()
                or ProductionEntry.objects.exists()
                or Material.objects.exists()
                or Worker.objects.exists()
                or DefectType.objects.exists()
                or ProductionPlan.objects.exists()
            )
            if has_domain_data:
                self.stdout.write(
                    self.style.WARNING(
                        "Seed skipped because domain data already exists. "
                        "Default demo users/passwords were refreshed."
                    )
                )
                self._print_credentials()
                return

        buyers = [
            {
                "name": "Rahul Mehta",
                "company_name": "Urban Loom Exports",
                "email": "rahul@urbanloom.com",
                "phone": "+91-9876543201",
                "address": "Mumbai, Maharashtra",
                "notes": "High-volume t-shirts",
            },
            {
                "name": "Aisha Khan",
                "company_name": "BlueThread Apparel",
                "email": "aisha@bluethread.com",
                "phone": "+91-9876543202",
                "address": "Bengaluru, Karnataka",
                "notes": "Premium shirts",
            },
            {
                "name": "Vikram Nair",
                "company_name": "NorthStar Garments",
                "email": "vikram@northstar.com",
                "phone": "+91-9876543203",
                "address": "Tiruppur, Tamil Nadu",
                "notes": "Seasonal orders",
            },
        ]

        buyer_objects = []
        for buyer_data in buyers:
            buyer, _ = Buyer.objects.update_or_create(
                company_name=buyer_data["company_name"], defaults=buyer_data
            )
            buyer_objects.append(buyer)

        lines = [
            {"name": "Line 1", "description": "Knits line", "is_active": True},
            {"name": "Line 2", "description": "Woven line", "is_active": True},
            {"name": "Line 3", "description": "Finishing line", "is_active": True},
        ]

        line_objects = []
        for line_data in lines:
            line, _ = ProductionLine.objects.update_or_create(name=line_data["name"], defaults=line_data)
            line_objects.append(line)

        orders_data = [
            {
                "buyer": buyer_objects[0],
                "style_name": "Basic Cotton Tee",
                "style_code": "BCT-101",
                "quantity": 4000,
                "target_per_day": 500,
                "delivery_date": today + timedelta(days=6),
                "current_stage": Order.Stage.STITCHING,
                "priority": Order.Priority.HIGH,
                "notes": "Rush order",
            },
            {
                "buyer": buyer_objects[1],
                "style_name": "Formal Oxford Shirt",
                "style_code": "FOX-212",
                "quantity": 2200,
                "target_per_day": 300,
                "delivery_date": today + timedelta(days=3),
                "current_stage": Order.Stage.QC,
                "priority": Order.Priority.MEDIUM,
                "notes": "QC needs strict collar checks",
            },
            {
                "buyer": buyer_objects[2],
                "style_name": "Kids Jogger Set",
                "style_code": "KJS-330",
                "quantity": 1800,
                "target_per_day": 250,
                "delivery_date": today - timedelta(days=2),
                "current_stage": Order.Stage.PACKING,
                "priority": Order.Priority.HIGH,
                "notes": "Likely delayed",
            },
            {
                "buyer": buyer_objects[0],
                "style_name": "Winter Hoodie",
                "style_code": "WH-440",
                "quantity": 1500,
                "target_per_day": 220,
                "delivery_date": today + timedelta(days=12),
                "current_stage": Order.Stage.CUTTING,
                "priority": Order.Priority.LOW,
                "notes": "Fabric received",
            },
            {
                "buyer": buyer_objects[1],
                "style_name": "Polo Essentials",
                "style_code": "PE-550",
                "quantity": 3000,
                "target_per_day": 420,
                "delivery_date": today - timedelta(days=10),
                "current_stage": Order.Stage.DISPATCH,
                "priority": Order.Priority.MEDIUM,
                "notes": "Already dispatched",
            },
        ]

        order_objects = []
        for payload in orders_data:
            order, _ = Order.objects.update_or_create(
                style_code=payload["style_code"],
                defaults={**payload, "created_by": admin_user},
            )
            order.sync_status(has_production_started=order.production_entries.exists())
            order_objects.append(order)

        ProductionEntry.objects.all().delete()

        entry_rows = [
            (0, 0, sup1, today - timedelta(days=2), 500, 460, 14, "Good run"),
            (0, 1, sup2, today - timedelta(days=2), 450, 430, 10, "Minor machine slowdown"),
            (1, 1, sup1, today - timedelta(days=2), 300, 275, 9, "Need thread refit"),
            (2, 2, sup2, today - timedelta(days=2), 260, 230, 11, "Packing delay"),
            (0, 0, sup1, today - timedelta(days=1), 500, 480, 16, "Shift overtime"),
            (0, 1, sup2, today - timedelta(days=1), 450, 440, 12, "Steady output"),
            (1, 1, sup1, today - timedelta(days=1), 300, 295, 7, "Strong QC pass"),
            (2, 2, sup2, today - timedelta(days=1), 260, 240, 8, "Packing stable"),
            (0, 0, sup1, today, 520, 500, 18, "Today run"),
            (1, 1, sup2, today, 310, 302, 6, "Fast turnaround"),
            (2, 2, sup1, today, 260, 245, 9, "Delayed trims"),
            (3, 0, production_supervisor, today, 220, 190, 5, "Cutting started"),
        ]

        for order_idx, line_idx, supervisor, entry_date, target, produced, rejected, remarks in entry_rows:
            ProductionEntry.objects.create(
                date=entry_date,
                production_line=line_objects[line_idx],
                supervisor=supervisor,
                order=order_objects[order_idx],
                target_qty=target,
                produced_qty=produced,
                rejected_qty=rejected,
                remarks=remarks,
            )

        for order in order_objects:
            order.sync_status(has_production_started=order.production_entries.exists())

        materials_data = [
            {
                "code": "MAT-FAB-001",
                "name": "Combed Cotton Fabric",
                "material_type": Material.MaterialType.FABRIC,
                "unit": "meter",
                "description": "Primary body fabric",
                "is_active": True,
                "barcode_value": "BC-MAT-FAB-001",
            },
            {
                "code": "MAT-THR-001",
                "name": "Polyester Thread 40s",
                "material_type": Material.MaterialType.THREAD,
                "unit": "roll",
                "description": "Stitching thread",
                "is_active": True,
                "barcode_value": "BC-MAT-THR-001",
            },
            {
                "code": "MAT-LBL-001",
                "name": "Size Label Set",
                "material_type": Material.MaterialType.LABEL,
                "unit": "pcs",
                "description": "Branded woven labels",
                "is_active": True,
                "barcode_value": "BC-MAT-LBL-001",
            },
            {
                "code": "MAT-BTN-001",
                "name": "Shell Button 14L",
                "material_type": Material.MaterialType.BUTTON,
                "unit": "pcs",
                "description": "Shirt button",
                "is_active": True,
                "barcode_value": "BC-MAT-BTN-001",
            },
            {
                "code": "MAT-ZIP-001",
                "name": "Nylon Zipper 8-inch",
                "material_type": Material.MaterialType.ZIPPER,
                "unit": "pcs",
                "description": "Kids jogger zipper",
                "is_active": True,
                "barcode_value": "BC-MAT-ZIP-001",
            },
            {
                "code": "MAT-PKG-001",
                "name": "Polybag 12x16",
                "material_type": Material.MaterialType.PACKAGING,
                "unit": "pcs",
                "description": "Final packing bag",
                "is_active": True,
                "barcode_value": "BC-MAT-PKG-001",
            },
        ]

        material_objects = []
        for payload in materials_data:
            material, _ = Material.objects.update_or_create(code=payload["code"], defaults=payload)
            material_objects.append(material)

        MaterialStockInward.objects.all().delete()
        MaterialStockIssue.objects.all().delete()
        StockAdjustment.objects.all().delete()

        inward_rows = [
            (0, "BATCH-COT-001", "ROLL-001", today - timedelta(days=7), Decimal("1800"), Decimal("145.50"), "TexFab Mills", "Initial inward", "IN-MAT-001"),
            (0, "BATCH-COT-002", "ROLL-002", today - timedelta(days=3), Decimal("1500"), Decimal("148.00"), "TexFab Mills", "Top-up inward", "IN-MAT-002"),
            (1, "BATCH-THR-001", "", today - timedelta(days=8), Decimal("500"), Decimal("320.00"), "StitchPro", "Thread stock", "IN-MAT-003"),
            (2, "BATCH-LBL-001", "", today - timedelta(days=5), Decimal("12000"), Decimal("2.50"), "LabelWorks", "Label inward", "IN-MAT-004"),
            (3, "BATCH-BTN-001", "", today - timedelta(days=6), Decimal("22000"), Decimal("1.20"), "TrimHub", "Buttons inward", "IN-MAT-005"),
            (4, "BATCH-ZIP-001", "", today - timedelta(days=6), Decimal("6000"), Decimal("4.75"), "ZipLine", "Zipper inward", "IN-MAT-006"),
            (5, "BATCH-PKG-001", "", today - timedelta(days=4), Decimal("1000"), Decimal("3.20"), "PackNow", "Polybag inward", "IN-MAT-007"),
        ]

        for material_idx, batch_no, roll_no, inward_date, qty, rate, supplier, remarks, barcode in inward_rows:
            MaterialStockInward.objects.create(
                material=material_objects[material_idx],
                batch_no=batch_no,
                roll_no=roll_no,
                inward_date=inward_date,
                quantity=qty,
                rate=rate,
                supplier_name=supplier,
                remarks=remarks,
                barcode_value=barcode,
                created_by=store_manager,
            )

        issue_rows = [
            (0, 0, 0, today - timedelta(days=2), Decimal("900"), "Cutting Team", "Fabric issue for order 1", "IS-MAT-001"),
            (0, 0, 1, today - timedelta(days=1), Decimal("780"), "Stitching Team", "Fabric issue for line 2", "IS-MAT-002"),
            (1, 0, 0, today - timedelta(days=1), Decimal("180"), "Line 1", "Thread issue", "IS-MAT-003"),
            (2, 1, 1, today - timedelta(days=2), Decimal("3500"), "Line 2", "Label issue for fox order", "IS-MAT-004"),
            (3, 1, 1, today - timedelta(days=1), Decimal("8000"), "Line 2", "Button issue", "IS-MAT-005"),
            (3, 2, 2, today, Decimal("7500"), "Line 3", "Button issue for jogger", "IS-MAT-006"),
            (4, 2, 2, today - timedelta(days=1), Decimal("2200"), "Line 3", "Zipper issue", "IS-MAT-007"),
            (4, 3, 0, today, Decimal("1800"), "Line 1", "Zipper issue for hoodie", "IS-MAT-008"),
            (5, 0, 2, today, Decimal("650"), "Packing", "Packaging issue", "IS-MAT-009"),
            (0, 3, 0, today, Decimal("200"), "Line 1", "Fabric for hoodie start", "IS-MAT-010"),
            (3, 3, 0, today, Decimal("1200"), "Line 1", "Button issue for hoodie", "IS-MAT-011"),
        ]

        for material_idx, order_idx, line_idx, issue_date, qty, issued_to, remarks, barcode in issue_rows:
            MaterialStockIssue.objects.create(
                material=material_objects[material_idx],
                order=order_objects[order_idx],
                production_line=line_objects[line_idx],
                issue_date=issue_date,
                quantity=qty,
                issued_to=issued_to,
                remarks=remarks,
                barcode_value=barcode,
                created_by=store_manager,
            )

        adjustment_rows = [
            (0, today, StockAdjustment.AdjustmentType.INCREASE, Decimal("50"), "Physical count surplus", store_manager),
            (0, today, StockAdjustment.AdjustmentType.DECREASE, Decimal("30"), "Cut wastage adjustment", store_manager),
            (1, today - timedelta(days=1), StockAdjustment.AdjustmentType.DECREASE, Decimal("20"), "Thread damage", store_manager),
            (2, today - timedelta(days=1), StockAdjustment.AdjustmentType.INCREASE, Decimal("500"), "Late inward reconciliation", store_manager),
            (3, today, StockAdjustment.AdjustmentType.DECREASE, Decimal("300"), "Button scrap", store_manager),
            (4, today, StockAdjustment.AdjustmentType.DECREASE, Decimal("500"), "Zipper QC fail", store_manager),
            (4, today, StockAdjustment.AdjustmentType.INCREASE, Decimal("200"), "Vendor replacement", store_manager),
            (5, today, StockAdjustment.AdjustmentType.DECREASE, Decimal("200"), "Packing scrap", store_manager),
        ]

        for material_idx, adj_date, adj_type, qty, reason, created_by in adjustment_rows:
            StockAdjustment.objects.create(
                material=material_objects[material_idx],
                adjustment_date=adj_date,
                adjustment_type=adj_type,
                quantity=qty,
                reason=reason,
                created_by=created_by,
            )

        workers_data = [
            {
                "worker_code": "WRK-001",
                "name": "Suresh Kumar",
                "mobile": "+91-9000000001",
                "skill_type": "Flatlock",
                "assigned_line": line_objects[0],
                "barcode_value": "BC-WRK-001",
                "is_active": True,
            },
            {
                "worker_code": "WRK-002",
                "name": "Lakshmi Devi",
                "mobile": "+91-9000000002",
                "skill_type": "Overlock",
                "assigned_line": line_objects[1],
                "barcode_value": "BC-WRK-002",
                "is_active": True,
            },
            {
                "worker_code": "WRK-003",
                "name": "Farhan Ali",
                "mobile": "+91-9000000003",
                "skill_type": "Button attach",
                "assigned_line": line_objects[1],
                "barcode_value": "BC-WRK-003",
                "is_active": True,
            },
            {
                "worker_code": "WRK-004",
                "name": "Nisha Rao",
                "mobile": "+91-9000000004",
                "skill_type": "QC helper",
                "assigned_line": line_objects[2],
                "barcode_value": "BC-WRK-004",
                "is_active": True,
            },
            {
                "worker_code": "WRK-005",
                "name": "Pradeep Jain",
                "mobile": "+91-9000000005",
                "skill_type": "Packer",
                "assigned_line": line_objects[2],
                "barcode_value": "BC-WRK-005",
                "is_active": True,
            },
        ]

        worker_objects = []
        for worker_data in workers_data:
            worker, _ = Worker.objects.update_or_create(
                worker_code=worker_data["worker_code"],
                defaults=worker_data,
            )
            worker_objects.append(worker)

        WorkerProductivityEntry.objects.all().delete()

        worker_productivity_rows = [
            (0, 0, 0, today - timedelta(days=2), 120, 116, 4, "Stable run", production_supervisor),
            (1, 0, 1, today - timedelta(days=2), 110, 102, 5, "Need machine tuning", sup1),
            (2, 1, 1, today - timedelta(days=2), 105, 99, 3, "Button feed issue", sup1),
            (3, 2, 2, today - timedelta(days=2), 100, 93, 4, "QC backlog", quality_inspector),
            (0, 0, 0, today - timedelta(days=1), 120, 118, 2, "Improved", production_supervisor),
            (1, 0, 1, today - timedelta(days=1), 110, 108, 3, "Good shift", sup2),
            (2, 1, 1, today - timedelta(days=1), 105, 103, 2, "Strong output", sup2),
            (3, 2, 2, today - timedelta(days=1), 100, 95, 3, "Rework required", quality_inspector),
            (4, 2, 2, today - timedelta(days=1), 95, 90, 2, "Packing steady", production_supervisor),
            (0, 0, 0, today, 125, 121, 3, "Today run", production_supervisor),
            (1, 1, 1, today, 112, 109, 2, "Near target", sup1),
            (2, 3, 0, today, 98, 88, 4, "New style learning", sup2),
        ]

        for worker_idx, order_idx, line_idx, entry_date, target, actual, rework, remarks, created_by in worker_productivity_rows:
            WorkerProductivityEntry.objects.create(
                worker=worker_objects[worker_idx],
                order=order_objects[order_idx],
                production_line=line_objects[line_idx],
                date=entry_date,
                target_qty=target,
                actual_qty=actual,
                rework_qty=rework,
                remarks=remarks,
                created_by=created_by,
            )

        defect_types_data = [
            {
                "name": "Open Seam",
                "code": "DFT-OPEN-SEAM",
                "severity": DefectType.Severity.MAJOR,
                "description": "Stitch seam opening",
                "is_active": True,
            },
            {
                "name": "Oil Stain",
                "code": "DFT-OIL-STAIN",
                "severity": DefectType.Severity.MINOR,
                "description": "Oil marks on fabric",
                "is_active": True,
            },
            {
                "name": "Broken Needle",
                "code": "DFT-BROKEN-NEEDLE",
                "severity": DefectType.Severity.CRITICAL,
                "description": "Needle contamination risk",
                "is_active": True,
            },
            {
                "name": "Missing Button",
                "code": "DFT-MISSING-BTN",
                "severity": DefectType.Severity.MAJOR,
                "description": "Button missing",
                "is_active": True,
            },
            {
                "name": "Label Mismatch",
                "code": "DFT-LABEL-MIS",
                "severity": DefectType.Severity.MINOR,
                "description": "Incorrect size/brand label",
                "is_active": True,
            },
        ]

        defect_type_objects = []
        for payload in defect_types_data:
            defect_type, _ = DefectType.objects.update_or_create(code=payload["code"], defaults=payload)
            defect_type_objects.append(defect_type)

        QualityInspectionDefect.objects.all().delete()
        QualityInspection.objects.all().delete()

        inspection_rows = [
            {
                "order": order_objects[0],
                "production_line": line_objects[0],
                "inspector": quality_inspector,
                "inspection_stage": QualityInspection.InspectionStage.INLINE,
                "date": today - timedelta(days=2),
                "checked_qty": 250,
                "passed_qty": 225,
                "defective_qty": 25,
                "rejected_qty": 8,
                "rework_qty": 17,
                "remarks": "Inline sampling",
                "barcode_value": "QC-001",
                "defects": [
                    (0, 10, "Seam slippage"),
                    (1, 8, "Oil spots"),
                    (4, 7, "Label issue"),
                ],
            },
            {
                "order": order_objects[1],
                "production_line": line_objects[1],
                "inspector": quality_inspector,
                "inspection_stage": QualityInspection.InspectionStage.ENDLINE,
                "date": today - timedelta(days=1),
                "checked_qty": 220,
                "passed_qty": 205,
                "defective_qty": 15,
                "rejected_qty": 5,
                "rework_qty": 10,
                "remarks": "Endline inspection",
                "barcode_value": "QC-002",
                "defects": [
                    (0, 5, "Open seam"),
                    (3, 6, "Button issue"),
                    (4, 4, "Label mismatch"),
                ],
            },
            {
                "order": order_objects[2],
                "production_line": line_objects[2],
                "inspector": quality_inspector,
                "inspection_stage": QualityInspection.InspectionStage.FINAL,
                "date": today,
                "checked_qty": 210,
                "passed_qty": 188,
                "defective_qty": 22,
                "rejected_qty": 9,
                "rework_qty": 13,
                "remarks": "Final audit",
                "barcode_value": "QC-003",
                "defects": [
                    (1, 6, "Stains"),
                    (2, 5, "Needle concern"),
                    (3, 11, "Button fail"),
                ],
            },
        ]

        for inspection_data in inspection_rows:
            defects = inspection_data.pop("defects")
            inspection = QualityInspection.objects.create(**inspection_data)
            for defect_idx, defect_qty, defect_remarks in defects:
                QualityInspectionDefect.objects.create(
                    inspection=inspection,
                    defect_type=defect_type_objects[defect_idx],
                    quantity=defect_qty,
                    remarks=defect_remarks,
                )

        ProductionPlan.objects.all().delete()

        plan_rows = [
            {
                "order": order_objects[0],
                "production_line": line_objects[0],
                "planned_start_date": today,
                "planned_end_date": today + timedelta(days=3),
                "planned_daily_target": 375,
                "planned_total_qty": 1500,
                "remarks": "Complete bulk stitching",
                "created_by": planner,
            },
            {
                "order": order_objects[1],
                "production_line": line_objects[1],
                "planned_start_date": today,
                "planned_end_date": today + timedelta(days=4),
                "planned_daily_target": 240,
                "planned_total_qty": 1200,
                "remarks": "Endline and packing prep",
                "created_by": planner,
            },
            {
                "order": order_objects[2],
                "production_line": line_objects[2],
                "planned_start_date": today + timedelta(days=1),
                "planned_end_date": today + timedelta(days=4),
                "planned_daily_target": 250,
                "planned_total_qty": 1000,
                "remarks": "Recover delayed order",
                "created_by": planner,
            },
            {
                "order": order_objects[3],
                "production_line": line_objects[0],
                "planned_start_date": today + timedelta(days=5),
                "planned_end_date": today + timedelta(days=9),
                "planned_daily_target": 240,
                "planned_total_qty": 1200,
                "remarks": "Hoodie ramp-up",
                "created_by": planner,
            },
        ]

        for payload in plan_rows:
            plan = ProductionPlan(**payload)
            plan.full_clean()
            plan.save()

        self._seed_crm_data(
            today=today,
            admin_user=admin_user,
            sup1=sup1,
            sup2=sup2,
            planner=planner,
            quality_inspector=quality_inspector,
            reset=options.get("reset_crm", False),
        )

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
        self._print_credentials()

    def _seed_crm_data(
        self,
        *,
        today,
        admin_user,
        sup1,
        sup2,
        planner,
        quality_inspector,
        reset: bool = False,
    ):
        organization_key = "default"
        now = timezone.now()

        has_crm_data = (
            CRMAccount.objects.filter(organization_key=organization_key).exists()
            or CRMContact.objects.filter(organization_key=organization_key).exists()
            or CRMLead.objects.filter(organization_key=organization_key).exists()
            or CRMOpportunity.objects.filter(organization_key=organization_key).exists()
            or CRMActivity.objects.filter(organization_key=organization_key).exists()
            or CRMTask.objects.filter(organization_key=organization_key).exists()
            or CRMQuotation.objects.filter(organization_key=organization_key).exists()
        )

        if has_crm_data and not reset:
            self.stdout.write(
                self.style.WARNING(
                    "CRM seed skipped because CRM records already exist. "
                    "Run `python manage.py seed_data --reset-crm` to reseed CRM demo data."
                )
            )
            return

        if reset:
            self._clear_crm_data(organization_key=organization_key)

        option_rows = [
            (CRMOption.Category.LEAD_SOURCE, "website", "Website", 1),
            (CRMOption.Category.LEAD_SOURCE, "referral", "Referral", 2),
            (CRMOption.Category.LEAD_SOURCE, "campaign", "Campaign", 3),
            (CRMOption.Category.LEAD_SOURCE, "partner", "Partner", 4),
            (CRMOption.Category.LEAD_SOURCE, "manual", "Manual", 5),
            (CRMOption.Category.LEAD_SOURCE, "import", "Import", 6),
            (CRMOption.Category.LEAD_SOURCE, "whatsapp", "WhatsApp", 7),
            (CRMOption.Category.LEAD_SOURCE, "phone", "Phone", 8),
            (CRMOption.Category.LEAD_STATUS, "new", "New", 1),
            (CRMOption.Category.LEAD_STATUS, "contacted", "Contacted", 2),
            (CRMOption.Category.LEAD_STATUS, "qualified", "Qualified", 3),
            (CRMOption.Category.LEAD_STATUS, "proposal_sent", "Proposal Sent", 4),
            (CRMOption.Category.LEAD_STATUS, "negotiation", "Negotiation", 5),
            (CRMOption.Category.LEAD_STATUS, "won", "Won", 6),
            (CRMOption.Category.LEAD_STATUS, "lost", "Lost", 7),
            (CRMOption.Category.LEAD_STATUS, "junk", "Junk", 8),
            (CRMOption.Category.LEAD_STATUS, "unqualified", "Unqualified", 9),
            (CRMOption.Category.LEAD_STATUS, "nurturing", "Nurturing", 10),
            (CRMOption.Category.PRIORITY, "low", "Low", 1),
            (CRMOption.Category.PRIORITY, "medium", "Medium", 2),
            (CRMOption.Category.PRIORITY, "high", "High", 3),
            (CRMOption.Category.PRIORITY, "urgent", "Urgent", 4),
            (CRMOption.Category.ACTIVITY_TYPE, "call", "Call", 1),
            (CRMOption.Category.ACTIVITY_TYPE, "email", "Email", 2),
            (CRMOption.Category.ACTIVITY_TYPE, "meeting", "Meeting", 3),
            (CRMOption.Category.ACTIVITY_TYPE, "whatsapp", "WhatsApp", 4),
            (CRMOption.Category.ACTIVITY_TYPE, "demo", "Demo", 5),
            (CRMOption.Category.ACTIVITY_TYPE, "visit", "Visit", 6),
            (CRMOption.Category.ACTIVITY_TYPE, "follow_up", "Follow Up", 7),
            (CRMOption.Category.ACTIVITY_TYPE, "note", "Note", 8),
            (CRMOption.Category.ACTIVITY_TYPE, "task", "Task", 9),
            (CRMOption.Category.ACTIVITY_TYPE, "status_change", "Status Change", 10),
            (CRMOption.Category.ACTIVITY_TYPE, "assignment_change", "Assignment Change", 11),
            (CRMOption.Category.ACTIVITY_TYPE, "quotation_sent", "Quotation Sent", 12),
            (CRMOption.Category.TASK_STATUS, "open", "Open", 1),
            (CRMOption.Category.TASK_STATUS, "in_progress", "In Progress", 2),
            (CRMOption.Category.TASK_STATUS, "completed", "Completed", 3),
            (CRMOption.Category.TASK_STATUS, "blocked", "Blocked", 4),
            (CRMOption.Category.TASK_STATUS, "cancelled", "Cancelled", 5),
            (CRMOption.Category.LOSS_REASON, "budget", "Budget Constraints", 1),
            (CRMOption.Category.LOSS_REASON, "competitor", "Lost to Competitor", 2),
            (CRMOption.Category.LOSS_REASON, "timeline", "Timeline Mismatch", 3),
            (CRMOption.Category.WIN_REASON, "pricing", "Competitive Pricing", 1),
            (CRMOption.Category.WIN_REASON, "quality", "Product Quality", 2),
            (CRMOption.Category.WIN_REASON, "relationship", "Strong Relationship", 3),
        ]
        for category, key, label, sort_order in option_rows:
            CRMOption.objects.update_or_create(
                organization_key=organization_key,
                category=category,
                key=key,
                defaults={
                    "label": label,
                    "sort_order": sort_order,
                    "is_active": True,
                    "metadata": {},
                },
            )

        tag_rows = [
            ("hot-lead", "Hot Lead", "#ef4444"),
            ("enterprise", "Enterprise", "#0ea5e9"),
            ("new-business", "New Business", "#2563eb"),
            ("renewal", "Renewal", "#22c55e"),
            ("at-risk", "At Risk", "#f97316"),
            ("priority", "Priority", "#7c3aed"),
        ]
        tag_map = {}
        for slug, name, color in tag_rows:
            tag, _ = CRMTag.objects.update_or_create(
                organization_key=organization_key,
                slug=slug,
                defaults={"name": name, "color": color, "is_active": True},
            )
            tag_map[slug] = tag

        lead_pipeline, _ = CRMPipeline.objects.update_or_create(
            organization_key=organization_key,
            module_key=CRMModule.LEAD,
            name="Lead Pipeline",
            defaults={
                "description": "Lead qualification journey",
                "is_default": True,
                "is_active": True,
                "sort_order": 1,
                "created_by": admin_user,
                "updated_by": admin_user,
            },
        )
        CRMPipeline.objects.filter(
            organization_key=organization_key, module_key=CRMModule.LEAD
        ).exclude(pk=lead_pipeline.pk).update(is_default=False)

        opportunity_pipeline, _ = CRMPipeline.objects.update_or_create(
            organization_key=organization_key,
            module_key=CRMModule.OPPORTUNITY,
            name="Sales Pipeline",
            defaults={
                "description": "Deal execution pipeline",
                "is_default": True,
                "is_active": True,
                "sort_order": 1,
                "created_by": admin_user,
                "updated_by": admin_user,
            },
        )
        CRMPipeline.objects.filter(
            organization_key=organization_key, module_key=CRMModule.OPPORTUNITY
        ).exclude(pk=opportunity_pipeline.pk).update(is_default=False)

        task_pipeline, _ = CRMPipeline.objects.update_or_create(
            organization_key=organization_key,
            module_key=CRMModule.TASK,
            name="Task Flow",
            defaults={
                "description": "Follow-up and execution tasks",
                "is_default": True,
                "is_active": True,
                "sort_order": 1,
                "created_by": admin_user,
                "updated_by": admin_user,
            },
        )
        CRMPipeline.objects.filter(
            organization_key=organization_key, module_key=CRMModule.TASK
        ).exclude(pk=task_pipeline.pk).update(is_default=False)

        lead_stage_rows = [
            ("new", "New", "#64748b", 1, 10, False, False),
            ("contacted", "Contacted", "#3b82f6", 2, 25, False, False),
            ("qualified", "Qualified", "#14b8a6", 3, 45, False, False),
            ("proposal_sent", "Proposal Sent", "#8b5cf6", 4, 65, False, False),
            ("negotiation", "Negotiation", "#f59e0b", 5, 80, False, False),
            ("won", "Won", "#22c55e", 6, 100, True, False),
            ("lost", "Lost", "#ef4444", 7, 0, False, True),
        ]
        lead_stages = {}
        for key, name, color, sort_order, probability, is_won, is_lost in lead_stage_rows:
            stage, _ = CRMPipelineStage.objects.update_or_create(
                organization_key=organization_key,
                pipeline=lead_pipeline,
                key=key,
                defaults={
                    "name": name,
                    "description": f"{name} stage",
                    "color": color,
                    "sort_order": sort_order,
                    "probability": probability,
                    "is_closed_won": is_won,
                    "is_closed_lost": is_lost,
                    "is_active": True,
                },
            )
            lead_stages[key] = stage

        opportunity_stage_rows = [
            ("discovery", "Discovery", "#64748b", 1, 15, False, False),
            ("solutioning", "Solutioning", "#0ea5e9", 2, 35, False, False),
            ("proposal", "Proposal", "#8b5cf6", 3, 60, False, False),
            ("negotiation", "Negotiation", "#f59e0b", 4, 80, False, False),
            ("closed_won", "Closed Won", "#22c55e", 5, 100, True, False),
            ("closed_lost", "Closed Lost", "#ef4444", 6, 0, False, True),
        ]
        opportunity_stages = {}
        for key, name, color, sort_order, probability, is_won, is_lost in opportunity_stage_rows:
            stage, _ = CRMPipelineStage.objects.update_or_create(
                organization_key=organization_key,
                pipeline=opportunity_pipeline,
                key=key,
                defaults={
                    "name": name,
                    "description": f"{name} stage",
                    "color": color,
                    "sort_order": sort_order,
                    "probability": probability,
                    "is_closed_won": is_won,
                    "is_closed_lost": is_lost,
                    "is_active": True,
                },
            )
            opportunity_stages[key] = stage

        task_stage_rows = [
            ("todo", "To Do", "#64748b", 1, 0, False, False),
            ("in_progress", "In Progress", "#3b82f6", 2, 0, False, False),
            ("blocked", "Blocked", "#ef4444", 3, 0, False, False),
            ("done", "Done", "#22c55e", 4, 100, True, False),
        ]
        task_stages = {}
        for key, name, color, sort_order, probability, is_won, is_lost in task_stage_rows:
            stage, _ = CRMPipelineStage.objects.update_or_create(
                organization_key=organization_key,
                pipeline=task_pipeline,
                key=key,
                defaults={
                    "name": name,
                    "description": f"{name} stage",
                    "color": color,
                    "sort_order": sort_order,
                    "probability": probability,
                    "is_closed_won": is_won,
                    "is_closed_lost": is_lost,
                    "is_active": True,
                },
            )
            task_stages[key] = stage

        CRMKanbanBoardConfig.objects.update_or_create(
            organization_key=organization_key,
            module_key=CRMModule.LEAD,
            defaults={
                "card_layout": {
                    "title": "full_name",
                    "subtitle": ["company_name", "source"],
                    "show": ["priority", "estimated_value", "next_follow_up_at", "assigned_to"],
                },
                "filter_schema": {"status": True, "source": True, "owner": True, "priority": True, "tags": True},
                "summary_schema": {"show_count": True, "show_value": True, "show_open": True},
            },
        )
        CRMKanbanBoardConfig.objects.update_or_create(
            organization_key=organization_key,
            module_key=CRMModule.OPPORTUNITY,
            defaults={
                "card_layout": {
                    "title": "name",
                    "subtitle": ["linked_account", "source"],
                    "show": ["priority", "deal_value", "expected_close_date", "assigned_to"],
                },
                "filter_schema": {"stage": True, "source": True, "owner": True, "priority": True, "tags": True},
                "summary_schema": {"show_count": True, "show_value": True, "show_weighted": True},
            },
        )
        CRMKanbanBoardConfig.objects.update_or_create(
            organization_key=organization_key,
            module_key=CRMModule.TASK,
            defaults={
                "card_layout": {
                    "title": "title",
                    "subtitle": ["priority", "status"],
                    "show": ["due_date", "assigned_to"],
                },
                "filter_schema": {"status": True, "owner": True, "priority": True, "tags": True},
                "summary_schema": {"show_count": True, "show_open": True},
            },
        )

        custom_fields = [
            {
                "module_key": CRMModule.LEAD,
                "entity_key": "lead",
                "field_key": "budget_band",
                "label": "Budget Band",
                "field_type": CRMCustomFieldDefinition.FIELD_SELECT,
                "options": ["< 5L", "5L - 20L", "> 20L"],
                "sort_order": 1,
            },
            {
                "module_key": CRMModule.OPPORTUNITY,
                "entity_key": "opportunity",
                "field_key": "decision_maker",
                "label": "Decision Maker",
                "field_type": CRMCustomFieldDefinition.FIELD_TEXT,
                "options": [],
                "sort_order": 1,
            },
            {
                "module_key": CRMModule.TASK,
                "entity_key": "task",
                "field_key": "sla_bucket",
                "label": "SLA Bucket",
                "field_type": CRMCustomFieldDefinition.FIELD_SELECT,
                "options": ["P0", "P1", "P2"],
                "sort_order": 1,
            },
        ]
        for definition in custom_fields:
            CRMCustomFieldDefinition.objects.update_or_create(
                organization_key=organization_key,
                entity_key=definition["entity_key"],
                field_key=definition["field_key"],
                defaults={
                    "module_key": definition["module_key"],
                    "label": definition["label"],
                    "field_type": definition["field_type"],
                    "is_required": False,
                    "is_active": True,
                    "options": definition["options"],
                    "sort_order": definition["sort_order"],
                },
            )

        accounts = {}
        account_rows = [
            (
                "nova",
                {
                    "name": "Nova Retail Pvt Ltd",
                    "display_name": "Nova Retail",
                    "legal_name": "Nova Retail Private Limited",
                    "account_type": CRMAccount.AccountType.CUSTOMER,
                    "industry": "Retail Apparel",
                    "website": "https://novaretail.example.com",
                    "email": "procurement@novaretail.example.com",
                    "phone": "+91-9022001001",
                    "annual_revenue": Decimal("65000000.00"),
                    "employee_count": 240,
                    "assigned_to": sup1,
                    "account_manager": sup1,
                    "status": CRMAccount.AccountStatus.ACTIVE,
                    "description": "Premium uniform and workwear buyer.",
                    "tags": ["enterprise", "new-business"],
                },
            ),
            (
                "stellar",
                {
                    "name": "Stellar Uniforms LLP",
                    "display_name": "Stellar Uniforms",
                    "legal_name": "Stellar Uniforms LLP",
                    "account_type": CRMAccount.AccountType.PROSPECT,
                    "industry": "Corporate Uniforms",
                    "website": "https://stellaruniforms.example.com",
                    "email": "hello@stellaruniforms.example.com",
                    "phone": "+91-9022001002",
                    "annual_revenue": Decimal("22000000.00"),
                    "employee_count": 90,
                    "assigned_to": sup2,
                    "account_manager": sup2,
                    "status": CRMAccount.AccountStatus.PROSPECT,
                    "description": "Growing B2B uniform account.",
                    "tags": ["priority"],
                },
            ),
            (
                "greenfield",
                {
                    "name": "Greenfield Exports",
                    "display_name": "Greenfield Exports",
                    "legal_name": "Greenfield Exports India Private Limited",
                    "account_type": CRMAccount.AccountType.CUSTOMER,
                    "industry": "Export Buying House",
                    "website": "https://greenfieldexports.example.com",
                    "email": "sourcing@greenfieldexports.example.com",
                    "phone": "+91-9022001003",
                    "annual_revenue": Decimal("98000000.00"),
                    "employee_count": 320,
                    "assigned_to": sup1,
                    "account_manager": sup1,
                    "status": CRMAccount.AccountStatus.ACTIVE,
                    "description": "Large seasonal export account.",
                    "tags": ["enterprise", "renewal"],
                },
            ),
            (
                "apex",
                {
                    "name": "Apex Industrial Wear",
                    "display_name": "Apex Industrial Wear",
                    "legal_name": "Apex Industrial Wear Limited",
                    "account_type": CRMAccount.AccountType.PARTNER,
                    "industry": "Industrial Safety",
                    "website": "https://apexwear.example.com",
                    "email": "sales@apexwear.example.com",
                    "phone": "+91-9022001004",
                    "annual_revenue": Decimal("41000000.00"),
                    "employee_count": 130,
                    "assigned_to": sup2,
                    "account_manager": sup2,
                    "status": CRMAccount.AccountStatus.ACTIVE,
                    "description": "Channel partner for safety wear contracts.",
                    "tags": ["at-risk"],
                },
            ),
        ]
        for key, payload in account_rows:
            tags = payload.pop("tags")
            account = CRMAccount.objects.create(
                organization_key=organization_key,
                created_by=admin_user,
                updated_by=admin_user,
                **payload,
            )
            account.tags.set([tag_map[item] for item in tags])
            accounts[key] = account

        contacts = {}
        contact_rows = [
            (
                "nova_primary",
                {
                    "first_name": "Rohan",
                    "last_name": "Malhotra",
                    "email": "rohan.malhotra@novaretail.example.com",
                    "phone": "+91-9930011001",
                    "designation": "Procurement Head",
                    "department": "Sourcing",
                    "linked_account": accounts["nova"],
                    "assigned_to": sup1,
                    "preferred_contact_mode": CRMContact.ContactMode.PHONE,
                    "is_primary_contact": True,
                    "notes_summary": "Prefers morning calls between 10-12.",
                    "tags": ["enterprise", "priority"],
                },
            ),
            (
                "nova_qc",
                {
                    "first_name": "Meera",
                    "last_name": "Shah",
                    "email": "meera.shah@novaretail.example.com",
                    "phone": "+91-9930011002",
                    "designation": "Quality Manager",
                    "department": "QA",
                    "linked_account": accounts["nova"],
                    "assigned_to": sup1,
                    "preferred_contact_mode": CRMContact.ContactMode.EMAIL,
                    "is_primary_contact": False,
                    "notes_summary": "Strict about AQL and inspection timelines.",
                    "tags": ["enterprise"],
                },
            ),
            (
                "stellar_primary",
                {
                    "first_name": "Aditi",
                    "last_name": "Kapoor",
                    "email": "aditi.kapoor@stellaruniforms.example.com",
                    "phone": "+91-9930011003",
                    "designation": "Founder",
                    "department": "Leadership",
                    "linked_account": accounts["stellar"],
                    "assigned_to": sup2,
                    "preferred_contact_mode": CRMContact.ContactMode.WHATSAPP,
                    "is_primary_contact": True,
                    "notes_summary": "Fast decisions, price sensitive.",
                    "tags": ["new-business", "priority"],
                },
            ),
            (
                "greenfield_primary",
                {
                    "first_name": "Sneha",
                    "last_name": "Iyer",
                    "email": "sneha.iyer@greenfieldexports.example.com",
                    "phone": "+91-9930011004",
                    "designation": "Category Manager",
                    "department": "Merchandising",
                    "linked_account": accounts["greenfield"],
                    "assigned_to": sup1,
                    "preferred_contact_mode": CRMContact.ContactMode.MEETING,
                    "is_primary_contact": True,
                    "notes_summary": "Requires weekly review meetings.",
                    "tags": ["renewal"],
                },
            ),
            (
                "apex_primary",
                {
                    "first_name": "Vikas",
                    "last_name": "Rao",
                    "email": "vikas.rao@apexwear.example.com",
                    "phone": "+91-9930011005",
                    "designation": "Business Development Lead",
                    "department": "Sales",
                    "linked_account": accounts["apex"],
                    "assigned_to": sup2,
                    "preferred_contact_mode": CRMContact.ContactMode.PHONE,
                    "is_primary_contact": True,
                    "notes_summary": "Need faster turnarounds to close yearly contract.",
                    "tags": ["at-risk"],
                },
            ),
        ]
        for key, payload in contact_rows:
            tags = payload.pop("tags")
            contact = CRMContact.objects.create(
                organization_key=organization_key,
                created_by=admin_user,
                updated_by=admin_user,
                **payload,
            )
            contact.tags.set([tag_map[item] for item in tags])
            contacts[key] = contact

        leads = {}
        lead_rows = [
            (
                "rajesh",
                {
                    "first_name": "Rajesh",
                    "last_name": "Verma",
                    "company_name": "Orbit Workwear",
                    "email": "rajesh.verma@orbitworkwear.example.com",
                    "phone": "+91-9000012001",
                    "source": "website",
                    "status": CRMLead.LeadStatus.NEW,
                    "priority": "high",
                    "estimated_value": Decimal("850000.00"),
                    "expected_close_date": today + timedelta(days=21),
                    "lead_score": 72,
                    "industry": "Industrial Uniforms",
                    "description": "Inbound website lead for 8k pcs yearly demand.",
                    "assigned_to": sup1,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["new"],
                    "kanban_position": 1,
                    "next_follow_up_at": now + timedelta(days=1),
                    "last_activity_at": now - timedelta(hours=14),
                    "tags": ["hot-lead"],
                },
            ),
            (
                "priya",
                {
                    "first_name": "Priya",
                    "last_name": "Nair",
                    "company_name": "Aster Textiles",
                    "email": "priya.nair@astertextiles.example.com",
                    "phone": "+91-9000012002",
                    "source": "referral",
                    "status": CRMLead.LeadStatus.CONTACTED,
                    "priority": "medium",
                    "estimated_value": Decimal("620000.00"),
                    "expected_close_date": today + timedelta(days=28),
                    "lead_score": 61,
                    "industry": "Retail",
                    "description": "Referral lead from existing customer.",
                    "assigned_to": sup2,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["contacted"],
                    "kanban_position": 1,
                    "next_follow_up_at": now + timedelta(days=2),
                    "last_activity_at": now - timedelta(hours=8),
                    "tags": ["new-business"],
                },
            ),
            (
                "sneha_lead",
                {
                    "first_name": "Sneha",
                    "last_name": "Iyer",
                    "company_name": "Greenfield Exports",
                    "email": "crm.sneha@greenfieldexports.example.com",
                    "phone": "+91-9000012003",
                    "source": "campaign",
                    "status": CRMLead.LeadStatus.QUALIFIED,
                    "priority": "high",
                    "estimated_value": Decimal("1850000.00"),
                    "expected_close_date": today + timedelta(days=16),
                    "lead_score": 88,
                    "industry": "Export",
                    "description": "Campaign response for high-volume polo program.",
                    "assigned_to": sup1,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["qualified"],
                    "kanban_position": 1,
                    "next_follow_up_at": now + timedelta(days=1),
                    "last_activity_at": now - timedelta(hours=4),
                    "tags": ["enterprise", "priority"],
                },
            ),
            (
                "vikram",
                {
                    "first_name": "Vikram",
                    "last_name": "Das",
                    "company_name": "Metro Uniform Hub",
                    "email": "vikram.das@metrouniform.example.com",
                    "phone": "+91-9000012004",
                    "source": "partner",
                    "status": CRMLead.LeadStatus.PROPOSAL_SENT,
                    "priority": "urgent",
                    "estimated_value": Decimal("2450000.00"),
                    "expected_close_date": today + timedelta(days=10),
                    "lead_score": 91,
                    "industry": "Corporate Uniforms",
                    "description": "Urgent bid with two competitor quotes already submitted.",
                    "assigned_to": sup2,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["proposal_sent"],
                    "kanban_position": 1,
                    "next_follow_up_at": now + timedelta(hours=18),
                    "last_activity_at": now - timedelta(hours=3),
                    "tags": ["hot-lead", "priority"],
                },
            ),
            (
                "aman",
                {
                    "first_name": "Aman",
                    "last_name": "Bedi",
                    "company_name": "Summit Fabrics",
                    "email": "aman.bedi@summitfabrics.example.com",
                    "phone": "+91-9000012005",
                    "source": "phone",
                    "status": CRMLead.LeadStatus.NEGOTIATION,
                    "priority": "high",
                    "estimated_value": Decimal("1280000.00"),
                    "expected_close_date": today + timedelta(days=8),
                    "lead_score": 79,
                    "industry": "Fabric Trading",
                    "description": "Negotiating rate and dispatch schedule.",
                    "assigned_to": sup1,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["negotiation"],
                    "kanban_position": 1,
                    "next_follow_up_at": now + timedelta(days=1),
                    "last_activity_at": now - timedelta(hours=6),
                    "tags": ["new-business"],
                },
            ),
            (
                "deepa",
                {
                    "first_name": "Deepa",
                    "last_name": "Menon",
                    "company_name": "Kite Fashions",
                    "email": "deepa.menon@kitefashions.example.com",
                    "phone": "+91-9000012006",
                    "source": "whatsapp",
                    "status": CRMLead.LeadStatus.NURTURING,
                    "priority": "low",
                    "estimated_value": Decimal("420000.00"),
                    "expected_close_date": today + timedelta(days=45),
                    "lead_score": 47,
                    "industry": "Boutique",
                    "description": "Long-term nurturing lead for Q4.",
                    "assigned_to": sup2,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["contacted"],
                    "kanban_position": 2,
                    "next_follow_up_at": now + timedelta(days=5),
                    "last_activity_at": now - timedelta(days=2),
                    "tags": ["new-business"],
                },
            ),
            (
                "lost_lead",
                {
                    "first_name": "Harish",
                    "last_name": "Kulkarni",
                    "company_name": "Prime Corporate Wear",
                    "email": "harish.kulkarni@primewear.example.com",
                    "phone": "+91-9000012007",
                    "source": "import",
                    "status": CRMLead.LeadStatus.LOST,
                    "priority": "medium",
                    "estimated_value": Decimal("980000.00"),
                    "expected_close_date": today - timedelta(days=3),
                    "lead_score": 59,
                    "industry": "Corporate Wear",
                    "description": "Lead lost due to lower competitor pricing.",
                    "assigned_to": sup2,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": lead_pipeline,
                    "stage": lead_stages["lost"],
                    "kanban_position": 1,
                    "next_follow_up_at": now + timedelta(days=20),
                    "last_activity_at": now - timedelta(days=4),
                    "lost_reason": "Lost to competitor on pricing",
                    "tags": ["at-risk"],
                },
            ),
        ]
        for key, payload in lead_rows:
            tags = payload.pop("tags")
            lead = CRMLead.objects.create(organization_key=organization_key, **payload)
            lead.tags.set([tag_map[item] for item in tags])
            leads[key] = lead

        opportunities = {}
        opportunity_rows = [
            (
                "nova_deal",
                {
                    "name": "Nova Summer Uniform Rollout",
                    "linked_account": accounts["nova"],
                    "linked_contact": contacts["nova_primary"],
                    "linked_lead": leads["rajesh"],
                    "assigned_to": sup1,
                    "deal_value": Decimal("2500000.00"),
                    "currency": "INR",
                    "pipeline": opportunity_pipeline,
                    "stage": opportunity_stages["proposal"],
                    "probability": opportunity_stages["proposal"].probability,
                    "expected_close_date": today + timedelta(days=18),
                    "source": CRMOpportunity.OpportunitySource.REFERRAL,
                    "description": "Bulk order for 12-month uniform contract.",
                    "priority": "high",
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "next_follow_up_at": now + timedelta(days=2),
                    "last_activity_at": now - timedelta(hours=7),
                    "is_blocked": False,
                    "tags": ["enterprise", "priority"],
                },
            ),
            (
                "stellar_deal",
                {
                    "name": "Stellar Pilot Program",
                    "linked_account": accounts["stellar"],
                    "linked_contact": contacts["stellar_primary"],
                    "linked_lead": leads["priya"],
                    "assigned_to": sup2,
                    "deal_value": Decimal("720000.00"),
                    "currency": "INR",
                    "pipeline": opportunity_pipeline,
                    "stage": opportunity_stages["solutioning"],
                    "probability": opportunity_stages["solutioning"].probability,
                    "expected_close_date": today + timedelta(days=24),
                    "source": CRMOpportunity.OpportunitySource.CAMPAIGN,
                    "description": "Pilot lot for hospitality client uniforms.",
                    "priority": "medium",
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "next_follow_up_at": now + timedelta(days=3),
                    "last_activity_at": now - timedelta(hours=11),
                    "is_blocked": False,
                    "tags": ["new-business"],
                },
            ),
            (
                "greenfield_deal",
                {
                    "name": "Greenfield Export Polo Program",
                    "linked_account": accounts["greenfield"],
                    "linked_contact": contacts["greenfield_primary"],
                    "linked_lead": leads["sneha_lead"],
                    "assigned_to": sup1,
                    "deal_value": Decimal("4200000.00"),
                    "currency": "INR",
                    "pipeline": opportunity_pipeline,
                    "stage": opportunity_stages["negotiation"],
                    "probability": opportunity_stages["negotiation"].probability,
                    "expected_close_date": today + timedelta(days=9),
                    "source": CRMOpportunity.OpportunitySource.WEBSITE,
                    "description": "Large export order with phased dispatch.",
                    "priority": "urgent",
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "next_follow_up_at": now + timedelta(hours=20),
                    "last_activity_at": now - timedelta(hours=2),
                    "is_blocked": True,
                    "tags": ["enterprise", "hot-lead"],
                },
            ),
            (
                "apex_deal",
                {
                    "name": "Apex Annual Safety-Wear Contract",
                    "linked_account": accounts["apex"],
                    "linked_contact": contacts["apex_primary"],
                    "linked_lead": leads["aman"],
                    "assigned_to": sup2,
                    "deal_value": Decimal("1650000.00"),
                    "currency": "INR",
                    "pipeline": opportunity_pipeline,
                    "stage": opportunity_stages["discovery"],
                    "probability": opportunity_stages["discovery"].probability,
                    "expected_close_date": today + timedelta(days=30),
                    "source": CRMOpportunity.OpportunitySource.PARTNER,
                    "description": "Contract under scope discovery for FY demand.",
                    "priority": "high",
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "next_follow_up_at": now + timedelta(days=4),
                    "last_activity_at": now - timedelta(days=1),
                    "is_blocked": False,
                    "tags": ["at-risk"],
                },
            ),
            (
                "won_deal",
                {
                    "name": "Metro Uniform Hub Dispatch Program",
                    "linked_account": accounts["nova"],
                    "linked_contact": contacts["nova_qc"],
                    "linked_lead": leads["vikram"],
                    "assigned_to": sup2,
                    "deal_value": Decimal("1320000.00"),
                    "currency": "INR",
                    "pipeline": opportunity_pipeline,
                    "stage": opportunity_stages["closed_won"],
                    "probability": 100,
                    "expected_close_date": today - timedelta(days=2),
                    "source": CRMOpportunity.OpportunitySource.PHONE,
                    "description": "Won after timeline and QC commitment.",
                    "priority": "high",
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "closed_at": now - timedelta(days=2),
                    "is_won": True,
                    "is_lost": False,
                    "win_reason": "Strong relationship and fast sample approval",
                    "tags": ["renewal"],
                },
            ),
            (
                "lost_deal",
                {
                    "name": "Prime Corporate Wear Re-bid",
                    "linked_account": accounts["stellar"],
                    "linked_contact": contacts["stellar_primary"],
                    "linked_lead": leads["lost_lead"],
                    "assigned_to": sup2,
                    "deal_value": Decimal("980000.00"),
                    "currency": "INR",
                    "pipeline": opportunity_pipeline,
                    "stage": opportunity_stages["closed_lost"],
                    "probability": 0,
                    "expected_close_date": today - timedelta(days=4),
                    "source": CRMOpportunity.OpportunitySource.IMPORT,
                    "description": "Lost in final commercial round.",
                    "priority": "medium",
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "closed_at": now - timedelta(days=4),
                    "is_won": False,
                    "is_lost": True,
                    "loss_reason": "Competitor offered better landed price",
                    "tags": ["at-risk"],
                },
            ),
        ]
        for key, payload in opportunity_rows:
            tags = payload.pop("tags")
            opportunity = CRMOpportunity.objects.create(organization_key=organization_key, **payload)
            opportunity.tags.set([tag_map[item] for item in tags])
            opportunities[key] = opportunity

        leads["sneha_lead"].is_converted = True
        leads["sneha_lead"].converted_at = now - timedelta(days=1)
        leads["sneha_lead"].converted_to_account = accounts["greenfield"]
        leads["sneha_lead"].converted_to_contact = contacts["greenfield_primary"]
        leads["sneha_lead"].converted_to_opportunity = opportunities["greenfield_deal"]
        leads["sneha_lead"].save()

        tasks = {}
        task_rows = [
            (
                "followup_nova",
                {
                    "title": "Follow up on Nova sample approval",
                    "description": "Collect final comments from Nova QC before PO release.",
                    "related_lead": leads["rajesh"],
                    "related_account": accounts["nova"],
                    "related_contact": contacts["nova_qc"],
                    "related_opportunity": opportunities["nova_deal"],
                    "priority": "high",
                    "status": CRMTask.TaskStatus.IN_PROGRESS,
                    "due_date": today + timedelta(days=1),
                    "start_date": today - timedelta(days=1),
                    "assigned_to": sup1,
                    "assigned_by": admin_user,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": task_pipeline,
                    "stage": task_stages["in_progress"],
                    "kanban_position": 1,
                    "tags": ["priority"],
                },
            ),
            (
                "schedule_demo",
                {
                    "title": "Schedule product demo with Stellar team",
                    "description": "Book online demo and share capability deck.",
                    "related_lead": leads["priya"],
                    "related_account": accounts["stellar"],
                    "related_contact": contacts["stellar_primary"],
                    "related_opportunity": opportunities["stellar_deal"],
                    "priority": "medium",
                    "status": CRMTask.TaskStatus.OPEN,
                    "due_date": today + timedelta(days=2),
                    "start_date": today,
                    "assigned_to": sup2,
                    "assigned_by": admin_user,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": task_pipeline,
                    "stage": task_stages["todo"],
                    "kanban_position": 1,
                    "tags": ["new-business"],
                },
            ),
            (
                "greenfield_costing",
                {
                    "title": "Finalize Greenfield cost sheet",
                    "description": "Lock trims and labor costing for negotiation call.",
                    "related_lead": leads["sneha_lead"],
                    "related_account": accounts["greenfield"],
                    "related_contact": contacts["greenfield_primary"],
                    "related_opportunity": opportunities["greenfield_deal"],
                    "priority": "urgent",
                    "status": CRMTask.TaskStatus.BLOCKED,
                    "due_date": today,
                    "start_date": today - timedelta(days=2),
                    "assigned_to": planner,
                    "assigned_by": admin_user,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": task_pipeline,
                    "stage": task_stages["blocked"],
                    "kanban_position": 1,
                    "tags": ["at-risk"],
                },
            ),
            (
                "apex_visit",
                {
                    "title": "Plan on-site visit for Apex",
                    "description": "Coordinate technical team visit and fit trials.",
                    "related_lead": leads["aman"],
                    "related_account": accounts["apex"],
                    "related_contact": contacts["apex_primary"],
                    "related_opportunity": opportunities["apex_deal"],
                    "priority": "high",
                    "status": CRMTask.TaskStatus.OPEN,
                    "due_date": today + timedelta(days=5),
                    "start_date": today + timedelta(days=2),
                    "assigned_to": sup2,
                    "assigned_by": admin_user,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": task_pipeline,
                    "stage": task_stages["todo"],
                    "kanban_position": 2,
                    "tags": ["at-risk"],
                },
            ),
            (
                "close_docs",
                {
                    "title": "Share closure documents for won deal",
                    "description": "Submit finalized specs and dispatch milestones.",
                    "related_lead": leads["vikram"],
                    "related_account": accounts["nova"],
                    "related_contact": contacts["nova_primary"],
                    "related_opportunity": opportunities["won_deal"],
                    "priority": "medium",
                    "status": CRMTask.TaskStatus.COMPLETED,
                    "due_date": today - timedelta(days=1),
                    "start_date": today - timedelta(days=3),
                    "completed_at": now - timedelta(days=1),
                    "assigned_to": sup1,
                    "assigned_by": admin_user,
                    "created_by": admin_user,
                    "updated_by": admin_user,
                    "pipeline": task_pipeline,
                    "stage": task_stages["done"],
                    "kanban_position": 1,
                    "tags": ["renewal"],
                },
            ),
        ]
        for key, payload in task_rows:
            tags = payload.pop("tags")
            task = CRMTask.objects.create(organization_key=organization_key, **payload)
            task.tags.set([tag_map[item] for item in tags])
            tasks[key] = task

        activity_rows = [
            {
                "activity_type": CRMActivity.ActivityType.CALL,
                "subject": "Intro call with Orbit Workwear",
                "description": "Captured requirement and expected monthly volume.",
                "related_lead": leads["rajesh"],
                "related_opportunity": opportunities["nova_deal"],
                "related_account": accounts["nova"],
                "related_contact": contacts["nova_primary"],
                "due_at": now - timedelta(hours=10),
                "status": CRMActivity.ActivityStatus.COMPLETED,
                "completed_at": now - timedelta(hours=9),
                "assigned_to": sup1,
                "created_by": sup1,
                "updated_by": sup1,
                "outcome": "Positive fit, awaiting sample feedback.",
            },
            {
                "activity_type": CRMActivity.ActivityType.MEETING,
                "subject": "Proposal review with Greenfield",
                "description": "Review commercial terms and lead time.",
                "related_lead": leads["sneha_lead"],
                "related_opportunity": opportunities["greenfield_deal"],
                "related_account": accounts["greenfield"],
                "related_contact": contacts["greenfield_primary"],
                "due_at": now + timedelta(hours=18),
                "status": CRMActivity.ActivityStatus.PENDING,
                "assigned_to": sup1,
                "created_by": admin_user,
                "updated_by": admin_user,
                "outcome": "",
                "reminder_at": now + timedelta(hours=10),
            },
            {
                "activity_type": CRMActivity.ActivityType.DEMO,
                "subject": "Capability demo for Stellar",
                "description": "Present dashboard and quality workflow.",
                "related_lead": leads["priya"],
                "related_opportunity": opportunities["stellar_deal"],
                "related_account": accounts["stellar"],
                "related_contact": contacts["stellar_primary"],
                "due_at": now + timedelta(days=1, hours=2),
                "status": CRMActivity.ActivityStatus.PENDING,
                "assigned_to": sup2,
                "created_by": admin_user,
                "updated_by": admin_user,
                "outcome": "",
                "reminder_at": now + timedelta(hours=20),
            },
            {
                "activity_type": CRMActivity.ActivityType.FOLLOW_UP,
                "subject": "Recover lost proposal feedback",
                "description": "Understand exact gap in commercial bid.",
                "related_lead": leads["lost_lead"],
                "related_opportunity": opportunities["lost_deal"],
                "related_account": accounts["stellar"],
                "related_contact": contacts["stellar_primary"],
                "due_at": now - timedelta(days=1),
                "status": CRMActivity.ActivityStatus.MISSED,
                "assigned_to": sup2,
                "created_by": admin_user,
                "updated_by": admin_user,
                "outcome": "Customer unavailable for call.",
            },
            {
                "activity_type": CRMActivity.ActivityType.QUOTATION_SENT,
                "subject": "Sent quotation for Nova rollout",
                "description": "Shared pricing and payment terms.",
                "related_lead": leads["rajesh"],
                "related_opportunity": opportunities["nova_deal"],
                "related_account": accounts["nova"],
                "related_contact": contacts["nova_primary"],
                "due_at": now - timedelta(hours=5),
                "status": CRMActivity.ActivityStatus.COMPLETED,
                "completed_at": now - timedelta(hours=4),
                "assigned_to": sup1,
                "created_by": sup1,
                "updated_by": sup1,
                "outcome": "Customer requested one revised line item.",
            },
        ]
        activities = []
        for payload in activity_rows:
            activities.append(CRMActivity.objects.create(organization_key=organization_key, **payload))

        note_rows = [
            {
                "body": "Customer emphasized delivery reliability over aggressive pricing.",
                "is_internal": True,
                "related_lead": leads["rajesh"],
                "related_account": accounts["nova"],
                "related_contact": contacts["nova_primary"],
                "related_opportunity": opportunities["nova_deal"],
                "created_by": sup1,
                "updated_by": sup1,
            },
            {
                "body": "Need fabric shade card approval before final PO.",
                "is_internal": True,
                "related_lead": leads["sneha_lead"],
                "related_account": accounts["greenfield"],
                "related_contact": contacts["greenfield_primary"],
                "related_opportunity": opportunities["greenfield_deal"],
                "created_by": planner,
                "updated_by": planner,
            },
            {
                "body": "Apex wants a pilot lot before annual contract sign-off.",
                "is_internal": False,
                "related_lead": leads["aman"],
                "related_account": accounts["apex"],
                "related_contact": contacts["apex_primary"],
                "related_opportunity": opportunities["apex_deal"],
                "created_by": sup2,
                "updated_by": sup2,
            },
        ]
        for payload in note_rows:
            CRMNote.objects.create(organization_key=organization_key, **payload)

        def create_quote(
            *,
            quote_status: str,
            opportunity,
            account,
            contact,
            created_by,
            valid_days: int,
            items: list[dict],
            notes: str,
        ):
            quotation = CRMQuotation.objects.create(
                organization_key=organization_key,
                related_opportunity=opportunity,
                related_account=account,
                related_contact=contact,
                status=quote_status,
                quote_date=today,
                valid_until=today + timedelta(days=valid_days),
                currency="INR",
                terms="50% advance, balance against dispatch.",
                notes=notes,
                created_by=created_by,
                updated_by=created_by,
            )

            subtotal = Decimal("0.00")
            discount_total = Decimal("0.00")
            tax_total = Decimal("0.00")

            for row in items:
                quantity = Decimal(str(row["quantity"]))
                unit_price = Decimal(str(row["unit_price"]))
                discount_percent = Decimal(str(row.get("discount_percent", "0")))
                tax_percent = Decimal(str(row.get("tax_percent", "0")))

                gross = quantity * unit_price
                discount_value = gross * (discount_percent / Decimal("100"))
                net = gross - discount_value
                tax_value = net * (tax_percent / Decimal("100"))

                subtotal += gross
                discount_total += discount_value
                tax_total += tax_value

                CRMQuotationItem.objects.create(
                    organization_key=organization_key,
                    quotation=quotation,
                    item_code=row.get("item_code", ""),
                    item_name=row["item_name"],
                    description=row.get("description", ""),
                    quantity=quantity,
                    unit_price=unit_price,
                    discount_percent=discount_percent,
                    tax_percent=tax_percent,
                )

            quotation.subtotal = subtotal
            quotation.discount_total = discount_total
            quotation.tax_total = tax_total
            quotation.grand_total = subtotal - discount_total + tax_total
            quotation.save()
            return quotation

        quote_nova = create_quote(
            quote_status=CRMQuotation.QuoteStatus.SENT,
            opportunity=opportunities["nova_deal"],
            account=accounts["nova"],
            contact=contacts["nova_primary"],
            created_by=sup1,
            valid_days=20,
            notes="Version 1 sent, waiting for volume confirmation.",
            items=[
                {
                    "item_code": "DF-UNF-001",
                    "item_name": "Corporate Shirt",
                    "description": "Premium cotton blend",
                    "quantity": "4200",
                    "unit_price": "280.00",
                    "discount_percent": "4.00",
                    "tax_percent": "5.00",
                },
                {
                    "item_code": "DF-UNF-002",
                    "item_name": "Workwear Trouser",
                    "description": "Durable twill fabric",
                    "quantity": "4200",
                    "unit_price": "330.00",
                    "discount_percent": "3.00",
                    "tax_percent": "5.00",
                },
            ],
        )
        quote_greenfield = create_quote(
            quote_status=CRMQuotation.QuoteStatus.DRAFT,
            opportunity=opportunities["greenfield_deal"],
            account=accounts["greenfield"],
            contact=contacts["greenfield_primary"],
            created_by=sup1,
            valid_days=30,
            notes="Draft quote under costing review.",
            items=[
                {
                    "item_code": "DF-POLO-001",
                    "item_name": "Export Polo Tee",
                    "description": "Bio-wash polo with embroidery",
                    "quantity": "12000",
                    "unit_price": "198.00",
                    "discount_percent": "2.50",
                    "tax_percent": "5.00",
                }
            ],
        )
        quote_won = create_quote(
            quote_status=CRMQuotation.QuoteStatus.ACCEPTED,
            opportunity=opportunities["won_deal"],
            account=accounts["nova"],
            contact=contacts["nova_qc"],
            created_by=sup2,
            valid_days=15,
            notes="Accepted quote converted for dispatch planning.",
            items=[
                {
                    "item_code": "DF-MET-001",
                    "item_name": "Metro Uniform Set",
                    "description": "Shirt + Trouser set",
                    "quantity": "3000",
                    "unit_price": "410.00",
                    "discount_percent": "5.00",
                    "tax_percent": "5.00",
                }
            ],
        )

        for target in [leads["rajesh"], opportunities["nova_deal"], opportunities["greenfield_deal"], opportunities["won_deal"]]:
            definition = CRMCustomFieldDefinition.objects.filter(
                organization_key=organization_key,
                field_key="budget_band" if isinstance(target, CRMLead) else "decision_maker",
            ).first()
            if not definition:
                continue
            value = {"value": "5L - 20L"} if isinstance(target, CRMLead) else {"value": "Procurement Committee"}
            CRMCustomFieldValue.objects.update_or_create(
                organization_key=organization_key,
                field_definition=definition,
                content_type=ContentType.objects.get_for_model(target),
                object_id=target.id,
                defaults={"value": value},
            )

        CRMAssignmentHistory.objects.create(
            organization_key=organization_key,
            module_key=CRMModule.OPPORTUNITY,
            entity_type="CRMOpportunity",
            entity_id=opportunities["greenfield_deal"].id,
            from_user=sup2,
            to_user=sup1,
            changed_by=admin_user,
            reason="Reassigned to enterprise account manager",
        )
        CRMStageTransitionHistory.objects.create(
            organization_key=organization_key,
            module_key=CRMModule.OPPORTUNITY,
            entity_type="CRMOpportunity",
            entity_id=opportunities["greenfield_deal"].id,
            pipeline=opportunity_pipeline,
            from_stage=opportunity_stages["proposal"],
            to_stage=opportunity_stages["negotiation"],
            moved_by=sup1,
            reason="Commercial terms aligned, moved to final negotiation",
        )

        CRMAuditEvent.objects.create(
            organization_key=organization_key,
            module_key=CRMModule.LEAD,
            entity_type="CRMLead",
            entity_id=leads["sneha_lead"].id,
            action="lead_converted",
            label="Lead converted to account/contact/opportunity",
            actor=sup1,
            details={
                "account_id": accounts["greenfield"].id,
                "contact_id": contacts["greenfield_primary"].id,
                "opportunity_id": opportunities["greenfield_deal"].id,
            },
        )
        CRMAuditEvent.objects.create(
            organization_key=organization_key,
            module_key=CRMModule.OPPORTUNITY,
            entity_type="CRMOpportunity",
            entity_id=opportunities["nova_deal"].id,
            action="quotation_sent",
            label=f"Quotation {quote_nova.quote_number} sent",
            actor=sup1,
            details={"quotation_id": quote_nova.id},
        )
        CRMAuditEvent.objects.create(
            organization_key=organization_key,
            module_key=CRMModule.OPPORTUNITY,
            entity_type="CRMOpportunity",
            entity_id=opportunities["won_deal"].id,
            action="deal_won",
            label="Deal marked as won",
            actor=sup2,
            details={"quotation_id": quote_won.id, "value": str(opportunities["won_deal"].deal_value)},
        )

        CRMReminder.objects.create(
            organization_key=organization_key,
            title="Greenfield negotiation call in 10 hours",
            reminder_at=now + timedelta(hours=10),
            assigned_to=sup1,
            related_activity=activities[1],
            metadata={"module": "crm", "priority": "urgent"},
        )
        CRMReminder.objects.create(
            organization_key=organization_key,
            title="Nova sample approval follow-up due tomorrow",
            reminder_at=now + timedelta(hours=16),
            assigned_to=sup1,
            related_task=tasks["followup_nova"],
            metadata={"module": "crm", "priority": "high"},
        )
        CRMReminder.objects.create(
            organization_key=organization_key,
            title="Stellar capability demo reminder",
            reminder_at=now + timedelta(hours=20),
            assigned_to=sup2,
            related_activity=activities[2],
            metadata={"module": "crm", "priority": "medium"},
        )

        CRMImportJob.objects.create(
            organization_key=organization_key,
            module_key=CRMModule.LEAD,
            file_name="crm_leads_import_apr_2026.csv",
            status=CRMImportJob.ImportStatus.COMPLETED,
            total_rows=120,
            processed_rows=120,
            success_rows=114,
            failed_rows=6,
            summary={"created": 54, "updated": 60, "duplicates": 6},
            started_at=now - timedelta(minutes=8),
            finished_at=now - timedelta(minutes=2),
            created_by=admin_user,
        )

        self.stdout.write(
            self.style.SUCCESS(
                "CRM demo data seeded: "
                f"{CRMLead.objects.filter(organization_key=organization_key).count()} leads, "
                f"{CRMAccount.objects.filter(organization_key=organization_key).count()} accounts, "
                f"{CRMContact.objects.filter(organization_key=organization_key).count()} contacts, "
                f"{CRMOpportunity.objects.filter(organization_key=organization_key).count()} opportunities, "
                f"{CRMActivity.objects.filter(organization_key=organization_key).count()} activities, "
                f"{CRMTask.objects.filter(organization_key=organization_key).count()} tasks, "
                f"{CRMQuotation.objects.filter(organization_key=organization_key).count()} quotations."
            )
        )

        # keep lint happy for intentionally created quote variable
        _ = quote_greenfield

    def _clear_crm_data(self, *, organization_key: str):
        CRMReminder.objects.filter(organization_key=organization_key).delete()
        CRMQuotationItem.objects.filter(organization_key=organization_key).delete()
        CRMQuotation.objects.filter(organization_key=organization_key).delete()
        CRMNote.objects.filter(organization_key=organization_key).delete()
        CRMActivity.objects.filter(organization_key=organization_key).delete()
        CRMTask.objects.filter(organization_key=organization_key).delete()
        CRMOpportunity.objects.filter(organization_key=organization_key).delete()
        CRMContact.objects.filter(organization_key=organization_key).delete()
        CRMLead.objects.filter(organization_key=organization_key).delete()
        CRMAccount.objects.filter(organization_key=organization_key).delete()
        CRMCustomFieldValue.objects.filter(organization_key=organization_key).delete()
        CRMImportJob.objects.filter(organization_key=organization_key).delete()
        CRMStageTransitionHistory.objects.filter(organization_key=organization_key).delete()
        CRMAssignmentHistory.objects.filter(organization_key=organization_key).delete()
        CRMAuditEvent.objects.filter(organization_key=organization_key).delete()

    def _print_credentials(self):
        self.stdout.write("Admin login: admin / Admin@123")
        self.stdout.write("Supervisor logins: sup_amit / Supervisor@123, sup_neha / Supervisor@123")
        self.stdout.write("Production supervisor login: prod_arun / Supervisor@123")
        self.stdout.write("Store manager login: store_maya / Store@123")
        self.stdout.write("Planner login: planner_om / Planner@123")
        self.stdout.write("Quality inspector login: qc_riya / Quality@123")
        self.stdout.write("Viewer login: viewer_raj / Viewer@123")
