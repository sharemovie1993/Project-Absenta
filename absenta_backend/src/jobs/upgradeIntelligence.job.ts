// NOTE: Upgrade Intelligence job has been moved to Project-Server-Lisensi (Milestone 4).
// The upgradeIntelligenceJobLock table no longer exists in the local schema.
// This is a stub to prevent compilation errors until the route is removed in Milestone 4.

import { appLogger } from '../utils/app-logger';
import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'upgradeIntelligence',
  schedule: '30 3 * * *', // 03:30 every day
  envFlag: 'UPGRADE_INTELLIGENCE_ENABLED',
  async run() {
    // This job has been migrated to the central License Server.
    // Local instance only logs that it is a tenant/school deployment.
    appLogger.info(
      { deployment_mode: 'LOCAL_TENANT' },
      'upgradeIntelligence.skipped_local_instance - Upgrade Intelligence runs on Central License Server only.'
    );
  },
});
