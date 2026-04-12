"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { EfficiencyChart } from "@/components/charts/efficiency-chart";
import { EfficiencyBadge } from "@/components/status-badges/efficiency-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  getWorker,
  getWorkerProductivityWorkerSummary,
  listWorkerProductivity,
} from "@/services/productivity";

const PAGE_SIZE = 20;

export default function WorkerDetailPage() {
  const params = useParams<{ id: string }>();
  const workerId = Number(params.id);
  const [page, setPage] = useState(1);

  const workerQuery = useQuery({
    queryKey: ["worker", workerId],
    queryFn: () => getWorker(workerId),
    enabled: Number.isFinite(workerId),
  });

  const historyQuery = useQuery({
    queryKey: ["worker-history", workerId, page],
    queryFn: () => listWorkerProductivity({ page, worker: String(workerId) }),
    enabled: Number.isFinite(workerId),
  });

  const summaryQuery = useQuery({
    queryKey: ["worker-summary-single", workerId],
    queryFn: () => getWorkerProductivityWorkerSummary({ worker: String(workerId) }),
    enabled: Number.isFinite(workerId),
  });

  if (!Number.isFinite(workerId)) {
    return <ErrorState message="Invalid worker id." />;
  }

  const summaryRow = summaryQuery.data?.results?.[0];

  return (
    <div className="space-y-6">
      <Card>
        {workerQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : workerQuery.isError || !workerQuery.data ? (
          <ErrorState message="Failed to load worker details." onRetry={workerQuery.refetch} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Worker</p>
              <h2 className="text-2xl font-bold text-slate-900">{workerQuery.data.worker_code} - {workerQuery.data.name}</h2>
              <p className="text-sm text-slate-500">
                Mobile: {workerQuery.data.mobile || "-"} • Skill: {workerQuery.data.skill_type || "-"} • Line: {workerQuery.data.assigned_line_name || "Unassigned"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/workers">
                <Button variant="secondary">Back to Workers</Button>
              </Link>
              <Link href={`/worker-productivity?worker=${workerId}`}>
                <Button>Log Productivity</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {summaryQuery.isLoading ? (
        <Card>
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : summaryQuery.isError ? (
        <ErrorState message="Failed to load worker summary." onRetry={summaryQuery.refetch} />
      ) : summaryRow ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <p className="text-xs uppercase text-slate-500">Entries</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryRow.total_entries)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Target Qty</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryRow.total_target)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Actual Qty</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryRow.total_actual)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Rework Qty</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryRow.total_rework)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Efficiency</p>
              <div className="mt-2">
                <EfficiencyBadge efficiency={summaryRow.efficiency} />
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-900">Recent Efficiency Trend</h3>
            {historyQuery.data?.results.length ? (
              <EfficiencyChart
                data={historyQuery.data.results.slice(0, 12).map((row) => ({
                  label: formatDate(row.date),
                  efficiency: row.efficiency,
                }))}
              />
            ) : (
              <EmptyState title="No productivity history" description="No entries yet for this worker." />
            )}
          </Card>
        </>
      ) : (
        <EmptyState title="No worker summary" description="No productivity rows found for this worker." />
      )}

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Productivity History</h3>
        {historyQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : historyQuery.isError ? (
          <ErrorState message="Failed to load productivity history." onRetry={historyQuery.refetch} />
        ) : historyQuery.data && historyQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Line</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Rework</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyQuery.data.results.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="text-slate-600">{formatDate(row.date)}</td>
                    <td className="text-slate-700">{row.order_code}</td>
                    <td className="text-slate-600">{row.line_name}</td>
                    <td className="text-slate-600">{formatNumber(row.target_qty)}</td>
                    <td className="text-slate-600">{formatNumber(row.actual_qty)}</td>
                    <td className="text-slate-600">{formatNumber(row.rework_qty)}</td>
                    <td>
                      <EfficiencyBadge efficiency={row.efficiency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={historyQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No history" description="Log productivity entries to populate this history." />
        )}
      </Card>
    </div>
  );
}
