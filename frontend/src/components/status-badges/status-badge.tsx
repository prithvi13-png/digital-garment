import { Badge } from "@/components/ui/badge";
import { Status } from "@/types/api";

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  in_progress: "bg-blue-100 text-blue-700 ring-blue-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  delayed: "bg-red-100 text-red-700 ring-red-200",
};

const LABELS: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  delayed: "Delayed",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge className={STATUS_STYLES[status]}>{LABELS[status]}</Badge>;
}
