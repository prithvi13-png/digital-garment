"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { ReportNav } from "@/components/reports/report-nav";
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
import { listBuyers } from "@/services/buyers";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { exportConsumptionCsv, getConsumptionReport } from "@/services/reports";
import { listMaterials } from "@/services/inventory";

const PAGE_SIZE = 20;

export default function ConsumptionReportPage() {
  const [page, setPage] = useState(1);
  const [materialFilter, setMaterialFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters = {
    page,
    material: materialFilter || undefined,
    order: orderFilter || undefined,
    line: lineFilter || undefined,
    buyer: buyerFilter || undefined,
    issue_date_from: dateFrom || undefined,
    issue_date_to: dateTo || undefined,
  };

  const materialsQuery = useQuery({ queryKey: ["consumption-materials"], queryFn: () => listMaterials({ page: 1 }) });
  const ordersQuery = useQuery({ queryKey: ["consumption-orders"], queryFn: () => listOrders({ page: 1 }) });
  const linesQuery = useQuery({ queryKey: ["consumption-lines"], queryFn: () => listLines({ page: 1 }) });
  const buyersQuery = useQuery({ queryKey: ["consumption-buyers"], queryFn: () => listBuyers({ page: 1 }) });

  const reportQuery = useQuery({
    queryKey: ["consumption-report", filters],
    queryFn: () => getConsumptionReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportConsumptionCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "consumption-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const summary = reportQuery.data?.summary ?? {
    total_rows: 0,
    orders_covered: 0,
    materials_covered: 0,
    total_actual_consumption: 0,
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Consumption Report</h2>
            <p className="text-sm text-slate-500">Order-wise material issue totals and consumption spread.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
        <ReportNav />
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Select
            value={materialFilter}
            onChange={(event) => {
              setMaterialFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All materials</option>
            {materialsQuery.data?.results.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
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
            {ordersQuery.data?.results.map((item) => (
              <option key={item.id} value={item.id}>
                {item.order_code}
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
            {linesQuery.data?.results.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>

          <Select
            value={buyerFilter}
            onChange={(event) => {
              setBuyerFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All buyers</option>
            {buyersQuery.data?.results.map((item) => (
              <option key={item.id} value={item.id}>
                {item.company_name}
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
              setMaterialFilter("");
              setOrderFilter("");
              setLineFilter("");
              setBuyerFilter("");
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-slate-500">Rows</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_rows)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Orders Covered</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.orders_covered)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Materials Covered</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.materials_covered)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Actual Consumption</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_actual_consumption)}</p>
        </Card>
      </div>

      <Card>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load consumption report." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Order</th>
                  <th>Buyer</th>
                  <th>Material</th>
                  <th>Unit</th>
                  <th>Actual Consumption</th>
                  <th>Expected</th>
                  <th>Variance</th>
                  <th>Wastage %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportQuery.data.results.map((row, index) => (
                  <tr key={`${row.order_id}-${row.material_id}-${index}`} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{row.order_code || "-"}</td>
                    <td className="text-slate-600">{row.buyer_name || "-"}</td>
                    <td>
                      <p className="font-medium text-slate-700">{row.material_code || "-"}</p>
                      <p className="text-xs text-slate-500">{row.material_name || "-"}</p>
                    </td>
                    <td className="text-slate-600">{row.unit || "-"}</td>
                    <td className="font-semibold text-slate-900">{formatNumber(row.actual_consumption)}</td>
                    <td className="text-slate-600">{row.expected_consumption == null ? "-" : formatNumber(row.expected_consumption)}</td>
                    <td className="text-slate-600">{row.variance == null ? "-" : formatNumber(row.variance)}</td>
                    <td className="text-slate-600">{row.wastage_percent == null ? "-" : `${row.wastage_percent}%`}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={reportQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No consumption rows" description="No material issue consumption rows found for current filters." />
        )}
      </Card>
    </div>
  );
}
