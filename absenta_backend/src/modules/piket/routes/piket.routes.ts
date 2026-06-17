import { PiketController } from '../controllers/piket.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { elevatedScopeMiddleware } from '../../../middlewares/organizationalScope';

export async function piketRoutes(fastify: any) {
  const controller = new PiketController();

  fastify.get('/', {
    preHandler: [requireCapability('attendance.piket.view'), elevatedScopeMiddleware],
    handler: controller.getIzinHarian.bind(controller)
  });

  fastify.post('/', {
    preHandler: [requireCapability('attendance.piket.manage'), elevatedScopeMiddleware],
    handler: controller.createIzin.bind(controller)
  });

  fastify.patch('/:id/kembali', {
    preHandler: [requireCapability('attendance.piket.manage')],
    handler: controller.catatKembali.bind(controller)
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('attendance.piket.manage')],
    handler: controller.deleteIzin.bind(controller)
  });
}
