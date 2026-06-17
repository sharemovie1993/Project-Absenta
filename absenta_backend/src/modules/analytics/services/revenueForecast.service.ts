import { Prisma } from '@prisma/client';
import { observabilityService } from '../../observability/services/observability.service';

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addUtcMonths(monthStart: Date, months: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function yyyyMm(monthStart: Date): string {
  return monthStart.toISOString().slice(0, 7);
}

function monthlyPriceFromSubscription(sub: any): number {
  const snapshot = sub?.price_snapshot;
  if (typeof snapshot === 'number' && Number.isFinite(snapshot) && snapshot > 0) return snapshot;

  const plan = sub?.Plan;
  if (!plan) return 0;

  if (plan.billing_period === 'YEAR') {
    const yearly = plan.price_yearly;
    if (typeof yearly === 'number' && Number.isFinite(yearly) && yearly > 0) return yearly / 12;
  }

  const monthly = plan.price_monthly;
  if (typeof monthly === 'number' && Number.isFinite(monthly) && monthly > 0) return monthly;

  return 0;
}

async function getLatestActiveSubscriptionMrrByTenant(
  db: Prisma.TransactionClient
): Promise<{ totalMrr: number; mrrByTenant: Map<string, number>; activeTenantIds: string[] }> {
  const now = new Date();
  const subs = await db.subscription.findMany({
    where: {
      status: 'ACTIVE' as any,
      start_date: { lte: now },
      end_date: { gte: now },
    },
    select: {
      id: true,
      tenant_id: true,
      start_date: true,
      price_snapshot: true,
      Plan: { select: { price_monthly: true, price_yearly: true, billing_period: true } },
    },
  });

  const latestByTenant = new Map<string, any>();
  const activeCounts = new Map<string, number>();

  for (const sub of subs) {
    const tenantId = String((sub as any).tenant_id);
    activeCounts.set(tenantId, (activeCounts.get(tenantId) || 0) + 1);
    const existing = latestByTenant.get(tenantId);
    const startDate = (sub as any).start_date as Date | null | undefined;
    if (!existing) {
      latestByTenant.set(tenantId, sub);
      continue;
    }
    const existingStart = (existing as any).start_date as Date | null | undefined;
    if (startDate && (!existingStart || startDate.getTime() > existingStart.getTime())) {
      latestByTenant.set(tenantId, sub);
    }
  }

  const mrrByTenant = new Map<string, number>();
  let totalMrr = 0;

  const anomalies: Array<{ tenant_id: string; active_count: number }> = [];
  for (const [tenantId, count] of activeCounts.entries()) {
    if (count > 1) anomalies.push({ tenant_id: tenantId, active_count: count });
  }

  if (anomalies.length) {
    for (const a of anomalies) {
      observabilityService.logEvent({
        event_type: 'FORECAST_ANOMALY_DOUBLE_ACTIVE',
        domain: 'CRON',
        severity: 'WARNING',
        entity_type: 'TENANT',
        entity_id: a.tenant_id,
        tenant_id: a.tenant_id,
        metadata: { active_subscription_count: a.active_count, month: yyyyMm(utcMonthStart(now)) },
      });
    }
  }

  for (const [tenantId, sub] of latestByTenant.entries()) {
    const price = monthlyPriceFromSubscription(sub);
    if (price <= 0) continue;
    totalMrr += price;
    mrrByTenant.set(tenantId, price);
  }

  if (!mrrByTenant.size) {
    const latestGlobal = await db.revenue_snapshot_monthly.findFirst({
      where: { tenant_id: null },
      orderBy: { month: 'desc' },
      select: { mrr: true },
    });
    const snapshotMrr = latestGlobal ? Number((latestGlobal as any).mrr || 0) : 0;
    if (snapshotMrr > 0) {
      totalMrr = snapshotMrr;
      mrrByTenant.set('GLOBAL_SNAPSHOT', snapshotMrr);
    }
  }

  return { totalMrr, mrrByTenant, activeTenantIds: Array.from(mrrByTenant.keys()) };
}

async function getLastNGlobalSnapshots(
  db: Prisma.TransactionClient,
  n: number
): Promise<Array<{ month: Date; upgrade_gain: number; churn_amount: number }>> {
  const rows = await db.revenue_snapshot_monthly.findMany({
    where: { tenant_id: null },
    orderBy: { month: 'desc' },
    take: n,
    select: { month: true, upgrade_gain: true, churn_amount: true },
  });
  return rows.map((r) => ({
    month: (r as any).month,
    upgrade_gain: Number((r as any).upgrade_gain || 0),
    churn_amount: Number((r as any).churn_amount || 0),
  }));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function calculateRiskLoss(mrrByTenant: Map<string, number>, riskLevels: Array<{ tenant_id: string; risk_level: string }>): number {
  const riskByTenant = new Map(riskLevels.map((r) => [String(r.tenant_id), String(r.risk_level)]));
  let riskLoss = 0;

  for (const [tenantId, mrr] of mrrByTenant.entries()) {
    const level = riskByTenant.get(tenantId) || 'HEALTHY';
    if (level === 'HIGH_RISK') riskLoss += Number(mrr || 0) * 0.3;
    if (level === 'CRITICAL') riskLoss += Number(mrr || 0) * 0.6;
  }

  return riskLoss;
}

async function getChurnLossHistory(db: Prisma.TransactionClient, endMonthStart: Date, months: number): Promise<number[]> {
  const churnStatuses = ['EXPIRED', 'SUSPENDED', 'CANCELLED'];
  const values: number[] = [];

  for (let i = 1; i <= months; i += 1) {
    const monthStart = addUtcMonths(endMonthStart, -i);
    const nextMonth = addUtcMonths(monthStart, 1);

    const subs = await db.subscription.findMany({
      where: {
        status: { in: churnStatuses as any },
        end_date: { gte: monthStart, lt: nextMonth },
      },
      select: {
        tenant_id: true,
        end_date: true,
        price_snapshot: true,
        Plan: { select: { price_monthly: true, price_yearly: true, billing_period: true } },
      },
    });

    const latestByTenant = new Map<string, any>();
    for (const sub of subs) {
      const tenantId = String((sub as any).tenant_id);
      const existing = latestByTenant.get(tenantId);
      const endDate = (sub as any).end_date as Date | null | undefined;
      if (!existing) {
        latestByTenant.set(tenantId, sub);
        continue;
      }
      const existingEnd = (existing as any).end_date as Date | null | undefined;
      if (endDate && (!existingEnd || endDate.getTime() > existingEnd.getTime())) {
        latestByTenant.set(tenantId, sub);
      }
    }

    let total = 0;
    for (const sub of latestByTenant.values()) {
      total += monthlyPriceFromSubscription(sub);
    }
    values.push(total);
  }

  return values;
}

async function getAvgRiskScoreSnapshot(db: Prisma.TransactionClient, tenantIds: string[]): Promise<number> {
  if (!tenantIds.length) return 0;
  const rows = await db.tenantRiskScore.findMany({
    where: { tenant_id: { in: tenantIds } },
    select: { risk_score: true },
  });
  const scores = rows.map((r) => Number((r as any).risk_score || 0)).filter((v) => Number.isFinite(v) && v > 0);
  return average(scores);
}

function decimalOrZero(v: number): Prisma.Decimal {
  if (!Number.isFinite(v)) return new Prisma.Decimal(0);
  return new Prisma.Decimal(v);
}

export const revenueForecastService = {
  async calculateAndUpsertForecast(db: Prisma.TransactionClient, targetMonth: Date) {
    const now = new Date();
    const currentMonth = utcMonthStart(now);
    const month = utcMonthStart(targetMonth);

    const existing = await db.revenueForecastMonthly.findUnique({ where: { month } });
    if (existing && (existing as any).is_locked) {
      throw new Error('FORECAST_LOCKED');
    }
    if (existing && month.getTime() !== currentMonth.getTime()) {
      throw new Error('FORECAST_IMMUTABLE_MONTH');
    }

    const { totalMrr, mrrByTenant, activeTenantIds } = await getLatestActiveSubscriptionMrrByTenant(db);

    const last3 = await getLastNGlobalSnapshots(db, 3);
    const projectedUpgradeGain = average(last3.map((r) => r.upgrade_gain));
    const projectedChurnLoss = average(await getChurnLossHistory(db, month, 3));

    const riskLevels = activeTenantIds.length
      ? await db.tenantRiskScore.findMany({
          where: { tenant_id: { in: activeTenantIds } },
          select: { tenant_id: true, risk_level: true },
        })
      : [];

    const riskLoss = calculateRiskLoss(
      mrrByTenant,
      riskLevels.map((r) => ({ tenant_id: String((r as any).tenant_id), risk_level: String((r as any).risk_level) }))
    );

    const projectedMrr = Number(totalMrr || 0) + Number(projectedUpgradeGain || 0) - Number(projectedChurnLoss || 0);
    const riskAdjustedForecast = projectedMrr - riskLoss;
    const forecastArr = riskAdjustedForecast * 12;
    const churnRatePct = totalMrr > 0 ? (projectedChurnLoss / totalMrr) * 100 : 0;

    const frozenRiskScoreSnapshot =
      existing && (existing as any).risk_score_snapshot != null ? Number((existing as any).risk_score_snapshot) : await getAvgRiskScoreSnapshot(db, activeTenantIds);

    const frozenRiskAdjustment =
      existing && (existing as any).risk_adjustment != null ? Number((existing as any).risk_adjustment) : riskLoss;

    const row = await db.revenueForecastMonthly.upsert({
      where: { month },
      create: {
        month,
        forecast_mrr: projectedMrr,
        forecast_arr: forecastArr,
        projected_churn_loss: projectedChurnLoss,
        projected_upgrade_gain: projectedUpgradeGain,
        projected_net_revenue: projectedMrr,
        risk_adjusted_forecast: riskAdjustedForecast,
        total_mrr: decimalOrZero(totalMrr),
        churn_rate: decimalOrZero(churnRatePct),
        projected_mrr: decimalOrZero(projectedMrr),
        risk_adjustment: decimalOrZero(frozenRiskAdjustment),
        risk_score_snapshot: decimalOrZero(frozenRiskScoreSnapshot),
      } as any,
      update: {
        forecast_mrr: projectedMrr,
        forecast_arr: forecastArr,
        projected_churn_loss: projectedChurnLoss,
        projected_upgrade_gain: projectedUpgradeGain,
        projected_net_revenue: projectedMrr,
        risk_adjusted_forecast: riskAdjustedForecast,
        total_mrr: decimalOrZero(totalMrr),
        churn_rate: decimalOrZero(churnRatePct),
        projected_mrr: decimalOrZero(projectedMrr),
        risk_adjustment: (existing as any)?.risk_adjustment != null ? (existing as any).risk_adjustment : decimalOrZero(frozenRiskAdjustment),
        risk_score_snapshot:
          (existing as any)?.risk_score_snapshot != null ? (existing as any).risk_score_snapshot : decimalOrZero(frozenRiskScoreSnapshot),
        calculated_at: new Date(),
      } as any,
    });

    observabilityService.logEvent({
      event_type: 'FORECAST_CALCULATED',
      domain: 'CRON',
      severity: 'INFO',
      entity_type: 'REVENUE_FORECAST',
      entity_id: `forecast-${yyyyMm(month)}`,
      tenant_id: 'system',
      metadata: { month: yyyyMm(month), total_mrr: totalMrr, projected_mrr: projectedMrr, risk_adjustment: frozenRiskAdjustment },
    });

    return row as any;
  },

  async getLatestForecast(db: Prisma.TransactionClient) {
    const row = await db.revenueForecastMonthly.findFirst({ orderBy: { month: 'desc' } });
    if (!row) return null;
    return {
      month: (row as any).month,
      forecast_mrr: Number((row as any).forecast_mrr || 0),
      risk_adjusted_forecast: Number((row as any).risk_adjusted_forecast || 0),
      forecast_arr: Number((row as any).forecast_arr || 0),
      projected_churn_loss: Number((row as any).projected_churn_loss || 0),
      projected_upgrade_gain: Number((row as any).projected_upgrade_gain || 0),
      projected_net_revenue: Number((row as any).projected_net_revenue || 0),
      calculated_at: (row as any).calculated_at,
      current_mrr: Number((row as any).total_mrr != null ? (row as any).total_mrr : 0),
      risk_loss: Number((row as any).risk_adjustment != null ? (row as any).risk_adjustment : 0),
    };
  },

  async lockMonthIfExists(db: Prisma.TransactionClient, month: Date): Promise<boolean> {
    const res = await db.revenueForecastMonthly.updateMany({
      where: { month, is_locked: false as any },
      data: { is_locked: true as any },
    });
    if (res.count > 0) {
      observabilityService.logEvent({
        event_type: 'FORECAST_LOCKED',
        domain: 'CRON',
        severity: 'INFO',
        entity_type: 'REVENUE_FORECAST',
        entity_id: `forecast-${yyyyMm(month)}`,
        tenant_id: 'system',
        metadata: { month: yyyyMm(month) },
      });
      return true;
    }
    return false;
  },
};
