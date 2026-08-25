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
      const { siswa_id, query } = req.query;

      const result = await UkkSklService.getUkk(tenant_id, {
        siswa_id,
        query,
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
}
