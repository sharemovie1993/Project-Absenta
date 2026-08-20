import { sesiAbsensiController } from '../controllers/sesi-absensi.controller';
import { requireMultiSesiMode } from '@/middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';
import { SesiGuard } from '../guards/sesi.guard';
import { RoleName } from '../../../../constants/enums';

export async function sesiAbsensiRoutes(fastify: any) {
  // 1. Start Sesi (Create SesiAbsensi) - GURU & OPERATOR (SISWA Petugas)
  // POST /api/attendance/sesi-absensi
  fastify.post('/', {
    preHandler: [
        requireMultiSesiMode,
        requireCapability('attendance.sessions.create', { exemptRoles: [RoleName.GURU, RoleName.ADMIN] }), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateCreate
    ],
    handler: sesiAbsensiController.create,
  });

  // 2. List Sesi - VISIBILITY (Guru sees own, Siswa sees enrolled, Petugas sees managed)
  fastify.get('/', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.view.list', { exemptRoles: [RoleName.SISWA, RoleName.GURU, RoleName.ADMIN] }), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateList
    ],
    handler: sesiAbsensiController.list,
  });

  // 3. Update Status (Close Sesi) - GURU & OPERATOR ONLY
  fastify.patch('/:id/status', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.close', { exemptRoles: [RoleName.GURU, RoleName.ADMIN] }), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.updateStatus,
  });

  // 4. Update Sesi Details - GURU & OPERATOR ONLY
  fastify.put('/:id', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.update', { exemptRoles: [RoleName.GURU, RoleName.ADMIN] }), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.update,
  });

  // 5. Delete Sesi - OPERATOR ONLY
  fastify.delete('/:id', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.delete'), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.remove,
  });

  // 6. Guru Self Scan & Piket Teacher Status Assignment
  fastify.patch('/:id/absen-guru/:guru_id', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability(['attendance.sessions.update.attendance', 'attendance.piket.manage']), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.updateAbsenGuru,
  });

  // 7. Scan Siswa - OPERATOR ONLY
  // Butuh elevatedScopeMiddleware agar operator dapat mencari siswa lintas kelas saat absensi
  fastify.post('/:id/tap-siswa', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability(['attendance.sessions.tap', 'attendance.sessions.update.attendance']), 
        elevatedScopeMiddleware, 
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.tapSiswa,
  });

  // Presensi terpadu guru & siswa per sesi (Unified Shared Endpoint)
  fastify.get('/:id/presensi-terpadu', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.view.detail', { exemptRoles: [RoleName.SISWA, RoleName.GURU, RoleName.ADMIN] }), 
        elevatedScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.getPresensiTerpaduSesi || sesiAbsensiController.listAbsenSiswa,
  });

  // Legacy route alias for backward compatibility
  fastify.get('/:id/absen-siswa', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.view.detail', { exemptRoles: [RoleName.SISWA, RoleName.GURU, RoleName.ADMIN] }), 
        elevatedScopeMiddleware,        // tenant_wide: operator perlu lihat semua siswa
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.listAbsenSiswa,
  });

  fastify.get('/:id/summary', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.reports.view'), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.summaryById,
  });

  fastify.get('/petugas/check', {
    preHandler: [
        organizationalScopeMiddleware,
        determineDataScope()
    ],
    handler: sesiAbsensiController.checkPetugasActive,
  });

  // 8. Upsert Progres Materi (Jurnal KBM)
  fastify.post('/:id/progres-materi', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.update.journal'), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.upsertProgresMateri,
  });

  // 9. Generate Sesi from Template (Ad-hoc) - Petugas Kelas & Admin
  fastify.post('/generate-from-template', {
    preHandler: [
        requireMultiSesiMode,
        requireCapability('attendance.sessions.create'),
        organizationalScopeMiddleware,
        determineDataScope()
    ],
    handler: sesiAbsensiController.generateFromTemplate,
  });

  // 10. Send KBM Reminder to Teacher (Hybrid WA Gateway & Personal Link)
  fastify.post('/:id/send-reminder', {
    preHandler: [
        requireMultiSesiMode,
        requireCapability(['attendance.sessions.view.list', 'attendance.piket.manage', 'academic.monitoring.view'], { exemptRoles: [RoleName.GURU, RoleName.ADMIN] }),
        organizationalScopeMiddleware,
        determineDataScope()
    ],
    handler: sesiAbsensiController.sendReminder,
  });

  // 11. Teacher Locator (Global Real-Time Teacher Location)
  fastify.get('/teacher-locator', {
    preHandler: [
        requireMultiSesiMode,
        requireCapability(['attendance.sessions.view.list', 'academic.monitoring.view'], { exemptRoles: [RoleName.SISWA, RoleName.GURU, RoleName.ADMIN] }),
        organizationalScopeMiddleware,
        determineDataScope()
    ],
    handler: sesiAbsensiController.locateTeachers,
  });
}
