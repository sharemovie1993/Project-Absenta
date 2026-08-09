import { jadwalKontrakKbmController } from '../controllers/jadwal-kontrak-kbm.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function jadwalKontrakKbmRoutes(fastify: any) {
  fastify.get(
    '/',
    { preHandler: [requireCapability(['academic.teaching.view']), determineDataScope()] },
    jadwalKontrakKbmController.list.bind(jadwalKontrakKbmController)
  );

  fastify.get(
    '/summary',
    { preHandler: [requireCapability(['academic.teaching.view']), determineDataScope()] },
    jadwalKontrakKbmController.summary.bind(jadwalKontrakKbmController)
  );

  fastify.patch(
    '/:id',
    { preHandler: [requireCapability(['academic.teaching.manage']), determineDataScope()] },
    jadwalKontrakKbmController.update.bind(jadwalKontrakKbmController)
  );

  fastify.delete(
    '/:id',
    { preHandler: [requireCapability(['academic.teaching.manage']), determineDataScope()] },
    jadwalKontrakKbmController.remove.bind(jadwalKontrakKbmController)
  );
}
