import { defineCronJob } from '../infra/jobEngine';

export async function processDueSubscription(_subscriptionId: string, _correlationId?: string) {
  // Deprecated: Renewals and billing handled centrally
}

export async function processInvoiceOverdue(_invoiceId: string, _correlationId?: string) {
  // Deprecated: Invoices handled centrally
}

export async function processInvoiceSuspension(_invoiceId: string, _correlationId?: string) {
  // Deprecated: Suspensions handled centrally
}

export async function processTrialEnd(_subscriptionId: string, _correlationId?: string) {
  // Deprecated: Trial ends handled centrally
}

export default defineCronJob({
  name: 'recurringBilling',
  schedule: '0 1 * * *', // jam 01:00 setiap hari
  async run() {
    // Deprecated: Renewals and billing handled centrally
  },
});

export async function runRecurringBillingCycle() {
  // Deprecated
}
