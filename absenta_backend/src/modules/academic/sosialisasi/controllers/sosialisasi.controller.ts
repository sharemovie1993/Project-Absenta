import { SosialisasiService } from '../services/sosialisasi.service';

export class SosialisasiController {
  /**
   * GET /academic/sosialisasi/session
   * Mengambil sesi rapat sosialisasi aktif, statistik kehadiran, dan daftar guru
   */
  static async getActiveSession(req: any, reply: any) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak terdeteksi' });
      }

      const result = await SosialisasiService.getActiveSession(tenantId);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      req.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal mengambil data sesi rapat sosialisasi',
      });
    }
  }

  /**
   * POST /academic/sosialisasi/session
   * Menyimpan perubahan metadata sesi rapat sosialisasi & notulen
   */
  static async updateSession(req: any, reply: any) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak terdeteksi' });
      }

      const payload = req.body as any;
      const updated = await SosialisasiService.updateSession(tenantId, payload);
      return reply.send({
        success: true,
        data: updated,
        message: 'Informasi dan notulen rapat sosialisasi berhasil disimpan',
      });
    } catch (error: any) {
      req.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal menyimpan data rapat sosialisasi',
      });
    }
  }

  /**
   * POST /academic/sosialisasi/attend
   * Menandai kehadiran seorang guru (manual atau scan kamera panitia)
   */
  static async recordAttendance(req: any, reply: any) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak terdeteksi' });
      }

      const { sessionId, guruId, isHadir, metodeScan, catatan } = (req.body as any) || {};
      if (!sessionId || !guruId) {
        return reply.status(400).send({ success: false, message: 'sessionId dan guruId wajib disertakan' });
      }

      const attendee = await SosialisasiService.recordTeacherAttendance(tenantId, {
        sessionId,
        guruId,
        isHadir: isHadir !== undefined ? Boolean(isHadir) : true,
        metodeScan: metodeScan || 'MANUAL',
        catatan,
      });

      return reply.send({
        success: true,
        data: attendee,
        message: isHadir ? `Kehadiran ${attendee.nama_guru} berhasil dicatat` : `Status kehadiran ${attendee.nama_guru} dibatalkan`,
      });
    } catch (error: any) {
      req.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal memperbarui status kehadiran guru',
      });
    }
  }

  /**
   * POST /academic/sosialisasi/reset
   * Menginisialisasi sesi baru rapat sosialisasi
   */
  static async resetSession(req: any, reply: any) {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return reply.status(400).send({ success: false, message: 'Tenant ID tidak terdeteksi' });
      }

      const { namaAcara } = (req.body as any) || {};
      const newSession = await SosialisasiService.resetNewSession(tenantId, namaAcara);

      return reply.send({
        success: true,
        data: newSession,
        message: 'Sesi baru rapat sosialisasi berhasil dibuat dengan kode QR baru.',
      });
    } catch (error: any) {
      req.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal membuat sesi baru rapat sosialisasi',
      });
    }
  }

  /**
   * POST /public/sosialisasi/self-attend
   * Konfirmasi kehadiran mandiri oleh guru via Scan QR Cetak (Publik)
   */
  static async publicSelfAttend(req: any, reply: any) {
    try {
      const { tenantId, qrToken, guruIdOrNip } = (req.body as any) || {};
      const effectiveTenantId = tenantId || req.tenantId || req.headers?.['x-tenant-id'];

      if (!effectiveTenantId) {
        return reply.status(400).send({ success: false, message: 'Identitas tenant sekolah tidak terdeteksi' });
      }
      if (!qrToken || !guruIdOrNip) {
        return reply.status(400).send({ success: false, message: 'Token QR dan Identitas Guru wajib disertakan' });
      }

      const result = await SosialisasiService.selfAttendViaQr(effectiveTenantId, {
        qrToken,
        guruIdOrNip,
      });

      return reply.send(result);
    } catch (error: any) {
      req.log?.error(error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Gagal melakukan konfirmasi kehadiran mandiri',
      });
    }
  }

  /**
   * GET /public/sosialisasi/verify-session
   * Verifikasi token QR publik & mengambil info dasar rapat untuk halaman scan guru
   */
  static async publicVerifySession(req: any, reply: any) {
    try {
      const { tenantId, qrToken } = (req.query as any) || {};
      const effectiveTenantId = tenantId || req.tenantId || req.headers?.['x-tenant-id'];

      if (!effectiveTenantId) {
        return reply.status(400).send({ success: false, message: 'Identitas tenant sekolah tidak terdeteksi' });
      }

      const result = await SosialisasiService.getActiveSession(effectiveTenantId);

      if (qrToken && result.session.qr_token !== qrToken) {
        return reply.status(400).send({
          success: false,
          message: 'Kode QR presensi rapat tidak sesuai atau sudah kadaluarsa.',
        });
      }

      // Kirimkan data publik (tanpa data sensitif)
      return reply.send({
        success: true,
        data: {
          session: {
            id: result.session.id,
            nama_acara: result.session.nama_acara,
            tanggal: result.session.tanggal,
            waktu_mulai: result.session.waktu_mulai,
            waktu_selesai: result.session.waktu_selesai,
            tempat: result.session.tempat,
            status: result.session.status,
            qr_token: result.session.qr_token,
          },
          teachers: result.attendees.map((a) => ({
            id: a.guru_id,
            nama: a.nama_guru,
            nip: a.nip,
            mapel_jabatan: a.mapel_jabatan,
            is_hadir: a.is_hadir,
            waktu_hadir: a.waktu_hadir,
          })),
        },
      });
    } catch (error: any) {
      req.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal memverifikasi sesi rapat sosialisasi',
      });
    }
  }
}
