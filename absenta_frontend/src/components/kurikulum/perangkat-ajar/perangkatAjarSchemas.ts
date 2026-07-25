import { z } from 'zod';

export const uploadPerangkatSchema = z.object({
  judul: z.string().min(3, 'Judul dokumen minimal 3 karakter'),
  jenis: z.string().min(1, 'Pilih jenis perangkat ajar terlebih dahulu'),
  mapel_id: z.string().min(1, 'Pilih mata pelajaran terlebih dahulu'),
  guru_id: z.string().min(1, 'Pilih guru pengajar terlebih dahulu'),
  file: z
    .custom<File | null>((val) => val instanceof File || val === null, {
      message: 'Format berkas tidak valid',
    })
    .refine((file) => file !== null, 'Silakan pilih berkas dokumen terlebih dahulu'),
});

export const reviewPerangkatSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    message: 'Status verifikasi wajib dipilih',
  }),
  catatan_reviewer: z.string().optional(),
});

export const generateAIPerangkatSchema = z.object({
  jenis: z.string().min(1, 'Pilih jenis perangkat ajar'),
  mapel_id: z.string().min(1, 'Pilih mata pelajaran terlebih dahulu'),
  kelas: z.string().min(1, 'Masukkan jenjang kelas'),
  topik: z.string().min(3, 'Topik materi minimal 3 karakter'),
  alokasi_waktu: z.string().min(1, 'Masukkan alokasi waktu KBM'),
});

export const saveAIPerangkatSchema = z.object({
  judul: z.string().min(3, 'Judul perangkat ajar minimal 3 karakter'),
  jenis: z.string().min(1, 'Jenis perangkat ajar wajib diisi'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  guru_id: z.string().optional(),
  tahun_pelajaran_id: z.string().optional(),
  semester_id: z.string().optional(),
  html_content: z.string().min(10, 'Naskah Perangkat Ajar AI belum siap atau terlalu pendek'),
});

export type UploadPerangkatInput = z.infer<typeof uploadPerangkatSchema>;
export type ReviewPerangkatInput = z.infer<typeof reviewPerangkatSchema>;
export type GenerateAIPerangkatInput = z.infer<typeof generateAIPerangkatSchema>;
export type SaveAIPerangkatInput = z.infer<typeof saveAIPerangkatSchema>;
