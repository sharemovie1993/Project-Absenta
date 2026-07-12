import { StrukturKurikulumController } from '../controllers/struktur-kurikulum.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function strukturKurikulumRoutes(fastify: any) {
  fastify.get('/', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.getAll);
  fastify.get('/standards', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.getStandardReferences);
  fastify.post('/standards', { preHandler: requireCapability('superadmin.tenants.manage') }, StrukturKurikulumController.createStandardReference);
  fastify.put('/standards/:id', { preHandler: requireCapability('superadmin.tenants.manage') }, StrukturKurikulumController.updateStandardReference);
  fastify.delete('/standards/:id', { preHandler: requireCapability('superadmin.tenants.manage') }, StrukturKurikulumController.deleteStandardReference);
  fastify.get('/grouped', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.getByTingkatGrouped);
  fastify.post('/', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.upsert);
  fastify.delete('/:id', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.delete);
}
