"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { StockBadge } from "@/components/status-badges/stock-badge";
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
import { MATERIAL_TYPE_OPTIONS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import {
  createMaterial,
  deleteMaterial,
  listMaterials,
  MaterialPayload,
  updateMaterial,
} from "@/services/inventory";
import { Material } from "@/types/api";

const schema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  material_type: z.string().min(1, "Material type is required"),
  unit: z.string().min(1, "Unit is required"),
  description: z.string().optional(),
  barcode_value: z.string().optional(),
  is_active: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function MaterialsPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const canManage = hasRole("admin", "store_manager");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      material_type: "fabric",
      is_active: "true",
    },
  });

  const materialsQuery = useQuery({
    queryKey: ["materials", page, debouncedSearch, materialType, activeFilter],
    queryFn: () =>
      listMaterials({
        page,
        q: debouncedSearch || undefined,
        material_type: materialType || undefined,
        is_active: activeFilter || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      toast.success("Material created");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      reset({ code: "", name: "", unit: "", material_type: "fabric", description: "", barcode_value: "", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create material"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<MaterialPayload> }) => updateMaterial(id, payload),
    onSuccess: () => {
      toast.success("Material updated");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setEditingMaterial(null);
      reset({ code: "", name: "", unit: "", material_type: "fabric", description: "", barcode_value: "", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update material"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      toast.success("Material deleted");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete material"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload: MaterialPayload = {
      code: values.code.trim(),
      name: values.name.trim(),
      material_type: values.material_type,
      unit: values.unit.trim(),
      description: values.description?.trim() || "",
      barcode_value: values.barcode_value?.trim() || "",
      is_active: values.is_active === "true",
    };

    if (editingMaterial) {
      await updateMutation.mutateAsync({ id: editingMaterial.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Store/Admin access required"
        description="Only admin and store manager roles can manage materials."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingMaterial ? "Edit Material" : "Create Material"}</h2>
          {editingMaterial ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingMaterial(null);
                reset({ code: "", name: "", unit: "", material_type: "fabric", description: "", barcode_value: "", is_active: "true" });
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Code</label>
            <Input {...register("code")} placeholder="FAB-001" />
            {errors.code ? <p className="mt-1 text-xs text-red-600">{errors.code.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input {...register("name")} placeholder="Cotton Fabric" />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Material Type</label>
            <Select {...register("material_type")}>
              {MATERIAL_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
            <Input {...register("unit")} placeholder="meter / kg / pcs" />
            {errors.unit ? <p className="mt-1 text-xs text-red-600">{errors.unit.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Barcode Value</label>
            <Input {...register("barcode_value")} placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <Select {...register("is_active")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <Textarea rows={2} {...register("description")} placeholder="Optional notes about this material" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingMaterial ? "Update Material" : "Create Material"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Material Master</h2>
            <p className="text-sm text-slate-500">Track core material stock and movement readiness.</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search code / name"
              className="sm:min-w-[220px]"
            />
            <Select
              value={materialType}
              onChange={(event) => {
                setMaterialType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              {MATERIAL_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        </div>

        {materialsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : materialsQuery.isError ? (
          <ErrorState message="Failed to load materials." onRetry={materialsQuery.refetch} />
        ) : materialsQuery.data && materialsQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materialsQuery.data.results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="font-semibold text-slate-800">{item.code}</td>
                    <td className="text-slate-700">{item.name}</td>
                    <td className="capitalize text-slate-600">{item.material_type}</td>
                    <td className="text-slate-600">{item.unit}</td>
                    <td className="text-slate-700">
                      <div className="space-y-1">
                        <p>{formatNumber(item.current_stock)}</p>
                        <StockBadge stock={item.current_stock} />
                      </div>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/materials/${item.id}`}>
                          <Button variant="secondary">View</Button>
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingMaterial(item);
                            reset({
                              code: item.code,
                              name: item.name,
                              material_type: item.material_type,
                              unit: item.unit,
                              description: item.description || "",
                              barcode_value: item.barcode_value || "",
                              is_active: item.is_active ? "true" : "false",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Delete"
                          message={`Delete material ${item.code}?`}
                          onConfirm={() => deleteMutation.mutate(item.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Pagination page={page} pageSize={PAGE_SIZE} total={materialsQuery.data.count} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState
            title="No materials available"
            description="Create materials to start inward, issue, and stock control workflows."
          />
        )}
      </Card>
    </div>
  );
}
