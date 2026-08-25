import { moduleController } from '../controllers/module.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function moduleRoutes(fastify: any) {
  // Public endpoint
  fastify.get('/public', {
    config: { skipAuth: true },
    handler: moduleController.getPublicModules.bind(moduleController),
  });

  // Admin endpoint
  fastify.get('/', {
    preHandler: [requireCapability('billing.modules.view'), determineDataScope()],
    handler: moduleController.getAllModules.bind(moduleController),
  });
}
