"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { EfficiencyChart } from "@/components/charts/efficiency-chart";
import { ReportNav } from "@/components/reports/report-nav";
import { EfficiencyBadge } from "@/components/status-badges/efficiency-badge";
import { Button } from "@/components/ui/button";
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
import { listWorkers } from "@/services/productivity";
import { exportProductivityCsv, getProductivityReport } from "@/services/reports";

const PAGE_SIZE = 20;

export default function ProductivityReportPage() {
  const [page, setPage] = useState(1);
  const [workerFilter, setWorkerFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = {
    page,
    worker: workerFilter || undefined,
    line: lineFilter || undefined,
    order: orderFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const workersQuery = useQuery({ queryKey: ["productivity-report-workers"], queryFn: () => listWorkers({ page: 1 }) });
  const linesQuery = useQuery({ queryKey: ["productivity-report-lines"], queryFn: () => listLines({ page: 1 }) });
  const ordersQuery = useQuery({ queryKey: ["productivity-report-orders"], queryFn: () => listOrders({ page: 1 }) });

  const reportQuery = useQuery({
    queryKey: ["productivity-report", filters],
    queryFn: () => getProductivityReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportProductivityCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "productivity-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const summary = reportQuery.data?.summary ?? {
    total_entries: 0,
    total_target: 0,
    total_actual: 0,
    total_rework: 0,
    overall_efficiency: 0,
    line_summary: [],
    worker_summary: [],
  };
  const workerSummary = summary.worker_summary;

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Productivity Report</h2>
            <p className="text-sm text-slate-500">Worker and line efficiency report with order-level output.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
        <ReportNav />
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Select
            value={workerFilter}
            onChange={(event) => {
              setWorkerFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All workers</option>
            {workersQuery.data?.results.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {worker.worker_code}
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
              setWorkerFilter("");
              setLineFilter("");
              setOrderFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <p className="text-xs uppercase text-slate-500">Entries</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_entries)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Target Qty</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_target)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Actual Qty</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_actual)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Rework Qty</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_rework)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Overall Efficiency</p>
          <div className="mt-2">
            <EfficiencyBadge efficiency={Number(summary.overall_efficiency || 0)} />
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Top Worker Efficiency</h3>
        {workerSummary.length ? (
          <EfficiencyChart
            data={workerSummary.slice(0, 10).map((row) => ({
              label: row.worker_code || row.worker_name || "Worker",
              efficiency: row.efficiency,
            }))}
          />
        ) : (
          <EmptyState title="No worker summary" description="No worker efficiency rows for current filters." />
        )}
      </Card>

      <Card>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load productivity report." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Worker</th>
                  <th>Order</th>
                  <th>Line</th>
                  <th>Entries</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>Rework</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportQuery.data.results.map((row, index) => (
                  <tr key={`${row.worker_id}-${row.order_id}-${row.line_id}-${index}`} className="hover:bg-slate-50">
                    <td>
                      <p className="font-semibold text-slate-800">{row.worker_code || "-"}</p>
                      <p className="text-xs text-slate-500">{row.worker_name || "-"}</p>
                    </td>
                    <td className="text-slate-700">{row.order_code || "-"}</td>
                    <td className="text-slate-600">{row.line_name || "-"}</td>
                    <td className="text-slate-600">{formatNumber(row.total_entries)}</td>
                    <td className="text-slate-600">{formatNumber(row.total_target)}</td>
                    <td className="text-slate-600">{formatNumber(row.total_actual)}</td>
                    <td className="text-slate-600">{formatNumber(row.total_rework)}</td>
                    <td>
                      <EfficiencyBadge efficiency={row.efficiency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={reportQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No productivity rows" description="No worker output rows found for selected filters." />
        )}
      </Card>
    </div>
  );
}
