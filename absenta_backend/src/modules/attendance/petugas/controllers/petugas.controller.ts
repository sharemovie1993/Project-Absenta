import { petugasService } from '../services/petugas.service';
import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';

export const assignPetugasSchema = z.object({
  siswa_id: z.string().min(1, 'siswa_id wajib diisi'),
  kelas_id: z.string().min(1, 'kelas_id wajib diisi'),
});

export const petugasController = {
  async getAll(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { page, limit, search } = request.query as any;
      const result = await petugasService.getAll(scope, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || ''
      });
      return reply.status(200).send({ success: true, message: 'Daftar petugas absensi', ...result });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error fetching petugas');
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async assign(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const parsedBody = assignPetugasSchema.parse(request.body || {});
      const data = await petugasService.assign(parsedBody, scope);
      appLogger.info({ siswa_id: parsedBody.siswa_id, kelas_id: parsedBody.kelas_id }, 'Petugas assigned');
      return reply.status(201).send({ success: true, message: 'Petugas berhasil ditugaskan', data });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error assigning petugas');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async unassign(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      await petugasService.unassign(id, scope);
      return reply.status(200).send({ success: true, message: 'Penugasan petugas berhasil dihapus' });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error unassigning petugas');
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
};
