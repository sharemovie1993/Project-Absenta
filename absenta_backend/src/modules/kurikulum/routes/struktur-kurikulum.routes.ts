import { StrukturKurikulumController } from '../controllers/struktur-kurikulum.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function strukturKurikulumRoutes(fastify: any) {
  // GET endpoints: accept either manage (admin/wakasek) OR read-only view (guru/siswa)
  fastify.get('/', { preHandler: [requireCapability(['academic.structure.manage', 'academic.structures.view.list']), determineDataScope()]}, StrukturKurikulumController.getAll);
  fastify.get('/standards', { preHandler: [requireCapability(['academic.structure.manage', 'academic.structures.view.list']), determineDataScope()]}, StrukturKurikulumController.getStandardReferences);
  fastify.post('/standards', { preHandler: [requireCapability('superadmin.tenants.manage'), determineDataScope()]}, StrukturKurikulumController.createStandardReference);
  fastify.put('/standards/:id', { preHandler: [requireCapability('superadmin.tenants.manage'), determineDataScope()]}, StrukturKurikulumController.updateStandardReference);
  fastify.delete('/standards/:id', { preHandler: [requireCapability('superadmin.tenants.manage'), determineDataScope()]}, StrukturKurikulumController.deleteStandardReference);
  fastify.get('/grouped', { preHandler: [requireCapability(['academic.structure.manage', 'academic.structures.view.list']), determineDataScope()]}, StrukturKurikulumController.getByTingkatGrouped);
  fastify.get('/check-beban-guru', { preHandler: [requireCapability(['academic.structure.manage', 'academic.structures.view.list']), determineDataScope()]}, StrukturKurikulumController.checkBebanGuru);
  fastify.get('/beban-guru', { preHandler: [requireCapability(['academic.structure.manage', 'academic.structures.view.list']), determineDataScope()]}, StrukturKurikulumController.getBebanGuruAll);
  // Kurikulum structure clone & CRUD routes
  fastify.post('/', { preHandler: [requireCapability('academic.structure.manage'), determineDataScope()]}, StrukturKurikulumController.upsert);
  fastify.post('/clone', { preHandler: [requireCapability('academic.structure.manage'), determineDataScope()]}, StrukturKurikulumController.clone);
  fastify.delete('/:id', { preHandler: [requireCapability('academic.structure.manage'), determineDataScope()]}, StrukturKurikulumController.delete);
}
