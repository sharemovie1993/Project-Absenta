import { defineCronJob } from '../infra/jobEngine';
import { prisma } from '../utils/prisma';
import { BpbkService } from '../modules/bpbk/services/bpbk.service';
import { appLogger } from '../utils/app-logger';
import { observabilityService } from '../modules/observability/services/observability.service';

export default defineCronJob({
  name: 'ewsSnapshot',
  schedule: '0 1 * * *', // Setiap hari pukul 01:00 pagi
  async run() {
    appLogger.info('Starting ewsSnapshot job...');
    const tenants = await prisma.tenant.findMany({
      select: { id: true }
    });

    let processedCount = 0;
    let failedCount = 0;
    const now = new Date();

    for (const tenant of tenants) {
      try {
        const ewsList = await BpbkService.calculateEwsForSiswa(tenant.id);
        
        if (ewsList.length === 0) continue;

        const snapshotsData = ewsList.map((e: any) => ({
          tenant_id: tenant.id,
          siswa_id: e.siswa.id,
          risk_score: e.riskScore,
          risk_level: e.riskLevel,
          violations_score: e.violations * 1.5,
          achievement_score: e.achievements * 0.5,
          alpa_count: e.alpaCount,
          active_cases: e.activeCasesCount,
          snapshot_date: now
        }));

        // Bulk insert
        await prisma.ewsSnapshot.createMany({
          data: snapshotsData
        });

        processedCount += ewsList.length;
      } catch (error: any) {
        failedCount++;
        appLogger.error({ err: error, tenantId: tenant.id }, 'ewsSnapshot.tenant_failed');
      }
    }

    appLogger.info({ processedCount, failedCount }, 'ewsSnapshot.cycle_completed');

    observabilityService.logEvent({
      event_type: 'EWS_SNAPSHOT_CALCULATED',
      domain: 'CRON',
      severity: failedCount > 0 ? 'WARNING' : 'INFO',
      entity_type: 'JOB',
      entity_id: 'ews-snapshot',
      tenant_id: 'system',
      correlation_id: `cron-ews-snapshot-${now.toISOString().slice(0, 10)}`,
      metadata: { job: 'ewsSnapshot', processed: processedCount, failed: failedCount },
    });
  },
});
