import { CbtJadwalService } from '../services/cbt-jadwal.service';
import { sendResponse, sendError } from '../../../utils/response';
import {
  createJadwalUjianSchema,
  updateJadwalUjianSchema,
  queryJadwalUjianSchema,
  transferNilaiRaporSchema,
  bulkPlottingJadwalSchema,
  bulkCreateJadwalSchema,
} from '../schemas/cbt.schema';
import { z } from 'zod';

export class CbtJadwalController {
  static async list(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const query = queryJadwalUjianSchema.parse(req.query);
      const result = await CbtJadwalService.list(tenant_id, query);
      return sendResponse(reply, 200, true, 'Daftar jadwal ujian berhasil diambil', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 500, 'Gagal mengambil jadwal ujian', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtJadwalService.getById(tenant_id, id);
      return sendResponse(reply, 200, true, 'Detail jadwal ujian berhasil diambil', result);
    } catch (error: any) {
      return sendError(reply, 404, error.message || 'Jadwal ujian tidak ditemukan');
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id, roleName, role } = req.user!;
      const userRole = roleName || (typeof role === 'string' ? role : role?.name);
      const parsed = createJadwalUjianSchema.parse(req.body);
      const result = await CbtJadwalService.create(tenant_id, parsed, userRole);
      return sendResponse(reply, 201, true, 'Jadwal ujian berhasil dibuat', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal membuat jadwal ujian');
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updateJadwalUjianSchema.parse(req.body);
      const result = await CbtJadwalService.update(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Jadwal ujian berhasil diperbarui', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal memperbarui jadwal ujian');
    }
  }

  static async regenerateToken(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtJadwalService.regenerateToken(tenant_id, id);
      return sendResponse(reply, 200, true, 'Token ujian baru berhasil digenerate', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal memperbarui token ujian');
    }
  }

  static async activate(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtJadwalService.activateJadwal(tenant_id, id);
      return sendResponse(reply, 200, true, 'Sesi ujian berhasil diaktifkan & bundle soal ter-cache', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal mengaktifkan jadwal ujian');
    }
  }

  static async pause(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtJadwalService.pauseJadwal(tenant_id, id);
      return sendResponse(reply, 200, true, 'Sesi ujian berhasil dijeda', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menjeda jadwal ujian');
    }
  }

  static async complete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtJadwalService.completeJadwal(tenant_id, id);
      return sendResponse(reply, 200, true, 'Sesi ujian berhasil diselesaikan', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menyelesaikan jadwal ujian');
    }
  }

  static async getPesertaList(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params; // jadwal_id
      const result = await CbtJadwalService.getPesertaList(tenant_id, id, req.query);
      return sendResponse(reply, 200, true, 'Daftar peserta ujian berhasil diambil', result);
    } catch (error: any) {
      return sendError(reply, 500, 'Gagal mengambil peserta ujian', error);
    }
  }

  static async resetPeserta(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id, siswaId } = req.params;
      const mode = req.body?.mode; // 'reconnect' | 'retake'
      const result = await CbtJadwalService.resetPeserta(tenant_id, id, siswaId, mode);
      const msg = mode === 'retake'
        ? 'Ujian siswa berhasil di-reset total dari nol untuk remedial/retake'
        : 'Sesi peserta berhasil di-reset untuk login ulang';
      return sendResponse(reply, 200, true, msg, result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal me-reset peserta ujian');
    }
  }

  static async grantDispensasiTerlambat(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id, siswaId } = req.params;
      const result = await CbtJadwalService.grantDispensasiTerlambat(tenant_id, id, siswaId);
      return sendResponse(reply, 200, true, 'Dispensasi keterlambatan berhasil diberikan', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal memberikan dispensasi keterlambatan');
    }
  }

  static async transferToRapor(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = transferNilaiRaporSchema.parse(req.body);
      const result = await CbtJadwalService.transferToRapor(tenant_id, id, parsed);
      return sendResponse(
        reply,
        200,
        true,
        `Berhasil mentransfer ${result.transferred_count} nilai siswa ke e-Rapor`,
        result
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues || error.errors || [];
        return sendError(reply, 400, issues.map((e: any) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal mentransfer nilai ke e-Rapor');
    }
  }

  static async bulkUpdatePlotting(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = bulkPlottingJadwalSchema.parse(req.body);
      const result = await CbtJadwalService.bulkUpdatePlotting(tenant_id, parsed.items);
      return sendResponse(
        reply,
        200,
        true,
        `Berhasil menyimpan ploting pengawas & ruang untuk ${result.updated_count} jadwal ujian`,
        result
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues || error.errors || [];
        return sendError(reply, 400, issues.map((e: any) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal menyimpan ploting massal pengawas');
    }
  }

  static async bulkCreate(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = bulkCreateJadwalSchema.parse(req.body);
      const result = await CbtJadwalService.bulkCreate(tenant_id, parsed.items);
      return sendResponse(
        reply,
        201,
        true,
        `Berhasil merangkai & membuat ${result.created_count} jadwal ujian serentak`,
        result
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues || error.errors || [];
        return sendError(reply, 400, issues.map((e: any) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal membuat jadwal ujian massal');
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtJadwalService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Jadwal ujian berhasil dihapus', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menghapus jadwal ujian');
    }
  }
}
