export type AuthTokens = {
  access: string;
  refresh: string;
};

export const AUTH_CLEARED_EVENT = "dfms:auth-cleared";

const ACCESS_KEY = "dfms_access_token";
const REFRESH_KEY = "dfms_refresh_token";

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(ACCESS_KEY);
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!access || !refresh) return null;
  return { access, refresh };
}

export function setTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
}

export function getAccessToken() {
  return getTokens()?.access ?? null;
}

export function getRefreshToken() {
  return getTokens()?.refresh ?? null;
}
