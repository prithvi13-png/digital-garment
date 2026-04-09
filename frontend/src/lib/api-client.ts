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

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail;
    const message = (data as { message?: string })?.message;

    let firstFieldError = "";
    if (!detail && !message && data && typeof data === "object") {
      const [firstKey] = Object.keys(data as Record<string, unknown>);
      const rawValue = (data as Record<string, unknown>)[firstKey];
      if (Array.isArray(rawValue) && rawValue[0]) {
        firstFieldError = String(rawValue[0]);
      } else if (typeof rawValue === "string") {
        firstFieldError = rawValue;
      }
    }

    const resolvedMessage = detail || message || firstFieldError || "Request failed";
    throw new ApiError(resolvedMessage, response.status, data);
  }

  return data as T;
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}, retry = true): Promise<T> {
  const headers = new Headers(config.headers || {});
  headers.set("Content-Type", "application/json");

  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...config,
    headers,
  });

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
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiDownload(path);
    }
    clearTokens();
    throw new ApiError("Session expired", 401, {});
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError("Download failed", response.status, text);
  }

  return response.blob();
}
