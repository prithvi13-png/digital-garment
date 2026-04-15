"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getCRMDashboardSummary } from "@/services/crm";

const CHART_COLORS = ["#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#f97316", "#ef4444"];

export default function CRMDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["crm-dashboard-summary"],
    queryFn: () => getCRMDashboardSummary(),
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
            </Card>
          ))}
        </div>
        <Card>
          <Skeleton className="h-72 w-full" />
        </Card>
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return <ErrorState message="Failed to load CRM dashboard." onRetry={summaryQuery.refetch} />;
  }

  const data = summaryQuery.data;

  const kpis = [
    { label: "Total Leads", value: data.total_leads, tone: "text-blue-700" },
    { label: "Open Deals", value: data.open_deals, tone: "text-emerald-700" },
    { label: "Won Deals", value: data.won_deals, tone: "text-indigo-700" },
    { label: "Conversion Rate", value: `${data.conversion_rate}%`, tone: "text-amber-700" },
    { label: "Pipeline Value", value: `₹ ${formatNumber(data.pipeline_value)}`, tone: "text-cyan-700" },
    { label: "Weighted Value", value: `₹ ${formatNumber(data.weighted_pipeline_value)}`, tone: "text-violet-700" },
    { label: "Overdue Activities", value: data.overdue_activities, tone: "text-rose-700" },
    { label: "Upcoming Follow-ups", value: data.upcoming_followups, tone: "text-teal-700" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900">CRM Revenue Command Center</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <Card key={item.label} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-1 text-2xl font-bold ${item.tone}`}>{item.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Leads by Source</h3>
          {data.leads_by_source.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.leads_by_source} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={62} outerRadius={102}>
                    {data.leads_by_source.map((item, index) => (
                      <Cell key={`${item.source}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No source data" description="Lead source analytics will appear once leads are captured." />
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Opportunities by Stage</h3>
          {data.opportunities_by_stage.length ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.opportunities_by_stage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8e5f8" />
                  <XAxis dataKey="stage__name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No stage data" description="Create opportunities to view pipeline stage performance." />
          )}
        </Card>
      </section>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Top Performers</h3>
        {data.top_performers.length ? (
          <DataTable>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Won Deals</th>
                <th>Won Value</th>
              </tr>
            </thead>
            <tbody>
              {data.top_performers.map((row, index) => {
                const owner = [row.assigned_to__first_name, row.assigned_to__last_name].filter(Boolean).join(" ");
                return (
                  <tr key={`${row.assigned_to_id}-${index}`}>
                    <td>{owner || row.assigned_to__username || "Unassigned"}</td>
                    <td>{formatNumber(row.won_count)}</td>
                    <td>₹ {formatNumber(row.total_value ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No winners yet" description="As opportunities close won, top performers appear here." />
        )}
      </Card>
    </div>
  );
}
