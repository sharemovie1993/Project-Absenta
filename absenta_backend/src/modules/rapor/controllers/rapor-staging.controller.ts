import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '../../../utils/response';
import { RaporStagingService } from '../services/rapor-staging.service';
import { z } from 'zod';

const fetchSheetsSchema = z.object({
  urls: z.array(z.string().url('Format URL Google Sheet tidak valid')).min(1, 'Minimal sertakan 1 URL Google Sheet'),
});

export class RaporStagingController {
  /**
   * POST /api/rapor/staging/fetch
   * Menarik Google Sheet dari satu atau banyak link dan menyimpannya ke Staging Hub
   */
  static async fetchAndStage(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = fetchSheetsSchema.parse(req.body);

      const result = await RaporStagingService.fetchAndStageSheets(tenant_id, parsed.urls);

      return sendResponse(
        reply,
        200,
        true,
        `Proses pengambilan selesai: ${result.results.length} sheet berhasil diproses, ${result.errors.length} sheet gagal`,
        result
      );
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.fetchAndStage error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, error.message || 'Gagal memproses penarikan Google Sheet', error);
    }
  }

  /**
   * GET /api/rapor/staging
   * Mengambil daftar seluruh sheet yang ada di Staging Hub
   */
  static async getList(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { tahunPelajaran, semester, kelas } = req.query || {};

      const list = await RaporStagingService.getStagedSheets(tenant_id, {
        tahunPelajaran,
        semester,
        kelas,
      });

      return sendResponse(reply, 200, true, 'Daftar staging sheet berhasil dimuat', list);
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.getList error');
      return sendError(reply, 500, error.message || 'Gagal memuat daftar staging sheet', error);
    }
  }

  /**
   * GET /api/rapor/staging/:id
   * Mengambil detail lengkap satu sheet staging untuk pratinjau data siswa dan nilai
   */
  static async getDetail(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      if (!id) {
        return reply.status(400).send({ success: false, message: 'ID sheet staging wajib disertakan' });
      }

      const detail = await RaporStagingService.getStagedSheetDetail(tenant_id, id);
      return sendResponse(reply, 200, true, 'Detail staging sheet berhasil dimuat', detail);
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.getDetail error');
      return sendError(reply, 500, error.message || 'Gagal memuat detail staging sheet', error);
    }
  }

  /**
   * POST /api/rapor/staging/:id/sync
   * Menyinkronkan data lembar staging ke modul produksi e-Rapor (NilaiSiswa & RaporSiswa)
   */
  static async sync(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      if (!id) {
        return reply.status(400).send({ success: false, message: 'ID sheet staging wajib disertakan' });
      }

      const result = await RaporStagingService.syncStagingToRapor(tenant_id, id);

      return sendResponse(reply, 200, true, 'Sinkronisasi ke modul e-Rapor berhasil dilakukan', result);
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.sync error');
      return sendError(reply, 400, error.message || 'Gagal menyinkronkan data ke e-Rapor', error);
    }
  }

  /**
   * DELETE /api/rapor/staging/:id
   * Menghapus lembar staging
   */
  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      if (!id) {
        return reply.status(400).send({ success: false, message: 'ID sheet staging wajib disertakan' });
      }

      await RaporStagingService.deleteStagedSheet(tenant_id, id);
      return sendResponse(reply, 200, true, 'Data staging sheet berhasil dihapus');
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.delete error');
      return sendError(reply, 500, error.message || 'Gagal menghapus staging sheet', error);
    }
  }
}
