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
from apps.inventory.views import (
    InventoryConsumptionVarianceAPIView,
    InventoryLowStockAPIView,
    InventoryStockMovementsAPIView,
    InventoryStockSummaryAPIView,
    MaterialStockInwardViewSet,
    MaterialStockIssueViewSet,
    MaterialViewSet,
    StockAdjustmentViewSet,
)
from apps.orders.views import OrderViewSet
from apps.planning.views import (
    ProductionPlanCalendarAPIView,
    ProductionPlanPlannedVsActualAPIView,
    ProductionPlanViewSet,
)
from apps.production.views import ProductionEntryViewSet
from apps.production_lines.views import ProductionLineViewSet
from apps.productivity.views import (
    WorkerProductivityLineSummaryAPIView,
    WorkerProductivitySummaryAPIView,
    WorkerProductivityViewSet,
    WorkerProductivityWorkerSummaryAPIView,
    WorkerViewSet,
)
from apps.quality.views import (
    DefectTypeViewSet,
    QualityInspectionDefectTrendsAPIView,
    QualityInspectionRejectionTrendsAPIView,
    QualityInspectionSummaryAPIView,
    QualityInspectionViewSet,
)
from apps.reports.views import (
    ConsumptionCsvExportAPIView,
    ConsumptionReportAPIView,
    InventoryCsvExportAPIView,
    InventoryReportAPIView,
    OrdersCsvExportAPIView,
    OrdersReportAPIView,
    PlanningCsvExportAPIView,
    PlanningReportAPIView,
    ProductionCsvExportAPIView,
    ProductionReportAPIView,
    ProductivityCsvExportAPIView,
    ProductivityReportAPIView,
    QualityCsvExportAPIView,
    QualityReportAPIView,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("buyers", BuyerViewSet, basename="buyers")
router.register("lines", ProductionLineViewSet, basename="lines")
router.register("orders", OrderViewSet, basename="orders")
router.register("production-entries", ProductionEntryViewSet, basename="production-entries")
router.register("materials", MaterialViewSet, basename="materials")
router.register("material-inward", MaterialStockInwardViewSet, basename="material-inward")
router.register("material-issues", MaterialStockIssueViewSet, basename="material-issues")
router.register("stock-adjustments", StockAdjustmentViewSet, basename="stock-adjustments")
router.register("workers", WorkerViewSet, basename="workers")
router.register("worker-productivity", WorkerProductivityViewSet, basename="worker-productivity")
router.register("defect-types", DefectTypeViewSet, basename="defect-types")
router.register("quality-inspections", QualityInspectionViewSet, basename="quality-inspections")
router.register("production-plans", ProductionPlanViewSet, basename="production-plans")

urlpatterns = [
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
    path("inventory/stock-summary/", InventoryStockSummaryAPIView.as_view(), name="inventory_stock_summary"),
    path("inventory/stock-movements/", InventoryStockMovementsAPIView.as_view(), name="inventory_stock_movements"),
    path("inventory/low-stock/", InventoryLowStockAPIView.as_view(), name="inventory_low_stock"),
    path(
        "inventory/consumption-variance/",
        InventoryConsumptionVarianceAPIView.as_view(),
        name="inventory_consumption_variance",
    ),
    path(
        "worker-productivity/summary/",
        WorkerProductivitySummaryAPIView.as_view(),
        name="worker_productivity_summary",
    ),
    path(
        "worker-productivity/line-summary/",
        WorkerProductivityLineSummaryAPIView.as_view(),
        name="worker_productivity_line_summary",
    ),
    path(
        "worker-productivity/worker-summary/",
        WorkerProductivityWorkerSummaryAPIView.as_view(),
        name="worker_productivity_worker_summary",
    ),
    path(
        "quality-inspections/summary/",
        QualityInspectionSummaryAPIView.as_view(),
        name="quality_inspection_summary",
    ),
    path(
        "quality-inspections/defect-trends/",
        QualityInspectionDefectTrendsAPIView.as_view(),
        name="quality_inspection_defect_trends",
    ),
    path(
        "quality-inspections/rejection-trends/",
        QualityInspectionRejectionTrendsAPIView.as_view(),
        name="quality_inspection_rejection_trends",
    ),
    path(
        "production-plans/calendar/",
        ProductionPlanCalendarAPIView.as_view(),
        name="production_plan_calendar",
    ),
    path(
        "production-plans/planned-vs-actual/",
        ProductionPlanPlannedVsActualAPIView.as_view(),
        name="production_plan_planned_vs_actual",
    ),
    path("reports/production/", ProductionReportAPIView.as_view(), name="report_production"),
    path("reports/orders/", OrdersReportAPIView.as_view(), name="report_orders"),
    path("reports/inventory/", InventoryReportAPIView.as_view(), name="report_inventory"),
    path("reports/consumption/", ConsumptionReportAPIView.as_view(), name="report_consumption"),
    path("reports/productivity/", ProductivityReportAPIView.as_view(), name="report_productivity"),
    path("reports/quality/", QualityReportAPIView.as_view(), name="report_quality"),
    path("reports/planning/", PlanningReportAPIView.as_view(), name="report_planning"),
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
    path(
        "reports/export/inventory-csv/",
        InventoryCsvExportAPIView.as_view(),
        name="report_export_inventory_csv",
    ),
    path(
        "reports/export/consumption-csv/",
        ConsumptionCsvExportAPIView.as_view(),
        name="report_export_consumption_csv",
    ),
    path(
        "reports/export/productivity-csv/",
        ProductivityCsvExportAPIView.as_view(),
        name="report_export_productivity_csv",
    ),
    path(
        "reports/export/quality-csv/",
        QualityCsvExportAPIView.as_view(),
        name="report_export_quality_csv",
    ),
    path(
        "reports/export/planning-csv/",
        PlanningCsvExportAPIView.as_view(),
        name="report_export_planning_csv",
    ),
    path("crm/", include("apps.crm.urls")),
    path("", include(router.urls)),
]
