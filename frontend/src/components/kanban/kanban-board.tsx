"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { CRMKanbanCard, CRMKanbanColumn as KanbanColumnType, CRMModuleKey } from "@/types/api";

import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";
import { KanbanQuickViewDrawer } from "./kanban-quick-view-drawer";

function parseCardId(rawId: string | number): number | null {
  const asString = String(rawId);
  if (!asString.startsWith("card-")) return null;
  const parsed = Number(asString.replace("card-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseStageId(rawId: string | number): number | null {
  const asString = String(rawId);
  if (!asString.startsWith("stage-")) return null;
  const parsed = Number(asString.replace("stage-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function KanbanBoard({
  moduleKey,
  columns,
  onMoveCard,
}: {
  moduleKey: CRMModuleKey;
  columns: KanbanColumnType[];
  onMoveCard: (recordId: number, toStageId: number, position?: number) => void;
}) {
  const [activeCardId, setActiveCardId] = useState<number | null>(null);
  const [overStageId, setOverStageId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<CRMKanbanCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const cardIndex = useMemo(() => {
    const byId = new Map<number, CRMKanbanCard>();
    columns.forEach((column) => column.cards.forEach((card) => byId.set(card.id, card)));
    return byId;
  }, [columns]);

  const activeCard = activeCardId ? cardIndex.get(activeCardId) ?? null : null;

  const resolveStageForCard = (cardId: number) => {
    for (const column of columns) {
      const exists = column.cards.some((card) => card.id === cardId);
      if (exists) return column.stage.id;
    }
    return null;
  };

  const resolveCardPosition = (cardId: number, stageId: number) => {
    const column = columns.find((item) => item.stage.id === stageId);
    if (!column) return undefined;
    const index = column.cards.findIndex((card) => card.id === cardId);
    return index >= 0 ? index : undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = parseCardId(event.active.id);
    setActiveCardId(cardId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const sourceId = parseCardId(event.active.id);
    if (!sourceId || !event.over) {
      setActiveCardId(null);
      setOverStageId(null);
      return;
    }

    const directStage = parseStageId(event.over.id);
    const overCard = parseCardId(event.over.id);

    let destinationStageId = directStage;
    let position: number | undefined;

    if (!destinationStageId && overCard) {
      destinationStageId = resolveStageForCard(overCard);
      if (destinationStageId) {
        position = resolveCardPosition(overCard, destinationStageId);
      }
    }

    if (destinationStageId) {
      onMoveCard(sourceId, destinationStageId, position);
    }

    setActiveCardId(null);
    setOverStageId(null);
  };

  if (!columns.length) {
    return (
      <EmptyState
        title="No board configured"
        description="Create at least one active pipeline and stage to start using Kanban workflows."
      />
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={(event) => {
          if (!event.over) {
            setOverStageId(null);
            return;
          }
          const stageId = parseStageId(event.over.id);
          if (stageId) {
            setOverStageId(stageId);
            return;
          }
          const overCard = parseCardId(event.over.id);
          if (overCard) {
            setOverStageId(resolveStageForCard(overCard));
          }
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveCardId(null);
          setOverStageId(null);
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <KanbanColumn
              key={column.stage.id}
              column={column}
              isOver={overStageId === column.stage.id}
              onOpenCard={(card) => setSelectedCard(card)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[320px] opacity-95">
              <KanbanCard card={activeCard} stageId={activeCard.stage_id || 0} onOpen={() => null} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <KanbanQuickViewDrawer moduleKey={moduleKey} card={selectedCard} onClose={() => setSelectedCard(null)} />
    </>
  );
}
