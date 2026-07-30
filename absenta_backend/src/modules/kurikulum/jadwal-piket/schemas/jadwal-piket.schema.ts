import { z } from 'zod';

export const HariEnum = z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']);

export const createJadwalPiketSchema = z.object({
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib diisi'),
  semester_id: z.string().min(1, 'Semester wajib diisi'),
  guru_id: z.string().min(1, 'Guru wajib dipilih'),
  hari: HariEnum,
  pos_piket: z.string().optional().default('Piket Umum'),
  slot_mulai: z.number().optional(),
  slot_selesai: z.number().optional(),
  jam_mulai: z.string().optional(),
  jam_selesai: z.string().optional(),
  catatan: z.string().optional(),
});

export const bulkCreateJadwalPiketSchema = z.object({
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib diisi'),
  semester_id: z.string().min(1, 'Semester wajib diisi'),
  hari: HariEnum,
  guru_ids: z.array(z.string()).min(1, 'Minimal pilih satu guru'),
  pos_piket: z.string().optional().default('Piket Umum'),
  slot_mulai: z.number().optional(),
  slot_selesai: z.number().optional(),
  jam_mulai: z.string().optional(),
  jam_selesai: z.string().optional(),
});

export const updateJadwalPiketSchema = createJadwalPiketSchema.partial();

export const queryJadwalPiketSchema = z.object({
  tahun_pelajaran_id: z.string().optional(),
  semester_id: z.string().optional(),
  hari: HariEnum.optional(),
  guru_id: z.string().optional(),
});
