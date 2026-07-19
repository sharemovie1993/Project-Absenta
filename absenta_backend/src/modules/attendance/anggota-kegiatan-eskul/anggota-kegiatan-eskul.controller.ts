import { anggotaKegiatanEskulService } from './anggota-kegiatan-eskul.service';

export const anggotaKegiatanEskulController = {

  /**
   * GET /attendance/anggota-kegiatan-eskul/siswa-picker?search=&kelas_id=
   * Ambil daftar siswa akademik aktif untuk picker tambah anggota
   */
  async getSiswaAkademikList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { search, kelas_id } = request.query as { search?: string; kelas_id?: string };
      const data = await anggotaKegiatanEskulService.getSiswaAkademikList(tenantId, search, kelas_id);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  /**
   * GET /attendance/anggota-kegiatan-eskul/:jenisKegiatanId
   * Ambil daftar anggota eskul
   */
  async getMembers(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const data = await anggotaKegiatanEskulService.getMembers(tenantId, jenisKegiatanId);
      return reply.send({ success: true, data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  /**
   * POST /attendance/anggota-kegiatan-eskul/:jenisKegiatanId/add
   * Tambah anggota eskul (bulk)
   */
  async addMembers(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const { siswa_akademik_ids } = request.body as { siswa_akademik_ids: string[] };

      if (!Array.isArray(siswa_akademik_ids) || siswa_akademik_ids.length === 0) {
        return reply.status(400).send({ success: false, message: 'siswa_akademik_ids harus berupa array yang tidak kosong.' });
      }

      const result = await anggotaKegiatanEskulService.addMembers(tenantId, jenisKegiatanId, siswa_akademik_ids);
      return reply.send({ success: true, message: `${result.added} anggota berhasil ditambahkan.`, data: result });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  /**
   * DELETE /attendance/anggota-kegiatan-eskul/member/:anggotaId
   * Hapus anggota dari eskul
   */
  async removeMember(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { anggotaId } = request.params as { anggotaId: string };
      await anggotaKegiatanEskulService.removeMember(tenantId, anggotaId);
      return reply.send({ success: true, message: 'Anggota berhasil dihapus dari eskul.' });
    } catch (err: any) {
      return reply.status(404).send({ success: false, message: err.message });
    }
  }
};
