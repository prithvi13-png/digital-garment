import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

import { DecimalLike } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy");
}

export function toNumber(value: DecimalLike | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: DecimalLike | null | undefined) {
  return toNumber(value).toLocaleString("en-IN");
}

export function formatPercent(value: number | null | undefined, digits = 2) {
  const normalized = Number(value ?? 0);
  if (!Number.isFinite(normalized)) return `0.${"0".repeat(digits)}%`;
  return `${normalized.toFixed(digits)}%`;
}

export function toQueryString(filters: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
