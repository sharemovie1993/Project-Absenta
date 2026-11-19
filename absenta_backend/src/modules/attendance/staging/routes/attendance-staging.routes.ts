import { FastifyInstance } from 'fastify';
import { AttendanceStagingController } from '../controllers/attendance-staging.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export default async function attendanceStagingRoutes(fastify: FastifyInstance) {
  // Hanya role yang memiliki hak kelola akademik / kesiswaan / admin yang diizinkan
  const adminManageCaps = [
    'academic.manage.academic',
    'dashboard.view.kesiswaan',
    'attendance.schedules.manage',
  ];

  fastify.post('/fetch', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.fetchSheet,
  });

  fastify.get('/', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.listSheets,
  });

  fastify.get('/:id', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.getSheetDetail,
  });

  fastify.post('/:id/sync', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.syncSheet,
  });

  fastify.post('/bulk-sync', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.bulkSync,
  });

  fastify.delete('/:id', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.deleteSheet,
  });

  fastify.post('/bulk-delete', {
    preHandler: [requireCapability(adminManageCaps), determineDataScope()],
    handler: AttendanceStagingController.bulkDelete,
  });
}
