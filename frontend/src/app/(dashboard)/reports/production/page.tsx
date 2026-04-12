"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "@/components/auth/auth-provider";
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
import { STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { listBuyers } from "@/services/buyers";
import { listLines } from "@/services/lines";
import { listOrders } from "@/services/orders";
import { exportProductionCsv, getProductionReport } from "@/services/reports";
import { listUsers } from "@/services/users";

const PAGE_SIZE = 20;

export default function ProductionReportPage() {
  const { hasRole } = useAuth();
  const canFilterSupervisor = hasRole("admin");

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [buyer, setBuyer] = useState("");
  const [order, setOrder] = useState("");
  const [line, setLine] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [supervisor, setSupervisor] = useState("");

  const buyersQuery = useQuery({ queryKey: ["buyers-report-filter"], queryFn: () => listBuyers({ page: 1 }) });
  const ordersQuery = useQuery({ queryKey: ["orders-report-filter"], queryFn: () => listOrders({ page: 1 }) });
  const linesQuery = useQuery({ queryKey: ["lines-report-filter"], queryFn: () => listLines({ page: 1 }) });
  const supervisorsQuery = useQuery({
    queryKey: ["supervisor-report-filter"],
    queryFn: () => listUsers({ page: 1, role: "supervisor" }),
    enabled: canFilterSupervisor,
  });

  const filters = {
    page,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    buyer: buyer || undefined,
    order: order || undefined,
    line: line || undefined,
    stage: stage || undefined,
    status: status || undefined,
    supervisor: supervisor || undefined,
  };

  const reportQuery = useQuery({
    queryKey: ["production-report", filters],
    queryFn: () => getProductionReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportProductionCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "production-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Production Report</h2>
            <p className="text-sm text-slate-500">Filter daily output, efficiency, and rejection trends.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
        <ReportNav />

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
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
            value={buyer}
            onChange={(event) => {
              setBuyer(event.target.value);
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
          <Select
            value={order}
            onChange={(event) => {
              setOrder(event.target.value);
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
            value={line}
            onChange={(event) => {
              setLine(event.target.value);
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
            value={stage}
            onChange={(event) => {
              setStage(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All stages</option>
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {canFilterSupervisor ? (
            <Select
              value={supervisor}
              onChange={(event) => {
                setSupervisor(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All supervisors</option>
              {supervisorsQuery.data?.results.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.username}
                </option>
              ))}
            </Select>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setBuyer("");
              setOrder("");
              setLine("");
              setStage("");
              setStatus("");
              setSupervisor("");
              setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-slate-500">Entries</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.total_entries)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Target Qty</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.total_target)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Produced Qty</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.total_produced)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Rejected Qty</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.total_rejected)}</p>
        </Card>
      </div>

      <Card>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load report." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Produced</th>
                  <th className="px-4 py-3">Rejected</th>
                  <th className="px-4 py-3">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportQuery.data.results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.date)}</td>
                    <td className="px-4 py-3 text-slate-700">{item.order_code}</td>
                    <td className="px-4 py-3 text-slate-600">{item.buyer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.line_name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.supervisor_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(item.target_qty)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(item.produced_qty)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(item.rejected_qty)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={reportQuery.data.count}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            title="No production records"
            description="Try broadening filters or log production entries first."
          />
        )}
      </Card>
    </div>
  );
}
