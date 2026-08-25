import { sendResponse, sendError } from '../../../utils/response';
import { z } from 'zod';
import {
  countJenisPelanggaran,
  createJenisPelanggaran,
  deleteJenisPelanggaran,
  getAllJenisPelanggaran,
  seedDefaultJenisPelanggaranForTenant,
  updateJenisPelanggaran
} from '../services/jenis-pelanggaran.service';
import {
  createJenisPelanggaranSchema,
  updateJenisPelanggaranSchema
} from '../services/kesiswaan-validation.schema';

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
      const parsed = createJenisPelanggaranSchema.parse(req.body);

      const result = await createJenisPelanggaran(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Jenis pelanggaran created successfully', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e: any) => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Failed to create jenis pelanggaran', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updateJenisPelanggaranSchema.parse(req.body);

      const result = await updateJenisPelanggaran(tenant_id, id, parsed);

      if (result.count === 0) {
        return sendError(reply, 404, 'Jenis pelanggaran not found');
      }

      return sendResponse(reply, 200, true, 'Jenis pelanggaran updated successfully');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e: any) => e.message).join(', '), error);
      }
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
