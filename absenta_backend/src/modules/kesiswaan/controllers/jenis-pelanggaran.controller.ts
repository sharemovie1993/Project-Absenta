import { sendResponse, sendError } from '../../../utils/response';
import {
  countJenisPelanggaran,
  createJenisPelanggaran,
  deleteJenisPelanggaran,
  getAllJenisPelanggaran,
  seedDefaultJenisPelanggaranForTenant,
  updateJenisPelanggaran
} from '../services/jenis-pelanggaran.service';

export class JenisPelanggaranController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await getAllJenisPelanggaran(tenant_id);
      return sendResponse(reply, 200, true, 'Data jenis pelanggaran retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve jenis pelanggaran data', error);
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kategori, nama_pelanggaran, poin } = req.body;

      const result = await createJenisPelanggaran(tenant_id, { kategori, nama_pelanggaran, poin });
      return sendResponse(reply, 201, true, 'Jenis pelanggaran created successfully', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to create jenis pelanggaran', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const { kategori, nama_pelanggaran, poin } = req.body;

      const result = await updateJenisPelanggaran(tenant_id, id, { kategori, nama_pelanggaran, poin });

      if (result.count === 0) {
        return sendError(reply, 404, 'Jenis pelanggaran not found');
      }

      return sendResponse(reply, 200, true, 'Jenis pelanggaran updated successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to update jenis pelanggaran', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const result = await deleteJenisPelanggaran(tenant_id, id);

      if (result.count === 0) {
        return sendError(reply, 404, 'Jenis pelanggaran not found');
      }

      return sendResponse(reply, 200, true, 'Jenis pelanggaran deleted successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to delete jenis pelanggaran', error);
    }
  }

  static async seedDefaults(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      
      const count = await countJenisPelanggaran(tenant_id);

      if (count > 0) {
        return sendResponse(reply, 400, false, 'Data jenis pelanggaran is not empty');
      }

      await seedDefaultJenisPelanggaranForTenant(tenant_id);

      return sendResponse(reply, 201, true, 'Default data seeded successfully');
    } catch (error) {
      return sendError(reply, 500, 'Failed to seed default data', error);
    }
  }
}
