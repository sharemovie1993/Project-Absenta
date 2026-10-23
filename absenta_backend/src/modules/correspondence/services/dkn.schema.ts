import { z } from 'zod';

// Query matriks DKN
export const getMatriksDknSchema = z.object({
  tahun_pelajaran_id: z.string().uuid().optional(),
  kelas_id: z.string().uuid().optional(),
  jurusan_id: z.string().uuid().optional(),
  tingkat: z.coerce.number().optional(),
  search: z.string().optional(),
});

export type GetMatriksDknDto = z.infer<typeof getMatriksDknSchema>;

// Preview Surat Pengantar Dinas
export const previewSuratPengantarSchema = z.object({
  tahun_pelajaran_id: z.string().uuid(),
  jurusan_id: z.string().uuid().optional(),
  kelas_id: z.string().uuid().optional(),
  tujuan_dinas: z.string().min(3, 'Nama instansi/cabang dinas wajib diisi'),
  alamat_dinas: z.string().optional(),
  nomor_surat_manual: z.string().optional(),
  tanggal_surat: z.string().optional(),
  lampiran: z.string().optional().default('1 (Satu) Berkas'),
  catatan_pengantar: z.string().optional(),
});

export type PreviewSuratPengantarDto = z.infer<typeof previewSuratPengantarSchema>;

// Terbitkan Surat Pengantar Dinas & Simpan Arsip DKN
export const issueSuratPengantarSchema = previewSuratPengantarSchema.extend({
  waka_kurikulum_nama: z.string().optional(),
  waka_kurikulum_nip: z.string().optional(),
  pengawas_pembina_nama: z.string().optional(),
  pengawas_pembina_nip: z.string().optional(),
});

export type IssueSuratPengantarDto = z.infer<typeof issueSuratPengantarSchema>;

// Query Arsip DKN
export const getArsipDknSchema = z.object({
  tahun: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export type GetArsipDknDto = z.infer<typeof getArsipDknSchema>;
