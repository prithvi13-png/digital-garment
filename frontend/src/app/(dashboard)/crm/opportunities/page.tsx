"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Rows3, SquareKanban } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { EntityQuickDrawer } from "@/components/crm/entity-quick-drawer";
import { KanbanBoard, KanbanSummaryBar, KanbanToolbar, useKanbanBoard } from "@/components/kanban";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  bulkCRMAction,
  createCRMOpportunity,
  getCRMFilterMetadata,
  listCRMAccounts,
  listCRMOpportunities,
  listCRMPipelineStages,
  updateCRMOpportunity,
} from "@/services/crm";
import { CRMOpportunity } from "@/types/api";

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];

const FORM_INITIAL = {
  name: "",
  linked_account: "",
  deal_value: "",
  source: "manual",
  priority: "medium",
  pipeline: "",
  stage: "",
  assigned_to: "",
  expected_close_date: "",
};

export default function CRMOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [priority, setPriority] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<CRMOpportunity | null>(null);
  const [editing, setEditing] = useState<CRMOpportunity | null>(null);
  const [form, setForm] = useState(FORM_INITIAL);

  const debouncedSearch = useDebouncedValue(search);

  const metadataQuery = useQuery({
    queryKey: ["crm-filter-metadata"],
    queryFn: () => getCRMFilterMetadata(),
  });

  const accountQuery = useQuery({
    queryKey: ["crm-opportunity-account-select"],
    queryFn: () => listCRMAccounts({ page: 1, ordering: "name" }),
  });

  const stageQuery = useQuery({
    queryKey: ["crm-opportunity-stages", pipeline],
    queryFn: () => listCRMPipelineStages({ pipeline: pipeline || undefined, is_active: true }),
    enabled: Boolean(pipeline),
  });

  const opportunitiesQuery = useQuery({
    queryKey: ["crm-opportunities", page, debouncedSearch, owner, pipeline, priority],
    queryFn: () =>
      listCRMOpportunities({
        page,
        search: debouncedSearch,
        assigned_to: owner || undefined,
        pipeline: pipeline || undefined,
        priority: priority || undefined,
        ordering: "-created_at",
      }),
  });

  const kanban = useKanbanBoard("opportunity", {
    page_size: 40,
  });
  const setKanbanFilters = kanban.setFilters;

  useEffect(() => {
    setKanbanFilters((prev) => ({
      ...prev,
      search: debouncedSearch || undefined,
      owner: owner ? Number(owner) : undefined,
      priority: priority || undefined,
      pipeline_id: pipeline ? Number(pipeline) : undefined,
      is_open: true,
    }));
  }, [debouncedSearch, owner, pipeline, priority, setKanbanFilters]);

  const createMutation = useMutation({
    mutationFn: createCRMOpportunity,
    onSuccess: () => {
      toast.success("Opportunity created");
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "opportunity"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create opportunity"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMOpportunity(id, payload),
    onSuccess: () => {
      toast.success("Opportunity updated");
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "opportunity"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update opportunity"),
  });

  const bulkMutation = useMutation({
    mutationFn: bulkCRMAction,
    onSuccess: () => {
      toast.success("Bulk action applied");
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "opportunity"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Bulk action failed"),
  });

  const owners = useMemo(
    () =>
      (metadataQuery.data?.owners || []).map((user) => ({
        label: user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username,
        value: String(user.id),
      })),
    [metadataQuery.data],
  );

  const pipelineOptions = useMemo(
    () =>
      (metadataQuery.data?.pipelines || [])
        .filter((item) => item.module_key === "opportunity")
        .map((item) => ({ label: item.name, value: String(item.id) })),
    [metadataQuery.data],
  );

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Opportunity name is required");
      return;
    }

    const payload = {
      name: form.name,
      linked_account: form.linked_account ? Number(form.linked_account) : null,
      deal_value: form.deal_value ? Number(form.deal_value) : 0,
      source: form.source,
      priority: form.priority,
      pipeline: form.pipeline ? Number(form.pipeline) : null,
      stage: form.stage ? Number(form.stage) : null,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      expected_close_date: form.expected_close_date || null,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const rows = opportunitiesQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Opportunities</p>
            <h2 className="text-2xl font-bold text-slate-900">Deal Execution Board</h2>
            <p className="text-sm text-slate-500">Move opportunities from qualification to closure with clear ownership.</p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant={viewMode === "list" ? "primary" : "secondary"} onClick={() => setViewMode("list")}>
              <Rows3 className="mr-1.5 h-4 w-4" /> List
            </Button>
            <Button type="button" variant={viewMode === "kanban" ? "primary" : "secondary"} onClick={() => setViewMode("kanban")}>
              <SquareKanban className="mr-1.5 h-4 w-4" /> Kanban
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(FORM_INITIAL);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Deal
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editing ? "Edit Opportunity" : "Create Opportunity"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Opportunity name" />
          <Select value={form.linked_account} onChange={(e) => setForm((prev) => ({ ...prev, linked_account: e.target.value }))}>
            <option value="">Select account</option>
            {(accountQuery.data?.results || []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.display_name || account.name}
              </option>
            ))}
          </Select>
          <Input type="number" value={form.deal_value} onChange={(e) => setForm((prev) => ({ ...prev, deal_value: e.target.value }))} placeholder="Deal value" />
          <Input type="date" value={form.expected_close_date} onChange={(e) => setForm((prev) => ({ ...prev, expected_close_date: e.target.value }))} />
          <Select value={form.source} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}>
            {(metadataQuery.data?.sources || [{ key: "manual", label: "Manual" }]).map((source) => (
              <option key={source.key} value={source.key}>
                {source.label}
              </option>
            ))}
          </Select>
          <Select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
            {PRIORITY_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select
            value={form.pipeline}
            onChange={(e) => {
              const nextPipeline = e.target.value;
              setForm((prev) => ({ ...prev, pipeline: nextPipeline, stage: "" }));
            }}
          >
            <option value="">Select pipeline</option>
            {pipelineOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={form.stage} onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value }))}>
            <option value="">Select stage</option>
            {(stageQuery.data?.results || []).map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
          <Select value={form.assigned_to} onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
            <option value="">Assign owner</option>
            {owners.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing ? "Update Opportunity" : "Save Opportunity"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(FORM_INITIAL);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      <KanbanToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        owner={owner}
        onOwnerChange={(value) => {
          setOwner(value);
          setPage(1);
        }}
        owners={owners}
        pipeline={pipeline}
        onPipelineChange={(value) => {
          setPipeline(value);
          setPage(1);
        }}
        pipelines={pipelineOptions}
        priority={priority}
        onPriorityChange={(value) => {
          setPriority(value);
          setPage(1);
        }}
        priorities={PRIORITY_OPTIONS.map((item) => ({ label: item, value: item }))}
        onReset={() => {
          setSearch("");
          setOwner("");
          setPipeline("");
          setPriority("");
          setPage(1);
        }}
      />

      {viewMode === "kanban" ? (
        <div className="space-y-3">
          {kanban.isLoading ? (
            <Card>
              <Skeleton className="h-[420px] w-full" />
            </Card>
          ) : kanban.isError || !kanban.board ? (
            <ErrorState message="Failed to load opportunities board." onRetry={kanban.refetch} />
          ) : (
            <>
              <KanbanSummaryBar
                totalCards={kanban.board.summary.total_cards}
                openCards={kanban.board.summary.open_cards}
                totalValue={kanban.board.summary.total_value}
              />
              <KanbanBoard
                moduleKey="opportunity"
                columns={kanban.board.columns}
                onMoveCard={(recordId, toStageId, position) => kanban.moveCard(recordId, toStageId, position)}
              />
            </>
          )}
        </div>
      ) : (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Opportunity List</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!selectedIds.length) {
                  toast.error("Select opportunities first");
                  return;
                }
                if (!owner) {
                  toast.error("Choose owner filter to bulk assign selected rows");
                  return;
                }
                bulkMutation.mutate({
                  module_key: "opportunity",
                  ids: selectedIds,
                  action: "assign",
                  payload: { to_user_id: Number(owner), reason: "Bulk assign from opportunities board" },
                });
              }}
            >
              Bulk Assign to Owner Filter
            </Button>
          </div>

          {opportunitiesQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : opportunitiesQuery.isError ? (
            <ErrorState message="Failed to load opportunities." onRetry={opportunitiesQuery.refetch} />
          ) : rows.length ? (
            <>
              <DataTable>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(rows.map((row) => row.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                      />
                    </th>
                    <th>Deal</th>
                    <th>Account</th>
                    <th>Stage</th>
                    <th>Value</th>
                    <th>Owner</th>
                    <th>Expected Close</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                            )
                          }
                        />
                      </td>
                      <td>
                        <button type="button" className="text-left" onClick={() => setSelectedOpportunity(row)}>
                          <p className="font-semibold text-slate-800">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.opportunity_number || "Draft"}</p>
                        </button>
                      </td>
                      <td>{row.linked_account_name || "-"}</td>
                      <td>{row.stage_name || "-"}</td>
                      <td>₹ {formatNumber(row.deal_value)}</td>
                      <td>
                        {row.assigned_to_detail
                          ? row.assigned_to_detail.first_name || row.assigned_to_detail.last_name
                            ? `${row.assigned_to_detail.first_name} ${row.assigned_to_detail.last_name}`.trim()
                            : row.assigned_to_detail.username
                          : "Unassigned"}
                      </td>
                      <td>{row.expected_close_date ? formatDate(row.expected_close_date) : "-"}</td>
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            setEditing(row);
                            setForm({
                              name: row.name || "",
                              linked_account: row.linked_account ? String(row.linked_account) : "",
                              deal_value: row.deal_value ? String(row.deal_value) : "",
                              source: row.source || "manual",
                              priority: row.priority || "medium",
                              pipeline: row.pipeline ? String(row.pipeline) : "",
                              stage: row.stage ? String(row.stage) : "",
                              assigned_to: row.assigned_to ? String(row.assigned_to) : "",
                              expected_close_date: row.expected_close_date || "",
                            });
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>

              <div className="mt-4">
                <Pagination page={page} pageSize={20} total={opportunitiesQuery.data?.count || 0} onPageChange={setPage} />
              </div>
            </>
          ) : (
            <EmptyState title="No opportunities" description="Create your first opportunity to start tracking pipeline value." />
          )}
        </Card>
      )}

      <EntityQuickDrawer
        entityType="opportunity"
        entityId={selectedOpportunity?.id || null}
        title={selectedOpportunity?.name || ""}
        subtitle={selectedOpportunity?.linked_account_name || ""}
        owner={
          selectedOpportunity?.assigned_to_detail
            ? selectedOpportunity.assigned_to_detail.first_name || selectedOpportunity.assigned_to_detail.last_name
              ? `${selectedOpportunity.assigned_to_detail.first_name} ${selectedOpportunity.assigned_to_detail.last_name}`.trim()
              : selectedOpportunity.assigned_to_detail.username
            : undefined
        }
        dueAt={selectedOpportunity?.expected_close_date}
        metadata={[
          { label: "Deal #", value: selectedOpportunity?.opportunity_number || "-" },
          { label: "Stage", value: selectedOpportunity?.stage_name || "-" },
          { label: "Probability", value: `${selectedOpportunity?.probability || 0}%` },
          { label: "Deal Value", value: `₹ ${formatNumber(selectedOpportunity?.deal_value || 0)}` },
        ]}
        onClose={() => setSelectedOpportunity(null)}
      />
    </div>
  );
}
