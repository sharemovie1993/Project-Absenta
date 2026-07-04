import { z } from 'zod';

export const createTahunPelajaranSchema = z.object({
  tahun: z.string().min(1, 'Tahun wajib diisi'),
  is_active: z.boolean().optional().default(false),
});

export const updateTahunPelajaranSchema = createTahunPelajaranSchema.partial();

export type CreateTahunPelajaranSchema = z.infer<typeof createTahunPelajaranSchema>;
export type UpdateTahunPelajaranSchema = z.infer<typeof updateTahunPelajaranSchema>;
