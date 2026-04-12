"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { PlannedVsActualChart } from "@/components/charts/planned-vs-actual-chart";
import { ReportNav } from "@/components/reports/report-nav";
import { PlanStatusBadge } from "@/components/status-badges/plan-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { exportPlanningCsv, getPlanningReport } from "@/services/reports";

const PAGE_SIZE = 20;

export default function PlanningReportPage() {
  const [page, setPage] = useState(1);
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");

  const filters = {
    page,
    order: orderFilter || undefined,
    line: lineFilter || undefined,
    start_date_from: startFrom || undefined,
    start_date_to: startTo || undefined,
    end_date_from: endFrom || undefined,
    end_date_to: endTo || undefined,
  };

  const ordersQuery = useQuery({ queryKey: ["planning-report-orders"], queryFn: () => listOrders({ page: 1 }) });
  const linesQuery = useQuery({ queryKey: ["planning-report-lines"], queryFn: () => listLines({ page: 1 }) });

  const reportQuery = useQuery({
    queryKey: ["planning-report", filters],
    queryFn: () => getPlanningReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportPlanningCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "planning-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const summary = reportQuery.data?.summary ?? {
    total_plans: 0,
    total_planned_qty: 0,
    total_actual_qty: 0,
    total_variance_qty: 0,
    achievement_percent: 0,
    completed_plans: 0,
    behind_plans: 0,
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Planning Report</h2>
            <p className="text-sm text-slate-500">Track plan commitments versus actual output across lines and orders.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
        <ReportNav />
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
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
      </Card>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Plans</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_plans)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Planned</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_planned_qty)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Actual</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_actual_qty)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Variance</p>
          <p className={`mt-2 text-2xl font-bold ${(Number(summary.total_variance_qty) || 0) < 0 ? "text-red-700" : "text-emerald-700"}`}>
            {formatNumber(summary.total_variance_qty)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Achievement</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{formatPercent(Number(summary.achievement_percent || 0))}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatNumber(summary.completed_plans)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Behind</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatNumber(summary.behind_plans)}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Plan vs Actual Trend</h3>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load planning trend." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <PlannedVsActualChart
            data={reportQuery.data.results.slice(0, 8).map((row) => ({
              label: `${row.order_code} (${row.line_name})`,
              planned_total_qty: row.planned_total_qty,
              actual_total_qty: row.actual_total_qty,
            }))}
          />
        ) : (
          <EmptyState title="No planning trend" description="No planning rows found for selected filters." />
        )}
      </Card>

      <Card>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load planning report rows." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Order / Line</th>
                  <th>Plan Window</th>
                  <th>Planned Qty</th>
                  <th>Actual Qty</th>
                  <th>Variance</th>
                  <th>Achievement</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportQuery.data.results.map((row) => (
                  <tr key={row.plan_id} className="hover:bg-slate-50">
                    <td>
                      <p className="font-semibold text-slate-800">{row.order_code}</p>
                      <p className="text-xs text-slate-500">{row.line_name}</p>
                    </td>
                    <td className="text-slate-600">
                      {formatDate(row.planned_start_date)} - {formatDate(row.planned_end_date)}
                    </td>
                    <td className="text-slate-700">{formatNumber(row.planned_total_qty)}</td>
                    <td className="text-slate-700">{formatNumber(row.actual_total_qty)}</td>
                    <td className={row.variance_qty < 0 ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>
                      {formatNumber(row.variance_qty)}
                    </td>
                    <td className="font-semibold text-blue-700">{formatPercent(row.achievement_percent)}</td>
                    <td>
                      <PlanStatusBadge status={row.plan_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={reportQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No planning rows" description="No planning report rows found for current filters." />
        )}
      </Card>
    </div>
  );
}
