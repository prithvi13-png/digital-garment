"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { ReportNav } from "@/components/reports/report-nav";
import { StageBadge } from "@/components/status-badges/stage-badge";
import { StatusBadge } from "@/components/status-badges/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { PRIORITY_OPTIONS, STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { listBuyers } from "@/services/buyers";
import { exportOrdersCsv, getOrdersReport } from "@/services/reports";

const PAGE_SIZE = 20;

export default function OrdersReportPage() {
  const [page, setPage] = useState(1);
  const [buyer, setBuyer] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");

  const buyersQuery = useQuery({ queryKey: ["buyers-order-report-filter"], queryFn: () => listBuyers({ page: 1 }) });

  const filters = {
    page,
    buyer: buyer || undefined,
    stage: stage || undefined,
    status: status || undefined,
    priority: priority || undefined,
    delivery_date_from: deliveryFrom || undefined,
    delivery_date_to: deliveryTo || undefined,
  };

  const reportQuery = useQuery({
    queryKey: ["orders-report", filters],
    queryFn: () => getOrdersReport(filters),
  });

  const downloadCsv = async () => {
    try {
      const blob = await exportOrdersCsv(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "orders-report.csv";
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
            <h2 className="text-lg font-semibold text-slate-900">Orders Report</h2>
            <p className="text-sm text-slate-500">Track order lifecycle, delays, and completion rates.</p>
          </div>
          <Button onClick={downloadCsv}>Export CSV</Button>
        </div>
        <ReportNav />

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
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
          <Select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={deliveryFrom}
            onChange={(event) => {
              setDeliveryFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            value={deliveryTo}
            onChange={(event) => {
              setDeliveryTo(event.target.value);
              setPage(1);
            }}
          />

          <Button
            variant="secondary"
            onClick={() => {
              setBuyer("");
              setStage("");
              setStatus("");
              setPriority("");
              setDeliveryFrom("");
              setDeliveryTo("");
              setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Orders</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.total_orders)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Total Quantity</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.total_quantity)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatNumber(reportQuery.data?.summary?.completed_orders)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatNumber(reportQuery.data?.summary?.in_progress_orders)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-500">Delayed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(reportQuery.data?.summary?.delayed_orders)}</p>
        </Card>
      </div>

      <Card>
        {reportQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reportQuery.isError ? (
          <ErrorState message="Failed to load orders report." onRetry={reportQuery.refetch} />
        ) : reportQuery.data && reportQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Produced</th>
                  <th className="px-4 py-3">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportQuery.data.results.map((item) => (
                  <tr key={item.id} className={item.status === "delayed" ? "bg-red-50/60" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{item.order_code}</p>
                      <p className="text-xs text-slate-500">{item.style_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.buyer_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(item.quantity)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={item.current_stage} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(item.produced_total)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(item.rejected_total)}</td>
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
          <EmptyState title="No order records" description="Try broader filters or create orders first." />
        )}
      </Card>
    </div>
  );
}
