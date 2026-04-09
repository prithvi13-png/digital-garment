import { apiRequest } from "@/lib/api-client";
import { LoginResponse, User } from "@/types/api";

export type LoginPayload = {
  username: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function getMe() {
  return apiRequest<User>("/auth/me/");
}
