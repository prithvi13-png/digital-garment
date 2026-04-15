"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare2, Rows3, SquareKanban } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

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
import { formatDate } from "@/lib/utils";
import {
  createCRMTask,
  getCRMFilterMetadata,
  listCRMLeads,
  listCRMPipelineStages,
  listCRMTasks,
  updateCRMTask,
} from "@/services/crm";
import { CRMTask } from "@/types/api";

const FORM_INITIAL = {
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  due_date: "",
  related_lead: "",
  assigned_to: "",
  pipeline: "",
  stage: "",
};

export default function CRMTasksPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [priority, setPriority] = useState("");
  const [editing, setEditing] = useState<CRMTask | null>(null);
  const [form, setForm] = useState(FORM_INITIAL);

  const debouncedSearch = useDebouncedValue(search);

  const metadataQuery = useQuery({
    queryKey: ["crm-filter-metadata"],
    queryFn: () => getCRMFilterMetadata(),
  });

  const leadQuery = useQuery({
    queryKey: ["crm-task-lead-select"],
    queryFn: () => listCRMLeads({ page: 1, ordering: "-created_at" }),
  });

  const stageQuery = useQuery({
    queryKey: ["crm-task-stages", pipeline],
    queryFn: () => listCRMPipelineStages({ pipeline: pipeline || undefined, is_active: true }),
    enabled: Boolean(pipeline),
  });

  const taskQuery = useQuery({
    queryKey: ["crm-tasks", page, debouncedSearch, owner, pipeline, priority],
    queryFn: () =>
      listCRMTasks({
        page,
        search: debouncedSearch,
        assigned_to: owner || undefined,
        pipeline: pipeline || undefined,
        priority: priority || undefined,
        ordering: "due_date",
      }),
  });

  const kanban = useKanbanBoard("task", {
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
    }));
  }, [debouncedSearch, owner, pipeline, priority, setKanbanFilters]);

  const createMutation = useMutation({
    mutationFn: createCRMTask,
    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "task"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create task"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMTask(id, payload),
    onSuccess: () => {
      toast.success("Task updated");
      queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kanban", "task"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update task"),
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
        .filter((item) => item.module_key === "task")
        .map((item) => ({ label: item.name, value: String(item.id) })),
    [metadataQuery.data],
  );

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!form.related_lead) {
      toast.error("Link task to a lead for traceability");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date,
      related_lead: Number(form.related_lead),
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      pipeline: form.pipeline ? Number(form.pipeline) : null,
      stage: form.stage ? Number(form.stage) : null,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const rows = taskQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Tasks</p>
            <h2 className="text-2xl font-bold text-slate-900">Follow-up Task Engine</h2>
            <p className="text-sm text-slate-500">Track next actions, overdue commitments, and execution discipline.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant={viewMode === "list" ? "primary" : "secondary"} onClick={() => setViewMode("list")}> 
              <Rows3 className="mr-1.5 h-4 w-4" /> List
            </Button>
            <Button type="button" variant={viewMode === "kanban" ? "primary" : "secondary"} onClick={() => setViewMode("kanban")}>
              <SquareKanban className="mr-1.5 h-4 w-4" /> Kanban
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editing ? "Edit Task" : "Create Task"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Task title" />
          <Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" />
          <Select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input type="date" value={form.due_date} onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))} />
          <Select value={form.related_lead} onChange={(e) => setForm((prev) => ({ ...prev, related_lead: e.target.value }))}>
            <option value="">Related lead</option>
            {(leadQuery.data?.results || []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.full_name || lead.first_name}
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
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            <CheckSquare2 className="mr-1.5 h-4 w-4" /> {editing ? "Update Task" : "Save Task"}
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
        priorities={[
          { label: "low", value: "low" },
          { label: "medium", value: "medium" },
          { label: "high", value: "high" },
          { label: "urgent", value: "urgent" },
        ]}
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
            <ErrorState message="Failed to load task board." onRetry={kanban.refetch} />
          ) : (
            <>
              <KanbanSummaryBar
                totalCards={kanban.board.summary.total_cards}
                openCards={kanban.board.summary.open_cards}
                totalValue={kanban.board.summary.total_value}
              />
              <KanbanBoard
                moduleKey="task"
                columns={kanban.board.columns}
                onMoveCard={(recordId, toStageId, position) => kanban.moveCard(recordId, toStageId, position)}
              />
            </>
          )}
        </div>
      ) : (
        <Card>
          {taskQuery.isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : taskQuery.isError ? (
            <ErrorState message="Failed to load tasks." onRetry={taskQuery.refetch} />
          ) : rows.length ? (
            <>
              <DataTable>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Owner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <p className="font-semibold text-slate-800">{row.title}</p>
                        <p className="text-xs text-slate-500">{row.task_number || "Draft"}</p>
                      </td>
                      <td>{row.status.replaceAll("_", " ")}</td>
                      <td>{row.priority}</td>
                      <td>{formatDate(row.due_date)}</td>
                      <td>
                        {row.assigned_to_detail
                          ? row.assigned_to_detail.first_name || row.assigned_to_detail.last_name
                            ? `${row.assigned_to_detail.first_name} ${row.assigned_to_detail.last_name}`.trim()
                            : row.assigned_to_detail.username
                          : "Unassigned"}
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-2 py-1 text-xs"
                          onClick={() => {
                            setEditing(row);
                            setForm({
                              title: row.title || "",
                              description: row.description || "",
                              priority: row.priority || "medium",
                              status: row.status || "open",
                              due_date: row.due_date || "",
                              related_lead: row.related_lead ? String(row.related_lead) : "",
                              assigned_to: row.assigned_to ? String(row.assigned_to) : "",
                              pipeline: row.pipeline ? String(row.pipeline) : "",
                              stage: row.stage ? String(row.stage) : "",
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
                <Pagination page={page} pageSize={20} total={taskQuery.data?.count || 0} onPageChange={setPage} />
              </div>
            </>
          ) : (
            <EmptyState title="No tasks" description="Create follow-up tasks to keep deals moving forward." />
          )}
        </Card>
      )}
    </div>
  );
}
