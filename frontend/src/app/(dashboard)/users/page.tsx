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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ROLE_LABELS } from "@/lib/constants";
import { createUser, deleteUser, listUsers, updateUser } from "@/services/users";
import { User } from "@/types/api";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum([
    "admin",
    "store_manager",
    "production_supervisor",
    "quality_inspector",
    "planner",
    "supervisor",
    "viewer",
  ]),
  is_active: z.enum(["true", "false"]),
});

type FormValues = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "viewer",
      is_active: "true",
    },
  });

  const usersQuery = useQuery({
    queryKey: ["users", page, debouncedSearch],
    queryFn: () => listUsers({ page, search: debouncedSearch }),
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      reset({ first_name: "", last_name: "", username: "", email: "", password: "", role: "viewer", is_active: "true" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateUser>[1] }) => updateUser(id, payload),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update user"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to delete user"),
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      username: values.username,
      email: values.email,
      password: values.password || undefined,
      role: values.role,
      is_active: values.is_active === "true",
    };

    if (editingUser) {
      await updateMutation.mutateAsync({ id: editingUser.id, payload });
    } else {
      if (!payload.password) {
        toast.error("Password is required for new users");
        return;
      }
      await createMutation.mutateAsync(payload);
    }
  };

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        description="Only admin users can manage platform users."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{editingUser ? "Edit User" : "Create User"}</h2>
          {editingUser ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingUser(null);
                reset({
                  first_name: "",
                  last_name: "",
                  username: "",
                  email: "",
                  password: "",
                  role: "viewer",
                  is_active: "true",
                });
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
            <Input {...register("first_name")} />
            {errors.first_name ? <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
            <Input {...register("last_name")} />
            {errors.last_name ? <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <Input {...register("username")} />
            {errors.username ? <p className="mt-1 text-xs text-red-600">{errors.username.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input type="email" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password {editingUser ? "(leave blank to keep current)" : ""}
            </label>
            <Input type="password" {...register("password")} />
            {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password.message}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <Select {...register("role")}>
              <option value="admin">Admin</option>
              <option value="store_manager">Store Manager</option>
              <option value="production_supervisor">Production Supervisor</option>
              <option value="quality_inspector">Quality Inspector</option>
              <option value="planner">Planner</option>
              <option value="supervisor">Supervisor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <Select {...register("is_active")}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, username, email"
            className="w-full sm:max-w-xs"
          />
        </div>

        {usersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : usersQuery.isError ? (
          <ErrorState message="Failed to load users." onRetry={usersQuery.refetch} />
        ) : usersQuery.data && usersQuery.data.results.length ? (
          <>
            <DataTable>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersQuery.data.results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {item.first_name} {item.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.username}</td>
                    <td className="px-4 py-3 text-slate-600">{item.email}</td>
                    <td className="px-4 py-3 text-slate-600">{ROLE_LABELS[item.role]}</td>
                    <td className="px-4 py-3">
                      <Badge className={item.is_active ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingUser(item);
                            reset({
                              first_name: item.first_name,
                              last_name: item.last_name,
                              username: item.username,
                              email: item.email,
                              password: "",
                              role: item.role,
                              is_active: item.is_active ? "true" : "false",
                            });
                          }}
                        >
                          Edit
                        </Button>
                        {user?.id !== item.id ? (
                          <ConfirmButton
                            label="Delete"
                            onConfirm={() => deleteMutation.mutate(item.id)}
                            message={`Delete user ${item.username}?`}
                          />
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
              total={usersQuery.data.count}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState title="No users found" description="Create users with role-specific access levels." />
        )}
      </Card>
    </div>
  );
}
