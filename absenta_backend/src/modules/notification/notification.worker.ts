import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '@/queue/redis';
import { NOTIFICATION_QUEUE_NAME, NotificationJobData } from './notification.queue';
import { parentNotificationService } from '@/modules/parent-app/services/parent-notification.service';
import { DOMAIN_EVENT_CHANNEL } from '@/infra/event-bus';
import type { DomainEvent } from '@/infra/event-bus';
import { WhatsAppService } from '@/modules/notification/services/whatsapp.service';
import { pushService } from '@/modules/notification/services/push.service';
import { FcmService } from '@/modules/notification/services/fcm.service';
import { prisma } from '@/utils/prisma';
import { getNotificationDlqQueue } from '@/queues/notification.queue';
import { handleAttendanceDomainEvent } from './services/event-handlers/attendance-event-consumer';
import { handleNotificationRequestDomainEvent } from './services/event-handlers/notification-request-consumer';
import { handlePaymentDomainEvent } from './services/event-handlers/payment-event-consumer';
import { handleParentDomainEvent } from './services/event-handlers/parent-notification-consumer';
import { handleTenantCreatedDomainEvent } from './services/event-handlers/tenant-created-consumer';
import { initEmailWorker } from './email.worker';
import { startWorkerRegistryAndHeartbeat } from '@/infra/workerHeartbeat';
import { appLogger } from '@/utils/app-logger';

let worker: Worker<NotificationJobData> | null = null;
let domainSubscriberStarted = false;



async function processWhatsappSendJob(payload: any): Promise<void> {
  const wa = new WhatsAppService();
  await wa.sendWhatsApp(payload);
}

async function processPaymentEventJob(_input: { eventType: 'payment.succeeded' | 'payment.failed'; paymentId: string }): Promise<void> {
  // Payment events are handled outside the application now
  return;
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

  appLogger.info({}, 'notification_worker.initializing');
  
  // Register heartbeat & registry for monitoring
  try {
    startWorkerRegistryAndHeartbeat(getRedisConnection() as any, 'notification', 10000, {
      concurrency: 5,
      version: process.env.WORKER_VERSION || process.env.APP_VERSION,
    });
  } catch (err) {
    appLogger.error({ error: (err as any)?.message }, 'notification_worker.heartbeat_error');
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

        appLogger.info({ jobId: job.id, eventType, tenant_id: tenantId }, 'notification_worker.job_completed');
      } catch (error) {
        appLogger.error({ jobId: job.id, error: (error as any)?.message }, 'notification_worker.job_failed');
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
    appLogger.error({ jobId: job?.id, error: err.message }, 'notification_worker.job_failed');
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

  appLogger.info({}, 'notification_worker.started');
};

export const closeNotificationWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
};
