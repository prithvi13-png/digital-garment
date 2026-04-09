from django.db.models import Count, Sum
from django.utils import timezone

from apps.orders.models import Order


def sync_overdue_orders() -> None:
    today = timezone.localdate()

    Order.objects.filter(current_stage=Order.Stage.DISPATCH).exclude(status=Order.Status.COMPLETED).update(
        status=Order.Status.COMPLETED,
        updated_at=timezone.now(),
    )

    (
        Order.objects.exclude(status=Order.Status.COMPLETED)
        .filter(delivery_date__lt=today)
        .exclude(status=Order.Status.DELAYED)
        .update(status=Order.Status.DELAYED, updated_at=timezone.now())
    )


def sync_order_status(order: Order, *, has_production_started: bool | None = None) -> None:
    order.sync_status(has_production_started=has_production_started)


def sync_order_after_production_change(order: Order) -> None:
    has_entries = order.production_entries.exists()
    sync_order_status(order, has_production_started=has_entries)


def get_order_production_summary(order: Order) -> dict:
    summary = order.production_entries.aggregate(
        total_target_qty=Sum("target_qty"),
        total_produced_qty=Sum("produced_qty"),
        total_rejected_qty=Sum("rejected_qty"),
        total_entries=Count("id"),
    )

    return {
        "total_target_qty": summary["total_target_qty"] or 0,
        "total_produced_qty": summary["total_produced_qty"] or 0,
        "total_rejected_qty": summary["total_rejected_qty"] or 0,
        "total_entries": summary["total_entries"] or 0,
    }
