import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import {
  DefectTrendRow,
  DefectType,
  PaginatedResponse,
  QualityInspection,
  QualitySummaryResponse,
  RejectionTrendRow,
} from "@/types/api";

export type DefectTypePayload = {
  name: string;
  code: string;
  severity: "minor" | "major" | "critical";
  description?: string;
  is_active: boolean;
};

export type QualityInspectionDefectPayload = {
  defect_type: number;
  quantity: number;
  remarks?: string;
};

export type QualityInspectionPayload = {
  order: number;
  production_line?: number | null;
  inspector?: number;
  inspection_stage: "inline" | "endline" | "final";
  date: string;
  checked_qty: number;
  passed_qty: number;
  defective_qty: number;
  rejected_qty: number;
  rework_qty: number;
  remarks?: string;
  barcode_value?: string;
  defects?: QualityInspectionDefectPayload[];
};

export type DefectTypeFilters = {
  page?: number;
  search?: string;
  severity?: string;
  is_active?: string;
};

export type QualityInspectionFilters = {
  page?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  order?: string;
  line?: string;
  inspector?: string;
  inspection_stage?: string;
};

export async function listDefectTypes(filters: DefectTypeFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<DefectType>>(`/defect-types/${query}`);
}

export async function createDefectType(payload: DefectTypePayload) {
  return apiRequest<DefectType>("/defect-types/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDefectType(id: number, payload: Partial<DefectTypePayload>) {
  return apiRequest<DefectType>(`/defect-types/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteDefectType(id: number) {
  return apiRequest<void>(`/defect-types/${id}/`, {
    method: "DELETE",
  });
}

export async function listQualityInspections(filters: QualityInspectionFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<QualityInspection>>(`/quality-inspections/${query}`);
}

export async function getQualityInspection(id: number) {
  return apiRequest<QualityInspection>(`/quality-inspections/${id}/`);
}

export async function createQualityInspection(payload: QualityInspectionPayload) {
  return apiRequest<QualityInspection>("/quality-inspections/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateQualityInspection(id: number, payload: Partial<QualityInspectionPayload>) {
  return apiRequest<QualityInspection>(`/quality-inspections/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteQualityInspection(id: number) {
  return apiRequest<void>(`/quality-inspections/${id}/`, {
    method: "DELETE",
  });
}

export async function getQualitySummary(filters: QualityInspectionFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<QualitySummaryResponse>(`/quality-inspections/summary/${query}`);
}

export async function getDefectTrends(filters: QualityInspectionFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<DefectTrendRow>>(`/quality-inspections/defect-trends/${query}`);
}

export async function getRejectionTrends(filters: QualityInspectionFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<RejectionTrendRow>>(`/quality-inspections/rejection-trends/${query}`);
}
