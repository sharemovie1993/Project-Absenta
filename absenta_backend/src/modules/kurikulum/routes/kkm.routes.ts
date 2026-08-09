import { KkmController } from '../controllers/kkm.controller';
import { requireCapability } from '../../../middlewares/requireCapability';

export default async function kkmRoutes(fastify: any) {
  fastify.get('/', { preHandler: requireCapability('academic.subjects.view.list') }, KkmController.getAll);
  fastify.post('/', { preHandler: requireCapability('academic.subjects.manage') }, KkmController.upsert);
  fastify.delete('/:id', { preHandler: requireCapability('academic.subjects.manage') }, KkmController.delete);
}
