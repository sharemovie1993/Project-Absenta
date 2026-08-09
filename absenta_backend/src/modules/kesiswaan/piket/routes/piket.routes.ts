import { PiketController } from '../controllers/piket.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { elevatedScopeMiddleware } from '../../../../middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function piketRoutes(fastify: any) {
  const controller = new PiketController();

  fastify.get('/', {
    preHandler: [requireCapability(['kesiswaan.piket.view', 'attendance.piket.view', 'attendance.gate.scan']), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.getIzinHarian.bind(controller)
  });

  fastify.post('/', {
    preHandler: [requireCapability(['kesiswaan.piket.manage', 'attendance.piket.manage']), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.createIzin.bind(controller)
  });

  fastify.patch('/:id/kembali', {
    preHandler: [requireCapability(['kesiswaan.piket.manage', 'attendance.piket.manage', 'attendance.gate.scan', 'kesiswaan.piket.view']), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.catatKembali.bind(controller)
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability(['kesiswaan.piket.manage', 'attendance.piket.manage']), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.deleteIzin.bind(controller)
  });
}
