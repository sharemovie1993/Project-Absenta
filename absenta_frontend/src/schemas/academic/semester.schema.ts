import { z } from 'zod';

export const semesterSchema = z.object({
  nama_semester: z.string().min(1, 'Nama semester wajib diisi'),
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  is_active: z.boolean(),
});

export type SemesterFormValues = z.infer<typeof semesterSchema>;
