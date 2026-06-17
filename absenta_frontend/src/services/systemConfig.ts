import axiosInstance from '@/lib/axiosInstance';

export interface SystemConfigResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface SystemConfigPayload {
  tenant_id?: string | null;
  app_name?: string | null;
  default_language?: string | null;
  timezone?: string | null;
  date_format?: string | null;
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
  stripe_enabled?: boolean;
  midtrans_enabled?: boolean;
  midtrans_environment?: string | null;
  xendit_enabled?: boolean;
  tripay_enabled?: boolean;
  notif_email_new_payment?: boolean;
  notif_email_payment_failed?: boolean;
  notif_email_subscription_expired?: boolean;
  notif_email_monthly_summary?: boolean;
  webhook_payment_status?: boolean;
  webhook_subscription_changes?: boolean;
  webhook_billing_events?: boolean;
  session_timeout_minutes?: number;
  two_factor_enabled?: boolean;
  login_attempt_monitoring?: boolean;
  backup_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  log_retention_days?: number;
  max_upload_mb?: number;
  api_rate_limit_per_minute?: number;
  default_late_threshold?: number;
  default_notap_threshold?: number;
  is_pkp?: boolean;
  ppn_rate?: number;
  // Company Identity
  company_legal_name?: string | null;
  company_trade_name?: string | null;
  company_npwp?: string | null;
  company_address?: string | null;
  company_email_billing?: string | null;
  company_phone_billing?: string | null;
  company_bank_name?: string | null;
  company_bank_account?: string | null;
  company_bank_holder?: string | null;
  company_logo_url?: string | null;
  company_signature_name?: string | null;
  company_signature_title?: string | null;
  is_active?: boolean;

   // Parent App Feature Flags
  parent_app_enabled?: boolean;
  parent_app_dashboard_enabled?: boolean;
  parent_app_attendance_history_enabled?: boolean;
  parent_app_notifications_enabled?: boolean;
  parent_app_monthly_recap_enabled?: boolean;
  parent_app_daily_tracking_enabled?: boolean;
  parent_app_report_absence_enabled?: boolean;
  license?: {
    is_active: boolean;
    school_name: string;
  } | null;
}

export type SystemConfig = SystemConfigPayload;

export const fetchActiveSystemConfig = async (): Promise<SystemConfig | null> => {
  const { data } = await axiosInstance.get<SystemConfigResponse<SystemConfig>>('/system/config');
  const cfg = data?.data || null;
  try {
    const tz = cfg?.timezone;
    if (tz) localStorage.setItem('active_timezone', String(tz));
    const appName = cfg?.app_name;
    document.title = String(appName || 'Absenta.id');
    if (cfg) localStorage.setItem('active_system_config', JSON.stringify(cfg));
  } catch {}
  return cfg;
};

export const saveSystemConfig = async (payload: SystemConfigPayload): Promise<SystemConfig> => {
  const { data } = await axiosInstance.put<SystemConfigResponse<SystemConfig>>('/system/config', payload);
  return data?.data;
};

// Apply branding styles based on active system config
import absentaLogo from '@/assets/absenta-logo.svg';

export function applyBrandingFromConfig(cfg: SystemConfig | null) {
  const root = document.documentElement;
  const isDark = root.getAttribute('data-theme') === 'dark';
  const isDarkDefaultVariant = root.getAttribute('data-dark-variant') === 'default';

  const upsertVar = (name: string, value?: string | null) => {
    const v = typeof value === 'string' ? value.trim() : '';
    if (v) root.style.setProperty(name, v);
    else root.style.removeProperty(name);
  };

  if (!isDark || !isDarkDefaultVariant) {
    upsertVar('--color-primary', cfg?.primary_color);
    upsertVar('--color-secondary', cfg?.secondary_color);
    upsertVar('--color-accent', cfg?.accent_color);
  } else {
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-secondary');
    root.style.removeProperty('--color-accent');
  }

  const favicon = cfg?.favicon_url || '/favicon.png';
  if (favicon) {
    let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = String(favicon);
  }

  // Dynamic SEO & Meta Update
  const updateMeta = (name: string, content?: string | null, isProperty = false) => {
    if (!content) return;
    const selector = isProperty ? `meta[property='${name}']` : `meta[name='${name}']`;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (isProperty) el.setAttribute('property', name);
      else el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const appName = cfg?.app_name || 'Absenta.id';
  const tagline = cfg?.tagline || 'Sistem Presensi Sekolah Cerdas';
  const desc = cfg?.description || 'Manajemen kehadiran sekolah yang modern, ringan, dan akurat.';

  updateMeta('description', desc);
  updateMeta('og:title', `${appName} — ${tagline}`, true);
  updateMeta('og:description', desc, true);
  
  if (cfg?.app_name) {
    document.title = `${cfg.app_name} — ${tagline}`;
  }
}

export async function loadActiveSystemConfig(): Promise<SystemConfig | null> {
  const cfg = await fetchActiveSystemConfig();
  try { applyBrandingFromConfig(cfg); } catch {}
  return cfg;
}
