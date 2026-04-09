"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { DailyProductionChart } from "@/components/charts/daily-production-chart";
import { useAuth } from "@/components/auth/auth-provider";
import { LinePerformanceChart } from "@/components/charts/line-performance-chart";
import { StageBadge } from "@/components/status-badges/stage-badge";
import { StatusBadge } from "@/components/status-badges/status-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { getDashboardSummary, getLinePerformance, getRecentActivities } from "@/services/dashboard";
import { listProductionEntries } from "@/services/production";
import { formatDate, formatNumber } from "@/lib/utils";

const KPI_ITEMS = [
  { key: "today_production", label: "Today Production" },
  { key: "today_rejected", label: "Rejected Today" },
  { key: "orders_in_progress", label: "Orders In Progress" },
  { key: "delayed_orders", label: "Delayed Orders" },
  { key: "completed_orders", label: "Completed Orders" },
] as const;

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const canLogProduction = hasRole("admin", "supervisor");

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const linePerformanceQuery = useQuery({
    queryKey: ["dashboard-line-performance"],
    queryFn: () => getLinePerformance({}),
  });

  const activitiesQuery = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: () => getRecentActivities(8),
  });

  const recentEntriesQuery = useQuery({
    queryKey: ["dashboard-recent-entries"],
    queryFn: () => listProductionEntries({ page: 1 }),
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-8 w-20" />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return <ErrorState message="Failed to load dashboard summary." onRetry={summaryQuery.refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {KPI_ITEMS.map((item) => (
          <Card key={item.key}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(summaryQuery.data[item.key])}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Daily Production Trend</h2>
          <DailyProductionChart data={summaryQuery.data.daily_trend} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Line Performance</h2>
          {linePerformanceQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : linePerformanceQuery.isError ? (
            <ErrorState message="Failed to load line performance." onRetry={linePerformanceQuery.refetch} />
          ) : linePerformanceQuery.data?.line_performance?.length ? (
            <LinePerformanceChart data={linePerformanceQuery.data.line_performance} />
          ) : (
            <EmptyState
              title="No production trend available"
              description="Once supervisors add entries, line performance appears here."
            />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
            <Link href="/orders" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
              View all
            </Link>
          </div>

          {summaryQuery.data.recent_orders.length ? (
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryQuery.data.recent_orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{order.order_code}</p>
                      <p className="text-xs text-slate-500">{order.style_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{order.buyer_name || "-"}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={order.current_stage} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(order.delivery_date)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <EmptyState title="No orders yet" description="Create your first order to start tracking progress." />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            <Link href="/reports/production" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
              Reports
            </Link>
          </div>

          {activitiesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : activitiesQuery.isError ? (
            <ErrorState message="Failed to load recent activities." onRetry={activitiesQuery.refetch} />
          ) : activitiesQuery.data?.length ? (
            <div className="space-y-3">
              {activitiesQuery.data.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">{activity.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.user_name} • {formatDate(activity.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No activity yet" description="System actions will appear here." />
          )}

          <div className="mt-4 grid gap-2">
            <Link href="/orders" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              Create / Manage Orders
            </Link>
            {canLogProduction ? (
              <Link
                href="/production-entries"
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Log Production Entry
              </Link>
            ) : (
              <Link
                href="/reports/production"
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
              >
                View Production Report
              </Link>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Production Entries</h2>
          <Link
            href={canLogProduction ? "/production-entries" : "/reports/production"}
            className="text-sm font-semibold text-blue-600 hover:text-blue-500"
          >
            View all
          </Link>
        </div>

        {recentEntriesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : recentEntriesQuery.isError ? (
          <ErrorState message="Failed to load recent production entries." onRetry={recentEntriesQuery.refetch} />
        ) : recentEntriesQuery.data && recentEntriesQuery.data.results.length ? (
          <DataTable>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Line</th>
                <th className="px-4 py-3">Supervisor</th>
                <th className="px-4 py-3">Produced</th>
                <th className="px-4 py-3">Rejected</th>
                <th className="px-4 py-3">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEntriesQuery.data.results.slice(0, 5).map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.order_detail?.order_code || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.production_line_detail?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.supervisor_name || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNumber(entry.produced_qty)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNumber(entry.rejected_qty)}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState
            title="No production entries yet"
            description="Recent production logs will appear here as supervisors submit entries."
          />
        )}
      </Card>
    </div>
  );
}
