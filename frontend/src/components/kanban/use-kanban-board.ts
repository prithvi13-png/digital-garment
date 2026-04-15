"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { getCRMKanbanBoard, moveCRMKanbanCard, type CRMKanbanFilters } from "@/services/crm";
import { CRMKanbanBoardResponse, CRMKanbanCard, CRMModuleKey } from "@/types/api";

function applyOptimisticMove(
  board: CRMKanbanBoardResponse | undefined,
  payload: { record_id: number; to_stage_id: number; position?: number },
): CRMKanbanBoardResponse | undefined {
  if (!board) return board;

  const nextColumns = board.columns.map((column) => ({
    ...column,
    cards: [...column.cards],
  }));

  let movingCard: CRMKanbanCard | null = null;
  let sourceIndex = -1;
  let sourceCardIndex = -1;

  nextColumns.forEach((column, colIndex) => {
    const cardIndex = column.cards.findIndex((card) => card.id === payload.record_id);
    if (cardIndex >= 0) {
      sourceIndex = colIndex;
      sourceCardIndex = cardIndex;
      movingCard = column.cards[cardIndex];
    }
  });

  if (!movingCard || sourceIndex < 0 || sourceCardIndex < 0) {
    return board;
  }

  nextColumns[sourceIndex].cards.splice(sourceCardIndex, 1);

  const destinationIndex = nextColumns.findIndex((column) => column.stage.id === payload.to_stage_id);
  if (destinationIndex < 0) {
    nextColumns[sourceIndex].cards.splice(sourceCardIndex, 0, movingCard);
    return board;
  }

  const updatedCard: CRMKanbanCard = {
    ...(movingCard as CRMKanbanCard),
    stage_id: payload.to_stage_id,
    position: payload.position,
  };

  const insertAt =
    payload.position !== undefined && payload.position >= 0 && payload.position <= nextColumns[destinationIndex].cards.length
      ? payload.position
      : 0;

  nextColumns[destinationIndex].cards.splice(insertAt, 0, updatedCard);

  return {
    ...board,
    columns: nextColumns.map((column) => ({
      ...column,
      count: column.cards.length,
    })),
  };
}

export function useKanbanBoard(moduleKey: CRMModuleKey, initialFilters: CRMKanbanFilters = {}) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CRMKanbanFilters>(initialFilters);

  const queryKey = useMemo(() => ["crm-kanban", moduleKey, JSON.stringify(filters)] as const, [moduleKey, filters]);

  const boardQuery = useQuery({
    queryKey,
    queryFn: () => getCRMKanbanBoard(moduleKey, filters),
  });

  const moveMutation = useMutation({
    mutationFn: ({ record_id, to_stage_id, position, reason }: { record_id: number; to_stage_id: number; position?: number; reason?: string }) =>
      moveCRMKanbanCard({
        module_key: moduleKey,
        record_id,
        to_stage_id,
        position,
        reason,
      }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CRMKanbanBoardResponse>(queryKey);
      queryClient.setQueryData<CRMKanbanBoardResponse | undefined>(queryKey, (old) => applyOptimisticMove(old, payload));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    board: boardQuery.data,
    isLoading: boardQuery.isLoading,
    isError: boardQuery.isError,
    error: boardQuery.error,
    refetch: boardQuery.refetch,
    filters,
    setFilters,
    moveCard: (recordId: number, toStageId: number, position?: number, reason?: string) =>
      moveMutation.mutate({ record_id: recordId, to_stage_id: toStageId, position, reason }),
    isMoving: moveMutation.isPending,
  };
}
