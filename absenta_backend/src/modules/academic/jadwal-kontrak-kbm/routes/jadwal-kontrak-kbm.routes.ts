import { jadwalKontrakKbmController } from '../controllers/jadwal-kontrak-kbm.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';

export async function jadwalKontrakKbmRoutes(fastify: any) {
  fastify.get(
    '/',
    { preHandler: [requireCapability(['academic.teaching.view'])] },
    jadwalKontrakKbmController.list.bind(jadwalKontrakKbmController)
  );

  fastify.get(
    '/summary',
    { preHandler: [requireCapability(['academic.teaching.view'])] },
    jadwalKontrakKbmController.summary.bind(jadwalKontrakKbmController)
  );

  fastify.patch(
    '/:id',
    { preHandler: [requireCapability(['academic.teaching.manage'])] },
    jadwalKontrakKbmController.update.bind(jadwalKontrakKbmController)
  );

  fastify.delete(
    '/:id',
    { preHandler: [requireCapability(['academic.teaching.manage'])] },
    jadwalKontrakKbmController.remove.bind(jadwalKontrakKbmController)
  );
}
