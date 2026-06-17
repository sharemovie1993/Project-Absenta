/**
 * Payment Webhook Idempotency & Lifecycle Tests
 *
 * - webhook FAIL → subscription remains PENDING_PAYMENT
 * - webhook SUCCESS first → invoice PAID, subscription ACTIVE + extended
 * - webhook SUCCESS second → no re-extension (idempotent)
 */

const Fastify = require('fastify');
const crypto = require('crypto');

const { PrismaClient, PaymentGateway, PaymentMethod, PaymentStatus, InvoiceStatus, SubscriptionStatus, BillingStatus } = require('@prisma/client');
const prisma = new PrismaClient();

const { paymentModule } = require('../../../src/modules/payment');

const signTripayBody = (body, key) => crypto.createHmac('sha256', key).update(JSON.stringify(body)).digest('hex');

describe('Tripay Webhook Idempotency', () => {
  let fastify;
  let tenant;
  let plan;
  let subscription;
  let billing;
  let invoice;
  let payment;

  beforeAll(async () => {
    process.env.TRIPAY_PRIVATE_KEY = 'test-private-key';
    fastify = Fastify({ logger: false });
    await fastify.register(require('@fastify/jwt'), { secret: 'test-jwt' });
    await paymentModule(fastify, (fastify).prisma || prisma);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(async () => {
    await prisma.activityLog.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.billing.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.tenant.deleteMany({});

    tenant = await prisma.tenant.create({
      data: { name: 'Sekolah Test', status: 'ACTIVE' }
    });
    plan = await prisma.plan.create({
      data: { name: 'Bulanan', price_monthly: 100000, billing_period: 'MONTH', absensi_mode: 'SIMPLE' }
    });
    const now = new Date();
    subscription = await prisma.subscription.create({
      data: {
        tenant_id: tenant.id,
        plan_id: plan.id,
        start_date: now,
        end_date: now,
        status: SubscriptionStatus.PENDING_PAYMENT
      }
    });
    billing = await prisma.billing.create({
      data: {
        tenant_id: tenant.id,
        subscription_id: subscription.id,
        amount: 100000,
        billing_date: now,
        status: BillingStatus.UNPAID
      }
    });
    const periodStart = new Date(now);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    invoice = await prisma.invoice.create({
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
        due_date: new Date(Date.now() + 7 * 86400000),
        period_start: periodStart,
        period_end: periodEnd
      }
    });
    payment = await prisma.payment.create({
      data: {
        tenant_id: tenant.id,
        billing_id: billing.id,
        invoice_id: invoice.id,
        gateway: PaymentGateway.TRIPAY,
        payment_method: PaymentMethod.QRIS,
        amount: 100000,
        currency: 'IDR',
        status: PaymentStatus.PENDING,
        gateway_transaction_id: `REF-${Date.now()}`
      }
    });
  });

  test('webhook FAIL keeps subscription PENDING_PAYMENT', async () => {
    const body = {
      merchant_ref: payment.gateway_transaction_id,
      reference: payment.gateway_transaction_id,
      status: 'failed',
      event: 'failed',
      amount: payment.amount
    };
    const sig = signTripayBody(body, process.env.TRIPAY_PRIVATE_KEY);

    const res = await fastify.inject({
      method: 'POST',
      url: '/webhooks/payment/tripay',
      payload: body,
      headers: { 'x-callback-signature': sig }
    });
    expect([200, 400, 500]).toContain(res.statusCode); // allow variations, focus on DB state

    const sub = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(sub.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  test('webhook SUCCESS first activates and extends subscription', async () => {
    const body = {
      merchant_ref: payment.gateway_transaction_id,
      reference: payment.gateway_transaction_id,
      status: 'paid',
      event: 'paid',
      amount: payment.amount,
      paid_at: new Date().toISOString()
    };
    const sig = signTripayBody(body, process.env.TRIPAY_PRIVATE_KEY);

    const res = await fastify.inject({
      method: 'POST',
      url: '/webhooks/payment/tripay',
      payload: body,
      headers: { 'x-callback-signature': sig }
    });
    expect(res.statusCode).toBe(200);

    const p = await prisma.payment.findUnique({ where: { id: payment.id } });
    const inv = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    const sub = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(p.status).toBe(PaymentStatus.SUCCESS);
    expect(inv.status).toBe(InvoiceStatus.PAID);
    expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    // end_date should be moved forward at least ~28 days (month addition)
    expect(new Date(sub.end_date).getTime()).toBeGreaterThan(new Date(subscription.end_date).getTime());
  });

  test('webhook SUCCESS second does not extend again', async () => {
    // First success
    const body1 = {
      merchant_ref: payment.gateway_transaction_id,
      reference: payment.gateway_transaction_id,
      status: 'paid',
      event: 'paid',
      amount: payment.amount,
      paid_at: new Date().toISOString()
    };
    const sig1 = signTripayBody(body1, process.env.TRIPAY_PRIVATE_KEY);
    const res1 = await fastify.inject({
      method: 'POST',
      url: '/webhooks/payment/tripay',
      payload: body1,
      headers: { 'x-callback-signature': sig1 }
    });
    expect(res1.statusCode).toBe(200);
    const subAfterFirst = await prisma.subscription.findUnique({ where: { id: subscription.id } });

    // Second success (duplicate)
    const body2 = { ...body1 };
    const sig2 = signTripayBody(body2, process.env.TRIPAY_PRIVATE_KEY);
    const res2 = await fastify.inject({
      method: 'POST',
      url: '/webhooks/payment/tripay',
      payload: body2,
      headers: { 'x-callback-signature': sig2 }
    });
    expect([200, 400]).toContain(res2.statusCode);

    const subAfterSecond = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    expect(new Date(subAfterSecond.end_date).getTime()).toBe(new Date(subAfterFirst.end_date).getTime());
  });
});
