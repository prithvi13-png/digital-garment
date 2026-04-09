from django.contrib import admin
from django.urls import include, path

from apps.core.views import HealthCheckAPIView

urlpatterns = [
    path("", HealthCheckAPIView.as_view(), name="root_health_check"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.api_urls")),
]
