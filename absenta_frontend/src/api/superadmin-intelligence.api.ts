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

export const superadminIntelligenceApi = {
  getOverview: () =>
    standardApiCall<StandardApiResponse<PlatformOverview>>(
      () => axiosInstance.get('/superadmin/intelligence/overview'),
      'getPlatformOverview'
    ),
  getTopRisk: () =>
    standardApiCall<StandardApiResponse<TopRiskTenant[]>>(
      () => axiosInstance.get('/superadmin/intelligence/top-risk'),
      'getTopRiskTenants'
    ),
  getEmailHealth: () =>
    standardApiCall<StandardApiResponse<EmailHealthSummary>>(
      () => axiosInstance.get('/superadmin/intelligence/email-health'),
      'getEmailHealthSummary'
    ),
  getPaymentHealth: () =>
    standardApiCall<StandardApiResponse<PaymentHealthSummary>>(
      () => axiosInstance.get('/superadmin/intelligence/payment-health'),
      'getPaymentHealthSummary'
    ),
  getRevenueForecast: () =>
    standardApiCall<StandardApiResponse<RevenueForecastOverview>>(
      () => axiosInstance.get('/admin/analytics/revenue-forecast'),
      'getRevenueForecast'
    ),
  getCohortRetention: (limit = 24) =>
    standardApiCall<StandardApiResponse<TenantCohortRow[]>>(
      () => axiosInstance.get('/admin/analytics/cohort', { params: { limit } }),
      'getCohortRetention'
    ),
  getUpgradeOverview: (lastNMonths = 12) =>
    standardApiCall<StandardApiResponse<UpgradeOverviewResponse>>(
      () => axiosInstance.get('/admin/analytics/upgrade/overview', { params: { lastNMonths } }),
      'getUpgradeOverview'
    ),
  getUpgradeMonthSnapshot: (month: string) =>
    standardApiCall<StandardApiResponse<UpgradeMonthSnapshotResponse>>(
      () => axiosInstance.get(`/admin/analytics/upgrade/month/${encodeURIComponent(month)}`),
      'getUpgradeMonthSnapshot',
      { meta: { month } }
    ),
  getUpgradeTenantMonth: (tenantId: string, month: string) =>
    standardApiCall<StandardApiResponse<TenantUpgradeScoreMonthlyRow>>(
      () => axiosInstance.get(`/admin/analytics/upgrade/tenant/${encodeURIComponent(tenantId)}/${encodeURIComponent(month)}`),
      'getUpgradeTenantMonth',
      { meta: { tenantId, month } }
    ),
  getAttendanceHealth: () =>
    standardApiCall<StandardApiResponse<AttendanceHealthResponse>>(
      () => axiosInstance.get('/superadmin/intelligence/attendance-health'),
      'getAttendanceHealth'
    ),
  getAttendanceTenantSummary: (tenantId: string) =>
    standardApiCall<StandardApiResponse<AttendanceTenantSummaryResponse>>(
      () => axiosInstance.get(`/superadmin/intelligence/attendance-tenant/${encodeURIComponent(tenantId)}/summary`),
      'getAttendanceTenantSummary',
      { meta: { tenantId } }
    ),
  getAttendanceTenantTrends: (tenantId: string, windowDays = 30) =>
    standardApiCall<StandardApiResponse<AttendanceTenantTrendsResponse>>(
      () =>
        axiosInstance.get(`/superadmin/intelligence/attendance-tenant/${encodeURIComponent(tenantId)}/trends`, {
          params: { window_days: windowDays },
        }),
      'getAttendanceTenantTrends',
      { meta: { tenantId, windowDays } }
    ),
};
