import { z } from 'zod';

export const createProgramKeahlianSchema = z.object({
  nama: z.string().min(1, 'Nama Program Keahlian wajib diisi'),
  kode: z.string().optional().nullable(),
  singkatan: z.string().optional().nullable(),
  bidang_keahlian: z.string().optional().nullable(),
});

export const updateProgramKeahlianSchema = createProgramKeahlianSchema.partial();

export type CreateProgramKeahlianSchema = z.infer<typeof createProgramKeahlianSchema>;
export type UpdateProgramKeahlianSchema = z.infer<typeof updateProgramKeahlianSchema>;
