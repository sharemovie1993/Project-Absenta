import { kejadianKhususController } from '../controllers/kejadian-khusus.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function kejadianKhususRoutes(fastify: any) {
  fastify.get('/', {
    preHandler: [
      requireCapability('attendance.events.view.list'),
      determineDataScope()
    ]
  }, kejadianKhususController.getAll);

  fastify.post('/', {
    preHandler: [
      requireCapability('attendance.events.create'),
      determineDataScope()
    ]
  }, kejadianKhususController.create);

  fastify.delete('/:id', {
    preHandler: [
      requireCapability('attendance.events.delete'),
      determineDataScope()
    ]
  }, kejadianKhususController.delete);
}
