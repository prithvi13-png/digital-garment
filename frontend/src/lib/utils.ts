import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  if (!date) return "-";
  return format(new Date(date), "dd MMM yyyy");
}

export function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-IN");
}

export function toQueryString(filters: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
