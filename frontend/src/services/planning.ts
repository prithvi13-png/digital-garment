import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import {
  PaginatedResponse,
  PlannedVsActualRow,
  ProductionPlan,
  ProductionPlanCalendarRow,
} from "@/types/api";

export type ProductionPlanPayload = {
  order: number;
  production_line: number;
  planned_start_date: string;
  planned_end_date: string;
  planned_daily_target: number;
  planned_total_qty: number;
  remarks?: string;
};

export type ProductionPlanFilters = {
  page?: number;
  search?: string;
  order?: string;
  line?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
};

export async function listProductionPlans(filters: ProductionPlanFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductionPlan>>(`/production-plans/${query}`);
}

export async function createProductionPlan(payload: ProductionPlanPayload) {
  return apiRequest<ProductionPlan>("/production-plans/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProductionPlan(id: number, payload: Partial<ProductionPlanPayload>) {
  return apiRequest<ProductionPlan>(`/production-plans/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProductionPlan(id: number) {
  return apiRequest<void>(`/production-plans/${id}/`, {
    method: "DELETE",
  });
}

export async function getProductionPlanCalendar(filters: ProductionPlanFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductionPlanCalendarRow>>(`/production-plans/calendar/${query}`);
}

export async function getPlannedVsActual(filters: ProductionPlanFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<PlannedVsActualRow>>(`/production-plans/planned-vs-actual/${query}`);
}
