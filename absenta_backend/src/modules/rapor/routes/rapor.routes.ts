import { RaporController } from '../controllers/rapor.controller';
import { RaporStagingController } from '../controllers/rapor-staging.controller';
import { requireCapability } from '../../../middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function raporRoutes(fastify: any) {
  const academicStaffCaps = [
    'academic.view.wali.kelas',
    'academic.homeroom.manage',
    'academic.teaching.view',
    'academic.manage.academic',
    'dashboard.view.kepsek',
  ];
  const academicManageCaps = [
    'academic.manage.wali.kelas',
    'academic.homeroom.manage',
    'academic.manage.academic',
  ];

  fastify.post('/', { preHandler: [requireCapability(academicManageCaps), determineDataScope()]}, RaporController.upsert);
  fastify.get('/detail', { preHandler: [requireCapability(academicStaffCaps), determineDataScope()]}, RaporController.getDetail);
  fastify.get('/leger', { preHandler: [requireCapability(academicStaffCaps), determineDataScope()]}, RaporController.getLeger);
  fastify.get('/leger/export', { preHandler: [requireCapability(academicStaffCaps), determineDataScope()]}, RaporController.exportLeger);
  fastify.get('/transkrip', { preHandler: [requireCapability(academicStaffCaps), determineDataScope()]}, RaporController.getTranskrip);
  fastify.get('/settings', { preHandler: [requireCapability(['academic.manage.academic', 'dashboard.view.kepsek', 'core.sekolah.update.profile']), determineDataScope()] }, RaporController.getSettings);
  fastify.put('/settings', { preHandler: [requireCapability(['academic.manage.academic', 'dashboard.view.kepsek', 'core.sekolah.update.profile']), determineDataScope()] }, RaporController.updateSettings);

  // ── Rapor Staging Hub (Google Sheet Integrator) ──
  fastify.post('/staging/scan-folder', { preHandler: [requireCapability(academicManageCaps), determineDataScope()] }, RaporStagingController.scanFolder);
  fastify.post('/staging/fetch', { preHandler: [requireCapability(academicManageCaps), determineDataScope()] }, RaporStagingController.fetchAndStage);
  fastify.get('/staging', { preHandler: [requireCapability(academicStaffCaps), determineDataScope()] }, RaporStagingController.getList);
  fastify.get('/staging/:id', { preHandler: [requireCapability(academicStaffCaps), determineDataScope()] }, RaporStagingController.getDetail);
  fastify.post('/staging/:id/sync', { preHandler: [requireCapability(academicManageCaps), determineDataScope()] }, RaporStagingController.sync);
  fastify.delete('/staging/:id', { preHandler: [requireCapability(academicManageCaps), determineDataScope()] }, RaporStagingController.delete);
}

