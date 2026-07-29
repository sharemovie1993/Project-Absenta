import { subscriptionController } from '../controllers/subscription.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function subscriptionRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [requireCapability('billing.subscriptions.view.list')],
    handler: subscriptionController.getAllSubscriptions.bind(subscriptionController),
  });

  fastify.get('/tenant/:tenant_id', {
    preHandler: [requireCapability('billing.subscriptions.view.list')],
    handler: subscriptionController.getSubscriptionsByTenant.bind(subscriptionController),
  });

  fastify.get('/active', {
    preHandler: [requireCapability('billing.subscriptions.view.active')],
    handler: subscriptionController.getActiveSubscription.bind(subscriptionController),
  });

  fastify.get('/current', {
    preHandler: [requireCapability('billing.subscriptions.view.active')],
    handler: subscriptionController.getCurrentSubscription.bind(subscriptionController),
  });

  fastify.get('/:id', {
    preHandler: [requireCapability('billing.subscriptions.view.detail')],
    handler: subscriptionController.getSubscriptionById.bind(subscriptionController),
  });

  fastify.get('/:id/history', {
    preHandler: [requireCapability('billing.subscriptions.view.detail')],
    handler: subscriptionController.getSubscriptionHistory.bind(subscriptionController),
  });

  fastify.get('/tenant/:tenant_id/history', {
    preHandler: [requireCapability('billing.subscriptions.view.detail')],
    handler: subscriptionController.getTenantSubscriptionHistory.bind(subscriptionController),
  });

  fastify.post('/', {
    preHandler: [requireCapability('billing.subscriptions.create')],
    handler: subscriptionController.createSubscription.bind(subscriptionController),
  });

  fastify.put('/:id', {
    preHandler: [requireCapability('billing.subscriptions.update')],
    handler: subscriptionController.updateSubscription.bind(subscriptionController),
  });

  fastify.post('/:id/cancel', {
    preHandler: [requireCapability('billing.subscriptions.cancel')],
    handler: subscriptionController.cancelSubscription.bind(subscriptionController),
  });

  fastify.post('/:id/cancel/undo', {
    preHandler: [requireCapability('billing.subscriptions.cancel')],
    handler: subscriptionController.undoCancelSubscription.bind(subscriptionController),
  });

  fastify.post('/:id/resume', {
    preHandler: [requireCapability('billing.subscriptions.resume')],
    handler: subscriptionController.resumeSubscription.bind(subscriptionController),
  });

  fastify.post('/upgrade-wizard', {
    preHandler: [requireCapability('billing.my.subscription.upgrade')],
    handler: subscriptionController.upgradeWizard.bind(subscriptionController),
  });

  fastify.post('/:id/choose-plan', {
    preHandler: [requireCapability('billing.my.subscription.upgrade')],
    handler: subscriptionController.choosePlan.bind(subscriptionController),
  });

  fastify.post('/order', {
    preHandler: [requireCapability(['billing.my.subscription.create', 'billing.my.subscription.upgrade'])],
    handler: subscriptionController.orderPlan.bind(subscriptionController),
  });

  fastify.post('/checkout-multi', {
    preHandler: [requireCapability(['billing.my.subscription.create', 'billing.my.subscription.upgrade'])],
    handler: subscriptionController.orderPlanMulti.bind(subscriptionController),
  });

  fastify.post('/update-academic-tier', {
    preHandler: [requireCapability(['billing.my.subscription.upgrade'])],
    handler: subscriptionController.updateAcademicTier.bind(subscriptionController),
  });

  fastify.post('/upgrade/cancel', {
    preHandler: [requireCapability('billing.my.subscription.upgrade')],
    handler: subscriptionController.cancelPendingUpgrade.bind(subscriptionController),
  });

  fastify.post('/:id/renew', {
    preHandler: [requireCapability('billing.subscriptions.renew')],
    handler: subscriptionController.renewSubscription.bind(subscriptionController),
  });

  fastify.post('/:id/downgrade', {
    preHandler: [requireCapability('billing.subscriptions.update')],
    handler: subscriptionController.scheduleDowngrade.bind(subscriptionController),
  });

  fastify.post('/:id/downgrade/cancel', {
    preHandler: [requireCapability('billing.subscriptions.update')],
    handler: subscriptionController.cancelDowngrade.bind(subscriptionController),
  });

  fastify.post('/check-expired', {
    preHandler: [requireCapability("billing.subscriptions.check.expired")],
    handler: subscriptionController.checkExpiredSubscriptions.bind(subscriptionController),
  });

  fastify.get('/analytics', {
    preHandler: [requireCapability('billing.subscriptions.view.analytics')],
    handler: subscriptionController.getSubscriptionAnalytics.bind(subscriptionController),
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('billing.subscriptions.cancel')], // Use cancel or update?
    handler: subscriptionController.deleteSubscription.bind(subscriptionController),
  });

  fastify.post('/license/callback', {
    config: { skipAuth: true, public: true },
    handler: subscriptionController.handleLicenseWebhook.bind(subscriptionController),
  });
}
