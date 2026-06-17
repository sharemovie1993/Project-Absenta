import { z } from 'zod';

export const createKelasSchema = z.object({
  nama_kelas: z.string().min(1, 'Nama kelas wajib diisi'),
  tingkat: z.number().refine((val) => [10, 11, 12].includes(val), {
    message: 'Tingkat harus 10, 11, atau 12',
  }),
  jurusan_id: z.string().min(1, 'Jurusan wajib dipilih'),
  device_id: z.string().optional(),
  is_active: z.boolean().optional(),
});


export const updateKelasSchema = createKelasSchema;

export type CreateKelasSchema = z.infer<typeof createKelasSchema>;
export type UpdateKelasSchema = z.infer<typeof updateKelasSchema>;
