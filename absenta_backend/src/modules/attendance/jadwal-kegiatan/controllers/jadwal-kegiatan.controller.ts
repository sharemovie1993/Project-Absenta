import { z } from 'zod';
import { jadwalKegiatanService } from '../services/jadwal-kegiatan.service';
import { Hari } from '@prisma/client';

const createSchema = z.object({
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  jenis_kegiatan: z.string().min(1, 'Jenis kegiatan wajib diisi'),
  hari: z.array(z.nativeEnum(Hari)).min(1, 'Pilih minimal satu hari'),
  waktu_mulai: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu mulai harus HH:mm'),
  waktu_selesai: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu selesai harus HH:mm').nullable().optional(),
  target_semua_kelas: z.boolean(),
  target_kelas_ids: z.array(z.string()).optional(),
  berlaku_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format berlaku mulai harus YYYY-MM-DD'),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format berlaku sampai harus YYYY-MM-DD').nullable().optional(),
  tahun_pelajaran_id: z.string().optional(),
});

const updateSchema = z.object({
  nama: z.string().min(2).optional(),
  jenis_kegiatan: z.string().optional(),
  hari: z.array(z.nativeEnum(Hari)).optional(),
  waktu_mulai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  waktu_selesai: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  target_semua_kelas: z.boolean().optional(),
  target_kelas_ids: z.array(z.string()).optional(),
  berlaku_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  berlaku_sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  aktif: z.boolean().optional(),
});

export class JadwalKegiatanController {
  async getAll(request: any, reply: any) {
    try {
      const activeOnly = request.query.aktif === 'true';
      const result = await jadwalKegiatanService.getAll(request.dataScope, activeOnly);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getDetail(request: any, reply: any) {
    try {
      const { id } = request.params;
      const result = await jadwalKegiatanService.getById(request.dataScope, id);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async create(request: any, reply: any) {
    try {
      // ⚠️ Zod Schema Validation Guard (Google Platform Standards)
      const parseResult = createSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validasi form gagal',
          errors: parseResult.error.errors.map(err => ({ field: err.path.join('.'), message: err.message })),
        });
      }

      const userId = request.user?.id;
      const result = await jadwalKegiatanService.create(request.dataScope, userId, parseResult.data);
      return reply.status(201).send({ success: true, message: 'Jadwal Kegiatan berhasil dibuat', data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async update(request: any, reply: any) {
    try {
      const { id } = request.params;
      
      // ⚠️ Zod Schema Validation Guard
      const parseResult = updateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          message: 'Validasi form gagal',
          errors: parseResult.error.errors.map(err => ({ field: err.path.join('.'), message: err.message })),
        });
      }

      const result = await jadwalKegiatanService.update(request.dataScope, id, parseResult.data);
      return reply.send({ success: true, message: 'Jadwal Kegiatan berhasil diperbarui', data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async delete(request: any, reply: any) {
    try {
      const { id } = request.params;
      await jadwalKegiatanService.delete(request.dataScope, id);
      return reply.send({ success: true, message: 'Jadwal Kegiatan berhasil dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}

export const jadwalKegiatanController = new JadwalKegiatanController();
