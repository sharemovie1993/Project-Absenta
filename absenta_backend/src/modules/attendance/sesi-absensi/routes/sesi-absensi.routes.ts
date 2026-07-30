import { sesiAbsensiController } from '../controllers/sesi-absensi.controller';
import { requireMultiSesiMode } from '@/middlewares/attendanceMode';
import { requireCapability } from '@/middlewares/requireCapability';
import { organizationalScopeMiddleware, elevatedScopeMiddleware } from '@/middlewares/organizationalScope';
import { determineDataScope } from '@/middlewares/dataScope';
import { SesiGuard } from '../guards/sesi.guard';
import { RoleName } from '../../../../constants/enums';

export async function sesiAbsensiRoutes(fastify: any) {
  // 1. Start Sesi (Create SesiAbsensi) - OPERATOR ONLY (SISWA Petugas)
  // POST /api/attendance/sesi-absensi
  fastify.post('/', {
    preHandler: [
        requireMultiSesiMode,
        requireCapability('attendance.sessions.create'), 
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

  // 3. Update Status (Close Sesi) - OPERATOR ONLY
  fastify.patch('/:id/status', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.close'), 
        organizationalScopeMiddleware,
        determineDataScope(),
        SesiGuard.validateSessionAccess
    ],
    handler: sesiAbsensiController.updateStatus,
  });

  // 4. Update Sesi Details - OPERATOR ONLY
  fastify.put('/:id', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.update'), 
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

  // 6. Guru Self Scan - PARTICIPANT ONLY (GURU)
  fastify.patch('/:id/absen-guru/:guru_id', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.update.attendance'), 
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

  // Daftar absen siswa per sesi — juga perlu elevatedScopeMiddleware
  fastify.get('/:id/absen-siswa', {
    preHandler: [
        requireMultiSesiMode, 
        requireCapability('attendance.sessions.view.detail'), 
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
}
