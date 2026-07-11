import { sendResponse, sendError } from '../../../utils/response';
import { TemplateSuratService } from '../services/template-surat.service';

export class TemplateSuratController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await TemplateSuratService.getAll(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Daftar template surat berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil daftar template', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await TemplateSuratService.getById(tenant_id, id);
      if (!result) return sendError(reply, 404, 'Template tidak ditemukan');
      return sendResponse(reply, 200, true, 'Detail template berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail template', error);
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const result = await TemplateSuratService.create(tenant_id, userId, req.body);
      return sendResponse(reply, 201, true, 'Template surat berhasil dibuat', result);
    } catch (error: any) {
      if (error?.name === 'ZodError') return sendError(reply, 400, 'Validasi gagal', error.errors);
      return sendError(reply, 500, 'Gagal membuat template', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await TemplateSuratService.update(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Template surat berhasil diperbarui', result);
    } catch (error: any) {
      if (error?.message === 'Template tidak ditemukan') return sendError(reply, 404, error.message);
      if (error?.name === 'ZodError') return sendError(reply, 400, 'Validasi gagal', error.errors);
      return sendError(reply, 500, 'Gagal memperbarui template', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await TemplateSuratService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Template surat berhasil dihapus');
    } catch (error: any) {
      if (error?.message === 'Template tidak ditemukan') return sendError(reply, 404, error.message);
      return sendError(reply, 500, 'Gagal menghapus template', error);
    }
  }

  /**
   * POST /template-surat/render
   * Body: { template_id, variabel: { nama_siswa: "...", kelas: "..." } }
   * Mengembalikan HTML/teks hasil render template dengan variabel yang sudah diganti.
   */
  static async render(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { template_id, variabel } = req.body;
      if (!template_id || typeof variabel !== 'object') {
        return sendError(reply, 400, 'template_id dan variabel diperlukan');
      }
      const rendered = await TemplateSuratService.render(tenant_id, template_id, variabel);
      return sendResponse(reply, 200, true, 'Template berhasil dirender', { html: rendered });
    } catch (error: any) {
      if (error?.message?.includes('tidak ditemukan')) return sendError(reply, 404, error.message);
      return sendError(reply, 500, 'Gagal merender template', error);
    }
  }

  /**
   * GET /template-surat/system-variables
   * Mengembalikan daftar variabel sistem yang didukung untuk UI builder.
   */
  static async getSystemVariables(_req: any, reply: any) {
    return sendResponse(reply, 200, true, 'Variabel sistem', TemplateSuratService.getSystemVariables());
  }
}
