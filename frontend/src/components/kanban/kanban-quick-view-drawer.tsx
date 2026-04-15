"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, UserCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { getCRMTimeline } from "@/services/crm";
import { CRMKanbanCard, CRMModuleKey } from "@/types/api";

const ENTITY_TYPE_BY_MODULE: Partial<Record<CRMModuleKey, "lead" | "account" | "contact" | "opportunity">> = {
  lead: "lead",
  opportunity: "opportunity",
};

export function KanbanQuickViewDrawer({
  moduleKey,
  card,
  onClose,
}: {
  moduleKey: CRMModuleKey;
  card: CRMKanbanCard | null;
  onClose: () => void;
}) {
  const entityType = ENTITY_TYPE_BY_MODULE[moduleKey];

  const timelineQuery = useQuery({
    queryKey: ["crm-timeline", moduleKey, card?.id],
    queryFn: () =>
      getCRMTimeline({
        entity_type: entityType || "lead",
        entity_id: card?.id || 0,
        limit: 30,
      }),
    enabled: Boolean(card && entityType),
  });

  if (!card) return null;

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-[#cbd9f2] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-5 shadow-[0_28px_68px_rgba(15,23,42,0.32)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Quick View</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{card.title}</h3>
            {card.subtitle ? <p className="mt-1 text-sm text-slate-600">{card.subtitle}</p> : null}
          </div>
          <Button type="button" variant="secondary" onClick={onClose} className="min-w-10 px-3">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#d8e4f6] bg-white/85 p-3 text-sm text-slate-700">
          {card.owner ? (
            <p className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 text-blue-600" />
              {card.owner.name}
            </p>
          ) : null}
          {card.due_at ? (
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              Due {formatDate(card.due_at)}
            </p>
          ) : null}
          {card.last_activity_at ? (
            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-blue-600" />
              Last activity {formatDate(card.last_activity_at)}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Timeline</h4>

          {!entityType ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
              Timeline for this module will be available after entity adapters are configured.
            </p>
          ) : timelineQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : timelineQuery.data?.results.length ? (
            <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
              {timelineQuery.data.results.map((entry, index) => (
                <div key={`${entry.action}-${entry.timestamp}-${index}`} className="rounded-2xl border border-[#dbe7f8] bg-white/85 p-3">
                  <p className="text-sm font-semibold text-slate-800">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{entry.actor}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(entry.timestamp)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
              No timeline activity yet.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
