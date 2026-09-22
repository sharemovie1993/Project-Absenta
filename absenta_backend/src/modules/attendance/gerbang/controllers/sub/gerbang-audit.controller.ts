import { gerbangAuditService } from '../../services/gerbang-audit.service';
import { isSchoolDay } from '@/utils/school-day.utils';

export const gerbangAuditController = {
  /**
   * Catat tamu / pengunjung gerbang
   */
  async recordGuest(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const userId = request.user?.id || 'SYSTEM';
      const body = request.body || {};

      if (!body.nama_tamu || !body.nama_tamu.trim()) {
        reply.status(400);
        return { success: false, message: 'Nama tamu wajib diisi' };
      }

      if (!body.keperluan_tamu || !body.keperluan_tamu.trim()) {
        reply.status(400);
        return { success: false, message: 'Keperluan kunjungan tamu wajib diisi' };
      }

      const result = await gerbangAuditService.recordGuestAccess(
        {
          nama_tamu: body.nama_tamu,
          instansi_tamu: body.instansi_tamu,
          keperluan_tamu: body.keperluan_tamu,
          kontak_tamu: body.kontak_tamu,
          arah: body.arah || 'MASUK',
          catatan: body.catatan,
          tipe_orang: body.tipe_orang,
          siswa_id: body.siswa_id,
          guru_id: body.guru_id,
          kelas_snapshot: body.kelas_snapshot,
          kategori_buku: body.kategori_buku,
          jabatan_tamu: body.jabatan_tamu,
          pejabat_dituju: body.pejabat_dituju,
          nomor_surat_tugas: body.nomor_surat_tugas,
          pesan_kesan: body.pesan_kesan,
          titik_pencatat: body.titik_pencatat,
        },
        userId,
        tenantId
      );

      reply.status(201);
      return result;
    } catch (error: any) {
      request.log?.error(error);
      reply.status(500);
      return { success: false, message: error.message || 'Gagal mencatat akses tamu' };
    }
  },

  /**
   * Ambil daftar log akses keamanan gerbang
   */
  async getSecurityLogs(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const filters = request.query || {};

      const result = await gerbangAuditService.getSecurityLogs(tenantId, filters);
      return result;
    } catch (error: any) {
      request.log?.error(error);
      reply.status(500);
      return { success: false, message: error.message || 'Gagal mengambil log akses keamanan' };
    }
  },

  /**
   * Ambil ringkasan statistik log akses keamanan gerbang
   */
  async getSecurityLogStats(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const dateRange = request.query || {};

      const result = await gerbangAuditService.getSecurityLogStats(tenantId, dateRange);
      return result;
    } catch (error: any) {
      request.log?.error(error);
      reply.status(500);
      return { success: false, message: error.message || 'Gagal mengambil statistik log akses keamanan' };
    }
  },

  /**
   * Cek apakah hari ini merupakan hari sekolah aktif atau mode audit hari libur
   */
  async checkSchoolDay(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const targetDate = request.query?.date ? new Date(request.query.date) : new Date();

      const schoolDay = await isSchoolDay(tenantId, targetDate);
      return {
        success: true,
        isAuditMode: !schoolDay.isWorkingDay,
        isWorkingDay: schoolDay.isWorkingDay,
        reason: schoolDay.reason || (schoolDay.isWorkingDay ? 'Hari Kerja Sekolah' : 'Hari Libur / Non-Sekolah'),
      };
    } catch (error: any) {
      request.log?.error(error);
      reply.status(500);
      return { success: false, message: error.message || 'Gagal mengecek status hari sekolah' };
    }
  },

  /**
   * Update log akses tamu
   */
  async updateLog(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { id } = request.params;
      const body = request.body || {};

      const result = await gerbangAuditService.updateLog(id, tenantId, body);
      return result;
    } catch (error: any) {
      request.log?.error(error);
      reply.status(400);
      return { success: false, message: error.message || 'Gagal memperbarui log akses' };
    }
  },

  /**
   * Hapus log akses
   */
  async deleteLog(request: any, reply: any) {
    try {
      const tenantId = request.tenantId ?? request.user?.tenantId;
      const { id } = request.params;

      const result = await gerbangAuditService.deleteLog(id, tenantId);
      return result;
    } catch (error: any) {
      request.log?.error(error);
      reply.status(400);
      return { success: false, message: error.message || 'Gagal menghapus log akses' };
    }
  },
};
