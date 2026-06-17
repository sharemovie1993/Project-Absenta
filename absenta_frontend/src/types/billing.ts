// Billing Types based on BILLING_MODULE_API.md

// Billing Status Constants
export const BillingStatus = {
  UNPAID: "UNPAID",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED"
} as const;

export type BillingStatus = typeof BillingStatus[keyof typeof BillingStatus];

// Billing Data Structure
import type { InvoiceStatus } from './invoice';

export interface Billing {
  id: string;
  subscription_id: string;
  charge_type?: 'RECURRING' | 'UPGRADE' | 'ONE_TIME_FEE';
  amount: number;
  billing_date: string;
  // Backend Prisma tidak memiliki due_date pada Billing; ini properti turunan/UI
  due_date?: string;
  // Status Billing (UNPAID/PAID/OVERDUE) adalah derivasi; tidak dijamin dari backend
  status?: BillingStatus;
  payment_method: string | null;
  payment_reference: string | null;
  // paid_at pada Billing adalah turunan dari Payment/Invoice
  paid_at?: string | null;
  // invoice_number milik Invoice; bisa di-enrich pada payload Billing
  invoice_number?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Relasi ke Invoice untuk mengambil status yang menjadi sumber kebenaran
  Invoice?: {
    id: string;
    invoice_number: string;
    status: InvoiceStatus;
    due_date?: string | null;
    paid_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Subscription?: {
    id: string;
    tenant_id: string;
    plan_id: string;
    start_date: string;
    end_date: string;
    status: string;
    Tenant: {
      id: string;
      name: string;
      domain: string | null;
      email?: string;
    };
    // Backend biasanya mengirim relation sebagai Plan (uppercase)
    Plan?: {
      id: string;
      name: string;
      plan_name?: string;
    };
  };
}

// API Response Types
export interface BillingResponse {
  success: boolean;
  message: string;
  data: Billing;
}

export interface BillingsResponse {
  success: boolean;
  message: string;
  data: Billing[];
}

// Billing Statistics
export interface BillingStats {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  overdue_amount: number;
  total_count: number;
  paid_count: number;
  unpaid_count: number;
  overdue_count: number;
}

export interface BillingStatsResponse {
  success: boolean;
  message: string;
  data: BillingStats;
}

// Request Types
export interface CreateBillingRequest {
  subscription_id: string;
  amount: number;
  billing_date: string;
  // due_date digunakan saat pembuatan invoice dari billing (turunan/UI)
  due_date?: string;
  payment_method?: string;
  payment_reference?: string;
}

export interface UpdateBillingRequest {
  amount?: number;
  billing_date?: string;
  // Field turunan tidak wajib ada di backend
  due_date?: string;
  status?: BillingStatus;
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
}

export interface MarkPaidRequest {
  payment_method: string;
  payment_reference: string;
  paid_at?: string;
}

export interface GenerateMonthlyBillingRequest {
  subscription_id: string;
  month: number;
  year: number;
}

// Query Parameters
export interface BillingQueryParams {
  // Selaraskan dengan backend: status filter mengikuti InvoiceStatus,
  // namun pertahankan kompatibilitas dengan BillingStatus untuk pemanggilan lama.
  status?: InvoiceStatus | BillingStatus;
  tenant_id?: string;
  limit?: number;
  search?: string;
}

// UI Helper Types
export interface BillingTableColumn {
  key: keyof Billing | 'actions';
  label: string;
  sortable?: boolean;
  render?: (value: any, billing: Billing) => React.ReactNode;
}

export interface BillingFilter {
  // UI filter dapat memilih 'ALL' atau salah satu InvoiceStatus/BillingStatus
  status: InvoiceStatus | BillingStatus | 'ALL';
  search: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// ===== PLAN MANAGEMENT TYPES =====

export interface Plan {
  id: string;
  name: string;
  service_code?: string;
  description?: string;
  price?: number; // For backward compatibility
  price_monthly: number; // Backend field
  price_yearly?: number; // Backend field (optional)
  currency: string;
  billing_cycle?: 'MONTHLY' | 'YEARLY';
  max_users?: number; // For backward compatibility
  max_user: number | null; // Backend field
  max_students?: number;
  features: string | null; // Backend returns string, not array
  features_json?: any; // Backend optional structured JSON
  trial_days?: number; // Backend optional trial length in days
  absensi_mode?: 'SIMPLE' | 'MULTI_SESI'; // Patch A: Added to Plan
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    subscriptions: number;
  };
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  price_monthly: number;
  currency?: string;
  max_user?: number;
  features?: string;
  is_active?: boolean;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price_monthly?: number;
  currency?: string;
  max_user?: number;
  features?: string;
  is_active?: boolean;
}

export interface PlanAnalytics {
  most_popular_plan: {
    plan: Plan;
    subscription_count: number;
  };
  highest_revenue_plan: {
    plan: Plan;
    total_revenue: number;
  };
  conversion_rate: number;
  churn_rate_by_plan: {
    plan_id: string;
    plan_name: string;
    churn_rate: number;
  }[];
}

// ===== SUBSCRIPTION MANAGEMENT TYPES =====

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  service_code?: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'PENDING_PAYMENT' | 'UPGRADE_PENDING';
  auto_renew: boolean;
  next_billing_date?: string | null;
  cancel_date?: string | null;
  created_at: string;
  updated_at: string;
  Tenant?: {
    id: string;
    name: string;
    domain: string | null;
    email?: string;
  };
  Plan?: Plan;
  // Alias kompatibilitas untuk payload yang menggunakan lowercase 'plan'
  plan?: Plan;
  plan_snapshot?: Plan; // Snapshot plan saat subscription aktif
  // Relations
  billings?: Billing[];
  invoices?: any[]; // Typing loose to avoid circular dep
  payments?: any[]; // Typing loose
}

export interface CreateSubscriptionRequest {
  tenant_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CANCELED'
    | 'CANCELLED'
    | 'SUSPENDED'
    | 'TRIAL'
    | 'PENDING_PAYMENT'
    | 'BLOCKED'
    | 'UPGRADE_PENDING';
  auto_renew: boolean;
}

export interface UpdateSubscriptionRequest {
  plan_id?: string;
  end_date?: string;
  status?:
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CANCELED'
    | 'CANCELLED'
    | 'SUSPENDED'
    | 'TRIAL'
    | 'PENDING_PAYMENT'
    | 'BLOCKED'
    | 'UPGRADE_PENDING';
  auto_renew?: boolean;
}

// Subscription Response Types
export interface SubscriptionResponse {
  success: boolean;
  message: string;
  data?: Subscription;
}

export interface SubscriptionsResponse {
  success: boolean;
  message: string;
  data: {
    subscriptions: Subscription[];
    pagination?: PaginationInfo;
  };
}

export interface SubscriptionAnalytics {
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  cancelled_subscriptions?: number;
  monthly_recurring_revenue: number;
  churn_rate: number;
  conversion_rate: number;
  average_subscription_value: number;
  expiring_this_month: number;
  auto_renewal_rate: number;
  average_subscription_duration: number;
  subscription_growth: {
    month: string;
    new_subscriptions: number;
    renewals: number;
    cancellations: number;
  }[];
}

// ===== FINANCIAL METRICS TYPES =====

// ===== SUBSCRIPTION HISTORY TYPES =====
export interface SubscriptionHistoryItem {
  id: string;
  subscription_id: string;
  plan_name: string | null;
  plan: { price_monthly: number | null };
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  changed_at: string;
  changed_by: string | null;
  reason: string | null;
  old_plan_id: string | null;
  new_plan_id: string | null;
}

export interface FinancialMetrics {
  total_revenue: number;
  monthly_recurring_revenue: number;
  average_revenue_per_user: number;
  revenue_growth_rate: number;
  payment_success_rate: number;
  churn_rate: number;
  lifetime_value: number;
  revenue_by_month: {
    month: string;
    revenue: number;
    growth_rate: number;
  }[];
}

export interface PaymentGatewayPerformance {
  gateway_name: string;
  success_rate: number;
  total_volume: number;
  total_amount: number;
  average_processing_time: number;
  failed_transactions: number;
}

export interface RevenueReport {
  period: string;
  total_revenue: number;
  subscription_revenue: number;
  one_time_revenue: number;
  refunds: number;
  net_revenue: number;
  revenue_by_plan: {
    plan_name: string;
    revenue: number;
    percentage: number;
  }[];
}

export interface PaymentAnalysis {
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  total_amount: number;
  average_transaction_value: number;
  payment_methods: {
    method: string;
    count: number;
    amount: number;
    success_rate: number;
  }[];
}

// ===== BILLING LAYOUT TYPES =====

export interface BillingLayoutProps {
  title: string;
  subtitle?: string;
  showOverview?: boolean;
  children: React.ReactNode;
}

export interface BillingOverviewMetrics {
  total_revenue: number;
  monthly_billings: number;
  pending_payments: number;
  growth_rate: number;
}

export interface BillingTabItem {
  key: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
}

// ===== INVOICE MANAGEMENT TYPES =====

export interface Invoice {
  id: string;
  billing_id: string;
  invoice_number: string;
  tenant_id: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  pdf_url?: string;
  sent_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  billing: Billing;
  tenant: {
    id: string;
    name: string;
    email: string;
    address?: string;
    tax_id?: string;
  };
}

export interface CreateInvoiceRequest {
  billing_id: string;
  tax_rate?: number;
  notes?: string;
}

// InvoiceTemplate definition moved to line 632 to avoid duplication

// ===== NOTIFICATION TYPES =====

export interface BillingNotification {
  id: string;
  type: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'INVOICE_SENT' | 'SUBSCRIPTION_EXPIRING' | 'BILLING_OVERDUE';
  title: string;
  message: string;
  tenant_id?: string;
  billing_id?: string;
  subscription_id?: string;
  is_read: boolean;
  created_at: string;
}



// Subscription Request Types
// (Duplikat Create/UpdateSubscriptionRequest dan response dihapus; gunakan definisi tunggal di atas)

// ===== FILTER AND SEARCH TYPES =====

export interface BillingFilters {
  status?: BillingStatus | 'ALL';
  gateway?: string | 'ALL';
  date_range?: {
    start: string;
    end: string;
  };
  amount_range?: {
    min: number;
    max: number;
  };
  search?: string;
}

export interface SubscriptionFilters {
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'CANCELLED' | 'SUSPENDED' | 'TRIAL' | 'PENDING_PAYMENT' | 'BLOCKED' | 'ALL';
  plan_id?: string | 'ALL';
  auto_renew?: boolean | 'ALL';
  search?: string;
}

export interface PaymentFilters {
  status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ALL';
  gateway?: string | 'ALL';
  date_range?: {
    start: string;
    end: string;
  };
  amount_range?: {
    min: number;
    max: number;
  };
  search?: string;
}

// ===== API RESPONSE TYPES =====

export interface PlansResponse {
  success: boolean;
  message: string;
  data: Plan[];
}

export interface PlanResponse {
  success: boolean;
  message: string;
  data: Plan;
}



// Dashboard Types
export interface DashboardFinancialMetrics {
  total_revenue: number;
  monthly_revenue: number;
  daily_revenue: number;
  revenue_growth: number;
  total_billings: number;
  pending_billings: number;
  overdue_billings: number;
  paid_billings: number;
  payment_success_rate: number;
  failed_payments: number;
  active_subscriptions: number;
  subscription_growth: number;
  average_revenue_per_user: number;
  churn_rate: number;
}

export interface DashboardNotification {
  id: string;
  type: 'payment_failed' | 'subscription_expiring' | 'payment_due' | 'system_alert';
  title: string;
  message: string;
  tenant_id?: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

// Reports Types
export interface ReportData {
  total_revenue: number;
  monthly_revenue: number;
  revenue_growth: number;
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  success_rate: number;
  average_transaction_value: number;
  top_performing_plans: Array<{
    plan_name: string;
    revenue: number;
    subscribers: number;
  }>;
  revenue_by_month: Array<{
    month: string;
    revenue: number;
  }>;
}

export interface ReportFilters {
  report_type: 'revenue' | 'subscription' | 'payment' | 'churn';
  date_range: 'last_7_days' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';
  start_date: string;
  end_date: string;
  tenant_ids: string[];
  plan_ids: string[];
  status: 'all' | 'active' | 'inactive' | 'pending';
}

export interface PaymentGatewayStats {
  gateway_name: string;
  success_rate: number;
  volume_percentage: number;
  total_revenue: number;
  average_processing_time: number;
  failed_transactions: number;
}

export interface SubscriptionTrends {
  new_subscriptions: number;
  renewals: number;
  cancellations: number;
  upgrades: number;
  downgrades: number;
  churn_rate: number;
  growth_rate: number;
  lifetime_value: number;
  monthly_trends: Array<{
    month: string;
    new: number;
    renewals: number;
    cancellations: number;
  }>;
}

export interface RevenueBreakdown {
  by_plan: Array<{
    plan_name: string;
    revenue: number;
    percentage: number;
  }>;
  by_region: Array<{
    region: string;
    revenue: number;
    percentage: number;
  }>;
  by_payment_method: Array<{
    method: string;
    revenue: number;
    percentage: number;
  }>;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data: {
    metrics: DashboardFinancialMetrics;
    notifications: DashboardNotification[];
    recent_activities: Billing[];
  };
}

export interface BillingHealthSummary {
  active_without_paid_invoice_count: number;
  paid_not_applied_count: number;
  invalid_invoice_period_count: number;
  webhook_failures_last_1h: number;
  reconciliation_fix_count_last_1h: number;
}

export interface BillingHealthSummaryResponse {
  success: boolean;
  message?: string;
  data: BillingHealthSummary;
}



export interface FinancialMetricsResponse {
  success: boolean;
  message: string;
  data: FinancialMetrics;
}

// InvoicesResponse dan InvoiceResponse sudah didefinisikan di types/invoice.ts

// ===== ENHANCED INVOICE MANAGEMENT TYPES =====

export interface InvoiceEmailHistory {
  sent_at: string;
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  subject?: string;
  error_message?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  html_content: string;
  css_styles: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  sent_count: number;
  draft_count: number;
  paid_count: number;
  overdue_count: number;
  average_payment_time: number;
}

export interface InvoiceFilters {
  status: string;
  date_range: string;
  start_date: string;
  end_date: string;
  tenant_id: string;
  search: string;
}

// CreateInvoiceRequest sudah didefinisikan di atas (line 362)

export interface SendInvoiceRequest {
  email: string;
  subject: string;
  message: string;
  send_copy?: boolean;
  schedule_date?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  html_content: string;
  css_styles: string;
  variables: string[];
  is_default: boolean;
}
