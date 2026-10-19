import { unifiedKegiatanController } from '../controllers/unified-kegiatan.controller';
import { requireCapability } from '../../../../middlewares/requireCapability';
import { determineDataScope } from '../../../../middlewares/dataScope';

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
