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

  static async getStandardReferences(req: any, reply: any) {
    try {
      const { jenjang } = req.query;
      const result = await StrukturKurikulumService.getStandardReferences(jenjang ? String(jenjang) : undefined);
      return sendResponse(reply, 200, true, 'Global kurikulum standards retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve global kurikulum standards', error);
    }
  }

  static async createStandardReference(req: any, reply: any) {
    try {
      const { jenjang, category, nama_mapel, kode_mapel, tingkat, jp_per_minggu } = req.body;
      if (!jenjang || !nama_mapel || !kode_mapel || tingkat === undefined || jp_per_minggu === undefined) {
        return reply.status(400).send({
          success: false,
          message: 'jenjang, nama_mapel, kode_mapel, tingkat, and jp_per_minggu are required fields'
        });
      }

      const result = await StrukturKurikulumService.createStandardReference({
        jenjang,
        category,
        nama_mapel,
        kode_mapel,
        tingkat: Number(tingkat),
        jp_per_minggu: Number(jp_per_minggu)
      });
      return sendResponse(reply, 201, true, 'Global kurikulum standard created', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to create global kurikulum standard', error);
    }
  }

  static async updateStandardReference(req: any, reply: any) {
    try {
      const { id } = req.params;
      const { jenjang, category, nama_mapel, kode_mapel, tingkat, jp_per_minggu } = req.body;

      const result = await StrukturKurikulumService.updateStandardReference(id, {
        ...(jenjang ? { jenjang } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(nama_mapel ? { nama_mapel } : {}),
        ...(kode_mapel ? { kode_mapel } : {}),
        ...(tingkat !== undefined ? { tingkat: Number(tingkat) } : {}),
        ...(jp_per_minggu !== undefined ? { jp_per_minggu: Number(jp_per_minggu) } : {}),
      });
      return sendResponse(reply, 200, true, 'Global kurikulum standard updated', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to update global kurikulum standard', error);
    }
  }

  static async deleteStandardReference(req: any, reply: any) {
    try {
      const { id } = req.params;
      await StrukturKurikulumService.deleteStandardReference(id);
      return sendResponse(reply, 200, true, 'Global kurikulum standard deleted');
    } catch (error) {
      return sendError(reply, 500, 'Failed to delete global kurikulum standard', error);
    }
  }
}
