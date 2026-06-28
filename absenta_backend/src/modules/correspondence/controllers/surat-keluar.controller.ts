import { sendResponse, sendError } from '../../../utils/response';
import { SuratKeluarService } from '../services/surat-keluar.service';

export class SuratKeluarController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await SuratKeluarService.getAll(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data surat keluar', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratKeluarService.getById(tenant_id, id);
      if (!result) return sendError(reply, 404, 'Surat keluar tidak ditemukan');
      return sendResponse(reply, 200, true, 'Detail surat keluar berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail surat keluar', error);
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const result = await SuratKeluarService.create(tenant_id, userId, req.body);
      return sendResponse(reply, 201, true, 'Surat keluar berhasil dibuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal membuat surat keluar', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratKeluarService.update(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui surat keluar', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await SuratKeluarService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus surat keluar', error);
    }
  }

  static async sign(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const { status } = req.body; // DIKIRIM or DITOLAK
      const result = await SuratKeluarService.sign(tenant_id, id, userId, status);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil diproses persetujuan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memproses persetujuan surat', error);
    }
  }
}