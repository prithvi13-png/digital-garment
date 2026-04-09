"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNumber } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import {
  createProductionEntry,
  deleteProductionEntry,
  listProductionEntries,
  updateProductionEntry,
} from "@/services/production";
import { listUsers } from "@/services/users";
import { ProductionEntry } from "@/types/api";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  production_line: z.string().min(1, "Production line is required"),
  supervisor: z.string().optional(),
  order: z.string().min(1, "Order is required"),
  target_qty: z.coerce.number().min(0, "Target cannot be negative"),
  produced_qty: z.coerce.number().min(0, "Produced cannot be negative"),
  rejected_qty: z.coerce.number().min(0, "Rejected cannot be negative"),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function ProductionEntriesPage() {
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();

  const canAccessPage = hasRole("admin", "supervisor");
  const canWrite = canAccessPage;
  const canDelete = hasRole("admin");
  const canChooseSupervisor = hasRole("admin");

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState("");
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: today,
      target_qty: 0,
      produced_qty: 0,
      rejected_qty: 0,
    },
  });

  const linesQuery = useQuery({
    queryKey: ["lines-select"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canAccessPage,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders-select"],
    queryFn: () => listOrders({ page: 1 }),
    enabled: canAccessPage,
  });

  const supervisorsQuery = useQuery({
    queryKey: ["supervisors-select"],
    queryFn: () => listUsers({ page: 1, role: "supervisor" }),
    enabled: canChooseSupervisor,
  });

  const entriesQuery = useQuery({
    queryKey: ["production-entries", page, dateFrom, dateTo, lineFilter, orderFilter, supervisorFilter],
    queryFn: () =>
      listProductionEntries({
        page,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        production_line: lineFilter || undefined,
        order: orderFilter || undefined,
        supervisor: supervisorFilter || undefined,
      }),
    enabled: canAccessPage,
  });

  const createMutation = useMutation({
    mutationFn: createProductionEntry,
    onSuccess: () => {
      toast.success("Production entry added");
      queryClient.invalidateQueries({ queryKey: ["production-entries"] });
      setEditingEntry(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateProductionEntry>[1] }) =>
      updateProductionEntry(id, payload),
    onSuccess: () => {
      toast.success("Production entry updated");
      queryClient.invalidateQueries({ queryKey: ["production-entries"] });
      setEditingEntry(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductionEntry,
    onSuccess: () => {
      toast.success("Production entry deleted");
      queryClient.invalidateQueries({ queryKey: ["production-entries"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete entry"),
  });

  const orderOptions = useMemo(() => ordersQuery.data?.results ?? [], [ordersQuery.data]);
  const lineOptions = useMemo(() => linesQuery.data?.results ?? [], [linesQuery.data]);
  const supervisorOptions = useMemo(() => supervisorsQuery.data?.results ?? [], [supervisorsQuery.data]);

  const onSubmit = async (values: FormValues) => {
    if (values.rejected_qty > values.produced_qty) {
      toast.error("Rejected quantity cannot exceed produced quantity");
      return;
    }

    const supervisorId = canChooseSupervisor ? Number(values.supervisor) : user?.id;
    if (!supervisorId) {
      toast.error("Supervisor is required");
      return;
    }

    const payload = {
      date: values.date,
      production_line: Number(values.production_line),
      supervisor: supervisorId,
      order: Number(values.order),
      target_qty: values.target_qty,
      produced_qty: values.produced_qty,
      rejected_qty: values.rejected_qty,
      remarks: values.remarks || "",
    };

    if (editingEntry) {
      await updateMutation.mutateAsync({ id: editingEntry.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
      reset({
        date: values.date,
        production_line: values.production_line,
        supervisor: values.supervisor,
        order: values.order,
        target_qty: 0,
        produced_qty: 0,
        rejected_qty: 0,
        remarks: "",
      });
    }
  };

  const onEdit = (entry: ProductionEntry) => {
    setEditingEntry(entry);
    reset({
      date: entry.date,
      production_line: String(entry.production_line),
      supervisor: String(entry.supervisor),
      order: String(entry.order),
      target_qty: entry.target_qty,
      produced_qty: entry.produced_qty,
      rejected_qty: entry.rejected_qty,
      remarks: entry.remarks || "",
    });
  };

  if (!canAccessPage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin and supervisor roles can access production entry screens."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingEntry ? "Edit Production Entry" : "Quick Production Entry"}
          </h2>
          {editingEntry ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingEntry(null);
                reset({
                  date: today,
                  production_line: "",
                  supervisor: canChooseSupervisor ? "" : String(user?.id || ""),
                  order: "",
                  target_qty: 0,
                  produced_qty: 0,
                  rejected_qty: 0,
                  remarks: "",
                });
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <Input type="date" {...register("date")} />
            {errors.date ? <p className="mt-1 text-xs text-red-600">{errors.date.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Line</label>
            <Select {...register("production_line")}>
              <option value="">Select line</option>
              {lineOptions.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </Select>
            {errors.production_line ? <p className="mt-1 text-xs text-red-600">{errors.production_line.message}</p> : null}
          </div>

          {canChooseSupervisor ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supervisor</label>
              <Select {...register("supervisor")}>
                <option value="">Select supervisor</option>
                {supervisorOptions.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.first_name} {sup.last_name} ({sup.username})
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supervisor</label>
              <Input value={user?.username || "-"} disabled readOnly />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Order</label>
            <Select {...register("order")}>
              <option value="">Select order</option>
              {orderOptions.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_code} - {order.style_name}
                </option>
              ))}
            </Select>
            {errors.order ? <p className="mt-1 text-xs text-red-600">{errors.order.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target Qty</label>
            <Input type="number" min={0} {...register("target_qty")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Produced Qty</label>
            <Input type="number" min={0} {...register("produced_qty")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rejected Qty</label>
            <Input type="number" min={0} {...register("rejected_qty")} />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <Textarea rows={2} {...register("remarks")} />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {editingEntry ? "Update Entry" : "Save Entry"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date from</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date to</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Line</label>
            <Select
              value={lineFilter}
              onChange={(e) => {
                setLineFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All lines</option>
              {lineOptions.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Order</label>
            <Select
              value={orderFilter}
              onChange={(e) => {
                setOrderFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All orders</option>
              {orderOptions.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_code}
                </option>
              ))}
            </Select>
          </div>
          {canChooseSupervisor ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Supervisor</label>
              <Select
                value={supervisorFilter}
                onChange={(e) => {
                  setSupervisorFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All supervisors</option>
                {supervisorOptions.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.username}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <Button
            variant="secondary"
            className="self-end"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setLineFilter("");
              setOrderFilter("");
              setSupervisorFilter("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {entriesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : entriesQuery.isError ? (
          <ErrorState message="Failed to load production entries." onRetry={entriesQuery.refetch} />
        ) : entriesQuery.data && entriesQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Produced</th>
                  <th className="px-4 py-3">Rejected</th>
                  <th className="px-4 py-3">Efficiency</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entriesQuery.data.results.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.order_detail?.order_code || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.production_line_detail?.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.supervisor_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(entry.target_qty)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(entry.produced_qty)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(entry.rejected_qty)}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.efficiency}%</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canWrite ? (
                          <Button variant="secondary" onClick={() => onEdit(entry)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <ConfirmButton
                            label="Delete"
                            onConfirm={() => deleteMutation.mutate(entry.id)}
                            message={`Delete entry #${entry.id}?`}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={entriesQuery.data.count}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            title="No production entries"
            description="Use the quick form above to log daily line production."
          />
        )}
      </Card>
    </div>
  );
}
