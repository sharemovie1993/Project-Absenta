import { sendResponse, sendError } from '../../../utils/response';
import { RaporService } from '../services/rapor.service';
import { raporSiswaUpsertSchema } from '../services/penilaian.schema';
import { z } from 'zod';

export class RaporController {
  static async upsert(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = raporSiswaUpsertSchema.parse(req.body);

      const result = await RaporService.upsertRapor(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Data catatan/kehadiran rapor berhasil disimpan', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal menyimpan data rapor', error);
    }
  }

  static async getDetail(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { siswa_id, tahun_pelajaran_id, semester_id } = req.query;

      if (!siswa_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'siswa_id, tahun_pelajaran_id, dan semester_id harus diisi',
        });
      }

      const result = await RaporService.getRaporDetail(tenant_id, {
        siswa_id,
        tahun_pelajaran_id,
        semester_id,
      });

      return sendResponse(reply, 200, true, 'Detail nilai rapor berhasil dimuat', result);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal memuat detail nilai rapor', error);
    }
  }

  static async getLeger(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kelas_id, tahun_pelajaran_id, semester_id } = req.query;

      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'kelas_id, tahun_pelajaran_id, dan semester_id harus diisi',
        });
      }

      const result = await RaporService.getLegerData(tenant_id, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      });

      return sendResponse(reply, 200, true, 'Data leger nilai berhasil dimuat', result);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal memuat leger nilai', error);
    }
  }

  static async exportLeger(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kelas_id, tahun_pelajaran_id, semester_id } = req.query;

      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'kelas_id, tahun_pelajaran_id, dan semester_id harus diisi',
        });
      }

      const { filename, buffer } = await RaporService.exportLegerExcel(tenant_id, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(buffer);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal mengekspor leger nilai ke Excel', error);
    }
  }
}
