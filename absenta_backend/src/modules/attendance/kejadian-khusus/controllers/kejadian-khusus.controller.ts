import { kejadianKhususService } from '../services/kejadian-khusus.service';
import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';

export const createKejadianKhususSchema = z.object({
  nama_kejadian: z.string().optional(),
  keterangan: z.string().min(1, 'keterangan wajib diisi'),
  tanggal: z.string().min(1, 'tanggal wajib diisi'),
  abaikan_terlambat: z.boolean().optional().default(false),
  mode_kejadian: z.enum(['NORMAL', 'LIBUR', 'DISPEN']).optional().default('NORMAL'),
  kelas_id: z.string().optional(),
});

export const kejadianKhususController = {
  async getAll(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const data = await kejadianKhususService.getAll(scope);
      return reply.status(200).send({ success: true, message: 'Daftar kejadian khusus', data });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error getting kejadian khusus');
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async create(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const parsedBody = createKejadianKhususSchema.parse(request.body || {});
      const data = await kejadianKhususService.create(scope, {
        tanggal: parsedBody.tanggal,
        keterangan: parsedBody.keterangan,
        abaikan_terlambat: parsedBody.abaikan_terlambat,
        mode_kejadian: parsedBody.mode_kejadian,
        kelas_id: parsedBody.kelas_id
      });
      appLogger.info({ id: data.id }, 'Kejadian khusus created');
      return reply.status(201).send({ success: true, message: 'Kejadian khusus berhasil dibuat', data });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error creating kejadian khusus');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async delete(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      await kejadianKhususService.delete(scope, id);
      return reply.status(200).send({ success: true, message: 'Kejadian khusus berhasil dihapus' });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error deleting kejadian khusus');
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
};
