"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { StageBadge } from "@/components/status-badges/stage-badge";
import { StatusBadge } from "@/components/status-badges/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PRIORITY_OPTIONS, STAGE_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { listBuyers } from "@/services/buyers";
import { createOrder, deleteOrder, listOrders, updateOrder } from "@/services/orders";
import { Order } from "@/types/api";

const schema = z.object({
  buyer: z.string().min(1, "Buyer is required"),
  style_name: z.string().min(1, "Style name is required"),
  style_code: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be greater than 0"),
  target_per_day: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || value >= 0, "Target per day cannot be negative"),
  delivery_date: z.string().min(1, "Delivery date is required"),
  current_stage: z.string().min(1),
  priority: z.string().min(1),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialBuyerFilter = searchParams.get("buyer") || "";

  const { hasRole } = useAuth();
  const canManage = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [buyerFilter, setBuyerFilter] = useState(initialBuyerFilter);
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_stage: "cutting",
      priority: "medium",
    },
  });

  const buyersQuery = useQuery({
    queryKey: ["buyers-select"],
    queryFn: () => listBuyers({ page: 1 }),
  });

  const ordersQuery = useQuery({
    queryKey: [
      "orders",
      page,
      debouncedSearch,
      buyerFilter,
      stageFilter,
      statusFilter,
      priorityFilter,
      deliveryFrom,
      deliveryTo,
    ],
    queryFn: () =>
      listOrders({
        page,
        search: debouncedSearch,
        buyer: buyerFilter || undefined,
        current_stage: stageFilter || undefined,
        status: (statusFilter as Order["status"]) || undefined,
        priority: priorityFilter || undefined,
        delivery_date_from: deliveryFrom || undefined,
        delivery_date_to: deliveryTo || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success("Order created");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      reset({
        buyer: "",
        style_name: "",
        style_code: "",
        quantity: 0,
        target_per_day: null,
        delivery_date: "",
        current_stage: "cutting",
        priority: "medium",
        notes: "",
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create order"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateOrder>[1] }) =>
      updateOrder(id, payload),
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setEditingOrder(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update order"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      toast.success("Order deleted");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete order"),
  });

  const buyerOptions = useMemo(() => buyersQuery.data?.results ?? [], [buyersQuery.data]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      buyer: Number(values.buyer),
      style_name: values.style_name,
      style_code: values.style_code || "",
      quantity: values.quantity,
      target_per_day: values.target_per_day,
      delivery_date: values.delivery_date,
      current_stage: values.current_stage as Order["current_stage"],
      priority: values.priority as Order["priority"],
      notes: values.notes || "",
    };

    if (editingOrder) {
      await updateMutation.mutateAsync({ id: editingOrder.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const onEdit = (order: Order) => {
    setEditingOrder(order);
    reset({
      buyer: String(order.buyer),
      style_name: order.style_name,
      style_code: order.style_code || "",
      quantity: order.quantity,
      target_per_day: order.target_per_day ?? null,
      delivery_date: order.delivery_date,
      current_stage: order.current_stage,
      priority: order.priority,
      notes: order.notes || "",
    });
  };

  return (
    <div className="space-y-6">
      {canManage ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingOrder ? "Edit Order" : "Create Order"}</h2>
            {editingOrder ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingOrder(null);
                  reset({
                    buyer: "",
                    style_name: "",
                    style_code: "",
                    quantity: 0,
                    target_per_day: null,
                    delivery_date: "",
                    current_stage: "cutting",
                    priority: "medium",
                    notes: "",
                  });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Buyer</label>
              <Select {...register("buyer")}>
                <option value="">Select buyer</option>
                {buyerOptions.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.company_name}
                  </option>
                ))}
              </Select>
              {errors.buyer ? <p className="mt-1 text-xs text-red-600">{errors.buyer.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Style Name</label>
              <Input {...register("style_name")} />
              {errors.style_name ? <p className="mt-1 text-xs text-red-600">{errors.style_name.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Style Code</label>
              <Input {...register("style_code")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
              <Input type="number" min={1} {...register("quantity")} />
              {errors.quantity ? <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Target Per Day</label>
              <Input type="number" min={0} {...register("target_per_day")} />
              {errors.target_per_day ? <p className="mt-1 text-xs text-red-600">{errors.target_per_day.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Date</label>
              <Input type="date" {...register("delivery_date")} />
              {errors.delivery_date ? <p className="mt-1 text-xs text-red-600">{errors.delivery_date.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Current Stage</label>
              <Select {...register("current_stage")}>
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <Select {...register("priority")}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <Textarea rows={2} {...register("notes")} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={isSubmitting}>
                {editingOrder ? "Update Order" : "Create Order"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Order code, style, buyer"
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</label>
            <Select
              value={buyerFilter}
              onChange={(e) => {
                setBuyerFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All buyers</option>
              {buyerOptions.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.company_name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Stage</label>
            <Select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</label>
            <Select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery from</label>
            <Input
              type="date"
              value={deliveryFrom}
              onChange={(e) => {
                setDeliveryFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery to</label>
            <Input
              type="date"
              value={deliveryTo}
              onChange={(e) => {
                setDeliveryTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Button
            variant="secondary"
            className="self-end"
            onClick={() => {
              setSearch("");
              setBuyerFilter("");
              setStageFilter("");
              setStatusFilter("");
              setPriorityFilter("");
              setDeliveryFrom("");
              setDeliveryTo("");
              setPage(1);
            }}
          >
            Reset
          </Button>
        </div>

        {ordersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : ordersQuery.isError ? (
          <ErrorState message="Failed to load orders." onRetry={ordersQuery.refetch} />
        ) : ordersQuery.data && ordersQuery.data.results.length ? (
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
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordersQuery.data.results.map((order) => (
                  <tr key={order.id} className={order.status === "delayed" ? "bg-red-50/60" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{order.order_code}</p>
                      <p className="text-xs text-slate-500">{order.style_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{order.buyer_detail?.company_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(order.quantity)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(order.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={order.current_stage} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{order.priority}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                        {canManage ? (
                          <>
                            <Button variant="secondary" onClick={() => onEdit(order)}>
                              Edit
                            </Button>
                            <ConfirmButton
                              label="Delete"
                              onConfirm={() => deleteMutation.mutate(order.id)}
                              message={`Delete order ${order.order_code}?`}
                            />
                          </>
                        ) : null}
                      </div>
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
            title="No orders found"
            description="Create a new order or adjust filters to find existing records."
          />
        )}
      </Card>
    </div>
  );
}
