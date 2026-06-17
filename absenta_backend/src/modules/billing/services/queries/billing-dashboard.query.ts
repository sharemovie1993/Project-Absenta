import { billingDb as prisma } from '../repositories/billing.db';

export async function getFinancialDashboardRawMetricsQuery(tenantId?: string) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [paidInvoices30d, paidInvoices24h, paidThisMonth, paidLastMonth, failedPayments30d, activeSubscriptionsCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        ...(tenantId && { Billing: { Subscription: { tenant_id: tenantId } } }),
        status: 'PAID' as any,
        created_at: { gte: thirtyDaysAgo, lte: now },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        ...(tenantId && { Billing: { Subscription: { tenant_id: tenantId } } }),
        status: 'PAID' as any,
        created_at: { gte: oneDayAgo, lte: now },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        ...(tenantId && { Billing: { Subscription: { tenant_id: tenantId } } }),
        status: 'PAID' as any,
        created_at: { gte: startOfThisMonth, lte: now },
      },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        ...(tenantId && { Billing: { Subscription: { tenant_id: tenantId } } }),
        status: 'PAID' as any,
        created_at: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        status: 'FAILED' as any,
        created_at: { gte: thirtyDaysAgo, lte: now },
      },
    }),
    prisma.subscription.count({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        status: 'ACTIVE' as any,
      },
    }),
  ]);

  return {
    monthlyRevenue30d: paidInvoices30d._sum.amount || 0,
    dailyRevenue: paidInvoices24h._sum.amount || 0,
    thisMonthRevenue: paidThisMonth._sum.amount || 0,
    lastMonthRevenue: paidLastMonth._sum.amount || 0,
    failedPayments30d,
    activeSubscriptionsCount,
  };
}

export async function getBillingDashboardNotificationsQuery(tenantId?: string) {
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      ...(tenantId && { Billing: { Subscription: { tenant_id: tenantId } } }),
      status: 'OVERDUE' as any,
    },
    include: {
      Billing: {
        include: {
          Subscription: { include: { Tenant: true, Plan: true } },
        },
      },
    },
    orderBy: { due_date: 'asc' },
    take: 10,
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      ...(tenantId && { Billing: { Subscription: { tenant_id: tenantId } } }),
      status: 'SENT' as any,
      due_date: {
        gte: new Date(),
        lte: nextWeek,
      },
    },
    include: {
      Billing: {
        include: {
          Subscription: { include: { Tenant: true, Plan: true } },
        },
      },
    },
    orderBy: { due_date: 'asc' },
    take: 10,
  });

  const notifications = [
    ...overdueInvoices.map((inv: any) => ({
      id: `overdue-${inv.id}`,
      type: 'payment_due',
      title: 'Invoice Overdue',
      message: `Invoice ${inv.invoice_number} terlambat untuk ${inv.Billing?.Subscription?.Tenant?.name || 'Unknown'} - ${inv.Billing?.Subscription?.Plan?.name || 'Unknown Plan'}`,
      tenant_id: inv.Billing?.Subscription?.tenant_id,
      is_read: false,
      amount: inv.amount,
      due_date: inv.due_date,
      tenant_name: inv.Billing?.Subscription?.Tenant?.name,
      plan_name: inv.Billing?.Subscription?.Plan?.name,
      priority: 'high',
      created_at: inv.created_at,
    })),
    ...upcomingInvoices.map((inv: any) => ({
      id: `upcoming-${inv.id}`,
      type: 'payment_due',
      title: 'Invoice Jatuh Tempo',
      message: `Invoice ${inv.invoice_number} akan jatuh tempo untuk ${inv.Billing?.Subscription?.Tenant?.name || 'Unknown'} - ${inv.Billing?.Subscription?.Plan?.name || 'Unknown Plan'}`,
      tenant_id: inv.Billing?.Subscription?.tenant_id,
      is_read: false,
      amount: inv.amount,
      due_date: inv.due_date,
      tenant_name: inv.Billing?.Subscription?.Tenant?.name,
      plan_name: inv.Billing?.Subscription?.Plan?.name,
      priority: 'medium',
      created_at: inv.created_at,
    })),
  ];

  return notifications.slice(0, 20);
}

export async function getBillingDashboardRecentActivitiesQuery(tenantId: string | undefined, limit: number) {
  const take = Number.isFinite(limit) && limit > 0 ? Math.min(50, limit) : 10;
  const recentBillings = await prisma.billing.findMany({
    where: {
      ...(tenantId ? { Subscription: { tenant_id: tenantId } } : {}),
      Invoice: {
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'OVERDUE', 'PAID'] as any },
      },
    },
    include: {
      Invoice: true,
      Subscription: {
        include: {
          Tenant: { select: { id: true, name: true, domain: true } },
          Plan: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take,
  });

  const normalizeStatus = (invStatus?: string) => {
    const s = String(invStatus || '').toUpperCase();
    if (s === 'PAID') return 'PAID';
    if (s === 'OVERDUE') return 'OVERDUE';
    return 'UNPAID';
  };

  return (recentBillings as any[]).map((b: any) => ({
    ...b,
    status: normalizeStatus(b?.Invoice?.status),
    invoice_number: b?.Invoice?.invoice_number || b?.invoice_number,
    due_date: b?.Invoice?.due_date || b?.due_date,
    paid_at: b?.Invoice?.paid_at || b?.paid_at,
  }));
}

export async function getRevenueChartDataQuery(tenantId: string | undefined, monthsCount: number) {
  const safeMonths = Number.isFinite(monthsCount) ? Math.max(1, Math.min(24, monthsCount)) : 6;
  const chartData: any[] = [];

  for (let i = safeMonths - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const [monthlyStats, paidStats] = await Promise.all([
      prisma.billing.aggregate({
        where: {
          ...(tenantId && {
            Subscription: {
              tenant_id: tenantId,
            },
          }),
          created_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: {
          ...(tenantId && { tenant_id: tenantId }),
          status: 'PAID' as any,
          created_at: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
    ]);

    chartData.push({
      month: date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
      revenue: monthlyStats._sum.amount || 0,
      paid_revenue: paidStats._sum?.total_amount || 0,
      billings: monthlyStats._count.id || 0,
      paid_billings: paidStats._count.id || 0,
      year: date.getFullYear(),
      month_number: date.getMonth() + 1,
    });
  }

  return chartData;
}

export async function getBillingHealthSummaryQuery() {
  const now = new Date();
  const lookbackHoursRaw = Number.parseInt(process.env.BILLING_HEALTH_SUMMARY_LOOKBACK_HOURS || '6', 10);
  const lookbackHours = Number.isFinite(lookbackHoursRaw) ? Math.max(1, lookbackHoursRaw) : 6;
  const cutoff = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [latestPerTenant, webhookFailuresLast1h, reconciliationFixCountLast1h] = await Promise.all([
    prisma.$queryRaw<{ tenant_id: string; metadata: any | null; created_at: Date }[]>`SELECT DISTINCT ON (tenant_id) tenant_id, metadata, created_at
          FROM "SystemEventLog"
          WHERE domain = 'CRON' AND entity_type = 'BILLING_HEALTH_SCAN' AND created_at >= ${cutoff}
          ORDER BY tenant_id, created_at DESC`,
    prisma.systemEventLog.count({
      where: {
        event_type: { in: ['PAYMENT_WEBHOOK_PROCESSED', 'payment.webhook.processed'] } as any,
        domain: 'PAYMENT',
        created_at: { gte: oneHourAgo },
        metadata: {
          path: ['status'],
          equals: 'FAILED',
        },
      },
    }),
    prisma.systemEventLog.count({
      where: {
        event_type: 'PAYMENT_SUCCESS' as any,
        domain: 'PAYMENT',
        created_at: { gte: oneHourAgo },
        metadata: {
          path: ['source'],
          equals: 'reconciliation_job',
        },
      },
    }),
  ]);

  let activeWithoutPaidInvoiceCount = 0;
  let paidNotAppliedCount = 0;
  let invalidInvoicePeriodCount = 0;

  for (const row of latestPerTenant as any[]) {
    if (!row.metadata) continue;
    const parsed =
      typeof row.metadata === 'string'
        ? (() => {
            try {
              return JSON.parse(row.metadata);
            } catch {
              return null;
            }
          })()
        : row.metadata;
    if (!parsed) continue;

    const issues = parsed?.issues || {};
    const activeIssue = issues?.active_subscriptions_without_paid_invoice_covering_now;
    const paidNotAppliedIssue = issues?.paid_invoices_not_applied_to_subscription;
    const invalidPeriodIssue = issues?.invoices_missing_period_start_or_end;

    const a = Number(activeIssue?.count ?? 0);
    const b = Number(paidNotAppliedIssue?.count ?? 0);
    const c = Number(invalidPeriodIssue?.count ?? 0);

    if (Number.isFinite(a)) activeWithoutPaidInvoiceCount += a;
    if (Number.isFinite(b)) paidNotAppliedCount += b;
    if (Number.isFinite(c)) invalidInvoicePeriodCount += c;
  }

  return {
    active_without_paid_invoice_count: activeWithoutPaidInvoiceCount,
    paid_not_applied_count: paidNotAppliedCount,
    invalid_invoice_period_count: invalidInvoicePeriodCount,
    webhook_failures_last_1h: webhookFailuresLast1h,
    reconciliation_fix_count_last_1h: reconciliationFixCountLast1h,
  };
}

