import { planController } from '../controllers/plan.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export async function planRoutes(fastify: any) {
  fastify.get('/public', {
    config: { skipAuth: true },
    handler: planController.getPublicActivePlans.bind(planController),
  });

  fastify.get('/analytics', {
    preHandler: [requireCapability('billing.plans.view.list')],
    handler: planController.getPlanAnalytics.bind(planController),
  });

  fastify.get('/', {
    preHandler: [requireCapability('billing.plans.view.list')],
    handler: planController.getAllPlans.bind(planController),
  });

  fastify.get('/:id', {
    preHandler: [requireCapability('billing.plans.view.detail')],
    handler: planController.getPlanById.bind(planController),
  });

  fastify.post('/', {
    preHandler: [requireCapability('billing.plans.create')],
    handler: planController.createPlan.bind(planController),
  });

  fastify.put('/:id', {
    preHandler: [requireCapability('billing.plans.update')],
    handler: planController.updatePlan.bind(planController),
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('billing.plans.delete')],
    handler: planController.deactivatePlan.bind(planController),
  });
}
