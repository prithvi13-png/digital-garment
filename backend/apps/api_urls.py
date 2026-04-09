from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import CustomTokenObtainPairView, MeAPIView, UserViewSet
from apps.buyers.views import BuyerViewSet
from apps.core.views import HealthCheckAPIView
from apps.dashboard.views import (
    DashboardLinePerformanceAPIView,
    DashboardRecentActivitiesAPIView,
    DashboardSummaryAPIView,
)
from apps.orders.views import OrderViewSet
from apps.production.views import ProductionEntryViewSet
from apps.production_lines.views import ProductionLineViewSet
from apps.reports.views import (
    OrdersCsvExportAPIView,
    OrdersReportAPIView,
    ProductionCsvExportAPIView,
    ProductionReportAPIView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("buyers", BuyerViewSet, basename="buyers")
router.register("lines", ProductionLineViewSet, basename="lines")
router.register("orders", OrderViewSet, basename="orders")
router.register("production-entries", ProductionEntryViewSet, basename="production-entries")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", HealthCheckAPIView.as_view(), name="health_check"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeAPIView.as_view(), name="auth_me"),
    path("dashboard/summary/", DashboardSummaryAPIView.as_view(), name="dashboard_summary"),
    path(
        "dashboard/line-performance/",
        DashboardLinePerformanceAPIView.as_view(),
        name="dashboard_line_performance",
    ),
    path(
        "dashboard/recent-activities/",
        DashboardRecentActivitiesAPIView.as_view(),
        name="dashboard_recent_activities",
    ),
    path("reports/production/", ProductionReportAPIView.as_view(), name="report_production"),
    path("reports/orders/", OrdersReportAPIView.as_view(), name="report_orders"),
    path(
        "reports/export/production-csv/",
        ProductionCsvExportAPIView.as_view(),
        name="report_export_production_csv",
    ),
    path(
        "reports/export/orders-csv/",
        OrdersCsvExportAPIView.as_view(),
        name="report_export_orders_csv",
    ),
]
