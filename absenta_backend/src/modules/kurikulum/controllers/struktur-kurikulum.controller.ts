import { sendResponse, sendError } from '../../../utils/response';
import { StrukturKurikulumService } from '../services/struktur-kurikulum.service';
import { strukturKurikulumUpsertSchema } from '../services/kurikulum.schema';
import { z } from 'zod';

export class StrukturKurikulumController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { tahun_pelajaran_id, tingkat, jurusan_id } = req.query;
      
      const result = await StrukturKurikulumService.getAll(tenant_id, { 
          tahun_pelajaran_id, 
          tingkat: tingkat ? Number(tingkat) : undefined, 
          jurusan_id 
      });
      
      return sendResponse(reply, 200, true, 'Data struktur kurikulum retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve data', error);
    }
  }

  static async upsert(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = strukturKurikulumUpsertSchema.parse(req.body);
      
      const result = await StrukturKurikulumService.upsert(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Data saved successfully', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return sendError(reply, 500, 'Failed to save data', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      
      await StrukturKurikulumService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Data deleted successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to delete data', error);
    }
  }

  static async getByTingkatGrouped(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { tahun_pelajaran_id } = req.query;

      if (!tahun_pelajaran_id) {
        return reply.status(400).send({
          success: false,
          message: 'tahun_pelajaran_id query parameter is required'
        });
      }

      const result = await StrukturKurikulumService.getByTingkatGrouped(tenant_id, tahun_pelajaran_id);
      return sendResponse(reply, 200, true, 'Data struktur kurikulum grouped retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve grouped data', error);
    }
  }
}
