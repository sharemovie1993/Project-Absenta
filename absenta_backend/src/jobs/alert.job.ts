import { AlertEngine } from '../modules/observability/services/alert.engine';
import { defineCronJob } from '../infra/jobEngine';

const alertEngine = new AlertEngine();

export default defineCronJob({
  name: 'alertEngine',
  schedule: '*/2 * * * *', // setiap 2 menit
  async run() {
    await alertEngine.runAllChecks();
  },
});
