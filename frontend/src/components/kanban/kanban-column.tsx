"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { CRMKanbanCard, CRMKanbanColumn as KanbanColumnType } from "@/types/api";

import { KanbanCard } from "./kanban-card";

export function KanbanColumn({
  column,
  isOver,
  onOpenCard,
}: {
  column: KanbanColumnType;
  isOver: boolean;
  onOpenCard: (card: CRMKanbanCard) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: `stage-${column.stage.id}`,
    data: {
      type: "stage",
      stageId: column.stage.id,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[320px] min-w-[320px] flex-col rounded-3xl border border-[#d7e4f8] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(246,250,255,0.96)_100%)] p-3 shadow-[0_14px_32px_rgba(15,23,42,0.08)] transition",
        isOver ? "border-blue-300 bg-blue-50/70" : "",
      )}
    >
      <header className="sticky top-0 z-10 mb-2 rounded-2xl border border-[#dbe7fa] bg-white/85 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.stage.color }} />
            <h3 className="text-sm font-semibold text-slate-800">{column.stage.name}</h3>
          </div>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{column.count}</span>
        </div>
      </header>

      <SortableContext items={column.cards.map((card) => `card-${card.id}`)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {column.cards.length ? (
            column.cards.map((card) => (
              <KanbanCard key={card.id} card={card} stageId={column.stage.id} onOpen={onOpenCard} />
            ))
          ) : (
            <EmptyState
              title="No cards"
              description="Drop items here to continue your flow."
            />
          )}

          {column.has_more ? (
            <button
              type="button"
              className="rounded-2xl border border-dashed border-[#c8d8f5] px-3 py-2 text-xs font-semibold text-blue-600 hover:border-blue-300 hover:bg-blue-50"
            >
              Load more
            </button>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}
