"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/components/auth/auth-provider";
import { StageBadge } from "@/components/status-badges/stage-badge";
import { StatusBadge } from "@/components/status-badges/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { STAGE_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { getOrder, getOrderProductionSummary, listOrderProductionEntries, updateOrder } from "@/services/orders";

const STAGE_SEQUENCE = ["cutting", "stitching", "qc", "packing", "dispatch"] as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin");

  const orderId = Number(params.id);

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId),
    enabled: Number.isFinite(orderId),
  });

  const summaryQuery = useQuery({
    queryKey: ["order-summary", orderId],
    queryFn: () => getOrderProductionSummary(orderId),
    enabled: Number.isFinite(orderId),
  });

  const entriesQuery = useQuery({
    queryKey: ["order-entries", orderId],
    queryFn: () => listOrderProductionEntries(orderId),
    enabled: Number.isFinite(orderId),
  });

  const stageMutation = useMutation({
    mutationFn: (stage: string) => updateOrder(orderId, { current_stage: stage as never }),
    onSuccess: () => {
      toast.success("Order stage updated");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-summary", orderId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update stage"),
  });

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-3 h-5 w-72" />
        </Card>
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState message="Unable to load order details." onRetry={orderQuery.refetch} />;
  }

  const order = orderQuery.data;
  const summary = summaryQuery.data?.summary;
  const currentStageIndex = STAGE_SEQUENCE.indexOf(order.current_stage);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{order.order_code}</h2>
          <p className="text-sm text-slate-500">
            {order.style_name} • {order.buyer_detail?.company_name || "-"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/orders")}>
            Back to Orders
          </Button>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Order Overview</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Buyer</p>
            <p className="font-semibold text-slate-800">{order.buyer_detail?.company_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Quantity</p>
            <p className="font-semibold text-slate-800">{formatNumber(order.quantity)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Delivery Date</p>
            <p className="font-semibold text-slate-800">{formatDate(order.delivery_date)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Priority</p>
            <p className="font-semibold capitalize text-slate-800">{order.priority}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">Stage Progression</p>
          <div className="grid gap-2 md:grid-cols-5">
            {STAGE_SEQUENCE.map((stage, index) => {
              const active = index <= currentStageIndex;
              return (
                <div
                  key={stage}
                  className={`rounded-xl border px-3 py-2 text-center text-sm font-medium ${
                    active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {stage.toUpperCase()}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <StageBadge stage={order.current_stage} />
            {canEdit ? (
              <Select
                defaultValue={order.current_stage}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next !== order.current_stage) {
                    stageMutation.mutate(next);
                  }
                }}
                className="max-w-[220px]"
              >
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Target</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary?.total_target_qty)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Produced</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary?.total_produced_qty)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Rejected</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary?.total_rejected_qty)}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Related Production Entries</h3>
        {entriesQuery.data?.results?.length ? (
          <DataTable>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Line</th>
                <th className="px-4 py-3">Supervisor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Produced</th>
                <th className="px-4 py-3">Rejected</th>
                <th className="px-4 py-3">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entriesQuery.data.results.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.production_line_detail?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.supervisor_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNumber(entry.target_qty)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNumber(entry.produced_qty)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNumber(entry.rejected_qty)}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No production entries yet"
            description="Supervisors can start logging daily production against this order."
          />
        )}
      </Card>
    </div>
  );
}
