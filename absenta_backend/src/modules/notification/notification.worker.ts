import { Worker, Job } from 'bullmq';
import { getSmartFrontendBaseUrl } from '@/utils/url-helper';
import { getRedisConnection } from '@/queue/redis';
import { NOTIFICATION_QUEUE_NAME, NotificationJobData } from './notification.queue';
import { parentNotificationService } from '@/modules/parent-app/services/parent-notification.service';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';
import { getEmailQueue } from '@/queue/email.queue';
import { WhatsAppService } from '@/modules/notification/services/whatsapp.service';
import { pushService } from '@/modules/notification/services/push.service';
import { FcmService } from '@/modules/notification/services/fcm.service';
import { prisma } from '@/utils/prisma';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { NotificationEvent } from '@/modules/notification/types/notification-event.enum';
import * as fs from 'fs';
import * as path from 'path';
import { getNotificationDlqQueue } from '@/queues/notification.queue';
import { handleAttendanceDomainEvent } from './services/event-handlers/attendance-event-consumer';
import { handleNotificationRequestDomainEvent } from './services/event-handlers/notification-request-consumer';
import { handlePaymentDomainEvent } from './services/event-handlers/payment-event-consumer';
import { handleParentDomainEvent } from './services/event-handlers/parent-notification-consumer';
import { handleTenantCreatedDomainEvent } from './services/event-handlers/tenant-created-consumer';
import { initEmailWorker } from './email.worker';
import { startWorkerRegistryAndHeartbeat } from '@/infra/workerHeartbeat';

let worker: Worker<NotificationJobData> | null = null;
let domainSubscriberStarted = false;

function loadNotificationTemplate(templateName: string): string {
  const distPath = path.join(__dirname, 'templates', `${templateName}.html`);
  if (fs.existsSync(distPath)) {
    return fs.readFileSync(distPath, 'utf-8');
  }
  const srcPath = path.join(process.cwd(), 'src', 'modules', 'notification', 'templates', `${templateName}.html`);
  return fs.readFileSync(srcPath, 'utf-8');
}

function renderNotificationTemplate(template: string, data: any): string {
  let rendered = template;
  Object.keys(data || {}).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, data[key] ?? '');
  });
  rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (_match, condition, content) => {
    return data?.[condition] ? content : '';
  });
  rendered = rendered.replace(/{{#if\s+\(eq\s+(\w+)\s+'([^']+)'\)}}([\s\S]*?){{\/if}}/g, (_match, variable, value, content) => {
    return data?.[variable] === value ? content : '';
  });
  return rendered;
}

async function processWhatsappSendJob(payload: any): Promise<void> {
  const wa = new WhatsAppService();
  await wa.sendWhatsApp(payload);
}

async function processPaymentEventJob(input: { eventType: 'payment.succeeded' | 'payment.failed'; paymentId: string }): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: String(input.paymentId) },
    include: {
      Billing: { include: { Tenant: true, Invoice: true } },
      Tenant: true,
      Invoice: true,
    } as any,
  });
  if (!payment) return;

  const billing = (payment as any).Billing;
  const tenant = (billing && billing.Tenant) || (payment as any).Tenant;
  if (!tenant) return;

  if (input.eventType === 'payment.succeeded') {
    const config = await systemConfigService.getActive(String(tenant.id));
    const emailEnabled = !(config && (config as any).notif_email_new_payment === false);

    const tenantAdmin = await prisma.user.findFirst({
      where: { tenant_id: String(tenant.id), Role: { name: 'ADMIN' } } as any,
      select: { id: true, email: true, full_name: true, no_hp: true },
    });
    if (!tenantAdmin) return;

    const invoiceNumber =
      (billing as any)?.Invoice?.invoice_number ||
      (billing as any)?.id ||
      String((payment as any).invoice_id || '').slice(0, 8);

    if (tenantAdmin.email && emailEnabled) {
      const template = loadNotificationTemplate('payment-success');
      const html = renderNotificationTemplate(template, {
        studentName: tenantAdmin.full_name || 'Admin',
        schoolName: tenant.name || 'Sekolah',
        amount: Number(payment.amount || 0).toLocaleString('id-ID'),
        paymentMethod: String((payment as any).payment_method || ''),
        transactionId: String((payment as any).gateway_transaction_id || (payment as any).id),
        paidAt: ((payment as any).paid_at ? new Date((payment as any).paid_at) : new Date()).toLocaleString('id-ID'),
        billingDescription: String((billing as any)?.description || 'Subscription Payment'),
      });
      await getEmailQueue().add('SEND_EMAIL', {
        to: String(tenantAdmin.email),
        subject: `Pembayaran Berhasil - ${String((billing as any)?.description || 'Subscription Payment')}`,
        html,
        tenantId: String(tenant.id),
        event: NotificationEvent.INVOICE_PAID,
        relatedId: String((billing as any)?.Invoice?.id || (billing as any)?.id || (payment as any).id),
      });
    }

    try {
      let phone = tenantAdmin.no_hp || null;
      if (!phone) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: tenantAdmin.id },
          select: { no_hp: true },
        });
        phone = (guru as any)?.no_hp || null;
      }
      if (phone) {
        const wa = new WhatsAppService();
        const formatted = wa.formatPhoneNumber(String(phone));
        await wa.sendPaymentSuccessWhatsApp({
          tenantId: String(tenant.id),
          tenantName: String((tenant as any).name || ''),
          recipientPhone: formatted,
          invoiceNumber: String(invoiceNumber),
          amount: Number((payment as any).amount || 0),
          paymentMethod: String((payment as any).payment_method || ''),
          billingId: String((billing as any)?.id || ''),
        });
      }
    } catch {}

    try {
      await prisma.activityLog.create({
        data: {
          tenant_id: String(tenant.id),
          user_id: 'system',
          action: 'NOTIFICATION_DISPATCHED',
          entity: 'BILLING',
          entity_id: String((billing as any)?.id || ''),
          metadata: JSON.stringify({
            type: 'PAYMENT_SUCCESS',
            payment_id: String((payment as any).id),
            email_attempted: Boolean(tenantAdmin.email && emailEnabled),
            whatsapp_attempted: true,
          }),
        } as any,
      });
    } catch {}

    return;
  }

  const payload: any = (payment as any) || {};
  const config = await systemConfigService.getActive(String(tenant.id));
  const emailEnabled = !(config && (config as any).notif_email_payment_failed === false);

  const tenantAdmin = await prisma.user.findFirst({
    where: { tenant_id: String(tenant.id), Role: { name: 'ADMIN' } } as any,
    select: { id: true, email: true, full_name: true, no_hp: true },
  });
  if (!tenantAdmin) return;

  const failureReason = String(payload.failure_reason || payload.failureReason || 'Payment processing failed');
  const invoiceNumber =
    (billing as any)?.Invoice?.invoice_number ||
    (billing as any)?.id ||
    String((payment as any).invoice_id || '').slice(0, 8);

  if (tenantAdmin.email && emailEnabled) {
    const template = loadNotificationTemplate('payment-failure');
    const html = renderNotificationTemplate(template, {
      studentName: tenantAdmin.full_name || 'Admin',
      schoolName: tenant.name || 'Sekolah',
      amount: Number((payment as any).amount || 0).toLocaleString('id-ID'),
      paymentMethod: String((payment as any).payment_method || ''),
      transactionId: String((payment as any).gateway_transaction_id || (payment as any).id),
      attemptTime: new Date().toLocaleString('id-ID'),
      billingDescription: String((billing as any)?.description || 'Subscription Payment'),
      failureReason,
    });
    await getEmailQueue().add('SEND_EMAIL', {
      to: String(tenantAdmin.email),
      subject: `Pembayaran Gagal - ${String((billing as any)?.description || 'Subscription Payment')}`,
      html,
      tenantId: String(tenant.id),
      event: 'PAYMENT_FAILED',
      relatedId: String((billing as any)?.Invoice?.id || (billing as any)?.id || (payment as any).id),
    });
  }

  try {
    let phone = tenantAdmin.no_hp || null;
    if (!phone) {
      const guru = await prisma.guru.findFirst({
        where: { user_id: tenantAdmin.id },
        select: { no_hp: true },
      });
      phone = (guru as any)?.no_hp || null;
    }
    if (phone) {
      const wa = new WhatsAppService();
      const formatted = wa.formatPhoneNumber(String(phone));
      const message = `Halo ${String((tenant as any).name || '')}

Pembayaran invoice ${String(invoiceNumber)} sebesar Rp ${Number((payment as any).amount || 0).toLocaleString('id-ID')} *gagal* ❌

Alasan: ${failureReason}

👉 ${getSmartFrontendBaseUrl()}/billing/subscriptions`;
      await wa.sendWhatsApp({
        phoneNumber: formatted,
        message,
        tenantId: String(tenant.id),
        relatedId: String((billing as any)?.id || ''),
      });
    }
  } catch {}

  try {
    await prisma.activityLog.create({
      data: {
        tenant_id: String(tenant.id),
        user_id: 'system',
        action: 'NOTIFICATION_DISPATCHED',
        entity: 'BILLING',
        entity_id: String((billing as any)?.id || ''),
        metadata: JSON.stringify({
          type: 'PAYMENT_FAILED',
          payment_id: String((payment as any).id),
          email_attempted: Boolean(tenantAdmin.email && emailEnabled),
          whatsapp_attempted: true,
        }),
      } as any,
    });
  } catch {}
}

async function processParentNotificationCreatedJob(input: {
  tenantId: string;
  parentId: string;
  messageType: string;
  title: string;
  message: string;
  event: string;
  relatedId?: string | null;
}): Promise<void> {
  const tenantId = String(input.tenantId || '').trim();
  const parentId = String(input.parentId || '').trim();
  if (!tenantId || !parentId) return;

  const parent = await prisma.orangTua.findFirst({
    where: { id: parentId, tenant_id: tenantId } as any,
    select: { id: true, tenant_id: true, nama: true, no_hp: true } as any,
  });
  if (!parent) return;

  const messageType = String(input.messageType || '').toUpperCase();
  const title = String(input.title || '');
  const message = String(input.message || '');
  const event = String(input.event || 'GENERAL');
  const relatedId = input.relatedId || null;

  if (messageType === 'WA') {
    if (!parent.no_hp) return;
    const wa = new WhatsAppService();
    const formatted = wa.formatPhoneNumber(String(parent.no_hp));
    await wa.sendWhatsApp({
      phoneNumber: formatted,
      message: `*${title}*\n${message}`,
      tenantId: tenantId,
      relatedId: relatedId || undefined,
      subject: title,
      event,
    });
    return;
  }

  if (messageType === 'PWA' || messageType === 'PUSH') {
    let log: any = null;
    try {
      log = await prisma.notificationLog.create({
        data: {
          tenant_id: tenantId,
          type: 'PARENT_APP',
          event,
          recipient: String(parent.id),
          subject: title,
          message,
          status: 'DELIVERED',
          related_id: relatedId || undefined,
        } as any,
      });
    } catch (e: any) {
      if (e && e.code !== 'P2002') {
        throw e;
      }
    }

    try {
      const eventData = {
        recipient: String(parent.id),
        title,
        message,
        type: event,
        related_id: relatedId,
        tenant_id: tenantId,
        log_id: log?.id || null,
        created_at: log?.created_at || new Date().toISOString(),
      };
      const conn = getRedisConnection();
      await (conn as any).publish('events:parent_notification', JSON.stringify(eventData));
    } catch {}

    try {
      const subs = await (prisma as any).parentPushSubscription.findMany({
        where: { orang_tua_id: String(parent.id) },
      });
      if (subs && subs.length > 0) {
        for (const sub of subs) {
          try {
            await pushService.sendWebPush(
              { endpoint: sub.endpoint, keys: sub.keys_json as any },
              title,
              message,
              tenantId,
              event,
              relatedId || undefined,
            );
          } catch {}
        }
      }
    } catch {}

    try {
      const tokens: Array<{ token: string }> = await (prisma as any).$queryRaw`
        SELECT token FROM "ParentFcmToken" WHERE orang_tua_id = ${String(parent.id)}
      `;
      if (tokens && tokens.length > 0) {
        const fcm = new FcmService();
        for (const t of tokens) {
          try {
            await fcm.sendToToken(t.token, title, message, { eventType: event, relatedId, tenantId });
          } catch {}
        }
      }
    } catch {}
  }
}

async function startDomainEventSubscriber(): Promise<void> {
  if (domainSubscriberStarted) return;
  domainSubscriberStarted = true;

  const conn = getRedisConnection();
  const sub = conn.duplicate();
  await sub.subscribe(DOMAIN_EVENT_CHANNEL);

  sub.on('message', async (_channel: string, message: string) => {
    let evt: DomainEvent<any> | null = null;
    try {
      evt = JSON.parse(message);
    } catch {
      evt = null;
    }
    if (!evt || !evt.event_id || !evt.event_type) return;

    const eventType = String(evt.event_type);
    const tenantId = evt.tenant_id ? String(evt.tenant_id) : String((evt.payload as any)?.tenant_id || '');
    const correlationId = String(
      (evt.metadata as any)?.correlation_id ||
        (evt.metadata as any)?.correlationId ||
        (evt.payload as any)?.correlation_id ||
        (evt.payload as any)?.correlationId ||
        '',
    );
    const idempotencyKey = String(
      (evt.metadata as any)?.idempotency_key ||
        (evt.metadata as any)?.idempotencyKey ||
        evt.event_id,
    );

    if (eventType && tenantId) {
      console.log(`[notification-worker] event_type=${eventType} tenant_id=${tenantId} correlation_id=${correlationId} worker_name=notification-worker`);
    }

    const handledAttendance = await handleAttendanceDomainEvent({ evt, conn, eventType, tenantId, idempotencyKey });
    if (handledAttendance) return;

    const handledRequest = await handleNotificationRequestDomainEvent({ evt, conn, eventType, idempotencyKey });
    if (handledRequest) return;

    const handledPayment = await handlePaymentDomainEvent({ evt, conn, eventType, tenantId, correlationId, idempotencyKey });
    if (handledPayment) return;

    const handledParent = await handleParentDomainEvent({ evt, conn, eventType, tenantId, correlationId, idempotencyKey });
    if (handledParent) return;

    const handledTenant = await handleTenantCreatedDomainEvent({ evt, conn, eventType, tenantId, correlationId, idempotencyKey });
    if (handledTenant) return;
  });
}

export const initNotificationWorker = () => {
  if (worker) return;

  console.log('🚀 Notification Worker Initializing...');
  
  // Register heartbeat & registry for monitoring
  try {
    startWorkerRegistryAndHeartbeat(getRedisConnection() as any, 'notification', 10000, {
      concurrency: 5,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });
  } catch (err) {
    console.error('Failed to start notification worker registry heartbeat:', err);
  }

  // Initialize Email Worker to handle the email-queue
  initEmailWorker();

  worker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      const data: any = job.data as any;
      const eventType = String(data?.eventType || job.name || '');
      const tenantId = String(data?.tenantId || data?.payload?.tenantId || '');

      try {
        if (data?.kind === 'payment') {
          await processPaymentEventJob({
            eventType: data.eventType,
            paymentId: String(data.paymentId || ''),
          });
        } else if (data?.kind === 'parent') {
          await processParentNotificationCreatedJob({
            tenantId: String(data.tenantId || ''),
            parentId: String(data.parentId || ''),
            messageType: String(data.messageType || ''),
            title: String(data.title || ''),
            message: String(data.message || ''),
            event: String(data.event || ''),
            relatedId: data.relatedId ?? null,
          });
        } else if (data?.kind === 'whatsapp') {
          await processWhatsappSendJob(data.payload);
        } else {
          await parentNotificationService.handleEvent(data.eventType, data.payload);
        }

        console.log(`[NotificationWorker] Job ${job.id} completed: ${eventType} for tenant ${tenantId}`);
      } catch (error) {
        console.error(`[NotificationWorker] Job ${job.id} failed:`, error);
        throw error; // Let BullMQ handle retries
      }
    },
    {
      connection: getRedisConnection() as any,
      concurrency: 5, // Process 5 notifications in parallel
      limiter: {
        max: 50, // Max 50 jobs
        duration: 1000, // per 1 second (Rate limit external APIs)
      }
    }
  );

  worker.on('completed', () => {
    // Optional: Metrics
  });

  worker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job ${job?.id} failed with ${err.message}`);
  });
  worker.on('failed', async (job: any, err: any) => {
    try {
      const maxAttempts = typeof job?.opts?.attempts === 'number' ? job.opts.attempts : 1;
      const attemptsMade = typeof job?.attemptsMade === 'number' ? job.attemptsMade : 0;
      if (attemptsMade < maxAttempts) return;
      const dlq = getNotificationDlqQueue();
      await dlq.add(
        `dlq:${String(job?.name || 'parent-notification')}`,
        {
          queue_name: NOTIFICATION_QUEUE_NAME,
          worker_name: 'notification-worker',
          event_type: String(job?.data?.eventType || job?.name || ''),
          job_id: String(job?.id || ''),
          retry_count: attemptsMade,
          tenant_id: job?.data?.tenantId || null,
          correlation_id:
            (job?.data as any)?.correlation_id ||
            (job?.data as any)?.correlationId ||
            (job?.data?.payload as any)?.correlation_id ||
            (job?.data?.payload as any)?.correlationId ||
            null,
          payload: job?.data || null,
          error_message: String(err?.message || err || ''),
          failed_at: new Date().toISOString(),
        },
        { jobId: `parent_notification_dlq_${String(job?.id || '')}` },
      );
    } catch {}
  });

  void startDomainEventSubscriber();

  console.log('✅ Notification Worker Started');
};

export const closeNotificationWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
