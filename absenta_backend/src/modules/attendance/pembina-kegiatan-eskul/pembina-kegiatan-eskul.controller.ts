import { pembinaKegiatanEskulService } from './pembina-kegiatan-eskul.service';

export const pembinaKegiatanEskulController = {

  /**
   * GET /attendance/pembina-kegiatan-eskul/guru-picker?search=
   * Ambil daftar guru aktif untuk picker tambah pembina
   */
  async getGuruList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { search } = request.query as { search?: string };
      const data = await pembinaKegiatanEskulService.getGuruList(tenantId, search);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  /**
   * GET /attendance/pembina-kegiatan-eskul/:jenisKegiatanId
   * Ambil daftar pembina eskul
   */
  async getPembinas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const data = await pembinaKegiatanEskulService.getPembinas(tenantId, jenisKegiatanId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  /**
   * POST /attendance/pembina-kegiatan-eskul/:jenisKegiatanId/add
   * Tambah pembina eskul (bulk)
   */
  async addPembinas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const { guru_ids } = request.body as { guru_ids: string[] };

      if (!Array.isArray(guru_ids) || guru_ids.length === 0) {
        return reply.status(400).send({ success: false, message: 'guru_ids harus berupa array yang tidak kosong.' });
      }

      const result = await pembinaKegiatanEskulService.addPembinas(tenantId, jenisKegiatanId, guru_ids);
      return reply.send({ success: true, message: `${result.added} pembina berhasil ditambahkan.`, data: result });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /attendance/pembina-kegiatan-eskul/member/:pembinaId
   * Hapus pembina dari eskul
   */
  async removePembina(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { pembinaId } = request.params as { pembinaId: string };
      await pembinaKegiatanEskulService.removePembina(tenantId, pembinaId);
      return reply.send({ success: true, message: 'Pembina berhasil dihapus dari eskul.' });
    } catch (err: any) {
      return reply.status(404).send({ success: false, message: err.message });
    }
  }
};
