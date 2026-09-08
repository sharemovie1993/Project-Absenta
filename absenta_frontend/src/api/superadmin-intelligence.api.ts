import axiosInstance from '../lib/axiosInstance';
import { standardApiCall, type StandardApiResponse } from './apiUtils';

export type PlatformOverview = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalMRR: number;
  churnLast30Days: number;
  avgRiskScore: number;
};

export type TopRiskTenant = {
  tenantId: string;
  tenantName: string;
  riskScore: number;
  riskLevel: string;
};

export type EmailHealthSummary = {
  failureRate7d: number;
  totalEmails7d: number;
  anomalyCount7d: number;
};

export type PaymentHealthSummary = {
  failureRate7d: number;
  overdueCount: number;
  suspensionCount: number;
};

export type RevenueForecastOverview = {
  month?: string | null;
  forecast_mrr?: number;
  risk_adjusted_forecast?: number;
  forecast_arr?: number;
  projected_churn_loss?: number;
  projected_upgrade_gain?: number;
  projected_net_revenue?: number;
  calculated_at?: string | null;
  current_mrr?: number;
  risk_loss?: number;
};

export type TenantCohortRow = {
  cohort_month: string;
  active_count: number;
  retained_after_1_month: number;
  retained_after_3_month: number;
  retained_after_6_month: number;
  retained_after_12_month: number;
  revenue_generated: number;
  calculated_at: string;
};

export type UpgradeFunnelMonthlyRow = {
  month: string;
  intent_count: number;
  invoice_created_count: number;
  invoice_paid_count: number;
  upgrade_applied_count: number;
  conversion_rate: number;
  created_at?: string;
};

export type TenantUpgradeScoreMonthlyRow = {
  tenant_id: string;
  month: string;
  intent_score: number;
  intent_level: 'LOW' | 'WARM' | 'HIGH' | 'HOT' | string;
  upgrade_attempt_count: number;
  upgrade_paid_count: number;
  usage_growth_percent?: number | null;
  invoice_overdue_count: number;
  risk_score_snapshot: number;
  created_at?: string;
};

export type UpgradeIntentDistributionRow = {
  intent_level: string;
  _count: { _all: number };
};

export type UpgradeOverviewResponse = {
  latest_month: string;
  funnels: UpgradeFunnelMonthlyRow[];
  intent_distribution: UpgradeIntentDistributionRow[];
  top_hot_tenants: TenantUpgradeScoreMonthlyRow[];
};

export type UpgradeMonthSnapshotResponse = {
  month: string;
  funnel: UpgradeFunnelMonthlyRow;
  intent_distribution: UpgradeIntentDistributionRow[];
  top_hot_tenants: TenantUpgradeScoreMonthlyRow[];
  risk_vs_intent_scatter: Array<{
    tenant_id: string;
    intent_score: number;
    risk_score_snapshot: number;
    intent_level: string;
    upgrade_paid_count: number;
  }>;
};

export type AttendanceHealthResponse = {
  date: string;
  kpi: {
    attendance_gate_avg_ms: number | null;
    attendance_gate_p95_ms: number | null;
    attendance_session_avg_ms: number | null;
    attendance_session_p95_ms: number | null;
    threshold_breached_rate_gate: number | null;
    threshold_breached_rate_session: number | null;
  };
  baseline: {
    window_days: number;
    gate_p95_median_ms: number | null;
    session_p95_median_ms: number | null;
  };
  deviation: {
    gate_p95_ratio: number | null;
    session_p95_ratio: number | null;
    gate_is_anomaly: boolean;
    session_is_anomaly: boolean;
  };
};

export type AttendanceTenantSummaryResponse = {
  tenant_id: string;
  date: string;
  today: {
    attendance_gate_avg_ms: number | null;
    attendance_gate_p95_ms: number | null;
    attendance_session_avg_ms: number | null;
    attendance_session_p95_ms: number | null;
    threshold_breached_rate_gate: number | null;
    threshold_breached_rate_session: number | null;
  };
  baseline: {
    window_days: number;
    gate_p95_median_ms: number | null;
    session_p95_median_ms: number | null;
  };
  deviation: {
    gate_p95_ratio: number | null;
    session_p95_ratio: number | null;
    gate_is_anomaly: boolean;
    session_is_anomaly: boolean;
  };
  load_hint: {
    estimated_gate_taps: number | null;
    estimated_session_taps: number | null;
  };
};

export type AttendanceTenantTrendPoint = {
  date: string;
  attendance_gate_avg_ms: number | null;
  attendance_gate_p95_ms: number | null;
  attendance_session_avg_ms: number | null;
  attendance_session_p95_ms: number | null;
  threshold_breached_rate_gate: number | null;
  threshold_breached_rate_session: number | null;
};

export type AttendanceTenantTrendsResponse = {
  tenant_id: string;
  window_days: number;
  points: AttendanceTenantTrendPoint[];
};

async function safeGet<T>(url: string, fallbackData: T, params?: Record<string, unknown>): Promise<{ success: boolean; data: T }> {
  try {
    const res = await axiosInstance.get(url, { params, headers: { 'X-Skip-403-Redirect': 'true' } });
    return res.data;
  } catch {
    return { success: true, data: fallbackData };
  }
}

export const superadminIntelligenceApi = {
  getOverview: () =>
    safeGet<PlatformOverview>('/superadmin/intelligence/overview', {
      totalTenants: 0,
      activeTenants: 0,
      suspendedTenants: 0,
      totalMRR: 0,
      churnLast30Days: 0,
      avgRiskScore: 0,
    }),
  getTopRisk: () =>
    safeGet<TopRiskTenant[]>('/superadmin/intelligence/top-risk', []),
  getEmailHealth: () =>
    safeGet<EmailHealthSummary>('/superadmin/intelligence/email-health', {
      failureRate7d: 0,
      totalEmails7d: 0,
      anomalyCount7d: 0,
    }),
  getPaymentHealth: () =>
    safeGet<PaymentHealthSummary>('/superadmin/intelligence/payment-health', {
      failureRate7d: 0,
      overdueCount: 0,
      suspensionCount: 0,
    }),
  getRevenueForecast: () =>
    safeGet<RevenueForecastOverview>('/admin/analytics/revenue-forecast', {}),
  getCohortRetention: (limit = 24) =>
    safeGet<TenantCohortRow[]>('/admin/analytics/cohort', [], { limit }),
  getUpgradeOverview: (lastNMonths = 12) =>
    safeGet<UpgradeOverviewResponse>('/admin/analytics/upgrade/overview', {} as UpgradeOverviewResponse, { lastNMonths }),
  getUpgradeMonthSnapshot: (month: string) =>
    safeGet<UpgradeMonthSnapshotResponse>(`/admin/analytics/upgrade/month/${encodeURIComponent(month)}`, {} as UpgradeMonthSnapshotResponse),
  getUpgradeTenantMonth: (tenantId: string, month: string) =>
    safeGet<TenantUpgradeScoreMonthlyRow>(`/admin/analytics/upgrade/tenant/${encodeURIComponent(tenantId)}/${encodeURIComponent(month)}`, {} as TenantUpgradeScoreMonthlyRow),
  getAttendanceHealth: () =>
    safeGet<AttendanceHealthResponse | null>('/superadmin/intelligence/attendance-health', null),
  getAttendanceTenantSummary: (tenantId: string) =>
    safeGet<AttendanceTenantSummaryResponse | null>(`/superadmin/intelligence/attendance-tenant/${encodeURIComponent(tenantId)}/summary`, null),
  getAttendanceTenantTrends: (tenantId: string, windowDays = 30) =>
    safeGet<AttendanceTenantTrendsResponse | null>(
      `/superadmin/intelligence/attendance-tenant/${encodeURIComponent(tenantId)}/trends`,
      null,
      { window_days: windowDays }
    ),
};
