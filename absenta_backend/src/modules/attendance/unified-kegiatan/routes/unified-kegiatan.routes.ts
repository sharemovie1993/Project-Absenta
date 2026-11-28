import { unifiedKegiatanController } from '../controllers/unified-kegiatan.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';
import { RoleName } from '../../../../constants/enums';

export async function unifiedKegiatanRoutes(fastify: any) {
  // 1. Guard Status
  fastify.get('/guard-status', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getGuardStatus,
  });

  // 2. Sesi Hari Ini
  fastify.get('/sesi-hari-ini', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getSesiHariIni,
  });

  // 2b. Live Terminal Feed & Unified Counter Hari Ini
  fastify.get('/terminal-feed', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getTerminalFeed,
  });

  // 3. Pendamping & Unsur Beririsan
  fastify.get('/pendamping', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getPendamping,
  });

  // 4. Tap Pendamping (1 Tap 2 Record)
  fastify.post('/tap', {
    preHandler: [
      requireCapability(['attendance.sessions.tap', 'attendance.sessions.create', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.tapPendamping,
  });

  // 4b. Tap Pendamping via RFID Scanner (Universal Reusable Engine)
  fastify.post('/tap-rfid', {
    preHandler: [
      requireCapability(['attendance.sessions.tap', 'attendance.sessions.create', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.tapPendampingRfid,
  });

  // 4c. Selfie Mandiri Guru pada Sesi Kegiatan (Mode Wajib Tap Terminal = OFF)
  fastify.post('/selfie-guru', {
    preHandler: [
      requireCapability('attendance.sessions.create', { exemptRoles: [RoleName.GURU, RoleName.ADMIN] }),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.selfieGuruKegiatan,
  });

  // 5. Statistik
  fastify.get('/stats', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getStats,
  });

  // 6. Laporan Tim
  fastify.get('/laporan-tim', {
    preHandler: [
      requireCapability(['attendance.reports.view', 'attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getLaporanTim,
  });

  // 7. Laporan Kelas
  fastify.get('/laporan-kelas', {
    preHandler: [
      requireCapability(['attendance.reports.view', 'attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
    handler: unifiedKegiatanController.getLaporanKelas,
  });
}
