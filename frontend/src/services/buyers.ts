import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { Buyer, PaginatedResponse } from "@/types/api";

export type BuyerPayload = {
  name: string;
  company_name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export async function listBuyers(filters: { page?: number; search?: string } = {}) {
  const query = toQueryString({ page: filters.page, search: filters.search });
  return apiRequest<PaginatedResponse<Buyer>>(`/buyers/${query}`);
}

export async function getBuyer(id: number) {
  return apiRequest<Buyer>(`/buyers/${id}/`);
}

export async function createBuyer(payload: BuyerPayload) {
  return apiRequest<Buyer>("/buyers/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBuyer(id: number, payload: Partial<BuyerPayload>) {
  return apiRequest<Buyer>(`/buyers/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBuyer(id: number) {
  return apiRequest<void>(`/buyers/${id}/`, {
    method: "DELETE",
  });
}
