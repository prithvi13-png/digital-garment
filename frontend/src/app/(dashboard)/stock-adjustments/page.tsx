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
import { ADJUSTMENT_TYPE_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  createStockAdjustment,
  deleteStockAdjustment,
  listMaterials,
  listStockAdjustments,
  StockAdjustmentPayload,
  updateStockAdjustment,
} from "@/services/inventory";
import { StockAdjustment } from "@/types/api";

const schema = z.object({
  material: z.string().min(1, "Material is required"),
  adjustment_date: z.string().min(1, "Adjustment date is required"),
  adjustment_type: z.enum(["increase", "decrease"]),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero"),
  reason: z.string().min(1, "Reason is required"),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;
const todayISO = () => new Date().toISOString().slice(0, 10);

function getAdjustmentDefaultValues(material = ""): FormValues {
  return {
    material,
    adjustment_date: todayISO(),
    adjustment_type: "increase",
    quantity: 0,
    reason: "",
  };
}

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin", "store_manager");

  const [page, setPage] = useState(1);
  const [materialFilter, setMaterialFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingRow, setEditingRow] = useState<StockAdjustment | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getAdjustmentDefaultValues(),
  });

  const materialsQuery = useQuery({
    queryKey: ["materials-for-adjustments"],
    queryFn: () => listMaterials({ page: 1 }),
    enabled: canManage,
  });

  const adjustmentsQuery = useQuery({
    queryKey: ["stock-adjustments", page, materialFilter, typeFilter, dateFrom, dateTo],
    queryFn: () =>
      listStockAdjustments({
        page,
        material: materialFilter || undefined,
        adjustment_type: typeFilter || undefined,
        adjustment_date_from: dateFrom || undefined,
        adjustment_date_to: dateTo || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: () => {
      toast.success("Stock adjustment created");
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      setEditingRow(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create adjustment"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<StockAdjustmentPayload> }) => updateStockAdjustment(id, payload),
    onSuccess: () => {
      toast.success("Stock adjustment updated");
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
      setEditingRow(null);
      reset(getAdjustmentDefaultValues());
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update adjustment"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStockAdjustment,
    onSuccess: () => {
      toast.success("Stock adjustment deleted");
      queryClient.invalidateQueries({ queryKey: ["stock-adjustments"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete adjustment"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: StockAdjustmentPayload = {
      material: Number(values.material),
      adjustment_date: values.adjustment_date,
      adjustment_type: values.adjustment_type,
      quantity: values.quantity,
      reason: values.reason,
    };

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
    reset({
      ...getAdjustmentDefaultValues(values.material),
      adjustment_date: values.adjustment_date,
      adjustment_type: values.adjustment_type,
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Store/Admin access required"
        description="Only admin and store manager roles can manage stock adjustments."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingRow ? "Edit Stock Adjustment" : "Create Stock Adjustment"}</h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset(getAdjustmentDefaultValues());
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Material</label>
            <Select {...register("material")}>
              <option value="">Select material</option>
              {materialsQuery.data?.results.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.code} - {material.name}
                </option>
              ))}
            </Select>
            {errors.material ? <p className="mt-1 text-xs text-red-600">{errors.material.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Adjustment Date</label>
            <Input type="date" {...register("adjustment_date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Adjustment Type</label>
            <Select {...register("adjustment_type")}>
              {ADJUSTMENT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
            <Input type="number" step="0.001" min={0} {...register("quantity")} />
            {errors.quantity ? <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p> : null}
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
            <Textarea rows={2} {...register("reason")} />
            {errors.reason ? <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p> : null}
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Adjustment" : "Create Adjustment"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <Select
            value={materialFilter}
            onChange={(event) => {
              setMaterialFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All materials</option>
            {materialsQuery.data?.results.map((material) => (
              <option key={material.id} value={material.id}>
                {material.code}
              </option>
            ))}
          </Select>
          <Select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {ADJUSTMENT_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
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
              setMaterialFilter("");
              setTypeFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {adjustmentsQuery.isLoading ? (
          <TableLoadingState />
        ) : adjustmentsQuery.isError ? (
          <ErrorState message="Failed to load stock adjustments." onRetry={adjustmentsQuery.refetch} />
        ) : adjustmentsQuery.data && adjustmentsQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Material</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustmentsQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.adjustment_date)}</td>
                    <td className="font-semibold text-slate-800">
                      {row.material_detail?.code} - {row.material_detail?.name}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.adjustment_type === "increase" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {row.adjustment_type === "increase" ? "Increase" : "Decrease"}
                      </span>
                    </td>
                    <td className="text-slate-700">{formatNumber(row.quantity)}</td>
                    <td className="max-w-[320px] truncate text-slate-600" title={row.reason}>{row.reason}</td>
                    <td className="text-slate-600">{row.created_by_detail?.username || "-"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingRow(row);
                            reset({
                              material: String(row.material),
                              adjustment_date: row.adjustment_date,
                              adjustment_type: row.adjustment_type,
                              quantity: Number(row.quantity),
                              reason: row.reason,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          onConfirm={() => deleteMutation.mutate(row.id)}
                          message="Delete this stock adjustment?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={adjustmentsQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No adjustments found"
            description="Create stock adjustments for corrections, damages, or audit differences."
          />
        )}
      </Card>
    </div>
  );
}
