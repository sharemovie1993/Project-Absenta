import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '@/utils/response';
import { AttendanceStagingService } from '../services/attendance-staging.service';
import { z } from 'zod';

const fetchUrlSchema = z.object({
  url: z.string().url('Format URL Google Sheet tidak valid'),
});

const bulkSyncSchema = z.object({
  ids: z.array(z.string()).min(1, 'Minimal pilih 1 lembar staging'),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'Minimal pilih 1 lembar staging'),
});

export class AttendanceStagingController {
  /**
   * POST /attendance/staging/fetch
   * Unduh Google Sheet, parse seluruh rombel (multi-sheet), simpan ke staging
   */
  static async fetchSheet(req: any, reply: FastifyReply) {
    try {
      const { url } = fetchUrlSchema.parse(req.body);
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return sendError(reply, 401, 'Unauthorized: Tenant ID tidak ditemukan');
      }

      const result = await AttendanceStagingService.fetchAndStore(tenantId, url);
      return sendResponse(reply, 200, `Berhasil mengekstrak ${result.totalSheets} lembar kelas ke wadah staging.`, result);
    } catch (err: any) {
      appLogger.error({ err: err.message }, 'Gagal menarik data Google Sheet staging');
      return sendError(reply, 400, err.message);
    }
  }

  /**
   * GET /attendance/staging
   * Ambil daftar lembar kelas yang tertampung di staging
   */
  static async listSheets(req: any, reply: FastifyReply) {
    try {
      const tenantId = req.user?.tenant_id;
      const { status, search } = req.query as { status?: string; search?: string };
      const sheets = await AttendanceStagingService.listSheets(tenantId, { status, search });
      return sendResponse(reply, 200, 'Berhasil mengambil daftar staging absensi', sheets);
    } catch (err: any) {
      return sendError(reply, 500, err.message);
    }
  }

  /**
   * GET /attendance/staging/:id
   * Ambil rincian data 1 lembar staging
   */
  static async getSheetDetail(req: any, reply: FastifyReply) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      const detail = await AttendanceStagingService.getSheetDetail(tenantId, id);
      return sendResponse(reply, 200, 'Berhasil mengambil rincian staging absensi', detail);
    } catch (err: any) {
      return sendError(reply, 404, err.message);
    }
  }

  /**
   * POST /attendance/staging/:id/sync
   * Eksekusi sinkronisasi 1 lembar staging ke absensi resmi
   */
  static async syncSheet(req: any, reply: FastifyReply) {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id || 'system';
      const { id } = req.params as { id: string };

      const result = await AttendanceStagingService.syncSheet(tenantId, id, userId);
      return sendResponse(reply, 200, result.message, result);
    } catch (err: any) {
      appLogger.error({ err: err.message }, 'Gagal sinkronisasi staging absensi');
      return sendError(reply, 400, err.message);
    }
  }

  /**
   * POST /attendance/staging/bulk-sync
   * Eksekusi sinkronisasi massal seluruh lembar terpilih
   */
  static async bulkSync(req: any, reply: FastifyReply) {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id || 'system';
      const { ids } = bulkSyncSchema.parse(req.body);

      const result = await AttendanceStagingService.bulkSyncSheets(tenantId, ids, userId);
      return sendResponse(reply, 200, `Sinkronisasi selesai: ${result.syncedCount} berhasil, ${result.failedCount} gagal.`, result);
    } catch (err: any) {
      return sendError(reply, 400, err.message);
    }
  }

  /**
   * DELETE /attendance/staging/:id
   * Hapus 1 lembar staging
   */
  static async deleteSheet(req: any, reply: FastifyReply) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      await AttendanceStagingService.deleteSheet(tenantId, id);
      return sendResponse(reply, 200, 'Berhasil menghapus lembar staging');
    } catch (err: any) {
      return sendError(reply, 400, err.message);
    }
  }

  /**
   * POST /attendance/staging/bulk-delete
   * Hapus massal lembar staging terpilih
   */
  static async bulkDelete(req: any, reply: FastifyReply) {
    try {
      const tenantId = req.user?.tenant_id;
      const { ids } = bulkDeleteSchema.parse(req.body);
      await AttendanceStagingService.bulkDeleteSheets(tenantId, ids);
      return sendResponse(reply, 200, `Berhasil menghapus ${ids.length} lembar staging terpilih`);
    } catch (err: any) {
      return sendError(reply, 400, err.message);
    }
  }
}
