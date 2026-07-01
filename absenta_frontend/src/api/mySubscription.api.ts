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

export async function toggleAutoRenew(subscriptionId: string, autoRenew: boolean): Promise<{ success: boolean; message: string; data?: any }> {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('patch', `/billing/my-subscription/${subscriptionId}/auto-renew`, {
    data: { auto_renew: autoRenew }
  });
}

export async function getPaymentChannels(): Promise<{ success: boolean; message: string; data?: any[] }> {
  return requestWithFallback<{ success: boolean; message: string; data?: any[] }>('get', '/billing/payment-channels');
}
