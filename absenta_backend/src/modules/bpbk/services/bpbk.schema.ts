import { z } from 'zod';

export const kasusBKSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa ID wajib diisi'),
  judul: z.string().min(1, 'Judul kasus wajib diisi'),
  kategori: z.enum(['KEDISIPLINAN', 'AKADEMIS', 'PRIBADI', 'SOSIAL']),
  status: z.enum(['TERBUKA', 'PROSES', 'RUJUKAN', 'SELESAI']).default('TERBUKA'),
  prioritas: z.enum(['RENDAH', 'SEDANG', 'TINGGI']).default('RENDAH'),
  visibility: z.enum(['PUBLIC', 'LIMITED', 'SENSITIVE']).default('LIMITED'),
  tanggal_kasus: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  keterangan: z.string().optional().nullable(),
});

export const updateKasusBKSchema = kasusBKSchema.partial();

export const konselingSiswaSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa ID wajib diisi'),
  tanggal: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  tipe: z.enum(['INDIVIDU', 'KELOMPOK']),
  kelompok_id: z.string().optional().nullable(),
  masalah: z.string().min(1, 'Masalah wajib diisi'),
  solusi: z.string().optional().nullable(),
  status: z.enum(['PROSES', 'SELESAI']).default('PROSES'),
  visibility: z.enum(['PUBLIC', 'LIMITED', 'SENSITIVE']).default('SENSITIVE'),
  kasus_bk_id: z.string().optional().nullable(),
  petugas_id: z.string().optional(),
});

export const updateKonselingSchema = konselingSiswaSchema.partial();

export const pemanggilanOrangTuaSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa ID wajib diisi'),
  tanggal_pemanggilan: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  alasan: z.string().min(1, 'Alasan pemanggilan wajib diisi'),
  waktu_pertemuan: z.string().optional().nullable(),
  tempat_pertemuan: z.string().optional().nullable(),
  surat_dokumen_id: z.string().optional().nullable(),
  kasus_bk_id: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'LIMITED', 'SENSITIVE']).default('LIMITED'),
  ortu_notified: z.boolean().default(false),
  status: z.enum(['BARU', 'DIKIRIM', 'SELESAI', 'BATAL']).optional(),
});

export const updatePemanggilanSchema = pemanggilanOrangTuaSchema.partial();

export const homeVisitSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa ID wajib diisi'),
  tanggal: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  alasan: z.string().min(1, 'Alasan home visit wajib diisi'),
  hasil: z.string().optional().nullable(),
  foto_dokumen_id: z.string().optional().nullable(),
  kasus_bk_id: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'LIMITED', 'SENSITIVE']).default('LIMITED'),
  ortu_notified: z.boolean().default(false),
});

export const updateHomeVisitSchema = homeVisitSchema.partial();

export const asesmenSiswaSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa ID wajib diisi'),
  tanggal: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  nama_asesmen: z.string().min(1, 'Nama asesmen wajib diisi'),
  hasil_skor: z.string().optional().nullable(),
  keterangan: z.string().optional().nullable(),
  dokumen_id: z.string().optional().nullable(),
  kasus_bk_id: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'LIMITED', 'SENSITIVE']).default('SENSITIVE'),
});

export const updateAsesmenSchema = asesmenSiswaSchema.partial();

export const rujukanKasusSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa ID wajib diisi'),
  tanggal: z.union([z.date(), z.string()]).transform((v) => new Date(v)),
  rujukan_ke: z.string().min(1, 'Rujukan ke mana wajib diisi'),
  alasan: z.string().min(1, 'Alasan rujukan wajib diisi'),
  status: z.enum(['DIUSULKAN', 'DISETUJUI', 'DITOLAK', 'SELESAI']).default('DIUSULKAN'),
  kasus_bk_id: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'LIMITED', 'SENSITIVE']).default('LIMITED'),
});

export const updateRujukanSchema = rujukanKasusSchema.partial();

export const ewsWeightsSchema = z.object({
  weight_violation: z.number().nonnegative('Bobot pelanggaran harus bernilai non-negatif'),
  weight_alpa: z.number().nonnegative('Bobot alpa harus bernilai non-negatif'),
  weight_case_high: z.number().nonnegative('Bobot kasus tinggi harus bernilai non-negatif'),
  weight_case_medium: z.number().nonnegative('Bobot kasus sedang harus bernilai non-negatif'),
  weight_case_low: z.number().nonnegative('Bobot kasus rendah harus bernilai non-negatif'),
  weight_achievement: z.number().nonnegative('Bobot prestasi harus bernilai non-negatif'),
});

