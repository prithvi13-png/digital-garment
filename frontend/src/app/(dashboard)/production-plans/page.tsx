"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { DataTable } from "@/components/ui/table";
import { TableLoadingState } from "@/components/ui/table-loading-state";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  createProductionPlan,
  deleteProductionPlan,
  listProductionPlans,
  ProductionPlanFilters,
  ProductionPlanPayload,
  updateProductionPlan,
} from "@/services/planning";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { ProductionPlan } from "@/types/api";

const PAGE_SIZE = 20;

const schema = z
  .object({
    order: z.string().min(1, "Order is required"),
    production_line: z.string().min(1, "Line is required"),
    planned_start_date: z.string().min(1, "Start date is required"),
    planned_end_date: z.string().min(1, "End date is required"),
    planned_daily_target: z.coerce.number().gt(0, "Daily target must be greater than zero"),
    planned_total_qty: z.coerce.number().gt(0, "Planned total quantity must be greater than zero"),
    remarks: z.string().optional(),
  })
  .refine((values) => values.planned_start_date <= values.planned_end_date, {
    message: "End date must be after or equal to start date",
    path: ["planned_end_date"],
  });

type FormValues = z.infer<typeof schema>;
const todayISO = () => new Date().toISOString().slice(0, 10);

function getPlanDefaultValues(): FormValues {
  return {
    order: "",
    production_line: "",
    planned_start_date: todayISO(),
    planned_end_date: todayISO(),
    planned_daily_target: 0,
    planned_total_qty: 0,
    remarks: "",
  };
}

function planWindowLabel(start: string, end: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (end < today) {
    return "Closed";
  }
  if (start > today) {
    return "Upcoming";
  }
  return "Active";
}

export default function ProductionPlansPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const canManage = hasRole("admin", "planner", "production_supervisor", "supervisor");
  const canDelete = hasRole("admin", "planner");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");
  const [editingRow, setEditingRow] = useState<ProductionPlan | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getPlanDefaultValues(),
  });

  const ordersQuery = useQuery({
    queryKey: ["planning-orders"],
    queryFn: () => listOrders({ page: 1 }),
    enabled: canManage,
  });

  const linesQuery = useQuery({
    queryKey: ["planning-lines"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canManage,
  });

  const filters: ProductionPlanFilters = {
    page,
    search: debouncedSearch || undefined,
    order: orderFilter || undefined,
    line: lineFilter || undefined,
    start_date_from: startFrom || undefined,
    start_date_to: startTo || undefined,
    end_date_from: endFrom || undefined,
    end_date_to: endTo || undefined,
  };

  const plansQuery = useQuery({
    queryKey: ["production-plans", filters],
    queryFn: () => listProductionPlans(filters),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createProductionPlan,
    onSuccess: () => {
      toast.success("Production plan created");
      queryClient.invalidateQueries({ queryKey: ["production-plans"] });
      setEditingRow(null);
      reset(getPlanDefaultValues());
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create plan"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProductionPlanPayload> }) =>
      updateProductionPlan(id, payload),
    onSuccess: () => {
      toast.success("Production plan updated");
      queryClient.invalidateQueries({ queryKey: ["production-plans"] });
      setEditingRow(null);
      reset(getPlanDefaultValues());
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update plan"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductionPlan,
    onSuccess: () => {
      toast.success("Production plan deleted");
      queryClient.invalidateQueries({ queryKey: ["production-plans"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete plan"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: ProductionPlanPayload = {
      order: Number(values.order),
      production_line: Number(values.production_line),
      planned_start_date: values.planned_start_date,
      planned_end_date: values.planned_end_date,
      planned_daily_target: values.planned_daily_target,
      planned_total_qty: values.planned_total_qty,
      remarks: values.remarks || "",
    };

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const onEdit = (row: ProductionPlan) => {
    setEditingRow(row);
    reset({
      order: String(row.order),
      production_line: String(row.production_line),
      planned_start_date: row.planned_start_date,
      planned_end_date: row.planned_end_date,
      planned_daily_target: row.planned_daily_target,
      planned_total_qty: row.planned_total_qty,
      remarks: row.remarks || "",
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin, planner, and production supervisors can manage production plans."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{editingRow ? "Edit Production Plan" : "Create Production Plan"}</h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset(getPlanDefaultValues());
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-4">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Production Line</label>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Planned Start Date</label>
            <Input type="date" {...register("planned_start_date")} />
            {errors.planned_start_date ? <p className="mt-1 text-xs text-red-600">{errors.planned_start_date.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Planned End Date</label>
            <Input type="date" {...register("planned_end_date")} />
            {errors.planned_end_date ? <p className="mt-1 text-xs text-red-600">{errors.planned_end_date.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Daily Target</label>
            <Input type="number" min={1} {...register("planned_daily_target")} />
            {errors.planned_daily_target ? <p className="mt-1 text-xs text-red-600">{errors.planned_daily_target.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Planned Total Qty</label>
            <Input type="number" min={1} {...register("planned_total_qty")} />
            {errors.planned_total_qty ? <p className="mt-1 text-xs text-red-600">{errors.planned_total_qty.message}</p> : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <Textarea rows={2} {...register("remarks")} placeholder="Plan notes" />
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Production Plans</h2>
            <p className="text-sm text-slate-500">Line allocation and planned output windows for orders.</p>
          </div>

          <div className="grid w-full gap-3 md:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search order/line/remarks"
            />
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
            <Input
              type="date"
              value={startFrom}
              onChange={(event) => {
                setStartFrom(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={startTo}
              onChange={(event) => {
                setStartTo(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={endFrom}
              onChange={(event) => {
                setEndFrom(event.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={endTo}
              onChange={(event) => {
                setEndTo(event.target.value);
                setPage(1);
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setOrderFilter("");
                setLineFilter("");
                setStartFrom("");
                setStartTo("");
                setEndFrom("");
                setEndTo("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {plansQuery.isLoading ? (
          <TableLoadingState />
        ) : plansQuery.isError ? (
          <ErrorState message="Failed to load production plans." onRetry={plansQuery.refetch} />
        ) : plansQuery.data && plansQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Order</th>
                  <th>Line</th>
                  <th>Plan Window</th>
                  <th>Daily Target</th>
                  <th>Total Qty</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plansQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{row.order_code || `#${row.order}`}</td>
                    <td className="text-slate-600">{row.line_name || row.production_line}</td>
                    <td>
                      <p className="text-slate-700">
                        {formatDate(row.planned_start_date)} - {formatDate(row.planned_end_date)}
                      </p>
                      <p className="text-xs text-slate-500">{planWindowLabel(row.planned_start_date, row.planned_end_date)}</p>
                    </td>
                    <td className="text-slate-700">{formatNumber(row.planned_daily_target)}</td>
                    <td className="font-semibold text-slate-800">{formatNumber(row.planned_total_qty)}</td>
                    <td className="text-slate-600">
                      {row.created_by_detail
                        ? `${row.created_by_detail.first_name} ${row.created_by_detail.last_name}`.trim() || row.created_by_detail.username
                        : "-"}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => onEdit(row)}>
                          Edit
                        </Button>
                        {canDelete ? (
                          <ConfirmButton
                            label="Delete"
                            message={`Delete plan #${row.id} for ${row.order_code || row.order}?`}
                            onConfirm={() => deleteMutation.mutate(row.id)}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <Pagination page={page} pageSize={PAGE_SIZE} total={plansQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No production plans"
            description="Create production plans to allocate line capacity and track plan commitments."
          />
        )}
      </Card>
    </div>
  );
}
