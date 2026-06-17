import { requestWithFallback } from "./apiUtils";
import type {
  PlansResponse,
  PlanResponse,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanQueryParams,
  Plan,
  PlanAnalytics,
  PlanWithSubscriptions,
  PlanMetrics,
  PlanComparison
} from "../types/plans";

// Get All Plans - GET /api/billing/plans (SUPERADMIN only)
export async function getAllPlans(params?: PlanQueryParams, options?: { skipTenantHeader?: boolean }): Promise<PlansResponse> {
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  const q: Record<string, unknown> | undefined = params ? { ...params } : undefined;
  return requestWithFallback<PlansResponse>('get', '/billing/plans', { params: q, headers });
}

// Get Public Active Plans - GET /api/billing/plans/public (no auth required)
export async function getPublicPlans(): Promise<PlansResponse> {
  return requestWithFallback<PlansResponse>('get', '/billing/plans/public');
}

// Get Plan by ID - GET /api/billing/plans/:id (SUPERADMIN only)
export async function getPlanById(id: string, options?: { skipTenantHeader?: boolean }): Promise<PlanResponse> {
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<PlanResponse>('get', `/billing/plans/${id}`, { headers });
}

// Create Plan - POST /api/billing/plans (SUPERADMIN only)
export async function createPlan(data: CreatePlanRequest, options?: { skipTenantHeader?: boolean }): Promise<PlanResponse> {
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<PlanResponse>('post', '/billing/plans', { data, headers });
}

// Update Plan - PUT /api/billing/plans/:id (SUPERADMIN only)
export async function updatePlan(id: string, data: UpdatePlanRequest, options?: { skipTenantHeader?: boolean }): Promise<PlanResponse> {
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<PlanResponse>('put', `/billing/plans/${id}`, { data, headers });
}

// Deactivate Plan - DELETE /api/billing/plans/:id (SUPERADMIN only)
export async function deactivatePlan(id: string, options?: { skipTenantHeader?: boolean }): Promise<PlanResponse> {
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<PlanResponse>('delete', `/billing/plans/${id}`, { headers });
}

// Get Plan Analytics - GET /api/billing/plans/analytics (SUPERADMIN only)
export async function getPlanAnalytics(options?: { skipTenantHeader?: boolean }): Promise<{ success: boolean; data: PlanAnalytics; message: string }> {
  const headers: Record<string, string> | undefined = options?.skipTenantHeader ? { 'X-Skip-Tenant': 'true' } : undefined;
  return requestWithFallback<{ success: boolean; data: PlanAnalytics; message: string }>('get', '/billing/plans/analytics', { headers });
}

// Helper functions
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
}

export function formatFeatures(features: string[]): string {
  return features.join(', ');
}

export function getPlanStatusBadgeColor(isActive: boolean): string {
  return isActive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
}

export function formatPlanStatus(isActive: boolean): string {
  return isActive ? 'Aktif' : 'Tidak Aktif';
}
