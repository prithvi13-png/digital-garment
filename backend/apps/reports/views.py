import csv
from datetime import datetime

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import paginated_payload
from apps.orders.models import Order
from apps.orders.services import sync_overdue_orders
from apps.production.models import ProductionEntry
from apps.reports.filters import apply_order_filters, apply_production_filters
from apps.reports.serializers import OrdersReportSerializer, ProductionReportSerializer


class ReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 200


class ProductionReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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


class ProductionCsvExportAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
