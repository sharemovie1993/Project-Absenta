import { programKetarunaanController } from '../controllers/program-ketarunaan.controller';
import { requireCapability } from '@/middlewares/requireCapability';
import { determineDataScope } from '@/middlewares/dataScope';

export async function programKetarunaanRoutes(fastify: any) {
  // 1. Guard Status
  fastify.get('/guard-status', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.getGuardStatus);

  // 2. Sesi Hari Ini
  fastify.get('/sesi-hari-ini', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.getSesiHariIni);

  // 3. Pendamping
  fastify.get('/pendamping', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.getPendamping);

  // 4. Tap Pendamping (Terminal)
  fastify.post('/tap', {
    preHandler: [
      requireCapability(['attendance.sessions.tap', 'attendance.sessions.create', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.tapPendamping);

  // 5. Statistik
  fastify.get('/stats', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.getStats);

  // 6. Laporan Tim
  fastify.get('/laporan-tim', {
    preHandler: [
      requireCapability(['attendance.reports.view', 'attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.getLaporanTim);

  // 7. Laporan Kelas
  fastify.get('/laporan-kelas', {
    preHandler: [
      requireCapability(['attendance.reports.view', 'attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, programKetarunaanController.getLaporanKelas);
}
