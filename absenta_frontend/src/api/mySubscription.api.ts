import { requestWithFallback } from "./apiUtils";
import type { Subscription, SubscriptionResponse } from "../types/subscription";
import type { Invoice } from "../types/invoice"; // Assuming invoice type exists, check later
import type { PaymentRecord as Payment } from "../types/payments";

export interface MySubscriptionResponse {
  success: boolean;
  message: string;
  data: Subscription | null;
}

export interface MyInvoicesResponse {
  success: boolean;
  message: string;
  data: Invoice[];
}

export interface MyPaymentsResponse {
  success: boolean;
  message: string;
  data: Payment[];
}

export async function getMySubscription(): Promise<MySubscriptionResponse> {
  return requestWithFallback<MySubscriptionResponse>('get', '/me/subscription', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function syncMySubscription(): Promise<MySubscriptionResponse> {
  return requestWithFallback<MySubscriptionResponse>('post', '/me/subscription/sync', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getMyInvoices(): Promise<MyInvoicesResponse> {
  return requestWithFallback<MyInvoicesResponse>('get', '/billing/my-subscription/invoices', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getMyPayments(): Promise<MyPaymentsResponse> {
  return requestWithFallback<MyPaymentsResponse>('get', '/billing/my-subscription/payments', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function getInvoiceDownloadUrl(invoiceId: string): Promise<{ success: boolean; message: string; data?: { pdf_url: string } }> {
  return requestWithFallback<{ success: boolean; message: string; data?: { pdf_url: string } }>('get', `/invoice/${invoiceId}/download`, {
    headers: { 'Accept': 'application/json' }
  });
}

export async function getPublicInvoiceLink(invoiceId: string): Promise<{ success: boolean; message: string; data?: { url: string; token: string } }> {
  try {
    return await requestWithFallback<{ success: boolean; message: string; data?: { url: string; token: string } }>('get', `/invoice/${invoiceId}/public-link`);
  } catch (e: any) {
    return {
      success: false,
      message: e?.response?.data?.message || e?.message || 'Gagal mendapatkan link invoice publik'
    };
  }
}

export function getInvoicePrintUrl(invoiceId: string): string {
  const cleanId = encodeURIComponent(String(invoiceId || '').replace(/^#/, '').trim());
  return `/api/invoice/${cleanId}/print`;
}

export async function toggleAutoRenew(subscriptionId: string, autoRenew: boolean): Promise<{ success: boolean; message: string; data?: any }> {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('patch', `/billing/my-subscription/${subscriptionId}/auto-renew`, {
    data: { auto_renew: autoRenew }
  });
}

export async function getPaymentChannels(productId: string = 'cakola'): Promise<{ success: boolean; message: string; data?: any[] }> {
  return requestWithFallback<{ success: boolean; message: string; data?: any[] }>('get', `/billing/payment-channels?productId=${encodeURIComponent(productId)}`);
}

export interface PackageMatrixData {
  context: {
    service_id?: string;
    is_master_package: boolean;
    plan_name: string;
    variant: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
    target_module: string;
    capacity: string;
    status: string;
    end_date?: string;
    created_at?: string;
  };
  columns: {
    id: string;
    name: string;
    shortDesc: string;
    icon: string;
  }[];
  tiers: {
    tier: 'Micro' | 'Small' | 'Medium' | 'Large' | 'Enterprise';
    capacity: string;
    badge?: string;
    description: string;
    is_current_tier: boolean;
    modules: Record<string, {
      included_in_bundle: boolean;
      is_active_for_tenant: boolean;
      is_cross_owned?: boolean;
      status_code: 'ACTIVE' | 'CROSS_ACTIVE' | 'AVAILABLE_IN_BUNDLE' | 'NOT_INCLUDED';
      tooltip: string;
    }>;
  }[];
}

export async function getMySubscriptionMatrix(serviceId?: string): Promise<{ success: boolean; message: string; data?: PackageMatrixData }> {
  const query = serviceId ? `?service_id=${encodeURIComponent(serviceId)}` : '';
  return requestWithFallback<{ success: boolean; message: string; data?: PackageMatrixData }>('get', `/me/subscription/matrix${query}`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
