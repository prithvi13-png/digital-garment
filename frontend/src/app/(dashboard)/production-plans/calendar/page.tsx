"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { getProductionPlanCalendar } from "@/services/planning";

const PAGE_SIZE = 20;

function durationDays(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 1);
}

export default function ProductionPlanCalendarPage() {
  const { hasRole } = useAuth();

  const canAccess = hasRole("admin", "planner", "production_supervisor", "supervisor", "viewer");

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

  const ordersQuery = useQuery({
    queryKey: ["planning-calendar-orders"],
    queryFn: () => listOrders({ page: 1 }),
    enabled: canAccess,
  });

  const linesQuery = useQuery({
    queryKey: ["planning-calendar-lines"],
    queryFn: () => listLines({ page: 1 }),
    enabled: canAccess,
  });

  const calendarQuery = useQuery({
    queryKey: ["production-plan-calendar", filters],
    queryFn: () => getProductionPlanCalendar(filters),
    enabled: canAccess,
  });

  const lineBuckets = useMemo(() => {
    if (!calendarQuery.data?.results.length) return [] as { line: string; plans: number; qty: number }[];

    const map = new Map<string, { line: string; plans: number; qty: number }>();

    calendarQuery.data.results.forEach((row) => {
      const key = row.line_name;
      if (!map.has(key)) {
        map.set(key, { line: key, plans: 0, qty: 0 });
      }
      const current = map.get(key)!;
      current.plans += 1;
      current.qty += row.planned_total_qty;
    });

    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [calendarQuery.data]);

  if (!canAccess) {
    return (
      <EmptyState
        title="Access restricted"
        description="You do not have access to production planning calendar."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Planning Calendar</h2>
          <p className="text-sm text-slate-500">Line-wise plan windows for production coordination and workload visibility.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
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

          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
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
          </button>
        </div>
      </Card>

      {calendarQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : calendarQuery.isError ? (
        <ErrorState message="Failed to load planning calendar." onRetry={calendarQuery.refetch} />
      ) : calendarQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-xs uppercase text-slate-500">Plans On Page</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(calendarQuery.data.results.length)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Total Plans (Filtered)</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(calendarQuery.data.count)}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase text-slate-500">Lines In View</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(lineBuckets.length)}</p>
            </Card>
          </div>

          {lineBuckets.length ? (
            <Card>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Line Workload Snapshot</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lineBuckets.map((bucket) => (
                  <div key={bucket.line} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-800">{bucket.line}</p>
                    <p className="text-xs text-slate-500">{formatNumber(bucket.plans)} plans</p>
                    <p className="mt-1 text-sm text-blue-700">{formatNumber(bucket.qty)} qty planned</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            {calendarQuery.data.results.length ? (
              <>
                <DataTable>
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th>Line</th>
                      <th>Order</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Duration</th>
                      <th>Daily Target</th>
                      <th>Total Qty</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calendarQuery.data.results.map((row) => (
                      <tr key={row.plan_id} className="hover:bg-slate-50">
                        <td className="font-medium text-slate-800">{row.line_name}</td>
                        <td className="text-slate-700">{row.order_code}</td>
                        <td className="text-slate-600">{formatDate(row.planned_start_date)}</td>
                        <td className="text-slate-600">{formatDate(row.planned_end_date)}</td>
                        <td className="text-slate-700">{formatNumber(durationDays(row.planned_start_date, row.planned_end_date))} days</td>
                        <td className="text-slate-700">{formatNumber(row.planned_daily_target)}</td>
                        <td className="font-semibold text-slate-800">{formatNumber(row.planned_total_qty)}</td>
                        <td className="max-w-[250px] truncate text-slate-600">{row.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
                <Pagination page={page} pageSize={PAGE_SIZE} total={calendarQuery.data.count} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState title="No plans in calendar" description="Create plans first or broaden filters." />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
