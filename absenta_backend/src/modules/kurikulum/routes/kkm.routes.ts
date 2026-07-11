import { KkmController } from '../controllers/kkm.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function kkmRoutes(fastify: any) {
  fastify.get('/', { preHandler: requireCapability('academic.view.mapel') }, KkmController.getAll);
  fastify.post('/', { preHandler: requireCapability('academic.manage.mapel') }, KkmController.upsert);
  fastify.delete('/:id', { preHandler: requireCapability('academic.manage.mapel') }, KkmController.delete);
}
