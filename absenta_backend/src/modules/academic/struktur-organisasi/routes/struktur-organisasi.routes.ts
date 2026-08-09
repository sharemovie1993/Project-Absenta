import { strukturOrganisasiController } from '../controllers/struktur-organisasi.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function strukturOrganisasiRoutes(fastify: any) {
  // CRUD Struktur
  fastify.get(
    '/tree',
    { preHandler: [requireCapability('academic.structures.view.tree'), determineDataScope()] },
    strukturOrganisasiController.getTree
  );

  fastify.get(
    '/',
    { preHandler: [requireCapability('academic.structures.view.list'), determineDataScope()] },
    strukturOrganisasiController.getAll
  );
  fastify.get(
    '/:id',
    { preHandler: [requireCapability('academic.structures.view.detail'), determineDataScope()] },
    strukturOrganisasiController.getOne
  );
  fastify.get(
    '/:id/permissions',
    { preHandler: [requireCapability('academic.structures.update'), determineDataScope()] },
    strukturOrganisasiController.getPermissions
  );
  fastify.put(
    '/:id/permissions',
    { preHandler: [requireCapability('academic.structures.update'), determineDataScope()] },
    strukturOrganisasiController.updatePermissions
  );
  fastify.post(
    '/:id/distribute',
    { preHandler: [requireCapability('academic.structures.update'), determineDataScope()] },
    strukturOrganisasiController.distributePermissions
  );
  fastify.post('/', { preHandler: [requireCapability('academic.structures.create'), determineDataScope()] }, strukturOrganisasiController.create);
  fastify.put('/:id', { preHandler: [requireCapability('academic.structures.update'), determineDataScope()] }, strukturOrganisasiController.update);
  fastify.delete('/:id', { preHandler: [requireCapability('academic.structures.delete'), determineDataScope()] }, strukturOrganisasiController.delete);

  // Guru Assignment
  // POST /:id/guru -> Assign guru ke struktur ini
  fastify.post('/:id/guru', { preHandler: [requireCapability('academic.structures.assign.teacher'), determineDataScope()] }, strukturOrganisasiController.assignGuru);
  
  // DELETE /:id/guru/:guruId -> Hapus guru dari struktur ini
  fastify.delete(
    '/:id/guru/:guruId',
    { preHandler: [requireCapability('academic.structures.revoke.teacher'), determineDataScope()] },
    strukturOrganisasiController.removeGuru
  );
  fastify.post('/:id/siswa', { preHandler: [requireCapability('academic.structures.assign.student'), determineDataScope()] }, strukturOrganisasiController.assignSiswa);
  fastify.delete(
    '/:id/siswa/:siswaId',
    { preHandler: [requireCapability('academic.structures.revoke.student'), determineDataScope()] },
    strukturOrganisasiController.removeSiswa
  );
}
