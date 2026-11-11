import { prisma } from '@/utils/prisma';

export interface TenantRiskRow {
  tenantId: string;
  tenantName: string;
  riskScore: number;
  riskLevel: 'HEALTHY' | 'LOW' | 'WARNING' | 'CRITICAL';
}

function classifyRiskLevel(score: number): 'HEALTHY' | 'LOW' | 'WARNING' | 'CRITICAL' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'WARNING';
  if (score >= 15) return 'LOW';
  return 'HEALTHY';
}

function computeMonthlyAmount(sub: {
  price_snapshot: number | null;
  Plan: { price_monthly: number; price_yearly: number | null; billing_period: string } | null;
}): number {
  if (sub.price_snapshot != null && sub.price_snapshot > 0) {
    if (sub.Plan?.billing_period === 'YEAR') {
      return Math.round(sub.price_snapshot / 12);
    }
    return sub.price_snapshot;
  }
  if (!sub.Plan) return 0;
  if (sub.Plan.billing_period === 'YEAR' && sub.Plan.price_yearly) {
    return Math.round(sub.Plan.price_yearly / 12);
  }
  return sub.Plan.price_monthly || 0;
}

export const superadminIntelligenceService = {
  async getTenantRiskRows(): Promise<TenantRiskRow[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [tenants, latestSubs, failedNotifs] = await Promise.all([
      prisma.tenant.findMany({
        where: {
          id: { not: 'system' },
          subdomain: { not: 'system' },
        },
        select: {
          id: true,
          name: true,
          status: true,
          deletion_requested_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.subscription.findMany({
        where: { tenant_id: { not: 'system' } },
        select: {
          tenant_id: true,
          status: true,
          end_date: true,
        },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.notificationLog.groupBy({
        by: ['tenant_id'],
        where: {
          tenant_id: { not: 'system' },
          status: { in: ['FAILED', 'ERROR'] },
          created_at: { gte: sevenDaysAgo },
        },
        _count: { _all: true },
      }),
    ]);

    const subsByTenant = new Map<string, Array<{ status: string; end_date: Date }>>();
    for (const s of latestSubs) {
      const list = subsByTenant.get(s.tenant_id) || [];
      list.push({ status: s.status, end_date: s.end_date });
      subsByTenant.set(s.tenant_id, list);
    }

    const failByTenant = new Map<string, number>();
    for (const f of failedNotifs) {
      failByTenant.set(f.tenant_id, f._count._all);
    }

    const now = Date.now();
    const rows: TenantRiskRow[] = tenants.map((t) => {
      let score = 0;
      const tStatus = String(t.status || '').toUpperCase();
      if (tStatus === 'SUSPENDED') score += 60;
      else if (tStatus !== 'ACTIVE') score += 35;

      if (t.deletion_requested_at) score += 40;

      const tSubs = subsByTenant.get(t.id) || [];
      const hasActive = tSubs.some((s) => s.status === 'ACTIVE' && s.end_date.getTime() > now);
      const hasTrial = tSubs.some((s) => s.status === 'TRIAL');
      const hasExpiredOrSuspended = tSubs.some((s) => s.status === 'EXPIRED' || s.status === 'SUSPENDED');

      if (!hasActive && !hasTrial) {
        score += hasExpiredOrSuspended ? 30 : 15;
      } else if (hasTrial && !hasActive) {
        score += 10;
      }

      const fails = failByTenant.get(t.id) || 0;
      if (fails > 0) {
        score += Math.min(25, fails * 5);
      }

      const clamped = Math.max(0, Math.min(100, score));
      return {
        tenantId: t.id,
        tenantName: t.name,
        riskScore: clamped,
        riskLevel: classifyRiskLevel(clamped),
      };
    });

    rows.sort((a, b) => b.riskScore - a.riskScore || a.tenantName.localeCompare(b.tenantName));
    return rows;
  },

  async getOverview() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalTenants, activeTenants, suspendedTenants, activeSubs, churnLast30Days, riskRows] = await Promise.all([
      prisma.tenant.count({
        where: { id: { not: 'system' }, subdomain: { not: 'system' } },
      }),
      prisma.tenant.count({
        where: { id: { not: 'system' }, subdomain: { not: 'system' }, status: 'ACTIVE' },
      }),
      prisma.tenant.count({
        where: { id: { not: 'system' }, subdomain: { not: 'system' }, status: { not: 'ACTIVE' } },
      }),
      prisma.subscription.findMany({
        where: {
          tenant_id: { not: 'system' },
          status: 'ACTIVE',
        },
        select: {
          price_snapshot: true,
          Plan: {
            select: {
              price_monthly: true,
              price_yearly: true,
              billing_period: true,
            },
          },
        },
      }),
      prisma.subscription.count({
        where: {
          tenant_id: { not: 'system' },
          status: { in: ['CANCELLED', 'EXPIRED', 'SUSPENDED'] },
          updated_at: { gte: thirtyDaysAgo },
        },
      }),
      this.getTenantRiskRows(),
    ]);

    const totalMRR = activeSubs.reduce((sum, sub) => sum + computeMonthlyAmount(sub), 0);
    const avgRiskScore =
      riskRows.length > 0
        ? Math.round((riskRows.reduce((s, r) => s + r.riskScore, 0) / riskRows.length) * 10) / 10
        : 0;

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalMRR,
      churnLast30Days,
      avgRiskScore,
    };
  },

  async getTopRisk() {
    const rows = await this.getTenantRiskRows();
    return rows.slice(0, 10);
  },

  async getEmailHealth() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [obsMetrics, notifStats] = await Promise.all([
      prisma.observabilityMetric.groupBy({
        by: ['metric_type'],
        where: {
          metric_type: { in: ['EMAIL_SENT', 'EMAIL_FAILED'] },
          time_bucket: { gte: sevenDaysAgo },
        },
        _sum: { value: true },
      }),
      prisma.notificationLog.groupBy({
        by: ['status'],
        where: {
          created_at: { gte: sevenDaysAgo },
        },
        _count: { _all: true },
      }),
    ]);

    let sent = 0;
    let failed = 0;
    for (const m of obsMetrics) {
      if (m.metric_type === 'EMAIL_SENT') sent += Number(m._sum.value || 0);
      if (m.metric_type === 'EMAIL_FAILED') failed += Number(m._sum.value || 0);
    }

    if (sent + failed === 0 && notifStats.length > 0) {
      for (const n of notifStats) {
        const count = Number(n._count._all || 0);
        if (String(n.status).toUpperCase() === 'FAILED' || String(n.status).toUpperCase() === 'ERROR') {
          failed += count;
        } else {
          sent += count;
        }
      }
    }

    const totalEmails7d = sent + failed;
    const failureRate7d = totalEmails7d > 0 ? failed / totalEmails7d : 0;

    const anomalyCount7d = await prisma.alertLog.count({
      where: {
        alert_type: { contains: 'EMAIL' },
        created_at: { gte: sevenDaysAgo },
      },
    });

    return {
      failureRate7d,
      totalEmails7d,
      anomalyCount7d,
    };
  },

  async getPaymentHealth() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [obsMetrics, overdueCount, suspensionCount] = await Promise.all([
      prisma.observabilityMetric.groupBy({
        by: ['metric_type'],
        where: {
          metric_type: { in: ['PAYMENT_SUCCESS', 'PAYMENT_FAILED'] },
          time_bucket: { gte: sevenDaysAgo },
        },
        _sum: { value: true },
      }),
      prisma.subscription.count({
        where: {
          tenant_id: { not: 'system' },
          status: { in: ['EXPIRED', 'PENDING_PAYMENT'] },
        },
      }),
      prisma.subscription.count({
        where: {
          tenant_id: { not: 'system' },
          status: 'SUSPENDED',
        },
      }),
    ]);

    let success = 0;
    let failed = 0;
    for (const m of obsMetrics) {
      if (m.metric_type === 'PAYMENT_SUCCESS') success += Number(m._sum.value || 0);
      if (m.metric_type === 'PAYMENT_FAILED') failed += Number(m._sum.value || 0);
    }

    const total = success + failed;
    const failureRate7d = total > 0 ? failed / total : 0;

    return {
      failureRate7d,
      overdueCount,
      suspensionCount,
    };
  },

  async getAttendanceHealth() {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const metrics = await prisma.aggregatedMetricDaily.findMany({
      where: {
        date: { gte: sevenDaysAgo },
        metric_key: {
          in: [
            'attendance_gate_avg_ms',
            'attendance_gate_p95_ms',
            'attendance_session_avg_ms',
            'attendance_session_p95_ms',
            'threshold_breached_rate_gate',
            'threshold_breached_rate_session',
          ],
        },
      },
      orderBy: { date: 'desc' },
    });

    const avgFor = (key: string): number | null => {
      const vals = metrics.filter((m) => m.metric_key === key).map((m) => Number(m.value)).filter(Number.isFinite);
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const gateP95 = avgFor('attendance_gate_p95_ms');
    const sessionP95 = avgFor('attendance_session_p95_ms');

    return {
      date: today,
      kpi: {
        attendance_gate_avg_ms: avgFor('attendance_gate_avg_ms'),
        attendance_gate_p95_ms: gateP95,
        attendance_session_avg_ms: avgFor('attendance_session_avg_ms'),
        attendance_session_p95_ms: sessionP95,
        threshold_breached_rate_gate: avgFor('threshold_breached_rate_gate'),
        threshold_breached_rate_session: avgFor('threshold_breached_rate_session'),
      },
      baseline: {
        window_days: 7,
        gate_p95_median_ms: gateP95,
        session_p95_median_ms: sessionP95,
      },
      deviation: {
        gate_p95_ratio: null,
        session_p95_ratio: null,
        gate_is_anomaly: false,
        session_is_anomaly: false,
      },
    };
  },

  async getAttendanceTenantSummary(tenantId: string) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [gateTaps, sessionTaps, metrics] = await Promise.all([
      prisma.absenGerbangSiswa.count({
        where: { tenant_id: tenantId, waktu_tap: { gte: startOfToday } },
      }),
      prisma.absenSiswa.count({
        where: { tenant_id: tenantId, waktu_tap: { gte: startOfToday } },
      }),
      prisma.aggregatedMetricDaily.findMany({
        where: { tenant_id: tenantId },
        orderBy: { date: 'desc' },
        take: 20,
      }),
    ]);

    const latestFor = (key: string): number | null => {
      const row = metrics.find((m) => m.metric_key === key);
      return row ? Number(row.value) : null;
    };

    const gateP95 = latestFor('attendance_gate_p95_ms');
    const sessionP95 = latestFor('attendance_session_p95_ms');

    return {
      tenant_id: tenantId,
      date: todayStr,
      today: {
        attendance_gate_avg_ms: latestFor('attendance_gate_avg_ms'),
        attendance_gate_p95_ms: gateP95,
        attendance_session_avg_ms: latestFor('attendance_session_avg_ms'),
        attendance_session_p95_ms: sessionP95,
        threshold_breached_rate_gate: latestFor('threshold_breached_rate_gate'),
        threshold_breached_rate_session: latestFor('threshold_breached_rate_session'),
      },
      baseline: {
        window_days: 7,
        gate_p95_median_ms: gateP95,
        session_p95_median_ms: sessionP95,
      },
      deviation: {
        gate_p95_ratio: null,
        session_p95_ratio: null,
        gate_is_anomaly: false,
        session_is_anomaly: false,
      },
      load_hint: {
        estimated_gate_taps: gateTaps,
        estimated_session_taps: sessionTaps,
      },
    };
  },

  async getAttendanceTenantTrends(tenantId: string, windowDays = 30) {
    const startDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const rows = await prisma.aggregatedMetricDaily.findMany({
      where: {
        tenant_id: tenantId,
        date: { gte: startDate },
        metric_key: {
          in: [
            'attendance_gate_avg_ms',
            'attendance_gate_p95_ms',
            'attendance_session_avg_ms',
            'attendance_session_p95_ms',
            'threshold_breached_rate_gate',
            'threshold_breached_rate_session',
          ],
        },
      },
      orderBy: { date: 'asc' },
    });

    const byDate = new Map<string, Record<string, number | null>>();
    for (const r of rows) {
      const dateStr = r.date.toISOString().slice(0, 10);
      const entry = byDate.get(dateStr) || {
        attendance_gate_avg_ms: null,
        attendance_gate_p95_ms: null,
        attendance_session_avg_ms: null,
        attendance_session_p95_ms: null,
        threshold_breached_rate_gate: null,
        threshold_breached_rate_session: null,
      };
      entry[r.metric_key] = Number(r.value);
      byDate.set(dateStr, entry);
    }

    const points = Array.from(byDate.entries()).map(([date, values]) => ({
      date,
      attendance_gate_avg_ms: values.attendance_gate_avg_ms ?? null,
      attendance_gate_p95_ms: values.attendance_gate_p95_ms ?? null,
      attendance_session_avg_ms: values.attendance_session_avg_ms ?? null,
      attendance_session_p95_ms: values.attendance_session_p95_ms ?? null,
      threshold_breached_rate_gate: values.threshold_breached_rate_gate ?? null,
      threshold_breached_rate_session: values.threshold_breached_rate_session ?? null,
    }));

    return {
      tenant_id: tenantId,
      window_days: windowDays,
      points,
    };
  },
};
