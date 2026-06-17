import { requestWithFallback } from "./apiUtils";

export interface SystemConfig {
  id: string;
  tenant_id: string | null;
  // General
  app_name?: string | null;
  default_language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
  // Branding
  tagline?: string | null;
  description?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  favicon_url?: string | null;
  logo_url?: string | null;
  footer_text?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  // Company Identity (Global Only)
  company_legal_name?: string | null;
  company_trade_name?: string | null;
  company_npwp?: string | null;
  company_address?: string | null;
  company_email_billing?: string | null;
  company_phone_billing?: string | null;
  company_logo_url?: string | null;
  company_signature_name?: string | null;
  company_signature_title?: string | null;
  // Stripe
  stripe_enabled?: boolean;
  // Midtrans
  midtrans_enabled?: boolean;
  midtrans_environment?: string | null;
  // Xendit
  xendit_enabled?: boolean;
  // Tripay
  tripay_enabled?: boolean;
  // Notifications
  notif_email_new_payment?: boolean;
  notif_email_payment_failed?: boolean;
  notif_email_subscription_expired?: boolean;
  notif_email_monthly_summary?: boolean;
  webhook_payment_status?: boolean;
  webhook_subscription_changes?: boolean;
  webhook_billing_events?: boolean;
  // Security
  session_timeout_minutes?: number;
  two_factor_enabled?: boolean;
  login_attempt_monitoring?: boolean;
  // System
  backup_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  log_retention_days?: number;
  max_upload_mb?: number;
  api_rate_limit_per_minute?: number;
  is_pkp?: boolean;
  ppn_rate?: number;
  // Parent App Feature Flags
  parent_app_enabled?: boolean;
  parent_app_dashboard_enabled?: boolean;
  parent_app_attendance_history_enabled?: boolean;
  parent_app_notifications_enabled?: boolean;
  parent_app_monthly_recap_enabled?: boolean;
  parent_app_daily_tracking_enabled?: boolean;
  parent_app_report_absence_enabled?: boolean;
  // Audit
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemConfigResponse {
  success: boolean;
  message: string;
  data: SystemConfig | null;
}

export async function getSystemConfig(): Promise<SystemConfigResponse> {
  return requestWithFallback<SystemConfigResponse>('get', '/system/config');
}
