import { z } from 'zod';

// ── Preview Surat Keterangan Schema ───────────────────────────────────────
export const previewSuratKeteranganSchema = z.object({
  template_type: z.enum(['SISWA_AKTIF', 'SKKB', 'REKOMENDASI']),
  siswa_id: z.string().uuid(),
  keperluan: z.string().min(3).max(255).optional().default('Keperluan Administrasi'),
  keterangan_tambahan: z.string().max(500).optional(),
});

export type PreviewSuratKeteranganDto = z.infer<typeof previewSuratKeteranganSchema>;

// ── Issue Surat Keterangan Schema ─────────────────────────────────────────
export const issueSuratKeteranganSchema = z.object({
  template_type: z.enum(['SISWA_AKTIF', 'SKKB', 'REKOMENDASI']),
  siswa_id: z.string().uuid(),
  nomor_surat: z.string().min(3).max(100),
  keperluan: z.string().min(3).max(255),
  isi_surat: z.string().min(10),
  keterangan_tambahan: z.string().max(500).optional(),
});

export type IssueSuratKeteranganDto = z.infer<typeof issueSuratKeteranganSchema>;

// ── History Query Schema ──────────────────────────────────────────────────
export const getSuratKeteranganHistorySchema = z.object({
  siswa_id: z.string().uuid().optional(),
  kategori_surat: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 10000)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200)
    .optional(),
});

export type GetSuratKeteranganHistoryDto = z.output<typeof getSuratKeteranganHistorySchema>;
