import { defineCronJob } from '../infra/jobEngine';
import { prisma } from '../utils/prisma';
import { syncLocalSubscriptionsWithLicensingServer } from '../modules/billing/controllers/subscription.controller';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'licensePullSync',
  schedule: '*/10 * * * *', // Setiap 10 menit (Heartbeat & Revocation Sync behind CGNAT)
  async run() {
    appLogger.info({ job: 'licensePullSync' }, 'Starting outbound licensing reconciliation sync (10m interval)...');
    try {
      const tenants = await prisma.tenant.findMany({
        select: { id: true }
      });
      appLogger.info({ job: 'licensePullSync' }, `Found ${tenants.length} tenants to sync.`);
      
      for (const tenant of tenants) {
        try {
          appLogger.info({ job: 'licensePullSync' }, `Syncing subscriptions for tenant: ${tenant.id}`);
          await syncLocalSubscriptionsWithLicensingServer(tenant.id);
        } catch (err: any) {
          appLogger.error({ job: 'licensePullSync', tenantId: tenant.id, error: err.message }, `Failed to sync tenant subscriptions`);
        }
      }
      appLogger.info({ job: 'licensePullSync' }, 'Outbound licensing reconciliation sync completed successfully.');
    } catch (err: any) {
      appLogger.error({ job: 'licensePullSync', error: err.message }, 'Global error during weekly licensing pull sync fallback');
    }
  },
});
