"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EfficiencyChart } from "@/components/charts/efficiency-chart";
import { EfficiencyBadge } from "@/components/status-badges/efficiency-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import {
  getWorkerProductivityLineSummary,
  getWorkerProductivitySummary,
  getWorkerProductivityWorkerSummary,
} from "@/services/productivity";

const PAGE_SIZE = 20;

export default function WorkerProductivitySummaryPage() {
  const [linePage, setLinePage] = useState(1);
  const [workerPage, setWorkerPage] = useState(1);
  const [lineFilter, setLineFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = {
    line: lineFilter || undefined,
    order: orderFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const linesQuery = useQuery({ queryKey: ["prod-summary-lines-filter"], queryFn: () => listLines({ page: 1 }) });
  const ordersQuery = useQuery({ queryKey: ["prod-summary-orders-filter"], queryFn: () => listOrders({ page: 1 }) });

  const summaryQuery = useQuery({
    queryKey: ["worker-productivity-summary", filters],
    queryFn: () => getWorkerProductivitySummary(filters),
  });

  const lineSummaryQuery = useQuery({
    queryKey: ["worker-productivity-line-summary", linePage, filters],
    queryFn: () => getWorkerProductivityLineSummary({ page: linePage, ...filters }),
  });

  const workerSummaryQuery = useQuery({
    queryKey: ["worker-productivity-worker-summary", workerPage, filters],
    queryFn: () => getWorkerProductivityWorkerSummary({ page: workerPage, ...filters }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Worker Productivity Summary</h2>
          <p className="text-sm text-slate-500">Line-wise and worker-wise efficiency breakdown for planning and coaching.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Select
            value={lineFilter}
            onChange={(event) => {
              setLineFilter(event.target.value);
              setLinePage(1);
              setWorkerPage(1);
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
              setLinePage(1);
              setWorkerPage(1);
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
              setLinePage(1);
              setWorkerPage(1);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setLinePage(1);
              setWorkerPage(1);
            }}
          />
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setLineFilter("");
              setOrderFilter("");
              setDateFrom("");
              setDateTo("");
              setLinePage(1);
              setWorkerPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </Card>

      {summaryQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : summaryQuery.isError || !summaryQuery.data ? (
        <ErrorState message="Failed to load productivity summary." onRetry={summaryQuery.refetch} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <p className="text-xs uppercase text-slate-500">Entries</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary.total_entries)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Target Qty</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary.total_target)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Actual Qty</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary.total_actual)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Rework Qty</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary.total_rework)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Overall Efficiency</p>
              <div className="mt-2">
                <EfficiencyBadge efficiency={summaryQuery.data.summary.overall_efficiency} />
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-900">Top Worker Efficiency</h3>
            {summaryQuery.data.worker_summary.length ? (
              <EfficiencyChart
                data={summaryQuery.data.worker_summary.slice(0, 10).map((row) => ({
                  label: row.worker_code || row.worker_name || "Worker",
                  efficiency: row.efficiency,
                }))}
              />
            ) : (
              <EmptyState title="No worker summary" description="No worker productivity data found for selected filters." />
            )}
          </Card>
        </>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Line Summary</h3>
          {lineSummaryQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : lineSummaryQuery.isError ? (
            <ErrorState message="Failed to load line summary." onRetry={lineSummaryQuery.refetch} />
          ) : lineSummaryQuery.data && lineSummaryQuery.data.results.length ? (
            <>
              <DataTable>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th>Line</th>
                    <th>Entries</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineSummaryQuery.data.results.map((row) => (
                    <tr key={row.line_id || row.line_name || "line"} className="hover:bg-slate-50">
                      <td className="text-slate-700">{row.line_name || "-"}</td>
                      <td className="text-slate-600">{formatNumber(row.total_entries)}</td>
                      <td className="text-slate-600">{formatNumber(row.total_target)}</td>
                      <td className="text-slate-600">{formatNumber(row.total_actual)}</td>
                      <td>
                        <EfficiencyBadge efficiency={row.efficiency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <Pagination page={linePage} pageSize={PAGE_SIZE} total={lineSummaryQuery.data.count} onPageChange={setLinePage} />
            </>
          ) : (
            <EmptyState title="No line summary" description="No line productivity data found." />
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Worker Summary</h3>
          {workerSummaryQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : workerSummaryQuery.isError ? (
            <ErrorState message="Failed to load worker summary." onRetry={workerSummaryQuery.refetch} />
          ) : workerSummaryQuery.data && workerSummaryQuery.data.results.length ? (
            <>
              <DataTable>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th>Worker</th>
                    <th>Entries</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workerSummaryQuery.data.results.map((row) => (
                    <tr key={row.worker_id || row.worker_code || "worker"} className="hover:bg-slate-50">
                      <td className="text-slate-700">{row.worker_code || "-"} {row.worker_name ? `- ${row.worker_name}` : ""}</td>
                      <td className="text-slate-600">{formatNumber(row.total_entries)}</td>
                      <td className="text-slate-600">{formatNumber(row.total_target)}</td>
                      <td className="text-slate-600">{formatNumber(row.total_actual)}</td>
                      <td>
                        <EfficiencyBadge efficiency={row.efficiency} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <Pagination page={workerPage} pageSize={PAGE_SIZE} total={workerSummaryQuery.data.count} onPageChange={setWorkerPage} />
            </>
          ) : (
            <EmptyState title="No worker summary" description="No worker-level productivity data found." />
          )}
        </Card>
      </div>
    </div>
  );
}
