"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { createBuyer, deleteBuyer, listBuyers, updateBuyer } from "@/services/buyers";
import { Buyer } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  company_name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const PAGE_SIZE = 20;

export default function BuyersPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const buyersQuery = useQuery({
    queryKey: ["buyers", page, debouncedSearch],
    queryFn: () => listBuyers({ page, search: debouncedSearch }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createBuyer,
    onSuccess: () => {
      toast.success("Buyer created");
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
      reset();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create buyer"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<FormValues> }) => updateBuyer(id, payload),
    onSuccess: () => {
      toast.success("Buyer updated");
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
      setEditingBuyer(null);
      reset();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update buyer"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBuyer,
    onSuccess: () => {
      toast.success("Buyer deleted");
      queryClient.invalidateQueries({ queryKey: ["buyers"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete buyer"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    };

    if (editingBuyer) {
      await updateMutation.mutateAsync({ id: editingBuyer.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const onEdit = (buyer: Buyer) => {
    setEditingBuyer(buyer);
    reset({
      name: buyer.name,
      company_name: buyer.company_name,
      email: buyer.email || "",
      phone: buyer.phone || "",
      address: buyer.address || "",
      notes: buyer.notes || "",
    });
  };

  const onCancelEdit = () => {
    setEditingBuyer(null);
    reset({
      name: "",
      company_name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only admin users can access buyer management."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingBuyer ? "Edit Buyer" : "Create Buyer"}</h2>
            {editingBuyer ? (
              <Button variant="secondary" onClick={onCancelEdit}>
                Cancel
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact Name</label>
              <Input {...register("name")} />
              {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Company Name</label>
              <Input {...register("company_name")} />
              {errors.company_name ? <p className="mt-1 text-xs text-red-600">{errors.company_name.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" {...register("email")} />
              {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
              <Input {...register("phone")} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <Textarea rows={2} {...register("address")} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <Textarea rows={2} {...register("notes")} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {editingBuyer ? "Update Buyer" : "Create Buyer"}
              </Button>
            </div>
          </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Buyer Directory</h2>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search buyer/company"
            className="w-full sm:max-w-xs"
          />
        </div>

        {buyersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : buyersQuery.isError ? (
          <ErrorState message="Failed to load buyers." onRetry={buyersQuery.refetch} />
        ) : buyersQuery.data && buyersQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Linked Orders</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buyersQuery.data.results.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{buyer.company_name}</td>
                    <td className="px-4 py-3 text-slate-600">{buyer.name}</td>
                    <td className="px-4 py-3 text-slate-600">{buyer.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{buyer.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/orders?buyer=${buyer.id}`} className="text-sm text-blue-600 hover:text-blue-500">
                        View related orders
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/buyers/${buyer.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                        <Button variant="secondary" onClick={() => onEdit(buyer)}>
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          onConfirm={() => deleteMutation.mutate(buyer.id)}
                          message={`Delete buyer ${buyer.company_name}?`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={buyersQuery.data.count}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            title="No buyers found"
            description="Add your first buyer to create and track factory orders."
          />
        )}
      </Card>
    </div>
  );
}
