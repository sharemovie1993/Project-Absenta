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
   * GET /attendance/staging/guard-status
   */
  static async getGuardStatus(req: any, reply: any) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || req.user?.tenantId;
      if (!tenantId) {
        return sendError(reply, 401, 'Unauthorized: Tenant ID tidak ditemukan');
      }
      const status = await AttendanceStagingService.getGuardStatus(tenantId);
      return sendResponse(reply, 200, true, 'Berhasil mengambil status guard staging & backfill', status);
    } catch (err: any) {
      return sendError(reply, 500, err.message, err);
    }
  }

  /**
   * PUT /attendance/staging/guard-status
   */
  static async updateGuardStatus(req: any, reply: any) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || req.user?.tenantId;
      if (!tenantId) {
        return sendError(reply, 401, 'Unauthorized: Tenant ID tidak ditemukan');
      }

      const user = req.user || {};
      const roleName = String(user.roleName || user.role || '').toUpperCase();
      const userRoles: string[] = Array.isArray(user.roles)
        ? user.roles.map((r: any) => String(typeof r === 'string' ? r : r?.name || r?.code || '').toUpperCase())
        : [];
      const isAdmin =
        roleName === 'ADMIN' ||
        roleName === 'SUPERADMIN' ||
        userRoles.includes('ADMIN') ||
        userRoles.includes('SUPERADMIN');

      if (!isAdmin) {
        return sendError(
          reply,
          403,
          'Hanya Administrator Sekolah yang berhak mengaktifkan atau menonaktifkan Guard Event Resmi Staging & Backfill Presensi.'
        );
      }

      const { enabled, event_label } = (req.body || {}) as { enabled?: boolean; event_label?: string };
      if (typeof enabled !== 'boolean') {
        return sendError(reply, 400, 'Parameter enabled (boolean) wajib disertakan');
      }

      const actorName = user.name || user.username || user.email || 'Administrator';
      const status = await AttendanceStagingService.setGuardStatus(tenantId, enabled, actorName, event_label);

      return sendResponse(
        reply,
        200,
        true,
        enabled
          ? 'Mode Event Resmi Staging & Backfill Presensi DIAKTIFKAN. Pengguna kini dapat melakukan rekonsiliasi presensi.'
          : 'Guard Staging & Backfill Presensi DIKUNCI. Fitur manipulasi/backfill presensi kini dinonaktifkan.',
        status
      );
    } catch (err: any) {
      return sendError(reply, 500, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/fetch
   * Unduh Google Sheet, parse seluruh rombel (multi-sheet), simpan ke staging
   */
  static async fetchSheet(req: any, reply: any) {
    try {
      const { url } = fetchUrlSchema.parse(req.body);
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return sendError(reply, 401, 'Unauthorized: Tenant ID tidak ditemukan');
      }

      await AttendanceStagingService.assertGuardEnabled(tenantId);

      const result = await AttendanceStagingService.fetchAndStore(tenantId, url);
      return sendResponse(
        reply,
        200,
        true,
        `Berhasil mengekstrak ${result.totalSheets} lembar kelas ke wadah staging.`,
        result
      );
    } catch (err: any) {
      appLogger.error({ err: err.message }, 'Gagal menarik data Google Sheet staging');
      return sendError(reply, err.statusCode || 400, err.message, err);
    }
  }

  /**
   * GET /attendance/staging
   * Ambil daftar lembar kelas yang tertampung di staging
   */
  static async listSheets(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { status, search } = req.query as { status?: string; search?: string };
      const sheets = await AttendanceStagingService.listSheets(tenantId, { status, search });
      return sendResponse(reply, 200, true, 'Berhasil mengambil daftar staging absensi', sheets);
    } catch (err: any) {
      return sendError(reply, 500, err.message, err);
    }
  }

  /**
   * GET /attendance/staging/:id
   * Ambil rincian data 1 lembar staging
   */
  static async getSheetDetail(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      const detail = await AttendanceStagingService.getSheetDetail(tenantId, id);
      return sendResponse(reply, 200, true, 'Berhasil mengambil rincian staging absensi', detail);
    } catch (err: any) {
      return sendError(reply, 404, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/:id/sync
   * Eksekusi sinkronisasi 1 lembar staging ke absensi resmi
   */
  static async syncSheet(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id || 'system';
      const { id } = req.params as { id: string };

      await AttendanceStagingService.assertGuardEnabled(tenantId);

      const result = await AttendanceStagingService.syncSheet(tenantId, id, userId);
      return sendResponse(
        reply,
        200,
        true,
        result.message || 'Sinkronisasi presensi berhasil',
        result
      );
    } catch (err: any) {
      appLogger.error({ err: err.message }, 'Gagal sinkronisasi data staging presensi');
      return sendError(reply, err.statusCode || 400, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/bulk-sync
   * Eksekusi sinkronisasi massal seluruh lembar terpilih
   */
  static async bulkSync(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id || 'system';
      const { ids } = bulkSyncSchema.parse(req.body);

      await AttendanceStagingService.assertGuardEnabled(tenantId);

      const result = await AttendanceStagingService.bulkSyncSheets(tenantId, ids, userId);
      return sendResponse(
        reply,
        200,
        true,
        `Sinkronisasi massal selesai. ${result.syncedCount} berhasil, ${result.failedCount} gagal.`,
        result
      );
    } catch (err: any) {
      return sendError(reply, err.statusCode || 400, err.message, err);
    }
  }

  /**
   * PUT /attendance/staging/:id/remap-class
   * Petakan ulang kelas master untuk 1 lembar staging
   */
  static async remapClass(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      const { kelas_id } = z.object({ kelas_id: z.string().min(1, 'Kelas ID wajib diisi') }).parse(req.body);

      const result = await AttendanceStagingService.remapClass(tenantId, id, kelas_id);
      return sendResponse(
        reply,
        200,
        true,
        `Berhasil memetakan lembar ke rombel ${result.namaKelas} (${result.totalMatchedSiswa}/${result.totalSiswa} siswa cocok).`,
        result
      );
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/bulk-remap-classes
   * Petakan ulang kelas master massal
   */
  static async bulkRemapClasses(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { mappings } = z
        .object({
          mappings: z.array(
            z.object({
              id: z.string().min(1),
              kelasId: z.string().min(1),
            })
          ),
        })
        .parse(req.body);

      const result = await AttendanceStagingService.bulkRemapClasses(tenantId, mappings);
      return sendResponse(
        reply,
        200,
        true,
        `Berhasil memperbarui ${result.length} pemetaan rombel master.`,
        result
      );
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * GET /attendance/staging/class-options
   * Ambil daftar kelas aktif di tenant untuk dropdown pemetaan
   */
  static async getClassOptions(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const classes = await AttendanceStagingService.getClassOptions(tenantId);
      return sendResponse(reply, 200, true, 'Berhasil mengambil opsi kelas master', classes);
    } catch (err: any) {
      return sendError(reply, 500, err.message, err);
    }
  }

  /**
   * GET /attendance/staging/:id/students-mapping
   * Ambil rincian pemetaan siswa per baris beserta daftar siswa master
   */
  static async getStudentsMapping(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      const data = await AttendanceStagingService.getStudentsMapping(tenantId, id);
      return sendResponse(reply, 200, true, 'Berhasil mengambil data pemetaan siswa', data);
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * PUT /attendance/staging/:id/students-mapping
   * Simpan pemetaan manual siswa sheet ke master siswa
   */
  static async mapStudents(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      const { mappings } = req.body as { mappings: Array<{ sheetNo: number; siswaId: string }> };

      if (!mappings || !Array.isArray(mappings)) {
        return sendError(reply, 400, 'Format pemetaan siswa tidak valid (harus berupa array)');
      }

      const result = await AttendanceStagingService.mapStudents(tenantId, id, mappings);
      return sendResponse(reply, 200, true, 'Pemetaan siswa berhasil disimpan', result);
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * DELETE /attendance/staging/:id
   * Hapus 1 lembar staging
   */
  static async deleteSheet(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { id } = req.params as { id: string };
      const result = await AttendanceStagingService.deleteSheet(tenantId, id);
      return sendResponse(reply, 200, true, 'Lembar staging berhasil dihapus', result);
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/bulk-delete
   * Hapus massal lembar staging terpilih
   */
  static async bulkDelete(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { ids } = bulkDeleteSchema.parse(req.body);
      const result = await AttendanceStagingService.bulkDeleteSheets(tenantId, ids);
      return sendResponse(reply, 200, true, `${result.deletedCount} lembar staging berhasil dihapus`, result);
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * GET /attendance/staging/class-students/:kelasId
   * Ambil daftar siswa aktif dalam kelas
   */
  static async getClassStudents(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const { kelasId } = req.params as { kelasId: string };
      const students = await AttendanceStagingService.getClassStudents(tenantId, kelasId);
      return sendResponse(reply, 200, true, 'Berhasil mengambil daftar siswa kelas', students);
    } catch (err: any) {
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/existing-matrix
   * Tarik data presensi fisik yang sudah ada di database untuk recheck di Matriks Step 2
   */
  static async getExistingMatrix(req: any, reply: any) {
    try {
      const tenantId = req.tenantId || req.user?.tenant_id || req.user?.tenantId;
      if (!tenantId) {
        return sendError(reply, 401, 'Unauthorized: Tenant ID tidak ditemukan');
      }
      const body = (req.body || {}) as any;
      const result = await AttendanceStagingService.getExistingAttendanceMatrix(tenantId, body);
      return sendResponse(
        reply,
        200,
        true,
        'Berhasil memuat data presensi fisik dari database',
        result
      );
    } catch (err: any) {
      appLogger.error({ err: err.message }, 'Gagal memuat existing attendance matrix');
      return sendError(reply, 400, err.message, err);
    }
  }

  /**
   * POST /attendance/staging/manual-backfill
   * Buat sesi dan presensi dari input Backfill Manual UI (Multi-Tanggal)
   */
  static async createManualBackfill(req: any, reply: any) {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.id || 'SYSTEM_MANUAL';
      const body = req.body;

      await AttendanceStagingService.assertGuardEnabled(tenantId);

      const result = await AttendanceStagingService.createManualBackfill(tenantId, userId, body);
      return sendResponse(
        reply,
        201,
        true,
        `Berhasil membuat ${result.totalSheetsCreated} lembar backfill (${result.totalSessionsPerSheet} sesi pertemuan per rombel). Siswa yang tidak dimasukkan ke daftar pengecualian otomatis dicatat HADIR.`,
        result
      );
    } catch (err: any) {
      appLogger.error({ err: err.message }, 'Gagal memproses backfill manual UI');
      return sendError(reply, err.statusCode || 400, err.message, err);
    }
  }
}
