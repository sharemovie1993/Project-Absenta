import { sendResponse, sendError } from '../../../utils/response';
import { KkmService } from '../services/kkm.service';
import { kkmpUpsertSchema } from '../../rapor/services/penilaian.schema';
import { z } from 'zod';

export class KkmController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { mapel_id, tingkat } = req.query;

      const result = await KkmService.getAll(tenant_id, {
        mapel_id,
        tingkat: tingkat ? Number(tingkat) : undefined,
      });

      return sendResponse(reply, 200, true, 'Data KKM retrieved successfully', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve KKM data', error);
    }
  }

  static async upsert(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = kkmpUpsertSchema.parse(req.body);

      const result = await KkmService.upsert(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'KKM saved successfully', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Failed to save KKM', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const result = await KkmService.delete(tenant_id, id);
      if (result.count === 0) {
        return reply.status(404).send({
          success: false,
          message: 'Data KKM tidak ditemukan atau bukan milik tenant Anda',
        });
      }

      return sendResponse(reply, 200, true, 'KKM deleted successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to delete KKM', error);
    }
  }
}
