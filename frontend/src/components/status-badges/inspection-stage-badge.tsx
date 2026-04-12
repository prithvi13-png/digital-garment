import { Badge } from "@/components/ui/badge";
import { InspectionStage } from "@/types/api";

const MAP: Record<InspectionStage, { label: string; className: string }> = {
  inline: { label: "Inline", className: "bg-sky-100 text-sky-700 ring-sky-200" },
  endline: { label: "Endline", className: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
  final: { label: "Final", className: "bg-teal-100 text-teal-700 ring-teal-200" },
};

export function InspectionStageBadge({ stage }: { stage: InspectionStage }) {
  return <Badge className={MAP[stage].className}>{MAP[stage].label}</Badge>;
}
