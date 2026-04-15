"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, UserCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { getCRMTimeline } from "@/services/crm";

type EntityType = "lead" | "account" | "contact" | "opportunity";

export function EntityQuickDrawer({
  entityType,
  entityId,
  title,
  subtitle,
  owner,
  dueAt,
  metadata,
  onClose,
}: {
  entityType: EntityType;
  entityId: number | null;
  title: string;
  subtitle?: string;
  owner?: string;
  dueAt?: string | null;
  metadata?: Array<{ label: string; value: string }>;
  onClose: () => void;
}) {
  const timelineQuery = useQuery({
    queryKey: ["crm-entity-drawer", entityType, entityId],
    queryFn: () => getCRMTimeline({ entity_type: entityType, entity_id: entityId || 0, limit: 30 }),
    enabled: Boolean(entityId),
  });

  if (!entityId) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/35"
        onClick={onClose}
        aria-label="Close quick drawer"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-[440px] overflow-y-auto border-l border-[#c8d9f5] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-5 shadow-[0_26px_70px_rgba(2,8,23,0.34)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Customer 360</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <Button type="button" variant="secondary" onClick={onClose} className="min-w-10 px-3">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#d8e5f8] bg-white/90 p-3 text-sm">
          {owner ? (
            <p className="flex items-center gap-2 text-slate-700">
              <UserCircle2 className="h-4 w-4 text-blue-600" />
              {owner}
            </p>
          ) : null}
          {dueAt ? (
            <p className="flex items-center gap-2 text-slate-700">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              Next follow-up: {formatDate(dueAt)}
            </p>
          ) : null}

          {metadata?.map((item) => (
            <p key={item.label} className="text-slate-700">
              <span className="font-semibold text-slate-800">{item.label}:</span> {item.value}
            </p>
          ))}
        </div>

        <section className="mt-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>

          {timelineQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : timelineQuery.data?.results.length ? (
            <div className="space-y-2">
              {timelineQuery.data.results.map((item, index) => (
                <div key={`${item.action}-${item.timestamp}-${index}`} className="rounded-2xl border border-[#d8e5f8] bg-white/90 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.actor}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(item.timestamp)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
              No timeline activity available yet.
            </p>
          )}
        </section>
      </aside>
    </>
  );
}
