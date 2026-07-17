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

  // GET /presets - Get all global calendar presets
  fastify.get(
    '/presets',
    { preHandler: [requireCapability('academic.years.view.list'), determineDataScope()] },
    KalenderAkademikController.getPresets
  );

  // POST /presets - Create new global calendar preset (superadmin only)
  fastify.post(
    '/presets',
    { preHandler: [requireCapability('superadmin.tenants.manage'), determineDataScope()] },
    KalenderAkademikController.createPreset
  );

  // PUT /presets/:id - Update global calendar preset (superadmin only)
  fastify.put(
    '/presets/:id',
    { preHandler: [requireCapability('superadmin.tenants.manage'), determineDataScope()] },
    KalenderAkademikController.updatePreset
  );

  // DELETE /presets/:id - Delete global calendar preset (superadmin only)
  fastify.delete(
    '/presets/:id',
    { preHandler: [requireCapability('superadmin.tenants.manage'), determineDataScope()] },
    KalenderAkademikController.deletePreset
  );
}
