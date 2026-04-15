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
import { createCRMContact, getCRMFilterMetadata, listCRMAccounts, listCRMContacts, updateCRMContact } from "@/services/crm";
import { CRMContact } from "@/types/api";

const FORM_INITIAL = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  linked_account: "",
  preferred_contact_mode: "email",
  assigned_to: "",
};

export default function CRMContactsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [editing, setEditing] = useState<CRMContact | null>(null);
  const [form, setForm] = useState(FORM_INITIAL);

  const debouncedSearch = useDebouncedValue(search);

  const metadataQuery = useQuery({
    queryKey: ["crm-filter-metadata"],
    queryFn: () => getCRMFilterMetadata(),
  });

  const accountsQuery = useQuery({
    queryKey: ["crm-contact-account-select"],
    queryFn: () => listCRMAccounts({ page: 1, ordering: "name" }),
  });

  const contactsQuery = useQuery({
    queryKey: ["crm-contacts", page, debouncedSearch, accountFilter],
    queryFn: () =>
      listCRMContacts({
        page,
        search: debouncedSearch,
        linked_account: accountFilter || undefined,
        ordering: "first_name",
      }),
  });

  const createMutation = useMutation({
    mutationFn: createCRMContact,
    onSuccess: () => {
      toast.success("Contact created");
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create contact"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMContact(id, payload),
    onSuccess: () => {
      toast.success("Contact updated");
      queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update contact"),
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
    if (!form.first_name.trim()) {
      toast.error("First name is required");
      return;
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      designation: form.designation,
      department: form.department,
      linked_account: form.linked_account ? Number(form.linked_account) : null,
      preferred_contact_mode: form.preferred_contact_mode,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const rows = contactsQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Contacts</p>
        <h2 className="text-2xl font-bold text-slate-900">Contact Relationship Center</h2>
        <p className="text-sm text-slate-500">Track stakeholder relationships, preferences, and active conversations.</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editing ? "Edit Contact" : "Create Contact"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} placeholder="First name" />
          <Input value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} placeholder="Last name" />
          <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
          <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
          <Input value={form.designation} onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))} placeholder="Designation" />
          <Input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Department" />
          <Select value={form.linked_account} onChange={(e) => setForm((prev) => ({ ...prev, linked_account: e.target.value }))}>
            <option value="">Link account</option>
            {(accountsQuery.data?.results || []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.display_name || account.name}
              </option>
            ))}
          </Select>
          <Select value={form.preferred_contact_mode} onChange={(e) => setForm((prev) => ({ ...prev, preferred_contact_mode: e.target.value }))}>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="meeting">Meeting</option>
          </Select>
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
            {editing ? "Update Contact" : "Save Contact"}
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
            placeholder="Search contact"
          />
          <Select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All accounts</option>
            {(accountsQuery.data?.results || []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.display_name || account.name}
              </option>
            ))}
          </Select>
        </div>

        {contactsQuery.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : contactsQuery.isError ? (
          <ErrorState message="Failed to load contacts." onRetry={contactsQuery.refetch} />
        ) : rows.length ? (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Designation</th>
                  <th>Account</th>
                  <th>Owner</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button type="button" className="text-left" onClick={() => setSelectedContact(row)}>
                        <p className="font-semibold text-slate-800">{row.full_name}</p>
                        <p className="text-xs text-slate-500">{row.contact_number || "Draft"}</p>
                      </button>
                    </td>
                    <td>{row.email || "-"}</td>
                    <td>{row.phone || "-"}</td>
                    <td>{row.designation || "-"}</td>
                    <td>{row.linked_account_name || "-"}</td>
                    <td>
                      {row.assigned_to_detail
                        ? row.assigned_to_detail.first_name || row.assigned_to_detail.last_name
                          ? `${row.assigned_to_detail.first_name} ${row.assigned_to_detail.last_name}`.trim()
                          : row.assigned_to_detail.username
                        : "Unassigned"}
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(row);
                          setForm({
                            first_name: row.first_name || "",
                            last_name: row.last_name || "",
                            email: row.email || "",
                            phone: row.phone || "",
                            designation: row.designation || "",
                            department: row.department || "",
                            linked_account: row.linked_account ? String(row.linked_account) : "",
                            preferred_contact_mode: row.preferred_contact_mode || "email",
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
              <Pagination page={page} pageSize={20} total={contactsQuery.data?.count || 0} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState title="No contacts" description="Add contacts and map them to accounts and opportunities." />
        )}
      </Card>

      <EntityQuickDrawer
        entityType="contact"
        entityId={selectedContact?.id || null}
        title={selectedContact?.full_name || ""}
        subtitle={selectedContact?.designation || selectedContact?.department || ""}
        owner={
          selectedContact?.assigned_to_detail
            ? selectedContact.assigned_to_detail.first_name || selectedContact.assigned_to_detail.last_name
              ? `${selectedContact.assigned_to_detail.first_name} ${selectedContact.assigned_to_detail.last_name}`.trim()
              : selectedContact.assigned_to_detail.username
            : undefined
        }
        metadata={[
          { label: "Contact #", value: selectedContact?.contact_number || "-" },
          { label: "Email", value: selectedContact?.email || "-" },
          { label: "Phone", value: selectedContact?.phone || "-" },
          { label: "Account", value: selectedContact?.linked_account_name || "-" },
        ]}
        onClose={() => setSelectedContact(null)}
      />
    </div>
  );
}
