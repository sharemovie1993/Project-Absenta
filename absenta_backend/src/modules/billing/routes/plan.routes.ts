import { planController } from '../controllers/plan.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function planRoutes(fastify: any) {
  fastify.get('/academic-tiers', {
    config: { skipAuth: true },
    handler: planController.getAcademicTierPlans.bind(planController),
  });

  fastify.get('/public', {
    config: { skipAuth: true },
    handler: planController.getPublicActivePlans.bind(planController),
  });

  fastify.get('/analytics', {
    preHandler: [requireCapability('billing.plans.view.list'), determineDataScope()],
    handler: planController.getPlanAnalytics.bind(planController),
  });

  fastify.get('/', {
    preHandler: [requireCapability('billing.plans.view.list'), determineDataScope()],
    handler: planController.getAllPlans.bind(planController),
  });

  fastify.get('/:id', {
    preHandler: [requireCapability('billing.plans.view.detail'), determineDataScope()],
    handler: planController.getPlanById.bind(planController),
  });

  fastify.post('/', {
    preHandler: [requireCapability('billing.plans.create'), determineDataScope()],
    handler: planController.createPlan.bind(planController),
  });

  fastify.put('/:id', {
    preHandler: [requireCapability('billing.plans.update'), determineDataScope()],
    handler: planController.updatePlan.bind(planController),
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('billing.plans.delete'), determineDataScope()],
    handler: planController.deactivatePlan.bind(planController),
  });
}
