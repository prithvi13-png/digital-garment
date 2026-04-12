"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { InspectionStageBadge } from "@/components/status-badges/inspection-stage-badge";
import { SeverityBadge } from "@/components/status-badges/severity-badge";
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
import { INSPECTION_STAGE_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import {
  createQualityInspection,
  deleteQualityInspection,
  listDefectTypes,
  listQualityInspections,
  QualityInspectionPayload,
  updateQualityInspection,
} from "@/services/quality";
import { listUsers } from "@/services/users";
import { QualityInspection } from "@/types/api";

const PAGE_SIZE = 20;

const defectRowSchema = z.object({
  defect_type: z.string().min(1, "Defect type is required"),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero"),
  remarks: z.string().optional(),
});

const schema = z
  .object({
    order: z.string().min(1, "Order is required"),
    production_line: z.string().optional(),
    inspector: z.string().optional(),
    inspection_stage: z.enum(["inline", "endline", "final"]),
    date: z.string().min(1, "Date is required"),
    checked_qty: z.coerce.number().gt(0, "Checked quantity must be greater than zero"),
    passed_qty: z.coerce.number().min(0, "Passed quantity cannot be negative"),
    defective_qty: z.coerce.number().min(0, "Defective quantity cannot be negative"),
    rejected_qty: z.coerce.number().min(0, "Rejected quantity cannot be negative"),
    rework_qty: z.coerce.number().min(0, "Rework quantity cannot be negative"),
    remarks: z.string().optional(),
    barcode_value: z.string().optional(),
    defects: z.array(defectRowSchema),
  })
  .refine((values) => values.passed_qty + values.defective_qty <= values.checked_qty, {
    message: "Passed + defective cannot exceed checked quantity",
    path: ["defective_qty"],
  })
  .refine((values) => values.rejected_qty <= values.defective_qty, {
    message: "Rejected quantity cannot exceed defective quantity",
    path: ["rejected_qty"],
  })
  .refine((values) => values.rework_qty <= values.defective_qty, {
    message: "Rework quantity cannot exceed defective quantity",
    path: ["rework_qty"],
  })
  .refine(
    (values) =>
      values.defects.reduce((sum, row) => sum + (Number.isFinite(row.quantity) ? row.quantity : 0), 0) <=
      values.defective_qty,
    {
      message: "Total defect row quantity cannot exceed defective quantity",
      path: ["defects"],
    },
  );

type FormValues = z.infer<typeof schema>;
const todayISO = () => new Date().toISOString().slice(0, 10);

function getInspectionDefaultValues(): FormValues {
  return {
    order: "",
    production_line: "",
    inspector: "",
    inspection_stage: "inline",
    date: todayISO(),
    checked_qty: 0,
    passed_qty: 0,
    defective_qty: 0,
    rejected_qty: 0,
    rework_qty: 0,
    remarks: "",
    barcode_value: "",
    defects: [],
  };
}

export default function QualityInspectionsPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const canManage = hasRole("admin", "quality_inspector");
  const canSelectInspector = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [editingRow, setEditingRow] = useState<QualityInspection | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getInspectionDefaultValues(),
  });

  const defectsArray = useFieldArray({
    control,
    name: "defects",
  });

  const ordersQuery = useQuery({
    queryKey: ["quality-orders"],
    queryFn: () => listOrders({ page: 1 }),
    enabled: canManage,
  });

  const linesQuery = useQuery({
    queryKey: ["quality-lines"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canManage,
  });

  const defectTypesQuery = useQuery({
    queryKey: ["quality-defect-types", "active"],
    queryFn: () => listDefectTypes({ page: 1, is_active: "true" }),
    enabled: canManage,
  });

  const inspectorsQuery = useQuery({
    queryKey: ["quality-inspectors"],
    queryFn: () => listUsers({ page: 1, role: "quality_inspector" }),
    enabled: canManage,
  });

  const inspectionsQuery = useQuery({
    queryKey: [
      "quality-inspections",
      page,
      debouncedSearch,
      dateFrom,
      dateTo,
      orderFilter,
      lineFilter,
      stageFilter,
      inspectorFilter,
    ],
    queryFn: () =>
      listQualityInspections({
        page,
        search: debouncedSearch || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        order: orderFilter || undefined,
        line: lineFilter || undefined,
        inspection_stage: stageFilter || undefined,
        inspector: inspectorFilter || undefined,
      }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createQualityInspection,
    onSuccess: () => {
      toast.success("Inspection created");
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      setEditingRow(null);
      reset(getInspectionDefaultValues());
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create inspection"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<QualityInspectionPayload> }) =>
      updateQualityInspection(id, payload),
    onSuccess: () => {
      toast.success("Inspection updated");
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
      setEditingRow(null);
      reset(getInspectionDefaultValues());
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update inspection"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQualityInspection,
    onSuccess: () => {
      toast.success("Inspection deleted");
      queryClient.invalidateQueries({ queryKey: ["quality-inspections"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete inspection"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: QualityInspectionPayload = {
      order: Number(values.order),
      production_line: values.production_line ? Number(values.production_line) : null,
      inspection_stage: values.inspection_stage,
      date: values.date,
      checked_qty: values.checked_qty,
      passed_qty: values.passed_qty,
      defective_qty: values.defective_qty,
      rejected_qty: values.rejected_qty,
      rework_qty: values.rework_qty,
      remarks: values.remarks || "",
      barcode_value: values.barcode_value || "",
      defects: values.defects.map((row) => ({
        defect_type: Number(row.defect_type),
        quantity: row.quantity,
        remarks: row.remarks || "",
      })),
    };

    if (canSelectInspector && values.inspector) {
      payload.inspector = Number(values.inspector);
    }

    if (editingRow) {
      await updateMutation.mutateAsync({ id: editingRow.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const onEdit = (row: QualityInspection) => {
    setEditingRow(row);
    reset({
      order: String(row.order),
      production_line: row.production_line ? String(row.production_line) : "",
      inspector: row.inspector ? String(row.inspector) : "",
      inspection_stage: row.inspection_stage,
      date: row.date,
      checked_qty: row.checked_qty,
      passed_qty: row.passed_qty,
      defective_qty: row.defective_qty,
      rejected_qty: row.rejected_qty,
      rework_qty: row.rework_qty,
      remarks: row.remarks || "",
      barcode_value: row.barcode_value || "",
      defects: (row.defects || []).map((defect) => ({
        defect_type: String(defect.defect_type),
        quantity: defect.quantity,
        remarks: defect.remarks || "",
      })),
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Access restricted"
        description="Only admin and quality inspector roles can manage quality inspections."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingRow ? "Edit Quality Inspection" : "Create Quality Inspection"}
          </h2>
          {editingRow ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingRow(null);
                reset(getInspectionDefaultValues());
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Line (Optional)</label>
            <Select {...register("production_line")}>
              <option value="">Select line</option>
              {linesQuery.data?.results.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </Select>
          </div>

          {canSelectInspector ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Inspector</label>
              <Select {...register("inspector")}>
                <option value="">Auto (current user)</option>
                {inspectorsQuery.data?.results.map((inspector) => (
                  <option key={inspector.id} value={inspector.id}>
                    {inspector.first_name} {inspector.last_name} ({inspector.username})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Inspection Stage</label>
            <Select {...register("inspection_stage")}>
              {INSPECTION_STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <Input type="date" {...register("date")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Checked Qty</label>
            <Input type="number" min={0} {...register("checked_qty")} />
            {errors.checked_qty ? <p className="mt-1 text-xs text-red-600">{errors.checked_qty.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Passed Qty</label>
            <Input type="number" min={0} {...register("passed_qty")} />
            {errors.passed_qty ? <p className="mt-1 text-xs text-red-600">{errors.passed_qty.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Defective Qty</label>
            <Input type="number" min={0} {...register("defective_qty")} />
            {errors.defective_qty ? <p className="mt-1 text-xs text-red-600">{errors.defective_qty.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rejected Qty</label>
            <Input type="number" min={0} {...register("rejected_qty")} />
            {errors.rejected_qty ? <p className="mt-1 text-xs text-red-600">{errors.rejected_qty.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Rework Qty</label>
            <Input type="number" min={0} {...register("rework_qty")} />
            {errors.rework_qty ? <p className="mt-1 text-xs text-red-600">{errors.rework_qty.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Barcode Value</label>
            <Input {...register("barcode_value")} placeholder="Optional" />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <Textarea rows={2} {...register("remarks")} placeholder="Inspection notes" />
          </div>

          <div className="md:col-span-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Defect Breakdown</label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => defectsArray.append({ defect_type: "", quantity: 1, remarks: "" })}
              >
                Add Defect Row
              </Button>
            </div>

            {defectsArray.fields.length ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {defectsArray.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-5">
                      <Select {...register(`defects.${index}.defect_type`)}>
                        <option value="">Select defect type</option>
                        {defectTypesQuery.data?.results.map((defectType) => (
                          <option key={defectType.id} value={defectType.id}>
                            {defectType.code} - {defectType.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Input type="number" min={1} {...register(`defects.${index}.quantity`)} />
                    </div>
                    <div className="md:col-span-4">
                      <Input {...register(`defects.${index}.remarks`)} placeholder="Remarks" />
                    </div>
                    <div className="md:col-span-1">
                      <Button type="button" variant="danger" onClick={() => defectsArray.remove(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No defect rows added.</p>
            )}
            {errors.defects ? <p className="mt-1 text-xs text-red-600">{errors.defects.message as string}</p> : null}
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={isSubmitting}>
              {editingRow ? "Update Inspection" : "Save Inspection"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quality Inspections</h2>
            <p className="text-sm text-slate-500">Track inline, endline, and final inspection metrics with defect-level details.</p>
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
            <Select
              value={stageFilter}
              onChange={(event) => {
                setStageFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All stages</option>
              {INSPECTION_STAGE_OPTIONS.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
            <Select
              value={inspectorFilter}
              onChange={(event) => {
                setInspectorFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All inspectors</option>
              {inspectorsQuery.data?.results.map((inspector) => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.first_name} {inspector.last_name}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
                setOrderFilter("");
                setLineFilter("");
                setStageFilter("");
                setInspectorFilter("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {inspectionsQuery.isLoading ? (
          <TableLoadingState />
        ) : inspectionsQuery.isError ? (
          <ErrorState message="Failed to load quality inspections." onRetry={inspectionsQuery.refetch} />
        ) : inspectionsQuery.data && inspectionsQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Line</th>
                  <th>Stage</th>
                  <th>Inspector</th>
                  <th>Checked</th>
                  <th>Defective</th>
                  <th>Rejected</th>
                  <th>Defect %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspectionsQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.date)}</td>
                    <td className="font-medium text-slate-800">{row.order_code || `#${row.order}`}</td>
                    <td className="text-slate-600">{row.line_name || "-"}</td>
                    <td>
                      <InspectionStageBadge stage={row.inspection_stage} />
                    </td>
                    <td className="text-slate-600">{row.inspector_name || "-"}</td>
                    <td className="text-slate-700">{formatNumber(row.checked_qty)}</td>
                    <td className="text-amber-700">{formatNumber(row.defective_qty)}</td>
                    <td className="text-red-700">{formatNumber(row.rejected_qty)}</td>
                    <td className="font-medium text-slate-700">{formatPercent(row.defect_rate)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/quality-inspections/${row.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                        <Button variant="secondary" onClick={() => onEdit(row)}>
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          message={`Delete quality inspection #${row.id}?`}
                          onConfirm={() => deleteMutation.mutate(row.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <Pagination page={page} pageSize={PAGE_SIZE} total={inspectionsQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No inspections yet"
            description="Create quality inspections to monitor defect and rejection trends by stage."
          />
        )}
      </Card>

      {editingRow?.defects?.length ? (
        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Current Defect Breakdown</h3>
          <DataTable>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th>Defect</th>
                <th>Severity</th>
                <th>Quantity</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingRow.defects.map((defect, idx) => (
                <tr key={`${editingRow.id}-${defect.defect_type}-${idx}`}>
                  <td className="font-medium text-slate-800">{defect.defect_code || defect.defect_name || "-"}</td>
                  <td>{defect.severity ? <SeverityBadge severity={defect.severity} /> : "-"}</td>
                  <td>{formatNumber(defect.quantity)}</td>
                  <td className="text-slate-600">{defect.remarks || "-"}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      ) : null}
    </div>
  );
}
