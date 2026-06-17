import { Prisma } from '@prisma/client';

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addUtcMonths(monthStart: Date, months: number): Date {
  return new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export const cohortService = {
  async calculateAndUpsertCohorts(db: Prisma.TransactionClient) {
    const latest = await db.revenue_snapshot_monthly.findFirst({
      where: { tenant_id: null },
      orderBy: { month: 'desc' },
      select: { month: true },
    });
    const latestSnapshotMonth = latest?.month ? utcMonthStart(latest.month) : null;
    if (!latestSnapshotMonth) return { cohorts_processed: 0, latest_snapshot_month: null };

    const groups = await db.subscription.groupBy({
      by: ['tenant_id'],
      _min: { start_date: true },
    });

    const cohortTenants = new Map<string, string[]>();
    const tenantToCohort = new Map<string, string>();

    for (const g of groups) {
      const tenantId = String((g as any).tenant_id);
      const startedAt = (g as any)._min?.start_date as Date | null | undefined;
      if (!startedAt) continue;
      const cohortMonth = utcMonthStart(startedAt);
      const key = monthKey(cohortMonth);
      cohortTenants.set(key, [...(cohortTenants.get(key) || []), tenantId]);
      tenantToCohort.set(tenantId, key);
    }

    const cohortKeys = Array.from(cohortTenants.keys()).sort((a, b) => (a < b ? -1 : 1));
    const offsets = [1, 3, 6, 12];

    const targetMonthKeys = new Set<string>();
    for (const key of cohortKeys) {
      const [y, m] = key.split('-').map((x) => Number(x));
      const cohortMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      for (const off of offsets) {
        const target = addUtcMonths(cohortMonth, off);
        if (target.getTime() <= latestSnapshotMonth.getTime()) targetMonthKeys.add(monthKey(target));
      }
    }

    const activeByMonth = new Map<string, Set<string>>();
    for (const key of targetMonthKeys) {
      const [y, m] = key.split('-').map((x) => Number(x));
      const month = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const rows = await db.revenue_snapshot_monthly.findMany({
        where: { month, tenant_id: { not: null }, mrr: { gt: 0 } },
        select: { tenant_id: true },
      });
      activeByMonth.set(
        key,
        new Set(rows.map((r) => String((r as any).tenant_id)))
      );
    }

    const revenueWindowMonths: Date[] = [];
    for (let i = 0; i < 12; i += 1) {
      revenueWindowMonths.push(addUtcMonths(latestSnapshotMonth, -i));
    }

    const revenueGeneratedByCohort = new Map<string, number>();
    for (const month of revenueWindowMonths) {
      const rows = await db.revenue_snapshot_monthly.findMany({
        where: { month, tenant_id: { not: null }, mrr: { gt: 0 } },
        select: { tenant_id: true, mrr: true },
      });
      for (const r of rows) {
        const tenantId = String((r as any).tenant_id);
        const cohortKey = tenantToCohort.get(tenantId);
        if (!cohortKey) continue;
        const amount = Number((r as any).mrr || 0);
        revenueGeneratedByCohort.set(cohortKey, (revenueGeneratedByCohort.get(cohortKey) || 0) + amount);
      }
    }

    let processed = 0;
    const prevMonth = addUtcMonths(latestSnapshotMonth, -1);
    const prevMonthActiveRows = await db.revenue_snapshot_monthly.findMany({
      where: { month: prevMonth, tenant_id: { not: null }, mrr: { gt: 0 } },
      select: { tenant_id: true },
    });
    const latestActiveRows = await db.revenue_snapshot_monthly.findMany({
      where: { month: latestSnapshotMonth, tenant_id: { not: null }, mrr: { gt: 0 } },
      select: { tenant_id: true },
    });
    const activePrev = new Set(prevMonthActiveRows.map((r) => String((r as any).tenant_id)));
    const activeNow = new Set(latestActiveRows.map((r) => String((r as any).tenant_id)));

    for (const key of cohortKeys) {
      const [y, m] = key.split('-').map((x) => Number(x));
      const cohortMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const tenants = cohortTenants.get(key) || [];
      const activeCount = tenants.length;

      const retained = (off: number) => {
        const target = addUtcMonths(cohortMonth, off);
        if (target.getTime() > latestSnapshotMonth.getTime()) return 0;
        const set = activeByMonth.get(monthKey(target)) || new Set<string>();
        let count = 0;
        for (const tenantId of tenants) {
          if (set.has(tenantId)) count += 1;
        }
        return count;
      };

      let churnedCount = 0;
      for (const tenantId of tenants) {
        if (activePrev.has(tenantId) && !activeNow.has(tenantId)) churnedCount += 1;
      }

      const row = await db.tenantCohortMonthly.upsert({
        where: { cohort_month_month: { cohort_month: cohortMonth, month: latestSnapshotMonth } } as any,
        create: {
          cohort_month: cohortMonth,
          month: latestSnapshotMonth,
          active_count: activeCount,
          churned_count: churnedCount,
          retained_after_1_month: retained(1),
          retained_after_3_month: retained(3),
          retained_after_6_month: retained(6),
          retained_after_12_month: retained(12),
          revenue_generated: Number(revenueGeneratedByCohort.get(key) || 0),
        },
        update: {
          active_count: activeCount,
          churned_count: churnedCount,
          retained_after_1_month: retained(1),
          retained_after_3_month: retained(3),
          retained_after_6_month: retained(6),
          retained_after_12_month: retained(12),
          revenue_generated: Number(revenueGeneratedByCohort.get(key) || 0),
          calculated_at: new Date(),
        },
      });

      processed += 1;
      void row;
    }

    return { cohorts_processed: processed, latest_snapshot_month: latestSnapshotMonth };
  },

  async getCohortRetention(db: Prisma.TransactionClient, limit: number) {
    const take = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 24;
    const latestMonthRow = await db.tenantCohortMonthly.findFirst({ orderBy: { month: 'desc' }, select: { month: true } });
    if (!latestMonthRow?.month) return [];

    const rows = await db.tenantCohortMonthly.findMany({ where: { month: latestMonthRow.month }, orderBy: { cohort_month: 'desc' }, take });
    return rows
      .map((r) => ({
        cohort_month: (r as any).cohort_month,
        month: (r as any).month,
        active_count: Number((r as any).active_count || 0),
        churned_count: Number((r as any).churned_count || 0),
        retained_after_1_month: Number((r as any).retained_after_1_month || 0),
        retained_after_3_month: Number((r as any).retained_after_3_month || 0),
        retained_after_6_month: Number((r as any).retained_after_6_month || 0),
        retained_after_12_month: Number((r as any).retained_after_12_month || 0),
        revenue_generated: Number((r as any).revenue_generated || 0),
        calculated_at: (r as any).calculated_at,
      }))
      .reverse();
  },
};
