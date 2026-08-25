import { pembinaKegiatanEskulService } from './pembina-kegiatan-eskul.service';
import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';

export const addPembinaSchema = z.object({
  guru_ids: z.array(z.string()).min(1, 'guru_ids harus berupa array yang tidak kosong.')
});

export const pembinaKegiatanEskulController = {
  async getGuruList(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { search } = request.query as { search?: string };
      const data = await pembinaKegiatanEskulService.getGuruList(tenantId, search);
      return reply.status(200).send({ success: true, message: 'Daftar guru berhasil dimuat', data });
    } catch (err: any) {
      appLogger.error({ err }, 'getGuruList error');
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getPembinas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const data = await pembinaKegiatanEskulService.getPembinas(tenantId, jenisKegiatanId);
      return reply.status(200).send({ success: true, message: 'Daftar pembina berhasil dimuat', data });
    } catch (err: any) {
      appLogger.error({ err }, 'getPembinas error');
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async addPembinas(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { jenisKegiatanId } = request.params as { jenisKegiatanId: string };
      const parsedBody = addPembinaSchema.parse(request.body || {});
      const { guru_ids } = parsedBody;

      const result = await pembinaKegiatanEskulService.addPembinas(tenantId, jenisKegiatanId, guru_ids);
      appLogger.info({ count: result.added, tenantId }, 'Pembina added');
      return reply.status(200).send({ success: true, message: `${result.added} pembina berhasil ditambahkan.`, data: result });
    } catch (err: any) {
      appLogger.error({ err }, 'addPembinas error');
      return reply.status(400).send({ success: false, message: err.message });
    }
  },

  async removePembina(request: any, reply: any) {
    try {
      const tenantId = request.tenantId as string;
      const { pembinaId } = request.params as { pembinaId: string };
      await pembinaKegiatanEskulService.removePembina(tenantId, pembinaId);
      return reply.status(200).send({ success: true, message: 'Pembina berhasil dihapus dari kegiatan.' });
    } catch (err: any) {
      appLogger.error({ err }, 'removePembina error');
      return reply.status(404).send({ success: false, message: err.message });
    }
  }
};
