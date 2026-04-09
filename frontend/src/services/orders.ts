import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { Order, PaginatedResponse, ProductionEntry, Stage, Status } from "@/types/api";

export type OrderPayload = {
  buyer: number;
  style_name: string;
  style_code?: string;
  quantity: number;
  target_per_day?: number | null;
  delivery_date: string;
  current_stage: Stage;
  priority: "low" | "medium" | "high";
  notes?: string;
};

export type OrderFilters = {
  page?: number;
  search?: string;
  buyer?: string;
  current_stage?: string;
  status?: Status;
  priority?: string;
  delivery_date_from?: string;
  delivery_date_to?: string;
};

export async function listOrders(filters: OrderFilters = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<Order>>(`/orders/${query}`);
}

export async function getOrder(id: number) {
  return apiRequest<Order>(`/orders/${id}/`);
}

export async function createOrder(payload: OrderPayload) {
  return apiRequest<Order>("/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrder(id: number, payload: Partial<OrderPayload>) {
  return apiRequest<Order>(`/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteOrder(id: number) {
  return apiRequest<void>(`/orders/${id}/`, {
    method: "DELETE",
  });
}

export async function getOrderProductionSummary(id: number) {
  return apiRequest<{
    order_id: number;
    order_code: string;
    summary: {
      total_target_qty: number;
      total_produced_qty: number;
      total_rejected_qty: number;
      total_entries: number;
    };
  }>(`/orders/${id}/production-summary/`);
}

export async function listOrderProductionEntries(orderId: number) {
  return apiRequest<PaginatedResponse<ProductionEntry>>(`/production-entries/?order=${orderId}`);
}
