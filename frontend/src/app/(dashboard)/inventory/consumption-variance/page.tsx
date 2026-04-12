"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatNumber, toNumber } from "@/lib/utils";
import { listBuyers } from "@/services/buyers";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { getConsumptionVariance, listMaterials } from "@/services/inventory";

const PAGE_SIZE = 20;

export default function ConsumptionVariancePage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [orderFilter, setOrderFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");

  const buyersQuery = useQuery({ queryKey: ["buyers-consumption-filter"], queryFn: () => listBuyers({ page: 1 }) });
  const ordersQuery = useQuery({ queryKey: ["orders-consumption-filter"], queryFn: () => listOrders({ page: 1 }) });
  const linesQuery = useQuery({ queryKey: ["lines-consumption-filter"], queryFn: () => listLines({ page: 1 }) });
  const materialsQuery = useQuery({ queryKey: ["materials-consumption-filter"], queryFn: () => listMaterials({ page: 1 }) });

  const varianceQuery = useQuery({
    queryKey: ["inventory-consumption-variance", page, dateFrom, dateTo, buyerFilter, orderFilter, lineFilter, materialFilter],
    queryFn: () =>
      getConsumptionVariance({
        page,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        buyer: buyerFilter || undefined,
        order: orderFilter || undefined,
        line: lineFilter || undefined,
        material: materialFilter || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Material Consumption Variance</h2>
          <p className="text-sm text-slate-500">Order-wise material consumption view with variance readiness for expected consumption.</p>
        </div>

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
            value={buyerFilter}
            onChange={(event) => {
              setBuyerFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All buyers</option>
            {buyersQuery.data?.results.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.company_name}
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
            value={materialFilter}
            onChange={(event) => {
              setMaterialFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All materials</option>
            {materialsQuery.data?.results.map((material) => (
              <option key={material.id} value={material.id}>
                {material.code}
              </option>
            ))}
          </Select>
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setBuyerFilter("");
              setOrderFilter("");
              setLineFilter("");
              setMaterialFilter("");
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
      </Card>

      {varianceQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : varianceQuery.isError ? (
        <ErrorState message="Failed to load consumption variance." onRetry={varianceQuery.refetch} />
      ) : varianceQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <p className="text-xs uppercase text-slate-500">Rows</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(varianceQuery.data.summary?.total_rows as number)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Orders Covered</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(varianceQuery.data.summary?.orders_covered as number)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Materials Covered</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(varianceQuery.data.summary?.materials_covered as number)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Total Consumption</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(varianceQuery.data.summary?.total_actual_consumption as number)}</p>
            </Card>
          </div>

          <Card>
            {varianceQuery.data.results.length ? (
              <>
                <DataTable>
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th>Order</th>
                      <th>Buyer</th>
                      <th>Material</th>
                      <th>Unit</th>
                      <th>Actual</th>
                      <th>Expected</th>
                      <th>Variance</th>
                      <th>Wastage %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {varianceQuery.data.results.map((row, idx) => {
                      const variance = row.variance === null || row.variance === undefined ? null : toNumber(row.variance);
                      return (
                        <tr key={`${row.order_id || "x"}-${row.material_id || "y"}-${idx}`} className="hover:bg-slate-50">
                          <td className="font-semibold text-slate-800">{row.order_code || "-"}</td>
                          <td className="text-slate-600">{row.buyer_name || "-"}</td>
                          <td className="text-slate-700">{row.material_code || "-"} {row.material_name ? `- ${row.material_name}` : ""}</td>
                          <td className="text-slate-600">{row.unit || "-"}</td>
                          <td className="text-slate-700">{formatNumber(row.actual_consumption)}</td>
                          <td className="text-slate-600">{row.expected_consumption ? formatNumber(row.expected_consumption) : "-"}</td>
                          <td className={variance === null ? "text-slate-400" : variance > 0 ? "text-red-700" : "text-emerald-700"}>
                            {variance === null ? "-" : formatNumber(variance)}
                          </td>
                          <td className="text-slate-600">{row.wastage_percent ? `${toNumber(row.wastage_percent).toFixed(2)}%` : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
                <Pagination page={page} pageSize={PAGE_SIZE} total={varianceQuery.data.count} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState
                title="No consumption rows"
                description="No material issue transactions matched the selected filters."
              />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
