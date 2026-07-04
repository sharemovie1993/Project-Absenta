import { defineCronJob } from '../infra/jobEngine';
import { prisma } from '../utils/prisma';
import { syncLocalSubscriptionsWithLicensingServer } from '../modules/billing/controllers/subscription.controller';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'licensePullSync',
  schedule: '0 3 * * 0', // Jam 03:00 setiap hari Minggu (mingguan)
  async run() {
    appLogger.info({ job: 'licensePullSync' }, 'Starting weekly licensing pull sync fallback...');
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
      appLogger.info({ job: 'licensePullSync' }, 'Weekly licensing pull sync fallback completed successfully.');
    } catch (err: any) {
      appLogger.error({ job: 'licensePullSync', error: err.message }, 'Global error during weekly licensing pull sync fallback');
    }
  },
});
