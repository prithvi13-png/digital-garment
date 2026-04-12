"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listLines } from "@/services/lines";
import {
  createWorker,
  deleteWorker,
  listWorkers,
  updateWorker,
  WorkerPayload,
} from "@/services/productivity";
import { Worker } from "@/types/api";

const schema = z.object({
  worker_code: z.string().min(1, "Worker code is required"),
  name: z.string().min(1, "Name is required"),
  mobile: z.string().optional(),
  skill_type: z.string().optional(),
  assigned_line: z.string().optional(),
  barcode_value: z.string().optional(),
  is_active: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function WorkersPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const canManage = hasRole("admin", "production_supervisor", "supervisor");
  const canDelete = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      is_active: "true",
    },
  });

  const linesQuery = useQuery({
    queryKey: ["worker-lines-filter"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canManage,
  });

  const workersQuery = useQuery({
    queryKey: ["workers", page, debouncedSearch, lineFilter, statusFilter],
    queryFn: () =>
      listWorkers({
        page,
        search: debouncedSearch || undefined,
        assigned_line: lineFilter || undefined,
        is_active: statusFilter || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createWorker,
    onSuccess: () => {
      toast.success("Worker created");
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setEditingWorker(null);
      reset({
        worker_code: "",
        name: "",
        mobile: "",
        skill_type: "",
        assigned_line: "",
        barcode_value: "",
        is_active: "true",
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create worker"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<WorkerPayload> }) => updateWorker(id, payload),
    onSuccess: () => {
      toast.success("Worker updated");
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setEditingWorker(null);
      reset({
        worker_code: "",
        name: "",
        mobile: "",
        skill_type: "",
        assigned_line: "",
        barcode_value: "",
        is_active: "true",
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update worker"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorker,
    onSuccess: () => {
      toast.success("Worker deleted");
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete worker"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: WorkerPayload = {
      worker_code: values.worker_code.trim(),
      name: values.name.trim(),
      mobile: values.mobile || "",
      skill_type: values.skill_type || "",
      assigned_line: values.assigned_line ? Number(values.assigned_line) : null,
      barcode_value: values.barcode_value || "",
      is_active: values.is_active === "true",
    };

    if (editingWorker) {
      await updateMutation.mutateAsync({ id: editingWorker.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin and production supervisors can manage workers."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingWorker ? "Edit Worker" : "Create Worker"}</h2>
          {editingWorker ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingWorker(null);
                reset({
                  worker_code: "",
                  name: "",
                  mobile: "",
                  skill_type: "",
                  assigned_line: "",
                  barcode_value: "",
                  is_active: "true",
                });
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Worker Code</label>
            <Input {...register("worker_code")} placeholder="WRK-001" />
            {errors.worker_code ? <p className="mt-1 text-xs text-red-600">{errors.worker_code.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input {...register("name")} />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mobile</label>
            <Input {...register("mobile")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Skill Type</label>
            <Input {...register("skill_type")} placeholder="Stitching / QC" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigned Line</label>
            <Select {...register("assigned_line")}>
              <option value="">Unassigned</option>
              {linesQuery.data?.results.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
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
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Barcode Value</label>
            <Input {...register("barcode_value")} placeholder="Optional" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingWorker ? "Update Worker" : "Create Worker"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search worker code / name"
          />
          <Select
            value={lineFilter}
            onChange={(event) => {
              setLineFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All lines</option>
            {linesQuery.data?.results.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              setLineFilter("");
              setStatusFilter("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {workersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : workersQuery.isError ? (
          <ErrorState message="Failed to load workers." onRetry={workersQuery.refetch} />
        ) : workersQuery.data && workersQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Worker</th>
                  <th>Mobile</th>
                  <th>Skill</th>
                  <th>Assigned Line</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workersQuery.data.results.map((worker) => (
                  <tr key={worker.id} className="hover:bg-slate-50">
                    <td>
                      <p className="font-semibold text-slate-800">{worker.worker_code}</p>
                      <p className="text-xs text-slate-500">{worker.name}</p>
                    </td>
                    <td className="text-slate-600">{worker.mobile || "-"}</td>
                    <td className="text-slate-600">{worker.skill_type || "-"}</td>
                    <td className="text-slate-600">{worker.assigned_line_name || "-"}</td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${worker.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {worker.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/workers/${worker.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingWorker(worker);
                            reset({
                              worker_code: worker.worker_code,
                              name: worker.name,
                              mobile: worker.mobile || "",
                              skill_type: worker.skill_type || "",
                              assigned_line: worker.assigned_line ? String(worker.assigned_line) : "",
                              barcode_value: worker.barcode_value || "",
                              is_active: worker.is_active ? "true" : "false",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        {canDelete ? (
                          <ConfirmButton
                            label="Delete"
                            message={`Delete worker ${worker.worker_code}?`}
                            onConfirm={() => deleteMutation.mutate(worker.id)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={workersQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No workers found" description="Create workers to start productivity tracking." />
        )}
      </Card>
    </div>
  );
}
