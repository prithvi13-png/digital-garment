import { apiDownload, apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { Order, PaginatedResponse, ProductionEntry } from "@/types/api";

export async function getProductionReport(filters: Record<string, string | number | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductionEntry> & { summary: Record<string, number> }>(
    `/reports/production/${query}`,
  );
}

export async function getOrdersReport(filters: Record<string, string | number | undefined>) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<Order> & { summary: Record<string, number> }>(`/reports/orders/${query}`);
}

export async function exportProductionCsv(filters: Record<string, string | number | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/production-csv/${query}`);
}

export async function exportOrdersCsv(filters: Record<string, string | number | undefined>) {
  const query = toQueryString(filters);
  return apiDownload(`/reports/export/orders-csv/${query}`);
}
