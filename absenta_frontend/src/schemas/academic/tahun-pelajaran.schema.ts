import { z } from 'zod';

export const createTahunPelajaranSchema = z.object({
  tahun: z.string()
    .min(1, 'Tahun pelajaran wajib diisi')
    .regex(/^\d{4}\/\d{4}$/, 'Format tahun harus YYYY/YYYY (contoh: 2023/2024)'),
  is_active: z.boolean(),
}).refine((data) => {
  const startYear = parseInt(data.tahun.split('/')[0]);
  const endYear = parseInt(data.tahun.split('/')[1]);
  return endYear === startYear + 1;
}, {
  message: 'Tahun akhir harus tepat satu tahun setelah tahun awal',
  path: ['tahun'],
});

export const updateTahunPelajaranSchema = createTahunPelajaranSchema;

export type CreateTahunPelajaranSchema = z.infer<typeof createTahunPelajaranSchema>;
export type UpdateTahunPelajaranSchema = z.infer<typeof updateTahunPelajaranSchema>;
