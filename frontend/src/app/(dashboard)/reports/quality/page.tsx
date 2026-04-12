"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { QualityTrendChart } from "@/components/charts/quality-trend-chart";
import { ReportNav } from "@/components/reports/report-nav";
import { InspectionStageBadge } from "@/components/status-badges/inspection-stage-badge";
import { SeverityBadge } from "@/components/status-badges/severity-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { INSPECTION_STAGE_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { exportQualityCsv, getQualityReport } from "@/services/reports";
import { listUsers } from "@/services/users";

const PAGE_SIZE = 20;

export default function QualityReportPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [inspectorFilter, setInspectorFilter] = useState("");

  const filters = {
    page,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    order: orderFilter || undefined,
    line: lineFilter || undefined,
    inspection_stage: stageFilter || undefined,
    inspector: inspectorFilter || undefined,
  };

  const ordersQuery = useQuery({ queryKey: ["quality-report-orders"], queryFn: () => listOrders({ page: 1 }) });
  const linesQuery = useQuery({ queryKey: ["quality-report-lines"], queryFn: () => listLines({ page: 1 }) });
  const inspectorsQuery = useQuery({ queryKey: ["quality-report-inspectors"], queryFn: () => listUsers({ page: 1, role: "quality_inspector" }) });

  const reportQuery = useQuery({
    queryKey: ["quality-report", filters],
    queryFn: () => getQualityReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportQualityCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "quality-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const summary = reportQuery.data?.summary ?? {
    total_inspections: 0,
    total_checked: 0,
    total_passed: 0,
    total_defective: 0,
    total_rejected: 0,
    total_rework: 0,
    defect_rate: 0,
    rejection_rate: 0,
    top_defects: [],
    rejection_trends: [],
  };
  const topDefects = summary.top_defects;
  const rejectionTrends = summary.rejection_trends;

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quality Report</h2>
            <p className="text-sm text-slate-500">Inspection stage quality performance with defect and rejection trends.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
        <ReportNav />
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
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
      </Card>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        <Card>
          <p className="text-xs uppercase text-slate-500">Inspections</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_inspections)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Checked</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_checked)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Defective</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{formatNumber(summary.total_defective)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Rejected</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatNumber(summary.total_rejected)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Rework</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{formatNumber(summary.total_rework)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Defect Rate</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{formatPercent(Number(summary.defect_rate || 0))}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Rejection Rate</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatPercent(Number(summary.rejection_rate || 0))}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Defect vs Rejection Trend</h3>
        {rejectionTrends.length ? (
          <QualityTrendChart data={rejectionTrends} />
        ) : (
          <EmptyState title="No trend data" description="No rejection trend rows available for selected filters." />
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold text-slate-900">Top Defects</h3>
          {topDefects.length ? (
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Defect</th>
                  <th>Severity</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDefects.map((row, index) => (
                  <tr key={`${row.defect_code}-${index}`}>
                    <td>
                      <p className="font-medium text-slate-800">{row.defect_name || "-"}</p>
                      <p className="text-xs text-slate-500">{row.defect_code || "-"}</p>
                    </td>
                    <td>{row.severity ? <SeverityBadge severity={row.severity} /> : "-"}</td>
                    <td className="font-semibold text-slate-800">{formatNumber(row.total_quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState title="No defect ranking" description="Top defect list will appear once inspections have defects." />
          )}
        </Card>

        <Card>
          {reportQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : reportQuery.isError ? (
            <ErrorState message="Failed to load quality rows." onRetry={reportQuery.refetch} />
          ) : reportQuery.data && reportQuery.data.results.length ? (
            <>
              <DataTable>
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th>Date</th>
                    <th>Order</th>
                    <th>Line</th>
                    <th>Stage</th>
                    <th>Inspector</th>
                    <th>Defect %</th>
                    <th>Reject %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportQuery.data.results.map((row) => (
                    <tr key={row.inspection_id} className="hover:bg-slate-50">
                      <td className="text-slate-600">{formatDate(row.date)}</td>
                      <td className="font-medium text-slate-800">{row.order_code || "-"}</td>
                      <td className="text-slate-600">{row.line_name || "-"}</td>
                      <td>
                        <InspectionStageBadge stage={row.inspection_stage} />
                      </td>
                      <td className="text-slate-600">{row.inspector_name || "-"}</td>
                      <td className="text-amber-700">{formatPercent(row.defect_rate)}</td>
                      <td className="text-red-700">{formatPercent(row.rejection_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <Pagination page={page} pageSize={PAGE_SIZE} total={reportQuery.data.count} onPageChange={setPage} />
            </>
          ) : (
            <EmptyState title="No quality rows" description="No inspection rows found for current filters." />
          )}
        </Card>
      </div>
    </div>
  );
}
