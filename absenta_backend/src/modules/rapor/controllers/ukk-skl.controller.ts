import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '../../../utils/response';
import { UkkSklService } from '../services/ukk-skl.service';
import { sertifikatUkkUpsertSchema, kelulusanSiswaUpsertSchema } from '../services/penilaian.schema';
import { z } from 'zod';

export class UkkSklController {
  // === UKK ===
  static async upsertUkk(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = sertifikatUkkUpsertSchema.parse(req.body);

      const result = await UkkSklService.upsertUkk(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Sertifikat UKK berhasil disimpan', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal menyimpan sertifikat UKK', error);
    }
  }

  static async getUkk(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { siswa_id, query, jurusan_id, kelas_id } = req.query;

      const result = await UkkSklService.getUkk(tenant_id, {
        siswa_id,
        query,
        jurusan_id,
        kelas_id,
      });

      return sendResponse(reply, 200, true, 'Daftar sertifikat UKK berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat data UKK', error);
    }
  }

  static async deleteUkk(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const result = await UkkSklService.deleteUkk(tenant_id, id);
      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          message: 'Data UKK tidak ditemukan atau bukan milik tenant Anda',
        });
      }

      return sendResponse(reply, 200, true, 'Sertifikat UKK berhasil dihapus');
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal menghapus sertifikat UKK', error);
    }
  }

  // === SKL ===
  static async upsertSkl(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = kelulusanSiswaUpsertSchema.parse(req.body);

      const result = await UkkSklService.upsertSkl(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'SKL kelulusan berhasil disimpan', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal menyimpan SKL', error);
    }
  }

  static async getSkl(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { siswa_id, query } = req.query;

      const result = await UkkSklService.getSkl(tenant_id, {
        siswa_id,
        query,
      });

      return sendResponse(reply, 200, true, 'Daftar SKL berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat data SKL', error);
    }
  }

  static async deleteSkl(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const result = await UkkSklService.deleteSkl(tenant_id, id);
      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          message: 'Data SKL tidak ditemukan atau bukan milik tenant Anda',
        });
      }

      return sendResponse(reply, 200, true, 'SKL kelulusan berhasil dihapus');
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal menghapus SKL', error);
    }
  }

  // === UKK Settings (Judul Penugasan & Unit Kompetensi per Jurusan) ===
  static async getUkkSettings(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jurusan_id } = req.query;

      const result = await UkkSklService.getUkkSettings(tenant_id, jurusan_id);
      return sendResponse(reply, 200, true, 'Pengaturan UKK berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat pengaturan UKK', error);
    }
  }

  static async saveUkkSettings(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jurusan_id, data } = req.body;

      if (!jurusan_id) {
        return reply.status(400).send({
          success: false,
          message: 'jurusan_id wajib disertakan',
        });
      }

      const result = await UkkSklService.saveUkkSettings(tenant_id, jurusan_id, data);
      return sendResponse(reply, 200, true, 'Pengaturan UKK berhasil disimpan', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal menyimpan pengaturan UKK', error);
    }
  }

  // === UKK Pra-UKK Jadwal & Ploting Penguji ===
  static async getUkkJadwal(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jurusan_id } = req.query;

      const result = await UkkSklService.getUkkJadwal(tenant_id, jurusan_id);
      return sendResponse(reply, 200, true, 'Jadwal & Ploting UKK berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat jadwal & ploting UKK', error);
    }
  }

  static async saveUkkJadwal(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jurusan_id, sessions } = req.body;

      if (!jurusan_id || !Array.isArray(sessions)) {
        return reply.status(400).send({
          success: false,
          message: 'jurusan_id dan sessions (array) wajib disertakan',
        });
      }

      const result = await UkkSklService.saveUkkJadwal(tenant_id, jurusan_id, sessions);
      return sendResponse(reply, 200, true, 'Jadwal & Ploting UKK berhasil disimpan', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal menyimpan jadwal & ploting UKK', error);
    }
  }

  // === UKK Berita Acara & Dokumentasi Sesi ===
  static async getUkkBeritaAcara(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jurusan_id } = req.query;

      const result = await UkkSklService.getUkkBeritaAcara(tenant_id, jurusan_id);
      return sendResponse(reply, 200, true, 'Berita Acara UKK berhasil dimuat', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal memuat berita acara UKK', error);
    }
  }

  static async saveUkkBeritaAcara(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jurusan_id, records } = req.body;

      if (!jurusan_id || !Array.isArray(records)) {
        return reply.status(400).send({
          success: false,
          message: 'jurusan_id dan records (array) wajib disertakan',
        });
      }

      const result = await UkkSklService.saveUkkBeritaAcara(tenant_id, jurusan_id, records);
      return sendResponse(reply, 200, true, 'Berita Acara UKK berhasil disimpan', result);
    } catch (error) {
      appLogger.error({ err: error }, 'Rapor controller error');
      return sendError(reply, 500, 'Gagal menyimpan berita acara UKK', error);
    }
  }
}
