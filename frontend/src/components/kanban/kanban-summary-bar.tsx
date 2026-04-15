"use client";

import { Banknote, CircleDashed, Layers3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function KanbanSummaryBar({
  totalCards,
  openCards,
  totalValue,
}: {
  totalCards: number;
  openCards: number;
  totalValue: string;
}) {
  const cards = [
    {
      key: "total",
      label: "Total Cards",
      value: formatNumber(totalCards),
      icon: Layers3,
      tone: "text-blue-700",
    },
    {
      key: "open",
      label: "Open Cards",
      value: formatNumber(openCards),
      icon: CircleDashed,
      tone: "text-emerald-700",
    },
    {
      key: "value",
      label: "Pipeline Value",
      value: `₹ ${formatNumber(totalValue)}`,
      icon: Banknote,
      tone: "text-indigo-700",
    },
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <div className="mt-2 flex items-center gap-2">
              <Icon className={`h-4 w-4 ${item.tone}`} />
              <p className="text-xl font-bold text-slate-900">{item.value}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
