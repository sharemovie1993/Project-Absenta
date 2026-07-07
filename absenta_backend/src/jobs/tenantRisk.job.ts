import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'tenantRisk',
  schedule: '0 0 * * *', // daily at midnight
  envFlag: 'TENANT_RISK_CRON_ENABLED',
  async run() {
    appLogger.info('tenantRisk.cycle_completed - tenant risk calculation is centralized in the central License Server.');
  },
});

export async function runTenantRiskCycle() {
  appLogger.info('runTenantRiskCycle - skipped: centralized in central License Server.');
}
