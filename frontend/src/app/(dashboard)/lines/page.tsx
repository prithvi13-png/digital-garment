"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
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
import { createLine, deleteLine, listLines, updateLine } from "@/services/lines";
import { ProductionLine } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Line name is required"),
  description: z.string().optional(),
  is_active: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function LinesPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: "true" },
  });

  const linesQuery = useQuery({
    queryKey: ["lines", page, debouncedSearch],
    queryFn: () => listLines({ page, search: debouncedSearch }),
    enabled: canManage,
  });

  const createMutation = useMutation({
    mutationFn: createLine,
    onSuccess: () => {
      toast.success("Production line created");
      queryClient.invalidateQueries({ queryKey: ["lines"] });
      reset({ name: "", description: "", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create line"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; description?: string; is_active: boolean } }) =>
      updateLine(id, payload),
    onSuccess: () => {
      toast.success("Production line updated");
      queryClient.invalidateQueries({ queryKey: ["lines"] });
      setEditingLine(null);
      reset({ name: "", description: "", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update line"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLine,
    onSuccess: () => {
      toast.success("Line deleted");
      queryClient.invalidateQueries({ queryKey: ["lines"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete line"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      description: values.description,
      is_active: values.is_active === "true",
    };

    if (editingLine) {
      await updateMutation.mutateAsync({ id: editingLine.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const onEdit = (line: ProductionLine) => {
    setEditingLine(line);
    reset({
      name: line.name,
      description: line.description || "",
      is_active: line.is_active ? "true" : "false",
    });
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only admin users can access production line management."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingLine ? "Edit Line" : "Create Line"}</h2>
            {editingLine ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingLine(null);
                  reset({ name: "", description: "", is_active: "true" });
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Line Name</label>
              <Input {...register("name")} placeholder="Line 1" />
              {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <Select {...register("is_active")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <Textarea rows={2} {...register("description")} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {editingLine ? "Update Line" : "Create Line"}
              </Button>
            </div>
          </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Production Lines</h2>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search line"
            className="w-full sm:max-w-xs"
          />
        </div>

        {linesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : linesQuery.isError ? (
          <ErrorState message="Failed to load lines." onRetry={linesQuery.refetch} />
        ) : linesQuery.data && linesQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linesQuery.data.results.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{line.name}</td>
                    <td className="px-4 py-3 text-slate-600">{line.description || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={line.is_active ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>
                        {line.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => onEdit(line)}>
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          onConfirm={() => deleteMutation.mutate(line.id)}
                          message={`Delete ${line.name}?`}
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
              total={linesQuery.data.count}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState title="No lines configured" description="Add production lines to track output by line." />
        )}
      </Card>
    </div>
  );
}
