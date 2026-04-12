import { Badge } from "@/components/ui/badge";

export function EfficiencyBadge({ efficiency }: { efficiency: number }) {
  if (efficiency >= 100) {
    return <Badge className="bg-emerald-100 text-emerald-700 ring-emerald-200">{efficiency.toFixed(1)}%</Badge>;
  }

  if (efficiency >= 80) {
    return <Badge className="bg-blue-100 text-blue-700 ring-blue-200">{efficiency.toFixed(1)}%</Badge>;
  }

  if (efficiency >= 60) {
    return <Badge className="bg-amber-100 text-amber-700 ring-amber-200">{efficiency.toFixed(1)}%</Badge>;
  }

  return <Badge className="bg-red-100 text-red-700 ring-red-200">{efficiency.toFixed(1)}%</Badge>;
}
