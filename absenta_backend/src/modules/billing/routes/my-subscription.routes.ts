import { mySubscriptionController } from '../controllers/my-subscription.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function mySubscriptionRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [requireCapability("billing.my.subscription.view"), determineDataScope()]
    },
    mySubscriptionController.getSubscription
  );

  fastify.get(
    '/invoices',
    {
      preHandler: [requireCapability("billing.my.subscription.view"), determineDataScope()]
    },
    mySubscriptionController.getInvoices
  );

  fastify.get(
    '/payments',
    {
      preHandler: [requireCapability("billing.my.subscription.view"), determineDataScope()]
    },
    mySubscriptionController.getPayments
  );

  fastify.patch(
    '/:id/auto-renew',
    {
      preHandler: [requireCapability("billing.my.subscription.view"), determineDataScope()]
    },
    mySubscriptionController.toggleAutoRenew
  );
}
