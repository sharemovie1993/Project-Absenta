import { defineCronJob } from '../infra/jobEngine';

export default defineCronJob({
  name: 'subscriptionAutoRenew',
  schedule: '0 1 * * *', // jam 01:00 setiap hari
  async run() {
    // Deprecated: Auto renewals are managed centrally by the license server
  },
});
