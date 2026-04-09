"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { StageBadge } from "@/components/status-badges/stage-badge";
import { StatusBadge } from "@/components/status-badges/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";
import { getBuyer } from "@/services/buyers";
import { listOrders } from "@/services/orders";

const PAGE_SIZE = 20;

export default function BuyerDetailPage() {
  const params = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const buyerId = Number(params.id);
  const [page, setPage] = useState(1);

  const buyerQuery = useQuery({
    queryKey: ["buyer", buyerId],
    queryFn: () => getBuyer(buyerId),
    enabled: isAdmin && Number.isFinite(buyerId),
  });

  const ordersQuery = useQuery({
    queryKey: ["buyer-orders", buyerId, page],
    queryFn: () => listOrders({ page, buyer: String(buyerId) }),
    enabled: isAdmin && Number.isFinite(buyerId),
  });

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only admin users can access buyer management."
      />
    );
  }

  if (buyerQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="mt-3 h-5 w-80" />
        </Card>
        <Card>
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    );
  }

  if (buyerQuery.isError || !buyerQuery.data) {
    return <ErrorState message="Unable to load buyer details." onRetry={buyerQuery.refetch} />;
  }

  const buyer = buyerQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{buyer.company_name}</h2>
          <p className="text-sm text-slate-500">Buyer profile and linked orders</p>
        </div>
        <div className="flex gap-2">
          <Link href="/buyers">
            <Button variant="secondary">Back to Buyers</Button>
          </Link>
          <Link href={`/orders?buyer=${buyer.id}`}>
            <Button>View in Orders</Button>
          </Link>
        </div>
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Buyer Information</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-slate-500">Contact Name</p>
            <p className="font-medium text-slate-800">{buyer.name}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Email</p>
            <p className="font-medium text-slate-800">{buyer.email || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Phone</p>
            <p className="font-medium text-slate-800">{buyer.phone || "-"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs uppercase text-slate-500">Address</p>
            <p className="font-medium text-slate-800">{buyer.address || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Added On</p>
            <p className="font-medium text-slate-800">{formatDate(buyer.created_at)}</p>
          </div>
          <div className="md:col-span-3">
            <p className="text-xs uppercase text-slate-500">Notes</p>
            <p className="font-medium text-slate-800">{buyer.notes || "-"}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Linked Orders</h3>
        {ordersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : ordersQuery.isError ? (
          <ErrorState message="Failed to load buyer orders." onRetry={ordersQuery.refetch} />
        ) : ordersQuery.data && ordersQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Style</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Delivery</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersQuery.data.results.map((order) => (
                  <tr key={order.id} className={order.status === "delayed" ? "bg-red-50/60" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{order.order_code}</td>
                    <td className="px-4 py-3 text-slate-600">{order.style_name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(order.quantity)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(order.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={order.current_stage} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/orders/${order.id}`}>
                        <Button variant="secondary">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={ordersQuery.data.count}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            title="No linked orders"
            description="This buyer has no orders yet."
          />
        )}
      </Card>
    </div>
  );
}
