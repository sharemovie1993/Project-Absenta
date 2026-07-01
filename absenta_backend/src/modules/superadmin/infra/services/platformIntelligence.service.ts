import { ObservabilityMetricType, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/utils/prisma';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

async function sumMetricAllTenants(metricType: ObservabilityMetricType, from: Date, to: Date): Promise<number> {
  const res = await prisma.observabilityMetric.aggregate({
    where: {
      metric_type: metricType,
      time_bucket: {
        gte: from,
        lte: to,
      },
    },
    _sum: { value: true },
  });

  return Number(res._sum.value || 0);
}

async function sumAggregatedGlobal(metricKey: string, fromDate: Date, toDateExclusive: Date): Promise<number> {
  const res = await prisma.aggregatedMetricDaily.aggregate({
    where: {
      tenant_id: null,
      metric_key: metricKey,
      date: { gte: fromDate, lt: toDateExclusive },
    },
    _sum: { value: true },
  });

  return Number(res._sum.value || 0);
}

function median(values: number[]): number | null {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (!filtered.length) return null;
  const sorted = filtered.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

async function getDailyMetricValue(
  tenantId: string | null,
  metricKey: string,
  date: Date
): Promise<number | null> {
  const row = await prisma.aggregatedMetricDaily.findFirst({
    where: {
      tenant_id: tenantId,
      metric_key: metricKey,
      date,
    },
    select: { value: true },
  });
  if (!row) return null;
  const v = Number(row.value);
  return Number.isFinite(v) ? v : null;
}

async function getDailyMetricSeries(
  tenantId: string | null,
  metricKey: string,
  fromDate: Date,
  toDateExclusive: Date
): Promise<number[]> {
  const rows = await prisma.aggregatedMetricDaily.findMany({
    where: {
      tenant_id: tenantId,
      metric_key: metricKey,
      date: { gte: fromDate, lt: toDateExclusive },
    },
    select: { value: true },
  });
  return rows
    .map((r) => Number(r.value))
    .filter((v) => Number.isFinite(v));
}

export class PlatformIntelligenceService {
  async getPlatformOverview(): Promise<{
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalMRR: number;
    churnLast30Days: number;
    avgRiskScore: number;
  }> {
    const totalTenants = await prisma.tenant.count();

    const latestSubscriptions = await prisma.subscription.findMany({
      distinct: ['tenant_id'],
      orderBy: [{ tenant_id: 'asc' }, { created_at: 'desc' }],
      include: {
        Plan: {
          select: {
            price_monthly: true,
            price_yearly: true,
            billing_period: true,
          },
        },
      },
    });

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.UPGRADE_PENDING,
      SubscriptionStatus.PENDING_PAYMENT,
    ];

    const activeTenants = latestSubscriptions.filter((s) => activeStatuses.includes(s.status)).length;
    const suspendedTenants = latestSubscriptions.filter((s) => s.status === SubscriptionStatus.SUSPENDED).length;

    const totalMRR = latestSubscriptions
      .filter((s) => activeStatuses.includes(s.status))
      .reduce((sum, s) => {
        const plan = (s as any).Plan as { price_monthly: number; price_yearly: number | null; billing_period: any } | null;
        const snapshot = typeof (s as any).price_snapshot === 'number' ? Number((s as any).price_snapshot) : null;
        const priceMonthly =
          snapshot ??
          (plan?.billing_period === 'YEAR' && typeof plan?.price_yearly === 'number' ? Math.round(Number(plan.price_yearly) / 12) : Number(plan?.price_monthly || 0));
        return sum + (Number.isFinite(priceMonthly) ? priceMonthly : 0);
      }, 0);

    const churnFrom = daysAgo(30);
    const churnRows = await prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED] },
        updated_at: { gte: churnFrom },
      },
      distinct: ['tenant_id'],
      orderBy: [{ tenant_id: 'asc' }, { updated_at: 'desc' }],
      select: { tenant_id: true },
    });

    const churnLast30Days = churnRows.length;

    const avgRiskAgg = await prisma.tenantRiskScore.aggregate({
      _avg: { risk_score: true },
    });

    const avgRiskScore = Number(avgRiskAgg._avg.risk_score ?? 0);

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalMRR,
      churnLast30Days,
      avgRiskScore,
    };
  }

  async getTopRiskTenants(): Promise<
    Array<{
      tenantId: string;
      tenantName: string;
      riskScore: number;
      riskLevel: string;
    }>
  > {
    const rows = await prisma.tenantRiskScore.findMany({
      take: 10,
      orderBy: { risk_score: 'desc' },
      include: {
        Tenant: { select: { id: true, name: true } },
      },
    });

    return rows.map((r) => ({
      tenantId: r.tenant_id,
      tenantName: r.Tenant?.name ?? 'Unknown',
      riskScore: Number(r.risk_score || 0),
      riskLevel: String(r.risk_level),
    }));
  }

  async getEmailHealthSummary(): Promise<{
    failureRate7d: number;
    totalEmails7d: number;
    anomalyCount7d: number;
  }> {
    const USE_AGGREGATED_METRICS = (process.env.USE_AGGREGATED_METRICS || 'true').toLowerCase() === 'true';
    const now = new Date();
    const untilDay = utcDayStart(now);
    const sinceDay = new Date(untilDay.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [failed, terminal] = USE_AGGREGATED_METRICS
      ? await Promise.all([
          sumAggregatedGlobal('email_failed_count', sinceDay, untilDay),
          sumAggregatedGlobal('email_terminal_count', sinceDay, untilDay),
        ])
      : await Promise.all([
          sumMetricAllTenants(ObservabilityMetricType.EMAIL_FAILED, sinceDay, untilDay),
          (async () => {
            const sent = await sumMetricAllTenants(ObservabilityMetricType.EMAIL_SENT as any, sinceDay, untilDay);
            const fail = await sumMetricAllTenants(ObservabilityMetricType.EMAIL_FAILED, sinceDay, untilDay);
            return sent + fail;
          })(),
        ]);

    const failureRate7d = terminal > 0 ? failed / terminal : 0;

    const anomalyCount7d = await prisma.alertLog.count({
      where: {
        alert_type: 'EMAIL_FAILURE_SPIKE',
        created_at: { gte: sinceDay },
      },
    });

    return {
      failureRate7d,
      totalEmails7d: terminal,
      anomalyCount7d,
    };
  }

  async getPaymentHealthSummary(): Promise<{
    failureRate7d: number;
    overdueCount: number;
    suspensionCount: number;
  }> {
    const USE_AGGREGATED_METRICS = (process.env.USE_AGGREGATED_METRICS || 'true').toLowerCase() === 'true';
    const now = new Date();
    const untilDay = utcDayStart(now);
    const sinceDay = new Date(untilDay.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [failed, success] = USE_AGGREGATED_METRICS
      ? await Promise.all([
          sumAggregatedGlobal('payment_failure_count', sinceDay, untilDay),
          sumAggregatedGlobal('payment_success_count', sinceDay, untilDay),
        ])
      : await Promise.all([
          sumMetricAllTenants(ObservabilityMetricType.PAYMENT_FAILED, sinceDay, untilDay),
          sumMetricAllTenants(ObservabilityMetricType.PAYMENT_SUCCESS, sinceDay, untilDay),
        ]);

    const total = failed + success;
    const failureRate7d = total > 0 ? failed / total : 0;

    const overdueCount = 0;

    const latestSubscriptions = await prisma.subscription.findMany({
      distinct: ['tenant_id'],
      orderBy: [{ tenant_id: 'asc' }, { created_at: 'desc' }],
      select: { tenant_id: true, status: true },
    });

    const suspensionCount = latestSubscriptions.filter((s) => s.status === SubscriptionStatus.SUSPENDED).length;

    return {
      failureRate7d,
      overdueCount,
      suspensionCount,
    };
  }

  async getAttendanceHealth(): Promise<{
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
  }> {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const targetDay = utcDayStart(new Date(now.getTime() - dayMs));
    const baselineWindowDays = 7;
    const baselineStart = new Date(targetDay.getTime() - baselineWindowDays * dayMs);

    const [gateAvg, gateP95, sessionAvg, sessionP95, gateP95Series, sessionP95Series] = await Promise.all([
      getDailyMetricValue(null, 'attendance_gate_avg_ms', targetDay),
      getDailyMetricValue(null, 'attendance_gate_p95_ms', targetDay),
      getDailyMetricValue(null, 'attendance_session_avg_ms', targetDay),
      getDailyMetricValue(null, 'attendance_session_p95_ms', targetDay),
      getDailyMetricSeries(null, 'attendance_gate_p95_ms', baselineStart, targetDay),
      getDailyMetricSeries(null, 'attendance_session_p95_ms', baselineStart, targetDay),
    ]);

    const gateP95Median = median(gateP95Series);
    const sessionP95Median = median(sessionP95Series);

    const gateRatio =
      gateP95 !== null && gateP95Median !== null && gateP95Median > 0 ? gateP95 / gateP95Median : null;
    const sessionRatio =
      sessionP95 !== null && sessionP95Median !== null && sessionP95Median > 0
        ? sessionP95 / sessionP95Median
        : null;

    const gateIsAnomaly = gateRatio !== null && gateRatio >= 1.3;
    const sessionIsAnomaly = sessionRatio !== null && sessionRatio >= 1.3;

    return {
      date: targetDay.toISOString().slice(0, 10),
      kpi: {
        attendance_gate_avg_ms: gateAvg,
        attendance_gate_p95_ms: gateP95,
        attendance_session_avg_ms: sessionAvg,
        attendance_session_p95_ms: sessionP95,
        threshold_breached_rate_gate: null,
        threshold_breached_rate_session: null,
      },
      baseline: {
        window_days: baselineWindowDays,
        gate_p95_median_ms: gateP95Median,
        session_p95_median_ms: sessionP95Median,
      },
      deviation: {
        gate_p95_ratio: gateRatio,
        session_p95_ratio: sessionRatio,
        gate_is_anomaly: gateIsAnomaly,
        session_is_anomaly: sessionIsAnomaly,
      },
    };
  }

  async getAttendanceTenantSummary(tenantId: string): Promise<{
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
  }> {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const targetDay = utcDayStart(new Date(now.getTime() - dayMs));
    const baselineWindowDays = 7;
    const baselineStart = new Date(targetDay.getTime() - baselineWindowDays * dayMs);

    const [gateAvg, gateP95, sessionAvg, sessionP95, gateP95Series, sessionP95Series] = await Promise.all([
      getDailyMetricValue(tenantId, 'attendance_gate_avg_ms', targetDay),
      getDailyMetricValue(tenantId, 'attendance_gate_p95_ms', targetDay),
      getDailyMetricValue(tenantId, 'attendance_session_avg_ms', targetDay),
      getDailyMetricValue(tenantId, 'attendance_session_p95_ms', targetDay),
      getDailyMetricSeries(tenantId, 'attendance_gate_p95_ms', baselineStart, targetDay),
      getDailyMetricSeries(tenantId, 'attendance_session_p95_ms', baselineStart, targetDay),
    ]);

    const gateP95Median = median(gateP95Series);
    const sessionP95Median = median(sessionP95Series);

    const gateRatio =
      gateP95 !== null && gateP95Median !== null && gateP95Median > 0 ? gateP95 / gateP95Median : null;
    const sessionRatio =
      sessionP95 !== null && sessionP95Median !== null && sessionP95Median > 0
        ? sessionP95 / sessionP95Median
        : null;

    const gateIsAnomaly = gateRatio !== null && gateRatio >= 1.3;
    const sessionIsAnomaly = sessionRatio !== null && sessionRatio >= 1.3;

    return {
      tenant_id: tenantId,
      date: targetDay.toISOString().slice(0, 10),
      today: {
        attendance_gate_avg_ms: gateAvg,
        attendance_gate_p95_ms: gateP95,
        attendance_session_avg_ms: sessionAvg,
        attendance_session_p95_ms: sessionP95,
        threshold_breached_rate_gate: null,
        threshold_breached_rate_session: null,
      },
      baseline: {
        window_days: baselineWindowDays,
        gate_p95_median_ms: gateP95Median,
        session_p95_median_ms: sessionP95Median,
      },
      deviation: {
        gate_p95_ratio: gateRatio,
        session_p95_ratio: sessionRatio,
        gate_is_anomaly: gateIsAnomaly,
        session_is_anomaly: sessionIsAnomaly,
      },
      load_hint: {
        estimated_gate_taps: null,
        estimated_session_taps: null,
      },
    };
  }

  async getAttendanceTenantTrends(
    tenantId: string,
    windowDaysRaw?: number
  ): Promise<{
    tenant_id: string;
    window_days: number;
    points: Array<{
      date: string;
      attendance_gate_avg_ms: number | null;
      attendance_gate_p95_ms: number | null;
      attendance_session_avg_ms: number | null;
      attendance_session_p95_ms: number | null;
      threshold_breached_rate_gate: number | null;
      threshold_breached_rate_session: number | null;
    }>;
  }> {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const untilDay = utcDayStart(now);
    const windowDays =
      typeof windowDaysRaw === 'number' && Number.isFinite(windowDaysRaw) && windowDaysRaw > 0
        ? Math.min(60, Math.floor(windowDaysRaw))
        : 30;
    const sinceDay = new Date(untilDay.getTime() - windowDays * dayMs);

    const metricKeys = [
      'attendance_gate_avg_ms',
      'attendance_gate_p95_ms',
      'attendance_session_avg_ms',
      'attendance_session_p95_ms',
      'attendance_gate_threshold_breached',
      'attendance_session_threshold_breached',
    ];

    const rows = await prisma.aggregatedMetricDaily.findMany({
      where: {
        tenant_id: tenantId,
        metric_key: { in: metricKeys },
        date: { gte: sinceDay, lt: untilDay },
      },
      select: {
        date: true,
        metric_key: true,
        value: true,
      },
    });

    const byDate = new Map<
      string,
      {
        date: string;
        attendance_gate_avg_ms: number | null;
        attendance_gate_p95_ms: number | null;
        attendance_session_avg_ms: number | null;
        attendance_session_p95_ms: number | null;
        threshold_breached_rate_gate: number | null;
        threshold_breached_rate_session: number | null;
      }
    >();

    for (const row of rows) {
      const dateStr = utcDayStart(row.date).toISOString().slice(0, 10);
      let entry = byDate.get(dateStr);
      if (!entry) {
        entry = {
          date: dateStr,
          attendance_gate_avg_ms: null,
          attendance_gate_p95_ms: null,
          attendance_session_avg_ms: null,
          attendance_session_p95_ms: null,
          threshold_breached_rate_gate: null,
          threshold_breached_rate_session: null,
        };
        byDate.set(dateStr, entry);
      }
      const v = Number(row.value);
      const value = Number.isFinite(v) ? v : null;
      if (row.metric_key === 'attendance_gate_avg_ms') entry.attendance_gate_avg_ms = value;
      if (row.metric_key === 'attendance_gate_p95_ms') entry.attendance_gate_p95_ms = value;
      if (row.metric_key === 'attendance_session_avg_ms') entry.attendance_session_avg_ms = value;
      if (row.metric_key === 'attendance_session_p95_ms') entry.attendance_session_p95_ms = value;
      if (row.metric_key === 'attendance_gate_threshold_breached') entry.threshold_breached_rate_gate = null;
      if (row.metric_key === 'attendance_session_threshold_breached') entry.threshold_breached_rate_session = null;
    }

    const points = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return {
      tenant_id: tenantId,
      window_days: windowDays,
      points,
    };
  }
}

export const platformIntelligenceService = new PlatformIntelligenceService();
