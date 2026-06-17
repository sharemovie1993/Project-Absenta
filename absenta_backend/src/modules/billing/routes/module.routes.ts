import { moduleController } from '../controllers/module.controller';

export async function moduleRoutes(fastify: any) {
  // Public endpoint
  fastify.get('/public', {
    config: { skipAuth: true },
    handler: moduleController.getPublicModules.bind(moduleController),
  });

  // Admin endpoint (optional for now, can add RBAC later)
  fastify.get('/', {
    handler: moduleController.getAllModules.bind(moduleController),
  });
}
