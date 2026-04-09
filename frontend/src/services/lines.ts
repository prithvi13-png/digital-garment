import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { PaginatedResponse, ProductionLine } from "@/types/api";

export type ProductionLinePayload = {
  name: string;
  description?: string;
  is_active: boolean;
};

export async function listLines(filters: { page?: number; search?: string; is_active?: string } = {}) {
  const query = toQueryString({
    page: filters.page,
    search: filters.search,
    is_active: filters.is_active,
  });
  return apiRequest<PaginatedResponse<ProductionLine>>(`/lines/${query}`);
}

export async function createLine(payload: ProductionLinePayload) {
  return apiRequest<ProductionLine>("/lines/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLine(id: number, payload: Partial<ProductionLinePayload>) {
  return apiRequest<ProductionLine>(`/lines/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteLine(id: number) {
  return apiRequest<void>(`/lines/${id}/`, {
    method: "DELETE",
  });
}
