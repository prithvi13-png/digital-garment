"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCcw, Rows3, SquareKanban, UserPlus2 } from "lucide-react";
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
  convertCRMLead,
  createCRMLead,
  getCRMFilterMetadata,
  listCRMLeads,
  listCRMPipelineStages,
  updateCRMLead,
} from "@/services/crm";
import { CRMLead } from "@/types/api";

const LEAD_STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "nurturing",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "junk",
  "unqualified",
];

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"];

const INITIAL_FORM = {
  first_name: "",
  last_name: "",
  company_name: "",
  email: "",
  phone: "",
  source: "manual",
  status: "new",
  priority: "medium",
  estimated_value: "",
  pipeline: "",
  stage: "",
  assigned_to: "",
};

export default function CRMLeadsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [priority, setPriority] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [editingLead, setEditingLead] = useState<CRMLead | null>(null);
  const [formState, setFormState] = useState(INITIAL_FORM);
  const [bulkAction, setBulkAction] = useState<"assign" | "change_status" | "archive">("assign");
  const [bulkValue, setBulkValue] = useState("");

  const debouncedSearch = useDebouncedValue(search);

  const metadataQuery = useQuery({
    queryKey: ["crm-filter-metadata"],
    queryFn: () => getCRMFilterMetadata(),
  });

  const leadQuery = useQuery({
    queryKey: ["crm-leads", page, debouncedSearch, status, owner, pipeline, priority],
    queryFn: () =>
      listCRMLeads({
        page,
        search: debouncedSearch,
        status: status || undefined,
        assigned_to: owner || undefined,
        pipeline: pipeline || undefined,
        priority: priority || undefined,
        ordering: "-created_at",
      }),
  });

  const stageQuery = useQuery({
    queryKey: ["crm-lead-stages", pipeline],
    queryFn: () => listCRMPipelineStages({ pipeline: pipeline || undefined, is_active: true }),
    enabled: Boolean(pipeline),
  });

  const kanban = useKanbanBoard("lead", {
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
      status: status || undefined,
    }));
  }, [debouncedSearch, owner, pipeline, priority, setKanbanFilters, status]);

  const createMutation = useMutation({
    mutationFn: createCRMLead,
    onSuccess: () => {
      toast.success("Lead saved successfully");
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "lead"] });
      setEditingLead(null);
      setFormState(INITIAL_FORM);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create lead"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMLead(id, payload),
    onSuccess: () => {
      toast.success("Lead updated");
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "lead"] });
      setEditingLead(null);
      setFormState(INITIAL_FORM);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update lead"),
  });

  const convertMutation = useMutation({
    mutationFn: (leadId: number) => convertCRMLead(leadId, { create_opportunity: true }),
    onSuccess: () => {
      toast.success("Lead converted successfully");
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "lead"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to convert lead"),
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: Parameters<typeof bulkCRMAction>[0]) => bulkCRMAction(payload),
    onSuccess: () => {
      toast.success("Bulk action applied");
      setSelectedIds([]);
      setBulkValue("");
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "lead"] });
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
        .filter((item) => item.module_key === "lead")
        .map((item) => ({ label: item.name, value: String(item.id) })),
    [metadataQuery.data],
  );

  const submitLead = () => {
    if (!formState.first_name.trim()) {
      toast.error("First name is required");
      return;
    }

    const payload = {
      first_name: formState.first_name,
      last_name: formState.last_name,
      company_name: formState.company_name,
      email: formState.email,
      phone: formState.phone,
      source: formState.source,
      status: formState.status,
      priority: formState.priority,
      estimated_value: formState.estimated_value ? Number(formState.estimated_value) : null,
      pipeline: formState.pipeline ? Number(formState.pipeline) : null,
      stage: formState.stage ? Number(formState.stage) : null,
      assigned_to: formState.assigned_to ? Number(formState.assigned_to) : null,
    };

    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const applyBulkAction = () => {
    if (!selectedIds.length) {
      toast.error("Select at least one lead");
      return;
    }

    if (bulkAction === "assign" && !bulkValue) {
      toast.error("Select assignee");
      return;
    }

    if (bulkAction === "change_status" && !bulkValue) {
      toast.error("Select status");
      return;
    }

    let payload: Record<string, unknown> = {};
    if (bulkAction === "assign") {
      payload = { to_user_id: Number(bulkValue), reason: "Bulk assignment" };
    } else if (bulkAction === "change_status") {
      payload = { status: bulkValue };
    }

    bulkMutation.mutate({
      module_key: "lead",
      ids: selectedIds,
      action: bulkAction,
      payload,
    });
  };

  const toggleRowSelection = (leadId: number) => {
    setSelectedIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId],
    );
  };

  const rows = leadQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Leads</p>
            <h2 className="text-2xl font-bold text-slate-900">Lead Management Hub</h2>
            <p className="text-sm text-slate-500">Capture, qualify, and convert demand faster with operational pipeline control.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                setEditingLead(null);
                setFormState(INITIAL_FORM);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Lead
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editingLead ? "Edit Lead" : "Create Lead"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input placeholder="First name" value={formState.first_name} onChange={(e) => setFormState((prev) => ({ ...prev, first_name: e.target.value }))} />
          <Input placeholder="Last name" value={formState.last_name} onChange={(e) => setFormState((prev) => ({ ...prev, last_name: e.target.value }))} />
          <Input placeholder="Company" value={formState.company_name} onChange={(e) => setFormState((prev) => ({ ...prev, company_name: e.target.value }))} />
          <Input placeholder="Email" value={formState.email} onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))} />
          <Input placeholder="Phone" value={formState.phone} onChange={(e) => setFormState((prev) => ({ ...prev, phone: e.target.value }))} />
          <Select value={formState.source} onChange={(e) => setFormState((prev) => ({ ...prev, source: e.target.value }))}>
            {(metadataQuery.data?.sources || [{ key: "manual", label: "Manual" }]).map((source) => (
              <option key={source.key} value={source.key}>
                {source.label}
              </option>
            ))}
          </Select>
          <Select value={formState.status} onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value }))}>
            {LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Select value={formState.priority} onChange={(e) => setFormState((prev) => ({ ...prev, priority: e.target.value }))}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Estimated value"
            value={formState.estimated_value}
            onChange={(e) => setFormState((prev) => ({ ...prev, estimated_value: e.target.value }))}
          />
          <Select
            value={formState.pipeline}
            onChange={(e) => {
              const nextPipeline = e.target.value;
              setFormState((prev) => ({ ...prev, pipeline: nextPipeline, stage: "" }));
            }}
          >
            <option value="">Select pipeline</option>
            {pipelineOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select value={formState.stage} onChange={(e) => setFormState((prev) => ({ ...prev, stage: e.target.value }))}>
            <option value="">Select stage</option>
            {(stageQuery.data?.results || []).map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
          <Select value={formState.assigned_to} onChange={(e) => setFormState((prev) => ({ ...prev, assigned_to: e.target.value }))}>
            <option value="">Assign owner</option>
            {owners.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={submitLead} disabled={createMutation.isPending || updateMutation.isPending}>
            {editingLead ? "Update Lead" : "Save Lead"}
          </Button>
          {editingLead ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingLead(null);
                setFormState(INITIAL_FORM);
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
          setStatus("");
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
            <ErrorState message="Failed to load lead board." onRetry={kanban.refetch} />
          ) : (
            <>
              <KanbanSummaryBar
                totalCards={kanban.board.summary.total_cards}
                openCards={kanban.board.summary.open_cards}
                totalValue={kanban.board.summary.total_value}
              />
              <KanbanBoard
                moduleKey="lead"
                columns={kanban.board.columns}
                onMoveCard={(recordId, toStageId, position) => kanban.moveCard(recordId, toStageId, position)}
              />
            </>
          )}
        </div>
      ) : (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Lead List</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => leadQuery.refetch()}>
                <RefreshCcw className="mr-1.5 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <div className="mb-3 grid gap-2 md:grid-cols-[180px_220px_1fr]">
            <Select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}>
              <option value="assign">Assign owner</option>
              <option value="change_status">Change status</option>
              <option value="archive">Archive</option>
            </Select>

            {bulkAction === "assign" ? (
              <Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                <option value="">Select assignee</option>
                {owners.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            ) : bulkAction === "change_status" ? (
              <Select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                <option value="">Select status</option>
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">No extra input needed</div>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={applyBulkAction} disabled={bulkMutation.isPending}>
                <UserPlus2 className="mr-1.5 h-4 w-4" /> Apply to {selectedIds.length || 0} selected
              </Button>
            </div>
          </div>

          {leadQuery.isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : leadQuery.isError ? (
            <ErrorState message="Failed to load leads." onRetry={leadQuery.refetch} />
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
                    <th>Lead</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Owner</th>
                    <th>Value</th>
                    <th>Next Follow-up</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleRowSelection(lead.id)}
                        />
                      </td>
                      <td>
                        <button type="button" className="text-left" onClick={() => setSelectedLead(lead)}>
                          <p className="font-semibold text-slate-800">{lead.full_name || lead.first_name}</p>
                          <p className="text-xs text-slate-500">{lead.lead_number || "Draft"}</p>
                        </button>
                      </td>
                      <td>{lead.company_name || "-"}</td>
                      <td>{lead.status.replaceAll("_", " ")}</td>
                      <td>{lead.priority}</td>
                      <td>
                        {lead.assigned_to_detail
                          ? lead.assigned_to_detail.first_name || lead.assigned_to_detail.last_name
                            ? `${lead.assigned_to_detail.first_name} ${lead.assigned_to_detail.last_name}`.trim()
                            : lead.assigned_to_detail.username
                          : "Unassigned"}
                      </td>
                      <td>₹ {formatNumber(lead.estimated_value || 0)}</td>
                      <td>{lead.next_follow_up_at ? formatDate(lead.next_follow_up_at) : "-"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2 py-1 text-xs"
                            onClick={() => {
                              setEditingLead(lead);
                              setFormState({
                                first_name: lead.first_name || "",
                                last_name: lead.last_name || "",
                                company_name: lead.company_name || "",
                                email: lead.email || "",
                                phone: lead.phone || "",
                                source: lead.source || "manual",
                                status: lead.status || "new",
                                priority: lead.priority || "medium",
                                estimated_value: lead.estimated_value ? String(lead.estimated_value) : "",
                                pipeline: lead.pipeline ? String(lead.pipeline) : "",
                                stage: lead.stage ? String(lead.stage) : "",
                                assigned_to: lead.assigned_to ? String(lead.assigned_to) : "",
                              });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            className="px-2 py-1 text-xs"
                            onClick={() => convertMutation.mutate(lead.id)}
                            disabled={lead.is_converted || convertMutation.isPending}
                          >
                            {lead.is_converted ? "Converted" : "Convert"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>

              <div className="mt-4">
                <Pagination
                  page={page}
                  pageSize={20}
                  total={leadQuery.data?.count || 0}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState title="No leads found" description="Adjust filters or create your first lead to start the sales funnel." />
          )}
        </Card>
      )}

      <EntityQuickDrawer
        entityType="lead"
        entityId={selectedLead?.id || null}
        title={selectedLead?.full_name || ""}
        subtitle={selectedLead?.company_name || selectedLead?.email || ""}
        owner={
          selectedLead?.assigned_to_detail
            ? selectedLead.assigned_to_detail.first_name || selectedLead.assigned_to_detail.last_name
              ? `${selectedLead.assigned_to_detail.first_name} ${selectedLead.assigned_to_detail.last_name}`.trim()
              : selectedLead.assigned_to_detail.username
            : undefined
        }
        dueAt={selectedLead?.next_follow_up_at}
        metadata={[
          { label: "Lead #", value: selectedLead?.lead_number || "-" },
          { label: "Status", value: selectedLead?.status?.replaceAll("_", " ") || "-" },
          { label: "Source", value: selectedLead?.source || "-" },
          { label: "Estimated Value", value: `₹ ${formatNumber(selectedLead?.estimated_value || 0)}` },
        ]}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
