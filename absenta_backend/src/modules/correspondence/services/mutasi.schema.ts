import { z } from 'zod';

// ─── Preview Mutasi Keluar ───────────────────────────────────────────────────
export const previewMutasiKeluarSchema = z.object({
  siswa_id: z.string().uuid(),
  sekolah_tujuan: z.string().min(3).max(200),
  alasan: z.string().min(3).max(500),
  tanggal_keluar: z.string().min(8),
  no_rekomendasi_dinas: z.string().max(100).optional(),
  keterangan_tambahan: z.string().max(500).optional(),
});

export type PreviewMutasiKeluarDto = z.infer<typeof previewMutasiKeluarSchema>;

// ─── Issue Mutasi Keluar ─────────────────────────────────────────────────────
export const issueMutasiKeluarSchema = z.object({
  siswa_id: z.string().uuid(),
  nomor_surat: z.string().min(3).max(100),
  sekolah_tujuan: z.string().min(3).max(200),
  alasan: z.string().min(3).max(500),
  tanggal_keluar: z.string().min(8),
  no_rekomendasi_dinas: z.string().max(100).optional(),
  keterangan_tambahan: z.string().max(500).optional(),
  dossier_terlampir: z.boolean().optional().default(true),
});

export type IssueMutasiKeluarDto = z.infer<typeof issueMutasiKeluarSchema>;

// ─── Preview Mutasi Masuk ────────────────────────────────────────────────────
export const previewMutasiMasukSchema = z.object({
  siswa_id: z.string().uuid().optional(),
  nama_siswa: z.string().min(2).max(150),
  nisn: z.string().max(20).optional(),
  sekolah_asal: z.string().min(3).max(200),
  kelas_id: z.string().uuid().optional(),
  kelas_tujuan: z.string().max(100).optional(),
  tingkat: z.number().int().min(1).max(13).optional(),
  tanggal_masuk: z.string().min(8),
  no_rekomendasi_dinas: z.string().max(100).optional(),
  keterangan_tambahan: z.string().max(500).optional(),
});

export type PreviewMutasiMasukDto = z.infer<typeof previewMutasiMasukSchema>;

// ─── Issue Mutasi Masuk ──────────────────────────────────────────────────────
export const issueMutasiMasukSchema = z.object({
  siswa_id: z.string().uuid().optional(),
  nama_siswa: z.string().min(2).max(150),
  nisn: z.string().max(20).optional(),
  sekolah_asal: z.string().min(3).max(200),
  kelas_id: z.string().uuid().optional(),
  kelas_tujuan: z.string().max(100).optional(),
  tingkat: z.number().int().min(1).max(13).optional(),
  tanggal_masuk: z.string().min(8),
  nomor_surat: z.string().min(3).max(100),
  no_rekomendasi_dinas: z.string().max(100).optional(),
  keterangan_tambahan: z.string().max(500).optional(),
});

export type IssueMutasiMasukDto = z.infer<typeof issueMutasiMasukSchema>;

// ─── Buku Register Mutasi Query ──────────────────────────────────────────────
export const getBukuRegisterSchema = z.object({
  tahun_pelajaran_id: z.string().uuid().optional(),
  semester_id: z.string().uuid().optional(),
  tipe: z.enum(['ALL', 'MASUK', 'KELUAR']).optional().default('ALL'),
  search: z.string().max(100).optional(),
});

export type GetBukuRegisterDto = z.infer<typeof getBukuRegisterSchema>;

// ─── Agenda Mutasi Query ─────────────────────────────────────────────────────
export const getAgendaMutasiSchema = z.object({
  tipe: z.enum(['ALL', 'MUTASI_KELUAR', 'MUTASI_MASUK']).optional().default('ALL'),
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

export type GetAgendaMutasiDto = z.output<typeof getAgendaMutasiSchema>;
