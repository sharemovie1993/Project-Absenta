import { z } from 'zod';

export const createKelasSchema = z.object({
  nama_kelas: z.string().min(1, 'Nama kelas wajib diisi'),
  tingkat: z.number().int().min(1).max(12),
  jurusan_id: z.string().min(1, 'Jurusan wajib diisi'),
  guru_id: z.string().optional().nullable(),
  jam_masuk: z.string().optional().nullable(),
  jam_pulang: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateKelasSchema = createKelasSchema.partial();

export type CreateKelasSchema = z.infer<typeof createKelasSchema>;
export type UpdateKelasSchema = z.infer<typeof updateKelasSchema>;
