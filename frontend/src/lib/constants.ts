import { Role, Stage, Status } from "@/types/api";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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

export const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] as const;

export const ROLE_HOME_PATH: Record<Role, string> = {
  admin: "/dashboard",
  supervisor: "/dashboard",
  viewer: "/dashboard",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  viewer: "Viewer",
};
