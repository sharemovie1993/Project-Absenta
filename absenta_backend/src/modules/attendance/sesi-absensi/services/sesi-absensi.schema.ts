import { z } from 'zod';
import { AbsenStatus } from '@/constants/enums';

export const createSesiAbsensiSchema = z.object({
  kelas_id: z.string().min(1, 'kelas_id wajib diisi'),
  guru_id: z.string().min(1, 'guru_id wajib diisi'),
  mapel_id: z.string().optional().nullable(),
  waktu_mulai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  waktu_selesai: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  jenis_kegiatan_id: z.string().optional().nullable(),
  keterangan: z.string().optional().nullable(),
  tipe_kegiatan: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateSesiAbsensiSchema = createSesiAbsensiSchema.partial();

export const updateSesiStatusSchema = z.object({
  status: z.enum(['BELUM_MULAI', 'BERLANGSUNG', 'SELESAI', 'BATAL']),
});

export const updateAbsenGuruSchema = z.object({
  status: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
});

export const tapSiswaSchema = z.object({
  siswa_id: z.string().optional().nullable(),
  siswa_akademik_id: z.string().optional().nullable(),
  status: z.nativeEnum(AbsenStatus).optional().nullable(),
  rfid: z.string().optional().nullable(),
  device_id: z.string().optional().nullable(),
});
