from django.db import models

from apps.core.models import TimeStampedModel


class Buyer(TimeStampedModel):
    name = models.CharField(max_length=120)
    company_name = models.CharField(max_length=180)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.company_name} ({self.name})"
