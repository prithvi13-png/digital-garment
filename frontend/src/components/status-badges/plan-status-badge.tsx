import { Badge } from "@/components/ui/badge";
import { PlanStatus } from "@/types/api";

const MAP: Record<PlanStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-slate-100 text-slate-700 ring-slate-200" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700 ring-blue-200" },
  behind: { label: "Behind", className: "bg-red-100 text-red-700 ring-red-200" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge className={MAP[status].className}>{MAP[status].label}</Badge>;
}
