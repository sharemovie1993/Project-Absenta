import { z } from 'zod';
import { JenisKegiatan } from '@/constants/enums';

export const createJenisKegiatanMasterSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  tipe: z.nativeEnum(JenisKegiatan),
});

export const updateJenisKegiatanMasterSchema = createJenisKegiatanMasterSchema.partial();

export type CreateJenisKegiatanMasterSchema = z.infer<typeof createJenisKegiatanMasterSchema>;
export type UpdateJenisKegiatanMasterSchema = z.infer<typeof updateJenisKegiatanMasterSchema>;
