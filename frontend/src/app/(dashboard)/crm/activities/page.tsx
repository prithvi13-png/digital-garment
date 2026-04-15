"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  createCRMActivity,
  getCRMFilterMetadata,
  listCRMActivities,
  listCRMLeads,
  listCRMOpportunities,
  updateCRMActivity,
} from "@/services/crm";
import { CRMActivity } from "@/types/api";

const FORM_INITIAL = {
  activity_type: "call",
  subject: "",
  description: "",
  status: "pending",
  related_lead: "",
  related_opportunity: "",
  due_at: "",
  assigned_to: "",
};

export default function CRMActivitiesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<CRMActivity | null>(null);
  const [form, setForm] = useState(FORM_INITIAL);

  const metadataQuery = useQuery({
    queryKey: ["crm-filter-metadata"],
    queryFn: () => getCRMFilterMetadata(),
  });

  const leadQuery = useQuery({
    queryKey: ["crm-activity-leads-select"],
    queryFn: () => listCRMLeads({ page: 1, ordering: "-created_at" }),
  });

  const opportunityQuery = useQuery({
    queryKey: ["crm-activity-opportunity-select"],
    queryFn: () => listCRMOpportunities({ page: 1, ordering: "-created_at" }),
  });

  const activityQuery = useQuery({
    queryKey: ["crm-activities", page, status],
    queryFn: () =>
      listCRMActivities({
        page,
        status: status || undefined,
        ordering: "-created_at",
      }),
  });

  const createMutation = useMutation({
    mutationFn: createCRMActivity,
    onSuccess: () => {
      toast.success("Activity logged");
      queryClient.invalidateQueries({ queryKey: ["crm-activities"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to log activity"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMActivity(id, payload),
    onSuccess: () => {
      toast.success("Activity updated");
      queryClient.invalidateQueries({ queryKey: ["crm-activities"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update activity"),
  });

  const submit = () => {
    if (!form.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!form.related_lead && !form.related_opportunity) {
      toast.error("Link activity to at least one lead or opportunity");
      return;
    }

    const payload = {
      activity_type: form.activity_type,
      subject: form.subject,
      description: form.description,
      status: form.status,
      related_lead: form.related_lead ? Number(form.related_lead) : null,
      related_opportunity: form.related_opportunity ? Number(form.related_opportunity) : null,
      due_at: form.due_at || null,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const rows = activityQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Activities</p>
        <h2 className="text-2xl font-bold text-slate-900">Call, Meeting & Follow-up Tracker</h2>
        <p className="text-sm text-slate-500">Keep every conversation, follow-up, and customer touchpoint organized.</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editing ? "Edit Activity" : "Log Activity"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={form.activity_type} onChange={(e) => setForm((prev) => ({ ...prev, activity_type: e.target.value }))}>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="email">Email</option>
            <option value="follow_up">Follow Up</option>
            <option value="demo">Demo</option>
            <option value="visit">Visit</option>
          </Select>
          <Input value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Subject" />
          <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))} />
          <Select value={form.related_lead} onChange={(e) => setForm((prev) => ({ ...prev, related_lead: e.target.value }))}>
            <option value="">Related lead</option>
            {(leadQuery.data?.results || []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.full_name || lead.first_name}
              </option>
            ))}
          </Select>
          <Select value={form.related_opportunity} onChange={(e) => setForm((prev) => ({ ...prev, related_opportunity: e.target.value }))}>
            <option value="">Related opportunity</option>
            {(opportunityQuery.data?.results || []).map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.name}
              </option>
            ))}
          </Select>
          <Select value={form.assigned_to} onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
            <option value="">Assign owner</option>
            {(metadataQuery.data?.owners || []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
              </option>
            ))}
          </Select>
          <Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Outcome / notes" />
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing ? "Update Activity" : "Save Activity"}
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

      <Card>
        <div className="mb-3 flex items-center gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {activityQuery.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : activityQuery.isError ? (
          <ErrorState message="Failed to load activities." onRetry={activityQuery.refetch} />
        ) : rows.length ? (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.activity_type.replaceAll("_", " ")}</td>
                    <td>{row.subject}</td>
                    <td>{row.status}</td>
                    <td>{row.due_at ? formatDate(row.due_at) : "-"}</td>
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
                            activity_type: row.activity_type || "call",
                            subject: row.subject || "",
                            description: row.description || "",
                            status: row.status || "pending",
                            related_lead: row.related_lead ? String(row.related_lead) : "",
                            related_opportunity: row.related_opportunity ? String(row.related_opportunity) : "",
                            due_at: row.due_at ? row.due_at.slice(0, 16) : "",
                            assigned_to: row.assigned_to ? String(row.assigned_to) : "",
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
              <Pagination page={page} pageSize={20} total={activityQuery.data?.count || 0} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState title="No activities" description="Log calls, meetings, and follow-ups to keep momentum visible." />
        )}
      </Card>
    </div>
  );
}
