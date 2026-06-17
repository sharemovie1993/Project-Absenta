import { requestWithFallback } from "./apiUtils";
import type {
  SubscriptionsResponse,
  SubscriptionResponse,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionQueryParams,
  Subscription,
  SubscriptionAnalytics,
  RenewSubscriptionRequest,
  SubscriptionWithBillings,
  SubscriptionMetrics,
  SubscriptionHistoryItem
} from "../types/subscription";

// Types khusus untuk fitur monitor (11J.2)
export interface SubscriptionSummaryMetrics {
  total: number;
  active: number;
  expired: number;
  canceled: number;
  mrr: number;
  conversionRate: number | string;
}

export interface SubscriptionSummaryResponse {
  success: boolean;
  message?: string;
  data: SubscriptionSummaryMetrics;
}

export interface SubscriptionFilterQuery {
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'ALL';
  plan_id?: string | 'ALL';
  tenant_id?: string | 'ALL';
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FilteredSubscriptionItem extends Subscription {
  // Additional fields returned by /api/subscriptions/filter
  next_billing_date?: string | null;
  last_invoice_status?: 'PAID' | 'UNPAID' | 'OVERDUE' | 'DRAFT' | null;

  // Backend transformation may return lowercase tenant object
  tenant?: {
    id: string;
    name: string;
    domain: string | null;
    email?: string;
  };

  // Convenience string fields sometimes included by backend
  tenant_name?: string;
  tenant_email?: string;
  plan_name?: string;
  // Optional convenience fields added by frontend enrichment
  payment_method?: string | null;
  renewal_count?: number;
  // Some payloads may include lowercase plan relation
  plan?: import('../types/billing').Plan;
}

export interface SubscriptionFilterResponse {
  success: boolean;
  message?: string;
  data: {
    subscriptions: FilteredSubscriptionItem[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  };
}

// Get All Subscriptions - GET /api/billing/subscriptions (SUPERADMIN only)
export async function getAllSubscriptions(params?: SubscriptionQueryParams): Promise<SubscriptionsResponse> {
  const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
  return requestWithFallback<SubscriptionsResponse>('get', '/billing/subscriptions', {
    params: q,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Get Subscriptions by Tenant - GET /api/billing/subscriptions/tenant/:tenant_id
export async function getSubscriptionsByTenant(tenantId: string, includeInactive?: boolean): Promise<SubscriptionsResponse> {
  const params: Record<string, unknown> = includeInactive ? { include_inactive: includeInactive } : {};
  return requestWithFallback<SubscriptionsResponse>('get', `/billing/subscriptions/tenant/${tenantId}`, {
    params,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Get Active Subscription for Current Tenant - GET /api/billing/subscriptions/active
export async function getActiveSubscription(): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('get', '/billing/subscriptions/active', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Get My Subscription for Current Tenant - GET /api/me/subscription
export async function getMySubscription(): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('get', '/me/subscription', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Get Current Subscription (ACTIVE or TRIAL) - GET /api/billing/subscriptions/current
export async function getCurrentSubscription(): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('get', '/billing/subscriptions/current', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Get Subscription by ID - GET /api/billing/subscriptions/:id
export async function getSubscriptionById(id: string): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('get', `/billing/subscriptions/${id}`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Create Subscription - POST /api/billing/subscriptions (SUPERADMIN only)
export async function createSubscription(data: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('post', '/billing/subscriptions', {
    data,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Update Subscription - PUT /api/billing/subscriptions/:id (SUPERADMIN only)
export async function updateSubscription(id: string, data: UpdateSubscriptionRequest): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('put', `/billing/subscriptions/${id}`, {
    data,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Cancel Subscription - POST /api/billing/subscriptions/:id/cancel
export async function cancelSubscription(id: string): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('post', `/billing/subscriptions/${id}/cancel`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Resume Subscription - POST /api/billing/subscriptions/:id/resume
export async function resumeSubscription(id: string): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('post', `/billing/subscriptions/${id}/resume`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Renew Subscription - POST /api/billing/subscriptions/:id/renew
export async function renewSubscription(id: string, newEndDate: string): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('post', `/billing/subscriptions/${id}/renew`, {
    data: { new_end_date: newEndDate },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Check Expired Subscriptions - POST /api/billing/subscriptions/check-expired (SUPERADMIN only)
export async function checkExpiredSubscriptions(): Promise<{
  success: boolean;
  message: string;
  data: SubscriptionResponse[];
}> {
  return requestWithFallback<{ success: boolean; message: string; data: SubscriptionResponse[] }>('post', '/billing/subscriptions/check-expired', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Check existing active subscription for a tenant
// Uses GET /subscriptions/check?tenant_id= and returns ACTIVE subscription if any
export async function checkTenantSubscription(tenantId: string): Promise<Subscription | null> {
  const res = await requestWithFallback<{ success: boolean; data: Subscription | null }>('get', '/subscriptions/check', {
    params: { tenant_id: tenantId },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
  return res?.data ?? null;
}

// Get Subscription Analytics - GET /api/billing/subscriptions/analytics
export async function getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
  const res = await requestWithFallback<{ success: boolean; message: string; data: SubscriptionAnalytics }>('get', '/billing/subscriptions/analytics', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
  return res.data;
}

// Get current tenant subscriptions (multi-service) - GET /api/billing/subscriptions
export async function getMySubscriptionsList(): Promise<{ success: boolean; message?: string; data: any[] }> {
  return requestWithFallback<{ success: boolean; message?: string; data: any[] }>('get', '/billing/subscriptions', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
// Delete Subscription - DELETE /api/billing/subscriptions/:id (SUPERADMIN only)
export async function deleteSubscription(id: string): Promise<{ success: boolean; message: string; data: { deleted: boolean; id: string } }> {
  return requestWithFallback<{ success: boolean; message: string; data: { deleted: boolean; id: string } }>('delete', `/billing/subscriptions/${id}`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Helper functions
export function formatSubscriptionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'ACTIVE': 'Aktif',
    'EXPIRED': 'Kedaluwarsa',
    'CANCELLED': 'Dibatalkan',
    'CANCELED': 'Dibatalkan',
    'TRIAL': 'Trial'
  };
  return statusMap[status] || status;
}

// ===== 11J.2 Frontend Subscription Monitor APIs =====

// GET /api/subscriptions/summary
export async function getSubscriptionSummary(): Promise<SubscriptionSummaryResponse> {
  return requestWithFallback<SubscriptionSummaryResponse>('get', '/subscriptions/summary', {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// GET list via filter - /api/subscriptions/filter
export async function filterSubscriptions(query: SubscriptionFilterQuery = {}): Promise<SubscriptionFilterResponse> {
  const q: Record<string, unknown> = { ...query };
  return requestWithFallback<SubscriptionFilterResponse>('get', '/subscriptions/filter', {
    params: q,
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export function getStatusBadgeColor(status: string): string {
  const colorMap: Record<string, string> = {
    'ACTIVE': 'bg-green-100 text-green-800',
    'EXPIRED': 'bg-red-100 text-red-800',
    'CANCELED': 'bg-red-100 text-red-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'SUSPENDED': 'bg-gray-100 text-gray-800',
    'PENDING_PAYMENT': 'bg-yellow-100 text-yellow-800',
    'TRIAL': 'bg-blue-100 text-blue-800'
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// ===== Subscription History API =====
export async function getSubscriptionHistory(id: string): Promise<{ success: boolean; data: SubscriptionHistoryItem[] }>{
  return requestWithFallback<{ success: boolean; data: SubscriptionHistoryItem[] }>('get', `/billing/subscriptions/${id}/history`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// Get Tenant Subscription History - GET /api/billing/subscriptions/tenant/:tenant_id/history
export async function getTenantSubscriptionHistory(tenantId: string): Promise<{ success: boolean; data: SubscriptionHistoryItem[] }>{
  return requestWithFallback<{ success: boolean; data: SubscriptionHistoryItem[] }>('get', `/billing/subscriptions/tenant/${tenantId}/history`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
// ADMIN choose plan for own tenant - POST /api/billing/subscriptions/:id/choose-plan
export async function chooseSubscriptionPlan(id: string, plan_id: string): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('post', `/billing/subscriptions/${id}/choose-plan`, {
    data: { plan_id },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

// ADMIN order plan for own tenant - POST /api/billing/subscriptions/order
export async function orderSubscriptionPlan(plan_id: string, billing_period?: 'MONTH' | 'YEAR'): Promise<SubscriptionResponse> {
  return requestWithFallback<SubscriptionResponse>('post', `/billing/subscriptions/order`, {
    data: { plan_id, billing_period },
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function cancelPendingUpgrade(subId?: string): Promise<{ success: boolean; message: string; data?: any }> {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('post', `/billing/subscriptions/upgrade/cancel`, {
    data: subId ? { subscription_id: subId } : {},
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}

export async function cancelPendingUpgradePublic(token: string): Promise<{ success: boolean; message: string; data?: any }> {
  return requestWithFallback<{ success: boolean; message: string; data?: any }>('post', `/invoice/public/${token}/upgrade/cancel`, {
    headers: { 'X-Skip-403-Redirect': 'true' }
  });
}
