import { getSmartFrontendBaseUrl } from '../utils/url-helper';
import { prisma } from '../utils/prisma';
import { billingService } from '../modules/billing/services/billing.service';
import { InvoiceService } from '../modules/invoice/services/invoice.service';
import { EmailService } from '../modules/notification/services/email.service';
import { getEmailQueue } from '../queue/email.queue';
import { systemConfigService } from '../modules/system-config/services/system-config.service';
import { WhatsAppService } from '../modules/notification/services/whatsapp.service';
import { observabilityService } from '../modules/observability/services/observability.service';
import { observabilityAggregationService } from '../modules/observability/services/observabilityAggregation.service';
import { appLogger } from '../utils/app-logger';
import { getRecurringQueue } from '../queues/recurring.queue';
import { ObservabilityMetricType } from '@prisma/client';
import { applyDueDowngradeForSubscriptionCommand } from '../modules/billing/services/commands/apply-due-downgrades.command';
import { applyDueCancelForSubscriptionCommand } from '../modules/billing/services/commands/apply-due-cancel.command';

const DUE_DAYS = parseInt(process.env.DUE_DAYS || '3');
const GRACE_PERIOD_DAYS = parseInt(process.env.GRACE_PERIOD_DAYS || '7');

export async function processDueSubscription(subscriptionId: string, correlationId?: string) {
  const now = new Date();

  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { Plan: true },
  });

  if (!sub) return;
  if (sub.status !== 'ACTIVE') return;
  if (sub.auto_renew !== true) return;

  const billingDate = sub.next_billing_date;
  if (!billingDate) return;
  if (billingDate.getTime() > now.getTime()) return;

  try {
    const cancelled = await applyDueCancelForSubscriptionCommand(sub.id, billingDate);
    if (cancelled) return;
  } catch {}

  try {
    await applyDueDowngradeForSubscriptionCommand(sub.id, billingDate);
  } catch {}

  const effectiveSub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { Plan: true },
  });

  if (!effectiveSub) return;
  if (effectiveSub.status !== 'ACTIVE') return;
  if (effectiveSub.auto_renew !== true) return;

  let amount = sub.Plan?.price_monthly;
  if (effectiveSub.price_snapshot !== null && effectiveSub.price_snapshot !== undefined) {
    amount = effectiveSub.price_snapshot;
  } else {
    amount = effectiveSub.Plan?.price_monthly;
  }

  if (typeof amount !== 'number' || amount <= 0) return;

  const startOfDay = new Date(billingDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(billingDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await prisma.billing.findFirst({
    where: {
      subscription_id: effectiveSub.id,
      billing_date: { gte: startOfDay, lte: endOfDay },
    },
    select: { id: true },
  });
  if (existing) return;

  const dueDate = new Date(billingDate);
  dueDate.setDate(dueDate.getDate() + DUE_DAYS);

  const billing = await billingService.createBilling({
    subscription_id: effectiveSub.id,
    amount,
    billing_date: billingDate,
    due_date: dueDate,
    correlation_id: correlationId || undefined,
  });

  const invoiceSvc = new InvoiceService();
  try {
    await invoiceSvc.generateInvoiceFromBilling(effectiveSub.tenant_id, billing.id, { due_date: dueDate });
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (!/already exists/i.test(msg)) throw err;
  }

  try {
    const tenantAdmin = await prisma.user.findFirst({
      where: { tenant_id: effectiveSub.tenant_id, Role: { name: 'ADMIN' } },
      select: { email: true, no_hp: true, full_name: true },
    });
    if (tenantAdmin?.email) {
      const cfg = await systemConfigService.getActive(effectiveSub.tenant_id);
      if (!(cfg && cfg.notif_email_monthly_summary === false)) {
        const emailSvc = new EmailService();
        await emailSvc.sendBillingReminder(tenantAdmin.email, {
          billingDescription: effectiveSub.Plan?.name || 'Subscription',
          amount: billing.amount,
          currency: effectiveSub.Plan?.currency || 'IDR',
          dueDate,
          daysUntilDue: Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
          isOverdue: false,
          paymentUrl: `${getSmartFrontendBaseUrl()}/billing/subscriptions`,
        } as any);
      }
    }
  } catch {}

  const next = new Date(billingDate);
  if (effectiveSub.Plan?.billing_period === 'YEAR') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  await prisma.subscription.updateMany({
    where: {
      id: effectiveSub.id,
      status: 'ACTIVE',
      auto_renew: true,
      next_billing_date: billingDate,
    },
    data: { next_billing_date: next },
  });
}

export async function processTrialEnd(subscriptionId: string, _correlationId?: string) {
  const now = new Date();

  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { Plan: true },
  });

  if (!sub) return;
  if (sub.status !== 'TRIAL') return;
  if (!sub.end_date) return;
  if (sub.end_date.getTime() > now.getTime()) return;

  const blockingBilling = await prisma.billing.findFirst({
    where: {
      subscription_id: sub.id,
      Invoice: { status: { in: ['SENT', 'VIEWED', 'OVERDUE'] } },
    },
    select: { id: true },
  });
  if (blockingBilling) return;

  const updated = await prisma.subscription.updateMany({
    where: {
      id: sub.id,
      status: 'TRIAL',
      end_date: { lte: now },
    },
    data: { status: 'EXPIRED', expired_reason: 'TRIAL_END', auto_renew: false },
  });

  if (!updated.count) return;

  observabilityService.logEvent({
    event_type: 'CRON_EXECUTED',
    domain: 'CRON',
    severity: 'INFO',
    entity_type: 'SUBSCRIPTION',
    entity_id: String(sub.id),
    tenant_id: String(sub.tenant_id),
    correlation_id: null,
    metadata: {
      job: 'processTrialEnd',
      result: 'SUBSCRIPTION_EXPIRED',
      reason: 'TRIAL_END',
    },
  });

  try {
    const tenantAdmin = await prisma.user.findFirst({
      where: { tenant_id: sub.tenant_id, Role: { name: 'ADMIN' } },
      select: { email: true, no_hp: true },
    });

    if (tenantAdmin?.email) {
      const cfg = await systemConfigService.getActive(sub.tenant_id);
      if (!(cfg && cfg.notif_email_subscription_expired === false)) {
        const emailSvc = new EmailService();
        const tenant = await prisma.tenant.findUnique({ where: { id: sub.tenant_id }, select: { name: true } });
        const endDate = sub.end_date || now;
        const daysLeft = Math.max(0, Math.ceil(((endDate as Date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        await emailSvc.sendTrialEndingNotification(tenantAdmin.email, {
          tenantName: tenant?.name || 'Tenant',
          planName: sub.Plan?.name || 'Free Trial',
          endDate: new Date(endDate as Date).toLocaleDateString('id-ID'),
          daysLeft,
          ctaUrl: `${getSmartFrontendBaseUrl()}/billing/subscriptions`,
          tenantId: sub.tenant_id,
        });
      }
    }

    if (tenantAdmin?.no_hp) {
      const ws = new WhatsAppService();
      const phone = ws.formatPhoneNumber(tenantAdmin.no_hp);
      await ws.sendTrialExpiredWhatsApp({
        tenantId: sub.tenant_id,
        tenantName: (await prisma.tenant.findUnique({ where: { id: sub.tenant_id }, select: { name: true } }))?.name || 'Tenant',
        recipientPhone: phone,
        billingUrl: `${getSmartFrontendBaseUrl()}/billing/subscriptions`,
      });
    }
  } catch {}
}

export async function processInvoiceOverdue(invoiceId: string, correlationId?: string) {
  const now = new Date();

  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      Billing: { include: { Subscription: { include: { Tenant: true, Plan: true } } } },
    },
  });

  if (!inv) return;
  if (inv.status !== 'SENT') return;
  if ((inv.due_date as Date).getTime() >= now.getTime()) return;

  const updated = await prisma.invoice.updateMany({
    where: {
      id: inv.id,
      status: 'SENT',
      due_date: { lt: now },
    },
    data: { status: 'OVERDUE', updated_at: new Date() },
  });

  if (!updated.count) return;

  const sub = inv.Billing?.Subscription;
  if (!sub) return;

  observabilityService.logEvent({
    event_type: 'INVOICE_OVERDUE',
    domain: 'INVOICE',
    severity: 'WARNING',
    entity_type: 'INVOICE',
    entity_id: String(inv.id),
    tenant_id: String(sub.tenant_id),
    correlation_id: correlationId || null,
    metadata: {
      invoice_number: String(inv.invoice_number || ''),
      billing_id: inv.billing_id ? String(inv.billing_id) : null,
      subscription_id: String(sub.id),
    },
  });

  const tenantAdmin = await prisma.user.findFirst({
    where: { tenant_id: sub.tenant_id, Role: { name: 'ADMIN' } },
    select: { email: true, full_name: true, no_hp: true },
  });

  if (tenantAdmin?.email) {
    const { NotificationEvent } = await import('../modules/notification/types/notification-event.enum');
    const amountIdr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.total_amount || inv.amount);
    const dueDateStr = new Date(inv.due_date).toLocaleDateString('id-ID');

    const emailQueue = getEmailQueue();
    await emailQueue.add('SEND_EMAIL', {
      to: tenantAdmin.email,
      subject: `Tagihan Overdue - ${inv.invoice_number}`,
      html: `
                                <h3>Tagihan Jatuh Tempo</h3>
                                <p>Halo ${tenantAdmin.full_name || 'Admin'},</p>
                                <p>Tagihan <strong>${inv.invoice_number}</strong> senilai <strong>${amountIdr}</strong> telah melewati jatuh tempo pada ${dueDateStr}.</p>
                                <p>Status saat ini: <strong style="color:red">OVERDUE</strong></p>
                                <p>Mohon segera lakukan pembayaran untuk menghindari penangguhan layanan.</p>
                            `,
      event: NotificationEvent.INVOICE_OVERDUE,
      relatedId: inv.id,
      tenantId: sub.tenant_id,
      correlationId: correlationId || undefined,
    });
  }

  if (tenantAdmin?.no_hp) {
    try {
      const { WhatsAppService } = await import('../modules/notification/services/whatsapp.service');
      const ws = new WhatsAppService();
      const phone = ws.formatPhoneNumber(tenantAdmin.no_hp);
      await ws.sendBillingOverdueWhatsApp({
        tenantId: sub.tenant_id,
        tenantName: sub.Tenant?.name || 'Tenant',
        adminName: tenantAdmin.full_name || 'Admin',
        recipientPhone: phone,
        amount: Number(inv.total_amount || inv.amount || 0),
        dueDate: inv.due_date as any,
        invoiceId: inv.id,
        billingId: inv.billing_id || sub.id,
        phase: 'OVERDUE',
      });
    } catch {}
  }
}

export async function processInvoiceSuspension(invoiceId: string, correlationId?: string) {
  const now = new Date();
  const graceStart = new Date(now);
  graceStart.setDate(graceStart.getDate() - GRACE_PERIOD_DAYS);

  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      Billing: { include: { Subscription: { include: { Tenant: true, Plan: true } } } },
    },
  });

  if (!inv) return;
  if (inv.status !== 'OVERDUE') return;
  if ((inv.due_date as Date).getTime() >= graceStart.getTime()) return;

  const sub = inv.Billing?.Subscription;
  if (!sub) return;

  const updated = await prisma.subscription.updateMany({
    where: {
      id: sub.id,
      status: { not: 'SUSPENDED' },
    },
    data: { status: 'SUSPENDED' },
  });

  if (!updated.count) return;

  observabilityService.logEvent({
    event_type: 'SUBSCRIPTION_AUTO_SUSPENDED',
    domain: 'BILLING',
    severity: 'WARNING',
    entity_type: 'SUBSCRIPTION',
    entity_id: String(sub.id),
    tenant_id: String(sub.tenant_id),
    correlation_id: correlationId || null,
    metadata: {
      invoice_id: String(inv.id),
      invoice_number: String(inv.invoice_number || ''),
      billing_id: inv.billing_id ? String(inv.billing_id) : null,
    },
  });
  void observabilityAggregationService.incrementMetric(ObservabilityMetricType.SUBSCRIPTION_SUSPENDED, String(sub.tenant_id));

  const tenantAdmin = await prisma.user.findFirst({
    where: { tenant_id: sub.tenant_id, Role: { name: 'ADMIN' } },
    select: { email: true, full_name: true, no_hp: true },
  });

  if (tenantAdmin?.email) {
    const { NotificationEvent } = await import('../modules/notification/types/notification-event.enum');
    const emailSvc = new EmailService();
    await emailSvc.sendEmail({
      to: tenantAdmin.email,
      subject: `Layanan Ditangguhkan - ${sub.Tenant?.name}`,
      html: `
                                <h3>Layanan Ditangguhkan</h3>
                                <p>Halo ${tenantAdmin.full_name || 'Admin'},</p>
                                <p>Layanan Anda telah dinonaktifkan sementara karena tagihan <strong>${inv.invoice_number}</strong> belum dibayar setelah masa tenggang.</p>
                                <p>Silakan lunasi tagihan untuk mengaktifkan kembali layanan secara otomatis.</p>
                             `,
      event: NotificationEvent.SUBSCRIPTION_SUSPENDED,
      relatedId: sub.id,
      tenantId: sub.tenant_id,
      correlationId: correlationId || undefined,
    });
  }

  if (tenantAdmin?.no_hp) {
    try {
      const { WhatsAppService } = await import('../modules/notification/services/whatsapp.service');
      const ws = new WhatsAppService();
      const phone = ws.formatPhoneNumber(tenantAdmin.no_hp);
      await ws.sendBillingSuspendedWhatsApp({
        tenantId: sub.tenant_id,
        tenantName: sub.Tenant?.name || 'Tenant',
        adminName: tenantAdmin.full_name || 'Admin',
        recipientPhone: phone,
        invoiceId: inv.id,
        billingId: inv.billing_id || undefined,
        phase: 'SUSPENDED',
      });
    } catch {}
  }
}

import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'recurringBilling',
  schedule: '0 1 * * *', // jam 01:00 setiap hari
  async run() {
    const now = new Date();
    const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const correlationId = `cron-recurring-${yyyyMMdd}`;
    let enqueued = 0;
    const recurringQueue = getRecurringQueue();

    const dueSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', auto_renew: true, next_billing_date: { lte: now } },
      select: { id: true, tenant_id: true },
    });
    for (const sub of dueSubscriptions) {
      await recurringQueue.add('PROCESS_DUE_SUBSCRIPTION',
        { subscriptionId: sub.id, tenantId: sub.tenant_id, correlationId },
        { jobId: `due-sub-${sub.id}-${yyyyMMdd}` }
      );
      enqueued++;
    }

    const trialEnded = await prisma.subscription.findMany({
      where: {
        status: 'TRIAL', end_date: { lte: now },
        Billing: { none: { Invoice: { status: { in: ['SENT', 'VIEWED', 'OVERDUE'] } } } },
      },
      select: { id: true, tenant_id: true },
    });
    for (const sub of trialEnded) {
      await recurringQueue.add('PROCESS_TRIAL_END',
        { subscriptionId: sub.id, tenantId: sub.tenant_id, correlationId },
        { jobId: `trial-end-${sub.id}-${yyyyMMdd}` }
      );
      enqueued++;
    }

    const toOverdue = await prisma.invoice.findMany({
      where: { status: 'SENT', due_date: { lt: now } },
      select: { id: true, tenant_id: true },
    });
    for (const inv of toOverdue) {
      await recurringQueue.add('PROCESS_INVOICE_OVERDUE',
        { invoiceId: inv.id, tenantId: inv.tenant_id, correlationId },
        { jobId: `overdue-${inv.id}` }
      );
      enqueued++;
    }

    const graceStart = new Date(now);
    graceStart.setDate(graceStart.getDate() - GRACE_PERIOD_DAYS);
    const toSuspend = await prisma.invoice.findMany({
      where: {
        status: 'OVERDUE', due_date: { lt: graceStart },
        Billing: { Subscription: { status: { not: 'SUSPENDED' } } },
      },
      select: { id: true, tenant_id: true },
    });
    for (const inv of toSuspend) {
      await recurringQueue.add('PROCESS_INVOICE_SUSPENSION',
        { invoiceId: inv.id, tenantId: inv.tenant_id, correlationId },
        { jobId: `suspend-${inv.id}` }
      );
      enqueued++;
    }

    appLogger.info({ enqueued }, 'recurringBilling.enqueued_jobs');
  },
});

/**
 * Jalankan satu siklus tagihan berkala.
 * Diekspor untuk backward compatibility dengan billing.controller.ts dan billing.worker.ts
 */
export async function runRecurringBillingCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('recurringBilling');
}
