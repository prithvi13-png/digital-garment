import { apiRequest } from "@/lib/api-client";
import { toQueryString } from "@/lib/utils";
import {
  CRMAccount,
  CRMActivity,
  CRMDashboardSummary,
  CRMFilterMetadata,
  CRMKanbanBoardResponse,
  CRMLead,
  CRMModuleKey,
  CRMNote,
  CRMOpportunity,
  CRMQuotation,
  CRMPipelineEntity,
  CRMPipelineStageEntity,
  CRMTagEntity,
  CRMTask,
  PaginatedResponse,
  CRMContact,
  CRMTimelineEntry,
  User,
} from "@/types/api";

type CRMOption = {
  id: number;
  category: string;
  key: string;
  label: string;
  metadata?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CRMCustomFieldDefinition = {
  id: number;
  module_key: CRMModuleKey;
  entity_key: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  options: Array<string | { label: string; value: string }>;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CRMListFilters = {
  page?: number;
  search?: string;
  organization_key?: string;
  [key: string]: string | number | boolean | undefined | null;
};

export type CRMLeadPayload = Partial<Omit<CRMLead, "id" | "full_name" | "lead_number" | "created_at" | "updated_at">> & {
  first_name: string;
};

export type CRMAccountPayload = Partial<Omit<CRMAccount, "id" | "account_number" | "created_at" | "updated_at">> & {
  name: string;
  display_name?: string;
};

export type CRMContactPayload = Partial<Omit<CRMContact, "id" | "full_name" | "contact_number" | "created_at" | "updated_at">> & {
  first_name: string;
};

export type CRMOpportunityPayload = Partial<
  Omit<CRMOpportunity, "id" | "opportunity_number" | "weighted_value" | "created_at" | "updated_at">
> & {
  name: string;
};

export type CRMActivityPayload = Partial<Omit<CRMActivity, "id" | "created_at" | "updated_at">> & {
  activity_type: string;
  subject: string;
};

export type CRMTaskPayload = Partial<Omit<CRMTask, "id" | "task_number" | "created_at" | "updated_at">> & {
  title: string;
  due_date: string;
};

export type CRMNotePayload = Partial<Omit<CRMNote, "id" | "created_at" | "updated_at">> & {
  body: string;
};

export type CRMQuotationPayload = Partial<
  Omit<CRMQuotation, "id" | "quote_number" | "subtotal" | "discount_total" | "tax_total" | "grand_total" | "created_at" | "updated_at">
> & {
  related_opportunity: number;
};

export type CRMKanbanFilters = {
  pipeline_id?: number;
  search?: string;
  owner?: number;
  priority?: string;
  status?: string;
  source?: string;
  is_open?: boolean;
  tags?: number[];
  page_size?: number;
  organization_key?: string;
};

function withQuery(path: string, filters: Record<string, string | number | boolean | undefined | null>) {
  return `${path}${toQueryString(filters)}`;
}

function buildKanbanQuery(filters: CRMKanbanFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listCRMLeads(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMLead>>(withQuery("/crm/leads/", filters));
}

export async function createCRMLead(payload: CRMLeadPayload) {
  return apiRequest<CRMLead>("/crm/leads/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMLead(id: number, payload: Partial<CRMLeadPayload>) {
  return apiRequest<CRMLead>(`/crm/leads/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMLead(id: number) {
  return apiRequest<void>(`/crm/leads/${id}/`, { method: "DELETE" });
}

export async function convertCRMLead(id: number, payload: { account_name?: string; create_opportunity?: boolean; opportunity_name?: string; pipeline_id?: number; organization_key?: string }) {
  return apiRequest<{ lead: CRMLead; account: CRMAccount; contact: CRMContact; opportunity?: CRMOpportunity | null }>(
    `/crm/leads/${id}/convert/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function listCRMAccounts(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMAccount>>(withQuery("/crm/accounts/", filters));
}

export async function createCRMAccount(payload: CRMAccountPayload) {
  return apiRequest<CRMAccount>("/crm/accounts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMAccount(id: number, payload: Partial<CRMAccountPayload>) {
  return apiRequest<CRMAccount>(`/crm/accounts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMAccount(id: number) {
  return apiRequest<void>(`/crm/accounts/${id}/`, { method: "DELETE" });
}

export async function listCRMContacts(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMContact>>(withQuery("/crm/contacts/", filters));
}

export async function createCRMContact(payload: CRMContactPayload) {
  return apiRequest<CRMContact>("/crm/contacts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMContact(id: number, payload: Partial<CRMContactPayload>) {
  return apiRequest<CRMContact>(`/crm/contacts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMContact(id: number) {
  return apiRequest<void>(`/crm/contacts/${id}/`, { method: "DELETE" });
}

export async function listCRMOpportunities(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMOpportunity>>(withQuery("/crm/opportunities/", filters));
}

export async function createCRMOpportunity(payload: CRMOpportunityPayload) {
  return apiRequest<CRMOpportunity>("/crm/opportunities/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMOpportunity(id: number, payload: Partial<CRMOpportunityPayload>) {
  return apiRequest<CRMOpportunity>(`/crm/opportunities/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMOpportunity(id: number) {
  return apiRequest<void>(`/crm/opportunities/${id}/`, { method: "DELETE" });
}

export async function listCRMActivities(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMActivity>>(withQuery("/crm/activities/", filters));
}

export async function createCRMActivity(payload: CRMActivityPayload) {
  return apiRequest<CRMActivity>("/crm/activities/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMActivity(id: number, payload: Partial<CRMActivityPayload>) {
  return apiRequest<CRMActivity>(`/crm/activities/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMActivity(id: number) {
  return apiRequest<void>(`/crm/activities/${id}/`, { method: "DELETE" });
}

export async function listCRMTasks(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMTask>>(withQuery("/crm/tasks/", filters));
}

export async function createCRMTask(payload: CRMTaskPayload) {
  return apiRequest<CRMTask>("/crm/tasks/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMTask(id: number, payload: Partial<CRMTaskPayload>) {
  return apiRequest<CRMTask>(`/crm/tasks/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMTask(id: number) {
  return apiRequest<void>(`/crm/tasks/${id}/`, { method: "DELETE" });
}

export async function listCRMNotes(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMNote>>(withQuery("/crm/notes/", filters));
}

export async function createCRMNote(payload: CRMNotePayload) {
  return apiRequest<CRMNote>("/crm/notes/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCRMQuotations(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMQuotation>>(withQuery("/crm/quotations/", filters));
}

export async function createCRMQuotation(payload: CRMQuotationPayload) {
  return apiRequest<CRMQuotation>("/crm/quotations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCRMQuotation(id: number, payload: Partial<CRMQuotationPayload>) {
  return apiRequest<CRMQuotation>(`/crm/quotations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCRMQuotation(id: number) {
  return apiRequest<void>(`/crm/quotations/${id}/`, { method: "DELETE" });
}

export async function listCRMTags(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMTagEntity>>(withQuery("/crm/tags/", filters));
}

export async function createCRMTag(payload: Partial<CRMTagEntity> & { name: string; slug: string }) {
  return apiRequest<CRMTagEntity>("/crm/tags/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCRMPipelines(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMPipelineEntity>>(withQuery("/crm/pipelines/", filters));
}

export async function createCRMPipeline(payload: Partial<CRMPipelineEntity> & { module_key: CRMModuleKey; name: string }) {
  return apiRequest<CRMPipelineEntity>("/crm/pipelines/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCRMPipelineStages(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMPipelineStageEntity>>(withQuery("/crm/pipeline-stages/", filters));
}

export async function createCRMPipelineStage(
  payload: Partial<CRMPipelineStageEntity> & { pipeline: number; key: string; name: string },
) {
  return apiRequest<CRMPipelineStageEntity>("/crm/pipeline-stages/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCRMOptions(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMOption>>(withQuery("/crm/options/", filters));
}

export async function createCRMOption(payload: Partial<CRMOption> & { category: string; key: string; label: string }) {
  return apiRequest<CRMOption>("/crm/options/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listCRMCustomFields(filters: CRMListFilters = {}) {
  return apiRequest<PaginatedResponse<CRMCustomFieldDefinition>>(withQuery("/crm/custom-fields/", filters));
}

export async function createCRMCustomField(
  payload: Partial<CRMCustomFieldDefinition> & { module_key: CRMModuleKey; entity_key: string; field_key: string; label: string; field_type: string },
) {
  return apiRequest<CRMCustomFieldDefinition>("/crm/custom-fields/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCRMKanbanBoard(moduleKey: CRMModuleKey, filters: CRMKanbanFilters = {}) {
  return apiRequest<CRMKanbanBoardResponse>(`/crm/kanban/boards/${moduleKey}/${buildKanbanQuery(filters)}`);
}

export async function moveCRMKanbanCard(payload: {
  module_key: CRMModuleKey;
  record_id: number;
  to_stage_id: number;
  position?: number;
  reason?: string;
  organization_key?: string;
}) {
  return apiRequest<CRMLead | CRMOpportunity | CRMTask>("/crm/kanban/move/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCRMTimeline(filters: { entity_type: "lead" | "account" | "contact" | "opportunity"; entity_id: number; limit?: number; organization_key?: string }) {
  return apiRequest<{ results: CRMTimelineEntry[] }>(withQuery("/crm/timeline/", filters));
}

export async function getCRMDashboardSummary(filters: { date_from?: string; date_to?: string; organization_key?: string } = {}) {
  return apiRequest<CRMDashboardSummary>(withQuery("/crm/dashboard/summary/", filters));
}

export async function getCRMFilterMetadata(filters: { organization_key?: string } = {}) {
  return apiRequest<CRMFilterMetadata>(withQuery("/crm/filters/metadata/", filters));
}

export async function bulkCRMAction(payload: {
  module_key: CRMModuleKey;
  ids: number[];
  action: "assign" | "change_status" | "add_tags" | "archive" | "move_stage" | "delete";
  payload: Record<string, unknown>;
  organization_key?: string;
}) {
  return apiRequest<{ module_key: CRMModuleKey; action: string; processed_count: number; processed_ids: number[] }>(
    "/crm/bulk-actions/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function assignCRMRecord(payload: {
  module_key: CRMModuleKey;
  record_id: number;
  to_user_id: number;
  reason?: string;
  organization_key?: string;
}) {
  return apiRequest<{ record_id: number; module_key: CRMModuleKey; assigned_to: User | null }>("/crm/assign/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
