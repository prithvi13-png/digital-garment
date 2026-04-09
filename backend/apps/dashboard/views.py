from datetime import timedelta
from typing import cast

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import ActivityLog
from apps.dashboard.serializers import (
    ActivityLogSerializer,
    LinePerformanceQuerySerializer,
    RecentActivityQuerySerializer,
    RecentOrderSerializer,
)
from apps.orders.models import Order
from apps.orders.services import sync_overdue_orders
from apps.production.models import ProductionEntry


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sync_overdue_orders()

        today = timezone.localdate()
        today_entries = ProductionEntry.objects.filter(date=today)

        today_summary = today_entries.aggregate(
            today_production=Sum("produced_qty"),
            today_rejected=Sum("rejected_qty"),
        )

        orders_summary = Order.objects.aggregate(
            orders_in_progress=Count("id", filter=Q(status=Order.Status.IN_PROGRESS)),
            delayed_orders=Count("id", filter=Q(status=Order.Status.DELAYED)),
            completed_orders=Count("id", filter=Q(status=Order.Status.COMPLETED)),
        )

        trend_start = today - timedelta(days=6)
        trend_rows = (
            ProductionEntry.objects.filter(date__range=(trend_start, today))
            .values("date")
            .annotate(produced_qty=Sum("produced_qty"), rejected_qty=Sum("rejected_qty"))
            .order_by("date")
        )

        daily_trend = [
            {
                "date": row["date"],
                "produced_qty": row["produced_qty"] or 0,
                "rejected_qty": row["rejected_qty"] or 0,
            }
            for row in trend_rows
        ]

        recent_orders = RecentOrderSerializer(
            Order.objects.select_related("buyer").order_by("-created_at")[:5],
            many=True,
        ).data

        return Response(
            {
                "today_production": today_summary["today_production"] or 0,
                "today_rejected": today_summary["today_rejected"] or 0,
                "orders_in_progress": orders_summary["orders_in_progress"] or 0,
                "delayed_orders": orders_summary["delayed_orders"] or 0,
                "completed_orders": orders_summary["completed_orders"] or 0,
                "daily_trend": daily_trend,
                "recent_orders": recent_orders,
            }
        )


class DashboardLinePerformanceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sync_overdue_orders()

        today = timezone.localdate()
        query_serializer = LinePerformanceQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        validated = cast(dict, query_serializer.validated_data)
        start_date = validated.get("start_date", today - timedelta(days=6))
        end_date = validated.get("end_date", today)

        qs = (
            ProductionEntry.objects.filter(date__range=(start_date, end_date))
            .values("production_line_id", "production_line__name")
            .annotate(
                total_target=Sum("target_qty"),
                total_produced=Sum("produced_qty"),
                total_rejected=Sum("rejected_qty"),
                total_entries=Count("id"),
            )
            .order_by("-total_produced")
        )

        line_performance = []
        for row in qs:
            target = row["total_target"] or 0
            produced = row["total_produced"] or 0
            efficiency = round((produced / target) * 100, 2) if target > 0 else 0
            line_performance.append(
                {
                    "line_id": row["production_line_id"],
                    "line_name": row["production_line__name"],
                    "total_target": target,
                    "total_produced": produced,
                    "total_rejected": row["total_rejected"] or 0,
                    "total_entries": row["total_entries"] or 0,
                    "efficiency": efficiency,
                }
            )

        return Response(
            {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "line_performance": line_performance,
            }
        )


class DashboardRecentActivitiesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query_serializer = RecentActivityQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        limit = int(cast(dict, query_serializer.validated_data)["limit"])
        logs = ActivityLog.objects.select_related("user").all()[:limit]
        return Response(ActivityLogSerializer(logs, many=True).data)
