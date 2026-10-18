import { appLogger } from '@/utils/app-logger';
import { sendResponse, sendError } from '../../../utils/response';
import { EskulService } from '../services/eskul.service';
import { saveNilaiEskulSchema } from '../services/eskul.schema';
import { z } from 'zod';

export class EskulController {
  /**
   * GET /api/rapor/eskul/options
   */
  static async getOptions(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await EskulService.getEskulOptions(tenant_id, req.user);
      return sendResponse(reply, 200, true, 'Opsi ekstrakurikuler berhasil diambil', result);
    } catch (error) {
      appLogger.error({ err: error }, 'EskulController.getOptions error');
      return sendError(reply, 500, 'Gagal mengambil opsi ekstrakurikuler', error);
    }
  }

  /**
   * GET /api/rapor/eskul/matrix
   */
  static async getMatrix(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jenis_kegiatan_id, tahun_pelajaran_id, semester_id, kelas_id } = req.query;

      if (!jenis_kegiatan_id || !tahun_pelajaran_id || !semester_id) {
        return sendError(reply, 400, 'Parameter jenis_kegiatan_id, tahun_pelajaran_id, dan semester_id wajib diisi');
      }

      const result = await EskulService.getMembersAndGrades(tenant_id, {
        jenis_kegiatan_id,
        tahun_pelajaran_id,
        semester_id,
        kelas_id: kelas_id || undefined,
      });

      return sendResponse(reply, 200, true, 'Matriks nilai ekstrakurikuler berhasil diambil', result);
    } catch (error) {
      appLogger.error({ err: error }, 'EskulController.getMatrix error');
      return sendError(reply, 500, 'Gagal mengambil matriks nilai ekstrakurikuler', error);
    }
  }

  /**
   * POST /api/rapor/eskul/matrix
   */
  static async saveMatrix(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = saveNilaiEskulSchema.parse(req.body);

      const result = await EskulService.saveMatrix(tenant_id, parsed);
      return sendResponse(reply, 200, true, `Berhasil menyimpan ${result.saved_count} nilai ${result.jenis_kegiatan_nama}`, result);
    } catch (error) {
      appLogger.error({ err: error }, 'EskulController.saveMatrix error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal menyimpan matriks nilai ekstrakurikuler', error);
    }
  }

  /**
   * GET /api/rapor/eskul/wali-overview
   */
  static async getWaliOverview(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kelas_id, tahun_pelajaran_id, semester_id } = req.query;

      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return sendError(reply, 400, 'Parameter kelas_id, tahun_pelajaran_id, dan semester_id wajib diisi');
      }

      const result = await EskulService.getWaliKelasOverview(tenant_id, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      });

      return sendResponse(reply, 200, true, 'Ringkasan nilai eskul rombel berhasil diambil', result);
    } catch (error) {
      appLogger.error({ err: error }, 'EskulController.getWaliOverview error');
      return sendError(reply, 500, 'Gagal mengambil ringkasan nilai eskul rombel', error);
    }
  }
}
