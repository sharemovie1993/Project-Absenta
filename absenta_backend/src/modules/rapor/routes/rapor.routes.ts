import { RaporController } from '../controllers/rapor.controller';
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
}
