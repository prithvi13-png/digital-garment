import { apiDownload, apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import {
  ConsumptionReportSummary,
  ConsumptionReportRow,
  InventoryReportSummary,
  InventoryReportRow,
  Order,
  OrdersReportSummary,
  PaginatedResponse,
  PlanningSummary,
  PlanningReportRow,
  ProductionEntry,
  ProductionReportSummary,
  ProductivityReportSummary,
  ProductivityReportRow,
  QualityReportSummary,
  QualityReportRow,
} from "@/types/api";

export async function getProductionReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductionEntry, ProductionReportSummary>>(
    `/reports/production/${query}`,
  );
}

export async function getOrdersReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<Order, OrdersReportSummary>>(`/reports/orders/${query}`);
}

export async function getInventoryReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<InventoryReportRow, InventoryReportSummary>>(
    `/reports/inventory/${query}`,
  );
}

export async function getConsumptionReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ConsumptionReportRow, ConsumptionReportSummary>>(
    `/reports/consumption/${query}`,
  );
}

export async function getProductivityReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductivityReportRow, ProductivityReportSummary>>(
    `/reports/productivity/${query}`,
  );
}

export async function getQualityReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<QualityReportRow, QualityReportSummary>>(
    `/reports/quality/${query}`,
  );
}

export async function getPlanningReport(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<PlanningReportRow, PlanningSummary>>(
    `/reports/planning/${query}`,
  );
}

export async function exportProductionCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/production-csv/${query}`);
}

export async function exportOrdersCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/orders-csv/${query}`);
}

export async function exportInventoryCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/inventory-csv/${query}`);
}

export async function exportConsumptionCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/consumption-csv/${query}`);
}

export async function exportProductivityCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/productivity-csv/${query}`);
}

export async function exportQualityCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/quality-csv/${query}`);
}

export async function exportPlanningCsv(filters: Record<string, string | number | boolean | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/planning-csv/${query}`);
}
