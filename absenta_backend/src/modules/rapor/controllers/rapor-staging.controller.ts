import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '../../../utils/response';
import { RaporStagingService } from '../services/rapor-staging.service';
import { GoogleSheetRaporParserService } from '../services/google-sheet-rapor-parser.service';
import { z } from 'zod';

const fetchSheetsSchema = z.object({
  urls: z.array(z.string().url('Format URL Google Sheet tidak valid')).min(1, 'Minimal sertakan 1 URL Google Sheet'),
});

export class RaporStagingController {
  /**
   * POST /api/rapor/staging/scan-folder
   * Memindai tautan (berkas atau folder) dan mengembalikan daftar file Google Sheet yang terdeteksi
   * sehingga pengguna dapat memilih/menceklis berkas mana saja yang ingin ditarik ke staging.
   */
  static async scanFolder(req: any, reply: any) {
    try {
      const parsed = fetchSheetsSchema.parse(req.body);
      const items: Array<{ id: string; url: string; title: string }> = [];
      const errors: Array<{ url: string; error: string }> = [];

      for (const rawUrl of parsed.urls) {
        const trimmed = rawUrl.trim();
        if (!trimmed) continue;

        if (GoogleSheetRaporParserService.isFolderUrl(trimmed)) {
          try {
            const sheetsInFolder = await GoogleSheetRaporParserService.extractGoogleSheetUrlsFromFolder(trimmed);
            sheetsInFolder.forEach((s: { id: string; url: string; title?: string }) => {
              items.push({
                id: s.id,
                url: s.url,
                title: s.title || `Google Sheet (${s.id.slice(0, 8)}...)`,
              });
            });
          } catch (err: any) {
            errors.push({
              url: trimmed,
              error: err.message || 'Gagal memindai folder Google Drive',
            });
          }
        } else {
          try {
            const id = GoogleSheetRaporParserService.extractSpreadsheetId(trimmed);
            items.push({
              id,
              url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
              title: `Google Sheet Berkas (${id.slice(0, 8)}...)`,
            });
          } catch (err: any) {
            errors.push({
              url: trimmed,
              error: err.message || 'Tautan Google Sheet tidak valid',
            });
          }
        }
      }

      return sendResponse(reply, 200, true, `Pemindaian selesai: ${items.length} sheet terdeteksi`, {
        files: items,
        errors,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.scanFolder error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, error.message || 'Gagal memindai berkas', error);
    }
  }

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
   * GET /api/rapor/staging/:id/pre-sync
   * Melakukan verifikasi kesiapan slot akademik, siswa, dan mapel sebelum sinkronisasi
   */
  static async checkPreSync(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      if (!id) {
        return reply.status(400).send({ success: false, message: 'ID sheet staging wajib disertakan' });
      }

      const report = await RaporStagingService.checkPreSyncReadiness(tenant_id, id);
      return sendResponse(reply, 200, true, 'Pemeriksaan kesiapan slot pre-sync berhasil', report);
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.checkPreSync error');
      return sendError(reply, 500, error.message || 'Gagal memeriksa kesiapan slot', error);
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
      const { autoProvisionStudents, customMapelMapping, sumberNilaiRapor } = req.body || {};

      if (!id) {
        return reply.status(400).send({ success: false, message: 'ID sheet staging wajib disertakan' });
      }

      const result = await RaporStagingService.syncStagingToRapor(tenant_id, id, {
        autoProvisionStudents: Boolean(autoProvisionStudents),
        customMapelMapping: customMapelMapping || undefined,
        sumberNilaiRapor: sumberNilaiRapor || undefined,
      });

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
