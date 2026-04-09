from django.utils import timezone


def resolve_order_status(order, *, has_production_started: bool | None = None) -> str:
    """
    Centralized order status resolver for consistent business rules.
    """
    if order.current_stage == order.Stage.DISPATCH:
        return order.Status.COMPLETED

    if timezone.localdate() > order.delivery_date:
        return order.Status.DELAYED

    if has_production_started is None:
        has_production_started = bool(order.pk and order.production_entries.exists())

    if has_production_started or order.current_stage != order.Stage.CUTTING:
        return order.Status.IN_PROGRESS

    return order.Status.PENDING
