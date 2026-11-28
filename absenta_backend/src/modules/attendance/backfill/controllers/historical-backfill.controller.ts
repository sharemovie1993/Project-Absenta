import { historicalBackfillService } from '../services/historical-backfill.service';
import { AttendanceStagingService } from '../../staging/services/attendance-staging.service';

export class HistoricalBackfillController {
  /**
   * Unduh Berkas Template Excel Smart Backfill
   * GET /api/attendance/backfill/template?kelas_id=...&bulan=...
   */
  async downloadTemplate(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id || request.user?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan pada sesi Anda.' });
      }

      const query = (request.query || {}) as any;
      const kelasId = query.kelas_id || query.kelasId;
      if (!kelasId) {
        return reply.status(400).send({ success: false, message: 'Parameter kelas_id wajib disertakan.' });
      }

      const bulan = query.bulan ? Number(query.bulan) : undefined;
      const mapelId = query.mapel_id || query.mapelId;
      const jenisKegiatan = query.jenis_kegiatan || query.jenisKegiatan;
      const jadwalKegiatanId = query.jadwal_kegiatan_id || query.jadwalKegiatanId;
      const hari = query.hari;
      const tahunPelajaranId = query.tahun_pelajaran_id || query.tahunPelajaranId;
      const semesterId = query.semester_id || query.semesterId;
      const startDate = query.start_date || query.startDate;
      const endDate = query.end_date || query.endDate;

      const { buffer, fileName } = await historicalBackfillService.generateTemplate(tenantId, {
        kelasId,
        mapelId,
        jenisKegiatan,
        jadwalKegiatanId,
        hari,
        tahunPelajaranId,
        semesterId,
        bulan,
        startDate,
        endDate,
      });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      return reply.send(buffer);
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal men-generate template Excel.',
      });
    }
  }

  /**
   * Pratinjau & Validasi Berkas Excel yang Diunggah
   * POST /api/attendance/backfill/preview
   */
  async preview(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id || request.user?.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan.' });
      }

      let kelasId = '';
      let fileBuffer: Buffer | null = null;

      // 1. Cek jika request berupa Multipart Form Data
      if (typeof request.isMultipart === 'function' && request.isMultipart()) {
        const data = await request.file();
        if (data) {
          fileBuffer = await data.toBuffer();
          kelasId = data.fields?.kelasId?.value || data.fields?.kelas_id?.value || '';
        }
      }

      // 2. Cek jika request berupa JSON payload (Base64)
      if (!fileBuffer) {
        const body = (request.body || {}) as any;
        kelasId = body.kelasId || body.kelas_id || kelasId;
        const rawBase64 = body.fileBase64 || body.file_base64 || body.excelBase64;
        if (rawBase64 && typeof rawBase64 === 'string') {
          const cleanBase64 = rawBase64.replace(/^data:.*?;base64,/, '');
          fileBuffer = Buffer.from(cleanBase64, 'base64');
        }
      }

      if (!kelasId) {
        return reply.status(400).send({ success: false, message: 'Parameter kelasId wajib disertakan.' });
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return reply.status(400).send({ success: false, message: 'Berkas Excel tidak ditemukan dalam permintaan.' });
      }

      const previewData = await historicalBackfillService.previewExcel(tenantId, kelasId, fileBuffer);
      return reply.status(200).send({ success: true, data: previewData });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal memproses pratinjau file Excel.',
      });
    }
  }

  /**
   * Eksekusi Backfill Historis ke Sesi & Database
   * POST /api/attendance/backfill/execute
   */
  async execute(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.user?.tenant_id || request.user?.tenantId;
      const userId = request.user?.id || request.user?.userId || 'system-admin';

      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak ditemukan.' });
      }

      await AttendanceStagingService.assertGuardEnabled(tenantId);

      const body = (request.body || {}) as any;
      const {
        kelasId,
        mapelId,
        mapel_id,
        guruId,
        guru_id,
        jenisKegiatan,
        jenis_kegiatan,
        jadwalKegiatanId,
        jadwal_kegiatan_id,
        tahunPelajaranId,
        semesterId,
        dateList,
        students,
      } = body;

      if (!kelasId || !Array.isArray(dateList) || dateList.length === 0 || !Array.isArray(students) || students.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Data eksekusi tidak lengkap. Diperlukan kelasId, dateList, dan students.',
        });
      }

      const result = await historicalBackfillService.executeBackfill(tenantId, userId, {
        kelasId,
        mapelId: mapelId || mapel_id,
        guruId: guruId || guru_id,
        jenisKegiatan: jenisKegiatan || jenis_kegiatan,
        jadwalKegiatanId: jadwalKegiatanId || jadwal_kegiatan_id,
        tahunPelajaranId,
        semesterId,
        dateList,
        students,
      });

      return reply.status(200).send({
        success: true,
        message: 'Backfill presensi semester ganjil berhasil disimpan dan terhubung ke sesi.',
        data: result,
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        code: error.code,
        message: error.message || 'Gagal mengeksekusi backfill presensi historis.',
      });
    }
  }
}

export const historicalBackfillController = new HistoricalBackfillController();
