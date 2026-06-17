import { requestWithFallback } from "./apiUtils";

// Types for Billing Settings
export interface BillingSettings {
  company_name: string;
  tax_id: string;
  default_currency: string;
  billing_cycle: 'monthly' | 'quarterly' | 'annually';
  company_address: string;
  auto_generate_bills: boolean;
  // Generate invoice otomatis dari billing baru
  auto_generate_invoices_from_billing?: boolean;
  auto_send_invoices: boolean;
  payment_reminders: boolean;
  auto_suspend_overdue: boolean;
  email_notifications: {
    new_payment: boolean;
    payment_failed: boolean;
    subscription_expired: boolean;
    monthly_summary: boolean;
  };
  webhook_notifications: {
    payment_status: boolean;
    subscription_changes: boolean;
    billing_events: boolean;
  };
}

export interface PaymentGatewaySettings {
  midtrans: {
    enabled: boolean;
    server_key: string;
    client_key: string;
    environment: 'sandbox' | 'production';
    webhook_url: string;
  };
  stripe: {
    enabled: boolean;
    secret_key: string;
    publishable_key: string;
    webhook_secret: string;
    webhook_url: string;
  };
  xendit: {
    enabled: boolean;
    secret_key: string;
    public_key: string;
    callback_token: string;
    webhook_url: string;
  };
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  data: {
    billing_settings: BillingSettings;
  };
}

export interface UpdateSettingsRequest {
  billing_settings?: Partial<BillingSettings>;
}

export interface UpdateSettingsResponse {
  success: boolean;
  message: string;
  data: {
    billing_settings: BillingSettings;
  };
}

// Get Billing Settings - GET /api/billing/settings
export async function getBillingSettings(): Promise<SettingsResponse> {
  return requestWithFallback<SettingsResponse>('get', '/billing/settings');
}

// Update Billing Settings - PUT /api/billing/settings
export async function updateBillingSettings(data: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
  return requestWithFallback<UpdateSettingsResponse>('put', '/billing/settings', { data });
}

// Reset Settings to Default - POST /api/billing/settings/reset
export async function resetSettingsToDefault(): Promise<UpdateSettingsResponse> {
  return requestWithFallback<UpdateSettingsResponse>('post', '/billing/settings/reset');
}

// Test Payment Gateway Connection - POST /api/billing/settings/test-gateway
export async function testPaymentGateway(gateway: 'midtrans' | 'stripe' | 'xendit'): Promise<{
  success: boolean;
  message: string;
  data: {
    gateway: string;
    status: 'connected' | 'failed';
    error?: string;
  };
}> {
  return requestWithFallback('post', '/billing/settings/test-gateway', { data: { gateway } });
}

// Get Default Settings - GET /api/billing/settings/defaults
export async function getDefaultSettings(): Promise<SettingsResponse> {
  return requestWithFallback<SettingsResponse>('get', '/billing/settings/defaults');
}

// Helper functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateTaxId(taxId: string): boolean {
  // Basic NPWP validation (15 digits)
  const npwpRegex = /^\d{15}$/;
  return npwpRegex.test(taxId.replace(/[.-]/g, ''));
}
