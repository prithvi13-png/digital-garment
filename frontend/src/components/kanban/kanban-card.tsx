"use client";

import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, CalendarClock, GripVertical, UserCircle2 } from "lucide-react";
import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";
import { CRMKanbanCard } from "@/types/api";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

export const KanbanCard = memo(function KanbanCard({
  card,
  stageId,
  onOpen,
}: {
  card: CRMKanbanCard;
  stageId: number;
  onOpen: (card: CRMKanbanCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: {
      type: "card",
      cardId: card.id,
      stageId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[#d7e4f8] bg-white/95 p-3 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition duration-200",
        "hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_30px_rgba(59,130,246,0.18)]",
        isDragging ? "z-20 rotate-[0.5deg] opacity-70" : "",
      )}
      aria-label={card.title}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/60 via-cyan-400/40 to-emerald-400/60" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(card)}
          className="text-left"
        >
          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{card.title}</p>
          {card.subtitle ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{card.subtitle}</p> : null}
        </button>

        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600"
          aria-label="Drag card"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {card.value ? (
          <p className="text-sm font-semibold text-blue-700">₹ {formatNumber(card.value)}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {card.priority ? (
            <Badge className="bg-amber-50 text-amber-700 ring-amber-200">{card.priority}</Badge>
          ) : null}
          {card.is_blocked ? (
            <Badge className="bg-rose-50 text-rose-700 ring-rose-200">
              <AlertTriangle className="h-3 w-3" /> Blocked
            </Badge>
          ) : null}
        </div>

        <div className="space-y-1 text-xs text-slate-500">
          {card.owner ? (
            <p className="flex items-center gap-1.5">
              <UserCircle2 className="h-3.5 w-3.5" />
              {card.owner.name}
            </p>
          ) : null}
          {card.due_at ? (
            <p className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Due {formatDate(card.due_at)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
});
