import { atpController } from '../controllers/atp.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function atpRoutes(fastify: any) {
  const guruExempt = { exemptRoles: ['GURU', 'ADMIN', 'SUPERADMIN', 'KURIKULUM', 'STAFF'] as any[] };

  fastify.get(
    '/',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpController.list(request, reply);
    }
  );

  fastify.get(
    '/for-session/:sesiId',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpController.getActiveTpForSesi(request, reply);
    }
  );

  fastify.get(
    '/:id',
    {
      preHandler: [
        requireCapability(['academic.teaching.view', 'academic.structures.view.list'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpController.getById(request, reply);
    }
  );

  fastify.post(
    '/',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structures.view.list', 'academic.schedules.manage'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpController.upsert(request, reply);
    }
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        requireCapability(['academic.teaching.manage', 'academic.structures.view.list', 'academic.schedules.manage'], guruExempt),
        determineDataScope(),
      ]
    },
    async (request: any, reply: any) => {
      return atpController.delete(request, reply);
    }
  );
}
