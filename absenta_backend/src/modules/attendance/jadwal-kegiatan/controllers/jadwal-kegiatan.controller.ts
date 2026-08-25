import { jadwalKegiatanService } from '../services/jadwal-kegiatan.service';
import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';

export const createJadwalKegiatanSchema = z.object({
  nama: z.string().min(1, 'nama wajib diisi'),
  jenis_kegiatan: z.string().min(1, 'jenis_kegiatan wajib diisi'),
  hari: z.array(z.any()).min(1, 'hari minimal 1'),
  waktu_mulai: z.string().min(1, 'waktu_mulai wajib diisi'),
  waktu_selesai: z.string().optional().nullable(),
  target_semua_kelas: z.boolean().optional().default(true),
  target_kelas_ids: z.array(z.string()).optional(),
  berlaku_mulai: z.string().min(1, 'berlaku_mulai wajib diisi'),
  berlaku_sampai: z.string().optional().nullable(),
  tahun_pelajaran_id: z.string().optional(),
});

export const updateJadwalKegiatanSchema = createJadwalKegiatanSchema.partial();

export const jadwalKegiatanController = {
  async getAll(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { activeOnly } = request.query || {};
      const data = await jadwalKegiatanService.getAll(scope, activeOnly === 'true');
      return reply.status(200).send({ success: true, message: 'Daftar jadwal kegiatan berhasil dimuat', data });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error fetching jadwal kegiatan');
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getDetail(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      const data = await jadwalKegiatanService.getById(scope, id);
      if (!data) return reply.status(404).send({ success: false, message: 'Jadwal kegiatan tidak ditemukan' });
      return reply.status(200).send({ success: true, message: 'Detail jadwal kegiatan ditemukan', data });
    } catch (error: any) {
      return reply.status(404).send({ success: false, message: error.message });
    }
  },

  async create(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const userId = request.user?.id;
      const parsedBody = createJadwalKegiatanSchema.parse(request.body || {});
      const data = await jadwalKegiatanService.create(scope, parsedBody as any, userId);
      appLogger.info({ id: data.id }, 'Jadwal kegiatan created');
      return reply.status(201).send({ success: true, message: 'Jadwal kegiatan berhasil dibuat', data });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error creating jadwal kegiatan');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async update(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      const parsedBody = updateJadwalKegiatanSchema.parse(request.body || {});
      const data = await jadwalKegiatanService.update(scope, id, parsedBody as any);
      return reply.status(200).send({ success: true, message: 'Jadwal kegiatan berhasil diperbarui', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async delete(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      await jadwalKegiatanService.delete(scope, id);
      return reply.status(200).send({ success: true, message: 'Jadwal kegiatan berhasil dihapus' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
};
