import { z } from 'zod';

export const ScoreInputSchema = z.object({
  siswa_id: z.string().min(1, 'ID Siswa wajib diisi'),
  nama: z.string().optional().nullable(),
  nis: z.string().optional().nullable(),
  sumatif_1: z.union([z.number(), z.string(), z.null()]).optional(),
  sumatif_2: z.union([z.number(), z.string(), z.null()]).optional(),
  sumatif_3: z.union([z.number(), z.string(), z.null()]).optional(),
  sumatif_akhir: z.union([z.number(), z.string(), z.null()]).optional(),
  deskripsi_cp: z.string().nullable().optional(),
  nilai: z.union([z.number(), z.string(), z.null()]).optional(),
  deskripsi: z.string().nullable().optional(),
});

export const KkmThresholdSchema = z.number().min(40).max(95);

export const BulkPasteTextSchema = z.string().min(1, 'Teks paste dari Excel tidak boleh kosong');

export const ExcelFileFormSchema = z.object({
  file: z.instanceof(File, { message: 'Berkas Excel wajib dipilih' }),
});

export type ScoreInputFormData = z.infer<typeof ScoreInputSchema>;
