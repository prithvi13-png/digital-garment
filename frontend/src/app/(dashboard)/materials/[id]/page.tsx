"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { StockBadge } from "@/components/status-badges/stock-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";
import { getMaterial, getMaterialMovements } from "@/services/inventory";

const PAGE_SIZE = 20;

function movementLabel(movementType: string) {
  if (movementType === "inward") return "Inward";
  if (movementType === "issue") return "Issue";
  if (movementType === "adjustment_increase") return "Adjustment +";
  if (movementType === "adjustment_decrease") return "Adjustment -";
  return movementType;
}

function movementClass(movementType: string) {
  if (movementType === "inward" || movementType === "adjustment_increase") return "bg-emerald-100 text-emerald-700";
  if (movementType === "issue" || movementType === "adjustment_decrease") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

export default function MaterialDetailsPage() {
  const params = useParams<{ id: string }>();
  const materialId = Number(params.id);

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const materialQuery = useQuery({
    queryKey: ["material", materialId],
    queryFn: () => getMaterial(materialId),
    enabled: Number.isFinite(materialId),
  });

  const movementsQuery = useQuery({
    queryKey: ["material-movements", materialId, page, dateFrom, dateTo],
    queryFn: () =>
      getMaterialMovements(materialId, {
        page,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: Number.isFinite(materialId),
  });

  if (!Number.isFinite(materialId)) {
    return <ErrorState message="Invalid material id." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        {materialQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : materialQuery.isError || !materialQuery.data ? (
          <ErrorState message="Failed to load material details." onRetry={materialQuery.refetch} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Material</p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {materialQuery.data.code} - {materialQuery.data.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Type: <span className="capitalize">{materialQuery.data.material_type}</span> • Unit: {materialQuery.data.unit}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/materials">
                  <Button variant="secondary">Back to Materials</Button>
                </Link>
                <Link href={`/material-inward?material=${materialId}`}>
                  <Button variant="secondary">View Inward</Button>
                </Link>
                <Link href={`/material-issues?material=${materialId}`}>
                  <Button>View Issues</Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Current Stock</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(materialQuery.data.current_stock)}</p>
                <div className="mt-2">
                  <StockBadge stock={materialQuery.data.current_stock} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Inward</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(materialQuery.data.inward_total)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Issued</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(materialQuery.data.issued_total)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Adjustment (+)</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(materialQuery.data.adjustment_increase_total)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">Adjustment (-)</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(materialQuery.data.adjustment_decrease_total)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Stock Movements</h3>
            <p className="text-sm text-slate-500">Complete inward/issue/adjustment movement history for this material.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
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
        </div>

        {movementsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : movementsQuery.isError ? (
          <ErrorState message="Failed to load stock movements." onRetry={movementsQuery.refetch} />
        ) : movementsQuery.data && movementsQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Movement</th>
                  <th>Qty In</th>
                  <th>Qty Out</th>
                  <th>Net</th>
                  <th>Batch / Roll</th>
                  <th>Order / Line</th>
                  <th>By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movementsQuery.data.results.map((row) => (
                  <tr key={`${row.movement_type}-${row.reference_id}`} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.date)}</td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${movementClass(row.movement_type)}`}>
                        {movementLabel(row.movement_type)}
                      </span>
                    </td>
                    <td className="text-emerald-700">{formatNumber(row.quantity_in)}</td>
                    <td className="text-red-700">{formatNumber(row.quantity_out)}</td>
                    <td className="font-semibold text-slate-800">{formatNumber(row.net_quantity)}</td>
                    <td className="text-slate-600">{row.batch_no || "-"} / {row.roll_no || "-"}</td>
                    <td className="text-slate-600">{row.order_code || "-"} / {row.line_name || "-"}</td>
                    <td className="text-slate-600">{row.created_by_name}</td>
                    <td className="max-w-[260px] truncate text-slate-500" title={row.remarks || ""}>{row.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={movementsQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No movement records"
            description="No inward, issue, or adjustment transactions were found for this material in the selected date range."
          />
        )}
      </Card>
    </div>
  );
}
