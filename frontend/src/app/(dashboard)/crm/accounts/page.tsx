"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { EntityQuickDrawer } from "@/components/crm/entity-quick-drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatNumber } from "@/lib/utils";
import { createCRMAccount, getCRMFilterMetadata, listCRMAccounts, updateCRMAccount } from "@/services/crm";
import { CRMAccount } from "@/types/api";

const ACCOUNT_TYPES = ["customer", "prospect", "partner", "vendor", "distributor", "corporate"];
const STATUS_OPTIONS = ["active", "inactive", "prospect", "blocked", "archived"];

const FORM_INITIAL = {
  name: "",
  display_name: "",
  account_type: "prospect",
  status: "prospect",
  industry: "",
  website: "",
  email: "",
  phone: "",
  annual_revenue: "",
  assigned_to: "",
};

export default function CRMAccountsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<CRMAccount | null>(null);
  const [editing, setEditing] = useState<CRMAccount | null>(null);
  const [form, setForm] = useState(FORM_INITIAL);

  const debouncedSearch = useDebouncedValue(search);

  const metadataQuery = useQuery({
    queryKey: ["crm-filter-metadata"],
    queryFn: () => getCRMFilterMetadata(),
  });

  const accountsQuery = useQuery({
    queryKey: ["crm-accounts", page, debouncedSearch, status],
    queryFn: () =>
      listCRMAccounts({
        page,
        search: debouncedSearch,
        status: status || undefined,
        ordering: "name",
      }),
  });

  const createMutation = useMutation({
    mutationFn: createCRMAccount,
    onSuccess: () => {
      toast.success("Account created");
      queryClient.invalidateQueries({ queryKey: ["crm-accounts"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create account"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMAccount(id, payload),
    onSuccess: () => {
      toast.success("Account updated");
      queryClient.invalidateQueries({ queryKey: ["crm-accounts"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update account"),
  });

  const owners = useMemo(
    () =>
      (metadataQuery.data?.owners || []).map((user) => ({
        label: user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username,
        value: String(user.id),
      })),
    [metadataQuery.data],
  );

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Account name is required");
      return;
    }

    const payload = {
      name: form.name,
      display_name: form.display_name || form.name,
      account_type: form.account_type,
      status: form.status,
      industry: form.industry,
      website: form.website,
      email: form.email,
      phone: form.phone,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const rows = accountsQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Accounts</p>
        <h2 className="text-2xl font-bold text-slate-900">Account & Company Management</h2>
        <p className="text-sm text-slate-500">Build customer 360 with linked contacts, opportunities, and financial context.</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editing ? "Edit Account" : "Create Account"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Account name" />
          <Input value={form.display_name} onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))} placeholder="Display name" />
          <Select value={form.account_type} onChange={(e) => setForm((prev) => ({ ...prev, account_type: e.target.value }))}>
            {ACCOUNT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input value={form.industry} onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))} placeholder="Industry" />
          <Input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="Website" />
          <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
          <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
          <Input type="number" value={form.annual_revenue} onChange={(e) => setForm((prev) => ({ ...prev, annual_revenue: e.target.value }))} placeholder="Annual revenue" />
          <Select value={form.assigned_to} onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}>
            <option value="">Assign owner</option>
            {owners.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing ? "Update Account" : "Save Account"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(FORM_INITIAL);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search account"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        {accountsQuery.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : accountsQuery.isError ? (
          <ErrorState message="Failed to load accounts." onRetry={accountsQuery.refetch} />
        ) : rows.length ? (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="text-left" onClick={() => setSelectedAccount(row)}>
                        <p className="font-semibold text-slate-800">{row.display_name || row.name}</p>
                        <p className="text-xs text-slate-500">{row.account_number || "Draft"}</p>
                      </button>
                    </td>
                    <td>{row.account_type}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.assigned_to_detail
                        ? row.assigned_to_detail.first_name || row.assigned_to_detail.last_name
                          ? `${row.assigned_to_detail.first_name} ${row.assigned_to_detail.last_name}`.trim()
                          : row.assigned_to_detail.username
                        : "Unassigned"}
                    </td>
                    <td>₹ {formatNumber(row.annual_revenue || 0)}</td>
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(row);
                          setForm({
                            name: row.name || "",
                            display_name: row.display_name || "",
                            account_type: row.account_type || "prospect",
                            status: row.status || "prospect",
                            industry: row.industry || "",
                            website: row.website || "",
                            email: row.email || "",
                            phone: row.phone || "",
                            annual_revenue: row.annual_revenue ? String(row.annual_revenue) : "",
                            assigned_to: row.assigned_to ? String(row.assigned_to) : "",
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <div className="mt-4">
              <Pagination page={page} pageSize={20} total={accountsQuery.data?.count || 0} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState title="No accounts" description="Create accounts to build your customer and prospect base." />
        )}
      </Card>

      <EntityQuickDrawer
        entityType="account"
        entityId={selectedAccount?.id || null}
        title={selectedAccount?.display_name || selectedAccount?.name || ""}
        subtitle={selectedAccount?.industry || ""}
        owner={
          selectedAccount?.assigned_to_detail
            ? selectedAccount.assigned_to_detail.first_name || selectedAccount.assigned_to_detail.last_name
              ? `${selectedAccount.assigned_to_detail.first_name} ${selectedAccount.assigned_to_detail.last_name}`.trim()
              : selectedAccount.assigned_to_detail.username
            : undefined
        }
        metadata={[
          { label: "Account #", value: selectedAccount?.account_number || "-" },
          { label: "Type", value: selectedAccount?.account_type || "-" },
          { label: "Status", value: selectedAccount?.status || "-" },
          { label: "Revenue", value: `₹ ${formatNumber(selectedAccount?.annual_revenue || 0)}` },
        ]}
        onClose={() => setSelectedAccount(null)}
      />
    </div>
  );
}
