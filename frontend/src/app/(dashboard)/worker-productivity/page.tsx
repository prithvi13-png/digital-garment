"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { EfficiencyBadge } from "@/components/status-badges/efficiency-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { TableLoadingState } from "@/components/ui/table-loading-state";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNumber } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import {
  createWorkerProductivity,
  deleteWorkerProductivity,
  listWorkerProductivity,
  listWorkers,
  updateWorkerProductivity,
  WorkerProductivityPayload,
} from "@/services/productivity";
import { WorkerProductivityEntry } from "@/types/api";

const schema = z
  .object({
    worker: z.string().min(1, "Worker is required"),
    order: z.string().min(1, "Order is required"),
    production_line: z.string().min(1, "Line is required"),
    date: z.string().min(1, "Date is required"),
    target_qty: z.coerce.number().gt(0, "Target must be greater than zero"),
    actual_qty: z.coerce.number().min(0, "Actual cannot be negative"),
    rework_qty: z.coerce.number().min(0, "Rework cannot be negative"),
    remarks: z.string().optional(),
  })
  .refine((values) => values.rework_qty <= values.actual_qty, {
    message: "Rework cannot exceed actual quantity",
    path: ["rework_qty"],
  });

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;
const todayISO = () => new Date().toISOString().slice(0, 10);

function getProductivityDefaultValues(worker = ""): FormValues {
  return {
    worker,
    order: "",
    production_line: "",
    date: todayISO(),
    target_qty: 0,
    actual_qty: 0,
    rework_qty: 0,
    remarks: "",
  };
}

export default function WorkerProductivityPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const searchParams = useSearchParams();
  const workerFromQuery = searchParams.get("worker") || "";

  const canManage = hasRole("admin", "production_supervisor", "supervisor");
  const canDelete = hasRole("admin");

  const [page, setPage] = useState(1);
  const [workerFilter, setWorkerFilter] = useState(workerFromQuery);
  const [lineFilter, setLineFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingRow, setEditingRow] = useState<WorkerProductivityEntry | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getProductivityDefaultValues(workerFromQuery),
  });

  const workersQuery = useQuery({
    queryKey: ["worker-productivity-workers"],
    queryFn: () => listWorkers({ page: 1, is_active: "true" }),
    enabled: canManage,
  });

  const linesQuery = useQuery({
    queryKey: ["worker-productivity-lines"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canManage,
  });

  const ordersQuery = useQuery({
    queryKey: ["worker-productivity-orders"],
    queryFn: () => listOrders({ page: 1 }),
    enabled: canManage,
  });

  const entriesQuery = useQuery({
    queryKey: ["worker-productivity", page, workerFilter, lineFilter, orderFilter, dateFrom, dateTo],
    queryFn: () =>
      listWorkerProductivity({
        page,
        worker: workerFilter || undefined,
        line: lineFilter || undefined,
        order: orderFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createWorkerProductivity,
    onSuccess: () => {
      toast.success("Productivity entry created");
      queryClient.invalidateQueries({ queryKey: ["worker-productivity"] });
      setEditingRow(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<WorkerProductivityPayload> }) => updateWorkerProductivity(id, payload),
    onSuccess: () => {
      toast.success("Productivity entry updated");
      queryClient.invalidateQueries({ queryKey: ["worker-productivity"] });
      setEditingRow(null);
      reset(getProductivityDefaultValues(workerFilter));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkerProductivity,
    onSuccess: () => {
      toast.success("Productivity entry deleted");
      queryClient.invalidateQueries({ queryKey: ["worker-productivity"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete entry"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: WorkerProductivityPayload = {
      worker: Number(values.worker),
      order: Number(values.order),
      production_line: Number(values.production_line),
      date: values.date,
      target_qty: values.target_qty,
      actual_qty: values.actual_qty,
      rework_qty: values.rework_qty,
      remarks: values.remarks || "",
    };

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
    reset({
      ...getProductivityDefaultValues(values.worker),
      order: values.order,
      production_line: values.production_line,
      date: values.date,
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin and production supervisors can manage worker productivity entries."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingRow ? "Edit Productivity Entry" : "Quick Productivity Entry"}</h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset(getProductivityDefaultValues(workerFilter));
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Worker</label>
            <Select {...register("worker")}>
              <option value="">Select worker</option>
              {workersQuery.data?.results.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.worker_code} - {worker.name}
                </option>
              ))}
            </Select>
            {errors.worker ? <p className="mt-1 text-xs text-red-600">{errors.worker.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Order</label>
            <Select {...register("order")}>
              <option value="">Select order</option>
              {ordersQuery.data?.results.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_code}
                </option>
              ))}
            </Select>
            {errors.order ? <p className="mt-1 text-xs text-red-600">{errors.order.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Line</label>
            <Select {...register("production_line")}>
              <option value="">Select line</option>
              {linesQuery.data?.results.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </Select>
            {errors.production_line ? <p className="mt-1 text-xs text-red-600">{errors.production_line.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <Input type="date" {...register("date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target Qty</label>
            <Input type="number" min={0} {...register("target_qty")} />
            {errors.target_qty ? <p className="mt-1 text-xs text-red-600">{errors.target_qty.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Actual Qty</label>
            <Input type="number" min={0} {...register("actual_qty")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rework Qty</label>
            <Input type="number" min={0} {...register("rework_qty")} />
            {errors.rework_qty ? <p className="mt-1 text-xs text-red-600">{errors.rework_qty.message}</p> : null}
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <Textarea rows={2} {...register("remarks")} />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Entry" : "Save Entry"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-6">
          <Select
            value={workerFilter}
            onChange={(event) => {
              setWorkerFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All workers</option>
            {workersQuery.data?.results.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.worker_code}
              </option>
            ))}
          </Select>
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
            value={orderFilter}
            onChange={(event) => {
              setOrderFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All orders</option>
            {ordersQuery.data?.results.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_code}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              setWorkerFilter("");
              setLineFilter("");
              setOrderFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {entriesQuery.isLoading ? (
          <TableLoadingState />
        ) : entriesQuery.isError ? (
          <ErrorState message="Failed to load productivity entries." onRetry={entriesQuery.refetch} />
        ) : entriesQuery.data && entriesQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Order</th>
                  <th>Line</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Rework</th>
                  <th>Efficiency</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entriesQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.date)}</td>
                    <td className="text-slate-700">{row.worker_code} - {row.worker_name}</td>
                    <td className="text-slate-600">{row.order_code}</td>
                    <td className="text-slate-600">{row.line_name}</td>
                    <td className="text-slate-600">{formatNumber(row.target_qty)}</td>
                    <td className="text-slate-600">{formatNumber(row.actual_qty)}</td>
                    <td className="text-slate-600">{formatNumber(row.rework_qty)}</td>
                    <td>
                      <EfficiencyBadge efficiency={row.efficiency} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingRow(row);
                            reset({
                              worker: String(row.worker),
                              order: String(row.order),
                              production_line: String(row.production_line),
                              date: row.date,
                              target_qty: row.target_qty,
                              actual_qty: row.actual_qty,
                              rework_qty: row.rework_qty,
                              remarks: row.remarks || "",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        {canDelete ? (
                          <ConfirmButton
                            label="Delete"
                            onConfirm={() => deleteMutation.mutate(row.id)}
                            message="Delete this productivity entry?"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={entriesQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No productivity entries" description="Create worker productivity logs for efficiency tracking." />
        )}
      </Card>
    </div>
  );
}
