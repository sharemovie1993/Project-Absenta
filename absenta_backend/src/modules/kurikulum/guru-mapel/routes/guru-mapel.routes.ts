import { guruMapelController } from '../controllers/guru-mapel.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware } from '@/middlewares/organizationalScope';

export default async function guruMapelRoutes(fastify: any) {
  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability('academic.teaching.view'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.list(request, reply);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.create(request, reply);
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability('academic.teaching.manage'),
        organizationalScopeMiddleware
      ]
    },
    async (request: any, reply: any) => {
      return guruMapelController.remove(request, reply);
    }
  );

  fastify.get(
    '/import/template',
    {
      preHandler: [requireCapability('academic.teaching.manage')]
    },
    async (request: any, reply: any) => {
      return guruMapelController.getImportTemplate(request, reply);
    }
  );

  fastify.post(
    '/import',
    {
      preHandler: [requireCapability('academic.teaching.manage')]
    },
    async (request: any, reply: any) => {
      return guruMapelController.importFromExcel(request, reply);
    }
  );
}
