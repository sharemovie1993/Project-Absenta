import { z } from 'zod';

export const createMapelSchema = z.object({
  nama_mapel: z.string().min(1, 'Nama mapel wajib diisi'),
  kode_mapel: z.string().optional().nullable(),
  tingkat: z.number().int().min(1).max(12).optional().nullable(),
  deskripsi: z.string().optional().nullable(),
});

export const updateMapelSchema = createMapelSchema.partial();

export type CreateMapelSchema = z.infer<typeof createMapelSchema>;
export type UpdateMapelSchema = z.infer<typeof updateMapelSchema>;
