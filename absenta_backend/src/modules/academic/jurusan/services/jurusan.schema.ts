import { z } from 'zod';

export const createJurusanSchema = z.object({
  nama: z.string().min(1, 'Nama jurusan wajib diisi'),
  kode: z.string().optional().nullable(),
  singkatan: z.string().optional().nullable(),
  warna: z.string().optional().nullable(),
  program_keahlian_id: z.string().optional().nullable(),
});

export const updateJurusanSchema = createJurusanSchema.partial();

export type CreateJurusanSchema = z.infer<typeof createJurusanSchema>;
export type UpdateJurusanSchema = z.infer<typeof updateJurusanSchema>;
