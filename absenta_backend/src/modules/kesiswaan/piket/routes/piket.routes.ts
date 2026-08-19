import { PiketController } from '../controllers/piket.controller';
import { GuruIzinController } from '../controllers/guru-izin.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { elevatedScopeMiddleware } from '../../../../middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';

export async function piketRoutes(fastify: any) {
  const controller = new PiketController();

  // ── Izin Keluar Siswa (Piket) ──
  fastify.get('/', {
    preHandler: [requireCapability(['attendance.piket.view', 'attendance.gate.scan']), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.getIzinHarian.bind(controller)
  });

  fastify.post('/', {
    preHandler: [requireCapability('attendance.piket.manage'), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.createIzin.bind(controller)
  });

  fastify.patch('/:id/kembali', {
    preHandler: [requireCapability(['attendance.piket.manage', 'attendance.gate.scan', 'attendance.piket.view']), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.catatKembali.bind(controller)
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability('attendance.piket.manage'), elevatedScopeMiddleware, determineDataScope()],
    handler: controller.deleteIzin.bind(controller)
  });

  // ── Izin & Dinas Guru ──
  fastify.post('/guru-izin', {
    handler: GuruIzinController.create
  });

  fastify.get('/guru-izin', {
    handler: GuruIzinController.getAll
  });

  fastify.get('/guru-izin/me', {
    handler: GuruIzinController.getMyList
  });

  fastify.get('/guru-izin/preview-impact', {
    handler: GuruIzinController.previewImpact
  });

  fastify.get('/guru-izin/inval-recommendations', {
    handler: GuruIzinController.getInvalRecommendations
  });

  fastify.patch('/guru-izin/:id/approve', {
    handler: GuruIzinController.approve
  });

  fastify.patch('/guru-izin/:id/reject', {
    handler: GuruIzinController.reject
  });

  fastify.delete('/guru-izin/:id', {
    handler: GuruIzinController.delete
  });
}

