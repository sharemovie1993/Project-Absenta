import { Queue } from 'bullmq';
import { getRedisConnection } from '@/queue/redis';
import { ParentEventType } from '@/modules/parent-app/constants/parent-event-matrix';

export const NOTIFICATION_QUEUE_NAME = 'parent-notification';

export type NotificationJobData = {
  eventType: ParentEventType;
  payload: any;
  tenantId: string;
  kind?: undefined;
} | {
  kind: 'payment';
  eventType: 'payment.succeeded' | 'payment.failed';
  tenantId: string;
  paymentId: string;
  correlationId?: string;
} | {
  kind: 'parent';
  eventType: 'parent.notification.created';
  tenantId: string;
  parentId: string;
  messageType: string;
  title: string;
  message: string;
  event: string;
  relatedId?: string | null;
  correlationId?: string;
} | {
  kind: 'whatsapp';
  eventType: 'notification.whatsapp.send-requested' | 'notification.whatsapp.send_requested';
  payload: any;
  tenantId?: string;
};

let queue: Queue<NotificationJobData> | null = null;

export const getNotificationQueue = (): Queue<NotificationJobData> => {
  if (queue) return queue;
  queue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: { count: 100 }, // Keep last 100 failed jobs for inspection
    },
  });
  return queue;
};
