"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { ReportNav } from "@/components/reports/report-nav";
import { StockBadge } from "@/components/status-badges/stock-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MATERIAL_TYPE_OPTIONS } from "@/lib/constants";
import { formatNumber, toNumber } from "@/lib/utils";
import { exportInventoryCsv, getInventoryReport } from "@/services/reports";

const PAGE_SIZE = 20;

export default function InventoryReportPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [threshold, setThreshold] = useState("100");

  const debouncedSearch = useDebouncedValue(search);

  const filters = {
    page,
    q: debouncedSearch || undefined,
    material_type: materialType || undefined,
    is_active: activeFilter || undefined,
    low_stock_threshold: threshold || undefined,
  };

  const reportQuery = useQuery({
    queryKey: ["inventory-report", filters],
    queryFn: () => getInventoryReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportInventoryCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "inventory-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const summary = reportQuery.data?.summary ?? {
    total_materials: 0,
    total_current_stock: 0,
    low_stock_count: 0,
    low_stock_threshold: 100,
  };
  const thresholdNumber = toNumber(summary.low_stock_threshold) || 100;

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Inventory Report</h2>
            <p className="text-sm text-slate-500">Material stock, inward, issues, and adjustment balances.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>

        <ReportNav />
      </Card>

      <Card>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search code or name"
          />

          <Select
            value={materialType}
            onChange={(event) => {
              setMaterialType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {MATERIAL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>

          <Input
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => {
              setThreshold(event.target.value);
              setPage(1);
            }}
            placeholder="Low stock threshold"
          />

          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              setMaterialType("");
              setActiveFilter("");
              setThreshold("100");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-slate-500">Materials</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_materials)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Current Stock</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.total_current_stock)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Low Stock Count</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{formatNumber(summary.low_stock_count)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Threshold</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summary.low_stock_threshold)}</p>
        </Card>
      </div>

      <Card>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load inventory report." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Material</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Inward</th>
                  <th>Issued</th>
                  <th>Adj (+)</th>
                  <th>Adj (-)</th>
                  <th>Current</th>
                  <th>Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportQuery.data.results.map((row) => (
                  <tr key={row.material_id} className="hover:bg-slate-50">
                    <td>
                      <p className="font-semibold text-slate-800">{row.code}</p>
                      <p className="text-xs text-slate-500">{row.name}</p>
                    </td>
                    <td className="capitalize text-slate-600">{row.material_type}</td>
                    <td className="text-slate-600">{row.unit}</td>
                    <td className="text-slate-700">{formatNumber(row.inward_total)}</td>
                    <td className="text-slate-700">{formatNumber(row.issued_total)}</td>
                    <td className="text-emerald-700">{formatNumber(row.adjustment_increase_total)}</td>
                    <td className="text-red-700">{formatNumber(row.adjustment_decrease_total)}</td>
                    <td className="font-semibold text-slate-900">{formatNumber(row.current_stock)}</td>
                    <td>
                      <StockBadge stock={row.current_stock} lowStockThreshold={thresholdNumber} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={reportQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState title="No inventory rows" description="No material stock rows available for current filters." />
        )}
      </Card>
    </div>
  );
}
