import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';
import { upgradeIntelligenceService } from '../modules/upgrade-intelligence/services/upgradeIntelligence.service';
import { prisma } from '../utils/prisma';
import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'upgradeIntelligence',
  schedule: '30 3 * * *', // jam 03:30 setiap hari
  envFlag: 'UPGRADE_INTELLIGENCE_ENABLED',
  async run() {
    const now = new Date();
    const yyyyMMdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const correlationId = `cron-upgrade-intelligence-${yyyyMMdd}`;
    const currentMonthStart = upgradeIntelligenceService.normalizeMonth(now);
    const targetMonthStart = new Date(
      Date.UTC(
        currentMonthStart.getUTCFullYear(),
        currentMonthStart.getUTCMonth() - 1,
        1, 0, 0, 0, 0
      )
    );
    const monthKey = upgradeIntelligenceService.monthKeyUtc(targetMonthStart);
    const jobId = `upgrade-intelligence-${monthKey}`;

    appLogger.info({ correlation_id: correlationId }, 'upgradeIntelligence.cycle_started');

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.upgradeIntelligenceJobLock.create({ data: { month: monthKey } });
      } catch (err: any) {
        if (err?.code === 'P2002') return { skippedDuplicate: true as const };
        throw err;
      }
      const computed = await upgradeIntelligenceService.computeAndInsertMonthly(tx, monthKey);
      return { skippedDuplicate: false as const, computed };
    });

    if ((result as any).skippedDuplicate) {
      // Sudah diproses bulan ini — skip tanpa error
      observabilityService.logEvent({
        event_type: 'UPGRADE_INTELLIGENCE_SKIPPED',
        domain: 'CRON',
        severity: 'INFO',
        entity_type: 'JOB',
        entity_id: jobId,
        tenant_id: 'system',
        correlation_id: correlationId,
        metadata: { job: 'upgrade-intelligence', job_id: jobId, month: monthKey },
      });
      return;
    }

    const computed = (result as any).computed;

    appLogger.info(
      { correlation_id: correlationId, month: monthKey, tenants: computed.tenants },
      'upgradeIntelligence.cycle_completed'
    );

    observabilityService.logEvent({
      event_type: 'UPGRADE_SCORE_CALCULATED',
      domain: 'CRON',
      severity: 'INFO',
      entity_type: 'UPGRADE_SCORE',
      entity_id: `upgrade-score-${monthKey}`,
      tenant_id: 'system',
      correlation_id: correlationId,
      metadata: { month: monthKey, tenants: computed.tenants, risk_cutoff_at: computed.risk_cutoff_at },
    });

    for (const anomaly of computed?.anomalies?.high_intent_no_payment || []) {
      observabilityService.logEvent({
        event_type: 'UPGRADE_ANOMALY_HIGH_INTENT_NO_PAYMENT',
        domain: 'CRON',
        severity: 'WARNING',
        entity_type: 'TENANT',
        entity_id: String(anomaly.tenant_id),
        tenant_id: String(anomaly.tenant_id),
        correlation_id: correlationId,
        metadata: { month: monthKey, intent_score: anomaly.intent_score, intent_level: anomaly.intent_level },
      });
    }

    observabilityService.logEvent({
      event_type: 'UPGRADE_INTELLIGENCE_CALCULATED',
      domain: 'CRON',
      severity: 'INFO',
      entity_type: 'JOB',
      entity_id: jobId,
      tenant_id: 'system',
      correlation_id: correlationId,
      metadata: { job: 'upgrade-intelligence', job_id: jobId, month: monthKey, tenants: computed.tenants },
    });
  },
});

/**
 * Jalankan satu siklus upgrade intelligence.
 * Diekspor untuk backward compatibility dengan analytics.worker.ts
 */
export async function runUpgradeIntelligenceCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('upgradeIntelligence');
}
