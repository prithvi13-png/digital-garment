"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { SeverityBadge } from "@/components/status-badges/severity-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { DEFECT_SEVERITY_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  createDefectType,
  DefectTypePayload,
  deleteDefectType,
  listDefectTypes,
  updateDefectType,
} from "@/services/quality";
import { DefectType } from "@/types/api";

const PAGE_SIZE = 20;

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  severity: z.enum(["minor", "major", "critical"]),
  description: z.string().optional(),
  is_active: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof schema>;

export default function DefectTypesPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const canManage = hasRole("admin", "quality_inspector");
  const canDelete = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [editingRow, setEditingRow] = useState<DefectType | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      severity: "minor",
      is_active: "true",
    },
  });

  const defectsQuery = useQuery({
    queryKey: ["defect-types", page, debouncedSearch, severityFilter, activeFilter],
    queryFn: () =>
      listDefectTypes({
        page,
        search: debouncedSearch || undefined,
        severity: severityFilter || undefined,
        is_active: activeFilter || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createDefectType,
    onSuccess: () => {
      toast.success("Defect type created");
      queryClient.invalidateQueries({ queryKey: ["defect-types"] });
      reset({ name: "", code: "", severity: "minor", description: "", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create defect type"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DefectTypePayload> }) =>
      updateDefectType(id, payload),
    onSuccess: () => {
      toast.success("Defect type updated");
      queryClient.invalidateQueries({ queryKey: ["defect-types"] });
      setEditingRow(null);
      reset({ name: "", code: "", severity: "minor", description: "", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update defect type"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDefectType,
    onSuccess: () => {
      toast.success("Defect type deleted");
      queryClient.invalidateQueries({ queryKey: ["defect-types"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete defect type"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: DefectTypePayload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      severity: values.severity,
      description: values.description?.trim() || "",
      is_active: values.is_active === "true",
    };

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const onEdit = (row: DefectType) => {
    setEditingRow(row);
    reset({
      name: row.name,
      code: row.code,
      severity: row.severity,
      description: row.description || "",
      is_active: row.is_active ? "true" : "false",
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin and quality inspector roles can access defect master setup."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingRow ? "Edit Defect Type" : "Create Defect Type"}</h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset({ name: "", code: "", severity: "minor", description: "", is_active: "true" });
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input {...register("name")} placeholder="Stitch Open" />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
            <Input {...register("code")} placeholder="DEF-STITCH-OPEN" />
            {errors.code ? <p className="mt-1 text-xs text-red-600">{errors.code.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Severity</label>
            <Select {...register("severity")}>
              {DEFECT_SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <Select {...register("is_active")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <Textarea rows={2} {...register("description")} placeholder="Optional notes" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Defect Type" : "Create Defect Type"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Defect Types</h2>
            <p className="text-sm text-slate-500">Maintain standardized defect catalog for QC consistency.</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name or code"
            />
            <Select
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All severity</option>
              {DEFECT_SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        </div>

        {defectsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : defectsQuery.isError ? (
          <ErrorState message="Failed to load defect types." onRetry={defectsQuery.refetch} />
        ) : defectsQuery.data && defectsQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defectsQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{row.name}</td>
                    <td className="text-slate-700">{row.code}</td>
                    <td>
                      <SeverityBadge severity={row.severity} />
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-slate-600">{formatDate(row.updated_at)}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => onEdit(row)}>
                          Edit
                        </Button>
                        {canDelete ? (
                          <ConfirmButton
                            label="Delete"
                            message={`Delete defect type ${row.code}?`}
                            onConfirm={() => deleteMutation.mutate(row.id)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={defectsQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No defect types"
            description="Create a few defect types so quality teams can tag inspections consistently."
          />
        )}
      </Card>
    </div>
  );
}
