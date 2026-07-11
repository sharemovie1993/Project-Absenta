import { StrukturKurikulumController } from '../controllers/struktur-kurikulum.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function strukturKurikulumRoutes(fastify: any) {
  fastify.get('/', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.getAll);
  fastify.get('/grouped', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.getByTingkatGrouped);
  fastify.post('/', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.upsert);
  fastify.delete('/:id', { preHandler: requireCapability('academic.structure.manage') }, StrukturKurikulumController.delete);
}
