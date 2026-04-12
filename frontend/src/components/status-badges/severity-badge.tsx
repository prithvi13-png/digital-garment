import { Badge } from "@/components/ui/badge";
import { Severity } from "@/types/api";

const MAP: Record<Severity, { label: string; className: string }> = {
  minor: { label: "Minor", className: "bg-blue-100 text-blue-700 ring-blue-200" },
  major: { label: "Major", className: "bg-amber-100 text-amber-700 ring-amber-200" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 ring-red-200" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={MAP[severity].className}>{MAP[severity].label}</Badge>;
}
