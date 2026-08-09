import { subscriptionController } from '../controllers/subscription.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function subscriptionCheckRoutes(fastify: any) {
  fastify.get('/check', {
    preHandler: [requireCapability('billing.subscriptions.view.active'), determineDataScope()],
    handler: subscriptionController.checkTenantSubscription.bind(subscriptionController),
  });
}
