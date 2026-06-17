const { prisma } = require('../../../src/utils/prisma');
const { PaymentGateway, PaymentMethod, PaymentStatus, InvoiceStatus, SubscriptionStatus, BillingStatus } = require('@prisma/client');

const { billingService } = require('../../../src/modules/billing/services/billing.service');

describe('Invoice period guard', () => {
  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
  });

  test('markAsPaid rejects invoice without period_end in production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const tenant = await prisma.tenant.create({
        data: { name: 'Tenant Period Guard', status: 'ACTIVE' }
      });

      const plan = await prisma.plan.create({
        data: { name: 'Bulanan', price_monthly: 100000, billing_period: 'MONTH', absensi_mode: 'SIMPLE' }
      });

      const now = new Date();
      const subscription = await prisma.subscription.create({
        data: {
          tenant_id: tenant.id,
          plan_id: plan.id,
          start_date: now,
          end_date: now,
          next_billing_date: now,
          status: SubscriptionStatus.PENDING_PAYMENT
        }
      });

      const billing = await prisma.billing.create({
        data: {
          tenant_id: tenant.id,
          subscription_id: subscription.id,
          amount: 100000,
          billing_date: now,
          status: BillingStatus.UNPAID
        }
      });

      const invoice = await prisma.invoice.create({
        data: {
          tenant_id: tenant.id,
          billing_id: billing.id,
          subscription_id: subscription.id,
          invoice_number: `INV-${Date.now()}`,
          amount: 100000,
          subtotal_amount: 100000,
          total_amount: 100000,
          currency: 'IDR',
          status: InvoiceStatus.SENT,
          due_date: new Date(Date.now() + 7 * 86400000)
        }
      });

      await prisma.payment.create({
        data: {
          tenant_id: tenant.id,
          billing_id: billing.id,
          invoice_id: invoice.id,
          gateway: PaymentGateway.TRIPAY,
          payment_method: PaymentMethod.QRIS,
          amount: 100000,
          currency: 'IDR',
          status: PaymentStatus.SUCCESS,
          confirmed_by: 'TRIPAY_WEBHOOK',
          paid_at: new Date(),
          gateway_transaction_id: `REF-${Date.now()}`
        }
      });

      await expect(billingService.markAsPaid(billing.id, undefined, undefined, 'TRIPAY_WEBHOOK')).rejects.toThrow(
        /Invalid invoice period/i
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});

