import { PelanggaranService } from '../services/pelanggaran.service';
import { sendResponse, sendError } from '../../../utils/response';

export class PelanggaranController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const scope = req.dataScope;
      const result = await PelanggaranService.getAll(tenant_id, req.query, scope);
      return sendResponse(reply, 200, true, 'Data pelanggaran retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve pelanggaran data', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await PelanggaranService.getById(tenant_id, id);
      
      if (!result) {
        return sendError(reply, 404, 'Pelanggaran not found');
      }

      return sendResponse(reply, 200, true, 'Pelanggaran detail retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve pelanggaran detail', error);
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const data = req.body;
      
      // Ensure date is parsed correctly
      if (data.tanggal) {
        data.tanggal = new Date(data.tanggal);
      }

      const result = await PelanggaranService.create(tenant_id, data);
      return sendResponse(reply, 201, true, 'Pelanggaran created successfully', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to create pelanggaran', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;

      if (data.tanggal) {
        data.tanggal = new Date(data.tanggal);
      }

      const result = await PelanggaranService.update(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Pelanggaran updated successfully', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to update pelanggaran', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      
      await PelanggaranService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Pelanggaran deleted successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to delete pelanggaran', error);
    }
  }
}
