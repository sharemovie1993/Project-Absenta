import { prisma } from '../../../utils/prisma';
import { getEmailQueue } from '../../../queue/email.queue';
import { NotificationEvent } from '../../notification/types/notification-event.enum';
import { observabilityService } from './observability.service';
import { appLogger } from '../../../utils/app-logger';

type AlertType = 'EMAIL_FAILURE_SPIKE' | 'PAYMENT_FAILURE_SPIKE' | 'WORKER_FAILURE_RATE';

export class AlertEngine {
  async runAllChecks(): Promise<void> {
    await this.checkEmailFailureSpike().catch((err) => {
      appLogger.warn({ err }, 'alertEngine.checkEmailFailureSpike_failed');
    });
    await this.checkPaymentFailureSpike().catch((err) => {
      appLogger.warn({ err }, 'alertEngine.checkPaymentFailureSpike_failed');
    });
    await this.checkWorkerFailureRate().catch((err) => {
      appLogger.warn({ err }, 'alertEngine.checkWorkerFailureRate_failed');
    });
  }

  private async checkEmailFailureSpike(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
    const threshold = 20;

    const failedCount = await prisma.queueJobLog.count({
      where: {
        job_type: 'SEND_EMAIL',
        status: 'FAILED',
        created_at: { gte: windowStart },
      },
    });

    if (failedCount > threshold) {
      await this.triggerAlert({
        alertType: 'EMAIL_FAILURE_SPIKE',
        severity: 'CRITICAL',
        metricValue: failedCount,
        thresholdValue: threshold,
        windowStart,
        windowEnd: now,
      });
    }
  }

  private async checkPaymentFailureSpike(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 10 * 60 * 1000);
    const threshold = 10;

    const failedCount = await prisma.systemEventLog.count({
      where: {
        event_type: { in: ['PAYMENT_FAILED', 'payment.failed'] } as any,
        created_at: { gte: windowStart },
      },
    });

    if (failedCount > threshold) {
      await this.triggerAlert({
        alertType: 'PAYMENT_FAILURE_SPIKE',
        severity: 'CRITICAL',
        metricValue: failedCount,
        thresholdValue: threshold,
        windowStart,
        windowEnd: now,
      });
    }
  }

  private async checkWorkerFailureRate(): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000);
    const threshold = 0.3;
    const minTotal = 20;

    const [totalJobs, failedJobs] = await Promise.all([
      prisma.queueJobLog.count({ where: { created_at: { gte: windowStart } } }),
      prisma.queueJobLog.count({ where: { created_at: { gte: windowStart }, status: 'FAILED' } }),
    ]);

    if (totalJobs <= minTotal) return;

    const failureRate = totalJobs > 0 ? failedJobs / totalJobs : 0;
    if (failureRate > threshold) {
      await this.triggerAlert({
        alertType: 'WORKER_FAILURE_RATE',
        severity: 'CRITICAL',
        metricValue: failureRate,
        thresholdValue: threshold,
        windowStart,
        windowEnd: now,
        metadata: { total_jobs: totalJobs, failed_jobs: failedJobs },
      });
    }
  }

  private async triggerAlert(params: {
    alertType: AlertType;
    severity: string;
    metricValue: number;
    thresholdValue: number;
    windowStart: Date;
    windowEnd: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const now = new Date();
    const cooldownMs = 10 * 60 * 1000;
    const cooldownUntil = new Date(now.getTime() + cooldownMs);

    const existing = await prisma.alertLog.findFirst({
      where: {
        alert_type: params.alertType,
        status: 'OPEN',
        cooldown_until: { gt: now },
      },
      select: { id: true, cooldown_until: true },
    });

    if (existing) {
      appLogger.info(
        { alert_type: params.alertType, cooldown_until: existing.cooldown_until },
        'alertEngine.dedup_skipped'
      );
      return;
    }

    const alert = await prisma.alertLog.create({
      data: {
        alert_type: params.alertType,
        severity: params.severity,
        metric_value: params.metricValue,
        threshold_value: params.thresholdValue,
        window_start: params.windowStart,
        window_end: params.windowEnd,
        cooldown_until: cooldownUntil,
      },
      select: { id: true, alert_type: true, severity: true, metric_value: true, threshold_value: true, window_start: true },
    });

    observabilityService.logEvent({
      event_type: 'CRON_EXECUTED',
      domain: 'ALERT',
      severity: 'CRITICAL',
      entity_type: 'AlertLog',
      entity_id: alert.id,
      tenant_id: null,
      correlation_id: null,
      metadata: {
        job: 'alertEngine.triggerAlert',
        alert_type: alert.alert_type,
        metric_value: alert.metric_value,
        threshold_value: alert.threshold_value,
        window_start: alert.window_start,
        window_end: params.windowEnd,
        ...(params.metadata || {}),
      },
    });

    const to = String(process.env.ALERT_EMAIL || '').trim();
    if (!to) {
      console.warn('[alertEngine] ALERT_EMAIL is not set. Skipping alert delivery.');
      return;
    }

    const relatedId = `alert-${params.alertType}-${params.windowStart.getTime()}`;
    const subject = `[CRITICAL] ${params.alertType}`;
    const html = this.renderAlertTemplate({
      alertType: params.alertType,
      severity: params.severity,
      metricValue: params.metricValue,
      thresholdValue: params.thresholdValue,
      windowStart: params.windowStart,
      windowEnd: params.windowEnd,
      cooldownUntil,
      extra: params.metadata || {},
    });

    const emailQueue = getEmailQueue();
    await emailQueue.add('SEND_EMAIL', {
      to,
      subject,
      html,
      event: NotificationEvent.ALERT_TRIGGERED,
      relatedId,
      tenantId: 'system',
    });
  }

  private renderAlertTemplate(input: {
    alertType: string;
    severity: string;
    metricValue: number;
    thresholdValue: number;
    windowStart: Date;
    windowEnd: Date;
    cooldownUntil: Date;
    extra: Record<string, any>;
  }): string {
    const asJson = (() => {
      try {
        return JSON.stringify(input.extra || {}, null, 2);
      } catch {
        return '{}';
      }
    })();

    return `
      <h2>System Alert</h2>
      <p><strong>Alert Type:</strong> ${String(input.alertType)}</p>
      <p><strong>Severity:</strong> ${String(input.severity)}</p>
      <p><strong>Metric:</strong> ${String(input.metricValue)}</p>
      <p><strong>Threshold:</strong> ${String(input.thresholdValue)}</p>
      <p><strong>Window:</strong> ${input.windowStart.toISOString()} - ${input.windowEnd.toISOString()}</p>
      <p><strong>Cooldown Until:</strong> ${input.cooldownUntil.toISOString()}</p>
      <pre>${asJson}</pre>
    `;
  }
}
