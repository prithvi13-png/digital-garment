from typing import Any

from django.contrib.auth import get_user_model

from apps.core.models import ActivityLog

User = get_user_model()


def log_activity(*, user: User | None, action: str, entity_type: str, entity_id: int, description: str) -> None:
    ActivityLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
    )


def log_instance_activity(*, user: User | None, action: str, instance: Any, description: str) -> None:
    """
    Convenience helper to log activity against a Django model instance.
    """
    entity_id = getattr(instance, "pk", None)
    if entity_id is None:
        return

    log_activity(
        user=user,
        action=action,
        entity_type=instance.__class__.__name__,
        entity_id=entity_id,
        description=description,
    )
