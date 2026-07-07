import { defineCronJob } from '../infra/jobEngine';
import { heartbeatService } from '../modules/system-config/services/heartbeat.service';
import { appLogger } from '../utils/app-logger';

export default defineCronJob({
  name: 'heartbeatSync',
  schedule: '59 23 * * *', // Setiap hari pukul 23:59
  async run() {
    appLogger.info({ job: 'heartbeatSync' }, 'Starting daily heartbeat metrics synchronization...');
    try {
      await heartbeatService.collectAndSendMetrics();
      appLogger.info({ job: 'heartbeatSync' }, 'Daily heartbeat metrics synchronization completed.');
    } catch (err: any) {
      appLogger.error({ job: 'heartbeatSync', error: err.message }, 'Failed during daily heartbeat metrics synchronization');
    }
  },
});
