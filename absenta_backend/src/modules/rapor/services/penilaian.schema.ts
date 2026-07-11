import { z } from 'zod';

export const kkmpUpsertSchema = z.object({
  mapel_id: z.string().uuid('ID Mata Pelajaran harus berupa UUID yang valid'),
  tingkat: z.number().int().min(1).max(13, 'Tingkat kelas harus berada di antara 1 dan 13'),
  kkm_nilai: z.number().min(0).max(100, 'Nilai KKM harus berada di rentang 0 s.d. 100'),
});

export const jenisNilaiCreateSchema = z.object({
  nama: z.string().min(1, 'Nama jenis penilaian wajib diisi').max(100),
  kode: z.string().min(1, 'Kode jenis penilaian wajib diisi').max(50),
  bobot: z.number().int().min(1, 'Bobot minimal adalah 1').default(1),
  is_active: z.boolean().default(true),
});

export const jenisNilaiUpdateSchema = jenisNilaiCreateSchema.partial();

export const nilaiSiswaUpsertSchema = z.object({
  siswa_id: z.string().uuid('ID Siswa harus berupa UUID yang valid'),
  mapel_id: z.string().uuid('ID Mata Pelajaran harus berupa UUID yang valid'),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran harus berupa UUID yang valid'),
  semester_id: z.string().uuid('ID Semester harus berupa UUID yang valid'),
  jenis_nilai_id: z.string().uuid('ID Jenis Penilaian harus berupa UUID yang valid'),
  nilai: z.number().min(0).max(100, 'Nilai harus berada di rentang 0 s.d. 100'),
  catatan_deskripsi: z.string().max(1000).optional().nullable(),
  sesi_absensi_id: z.string().uuid().optional().nullable(),
});

export const bulkNilaiSiswaSchema = z.object({
  mapel_id: z.string().uuid('ID Mata Pelajaran wajib diisi'),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran wajib diisi'),
  semester_id: z.string().uuid('ID Semester wajib diisi'),
  jenis_nilai_id: z.string().uuid('ID Jenis Penilaian wajib diisi'),
  sesi_absensi_id: z.string().uuid().optional().nullable(),
  scores: z.array(
    z.object({
      siswa_id: z.string().uuid('ID Siswa wajib diisi'),
      nilai: z.number().min(0).max(100, 'Nilai harus berada di rentang 0 s.d. 100'),
      catatan_deskripsi: z.string().max(1000).optional().nullable(),
    })
  ).min(1, 'Daftar nilai tidak boleh kosong'),
});

export const raporSiswaUpsertSchema = z.object({
  siswa_id: z.string().uuid('ID Siswa wajib diisi'),
  kelas_id: z.string().uuid('ID Kelas wajib diisi'),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran wajib diisi'),
  semester_id: z.string().uuid('ID Semester wajib diisi'),
  sakit: z.number().int().min(0).default(0),
  izin: z.number().int().min(0).default(0),
  alpa: z.number().int().min(0).default(0),
  catatan_wali: z.string().max(2000).optional().nullable(),
  keputusan_transisi: z.string().max(255).optional().nullable(),
});

export const sertifikatUkkUpsertSchema = z.object({
  siswa_id: z.string().uuid('ID Siswa wajib diisi'),
  asesor_internal: z.string().max(255).optional().nullable(),
  asesor_eksternal: z.string().min(1, 'Nama Asesor Eksternal wajib diisi').max(255),
  mitra_industri_id: z.string().uuid().optional().nullable(),
  nilai_praktik: z.number().min(0).max(100, 'Nilai Praktik harus berada di rentang 0 s.d. 100'),
  nilai_teori: z.number().min(0).max(100, 'Nilai Teori harus berada di rentang 0 s.d. 100').optional().nullable(),
  predikat: z.string().min(1, 'Predikat wajib diisi').max(100),
  nomor_sertifikat: z.string().min(1, 'Nomor sertifikat wajib diisi').max(255),
  tanggal_terbit: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
});

export const kelulusanSiswaUpsertSchema = z.object({
  siswa_id: z.string().uuid('ID Siswa wajib diisi'),
  nomor_skl: z.string().min(1, 'Nomor SKL wajib diisi').max(255),
  tanggal_lulus: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  rata_rata_nilai: z.number().min(0).max(100, 'Rata-rata nilai harus berada di rentang 0 s.d. 100'),
  status_kelulusan: z.string().default('LULUS'),
  catatan: z.string().max(2000).optional().nullable(),
});
