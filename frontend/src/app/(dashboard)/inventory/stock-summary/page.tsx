"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { StockBalanceChart } from "@/components/charts/stock-balance-chart";
import { StockBadge } from "@/components/status-badges/stock-badge";
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
import { getInventoryStockSummary } from "@/services/inventory";

const PAGE_SIZE = 20;

export default function InventoryStockSummaryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("100");
  const debouncedSearch = useDebouncedValue(search);

  const summaryQuery = useQuery({
    queryKey: ["inventory-stock-summary", page, debouncedSearch, materialType, activeFilter, lowStockThreshold],
    queryFn: () =>
      getInventoryStockSummary({
        page,
        q: debouncedSearch || undefined,
        material_type: materialType || undefined,
        is_active: activeFilter || undefined,
        low_stock_threshold: lowStockThreshold || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Inventory Stock Summary</h2>
            <p className="text-sm text-slate-500">Live stock balance with low stock highlighting by material.</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search code/name"
            />
            <Select
              value={materialType}
              onChange={(event) => {
                setMaterialType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              {MATERIAL_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
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
              value={lowStockThreshold}
              onChange={(event) => {
                setLowStockThreshold(event.target.value);
                setPage(1);
              }}
              placeholder="Low stock threshold"
            />
          </div>
        </div>

        {summaryQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : summaryQuery.isError ? (
          <ErrorState message="Failed to load stock summary." onRetry={summaryQuery.refetch} />
        ) : summaryQuery.data ? (
          <>
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <Card>
                <p className="text-xs uppercase text-slate-500">Total Materials</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary?.total_materials as number)}</p>
              </Card>
              <Card>
                <p className="text-xs uppercase text-slate-500">Current Stock</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary?.total_current_stock as number)}</p>
              </Card>
              <Card>
                <p className="text-xs uppercase text-slate-500">Low Stock Count</p>
                <p className="mt-2 text-2xl font-bold text-red-700">{formatNumber(summaryQuery.data.summary?.low_stock_count as number)}</p>
              </Card>
              <Card>
                <p className="text-xs uppercase text-slate-500">Threshold</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data.summary?.low_stock_threshold as number)}</p>
              </Card>
            </div>

            <Card className="mb-4">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Top Stock Snapshot</h3>
              {summaryQuery.data.results.length ? (
                <StockBalanceChart
                  data={summaryQuery.data.results.slice(0, 8).map((row) => ({
                    code: row.code,
                    inward_total: toNumber(row.inward_total),
                    issued_total: toNumber(row.issued_total),
                    current_stock: toNumber(row.current_stock),
                  }))}
                />
              ) : (
                <EmptyState title="No stock chart data" description="Create materials and transactions to visualize stock." />
              )}
            </Card>

            {summaryQuery.data.results.length ? (
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
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryQuery.data.results.map((row) => (
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
                          <StockBadge stock={row.current_stock} lowStockThreshold={toNumber(summaryQuery.data.summary?.low_stock_threshold as number) || 100} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                <Pagination page={page} pageSize={PAGE_SIZE} total={summaryQuery.data.count} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState
                title="No stock rows"
                description="Try different filters or create material transactions first."
              />
            )}
          </>
        ) : null}
      </Card>
    </div>
  );
}
