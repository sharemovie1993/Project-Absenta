import { prisma } from '../../../utils/prisma';

type RevenueSnapshot = {
  month: Date;
  tenant_id: string | null;
  mrr: number;
  arr: number;
  churn_amount: number;
  upgrade_gain: number;
  downgrade_loss: number;
  nrr: number;
};

function riskLevelToMultiplier(riskLevel: string | null | undefined): number {
  switch (String(riskLevel || '')) {
    case 'CRITICAL':
      return 4;
    case 'HIGH_RISK':
      return 3;
    case 'WARNING':
      return 2;
    case 'HEALTHY':
    default:
      return 1;
  }
}

function monthlyPriceFromPlan(plan: any): number {
  if (!plan) return 0;
  if (plan.billing_period === 'YEAR') {
    const yearly = plan.price_yearly;
    if (typeof yearly === 'number' && Number.isFinite(yearly) && yearly > 0) return yearly / 12;
  }
  const monthly = plan.price_monthly;
  if (typeof monthly === 'number' && Number.isFinite(monthly) && monthly > 0) return monthly;
  return 0;
}

async function getLatestGlobalSnapshot(): Promise<RevenueSnapshot | null> {
  const row = await prisma.revenue_snapshot_monthly.findFirst({
    where: { tenant_id: null },
    orderBy: { month: 'desc' },
  });
  return (row as any) || null;
}

async function getLatestSnapshotMonth(): Promise<Date | null> {
  const row = await prisma.revenue_snapshot_monthly.findFirst({
    where: { tenant_id: null },
    orderBy: { month: 'desc' },
    select: { month: true },
  });
  return row?.month || null;
}

export const revenueIntelligenceService = {
  async getGlobalRevenueOverview() {
    const latest = await getLatestGlobalSnapshot();
    const latestMonth = latest?.month || (await getLatestSnapshotMonth());

    let revenueAtRisk = 0;
    let riskWeightedRevenue = 0;

    if (latestMonth) {
      const tenantSnapshots = await prisma.revenue_snapshot_monthly.findMany({
        where: { month: latestMonth, tenant_id: { not: null } },
        select: { tenant_id: true, mrr: true },
      });
      const tenantIds = tenantSnapshots.map((s) => String((s as any).tenant_id));
      const riskScores = tenantIds.length
        ? await prisma.tenantRiskScore.findMany({
            where: { tenant_id: { in: tenantIds } },
            select: { tenant_id: true, risk_level: true },
          })
        : [];
      const riskByTenant = new Map(riskScores.map((r) => [String(r.tenant_id), String(r.risk_level)]));

      for (const s of tenantSnapshots) {
        const tenantId = String((s as any).tenant_id);
        const mrr = Number((s as any).mrr || 0);
        const level = riskByTenant.get(tenantId) || 'HEALTHY';
        riskWeightedRevenue += mrr * riskLevelToMultiplier(level);
        if (level === 'HIGH_RISK' || level === 'CRITICAL') revenueAtRisk += mrr;
      }
    }

    return {
      month: latest?.month || null,
      mrr: Number(latest?.mrr || 0),
      arr: Number(latest?.arr || 0),
      nrr: Number(latest?.nrr || 0),
      churn_amount: Number(latest?.churn_amount || 0),
      upgrade_gain: Number(latest?.upgrade_gain || 0),
      downgrade_loss: Number(latest?.downgrade_loss || 0),
      revenue_at_risk: revenueAtRisk,
      risk_weighted_revenue: riskWeightedRevenue,
    };
  },

  async getMonthlyTrend(lastNMonths: number) {
    const n = Number.isFinite(lastNMonths) && lastNMonths > 0 ? Math.floor(lastNMonths) : 6;
    const rows = await prisma.revenue_snapshot_monthly.findMany({
      where: { tenant_id: null },
      orderBy: { month: 'desc' },
      take: n,
    });
    const ordered = [...rows].reverse();
    return ordered.map((r) => ({
      month: (r as any).month,
      mrr: Number((r as any).mrr || 0),
      arr: Number((r as any).arr || 0),
      churn_amount: Number((r as any).churn_amount || 0),
      upgrade_gain: Number((r as any).upgrade_gain || 0),
      downgrade_loss: Number((r as any).downgrade_loss || 0),
      nrr: Number((r as any).nrr || 0),
    }));
  },

  async getTenantRevenueExposure() {
    const latestMonth = await getLatestSnapshotMonth();
    if (!latestMonth) {
      return { month: null, revenue_at_risk: 0, tenants: [] as any[] };
    }

    const snapshots = await prisma.revenue_snapshot_monthly.findMany({
      where: { month: latestMonth, tenant_id: { not: null } },
      select: {
        tenant_id: true,
        mrr: true,
        arr: true,
        nrr: true,
        churn_amount: true,
        upgrade_gain: true,
        downgrade_loss: true,
      },
    });
    const tenantIds = snapshots.map((s) => String((s as any).tenant_id));

    const [tenants, riskScores] = await Promise.all([
      tenantIds.length
        ? prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true, domain: true, status: true },
          })
        : Promise.resolve([]),
      tenantIds.length
        ? prisma.tenantRiskScore.findMany({
            where: { tenant_id: { in: tenantIds } },
            select: { tenant_id: true, risk_score: true, risk_level: true, last_calculated_at: true },
          })
        : Promise.resolve([]),
    ]);

    const tenantById = new Map(tenants.map((t) => [String(t.id), t]));
    const riskByTenant = new Map(riskScores.map((r) => [String(r.tenant_id), r]));

    let revenueAtRisk = 0;

    const enriched = snapshots
      .map((s) => {
        const tenantId = String((s as any).tenant_id);
        const tenant = tenantById.get(tenantId) || null;
        const risk = riskByTenant.get(tenantId) || null;
        const mrr = Number((s as any).mrr || 0);
        const riskLevel = risk ? String((risk as any).risk_level) : 'HEALTHY';
        const multiplier = riskLevelToMultiplier(riskLevel);
        if (riskLevel === 'HIGH_RISK' || riskLevel === 'CRITICAL') revenueAtRisk += mrr;

        return {
          tenant_id: tenantId,
          tenant_name: tenant?.name || null,
          tenant_domain: tenant?.domain || null,
          tenant_status: tenant?.status || null,
          mrr,
          arr: Number((s as any).arr || 0),
          nrr: Number((s as any).nrr || 0),
          churn_amount: Number((s as any).churn_amount || 0),
          upgrade_gain: Number((s as any).upgrade_gain || 0),
          downgrade_loss: Number((s as any).downgrade_loss || 0),
          risk_score: risk ? Number((risk as any).risk_score || 0) : 0,
          risk_level: riskLevel,
          risk_weighted_revenue: mrr * multiplier,
          risk_last_calculated_at: risk ? (risk as any).last_calculated_at : null,
        };
      })
      .sort((a, b) => b.mrr - a.mrr);

    return { month: latestMonth, revenue_at_risk: revenueAtRisk, tenants: enriched };
  },

  async getChurnAnalysis(lastNMonths: number) {
    const trend = await this.getMonthlyTrend(lastNMonths);
    return trend.map((p) => ({
      month: p.month,
      churn_amount: p.churn_amount,
      churn_rate: p.mrr > 0 ? (p.churn_amount / p.mrr) * 100 : 0,
      mrr: p.mrr,
    }));
  },

  async getUpgradeConversionRate() {
    const latestMonth = await getLatestSnapshotMonth();
    if (!latestMonth) return { month: null, total_changes: 0, upgrade_count: 0, conversion_rate: 0 };

    const nextMonth = new Date(Date.UTC(latestMonth.getUTCFullYear(), latestMonth.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    const rows = await prisma.planChangeRequest.findMany({
      where: { status: 'APPLIED' as any, effective_date: { gte: latestMonth, lt: nextMonth } },
      select: {
        fromPlan: { select: { price_monthly: true, price_yearly: true, billing_period: true } },
        toPlan: { select: { price_monthly: true, price_yearly: true, billing_period: true } },
      },
    });

    let total = 0;
    let upgrades = 0;
    for (const r of rows) {
      total += 1;
      const diff = monthlyPriceFromPlan((r as any).toPlan) - monthlyPriceFromPlan((r as any).fromPlan);
      if (diff > 0) upgrades += 1;
    }

    return {
      month: latestMonth,
      total_changes: total,
      upgrade_count: upgrades,
      conversion_rate: total > 0 ? (upgrades / total) * 100 : 0,
    };
  },
};
