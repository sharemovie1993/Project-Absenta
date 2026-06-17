import { defineCronJob } from '../infra/jobEngine';
import { tenantRiskService } from '../modules/risk/services/tenantRisk.service';
import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';

export default defineCronJob({
  name: 'tenantRisk',
  schedule: '0 0 * * *', // tengah malam setiap hari
  envFlag: 'TENANT_RISK_CRON_ENABLED',
  async run() {
    const result = await tenantRiskService.calculateAllTenantsRisk();
    appLogger.info({ ...result }, 'tenantRisk.cycle_completed');
    observabilityService.logEvent({
      event_type: 'RISK_CALCULATED',
      domain: 'CRON',
      severity: result.failed > 0 ? 'WARNING' : 'INFO',
      entity_type: 'JOB',
      entity_id: 'tenant-risk',
      tenant_id: 'system',
      correlation_id: `cron-tenant-risk-${new Date().toISOString().slice(0, 10)}`,
      metadata: { job: 'tenant-risk', processed: result.processed, failed: result.failed },
    });
  },
});

/**
 * Jalankan satu siklus kalkulasi risiko tenant.
 * Diekspor untuk backward compatibility dengan analytics.worker.ts
 */
export async function runTenantRiskCycle() {
  const { jobEngine } = await import('../infra/jobEngine');
  await jobEngine.triggerJob('tenantRisk');
}
