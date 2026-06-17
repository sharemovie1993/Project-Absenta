import { defineCronJob } from '../infra/jobEngine';
import { subscriptionService } from '../modules/billing/services/subscription.service';
import { billingService } from '../modules/billing/services/billing.service';
import { InvoiceService } from '../modules/invoice/services/invoice.service';
import { prisma } from '../utils/prisma';

export default defineCronJob({
  name: 'subscriptionAutoRenew',
  schedule: '0 1 * * *', // jam 01:00 setiap hari
  async run() {
    const expired = await subscriptionService.checkExpiredSubscriptions();
    if (!expired || expired.length === 0) return;

    const invoiceSvc = new InvoiceService();

    for (const sub of expired) {
      if (!sub.auto_renew) continue;

      const amount = sub.plan?.price_monthly ?? (sub as any).Plan?.price_monthly;
      if (typeof amount === 'number' && amount > 0) {
        const billingDate = new Date();
        const startOfDay = new Date(billingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(billingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await prisma.billing.findFirst({
          where: {
            subscription_id: sub.id,
            billing_date: { gte: startOfDay, lte: endOfDay },
          },
          select: { id: true },
        });
        if (existing) continue;

        const dueDate = new Date(billingDate);
        dueDate.setDate(dueDate.getDate() + 14);

        const billing = await billingService.createBilling({
          subscription_id: sub.id,
          amount,
          billing_date: billingDate,
          due_date: dueDate,
        });

        await invoiceSvc.generateInvoiceFromBilling(sub.tenant_id, billing.id, {
          due_date: dueDate,
        });
      }
    }
  },
});
