import { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient;

function utcMonthStartFromKey(monthKey: string): Date {
  const [y, m] = monthKey.split('-').map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}

function addUtcMonths(monthStart: Date, months: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function normalizeMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function monthKeyUtc(date: Date): string {
  return normalizeMonth(date).toISOString().slice(0, 7);
}

function intentLevelFromScore(score: number): 'LOW' | 'WARM' | 'HIGH' | 'HOT' {
  const s = Math.max(0, Math.min(100, Math.trunc(score)));
  if (s <= 30) return 'LOW';
  if (s <= 60) return 'WARM';
  if (s <= 80) return 'HIGH';
  return 'HOT';
}

function cap100(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.trunc(score)));
}

export const upgradeIntelligenceService = {
  normalizeMonth,
  monthKeyUtc,

  async computeAndInsertMonthly(
    db: Tx,
    month: string
  ): Promise<{
    month: string;
    tenants: number;
    risk_cutoff_at: Date;
    funnel: {
      intent_count: number;
      invoice_created_count: number;
      invoice_paid_count: number;
      upgrade_applied_count: number;
      conversion_rate: number;
    };
    anomalies: {
      high_intent_no_payment: Array<{ tenant_id: string; intent_score: number; intent_level: string }>;
    };
  }> {
    const monthStart = utcMonthStartFromKey(month);
    const monthEnd = addUtcMonths(monthStart, 1);
    const prevMonthStart = addUtcMonths(monthStart, -1);

    const tenantIdsRaw = await db.tenant.findMany({ select: { id: true } });
    const tenantIds = tenantIdsRaw.map((t) => String((t as any).id));

    const [usageCurrentGrouped, usagePrevGrouped] = await Promise.all([
      db.aggregatedMetricDaily.groupBy({
        by: ['tenant_id'],
        where: {
          tenant_id: { in: tenantIds } as any,
          metric_key: 'total_event_count',
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { value: true },
      }),
      db.aggregatedMetricDaily.groupBy({
        by: ['tenant_id'],
        where: {
          tenant_id: { in: tenantIds } as any,
          metric_key: 'total_event_count',
          date: { gte: prevMonthStart, lt: monthStart },
        },
        _sum: { value: true },
      }),
    ]);

    const usageCurrentByTenant = new Map<string, number>();
    for (const g of usageCurrentGrouped as any[]) {
      const tenantId = String(g?.tenant_id || '');
      if (!tenantId) continue;
      usageCurrentByTenant.set(tenantId, Number(g?._sum?.value || 0));
    }

    const usagePrevByTenant = new Map<string, number>();
    for (const g of usagePrevGrouped as any[]) {
      const tenantId = String(g?.tenant_id || '');
      if (!tenantId) continue;
      usagePrevByTenant.set(tenantId, Number(g?._sum?.value || 0));
    }

    const planChanges = await db.planChangeRequest.findMany({
      where: {
        created_at: { gte: monthStart, lt: monthEnd },
        reason: 'UPGRADE',
      },
      select: {
        subscription_id: true,
        Subscription: { select: { tenant_id: true } },
      },
    });

    const upgradeAttemptCountByTenant = new Map<string, number>();
    const planChangeTenants = new Set<string>();
    for (const pc of planChanges as any[]) {
      const tenantId = String(pc?.Subscription?.tenant_id || '');
      if (!tenantId) continue;
      planChangeTenants.add(tenantId);
      upgradeAttemptCountByTenant.set(tenantId, (upgradeAttemptCountByTenant.get(tenantId) || 0) + 1);
    }

    const paidUpgradeInvoices = await db.invoice.findMany({
      where: {
        paid_at: { gte: monthStart, lt: monthEnd },
        status: 'PAID' as any,
        Billing: { charge_type: 'UPGRADE' as any },
      },
      select: { tenant_id: true },
    });

    const upgradePaidCountByTenant = new Map<string, number>();
    for (const inv of paidUpgradeInvoices as any[]) {
      const tenantId = String(inv?.tenant_id || '');
      if (!tenantId) continue;
      upgradePaidCountByTenant.set(tenantId, (upgradePaidCountByTenant.get(tenantId) || 0) + 1);
    }

    const overdueGroups = await db.invoice.groupBy({
      by: ['tenant_id'],
      where: {
        created_at: { gte: monthStart, lt: monthEnd },
        status: 'OVERDUE' as any,
      },
      _count: { _all: true },
    });

    const overdueCountByTenant = new Map<string, number>();
    for (const g of overdueGroups as any[]) {
      const tenantId = String(g?.tenant_id || '');
      if (!tenantId) continue;
      overdueCountByTenant.set(tenantId, Number(g?._count?._all || 0));
    }

    const riskCutoffAt = new Date(monthEnd.getTime() - 1);
    const riskScores = await db.tenantRiskScoreLog.findMany({
      where: {
        tenant_id: { in: tenantIds } as any,
        created_at: { lte: riskCutoffAt },
      },
      orderBy: [{ tenant_id: 'asc' }, { created_at: 'desc' }],
      distinct: ['tenant_id'],
      select: { tenant_id: true, risk_score: true, risk_level: true },
    });
    const riskScoreByTenant = new Map<string, number>();
    const riskLevelByTenant = new Map<string, string>();
    for (const r of riskScores as any[]) {
      const tenantId = String(r?.tenant_id || '');
      if (!tenantId) continue;
      riskScoreByTenant.set(tenantId, Number(r?.risk_score || 0));
      riskLevelByTenant.set(tenantId, String(r?.risk_level || 'HEALTHY'));
    }

    const scoreRows: any[] = [];
    const highIntentNoPayment: any[] = [];

    for (const tenantId of tenantIds) {
      const upgradeAttempts = upgradeAttemptCountByTenant.get(tenantId) || 0;
      const upgradePaid = upgradePaidCountByTenant.get(tenantId) || 0;
      const overdueCount = overdueCountByTenant.get(tenantId) || 0;
      const riskScoreSnapshot = riskScoreByTenant.get(tenantId) || 0;
      const riskLevelSnapshot = riskLevelByTenant.get(tenantId) || 'HEALTHY';

      const usageCurrent = usageCurrentByTenant.get(tenantId) || 0;
      const usagePrev = usagePrevByTenant.get(tenantId) || 0;
      const usageGrowthPercent =
        usagePrev > 0 ? ((usageCurrent - usagePrev) / usagePrev) * 100 : null;

      let intentScore = 0;
      if (planChangeTenants.has(tenantId)) intentScore += 25;
      if (upgradeAttempts >= 2) intentScore += 35;
      if (overdueCount >= 1) intentScore += 15;
      if (riskScoreSnapshot >= 70) intentScore += 20;
      if (usageGrowthPercent != null && usageGrowthPercent >= 20) intentScore += 25;

      intentScore = cap100(intentScore);
      const intentLevel = intentLevelFromScore(intentScore);

      if ((intentLevel === 'HIGH' || intentLevel === 'HOT') && upgradePaid === 0 && upgradeAttempts > 0) {
        highIntentNoPayment.push({ tenant_id: tenantId, month, intent_score: intentScore, intent_level: intentLevel });
      }

      scoreRows.push({
        tenant_id: tenantId,
        month,
        intent_score: intentScore,
        intent_level: intentLevel,
        upgrade_attempt_count: upgradeAttempts,
        upgrade_paid_count: upgradePaid,
        usage_growth_percent: usageGrowthPercent,
        invoice_overdue_count: overdueCount,
        risk_score_snapshot: Math.trunc(riskScoreSnapshot),
        risk_level_snapshot: riskLevelSnapshot,
        risk_cutoff_at: riskCutoffAt,
      });
    }

    await db.tenantUpgradeScoreMonthly.createMany({
      data: scoreRows,
      skipDuplicates: true,
    });

    const intentCount = await db.planChangeRequest.count({
      where: { created_at: { gte: monthStart, lt: monthEnd }, reason: 'UPGRADE' },
    });

    const invoiceCreatedCount = await db.invoice.count({
      where: { created_at: { gte: monthStart, lt: monthEnd }, Billing: { charge_type: 'UPGRADE' as any } },
    });

    const invoicePaidCount = await db.invoice.count({
      where: {
        paid_at: { gte: monthStart, lt: monthEnd },
        status: 'PAID' as any,
        Billing: { charge_type: 'UPGRADE' as any },
      },
    });

    const paidUpgradeInvoiceIds = await db.invoice.findMany({
      where: {
        paid_at: { gte: monthStart, lt: monthEnd },
        status: 'PAID' as any,
        Billing: { charge_type: 'UPGRADE' as any },
      },
      select: { id: true },
    });

    const upgradeAppliedCount =
      paidUpgradeInvoiceIds.length > 0
        ? await db.subscription.count({
            where: {
              last_applied_invoice_id: { in: paidUpgradeInvoiceIds.map((x: any) => String(x.id)) },
            },
          })
        : 0;

    const conversionRate = invoiceCreatedCount > 0 ? invoicePaidCount / invoiceCreatedCount : 0;

    try {
      await db.upgradeFunnelMonthly.create({
        data: {
          month,
          intent_count: intentCount,
          invoice_created_count: invoiceCreatedCount,
          invoice_paid_count: invoicePaidCount,
          upgrade_applied_count: upgradeAppliedCount,
          conversion_rate: conversionRate,
        },
      });
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }

    return {
      month,
      tenants: scoreRows.length,
      risk_cutoff_at: riskCutoffAt,
      funnel: {
        intent_count: intentCount,
        invoice_created_count: invoiceCreatedCount,
        invoice_paid_count: invoicePaidCount,
        upgrade_applied_count: upgradeAppliedCount,
        conversion_rate: conversionRate,
      },
      anomalies: { high_intent_no_payment: highIntentNoPayment },
    };
  },

  async getOverview(db: PrismaClient, lastNMonths = 12): Promise<any | null> {
    const take = Number.isFinite(lastNMonths) && lastNMonths > 0 ? Math.floor(lastNMonths) : 12;
    const funnels = await db.upgradeFunnelMonthly.findMany({ orderBy: { month: 'desc' }, take });
    if (!funnels.length) return null;

    const latestMonth = String((funnels[0] as any).month);
    const distribution = await db.tenantUpgradeScoreMonthly.groupBy({
      by: ['intent_level'],
      where: { month: latestMonth },
      _count: { _all: true },
    });

    const topHot = await db.tenantUpgradeScoreMonthly.findMany({
      where: { month: latestMonth, intent_level: 'HOT' },
      orderBy: [{ intent_score: 'desc' }],
      take: 10,
    });

    return { latest_month: latestMonth, funnels, intent_distribution: distribution, top_hot_tenants: topHot };
  },

  async getMonthSnapshot(db: PrismaClient, month: string): Promise<any | null> {
    const funnel = await db.upgradeFunnelMonthly.findUnique({ where: { month } });
    if (!funnel) return null;

    const distribution = await db.tenantUpgradeScoreMonthly.groupBy({
      by: ['intent_level'],
      where: { month },
      _count: { _all: true },
    });

    const topHot = await db.tenantUpgradeScoreMonthly.findMany({
      where: { month, intent_level: 'HOT' },
      orderBy: [{ intent_score: 'desc' }],
      take: 10,
    });

    const scatter = await db.tenantUpgradeScoreMonthly.findMany({
      where: { month },
      select: { tenant_id: true, intent_score: true, risk_score_snapshot: true, intent_level: true, upgrade_paid_count: true },
      orderBy: [{ intent_score: 'desc' }],
      take: 200,
    });

    return { month, funnel, intent_distribution: distribution, top_hot_tenants: topHot, risk_vs_intent_scatter: scatter };
  },

  async getTenantMonth(db: PrismaClient, tenantId: string, month: string): Promise<any | null> {
    return db.tenantUpgradeScoreMonthly.findUnique({
      where: { tenant_id_month: { tenant_id: tenantId, month } } as any,
    });
  },
};
