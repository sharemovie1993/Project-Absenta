import { anggotaKegiatanEskulService } from './anggota-kegiatan-eskul.service';
import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';

export const addAnggotaSchema = z.object({
  siswa_akademik_ids: z.array(z.string()).min(1, 'siswa_akademik_ids harus berupa array yang tidak kosong.')
});

export const anggotaKegiatanEskulController = {
  async getSiswaAkademikList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { search, kelas_id } = request.query as { search?: string; kelas_id?: string };
      const data = await anggotaKegiatanEskulService.getSiswaAkademikList(tenantId, search, kelas_id);
      return reply.status(200).send({ success: true, message: 'Daftar siswa berhasil dimuat', data });
    } catch (err: any) {
      appLogger.error({ err }, 'getSiswaAkademikList error');
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getMembers(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const data = await anggotaKegiatanEskulService.getMembers(tenantId, jenisKegiatanId);
      return reply.status(200).send({ success: true, message: 'Daftar anggota eskul berhasil dimuat', data });
    } catch (err: any) {
      appLogger.error({ err }, 'getMembers error');
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async addMembers(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const parsedBody = addAnggotaSchema.parse(request.body || {});
      const { siswa_akademik_ids } = parsedBody;

      const result = await anggotaKegiatanEskulService.addMembers(tenantId, jenisKegiatanId, siswa_akademik_ids);
      appLogger.info({ count: result.added, tenantId }, 'Anggota eskul added');
      return reply.status(200).send({ success: true, message: `${result.added} anggota berhasil ditambahkan.`, data: result });
    } catch (err: any) {
      appLogger.error({ err }, 'addMembers error');
      return reply.status(400).send({ success: false, message: err.message });
    }
  },

  async removeMember(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { anggotaId } = request.params as { anggotaId: string };
      await anggotaKegiatanEskulService.removeMember(tenantId, anggotaId);
      return reply.status(200).send({ success: true, message: 'Anggota berhasil dihapus dari eskul.' });
    } catch (err: any) {
      appLogger.error({ err }, 'removeMember error');
      return reply.status(404).send({ success: false, message: err.message });
    }
  }
};
