export async function getFinancialDashboardRawMetricsQuery(_tenantId?: string) {
  return {
    monthlyRevenue30d: 0,
    dailyRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    failedPayments30d: 0,
    activeSubscriptionsCount: 0,
  };
}

export async function getBillingDashboardNotificationsQuery(_tenantId?: string) {
  return [];
}

export async function getBillingDashboardRecentActivitiesQuery(_tenantId: string | undefined, _limit: number) {
  return [];
}

export async function getRevenueChartDataQuery(_tenantId: string | undefined, _monthsCount: number) {
  return [];
}

export async function getBillingHealthSummaryQuery() {
  return {
    active_without_paid_invoice_count: 0,
    paid_not_applied_count: 0,
    invalid_invoice_period_count: 0,
    webhook_failures_last_1h: 0,
    reconciliation_fix_count_last_1h: 0,
  };
}


