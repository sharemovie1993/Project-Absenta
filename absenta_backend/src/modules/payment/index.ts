
import { PrismaClient } from '@prisma/client';
import { paymentRoutes } from './routes/payment.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { testRoutes } from './routes/test.routes';
import { registerPaymentPublicRoutes } from './routes/public.routes';

export async function paymentModule(fastify: any, prisma: PrismaClient) {
  // Register public payment routes (No Auth)
  await fastify.register(registerPaymentPublicRoutes, { prefix: '/payment' });

  // Register payment management routes
  await fastify.register(async function (subFastify: any) {
    await paymentRoutes(subFastify, prisma);
  }, { prefix: '/api/payments' });

  // Register payment routes with /payment prefix for frontend compatibility (LEGACY)
  await fastify.register(async function (subFastify: any) {
    await paymentRoutes(subFastify, prisma);
  }, { prefix: '/payment' });

  // Register webhook routes (separate prefix, no auth required)
  await fastify.register(async function (subFastify: any) {
    await webhookRoutes(subFastify, prisma);
  }, { prefix: '/webhooks/payment' });

  // Register payment testing routes (requires authentication)
  await fastify.register(async function (subFastify: any) {
    await testRoutes(subFastify);
  }, { prefix: '/api/payments' });
}

// Export all payment-related services and types
export { PaymentService } from './services/payment.service';
export { PaymentFactoryService } from './services/payment.factory.service';
export { BasePaymentService } from './services/base.payment.service';
export { MidtransPaymentService } from './services/midtrans.payment.service';
export { StripePaymentService } from './services/stripe.payment.service';
export { XenditPaymentService } from './services/xendit.payment.service';
export { TripayPaymentService } from './services/tripay.payment.service';
export { PaymentController } from './controllers/payment.controller';
export { WebhookController } from './controllers/webhook.controller';
export { PaymentTestController } from './controllers/test.controller';
