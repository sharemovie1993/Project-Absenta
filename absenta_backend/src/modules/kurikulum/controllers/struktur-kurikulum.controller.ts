import { sendResponse, sendError } from '../../../utils/response';
import { StrukturKurikulumService } from '../services/struktur-kurikulum.service';

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
      const data = req.body;
      
      const result = await StrukturKurikulumService.upsert(tenant_id, data);
      return sendResponse(reply, 201, true, 'Data saved successfully', result);
    } catch (error) {
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
}
