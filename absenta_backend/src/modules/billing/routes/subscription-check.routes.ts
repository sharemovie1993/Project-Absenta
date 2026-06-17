import { subscriptionController } from '../controllers/subscription.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function subscriptionCheckRoutes(fastify: any) {
  fastify.get('/check', {
    preHandler: [requireCapability('billing.subscriptions.view.active')],
    handler: subscriptionController.checkTenantSubscription.bind(subscriptionController),
  });
}
