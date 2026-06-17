import { z } from 'zod';

export const createMapelSchema = z.object({
  nama_mapel: z.string()
    .min(1, 'Nama mata pelajaran wajib diisi')
    .min(2, 'Nama mata pelajaran minimal 2 karakter')
    .max(100, 'Nama mata pelajaran maksimal 100 karakter'),
  kode_mapel: z.string()
    .min(2, 'Kode mata pelajaran minimal 2 karakter')
    .max(10, 'Kode mata pelajaran maksimal 10 karakter')
    .regex(/^[A-Z0-9]+$/, 'Kode mata pelajaran hanya boleh huruf kapital dan angka')
    .optional()
    .or(z.literal('')),
  tingkat: z.number()
    .min(1, 'Tingkat harus antara 1-12')
    .max(12, 'Tingkat harus antara 1-12')
    .nullable()
    .optional(),
});

export const updateMapelSchema = createMapelSchema;

export type CreateMapelSchema = z.infer<typeof createMapelSchema>;
export type UpdateMapelSchema = z.infer<typeof updateMapelSchema>;
