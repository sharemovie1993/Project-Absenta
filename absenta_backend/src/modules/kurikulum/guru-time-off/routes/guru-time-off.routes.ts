import { guruTimeOffController } from '../controllers/guru-time-off.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export async function guruTimeOffRoutes(fastify: any) {
  fastify.get(
    '/by-guru',
    {
      preHandler: [
        requireCapability('academic.teaching.view'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => guruTimeOffController.getByGuru(request, reply)
  );

  fastify.get(
    '/all',
    {
      preHandler: [
        requireCapability('academic.teaching.view'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => guruTimeOffController.getAllTenant(request, reply)
  );

  fastify.post(
    '/save',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => guruTimeOffController.save(request, reply)
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => guruTimeOffController.delete(request, reply)
  );
}
