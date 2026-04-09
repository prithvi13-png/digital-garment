import { Badge } from "@/components/ui/badge";
import { Stage } from "@/types/api";

const LABELS: Record<Stage, string> = {
  cutting: "Cutting",
  stitching: "Stitching",
  qc: "QC",
  packing: "Packing",
  dispatch: "Dispatch",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge className="bg-teal-100 text-teal-700 ring-teal-200">{LABELS[stage]}</Badge>;
}
