import { z } from 'zod';

export const createKelasSchema = z.object({
  nama_kelas: z.string().min(1, 'Nama kelas wajib diisi'),
  // Mendukung semua jenjang: SD (1-6), SMP (7-9), SMA/SMK (10-12/13)
  tingkat: z.number().min(1, 'Tingkat minimal 1').max(13, 'Tingkat maksimal 13'),
  jurusan_id: z.string().min(1, 'Jurusan wajib dipilih'),
  device_id: z.string().optional(),
  is_active: z.boolean().optional(),
});


export const updateKelasSchema = createKelasSchema;

export type CreateKelasSchema = z.infer<typeof createKelasSchema>;
export type UpdateKelasSchema = z.infer<typeof updateKelasSchema>;
