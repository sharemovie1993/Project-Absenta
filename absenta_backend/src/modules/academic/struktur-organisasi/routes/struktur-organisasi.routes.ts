import { strukturOrganisasiController } from '../controllers/struktur-organisasi.controller';
import { requireCapability } from '@/middlewares/requireCapability';

export default async function strukturOrganisasiRoutes(fastify: any) {
  // CRUD Struktur
  fastify.get(
    '/tree',
    { preHandler: [requireCapability('academic.structures.view.tree')] },
    strukturOrganisasiController.getTree
  );

  fastify.get(
    '/',
    { preHandler: [requireCapability('academic.structures.view.list')] },
    strukturOrganisasiController.getAll
  );
  fastify.get(
    '/:id',
    { preHandler: [requireCapability('academic.structures.view.detail')] },
    strukturOrganisasiController.getOne
  );
  fastify.get(
    '/:id/permissions',
    { preHandler: [requireCapability('academic.structures.update')] },
    strukturOrganisasiController.getPermissions
  );
  fastify.put(
    '/:id/permissions',
    { preHandler: [requireCapability('academic.structures.update')] },
    strukturOrganisasiController.updatePermissions
  );
  fastify.post(
    '/:id/distribute',
    { preHandler: [requireCapability('academic.structures.update')] },
    strukturOrganisasiController.distributePermissions
  );
  fastify.post('/', { preHandler: [requireCapability('academic.structures.create')] }, strukturOrganisasiController.create);
  fastify.put('/:id', { preHandler: [requireCapability('academic.structures.update')] }, strukturOrganisasiController.update);
  fastify.delete('/:id', { preHandler: [requireCapability('academic.structures.delete')] }, strukturOrganisasiController.delete);

  // Guru Assignment
  // POST /:id/guru -> Assign guru ke struktur ini
  fastify.post('/:id/guru', { preHandler: [requireCapability('academic.structures.assign.teacher')] }, strukturOrganisasiController.assignGuru);
  
  // DELETE /:id/guru/:guruId -> Hapus guru dari struktur ini
  fastify.delete(
    '/:id/guru/:guruId',
    { preHandler: [requireCapability('academic.structures.revoke.teacher')] },
    strukturOrganisasiController.removeGuru
  );
  fastify.post('/:id/siswa', { preHandler: [requireCapability('academic.structures.assign.student')] }, strukturOrganisasiController.assignSiswa);
  fastify.delete(
    '/:id/siswa/:siswaId',
    { preHandler: [requireCapability('academic.structures.revoke.student')] },
    strukturOrganisasiController.removeSiswa
  );
}
