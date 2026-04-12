import { API_BASE_URL } from "@/lib/constants";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth-storage";

type RequestConfig = RequestInit & {
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}

function collectErrorMessages(value: unknown, trail: string[] = []): string[] {
  if (typeof value === "string") {
    return [trail.length ? `${trail.join(".")}: ${value}` : value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectErrorMessages(item, trail));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.flatMap(([key, nested]) => collectErrorMessages(nested, [...trail, key]));
  }

  return [];
}

function resolveErrorMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>;
    const detail = payload.detail;
    const message = payload.message;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (typeof message === "string" && message.trim()) {
      return message;
    }

    const flattened = collectErrorMessages(data);
    if (flattened.length) {
      return flattened[0];
    }
  }

  if (status === 401) {
    return "Authentication failed. Please sign in again.";
  }
  if (status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (status >= 500) {
    return "Server error. Please try again in a moment.";
  }

  return "Request failed";
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      clearTokens();
      return false;
    }

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = (await response.json()) as { access: string };
    const oldTokens = getRefreshToken();
    if (!oldTokens) return false;

    setTokens({ access: data.access, refresh: refresh });
    return true;
  })();

  const result = await refreshPromise;
  refreshPromise = null;
  return result;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }

  const data = isJsonResponse(response) ? await response.json().catch(() => ({})) : await response.text().catch(() => "");

  if (!response.ok) {
    const resolvedMessage = resolveErrorMessage(data, response.status);
    throw new ApiError(resolvedMessage, response.status, data);
  }

  return data as T;
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}, retry = true): Promise<T> {
  const headers = new Headers(config.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && !(config.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...config,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network error. Please check your connection.",
      0,
      null,
    );
  }

  if (response.status === 401 && !config.skipAuth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, config, false);
    }
    clearTokens();
  }

  return parseResponse<T>(response);
}

export async function apiDownload(path: string): Promise<Blob> {
  const token = getAccessToken();
  const headers = new Headers();
  headers.set("Accept", "text/csv,application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Network error. Unable to download file.",
      0,
      null,
    );
  }

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiDownload(path);
    }
    clearTokens();
    throw new ApiError("Session expired", 401, {});
  }

  if (!response.ok) {
    const payload = isJsonResponse(response)
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => "");
    throw new ApiError(resolveErrorMessage(payload, response.status), response.status, payload);
  }

  return response.blob();
}
