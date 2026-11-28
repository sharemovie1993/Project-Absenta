import { AttendanceStagingController } from '../controllers/attendance-staging.controller';

export default async function attendanceStagingRoutes(fastify: any) {
  // Guard otentikasi
  fastify.addHook('preHandler', async (req: any, reply: any) => {
    if (!req.user) {
      return reply.status(401).send({ success: false, message: 'Unauthorized' });
    }
  });

  // GET /attendance/staging/guard-status - Cek status Guard Event Resmi Staging & Backfill
  fastify.get('/guard-status', AttendanceStagingController.getGuardStatus);

  // PUT /attendance/staging/guard-status - Aktifkan / Nonaktifkan Guard Event Resmi (Admin Only)
  fastify.put('/guard-status', AttendanceStagingController.updateGuardStatus);

  // POST /attendance/staging/fetch - Unduh spreadsheet & simpan lembar ke staging
  fastify.post('/fetch', AttendanceStagingController.fetchSheet);

  // POST /attendance/staging/manual-backfill - Buat sesi & presensi via input UI manual multi-tanggal
  fastify.post('/manual-backfill', AttendanceStagingController.createManualBackfill);

  // GET /attendance/staging - List seluruh lembar staging
  fastify.get('/', AttendanceStagingController.listSheets);

  // GET /attendance/staging/class-options - Daftar kelas aktif di master untuk pemetaan
  fastify.get('/class-options', AttendanceStagingController.getClassOptions);

  // GET /attendance/staging/class-students/:kelasId - Ambil daftar siswa aktif dalam kelas
  fastify.get('/class-students/:kelasId', AttendanceStagingController.getClassStudents);

  // PUT /attendance/staging/:id/remap-class - Petakan ulang kelas master untuk 1 lembar staging
  fastify.put('/:id/remap-class', AttendanceStagingController.remapClass);

  // POST /attendance/staging/bulk-remap-classes - Petakan ulang kelas master massal
  fastify.post('/bulk-remap-classes', AttendanceStagingController.bulkRemapClasses);

  // GET /attendance/staging/:id - Rincian data 1 lembar staging
  fastify.get('/:id', AttendanceStagingController.getSheetDetail);

  // GET /attendance/staging/:id/students-mapping - Ambil data pemetaan siswa
  fastify.get('/:id/students-mapping', AttendanceStagingController.getStudentsMapping);

  // PUT /attendance/staging/:id/students-mapping - Simpan pemetaan manual siswa
  fastify.put('/:id/students-mapping', AttendanceStagingController.mapStudents);

  // POST /attendance/staging/:id/sync - Sinkronisasi 1 lembar ke presensi resmi
  fastify.post('/:id/sync', AttendanceStagingController.syncSheet);

  // POST /attendance/staging/bulk-sync - Sinkronisasi massal seluruh lembar terpilih
  fastify.post('/bulk-sync', AttendanceStagingController.bulkSync);

  // DELETE /attendance/staging/:id - Hapus 1 lembar staging
  fastify.delete('/:id', AttendanceStagingController.deleteSheet);

  // POST /attendance/staging/bulk-delete - Hapus massal lembar staging
  fastify.post('/bulk-delete', AttendanceStagingController.bulkDelete);
}
