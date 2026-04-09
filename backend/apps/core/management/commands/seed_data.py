from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.buyers.models import Buyer
from apps.orders.models import Order
from apps.production.models import ProductionEntry
from apps.production_lines.models import ProductionLine

User = get_user_model()


class Command(BaseCommand):
    help = "Seed development data for Digital Factory Management System"

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Seed only when database has no users/orders/production entries.",
        )

    def handle(self, *args, **options):
        if options.get("if_empty"):
            if User.objects.exists() or Order.objects.exists() or ProductionEntry.objects.exists():
                self.stdout.write(
                    self.style.WARNING(
                        "Seed skipped because data already exists. "
                        "Use `python manage.py seed_data` without --if-empty to reseed."
                    )
                )
                return

        today = timezone.localdate()

        admin_user, _ = User.objects.update_or_create(
            username="admin",
            defaults={
                "email": "admin@factory.com",
                "first_name": "Factory",
                "last_name": "Admin",
                "role": User.Role.ADMIN,
                "is_active": True,
            },
        )
        admin_user.set_password("Admin@123")
        admin_user.save()

        sup1, _ = User.objects.update_or_create(
            username="sup_amit",
            defaults={
                "email": "amit@factory.com",
                "first_name": "Amit",
                "last_name": "Sharma",
                "role": User.Role.SUPERVISOR,
                "is_active": True,
            },
        )
        sup1.set_password("Supervisor@123")
        sup1.save()

        sup2, _ = User.objects.update_or_create(
            username="sup_neha",
            defaults={
                "email": "neha@factory.com",
                "first_name": "Neha",
                "last_name": "Patel",
                "role": User.Role.SUPERVISOR,
                "is_active": True,
            },
        )
        sup2.set_password("Supervisor@123")
        sup2.save()

        viewer, _ = User.objects.update_or_create(
            username="viewer_raj",
            defaults={
                "email": "raj@factory.com",
                "first_name": "Raj",
                "last_name": "Verma",
                "role": User.Role.VIEWER,
                "is_active": True,
            },
        )
        viewer.set_password("Viewer@123")
        viewer.save()

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
            (3, 0, sup2, today, 220, 190, 5, "Cutting started"),
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

        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))
        self.stdout.write("Admin login: admin / Admin@123")
        self.stdout.write("Supervisor logins: sup_amit / Supervisor@123, sup_neha / Supervisor@123")
        self.stdout.write("Viewer login: viewer_raj / Viewer@123")
