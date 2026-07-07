// NOTE: Revenue Forecast job has been moved to Project-Server-Lisensi (Milestone 4).
// The forecastJobLock table no longer exists in the local schema.
// This is a stub to prevent compilation errors until the route is removed in Milestone 4.

import { appLogger } from '../utils/app-logger';
import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'revenueForecast',
  schedule: '15 3 * * *', // 03:15 every day
  envFlag: 'REVENUE_FORECAST_ENABLED',
  subJobs: ['cohort'],
  async run() {
    // This job has been migrated to the central License Server.
    // Local instance only logs that it is a tenant/school deployment.
    appLogger.info(
      { deployment_mode: 'LOCAL_TENANT' },
      'revenueForecast.skipped_local_instance - Revenue Forecast runs on Central License Server only.'
    );
  },
});
