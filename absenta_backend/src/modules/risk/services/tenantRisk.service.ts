import { prisma } from '../../../utils/prisma';
import { appLogger } from '../../../utils/app-logger';
import { TenantRiskLevel, TenantRiskEventSeverity } from '@prisma/client';
import { getEmailQueue } from '../../../queue/email.queue';
import { NotificationEvent } from '../../notification/types/notification-event.enum';
import { observabilityService } from '../../observability/services/observability.service';

type TenantRiskMetrics = {
  email_failure_rate: number;
  payment_failure_rate: number;
  suspension_count_30d: number;
  invoice_overdue_count_30d: number;
  renewal_delay_avg: number | null;
};

type TenantRiskScoreResult = {
  tenant_id: string;
  risk_score: number;
  risk_level: TenantRiskLevel;
  metrics: TenantRiskMetrics;
  last_calculated_at: Date;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function asYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeRiskLevel(score: number): TenantRiskLevel {
  if (score >= 75) return TenantRiskLevel.CRITICAL;
  if (score >= 50) return TenantRiskLevel.HIGH_RISK;
  if (score >= 25) return TenantRiskLevel.WARNING;
  return TenantRiskLevel.HEALTHY;
}

function scoreFromMetrics(metrics: TenantRiskMetrics): number {
  let score = 0;

  const emailFailureRate = clamp01(metrics.email_failure_rate);
  if (emailFailureRate > 0.4) score += 35;
  else if (emailFailureRate > 0.2) score += 20;

  const paymentFailureRate = clamp01(metrics.payment_failure_rate);
  if (paymentFailureRate > 0.3) score += 40;
  else if (paymentFailureRate > 0.15) score += 20;

  const overdueScore = Math.min(25, Math.max(0, Math.floor(metrics.invoice_overdue_count_30d) * 5));
  score += overdueScore;

  const suspensionScore = Math.max(0, Math.floor(metrics.suspension_count_30d) * 15);
  score += suspensionScore;

  const renewalDelayAvg = typeof metrics.renewal_delay_avg === 'number' ? metrics.renewal_delay_avg : null;
  if (typeof renewalDelayAvg === 'number' && Number.isFinite(renewalDelayAvg) && renewalDelayAvg > 3) score += 10;

  return Math.min(100, Math.max(0, score));
}

function severityFromRiskLevel(level: TenantRiskLevel): TenantRiskEventSeverity {
  switch (level) {
    case TenantRiskLevel.CRITICAL:
    case TenantRiskLevel.HIGH_RISK:
      return TenantRiskEventSeverity.HIGH;
    case TenantRiskLevel.WARNING:
      return TenantRiskEventSeverity.MEDIUM;
    default:
      return TenantRiskEventSeverity.LOW;
  }
}

export class TenantRiskService {
  async getTenantRisk(tenantId: string): Promise<{
    score: any | null;
    recent_events: any[];
  }> {
    const [score, recentEvents] = await Promise.all([
      prisma.tenantRiskScore.findUnique({
        where: { tenant_id: tenantId },
        include: { Tenant: { select: { id: true, name: true } } },
      }),
      prisma.tenantRiskEvent.findMany({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
        take: 30,
      }),
    ]);

    return { score, recent_events: recentEvents };
  }

  async calculateAllTenantsRisk(): Promise<{ processed: number; failed: number }> {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    let processed = 0;
    let failed = 0;

    for (const t of tenants) {
      try {
        await this.calculateTenantRisk(t.id);
        processed += 1;
      } catch (err) {
        failed += 1;
        appLogger.warn({ err, tenant_id: t.id }, 'tenantRisk.calculateTenantRisk_failed');
      }
    }

    return { processed, failed };
  }

  async calculateTenantRisk(tenantId: string): Promise<TenantRiskScoreResult> {
    const now = new Date();
    const existing = await prisma.tenantRiskScore.findUnique({ where: { tenant_id: tenantId } });
    if (existing && asYyyyMmDd(existing.last_calculated_at) === asYyyyMmDd(now)) {
      await prisma.tenantRiskScore.update({
        where: { tenant_id: tenantId },
        data: { last_calculated_at: now },
      });
      return {
        tenant_id: tenantId,
        risk_score: existing.risk_score,
        risk_level: existing.risk_level,
        metrics: {
          email_failure_rate: existing.email_failure_rate,
          payment_failure_rate: existing.payment_failure_rate,
          suspension_count_30d: existing.suspension_count_30d,
          invoice_overdue_count_30d: existing.invoice_overdue_count_30d,
          renewal_delay_avg: existing.renewal_delay_avg,
        },
        last_calculated_at: now,
      };
    }

    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      emailFailedCount,
      emailTotalCount,
      paymentFailedCount,
      paymentTerminalCount,
      suspendedCount,
      overdueInvoiceCount,
      paidInvoices,
      tenant,
    ] = await Promise.all([
      prisma.notificationLog.count({
        where: { tenant_id: tenantId, type: 'EMAIL', status: 'FAILED', created_at: { gte: since } },
      }),
      prisma.notificationLog.count({
        where: { tenant_id: tenantId, type: 'EMAIL', status: { in: ['SENT', 'FAILED'] }, created_at: { gte: since } },
      }),
      prisma.payment.count({
        where: { tenant_id: tenantId, status: { in: ['FAILED', 'EXPIRED'] }, created_at: { gte: since } },
      }),
      prisma.payment.count({
        where: { tenant_id: tenantId, status: { in: ['SUCCESS', 'FAILED', 'EXPIRED'] }, created_at: { gte: since } },
      }),
      prisma.subscription.count({
        where: { tenant_id: tenantId, status: 'SUSPENDED', updated_at: { gte: since } },
      }),
      prisma.invoice.count({
        where: { tenant_id: tenantId, status: 'OVERDUE', due_date: { gte: since, lt: now } },
      }),
      prisma.invoice.findMany({
        where: { tenant_id: tenantId, status: 'PAID', paid_at: { not: null }, due_date: { gte: since } },
        select: { due_date: true, paid_at: true },
        take: 500,
      }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } }),
    ]);

    const emailFailureRate = emailTotalCount > 0 ? emailFailedCount / emailTotalCount : 0;
    const paymentFailureRate = paymentTerminalCount > 0 ? paymentFailedCount / paymentTerminalCount : 0;

    const renewalDelayAvg = (() => {
      if (!paidInvoices || paidInvoices.length === 0) return null;
      let totalDays = 0;
      let n = 0;
      for (const inv of paidInvoices) {
        if (!inv?.paid_at) continue;
        const diffMs = inv.paid_at.getTime() - inv.due_date.getTime();
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        if (Number.isFinite(diffDays) && diffDays >= 0) {
          totalDays += diffDays;
          n += 1;
        }
      }
      if (n === 0) return null;
      return totalDays / n;
    })();

    const metrics: TenantRiskMetrics = {
      email_failure_rate: emailFailureRate,
      payment_failure_rate: paymentFailureRate,
      suspension_count_30d: suspendedCount,
      invoice_overdue_count_30d: overdueInvoiceCount,
      renewal_delay_avg: renewalDelayAvg,
    };

    const riskScore = scoreFromMetrics(metrics);
    const riskLevel = computeRiskLevel(riskScore);

    const next = await prisma.tenantRiskScore.upsert({
      where: { tenant_id: tenantId },
      create: {
        tenant_id: tenantId,
        risk_score: riskScore,
        risk_level: riskLevel,
        email_failure_rate: metrics.email_failure_rate,
        payment_failure_rate: metrics.payment_failure_rate,
        suspension_count_30d: metrics.suspension_count_30d,
        invoice_overdue_count_30d: metrics.invoice_overdue_count_30d,
        renewal_delay_avg: metrics.renewal_delay_avg ?? undefined,
        last_calculated_at: now,
      },
      update: {
        risk_score: riskScore,
        risk_level: riskLevel,
        email_failure_rate: metrics.email_failure_rate,
        payment_failure_rate: metrics.payment_failure_rate,
        suspension_count_30d: metrics.suspension_count_30d,
        invoice_overdue_count_30d: metrics.invoice_overdue_count_30d,
        renewal_delay_avg: metrics.renewal_delay_avg ?? undefined,
        last_calculated_at: now,
      },
    });

    await prisma.tenantRiskScoreLog.create({
      data: {
        tenant_id: tenantId,
        risk_score: riskScore,
        risk_level: riskLevel,
      },
    });

    const prevLevel = existing?.risk_level ?? null;
    if (prevLevel && prevLevel !== riskLevel) {
      await this.logRiskEvent({
        tenant_id: tenantId,
        event_type: 'RISK_LEVEL_CHANGED',
        severity: severityFromRiskLevel(riskLevel),
        metric_value: riskScore,
        metadata: {
          previous_level: prevLevel,
          new_level: riskLevel,
          metrics,
          tenant_name: tenant?.name ?? null,
        },
      });

      observabilityService.logEvent({
        event_type: 'RISK_CALCULATED',
        domain: 'ALERT',
        severity: riskLevel === TenantRiskLevel.CRITICAL ? 'CRITICAL' : 'WARNING',
        entity_type: 'TENANT',
        entity_id: tenantId,
        tenant_id: tenantId,
        metadata: { previous_level: prevLevel, new_level: riskLevel, risk_score: riskScore, metrics, change: 'risk_level_changed' },
      });

      if (riskLevel === TenantRiskLevel.HIGH_RISK || riskLevel === TenantRiskLevel.CRITICAL) {
        await this.sendInternalRiskAlert({
          tenant_id: tenantId,
          tenant_name: tenant?.name ?? tenantId,
          risk_level: riskLevel,
          risk_score: riskScore,
          metrics,
        });
      }
    }

    return {
      tenant_id: tenantId,
      risk_score: next.risk_score,
      risk_level: next.risk_level,
      metrics,
      last_calculated_at: now,
    };
  }

  async logRiskEvent(params: {
    tenant_id: string;
    event_type: string;
    severity: TenantRiskEventSeverity;
    metric_value?: number | null;
    metadata?: any;
  }): Promise<void> {
    await prisma.tenantRiskEvent.create({
      data: {
        tenant_id: params.tenant_id,
        event_type: params.event_type,
        severity: params.severity,
        metric_value: typeof params.metric_value === 'number' ? params.metric_value : undefined,
        metadata: params.metadata ?? undefined,
      },
    });
  }

  private renderInternalAlertHtml(input: {
    tenant_id: string;
    tenant_name: string;
    risk_level: TenantRiskLevel;
    risk_score: number;
    metrics: TenantRiskMetrics;
  }): string {
    const asJson = (() => {
      try {
        return JSON.stringify(input.metrics, null, 2);
      } catch {
        return '{}';
      }
    })();
    return `
      <h2>Tenant Risk Alert</h2>
      <p><strong>Tenant:</strong> ${String(input.tenant_name)} (${String(input.tenant_id)})</p>
      <p><strong>Risk Level:</strong> ${String(input.risk_level)}</p>
      <p><strong>Risk Score:</strong> ${String(input.risk_score)}</p>
      <pre>${asJson}</pre>
    `;
  }

  private async sendInternalRiskAlert(input: {
    tenant_id: string;
    tenant_name: string;
    risk_level: TenantRiskLevel;
    risk_score: number;
    metrics: TenantRiskMetrics;
  }): Promise<void> {
    const to = String(process.env.ALERT_EMAIL || '').trim();
    if (!to) {
      appLogger.warn({ tenant_id: input.tenant_id }, 'tenantRisk.alertEmail_not_configured');
      return;
    }

    const subject = `[${input.risk_level}] Tenant Risk: ${input.tenant_name}`;
    const html = this.renderInternalAlertHtml(input);
    const relatedId = `tenant-risk-${input.tenant_id}-${asYyyyMmDd(new Date())}`;

    const emailQueue = getEmailQueue();
    await emailQueue.add('SEND_EMAIL', {
      to,
      subject,
      html,
      event: NotificationEvent.ALERT_TRIGGERED,
      relatedId,
      tenantId: 'system',
    });

    observabilityService.logEvent({
      event_type: 'RISK_CALCULATED',
      domain: 'ALERT',
      severity: input.risk_level === TenantRiskLevel.CRITICAL ? 'CRITICAL' : 'WARNING',
      entity_type: 'TENANT',
      entity_id: input.tenant_id,
      tenant_id: input.tenant_id,
      metadata: { risk_level: input.risk_level, risk_score: input.risk_score, change: 'alert_enqueued' },
    });
  }
}

export const tenantRiskService = new TenantRiskService();
