import { historicalBackfillController } from '../controllers/historical-backfill.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { RoleName } from '../../../../constants/enums';

export async function historicalBackfillRoutes(fastify: any) {
  // 1. Download Pre-filled Template Excel
  // GET /api/attendance/backfill/template
  fastify.get('/template', {
    preHandler: [
      requireCapability('attendance.sessions.create', {
        exemptRoles: [RoleName.ADMIN, RoleName.GURU, RoleName.SUPERADMIN],
      }),
    ],
    handler: historicalBackfillController.downloadTemplate,
  });

  // 2. Upload & Pratinjau Validasi Excel
  // POST /api/attendance/backfill/preview
  fastify.post('/preview', {
    preHandler: [
      requireCapability('attendance.sessions.create', {
        exemptRoles: [RoleName.ADMIN, RoleName.GURU, RoleName.SUPERADMIN],
      }),
    ],
    handler: historicalBackfillController.preview,
  });

  // 3. Eksekusi Backfill Historis ke Sesi & Database
  // POST /api/attendance/backfill/execute
  fastify.post('/execute', {
    preHandler: [
      requireCapability('attendance.sessions.create', {
        exemptRoles: [RoleName.ADMIN, RoleName.GURU, RoleName.SUPERADMIN],
      }),
    ],
    handler: historicalBackfillController.execute,
  });
}
