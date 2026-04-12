from __future__ import annotations

import csv
from datetime import datetime
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import ReportReadPermission
from apps.core.responses import paginated_payload
from apps.inventory.models import Material, MaterialStockIssue
from apps.inventory.services import (
    build_consumption_variance_rows,
    build_material_stock_rows,
    summarize_consumption_rows,
    summarize_inventory_rows,
)
from apps.orders.models import Order
from apps.orders.services import sync_overdue_orders
from apps.planning.models import ProductionPlan
from apps.planning.services import get_planned_vs_actual_rows, planning_summary
from apps.production.models import ProductionEntry
from apps.productivity.models import WorkerProductivityEntry
from apps.productivity.services import (
    line_productivity_summary,
    productivity_summary,
    worker_order_output_rows,
    worker_productivity_summary,
)
from apps.quality.models import QualityInspection
from apps.quality.services import defect_trends, quality_summary, rejection_trends
from apps.reports.filters import (
    apply_material_filters,
    apply_material_issue_filters,
    apply_order_filters,
    apply_production_filters,
    apply_production_plan_filters,
    apply_quality_inspection_filters,
    apply_worker_productivity_filters,
)
from apps.reports.serializers import (
    ConsumptionReportRowSerializer,
    InventoryReportRowSerializer,
    OrdersReportSerializer,
    PlanningReportRowSerializer,
    ProductionReportSerializer,
    ProductivityReportRowSerializer,
    QualityReportRowSerializer,
)


class ReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


def _decimal_param(value: str | None, *, default: Decimal) -> Decimal:
    if value in (None, ""):
        return default
    try:
        return Decimal(value)
    except Exception:
        return default


def _quality_report_rows(queryset) -> list[dict]:
    rows: list[dict] = []
    for inspection in queryset:
        checked_qty = inspection.checked_qty or 0
        defective_qty = inspection.defective_qty or 0
        rejected_qty = inspection.rejected_qty or 0
        defect_rate = round((defective_qty / checked_qty) * 100, 2) if checked_qty > 0 else 0.0
        rejection_rate = round((rejected_qty / checked_qty) * 100, 2) if checked_qty > 0 else 0.0
        rows.append(
            {
                "inspection_id": inspection.id,
                "date": inspection.date,
                "order_id": inspection.order_id,
                "order_code": inspection.order.order_code if inspection.order else None,
                "line_id": inspection.production_line_id,
                "line_name": inspection.production_line.name if inspection.production_line else None,
                "inspector_id": inspection.inspector_id,
                "inspector_name": (
                    inspection.inspector.get_full_name() or inspection.inspector.username
                    if inspection.inspector
                    else None
                ),
                "inspection_stage": inspection.inspection_stage,
                "checked_qty": checked_qty,
                "defective_qty": defective_qty,
                "rejected_qty": rejected_qty,
                "rework_qty": inspection.rework_qty,
                "defect_rate": defect_rate,
                "rejection_rate": rejection_rate,
            }
        )
    return rows


class ProductionReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        sync_overdue_orders()

        queryset = ProductionEntry.objects.select_related(
            "order",
            "order__buyer",
            "production_line",
            "supervisor",
        )
        queryset = apply_production_filters(queryset, request.query_params)

        summary = queryset.aggregate(
            total_entries=Count("id"),
            total_target=Sum("target_qty"),
            total_produced=Sum("produced_qty"),
            total_rejected=Sum("rejected_qty"),
        )

        paginator = ReportPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ProductionReportSerializer(page, many=True)
        count = paginator.page.paginator.count if hasattr(paginator, "page") else queryset.count()

        return Response(
            paginated_payload(
                count=count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={
                    "total_entries": summary["total_entries"] or 0,
                    "total_target": summary["total_target"] or 0,
                    "total_produced": summary["total_produced"] or 0,
                    "total_rejected": summary["total_rejected"] or 0,
                },
            )
        )


class OrdersReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        sync_overdue_orders()

        queryset = (
            Order.objects.select_related("buyer", "created_by")
            .annotate(
                produced_total=Coalesce(Sum("production_entries__produced_qty"), 0),
                rejected_total=Coalesce(Sum("production_entries__rejected_qty"), 0),
            )
            .order_by("-created_at")
        )
        queryset = apply_order_filters(queryset, request.query_params)

        summary = queryset.aggregate(
            total_orders=Count("id"),
            total_quantity=Sum("quantity"),
            completed_orders=Count("id", filter=Q(status=Order.Status.COMPLETED)),
            delayed_orders=Count("id", filter=Q(status=Order.Status.DELAYED)),
            in_progress_orders=Count("id", filter=Q(status=Order.Status.IN_PROGRESS)),
        )

        paginator = ReportPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = OrdersReportSerializer(page, many=True)
        count = paginator.page.paginator.count if hasattr(paginator, "page") else queryset.count()

        return Response(
            paginated_payload(
                count=count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={
                    "total_orders": summary["total_orders"] or 0,
                    "total_quantity": summary["total_quantity"] or 0,
                    "completed_orders": summary["completed_orders"] or 0,
                    "delayed_orders": summary["delayed_orders"] or 0,
                    "in_progress_orders": summary["in_progress_orders"] or 0,
                },
            )
        )


class InventoryReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = apply_material_filters(Material.objects.all(), request.query_params)
        rows = build_material_stock_rows(queryset)
        threshold = _decimal_param(request.query_params.get("low_stock_threshold"), default=Decimal("100"))
        summary = summarize_inventory_rows(rows, low_stock_threshold=threshold)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = InventoryReportRowSerializer(page, many=True)

        return Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summary,
            )
        )


class ConsumptionReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = MaterialStockIssue.objects.select_related(
            "material",
            "order",
            "order__buyer",
            "production_line",
        )
        queryset = apply_material_issue_filters(queryset, request.query_params)

        rows = build_consumption_variance_rows(queryset)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = ConsumptionReportRowSerializer(page, many=True)

        return Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=summarize_consumption_rows(rows),
            )
        )


class ProductivityReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = WorkerProductivityEntry.objects.select_related(
            "worker",
            "order",
            "production_line",
            "created_by",
        )
        queryset = apply_worker_productivity_filters(queryset, request.query_params)

        rows = worker_order_output_rows(queryset)
        summary = productivity_summary(queryset)
        line_summary_rows = line_productivity_summary(queryset)
        worker_summary_rows = worker_productivity_summary(queryset)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = ProductivityReportRowSerializer(page, many=True)

        return Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={
                    **summary,
                    "line_summary": line_summary_rows,
                    "worker_summary": worker_summary_rows,
                },
            )
        )


class QualityReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = QualityInspection.objects.select_related(
            "order",
            "production_line",
            "inspector",
        ).prefetch_related("defects", "defects__defect_type")
        queryset = apply_quality_inspection_filters(queryset, request.query_params)

        rows = _quality_report_rows(queryset)
        summary = quality_summary(queryset)
        top_defects = defect_trends(queryset)[:10]
        rejection = rejection_trends(queryset)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = QualityReportRowSerializer(page, many=True)

        return Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary={
                    **summary,
                    "top_defects": top_defects,
                    "rejection_trends": rejection,
                },
            )
        )


class PlanningReportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = apply_production_plan_filters(
            ProductionPlan.objects.select_related("order", "production_line"),
            request.query_params,
        )

        rows = get_planned_vs_actual_rows(queryset)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(rows, request)
        serializer = PlanningReportRowSerializer(page, many=True)

        return Response(
            paginated_payload(
                count=paginator.page.paginator.count,
                next_link=paginator.get_next_link(),
                previous_link=paginator.get_previous_link(),
                results=serializer.data,
                summary=planning_summary(rows),
            )
        )


class ProductionCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        sync_overdue_orders()

        queryset = ProductionEntry.objects.select_related(
            "order",
            "order__buyer",
            "production_line",
            "supervisor",
        )
        queryset = apply_production_filters(queryset, request.query_params)

        response = HttpResponse(content_type="text/csv")
        filename = f"production_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Date",
                "Order Code",
                "Buyer",
                "Line",
                "Supervisor",
                "Target Qty",
                "Produced Qty",
                "Rejected Qty",
                "Efficiency (%)",
                "Stage",
                "Order Status",
                "Remarks",
            ]
        )

        for item in queryset:
            writer.writerow(
                [
                    item.date.isoformat(),
                    item.order.order_code,
                    item.order.buyer.company_name,
                    item.production_line.name,
                    item.supervisor.get_full_name() or item.supervisor.username,
                    item.target_qty,
                    item.produced_qty,
                    item.rejected_qty,
                    item.efficiency,
                    item.order.current_stage,
                    item.order.status,
                    item.remarks,
                ]
            )

        return response


class OrdersCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        sync_overdue_orders()

        queryset = Order.objects.select_related("buyer", "created_by")
        queryset = apply_order_filters(queryset, request.query_params)

        response = HttpResponse(content_type="text/csv")
        filename = f"orders_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Order Code",
                "Buyer",
                "Style Name",
                "Style Code",
                "Quantity",
                "Delivery Date",
                "Stage",
                "Status",
                "Priority",
                "Created By",
                "Created At",
            ]
        )

        for item in queryset:
            writer.writerow(
                [
                    item.order_code,
                    item.buyer.company_name,
                    item.style_name,
                    item.style_code,
                    item.quantity,
                    item.delivery_date.isoformat(),
                    item.current_stage,
                    item.status,
                    item.priority,
                    (item.created_by.get_full_name() if item.created_by else "-")
                    or (item.created_by.username if item.created_by else "-"),
                    datetime.strftime(item.created_at, "%Y-%m-%d %H:%M:%S"),
                ]
            )

        return response


class InventoryCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = apply_material_filters(Material.objects.all(), request.query_params)
        rows = build_material_stock_rows(queryset)

        response = HttpResponse(content_type="text/csv")
        filename = f"inventory_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Material Code",
                "Material Name",
                "Type",
                "Unit",
                "Inward Total",
                "Issued Total",
                "Adjustment (+)",
                "Adjustment (-)",
                "Current Stock",
            ]
        )

        for row in rows:
            writer.writerow(
                [
                    row["code"],
                    row["name"],
                    row["material_type"],
                    row["unit"],
                    row["inward_total"],
                    row["issued_total"],
                    row["adjustment_increase_total"],
                    row["adjustment_decrease_total"],
                    row["current_stock"],
                ]
            )

        return response


class ConsumptionCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = MaterialStockIssue.objects.select_related("material", "order", "order__buyer")
        queryset = apply_material_issue_filters(queryset, request.query_params)
        rows = build_consumption_variance_rows(queryset)

        response = HttpResponse(content_type="text/csv")
        filename = f"consumption_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Order Code",
                "Buyer",
                "Material Code",
                "Material Name",
                "Unit",
                "Actual Consumption",
                "Expected Consumption",
                "Variance",
                "Wastage (%)",
            ]
        )

        for row in rows:
            writer.writerow(
                [
                    row["order_code"],
                    row["buyer_name"],
                    row["material_code"],
                    row["material_name"],
                    row["unit"],
                    row["actual_consumption"],
                    row["expected_consumption"] or "",
                    row["variance"] or "",
                    row["wastage_percent"] or "",
                ]
            )

        return response


class ProductivityCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = WorkerProductivityEntry.objects.select_related("worker", "order", "production_line")
        queryset = apply_worker_productivity_filters(queryset, request.query_params)
        rows = worker_order_output_rows(queryset)

        response = HttpResponse(content_type="text/csv")
        filename = f"productivity_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Worker Code",
                "Worker Name",
                "Order Code",
                "Line",
                "Entries",
                "Target Qty",
                "Actual Qty",
                "Rework Qty",
                "Efficiency (%)",
            ]
        )

        for row in rows:
            writer.writerow(
                [
                    row["worker_code"],
                    row["worker_name"],
                    row["order_code"],
                    row["line_name"],
                    row["total_entries"],
                    row["total_target"],
                    row["total_actual"],
                    row["total_rework"],
                    row["efficiency"],
                ]
            )

        return response


class QualityCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = QualityInspection.objects.select_related("order", "production_line", "inspector")
        queryset = apply_quality_inspection_filters(queryset, request.query_params)
        rows = _quality_report_rows(queryset)

        response = HttpResponse(content_type="text/csv")
        filename = f"quality_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Date",
                "Order Code",
                "Line",
                "Inspector",
                "Stage",
                "Checked Qty",
                "Defective Qty",
                "Rejected Qty",
                "Rework Qty",
                "Defect Rate (%)",
                "Rejection Rate (%)",
            ]
        )

        for row in rows:
            writer.writerow(
                [
                    row["date"],
                    row["order_code"],
                    row["line_name"],
                    row["inspector_name"],
                    row["inspection_stage"],
                    row["checked_qty"],
                    row["defective_qty"],
                    row["rejected_qty"],
                    row["rework_qty"],
                    row["defect_rate"],
                    row["rejection_rate"],
                ]
            )

        return response


class PlanningCsvExportAPIView(APIView):
    permission_classes = [ReportReadPermission]

    def get(self, request):
        queryset = apply_production_plan_filters(
            ProductionPlan.objects.select_related("order", "production_line"),
            request.query_params,
        )
        rows = get_planned_vs_actual_rows(queryset)

        response = HttpResponse(content_type="text/csv")
        filename = f"planning_report_{timezone.localdate().isoformat()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(
            [
                "Order Code",
                "Line",
                "Planned Start",
                "Planned End",
                "Planned Daily Target",
                "Planned Total Qty",
                "Actual Total Qty",
                "Variance Qty",
                "Achievement (%)",
                "Status",
            ]
        )

        for row in rows:
            writer.writerow(
                [
                    row["order_code"],
                    row["line_name"],
                    row["planned_start_date"],
                    row["planned_end_date"],
                    row["planned_daily_target"],
                    row["planned_total_qty"],
                    row["actual_total_qty"],
                    row["variance_qty"],
                    row["achievement_percent"],
                    row["plan_status"],
                ]
            )

        return response
