import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { ActivityLog, DashboardSummary, LinePerformanceResponse } from "@/types/api";

export async function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/dashboard/summary/");
}

export async function getLinePerformance(filters: { start_date?: string; end_date?: string } = {}) {
  const query = toQueryString(filters);
  return apiRequest<LinePerformanceResponse>(`/dashboard/line-performance/${query}`);
}

export async function getRecentActivities(limit = 10) {
  return apiRequest<ActivityLog[]>(`/dashboard/recent-activities/?limit=${limit}`);
}
