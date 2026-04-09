import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { PaginatedResponse, ProductionEntry } from "@/types/api";

export type ProductionEntryPayload = {
  date: string;
  production_line: number;
  supervisor: number;
  order: number;
  target_qty: number;
  produced_qty: number;
  rejected_qty: number;
  remarks?: string;
};

export type ProductionFilters = {
  page?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  production_line?: string;
  supervisor?: string;
  order?: string;
  buyer?: string;
  stage?: string;
  status?: string;
};

export async function listProductionEntries(filters: ProductionFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductionEntry>>(`/production-entries/${query}`);
}

export async function createProductionEntry(payload: ProductionEntryPayload) {
  return apiRequest<ProductionEntry>("/production-entries/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProductionEntry(id: number, payload: Partial<ProductionEntryPayload>) {
  return apiRequest<ProductionEntry>(`/production-entries/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteProductionEntry(id: number) {
  return apiRequest<void>(`/production-entries/${id}/`, {
    method: "DELETE",
  });
}
