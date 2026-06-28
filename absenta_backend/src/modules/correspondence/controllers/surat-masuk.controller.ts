import { sendResponse, sendError } from '../../../utils/response';
import { SuratMasukService } from '../services/surat-masuk.service';

export class SuratMasukController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await SuratMasukService.getAll(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Surat masuk berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data surat masuk', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratMasukService.getById(tenant_id, id);
      if (!result) return sendError(reply, 404, 'Surat masuk tidak ditemukan');
      return sendResponse(reply, 200, true, 'Detail surat masuk berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail surat masuk', error);
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await SuratMasukService.create(tenant_id, req.body);
      return sendResponse(reply, 201, true, 'Surat masuk berhasil direkam', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal merekam surat masuk', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratMasukService.update(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Surat masuk berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui surat masuk', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await SuratMasukService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Surat masuk berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus surat masuk', error);
    }
  }

  static async disposisi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratMasukService.disposisi(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Instruksi disposisi berhasil disimpan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal menyimpan instruksi disposisi', error);
    }
  }
}