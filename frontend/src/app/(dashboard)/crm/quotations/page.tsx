"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  createCRMQuotation,
  listCRMAccounts,
  listCRMContacts,
  listCRMOpportunities,
  listCRMQuotations,
  updateCRMQuotation,
} from "@/services/crm";
import { CRMQuotation } from "@/types/api";

const FORM_INITIAL = {
  related_opportunity: "",
  related_account: "",
  related_contact: "",
  status: "draft",
  quote_date: "",
  valid_until: "",
  currency: "INR",
  terms: "",
  notes: "",
  item_name: "",
  quantity: "1",
  unit_price: "0",
  discount_percent: "0",
  tax_percent: "0",
};

export default function CRMQuotationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<CRMQuotation | null>(null);
  const [form, setForm] = useState(FORM_INITIAL);

  const opportunitiesQuery = useQuery({
    queryKey: ["crm-quote-opportunity-select"],
    queryFn: () => listCRMOpportunities({ page: 1, ordering: "-created_at" }),
  });

  const accountsQuery = useQuery({
    queryKey: ["crm-quote-account-select"],
    queryFn: () => listCRMAccounts({ page: 1, ordering: "name" }),
  });

  const contactsQuery = useQuery({
    queryKey: ["crm-quote-contact-select"],
    queryFn: () => listCRMContacts({ page: 1, ordering: "first_name" }),
  });

  const quoteQuery = useQuery({
    queryKey: ["crm-quotations", page, status],
    queryFn: () =>
      listCRMQuotations({
        page,
        status: status || undefined,
        ordering: "-created_at",
      }),
  });

  const createMutation = useMutation({
    mutationFn: createCRMQuotation,
    onSuccess: () => {
      toast.success("Quotation created");
      queryClient.invalidateQueries({ queryKey: ["crm-quotations"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create quotation"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) => updateCRMQuotation(id, payload),
    onSuccess: () => {
      toast.success("Quotation updated");
      queryClient.invalidateQueries({ queryKey: ["crm-quotations"] });
      setEditing(null);
      setForm(FORM_INITIAL);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update quotation"),
  });

  const submit = () => {
    if (!form.related_opportunity) {
      toast.error("Select related opportunity");
      return;
    }

    if (!form.item_name.trim()) {
      toast.error("Add at least one quote item");
      return;
    }

    const payload = {
      related_opportunity: Number(form.related_opportunity),
      related_account: form.related_account ? Number(form.related_account) : null,
      related_contact: form.related_contact ? Number(form.related_contact) : null,
      status: form.status,
      quote_date: form.quote_date,
      valid_until: form.valid_until || null,
      currency: form.currency,
      terms: form.terms,
      notes: form.notes,
      items: [
        {
          item_name: form.item_name,
          quantity: Number(form.quantity),
          unit_price: Number(form.unit_price),
          discount_percent: Number(form.discount_percent),
          tax_percent: Number(form.tax_percent),
        },
      ],
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  const rows = quoteQuery.data?.results || [];

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-600">CRM Quotations</p>
        <h2 className="text-2xl font-bold text-slate-900">Quotation & Proposal Workspace</h2>
        <p className="text-sm text-slate-500">Generate, send, and track quote progression from draft to accepted.</p>
      </Card>

      <Card>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">{editing ? "Edit Quotation" : "Create Quotation"}</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={form.related_opportunity} onChange={(e) => setForm((prev) => ({ ...prev, related_opportunity: e.target.value }))}>
            <option value="">Related opportunity</option>
            {(opportunitiesQuery.data?.results || []).map((opportunity) => (
              <option key={opportunity.id} value={opportunity.id}>
                {opportunity.name}
              </option>
            ))}
          </Select>
          <Select value={form.related_account} onChange={(e) => setForm((prev) => ({ ...prev, related_account: e.target.value }))}>
            <option value="">Related account</option>
            {(accountsQuery.data?.results || []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.display_name || account.name}
              </option>
            ))}
          </Select>
          <Select value={form.related_contact} onChange={(e) => setForm((prev) => ({ ...prev, related_contact: e.target.value }))}>
            <option value="">Related contact</option>
            {(contactsQuery.data?.results || []).map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name}
              </option>
            ))}
          </Select>
          <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="revised">Revised</option>
          </Select>
          <Input type="date" value={form.quote_date} onChange={(e) => setForm((prev) => ({ ...prev, quote_date: e.target.value }))} />
          <Input type="date" value={form.valid_until} onChange={(e) => setForm((prev) => ({ ...prev, valid_until: e.target.value }))} />
          <Input value={form.currency} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))} placeholder="Currency" />
          <Input value={form.item_name} onChange={(e) => setForm((prev) => ({ ...prev, item_name: e.target.value }))} placeholder="Item name" />
          <Input type="number" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} placeholder="Quantity" />
          <Input type="number" value={form.unit_price} onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))} placeholder="Unit price" />
          <Input type="number" value={form.discount_percent} onChange={(e) => setForm((prev) => ({ ...prev, discount_percent: e.target.value }))} placeholder="Discount %" />
          <Input type="number" value={form.tax_percent} onChange={(e) => setForm((prev) => ({ ...prev, tax_percent: e.target.value }))} placeholder="Tax %" />
          <Input value={form.terms} onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))} placeholder="Terms" />
          <Input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" />
        </div>

        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing ? "Update Quotation" : "Save Quotation"}
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
        <div className="mb-3 flex items-center gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="revised">Revised</option>
          </Select>
        </div>

        {quoteQuery.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : quoteQuery.isError ? (
          <ErrorState message="Failed to load quotations." onRetry={quoteQuery.refetch} />
        ) : rows.length ? (
          <>
            <DataTable>
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Valid Until</th>
                  <th>Total</th>
                  <th>Order Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.quote_number || `Q-${row.id}`}</td>
                    <td>{row.status}</td>
                    <td>{formatDate(row.quote_date)}</td>
                    <td>{row.valid_until ? formatDate(row.valid_until) : "-"}</td>
                    <td>
                      {row.currency} {formatNumber(row.grand_total || 0)}
                    </td>
                    <td>{row.converted_order ? `Order #${row.converted_order}` : "Not converted"}</td>
                    <td>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(row);
                          const firstItem = row.items?.[0];
                          setForm({
                            related_opportunity: String(row.related_opportunity || ""),
                            related_account: row.related_account ? String(row.related_account) : "",
                            related_contact: row.related_contact ? String(row.related_contact) : "",
                            status: row.status || "draft",
                            quote_date: row.quote_date || "",
                            valid_until: row.valid_until || "",
                            currency: row.currency || "INR",
                            terms: row.terms || "",
                            notes: row.notes || "",
                            item_name: firstItem?.item_name || "",
                            quantity: firstItem?.quantity ? String(firstItem.quantity) : "1",
                            unit_price: firstItem?.unit_price ? String(firstItem.unit_price) : "0",
                            discount_percent: firstItem?.discount_percent ? String(firstItem.discount_percent) : "0",
                            tax_percent: firstItem?.tax_percent ? String(firstItem.tax_percent) : "0",
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
              <Pagination page={page} pageSize={20} total={quoteQuery.data?.count || 0} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <EmptyState title="No quotations" description="Create a quote from opportunity context to move deals forward." />
        )}
      </Card>
    </div>
  );
}
