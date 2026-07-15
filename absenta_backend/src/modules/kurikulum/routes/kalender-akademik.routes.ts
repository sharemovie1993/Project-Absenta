import { KalenderAkademikController } from '../controllers/kalender-akademik.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '../../../middlewares/dataScope';

export async function kalenderAkademikRoutes(fastify: any) {
  // GET endpoints: semua yang punya academic.years.view.list bisa membaca kalender
  fastify.get(
    '/',
    { preHandler: [requireCapability('academic.years.view.list'), determineDataScope()] },
    KalenderAkademikController.getAll
  );

  fastify.get(
    '/stats',
    { preHandler: [requireCapability('academic.years.view.list'), determineDataScope()] },
    KalenderAkademikController.getStats
  );

  // WRITE endpoints: hanya academic.structure.manage (Admin/Wakasek Kurikulum)
  fastify.post(
    '/',
    { preHandler: [requireCapability('academic.structure.manage'), determineDataScope()] },
    KalenderAkademikController.create
  );

  fastify.put(
    '/:id',
    { preHandler: [requireCapability('academic.structure.manage'), determineDataScope()] },
    KalenderAkademikController.update
  );

  fastify.delete(
    '/:id',
    { preHandler: [requireCapability('academic.structure.manage'), determineDataScope()] },
    KalenderAkademikController.delete
  );
}
