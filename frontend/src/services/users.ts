import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import { PaginatedResponse, Role, User } from "@/types/api";

export type UserPayload = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password?: string;
  role: Role;
  is_active: boolean;
};

export async function listUsers(filters: { page?: number; search?: string; role?: Role } = {}) {
  const query = toQueryString(filters);
  return apiRequest<PaginatedResponse<User>>(`/users/${query}`);
}

export async function createUser(payload: UserPayload) {
  return apiRequest<User>("/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: number, payload: Partial<UserPayload>) {
  return apiRequest<User>(`/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: number) {
  return apiRequest<void>(`/users/${id}/`, {
    method: "DELETE",
  });
}
