import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import {
  PaginatedResponse,
  ProductivityLineSummaryRow,
  ProductivitySummaryResponse,
  ProductivityWorkerSummaryRow,
  Worker,
  WorkerProductivityEntry,
} from "@/types/api";

export type WorkerPayload = {
  worker_code: string;
  name: string;
  mobile?: string;
  skill_type?: string;
  assigned_line?: number | null;
  barcode_value?: string;
  is_active: boolean;
};

export type WorkerProductivityPayload = {
  worker: number;
  order: number;
  production_line: number;
  date: string;
  target_qty: number;
  actual_qty: number;
  rework_qty: number;
  remarks?: string;
};

export type WorkerFilters = {
  page?: number;
  search?: string;
  assigned_line?: string;
  is_active?: string;
};

export type WorkerProductivityFilters = {
  page?: number;
  search?: string;
  worker?: string;
  line?: string;
  order?: string;
  supervisor?: string;
  date_from?: string;
  date_to?: string;
};

export async function listWorkers(filters: WorkerFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<Worker>>(`/workers/${query}`);
}

export async function getWorker(id: number) {
  return apiRequest<Worker>(`/workers/${id}/`);
}

export async function createWorker(payload: WorkerPayload) {
  return apiRequest<Worker>("/workers/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorker(id: number, payload: Partial<WorkerPayload>) {
  return apiRequest<Worker>(`/workers/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorker(id: number) {
  return apiRequest<void>(`/workers/${id}/`, {
    method: "DELETE",
  });
}

export async function listWorkerProductivity(filters: WorkerProductivityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<WorkerProductivityEntry>>(`/worker-productivity/${query}`);
}

export async function createWorkerProductivity(payload: WorkerProductivityPayload) {
  return apiRequest<WorkerProductivityEntry>("/worker-productivity/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWorkerProductivity(id: number, payload: Partial<WorkerProductivityPayload>) {
  return apiRequest<WorkerProductivityEntry>(`/worker-productivity/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkerProductivity(id: number) {
  return apiRequest<void>(`/worker-productivity/${id}/`, {
    method: "DELETE",
  });
}

export async function getWorkerProductivitySummary(filters: WorkerProductivityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<ProductivitySummaryResponse>(`/worker-productivity/summary/${query}`);
}

export async function getWorkerProductivityLineSummary(filters: WorkerProductivityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductivityLineSummaryRow>>(`/worker-productivity/line-summary/${query}`);
}

export async function getWorkerProductivityWorkerSummary(filters: WorkerProductivityFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<ProductivityWorkerSummaryRow>>(`/worker-productivity/worker-summary/${query}`);
}
