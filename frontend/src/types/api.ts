export type Role =
  | "admin"
  | "store_manager"
  | "production_supervisor"
  | "quality_inspector"
  | "planner"
  | "supervisor"
  | "viewer";

export type Stage = "cutting" | "stitching" | "qc" | "packing" | "dispatch";
export type Status = "pending" | "in_progress" | "completed" | "delayed";
export type Priority = "low" | "medium" | "high";

export type MaterialType =
  | "fabric"
  | "thread"
  | "label"
  | "button"
  | "zipper"
  | "packaging"
  | "other";

export type AdjustmentType = "increase" | "decrease";
export type Severity = "minor" | "major" | "critical";
export type InspectionStage = "inline" | "endline" | "final";
export type PlanStatus = "completed" | "behind" | "not_started" | "in_progress";
export type DecimalLike = number | string;

export type PaginatedResponse<T, S = Record<string, unknown>> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  summary?: S;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Buyer = {
  id: number;
  name: string;
  company_name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type ProductionLine = {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: number;
  order_code: string;
  buyer: number;
  buyer_detail?: Buyer;
  style_name: string;
  style_code?: string;
  quantity: number;
  target_per_day?: number | null;
  delivery_date: string;
  current_stage: Stage;
  status: Status;
  priority: Priority;
  notes?: string;
  created_by?: number;
  created_by_detail?: User;
  buyer_name?: string;
  created_by_name?: string;
  produced_total?: number;
  rejected_total?: number;
  created_at: string;
  updated_at: string;
  production_summary?: {
    total_target_qty: number;
    total_produced_qty: number;
    total_rejected_qty: number;
    total_entries: number;
  };
};

export type ProductionEntry = {
  id: number;
  date: string;
  production_line: number;
  production_line_detail?: ProductionLine;
  supervisor: number;
  supervisor_name?: string;
  order: number;
  order_code?: string;
  buyer_name?: string;
  line_name?: string;
  stage?: Stage;
  order_status?: Status;
  order_detail?: {
    id: number;
    order_code: string;
    style_name: string;
    current_stage: Stage;
    status: Status;
    delivery_date: string;
  };
  target_qty: number;
  produced_qty: number;
  rejected_qty: number;
  efficiency: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
};

export type ActivityLog = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  description: string;
  user_name: string;
  created_at: string;
};

export type DashboardSummary = {
  today_production: number;
  today_rejected: number;
  orders_in_progress: number;
  delayed_orders: number;
  completed_orders: number;
  daily_trend: {
    date: string;
    produced_qty: number;
    rejected_qty: number;
  }[];
  recent_orders: Order[];
};

export type LinePerformanceResponse = {
  start_date: string;
  end_date: string;
  line_performance: {
    line_id: number;
    line_name: string;
    total_target: number;
    total_produced: number;
    total_rejected: number;
    total_entries: number;
    efficiency: number;
  }[];
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: User;
};

export type Material = {
  id: number;
  code: string;
  name: string;
  material_type: MaterialType;
  unit: string;
  description?: string;
  is_active: boolean;
  barcode_value?: string | null;
  inward_total: DecimalLike;
  issued_total: DecimalLike;
  adjustment_increase_total: DecimalLike;
  adjustment_decrease_total: DecimalLike;
  current_stock: DecimalLike;
  created_at: string;
  updated_at: string;
};

export type MaterialLite = Pick<Material, "id" | "code" | "name" | "material_type" | "unit" | "is_active">;

export type MaterialStockInward = {
  id: number;
  material: number;
  material_detail?: MaterialLite;
  batch_no?: string;
  roll_no?: string;
  inward_date: string;
  quantity: DecimalLike;
  rate?: DecimalLike | null;
  supplier_name?: string;
  remarks?: string;
  barcode_value?: string | null;
  created_by?: number | null;
  created_by_detail?: User;
  created_at: string;
  updated_at: string;
};

export type MaterialStockIssue = {
  id: number;
  material: number;
  material_detail?: MaterialLite;
  order?: number | null;
  order_code?: string | null;
  production_line?: number | null;
  line_name?: string | null;
  issue_date: string;
  quantity: DecimalLike;
  issued_to?: string;
  remarks?: string;
  barcode_value?: string | null;
  created_by?: number | null;
  created_by_detail?: User;
  created_at: string;
  updated_at: string;
};

export type StockAdjustment = {
  id: number;
  material: number;
  material_detail?: MaterialLite;
  adjustment_date: string;
  adjustment_type: AdjustmentType;
  quantity: DecimalLike;
  reason: string;
  created_by?: number | null;
  created_by_detail?: User;
  created_at: string;
  updated_at: string;
};

export type MaterialStockSummaryRow = {
  material_id: number;
  code: string;
  name: string;
  material_type: MaterialType;
  unit: string;
  is_active: boolean;
  inward_total: DecimalLike;
  issued_total: DecimalLike;
  adjustment_increase_total: DecimalLike;
  adjustment_decrease_total: DecimalLike;
  current_stock: DecimalLike;
  is_low_stock?: boolean;
};

export type MaterialMovementRow = {
  movement_type: string;
  date: string;
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  quantity_in: DecimalLike;
  quantity_out: DecimalLike;
  net_quantity: DecimalLike;
  reference_id: number;
  batch_no?: string | null;
  roll_no?: string | null;
  order_code?: string | null;
  line_name?: string | null;
  remarks?: string | null;
  barcode_value?: string | null;
  created_by_name: string;
};

export type ConsumptionVarianceRow = {
  order_id?: number | null;
  order_code?: string | null;
  buyer_name?: string | null;
  material_id?: number | null;
  material_code?: string | null;
  material_name?: string | null;
  unit?: string | null;
  actual_consumption: DecimalLike;
  expected_consumption?: DecimalLike | null;
  variance?: DecimalLike | null;
  wastage_percent?: DecimalLike | null;
};

export type Worker = {
  id: number;
  worker_code: string;
  name: string;
  mobile?: string;
  skill_type?: string;
  assigned_line?: number | null;
  assigned_line_name?: string | null;
  barcode_value?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkerProductivityEntry = {
  id: number;
  worker: number;
  worker_name?: string;
  worker_code?: string;
  order: number;
  order_code?: string;
  production_line: number;
  line_name?: string;
  date: string;
  target_qty: number;
  actual_qty: number;
  rework_qty: number;
  efficiency: number;
  remarks?: string;
  created_by?: number | null;
  created_by_detail?: User;
  created_at: string;
  updated_at: string;
};

export type ProductivityWorkerSummaryRow = {
  worker_id?: number | null;
  worker_code?: string | null;
  worker_name?: string | null;
  total_entries: number;
  total_target: number;
  total_actual: number;
  total_rework: number;
  efficiency: number;
};

export type ProductivityLineSummaryRow = {
  line_id?: number | null;
  line_name?: string | null;
  total_entries: number;
  total_target: number;
  total_actual: number;
  total_rework: number;
  efficiency: number;
};

export type WorkerOrderOutputRow = {
  worker_id?: number | null;
  worker_code?: string | null;
  worker_name?: string | null;
  order_id?: number | null;
  order_code?: string | null;
  line_id?: number | null;
  line_name?: string | null;
  total_entries: number;
  total_target: number;
  total_actual: number;
  total_rework: number;
  efficiency: number;
};

export type ProductivitySummaryResponse = {
  summary: {
    total_entries: number;
    total_target: number;
    total_actual: number;
    total_rework: number;
    overall_efficiency: number;
  };
  worker_summary: ProductivityWorkerSummaryRow[];
  line_summary: ProductivityLineSummaryRow[];
};

export type DefectType = {
  id: number;
  name: string;
  code: string;
  severity: Severity;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QualityInspectionDefect = {
  id?: number;
  defect_type: number;
  defect_code?: string;
  defect_name?: string;
  severity?: Severity;
  quantity: number;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
};

export type QualityInspection = {
  id: number;
  order: number;
  order_code?: string;
  production_line?: number | null;
  line_name?: string | null;
  inspector: number;
  inspector_name?: string;
  inspection_stage: InspectionStage;
  date: string;
  checked_qty: number;
  passed_qty: number;
  defective_qty: number;
  rejected_qty: number;
  rework_qty: number;
  defect_rate?: number;
  rejection_rate?: number;
  remarks?: string;
  barcode_value?: string | null;
  defects?: QualityInspectionDefect[];
  created_at: string;
  updated_at: string;
};

export type DefectTrendRow = {
  defect_type_id?: number | null;
  defect_code?: string | null;
  defect_name?: string | null;
  severity?: Severity | null;
  total_quantity: number;
};

export type RejectionTrendRow = {
  date: string;
  inspections: number;
  checked_qty: number;
  defective_qty: number;
  rejected_qty: number;
  rework_qty: number;
  defect_rate: number;
  rejection_rate: number;
};

export type QualitySummaryResponse = {
  summary: {
    total_inspections: number;
    total_checked: number;
    total_passed: number;
    total_defective: number;
    total_rejected: number;
    total_rework: number;
    defect_rate: number;
    rejection_rate: number;
  };
  top_defects: DefectTrendRow[];
  rejection_trends: RejectionTrendRow[];
};

export type ProductionPlan = {
  id: number;
  order: number;
  order_code?: string;
  production_line: number;
  line_name?: string;
  planned_start_date: string;
  planned_end_date: string;
  planned_daily_target: number;
  planned_total_qty: number;
  remarks?: string;
  created_by?: number | null;
  created_by_detail?: User;
  created_at: string;
  updated_at: string;
};

export type ProductionPlanCalendarRow = {
  plan_id: number;
  order_id: number;
  order_code: string;
  line_id: number;
  line_name: string;
  planned_start_date: string;
  planned_end_date: string;
  planned_daily_target: number;
  planned_total_qty: number;
  remarks?: string;
};

export type PlannedVsActualRow = {
  plan_id: number;
  order_id: number;
  order_code: string;
  line_id: number;
  line_name: string;
  planned_start_date: string;
  planned_end_date: string;
  planned_daily_target: number;
  planned_total_qty: number;
  actual_total_qty: number;
  variance_qty: number;
  achievement_percent: number;
  plan_status: PlanStatus;
};

export type PlanningSummary = {
  total_plans: number;
  total_planned_qty: number;
  total_actual_qty: number;
  total_variance_qty: number;
  achievement_percent: number;
  completed_plans: number;
  behind_plans: number;
};

export type ProductionReportSummary = {
  total_entries: number;
  total_target: number;
  total_produced: number;
  total_rejected: number;
};

export type OrdersReportSummary = {
  total_orders: number;
  total_quantity: number;
  completed_orders: number;
  delayed_orders: number;
  in_progress_orders: number;
};

export type InventoryReportSummary = {
  total_materials: number;
  total_current_stock: DecimalLike;
  low_stock_count: number;
  low_stock_threshold: DecimalLike;
};

export type ConsumptionReportSummary = {
  total_rows: number;
  orders_covered: number;
  materials_covered: number;
  total_actual_consumption: DecimalLike;
};

export type ProductivityReportSummary = ProductivitySummaryResponse["summary"] & {
  line_summary: ProductivityLineSummaryRow[];
  worker_summary: ProductivityWorkerSummaryRow[];
};

export type QualityReportSummary = QualitySummaryResponse["summary"] & {
  top_defects: DefectTrendRow[];
  rejection_trends: RejectionTrendRow[];
};

export type InventoryReportRow = MaterialStockSummaryRow;
export type ConsumptionReportRow = ConsumptionVarianceRow;
export type ProductivityReportRow = WorkerOrderOutputRow;

export type QualityReportRow = {
  inspection_id: number;
  date: string;
  order_id?: number | null;
  order_code?: string | null;
  line_id?: number | null;
  line_name?: string | null;
  inspector_id?: number | null;
  inspector_name?: string | null;
  inspection_stage: InspectionStage;
  checked_qty: number;
  defective_qty: number;
  rejected_qty: number;
  rework_qty: number;
  defect_rate: number;
  rejection_rate: number;
};

export type PlanningReportRow = PlannedVsActualRow;

export type CRMModuleKey =
  | "lead"
  | "opportunity"
  | "task"
  | "order"
  | "support_ticket"
  | "approval"
  | "collection"
  | "procurement";

export type CRMTagEntity = {
  id: number;
  name: string;
  slug: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CRMPipelineStageEntity = {
  id: number;
  pipeline: number;
  key: string;
  name: string;
  description?: string;
  color: string;
  sort_order: number;
  probability: number;
  is_closed_won: boolean;
  is_closed_lost: boolean;
  is_active: boolean;
  wip_limit?: number | null;
  required_fields: string[];
  allowed_from_stage_ids: number[];
  created_at: string;
  updated_at: string;
};

export type CRMPipelineEntity = {
  id: number;
  module_key: CRMModuleKey;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  stages?: CRMPipelineStageEntity[];
  created_at: string;
  updated_at: string;
};

export type CRMAccount = {
  id: number;
  account_number?: string | null;
  name: string;
  legal_name?: string;
  display_name: string;
  account_type: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  gst_number?: string;
  tax_identifier?: string;
  annual_revenue?: DecimalLike | null;
  employee_count?: number | null;
  ownership_type?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  billing_address?: Record<string, unknown>;
  shipping_address?: Record<string, unknown>;
  assigned_to?: number | null;
  assigned_to_detail?: User;
  account_manager?: number | null;
  account_manager_detail?: User;
  description?: string;
  status: string;
  custom_fields?: Record<string, unknown>;
  tags?: CRMTagEntity[];
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMContact = {
  id: number;
  contact_number?: string | null;
  first_name: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  designation?: string;
  department?: string;
  linked_account?: number | null;
  linked_account_name?: string;
  linked_lead?: number | null;
  assigned_to?: number | null;
  assigned_to_detail?: User;
  birthday?: string | null;
  linkedin?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  preferred_contact_mode: string;
  is_primary_contact: boolean;
  notes_summary?: string;
  custom_fields?: Record<string, unknown>;
  tags?: CRMTagEntity[];
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMLead = {
  id: number;
  lead_number?: string | null;
  first_name: string;
  last_name?: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  website?: string;
  job_title?: string;
  source: string;
  source_details?: string;
  status: string;
  priority: string;
  estimated_value?: DecimalLike | null;
  expected_close_date?: string | null;
  lead_score?: number | null;
  industry?: string;
  description?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  assigned_to?: number | null;
  assigned_to_detail?: User;
  team?: number | null;
  pipeline?: number | null;
  pipeline_name?: string;
  stage?: number | null;
  stage_name?: string;
  kanban_position: number;
  is_converted: boolean;
  converted_to_contact?: number | null;
  converted_to_account?: number | null;
  converted_to_opportunity?: number | null;
  converted_at?: string | null;
  lost_reason?: string;
  custom_fields?: Record<string, unknown>;
  last_activity_at?: string | null;
  next_follow_up_at?: string | null;
  is_archived: boolean;
  tags?: CRMTagEntity[];
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMOpportunity = {
  id: number;
  opportunity_number?: string | null;
  name: string;
  linked_account?: number | null;
  linked_account_name?: string;
  linked_contact?: number | null;
  linked_lead?: number | null;
  assigned_to?: number | null;
  assigned_to_detail?: User;
  deal_value: DecimalLike;
  weighted_value?: DecimalLike | null;
  currency: string;
  pipeline?: number | null;
  pipeline_name?: string;
  stage?: number | null;
  stage_name?: string;
  probability: number;
  expected_close_date?: string | null;
  source: string;
  description?: string;
  priority: string;
  loss_reason?: string;
  win_reason?: string;
  competitors?: string;
  campaign?: string;
  custom_fields?: Record<string, unknown>;
  last_activity_at?: string | null;
  next_follow_up_at?: string | null;
  closed_at?: string | null;
  is_won: boolean;
  is_lost: boolean;
  is_archived: boolean;
  is_blocked: boolean;
  kanban_position: number;
  tags?: CRMTagEntity[];
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMActivity = {
  id: number;
  activity_type: string;
  subject: string;
  description?: string;
  related_lead?: number | null;
  related_account?: number | null;
  related_contact?: number | null;
  related_opportunity?: number | null;
  due_at?: string | null;
  completed_at?: string | null;
  status: string;
  assigned_to?: number | null;
  assigned_to_detail?: User;
  outcome?: string;
  reminder_at?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMTask = {
  id: number;
  task_number?: string | null;
  title: string;
  description?: string;
  related_lead?: number | null;
  related_account?: number | null;
  related_contact?: number | null;
  related_opportunity?: number | null;
  priority: string;
  status: string;
  due_date: string;
  start_date?: string | null;
  completed_at?: string | null;
  assigned_to?: number | null;
  assigned_to_detail?: User;
  assigned_by?: number | null;
  pipeline?: number | null;
  stage?: number | null;
  stage_name?: string;
  kanban_position: number;
  tags?: CRMTagEntity[];
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMNote = {
  id: number;
  body: string;
  is_internal: boolean;
  related_lead?: number | null;
  related_account?: number | null;
  related_contact?: number | null;
  related_opportunity?: number | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMQuotationItem = {
  id?: number;
  item_code?: string;
  item_name: string;
  description?: string;
  quantity: DecimalLike;
  unit_price: DecimalLike;
  discount_percent: DecimalLike;
  tax_percent: DecimalLike;
  line_total?: DecimalLike;
};

export type CRMQuotation = {
  id: number;
  quote_number?: string | null;
  related_opportunity: number;
  related_account?: number | null;
  related_contact?: number | null;
  status: string;
  quote_date: string;
  valid_until?: string | null;
  subtotal?: DecimalLike;
  discount_total?: DecimalLike;
  tax_total?: DecimalLike;
  grand_total?: DecimalLike;
  currency: string;
  terms?: string;
  notes?: string;
  attachment_url?: string;
  converted_order?: number | null;
  items?: CRMQuotationItem[];
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type CRMKanbanCard = {
  id: number;
  title: string;
  subtitle?: string;
  value?: DecimalLike | null;
  owner?: { id: number; name: string; role?: string } | null;
  priority?: string | null;
  tags?: { id: number; name: string; color?: string }[];
  due_at?: string | null;
  is_blocked?: boolean;
  next_action?: string | null;
  last_activity_at?: string | null;
  stage_id?: number | null;
  position?: number;
  updated_at?: string;
};

export type CRMKanbanColumn = {
  stage: {
    id: number;
    key: string;
    name: string;
    color: string;
    probability: number;
    is_closed_won: boolean;
    is_closed_lost: boolean;
    wip_limit?: number | null;
  };
  count: number;
  has_more: boolean;
  cards: CRMKanbanCard[];
};

export type CRMKanbanBoardResponse = {
  meta: {
    module_key: CRMModuleKey;
    organization_key: string;
    pipeline: { id: number; name: string } | null;
    applied_filters: Record<string, unknown>;
    allowed_actions: { move: boolean; bulk: boolean };
  };
  summary: {
    total_cards: number;
    total_value: string;
    open_cards: number;
  };
  columns: CRMKanbanColumn[];
};

export type CRMTimelineEntry = {
  type: "audit" | "activity" | "note" | "task" | "quotation";
  action: string;
  label: string;
  actor: string;
  timestamp: string;
  details: Record<string, unknown>;
};

export type CRMDashboardSummary = {
  total_leads: number;
  leads_by_status: Array<{ status: string; count: number }>;
  leads_by_source: Array<{ source: string; count: number }>;
  leads_by_owner: Array<{
    assigned_to_id: number | null;
    assigned_to__first_name?: string;
    assigned_to__last_name?: string;
    assigned_to__username?: string;
    count: number;
  }>;
  opportunities_by_stage: Array<{
    stage_id: number | null;
    stage__name?: string;
    count: number;
    value?: DecimalLike | null;
    weighted?: DecimalLike | null;
  }>;
  pipeline_value: DecimalLike;
  weighted_pipeline_value: DecimalLike;
  won_deals: number;
  lost_deals: number;
  open_deals: number;
  conversion_rate: number;
  upcoming_followups: number;
  overdue_activities: number;
  top_performers: Array<{
    assigned_to_id: number | null;
    assigned_to__first_name?: string;
    assigned_to__last_name?: string;
    assigned_to__username?: string;
    won_count: number;
    total_value?: DecimalLike | null;
  }>;
};

export type CRMFilterMetadata = {
  sources: Array<{ key: string; label: string }>;
  lead_statuses: Array<{ key: string; label: string }>;
  priorities: Array<{ key: string; label: string }>;
  pipelines: Array<{ id: number; module_key: CRMModuleKey; name: string; is_default: boolean }>;
  tags: Array<{ id: number; name: string; color: string }>;
  owners: User[];
  module_keys: CRMModuleKey[];
};
