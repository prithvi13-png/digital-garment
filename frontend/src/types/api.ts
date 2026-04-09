export type Role = "admin" | "supervisor" | "viewer";
export type Stage = "cutting" | "stitching" | "qc" | "packing" | "dispatch";
export type Status = "pending" | "in_progress" | "completed" | "delayed";
export type Priority = "low" | "medium" | "high";

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  summary?: Record<string, number>;
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
