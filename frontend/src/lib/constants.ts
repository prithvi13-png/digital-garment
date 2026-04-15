import {
  AdjustmentType,
  InspectionStage,
  MaterialType,
  PlanStatus,
  Priority,
  Role,
  Severity,
  Stage,
  Status,
} from "@/types/api";

const LOCAL_API_BASE_URL = "http://localhost:8000/api/v1";
const PROD_API_BASE_URL = "https://digital-factory-backend.onrender.com/api/v1";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLocalApiUrl(apiUrl: string) {
  try {
    const parsed = new URL(apiUrl);
    return isLocalHostname(parsed.hostname);
  } catch {
    return apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
  }
}

function resolveApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const runtimeHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const runtimeIsLocal = runtimeHostname
    ? isLocalHostname(runtimeHostname)
    : process.env.NODE_ENV !== "production";

  // Guard against accidentally deploying a localhost API URL to production.
  if (configured) {
    if (!runtimeIsLocal && isLocalApiUrl(configured)) {
      return PROD_API_BASE_URL;
    }
    return configured;
  }

  return runtimeIsLocal ? LOCAL_API_BASE_URL : PROD_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const STATUS_OPTIONS: { label: string; value: Status }[] = [
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Delayed", value: "delayed" },
];

export const STAGE_OPTIONS: { label: string; value: Stage }[] = [
  { label: "Cutting", value: "cutting" },
  { label: "Stitching", value: "stitching" },
  { label: "QC", value: "qc" },
  { label: "Packing", value: "packing" },
  { label: "Dispatch", value: "dispatch" },
];

export const PRIORITY_OPTIONS: { label: string; value: Priority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export const MATERIAL_TYPE_OPTIONS: { label: string; value: MaterialType }[] = [
  { label: "Fabric", value: "fabric" },
  { label: "Thread", value: "thread" },
  { label: "Label", value: "label" },
  { label: "Button", value: "button" },
  { label: "Zipper", value: "zipper" },
  { label: "Packaging", value: "packaging" },
  { label: "Other", value: "other" },
];

export const ADJUSTMENT_TYPE_OPTIONS: { label: string; value: AdjustmentType }[] = [
  { label: "Increase", value: "increase" },
  { label: "Decrease", value: "decrease" },
];

export const INSPECTION_STAGE_OPTIONS: { label: string; value: InspectionStage }[] = [
  { label: "Inline", value: "inline" },
  { label: "Endline", value: "endline" },
  { label: "Final", value: "final" },
];

export const DEFECT_SEVERITY_OPTIONS: { label: string; value: Severity }[] = [
  { label: "Minor", value: "minor" },
  { label: "Major", value: "major" },
  { label: "Critical", value: "critical" },
];

export const PLAN_STATUS_OPTIONS: { label: string; value: PlanStatus }[] = [
  { label: "Not Started", value: "not_started" },
  { label: "In Progress", value: "in_progress" },
  { label: "Behind", value: "behind" },
  { label: "Completed", value: "completed" },
];

export const ROLE_HOME_PATH: Record<Role, string> = {
  admin: "/dashboard",
  store_manager: "/dashboard",
  production_supervisor: "/dashboard",
  quality_inspector: "/dashboard",
  planner: "/dashboard",
  supervisor: "/dashboard",
  viewer: "/dashboard",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  store_manager: "Store Manager",
  production_supervisor: "Production Supervisor",
  quality_inspector: "Quality Inspector",
  planner: "Planner",
  supervisor: "Supervisor",
  viewer: "Viewer",
};
