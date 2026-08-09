import { KkmController } from '../controllers/kkm.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function kkmRoutes(fastify: any) {
  fastify.get('/', { preHandler: [requireCapability('academic.subjects.view.list'), determineDataScope()]}, KkmController.getAll);
  fastify.post('/', { preHandler: [requireCapability('academic.subjects.manage'), determineDataScope()]}, KkmController.upsert);
  fastify.delete('/:id', { preHandler: [requireCapability('academic.subjects.manage'), determineDataScope()]}, KkmController.delete);
}
