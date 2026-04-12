"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { QualityTrendChart } from "@/components/charts/quality-trend-chart";
import { InspectionStageBadge } from "@/components/status-badges/inspection-stage-badge";
import { SeverityBadge } from "@/components/status-badges/severity-badge";
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
import { getDefectTrends, getQualitySummary, getRejectionTrends } from "@/services/quality";
import { listUsers } from "@/services/users";

const PAGE_SIZE = 20;

export default function QualitySummaryPage() {
  const [defectPage, setDefectPage] = useState(1);
  const [trendPage, setTrendPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [inspectorFilter, setInspectorFilter] = useState("");

  const filters = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    order: orderFilter || undefined,
    line: lineFilter || undefined,
    inspection_stage: stageFilter || undefined,
    inspector: inspectorFilter || undefined,
  };

  const ordersQuery = useQuery({
    queryKey: ["quality-summary-orders"],
    queryFn: () => listOrders({ page: 1 }),
  });

  const linesQuery = useQuery({
    queryKey: ["quality-summary-lines"],
    queryFn: () => listLines({ page: 1 }),
  });

  const inspectorsQuery = useQuery({
    queryKey: ["quality-summary-inspectors"],
    queryFn: () => listUsers({ page: 1, role: "quality_inspector" }),
  });

  const summaryQuery = useQuery({
    queryKey: ["quality-summary", filters],
    queryFn: () => getQualitySummary(filters),
  });

  const defectTrendsQuery = useQuery({
    queryKey: ["quality-defect-trends", defectPage, filters],
    queryFn: () => getDefectTrends({ page: defectPage, ...filters }),
  });

  const rejectionTrendsQuery = useQuery({
    queryKey: ["quality-rejection-trends", trendPage, filters],
    queryFn: () => getRejectionTrends({ page: trendPage, ...filters }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Quality Summary</h2>
          <p className="text-sm text-slate-500">Defect and rejection insights for management and QC team coaching.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setDefectPage(1);
              setTrendPage(1);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setDefectPage(1);
              setTrendPage(1);
            }}
          />
          <Select
            value={orderFilter}
            onChange={(event) => {
              setOrderFilter(event.target.value);
              setDefectPage(1);
              setTrendPage(1);
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
              setDefectPage(1);
              setTrendPage(1);
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
              setDefectPage(1);
              setTrendPage(1);
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
              setDefectPage(1);
              setTrendPage(1);
            }}
          >
            <option value="">All inspectors</option>
            {inspectorsQuery.data?.results.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.first_name} {inspector.last_name}
              </option>
            ))}
          </Select>
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setOrderFilter("");
              setLineFilter("");
              setStageFilter("");
              setInspectorFilter("");
              setDefectPage(1);
              setTrendPage(1);
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
      ) : summaryQuery.isError ? (
        <ErrorState message="Failed to load quality summary." onRetry={summaryQuery.refetch} />
      ) : summaryQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
            <Card>
              <p className="text-xs uppercase text-slate-500">Inspections</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary.total_inspections)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Checked</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary.total_checked)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Passed</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{formatNumber(summaryQuery.data.summary.total_passed)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Defective</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{formatNumber(summaryQuery.data.summary.total_defective)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Rejected</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{formatNumber(summaryQuery.data.summary.total_rejected)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Defect Rate</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{formatPercent(summaryQuery.data.summary.defect_rate)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Rejection Rate</p>
              <p className="mt-2 text-2xl font-bold text-red-700">{formatPercent(summaryQuery.data.summary.rejection_rate)}</p>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 text-base font-semibold text-slate-900">Defect vs Rejection Trend</h3>
            {summaryQuery.data.rejection_trends.length ? (
              <QualityTrendChart
                data={summaryQuery.data.rejection_trends.map((row) => ({
                  date: row.date,
                  defect_rate: row.defect_rate,
                  rejection_rate: row.rejection_rate,
                }))}
              />
            ) : (
              <EmptyState title="No trend data" description="No inspections found for selected filters." />
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Top Defects</h3>
              {summaryQuery.data.top_defects.length ? (
                <DataTable>
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th>Defect</th>
                      <th>Severity</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryQuery.data.top_defects.map((row, index) => (
                      <tr key={`${row.defect_type_id}-${index}`}>
                        <td>
                          <p className="font-medium text-slate-800">{row.defect_name || "-"}</p>
                          <p className="text-xs text-slate-500">{row.defect_code || "-"}</p>
                        </td>
                        <td>{row.severity ? <SeverityBadge severity={row.severity} /> : "-"}</td>
                        <td className="font-semibold text-slate-700">{formatNumber(row.total_quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              ) : (
                <EmptyState title="No top defects" description="Defect entries will appear once inspections are recorded." />
              )}
            </Card>

            <Card>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Recent Rejection Trend</h3>
              {rejectionTrendsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : rejectionTrendsQuery.isError ? (
                <ErrorState message="Failed to load rejection trends." onRetry={rejectionTrendsQuery.refetch} />
              ) : rejectionTrendsQuery.data && rejectionTrendsQuery.data.results.length ? (
                <>
                  <DataTable>
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th>Date</th>
                        <th>Inspections</th>
                        <th>Checked</th>
                        <th>Defect %</th>
                        <th>Rejection %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rejectionTrendsQuery.data.results.map((row) => (
                        <tr key={row.date}>
                          <td className="text-slate-600">{formatDate(row.date)}</td>
                          <td className="text-slate-700">{formatNumber(row.inspections)}</td>
                          <td className="text-slate-700">{formatNumber(row.checked_qty)}</td>
                          <td className="text-amber-700">{formatPercent(row.defect_rate)}</td>
                          <td className="text-red-700">{formatPercent(row.rejection_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                  <Pagination page={trendPage} pageSize={PAGE_SIZE} total={rejectionTrendsQuery.data.count} onPageChange={setTrendPage} />
                </>
              ) : (
                <EmptyState title="No rejection trend" description="No day-level rejection data found for current filters." />
              )}
            </Card>
          </div>
        </>
      ) : null}

      <Card>
        <h3 className="mb-3 text-base font-semibold text-slate-900">Defect Trend Breakdown</h3>
        {defectTrendsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : defectTrendsQuery.isError ? (
          <ErrorState message="Failed to load defect trends." onRetry={defectTrendsQuery.refetch} />
        ) : defectTrendsQuery.data && defectTrendsQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Defect</th>
                  <th>Severity</th>
                  <th>Total Quantity</th>
                  <th>Default Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defectTrendsQuery.data.results.map((row, index) => (
                  <tr key={`${row.defect_type_id}-${index}`}>
                    <td>
                      <p className="font-medium text-slate-800">{row.defect_name || "-"}</p>
                      <p className="text-xs text-slate-500">{row.defect_code || "-"}</p>
                    </td>
                    <td>{row.severity ? <SeverityBadge severity={row.severity} /> : "-"}</td>
                    <td className="font-semibold text-slate-800">{formatNumber(row.total_quantity)}</td>
                    <td>{stageFilter ? <InspectionStageBadge stage={stageFilter as "inline" | "endline" | "final"} /> : "Mixed"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={defectPage} pageSize={PAGE_SIZE} total={defectTrendsQuery.data.count} onPageChange={setDefectPage} />
          </>
        ) : (
          <EmptyState title="No defect trends" description="No defect trend rows found for current filters." />
        )}
      </Card>
    </div>
  );
}
