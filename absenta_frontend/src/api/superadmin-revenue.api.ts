import { requestWithFallback } from './apiUtils';

export type RevenueOverview = {
  month: string | null;
  mrr: number;
  arr: number;
  nrr: number;
  churn_amount: number;
  upgrade_gain: number;
  downgrade_loss: number;
  revenue_at_risk: number;
  risk_weighted_revenue: number;
};

export type RevenueTrendPoint = {
  month: string;
  mrr: number;
  arr: number;
  churn_amount: number;
  upgrade_gain: number;
  downgrade_loss: number;
  nrr: number;
};

export type ChurnPoint = {
  month: string;
  churn_amount: number;
  churn_rate: number;
  mrr: number;
};

export type TenantRevenueExposureRow = {
  tenant_id: string;
  tenant_name: string | null;
  tenant_domain: string | null;
  tenant_status: string | null;
  mrr: number;
  arr: number;
  nrr: number;
  churn_amount: number;
  upgrade_gain: number;
  downgrade_loss: number;
  risk_score: number;
  risk_level: string;
  risk_weighted_revenue: number;
  risk_last_calculated_at: string | null;
};

export type TenantRevenueExposure = {
  month: string | null;
  revenue_at_risk: number;
  tenants: TenantRevenueExposureRow[];
};

export const superadminRevenueApi = {
  getOverview: async (): Promise<{ success: boolean; message: string; data: RevenueOverview }> =>
    requestWithFallback<{ success: boolean; message: string; data: RevenueOverview }>('get', '/admin/revenue/overview'),
  getTrend: async (lastNMonths = 6): Promise<{ success: boolean; message: string; data: RevenueTrendPoint[] }> =>
    requestWithFallback<{ success: boolean; message: string; data: RevenueTrendPoint[] }>('get', '/admin/revenue/trend', {
      params: { lastNMonths },
    }),
  getChurn: async (lastNMonths = 6): Promise<{ success: boolean; message: string; data: ChurnPoint[] }> =>
    requestWithFallback<{ success: boolean; message: string; data: ChurnPoint[] }>('get', '/admin/revenue/churn', {
      params: { lastNMonths },
    }),
  getExposure: async (): Promise<{ success: boolean; message: string; data: TenantRevenueExposure }> =>
    requestWithFallback<{ success: boolean; message: string; data: TenantRevenueExposure }>('get', '/admin/revenue/exposure'),
};
