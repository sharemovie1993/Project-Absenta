import { z } from 'zod';

export const createJurusanSchema = z.object({
  nama: z.string()
    .min(1, 'Nama jurusan wajib diisi')
    .min(2, 'Nama jurusan minimal 2 karakter')
    .max(100, 'Nama jurusan maksimal 100 karakter'),
  kode: z.string()
    .max(10, 'Kode jurusan maksimal 10 karakter')
    .optional()
    .or(z.literal('')),
  singkatan: z.string()
    .min(2, 'Singkatan minimal 2 karakter')
    .max(10, 'Singkatan maksimal 10 karakter')
    .regex(/^[A-Z0-9]+$/, 'Singkatan hanya boleh huruf kapital dan angka')
    .optional()
    .or(z.literal('')),
  program_keahlian_id: z.string().optional().nullable(),
  warna: z.string().optional().nullable(),
  durasi_jurusan: z.string().optional().nullable(),
});

export const updateJurusanSchema = createJurusanSchema;
export type CreateJurusanSchema = z.infer<typeof createJurusanSchema>;
export type UpdateJurusanSchema = z.infer<typeof updateJurusanSchema>;
