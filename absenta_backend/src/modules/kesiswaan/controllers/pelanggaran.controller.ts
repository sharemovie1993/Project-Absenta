import { PelanggaranService } from '../services/pelanggaran.service';
import { sendResponse, sendError } from '../../../utils/response';
import { z } from 'zod';
import {
  createPelanggaranSchema,
  updatePelanggaranSchema
} from '../services/kesiswaan-validation.schema';

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
      const parsed = createPelanggaranSchema.parse(req.body);

      const result = await PelanggaranService.create(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Pelanggaran created successfully', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
      return sendError(reply, 500, 'Failed to create pelanggaran', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updatePelanggaranSchema.parse(req.body);

      const result = await PelanggaranService.update(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Pelanggaran updated successfully', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map(e => e.message).join(', '), error);
      }
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

  static async getAnalytics(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await PelanggaranService.getAnalytics(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Analitik kedisiplinan berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil analitik kedisiplinan', error);
    }
  }

  /**
   * GET /kesiswaan/pelanggaran/me
   * Endpoint khusus siswa untuk melihat catatan pelanggaran milik sendiri.
   * Tidak memerlukan capability tambahan — cukup login sebagai siswa.
   */
  static async getMyPelanggaran(req: any, reply: any) {
    try {
      const { tenant_id, siswa_id } = req.user!;
      if (!siswa_id) {
        return sendError(reply, 403, 'Akun ini tidak terhubung ke data siswa.');
      }
      const result = await PelanggaranService.getAll(
        tenant_id,
        { ...req.query, siswa_id },
        { type: 'siswa', siswa_id }
      );
      return sendResponse(reply, 200, true, 'Data pelanggaran saya berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data pelanggaran', error);
    }
  }
}

