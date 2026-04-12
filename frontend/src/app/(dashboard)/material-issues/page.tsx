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
import { formatDate, formatNumber } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import {
  createMaterialIssue,
  deleteMaterialIssue,
  listMaterialIssues,
  listMaterials,
  MaterialIssuePayload,
  updateMaterialIssue,
} from "@/services/inventory";
import { MaterialStockIssue } from "@/types/api";

const schema = z.object({
  material: z.string().min(1, "Material is required"),
  order: z.string().optional(),
  production_line: z.string().optional(),
  issue_date: z.string().min(1, "Issue date is required"),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero"),
  issued_to: z.string().optional(),
  barcode_value: z.string().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;
const todayISO = () => new Date().toISOString().slice(0, 10);

function getIssueDefaultValues(material = ""): FormValues {
  return {
    material,
    order: "",
    production_line: "",
    issue_date: todayISO(),
    quantity: 0,
    issued_to: "",
    barcode_value: "",
    remarks: "",
  };
}

export default function MaterialIssuesPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const searchParams = useSearchParams();
  const materialFromQuery = searchParams.get("material") || "";

  const canManage = hasRole("admin", "store_manager", "production_supervisor", "supervisor");
  const canDelete = hasRole("admin", "store_manager");

  const [page, setPage] = useState(1);
  const [materialFilter, setMaterialFilter] = useState(materialFromQuery);
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingRow, setEditingRow] = useState<MaterialStockIssue | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getIssueDefaultValues(materialFromQuery),
  });

  const materialsQuery = useQuery({
    queryKey: ["materials-for-issue"],
    queryFn: () => listMaterials({ page: 1 }),
    enabled: canManage,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders-for-issue"],
    queryFn: () => listOrders({ page: 1 }),
    enabled: canManage,
  });

  const linesQuery = useQuery({
    queryKey: ["lines-for-issue"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canManage,
  });

  const issuesQuery = useQuery({
    queryKey: ["material-issues", page, materialFilter, orderFilter, lineFilter, dateFrom, dateTo],
    queryFn: () =>
      listMaterialIssues({
        page,
        material: materialFilter || undefined,
        order: orderFilter || undefined,
        line: lineFilter || undefined,
        issue_date_from: dateFrom || undefined,
        issue_date_to: dateTo || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createMaterialIssue,
    onSuccess: () => {
      toast.success("Material issue created");
      queryClient.invalidateQueries({ queryKey: ["material-issues"] });
      setEditingRow(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create issue entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<MaterialIssuePayload> }) => updateMaterialIssue(id, payload),
    onSuccess: () => {
      toast.success("Material issue updated");
      queryClient.invalidateQueries({ queryKey: ["material-issues"] });
      setEditingRow(null);
      reset(getIssueDefaultValues(materialFilter));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update issue entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterialIssue,
    onSuccess: () => {
      toast.success("Material issue deleted");
      queryClient.invalidateQueries({ queryKey: ["material-issues"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete issue entry"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: MaterialIssuePayload = {
      material: Number(values.material),
      order: values.order ? Number(values.order) : null,
      production_line: values.production_line ? Number(values.production_line) : null,
      issue_date: values.issue_date,
      quantity: values.quantity,
      issued_to: values.issued_to || "",
      barcode_value: values.barcode_value || "",
      remarks: values.remarks || "",
    };

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
    reset({
      ...getIssueDefaultValues(values.material),
      order: values.order,
      production_line: values.production_line,
      issue_date: values.issue_date,
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin, store manager, and production supervisors can manage issue transactions."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingRow ? "Edit Material Issue" : "Create Material Issue"}</h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset(getIssueDefaultValues(materialFilter));
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-4">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Order (optional)</label>
            <Select {...register("order")}>
              <option value="">Unassigned</option>
              {ordersQuery.data?.results.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_code}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Line (optional)</label>
            <Select {...register("production_line")}>
              <option value="">Unassigned</option>
              {linesQuery.data?.results.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Issue Date</label>
            <Input type="date" {...register("issue_date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
            <Input type="number" step="0.001" min={0} {...register("quantity")} />
            {errors.quantity ? <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Issued To</label>
            <Input {...register("issued_to")} placeholder="Line/Person" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Barcode Value</label>
            <Input {...register("barcode_value")} placeholder="Optional" />
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <Textarea rows={2} {...register("remarks")} />
          </div>
          <div className="md:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Issue Entry" : "Create Issue Entry"}
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
        </div>

        {issuesQuery.isLoading ? (
          <TableLoadingState />
        ) : issuesQuery.isError ? (
          <ErrorState message="Failed to load issue entries." onRetry={issuesQuery.refetch} />
        ) : issuesQuery.data && issuesQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Material</th>
                  <th>Order</th>
                  <th>Line</th>
                  <th>Quantity</th>
                  <th>Issued To</th>
                  <th>Created By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issuesQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.issue_date)}</td>
                    <td className="font-semibold text-slate-800">
                      {row.material_detail?.code} - {row.material_detail?.name}
                    </td>
                    <td className="text-slate-600">{row.order_code || "-"}</td>
                    <td className="text-slate-600">{row.line_name || "-"}</td>
                    <td className="text-slate-700">{formatNumber(row.quantity)}</td>
                    <td className="text-slate-600">{row.issued_to || "-"}</td>
                    <td className="text-slate-600">{row.created_by_detail?.username || "-"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingRow(row);
                            reset({
                              material: String(row.material),
                              order: row.order ? String(row.order) : "",
                              production_line: row.production_line ? String(row.production_line) : "",
                              issue_date: row.issue_date,
                              quantity: Number(row.quantity),
                              issued_to: row.issued_to || "",
                              barcode_value: row.barcode_value || "",
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
                            message="Delete this issue entry?"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={issuesQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No issue entries"
            description="Record material issues against orders or lines to track actual consumption."
          />
        )}
      </Card>
    </div>
  );
}
