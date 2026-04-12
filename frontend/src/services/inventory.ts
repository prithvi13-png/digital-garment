import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import {
  ConsumptionVarianceRow,
  Material,
  MaterialMovementRow,
  MaterialStockInward,
  MaterialStockIssue,
  MaterialStockSummaryRow,
  PaginatedResponse,
  StockAdjustment,
} from "@/types/api";

export type MaterialPayload = {
  code: string;
  name: string;
  material_type: string;
  unit: string;
  description?: string;
  is_active: boolean;
  barcode_value?: string;
};

export type MaterialInwardPayload = {
  material: number;
  batch_no?: string;
  roll_no?: string;
  inward_date: string;
  quantity: number;
  rate?: number | null;
  supplier_name?: string;
  remarks?: string;
  barcode_value?: string;
};

export type MaterialIssuePayload = {
  material: number;
  order?: number | null;
  production_line?: number | null;
  issue_date: string;
  quantity: number;
  issued_to?: string;
  remarks?: string;
  barcode_value?: string;
};

export type StockAdjustmentPayload = {
  material: number;
  adjustment_date: string;
  adjustment_type: "increase" | "decrease";
  quantity: number;
  reason: string;
};

export type MaterialFilters = {
  page?: number;
  q?: string;
  material_type?: string;
  is_active?: string;
};

export type MaterialInwardFilters = {
  page?: number;
  material?: string;
  inward_date_from?: string;
  inward_date_to?: string;
  supplier?: string;
  search?: string;
};

export type MaterialIssueFilters = {
  page?: number;
  material?: string;
  order?: string;
  line?: string;
  buyer?: string;
  issue_date_from?: string;
  issue_date_to?: string;
  search?: string;
};

export type StockAdjustmentFilters = {
  page?: number;
  material?: string;
  adjustment_type?: string;
  adjustment_date_from?: string;
  adjustment_date_to?: string;
  search?: string;
};

export type InventoryUtilityFilters = {
  page?: number;
  q?: string;
  material?: string;
  line?: string;
  buyer?: string;
  order?: string;
  material_type?: string;
  is_active?: string;
  low_stock_threshold?: string | number;
  date_from?: string;
  date_to?: string;
};

export async function listMaterials(filters: MaterialFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<Material>>(`/materials/${query}`);
}

export async function getMaterial(id: number) {
  return apiRequest<Material>(`/materials/${id}/`);
}

export async function createMaterial(payload: MaterialPayload) {
  return apiRequest<Material>("/materials/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMaterial(id: number, payload: Partial<MaterialPayload>) {
  return apiRequest<Material>(`/materials/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMaterial(id: number) {
  return apiRequest<void>(`/materials/${id}/`, {
    method: "DELETE",
  });
}

export async function getMaterialStockSummary(filters: InventoryUtilityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialStockSummaryRow>>(`/materials/stock-summary/${query}`);
}

export async function getMaterialMovements(id: number, filters: Pick<InventoryUtilityFilters, "date_from" | "date_to" | "page"> = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialMovementRow>>(`/materials/${id}/movements/${query}`);
}

export async function listMaterialInward(filters: MaterialInwardFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialStockInward>>(`/material-inward/${query}`);
}

export async function createMaterialInward(payload: MaterialInwardPayload) {
  return apiRequest<MaterialStockInward>("/material-inward/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMaterialInward(id: number, payload: Partial<MaterialInwardPayload>) {
  return apiRequest<MaterialStockInward>(`/material-inward/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMaterialInward(id: number) {
  return apiRequest<void>(`/material-inward/${id}/`, {
    method: "DELETE",
  });
}

export async function listMaterialIssues(filters: MaterialIssueFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialStockIssue>>(`/material-issues/${query}`);
}

export async function createMaterialIssue(payload: MaterialIssuePayload) {
  return apiRequest<MaterialStockIssue>("/material-issues/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMaterialIssue(id: number, payload: Partial<MaterialIssuePayload>) {
  return apiRequest<MaterialStockIssue>(`/material-issues/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteMaterialIssue(id: number) {
  return apiRequest<void>(`/material-issues/${id}/`, {
    method: "DELETE",
  });
}

export async function listStockAdjustments(filters: StockAdjustmentFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<StockAdjustment>>(`/stock-adjustments/${query}`);
}

export async function createStockAdjustment(payload: StockAdjustmentPayload) {
  return apiRequest<StockAdjustment>("/stock-adjustments/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStockAdjustment(id: number, payload: Partial<StockAdjustmentPayload>) {
  return apiRequest<StockAdjustment>(`/stock-adjustments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStockAdjustment(id: number) {
  return apiRequest<void>(`/stock-adjustments/${id}/`, {
    method: "DELETE",
  });
}

export async function getInventoryStockSummary(filters: InventoryUtilityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialStockSummaryRow>>(`/inventory/stock-summary/${query}`);
}

export async function getInventoryStockMovements(filters: InventoryUtilityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialMovementRow>>(`/inventory/stock-movements/${query}`);
}

export async function getInventoryLowStock(filters: InventoryUtilityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<MaterialStockSummaryRow>>(`/inventory/low-stock/${query}`);
}

export async function getConsumptionVariance(filters: InventoryUtilityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ConsumptionVarianceRow>>(`/inventory/consumption-variance/${query}`);
}
