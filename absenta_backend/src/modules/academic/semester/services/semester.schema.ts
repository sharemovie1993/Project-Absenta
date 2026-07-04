import { z } from 'zod';

export const createSemesterSchema = z.object({
  nama_semester: z.string().min(1, 'Nama semester wajib diisi'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran ID wajib diisi'),
  is_active: z.boolean().optional().default(false),
});

export const updateSemesterSchema = createSemesterSchema.partial();

export type CreateSemesterSchema = z.infer<typeof createSemesterSchema>;
export type UpdateSemesterSchema = z.infer<typeof updateSemesterSchema>;
