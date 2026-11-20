import { programKetarunaanController } from '../controllers/program-ketarunaan.controller';
import { ketarunaanPenilaianController } from '../controllers/ketarunaan-penilaian.controller';
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

  // ─── PENILAIAN & SKEMA BOBOT KETARUNAAN ──────────────────────────────────
  // 8. Ambil Skema Konfigurasi
  fastify.get('/skema', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.getSkema);

  // 9. Simpan Skema Konfigurasi (Bobot & Mode Murni/Semi)
  fastify.post('/skema', {
    preHandler: [
      requireCapability(['dashboard.view.kesiswaan', 'academic.classes.manage']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.saveSkema);

  // 10. Ambil Nilai Kelas
  fastify.get('/nilai', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.getNilaiKelas);

  // 10b. Ambil Data Lengkap Nilai Ketarunaan untuk Ekspor Excel / Mail Merge
  fastify.get('/nilai/export', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.getNilaiExport);

  // 11. Simpan Nilai Bulk
  fastify.post('/nilai/bulk', {
    preHandler: [
      requireCapability(['attendance.sessions.create', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.saveNilaiBulk);

  // 12. Kunci & Kirim ke Rapor Kokurikuler
  fastify.post('/nilai/lock', {
    preHandler: [
      requireCapability(['dashboard.view.kesiswaan', 'academic.classes.manage']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.lockNilaiKeRapor);

  // 13. Buka Kunci Nilai
  fastify.post('/nilai/unlock', {
    preHandler: [
      requireCapability(['dashboard.view.kesiswaan', 'academic.classes.manage']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.unlockNilai);

  // 14. Rekap Presensi 5 Siklus Ketarunaan
  fastify.get('/presensi-sync', {
    preHandler: [
      requireCapability(['attendance.sessions.view.list', 'dashboard.view.kesiswaan']),
      determineDataScope(),
    ],
  }, ketarunaanPenilaianController.syncPresensi5Siklus);
}
