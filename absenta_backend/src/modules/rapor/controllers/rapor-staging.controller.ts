import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '../../../utils/response';
import { RaporStagingService } from '../services/rapor-staging.service';
import { GoogleSheetRaporParserService } from '../services/google-sheet-rapor-parser.service';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

const fetchSheetsSchema = z.object({
  urls: z.array(z.string().url('Format URL Google Sheet tidak valid')).min(1, 'Minimal sertakan 1 URL Google Sheet'),
});

const masterUrlSchema = z.object({
  url: z.string().url('Format URL Google Sheet tidak valid'),
});

const executeMasterBackfillSchema = z.object({
  url: z.string().url('Format URL Google Sheet tidak valid'),
  tahun_pelajaran_id: z.string().optional(),
  update_rapor_settings: z.boolean().optional(),
  update_walas_assignments: z.boolean().optional(),
  custom_settings: z
    .object({
      nama_kepsek: z.string().optional(),
      nip_kepsek: z.string().optional(),
      tempat_terbit: z.string().optional(),
      tanggal_rapor_ganjil: z.string().optional(),
      tanggal_rapor_genap: z.string().optional(),
    })
    .optional(),
  manual_walas_assignments: z
    .array(
      z.object({
        kelasNama: z.string(),
        kelas_id: z.string(),
        guru_user_id: z.string(),
      })
    )
    .optional(),
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
      const tenantId = req.user?.tenant_id;
      const items: Array<{
        id: string;
        url: string;
        title: string;
        is_already_staged: boolean;
        staged_info: {
          id: string;
          nama_kelas: string;
          tahun_pelajaran: string;
          semester: string;
          status: string;
          updated_at: Date;
        } | null;
      }> = [];
      const errors: Array<{ url: string; error: string }> = [];

      // Query seluruh lembar staging existing untuk tenant ini guna mendeteksi status idempoten
      const existingStaged = tenantId
        ? await prisma.raporStagingSheet.findMany({
            where: { tenant_id: tenantId },
            select: {
              id: true,
              source_url: true,
              nama_kelas: true,
              tahun_pelajaran_nama: true,
              semester: true,
              status: true,
              updated_at: true,
            },
          })
        : [];

      const existingMap = new Map<string, (typeof existingStaged)[0]>();
      existingStaged.forEach((sheet) => {
        try {
          const sId = GoogleSheetRaporParserService.extractSpreadsheetId(sheet.source_url);
          if (sId) {
            existingMap.set(sId, sheet);
          }
        } catch {
          // ignore
        }
      });

      for (const rawUrl of parsed.urls) {
        const trimmed = rawUrl.trim();
        if (!trimmed) continue;

        if (GoogleSheetRaporParserService.isFolderUrl(trimmed)) {
          try {
            const sheetsInFolder = await GoogleSheetRaporParserService.extractGoogleSheetUrlsFromFolder(trimmed);
            sheetsInFolder.forEach((s: { id: string; url: string; title?: string }) => {
              const matchedExisting = existingMap.get(s.id);
              items.push({
                id: s.id,
                url: s.url,
                title: s.title || `Google Sheet (${s.id.slice(0, 8)}...)`,
                is_already_staged: !!matchedExisting,
                staged_info: matchedExisting
                  ? {
                      id: matchedExisting.id,
                      nama_kelas: matchedExisting.nama_kelas,
                      tahun_pelajaran: matchedExisting.tahun_pelajaran_nama,
                      semester: matchedExisting.semester,
                      status: matchedExisting.status,
                      updated_at: matchedExisting.updated_at,
                    }
                  : null,
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
            const matchedExisting = existingMap.get(id);
            items.push({
              id,
              url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
              title: `Google Sheet Berkas (${id.slice(0, 8)}...)`,
              is_already_staged: !!matchedExisting,
              staged_info: matchedExisting
                ? {
                    id: matchedExisting.id,
                    nama_kelas: matchedExisting.nama_kelas,
                    tahun_pelajaran: matchedExisting.tahun_pelajaran_nama,
                    semester: matchedExisting.semester,
                    status: matchedExisting.status,
                    updated_at: matchedExisting.updated_at,
                  }
                : null,
            });
          } catch (err: any) {
            errors.push({
              url: trimmed,
              error: err.message || 'Tautan Google Sheet tidak valid',
            });
          }
        }
      }

      const totalAlreadyStaged = items.filter((i) => i.is_already_staged).length;
      const totalNew = items.length - totalAlreadyStaged;

      return sendResponse(
        reply,
        200,
        true,
        `Pemindaian selesai: ${items.length} sheet terdeteksi (${totalNew} baru, ${totalAlreadyStaged} sudah di wadah)`,
        {
          files: items,
          errors,
          meta: {
            total: items.length,
            already_staged: totalAlreadyStaged,
            new_files: totalNew,
          },
        }
      );
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
      const { autoProvisionStudents, customMapelMapping, sumberNilaiRapor, customKelasId } = req.body || {};

      if (!id) {
        return reply.status(400).send({ success: false, message: 'ID sheet staging wajib disertakan' });
      }

      const result = await RaporStagingService.syncStagingToRapor(tenant_id, id, {
        autoProvisionStudents: Boolean(autoProvisionStudents),
        customMapelMapping: customMapelMapping || undefined,
        sumberNilaiRapor: sumberNilaiRapor || undefined,
        customKelasId: customKelasId || undefined,
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

  /**
   * POST /api/rapor/staging/bulk-delete
   * Menghapus banyak lembar staging sekaligus (Bulk Delete)
   */
  static async bulkDelete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const bulkDeleteSchema = z.object({
        ids: z.array(z.string().min(1)).min(1, 'Minimal sertakan 1 ID lembar staging untuk dihapus'),
      });
      const parsed = bulkDeleteSchema.parse(req.body);

      const deleted = await RaporStagingService.deleteStagedSheetsBulk(tenant_id, parsed.ids);
      return sendResponse(reply, 200, true, `${deleted.count} lembar staging berhasil dihapus`, {
        count: deleted.count,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.bulkDelete error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, error.message || 'Gagal menghapus lembar staging terpilih', error);
    }
  }

  /**
   * POST /api/rapor/staging/backfill-master/preview
   * Menganalisis berkas Google Sheet untuk pratinjau data master (Wali Kelas & Setting Rapor)
   */
  static async previewMasterBackfill(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = masterUrlSchema.parse(req.body);

      const result = await RaporStagingService.previewMasterBackfill(tenant_id, parsed.url);
      return sendResponse(reply, 200, true, 'Pratinjau backfill data master rapor berhasil dianalisis', result);
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.previewMasterBackfill error');
      return sendError(reply, 400, error.message || 'Gagal menganalisis sheet master', error);
    }
  }

  /**
   * POST /api/rapor/staging/backfill-master/execute
   * Mengeksekusi penulisan Wali Kelas ke OrganizationalAssignment dan konfigurasi Setting Rapor
   */
  static async executeMasterBackfill(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = executeMasterBackfillSchema.parse(req.body);

      const result = await RaporStagingService.executeMasterBackfill(tenant_id, parsed);
      return sendResponse(reply, 200, true, result.message, result);
    } catch (error: any) {
      appLogger.error({ err: error }, 'RaporStagingController.executeMasterBackfill error');
      return sendError(reply, 400, error.message || 'Gagal mengeksekusi backfill data master', error);
    }
  }
}
