import { z } from 'zod';

export const jenisKegiatanSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  tipe: z.enum(['PEMBIASAAN', 'KBM', 'ESKUL'], {
    message: 'Pilih tipe kegiatan yang valid'
  }),
  urutan: z.coerce.number().optional(),
  aktif: z.boolean().default(true)
});

export interface JenisKegiatanFormValues {
  nama: string;
  tipe: 'PEMBIASAAN' | 'KBM' | 'ESKUL';
  urutan?: number;
  aktif: boolean;
}
