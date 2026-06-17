import { prisma } from '../../../utils/prisma';
import { appLogger } from '../../../utils/app-logger';
import { OBSERVABILITY_ALLOWED_EVENTS } from '../../../constants/logOwnership';

export type ObservabilityDomain = 'BILLING' | 'PAYMENT' | 'QUEUE' | 'CRON' | 'EMAIL' | 'AUTH' | 'INVOICE' | 'UPGRADE' | 'ALERT' | 'INFRA';
export type ObservabilitySeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type QueueJobStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

export type LogEventParams = {
  event_type: string;
  domain: ObservabilityDomain;
  severity: ObservabilitySeverity;
  entity_type?: string;
  entity_id?: string;
  tenant_id?: string | null;
  metadata?: any;
  correlation_id?: string | null;
};

export type LogQueueParams = {
  queue_name: string;
  job_id: string;
  job_type: string;
  status: QueueJobStatus;
  attempt?: number | null;
  duration_ms?: number | null;
  error_message?: string | null;
  tenant_id?: string | null;
  correlation_id?: string | null;
};

export class ObservabilityService {
  scheduleRetention(): void {
    const enabled = String(process.env.OBSERVABILITY_RETENTION_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) return;

    const DAY_MS = 24 * 60 * 60 * 1000;
    void this.purgeOldLogs();
    setInterval(() => {
      void this.purgeOldLogs();
    }, DAY_MS);
  }

  async purgeOldLogs(): Promise<void> {
    const enabled = String(process.env.OBSERVABILITY_RETENTION_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) return;

    const queueDaysRaw = Number.parseInt(String(process.env.OBSERVABILITY_RETENTION_DAYS_QUEUE_JOB || '30'), 10);
    const batchSizeRaw = Number.parseInt(String(process.env.OBSERVABILITY_RETENTION_BATCH_SIZE || '5000'), 10);

    const queueDays = Number.isFinite(queueDaysRaw) && queueDaysRaw > 0 ? queueDaysRaw : 30;
    const batchSize = Number.isFinite(batchSizeRaw) && batchSizeRaw > 0 ? batchSizeRaw : 5000;

    const now = Date.now();
    const queueCutoff = new Date(now - queueDays * 24 * 60 * 60 * 1000);

    try {
      const deletedQueue = await this.purgeQueueJobLog(queueCutoff, batchSize);
      if (deletedQueue > 0) {
        appLogger.info(
          { deleted_queue_job_log: deletedQueue, queue_days: queueDays },
          'observability.retention_purged'
        );
      }
    } catch (err) {
      appLogger.error({ err }, 'observability.retention_purge_failed');
    }
  }

  logEvent(params: LogEventParams): void {
    if (!OBSERVABILITY_ALLOWED_EVENTS.includes(params.event_type as any)) {
      throw new Error('Log Ownership Violation: Event not allowed in this log layer');
    }

    queueMicrotask(() => {
      void prisma.systemEventLog
        .create({
          data: {
            event_type: params.event_type,
            domain: params.domain,
            severity: params.severity,
            entity_type: params.entity_type || null,
            entity_id: params.entity_id || null,
            tenant_id: params.tenant_id || null,
            metadata: params.metadata ?? undefined,
            correlation_id: params.correlation_id || null,
          },
        })
        .catch((error) => {
          appLogger.warn(
            {
              err: error,
              event_type: params.event_type,
              domain: params.domain,
              entity_type: params.entity_type,
              entity_id: params.entity_id,
              tenant_id: params.tenant_id,
            },
            'observability.logEvent_failed'
          );
        });
    });
  }

  logQueueStart(params: Omit<LogQueueParams, 'status'>): void {
    this.logQueue({ ...params, status: 'STARTED' });
  }

  logQueueComplete(params: Omit<LogQueueParams, 'status' | 'error_message'>): void {
    this.logQueue({ ...params, status: 'COMPLETED', error_message: null });
  }

  logQueueFail(params: Omit<LogQueueParams, 'status'>): void {
    this.logQueue({ ...params, status: 'FAILED' });
  }

  private logQueue(params: LogQueueParams): void {
    queueMicrotask(() => {
      void prisma.queueJobLog
        .create({
          data: {
            queue_name: params.queue_name,
            job_id: params.job_id,
            job_type: params.job_type,
            status: params.status,
            attempt: params.attempt ?? null,
            duration_ms: params.duration_ms ?? null,
            error_message: params.error_message ?? null,
            tenant_id: params.tenant_id ?? null,
          },
        })
        .catch((error) => {
          appLogger.warn(
            {
              err: error,
              queue_name: params.queue_name,
              job_id: params.job_id,
              job_type: params.job_type,
              status: params.status,
            },
            'observability.logQueue_failed'
          );
        });

      if (params.status === 'FAILED') {
        this.logEvent({
          event_type: 'QUEUE_JOB_FAILED',
          domain: 'QUEUE',
          severity: 'ERROR',
          entity_type: 'QUEUE_JOB',
          entity_id: params.job_id,
          tenant_id: params.tenant_id ?? null,
          correlation_id: params.correlation_id ?? null,
          metadata: {
            queue_name: params.queue_name,
            job_type: params.job_type,
            attempt: params.attempt ?? null,
            duration_ms: params.duration_ms ?? null,
            error_message: params.error_message ?? null,
            status: params.status,
          },
        });
      }
    });
  }

  private async purgeQueueJobLog(olderThan: Date, batchSize: number): Promise<number> {
    let totalDeleted = 0;
    for (;;) {
      const rows = await prisma.queueJobLog.findMany({
        where: { created_at: { lt: olderThan } },
        select: { id: true },
        orderBy: { created_at: 'asc' },
        take: batchSize,
      });
      if (rows.length === 0) break;
      const ids = rows.map((r) => r.id);
      const res = await prisma.queueJobLog.deleteMany({ where: { id: { in: ids } } });
      totalDeleted += res.count;
      if (rows.length < batchSize) break;
    }
    return totalDeleted;
  }
}

export const observabilityService = new ObservabilityService();
