import { sendResponse, sendError } from '../../../utils/response';
import { PerangkatAjarService } from '../services/perangkat-ajar.service';
import { perangkatAjarUploadSchema, perangkatAjarReviewSchema } from '../services/perangkat-ajar.schema';
import { z } from 'zod';

export class PerangkatAjarController {
  static async upload(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = perangkatAjarUploadSchema.parse(req.body);

      const result = await PerangkatAjarService.uploadPerangkat(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Perangkat ajar berhasil diunggah dan siap diverifikasi', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal mengunggah perangkat ajar', error);
    }
  }

  static async review(req: any, reply: any) {
    try {
      const { tenant_id, id: reviewerId } = req.user!;
      const { id } = req.params;
      const parsed = perangkatAjarReviewSchema.parse(req.body);

      const result = await PerangkatAjarService.reviewPerangkat(tenant_id, id, reviewerId, parsed);
      return sendResponse(reply, 200, true, 'Verifikasi perangkat ajar berhasil disimpan', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, error.message.includes('not found') ? 404 : 500, error.message || 'Gagal melakukan verifikasi', error);
    }
  }

  static async getList(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { guru_id, mapel_id, tahun_pelajaran_id, semester_id, status, jenis } = req.query;

      const result = await PerangkatAjarService.getPerangkat(tenant_id, {
        guru_id,
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        status,
        jenis,
      });

      return sendResponse(reply, 200, true, 'Daftar perangkat ajar berhasil dimuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat daftar perangkat ajar', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      await PerangkatAjarService.deletePerangkat(tenant_id, id);
      return sendResponse(reply, 200, true, 'Perangkat ajar berhasil dihapus');
    } catch (error: any) {
      return sendError(reply, error.message.includes('not found') ? 404 : 500, error.message || 'Gagal menghapus perangkat ajar', error);
    }
  }
}
