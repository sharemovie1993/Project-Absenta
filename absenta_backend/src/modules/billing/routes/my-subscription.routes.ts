import { mySubscriptionController } from '../controllers/my-subscription.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function mySubscriptionRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [requireCapability("billing.my.subscription.view")]
    },
    mySubscriptionController.getSubscription
  );

  fastify.get(
    '/invoices',
    {
      preHandler: [requireCapability("billing.my.subscription.view")]
    },
    mySubscriptionController.getInvoices
  );

  fastify.get(
    '/payments',
    {
      preHandler: [requireCapability("billing.my.subscription.view")]
    },
    mySubscriptionController.getPayments
  );

  fastify.patch(
    '/:id/auto-renew',
    {
      preHandler: [requireCapability("billing.my.subscription.view")]
    },
    mySubscriptionController.toggleAutoRenew
  );
}
