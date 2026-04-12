"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
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
  createMaterialInward,
  deleteMaterialInward,
  listMaterialInward,
  MaterialInwardPayload,
  updateMaterialInward,
  listMaterials,
} from "@/services/inventory";
import { MaterialStockInward } from "@/types/api";

const schema = z.object({
  material: z.string().min(1, "Material is required"),
  batch_no: z.string().optional(),
  roll_no: z.string().optional(),
  inward_date: z.string().min(1, "Inward date is required"),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero"),
  rate: z.coerce.number().min(0, "Rate cannot be negative").optional(),
  supplier_name: z.string().optional(),
  barcode_value: z.string().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;
const todayISO = () => new Date().toISOString().slice(0, 10);

function getInwardDefaultValues(material = ""): FormValues {
  return {
    material,
    inward_date: todayISO(),
    quantity: 0,
    rate: 0,
    batch_no: "",
    roll_no: "",
    supplier_name: "",
    barcode_value: "",
    remarks: "",
  };
}

export default function MaterialInwardPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const searchParams = useSearchParams();
  const materialFromQuery = searchParams.get("material") || "";

  const canManage = hasRole("admin", "store_manager");

  const [page, setPage] = useState(1);
  const [materialFilter, setMaterialFilter] = useState(materialFromQuery);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [editingRow, setEditingRow] = useState<MaterialStockInward | null>(null);
  const debouncedSupplierFilter = useDebouncedValue(supplierFilter);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getInwardDefaultValues(materialFromQuery),
  });

  const materialsQuery = useQuery({
    queryKey: ["materials-for-inward"],
    queryFn: () => listMaterials({ page: 1 }),
    enabled: canManage,
  });

  const inwardQuery = useQuery({
    queryKey: ["material-inward", page, materialFilter, dateFrom, dateTo, debouncedSupplierFilter],
    queryFn: () =>
      listMaterialInward({
        page,
        material: materialFilter || undefined,
        inward_date_from: dateFrom || undefined,
        inward_date_to: dateTo || undefined,
        supplier: debouncedSupplierFilter || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createMaterialInward,
    onSuccess: () => {
      toast.success("Inward entry created");
      queryClient.invalidateQueries({ queryKey: ["material-inward"] });
      setEditingRow(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create inward entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<MaterialInwardPayload> }) => updateMaterialInward(id, payload),
    onSuccess: () => {
      toast.success("Inward entry updated");
      queryClient.invalidateQueries({ queryKey: ["material-inward"] });
      setEditingRow(null);
      reset(getInwardDefaultValues(materialFilter));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update inward entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterialInward,
    onSuccess: () => {
      toast.success("Inward entry deleted");
      queryClient.invalidateQueries({ queryKey: ["material-inward"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete inward entry"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: MaterialInwardPayload = {
      material: Number(values.material),
      batch_no: values.batch_no || "",
      roll_no: values.roll_no || "",
      inward_date: values.inward_date,
      quantity: values.quantity,
      rate: values.rate || undefined,
      supplier_name: values.supplier_name || "",
      barcode_value: values.barcode_value || "",
      remarks: values.remarks || "",
    };

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
    reset({
      ...getInwardDefaultValues(values.material),
      inward_date: values.inward_date,
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Store/Admin access required"
        description="Only admin and store manager roles can manage inward transactions."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingRow ? "Edit Inward Entry" : "Create Inward Entry"}</h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset(getInwardDefaultValues(materialFilter));
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Inward Date</label>
            <Input type="date" {...register("inward_date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
            <Input type="number" step="0.001" min={0} {...register("quantity")} />
            {errors.quantity ? <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rate</label>
            <Input type="number" step="0.01" min={0} {...register("rate")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Supplier Name</label>
            <Input {...register("supplier_name")} placeholder="Supplier" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Barcode Value</label>
            <Input {...register("barcode_value")} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Batch No</label>
            <Input {...register("batch_no")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Roll No</label>
            <Input {...register("roll_no")} />
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <Textarea rows={2} {...register("remarks")} />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Inward Entry" : "Create Inward Entry"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
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
          <Input
            value={supplierFilter}
            onChange={(event) => {
              setSupplierFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Filter supplier"
          />
        </div>

        {inwardQuery.isLoading ? (
          <TableLoadingState />
        ) : inwardQuery.isError ? (
          <ErrorState message="Failed to load inward entries." onRetry={inwardQuery.refetch} />
        ) : inwardQuery.data && inwardQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Supplier</th>
                  <th>Batch / Roll</th>
                  <th>Created By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inwardQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.inward_date)}</td>
                    <td className="font-semibold text-slate-800">
                      {row.material_detail?.code} - {row.material_detail?.name}
                    </td>
                    <td className="text-slate-700">{formatNumber(row.quantity)}</td>
                    <td className="text-slate-600">{row.rate ? formatNumber(row.rate) : "-"}</td>
                    <td className="text-slate-600">{row.supplier_name || "-"}</td>
                    <td className="text-slate-600">{row.batch_no || "-"} / {row.roll_no || "-"}</td>
                    <td className="text-slate-600">{row.created_by_detail?.username || "-"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingRow(row);
                            reset({
                              material: String(row.material),
                              batch_no: row.batch_no || "",
                              roll_no: row.roll_no || "",
                              inward_date: row.inward_date,
                              quantity: Number(row.quantity),
                              rate: row.rate ? Number(row.rate) : 0,
                              supplier_name: row.supplier_name || "",
                              barcode_value: row.barcode_value || "",
                              remarks: row.remarks || "",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          onConfirm={() => deleteMutation.mutate(row.id)}
                          message="Delete this inward entry?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={inwardQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No inward entries"
            description="Record inward transactions to maintain correct stock levels."
          />
        )}
      </Card>
    </div>
  );
}
