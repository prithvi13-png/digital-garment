from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import TimeStampedModel


class User(AbstractUser, TimeStampedModel):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        STORE_MANAGER = "store_manager", "Store Manager"
        PRODUCTION_SUPERVISOR = "production_supervisor", "Production Supervisor"
        QUALITY_INSPECTOR = "quality_inspector", "Quality Inspector"
        PLANNER = "planner", "Planner"
        # Backward-compatible legacy supervisor role from Phase 1.
        SUPERVISOR = "supervisor", "Supervisor"
        VIEWER = "viewer", "Viewer"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.VIEWER)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
            self.is_staff = True
        elif self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.get_full_name() or self.username
