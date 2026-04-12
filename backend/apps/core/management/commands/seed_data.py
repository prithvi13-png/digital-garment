from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.buyers.models import Buyer
from apps.core.demo_users import ensure_demo_users
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

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
        self._print_credentials()

    def _print_credentials(self):
        self.stdout.write("Admin login: admin / Admin@123")
        self.stdout.write("Supervisor logins: sup_amit / Supervisor@123, sup_neha / Supervisor@123")
        self.stdout.write("Production supervisor login: prod_arun / Supervisor@123")
        self.stdout.write("Store manager login: store_maya / Store@123")
        self.stdout.write("Planner login: planner_om / Planner@123")
        self.stdout.write("Quality inspector login: qc_riya / Quality@123")
        self.stdout.write("Viewer login: viewer_raj / Viewer@123")
