import { z } from 'zod';

// ==========================================
// CBT SCHEMAS (ZOD VALIDATION)
// ==========================================

export const opsiPilihanSchema = z.object({
  kode: z.enum(['A', 'B', 'C', 'D', 'E']),
  teks: z.string().default(''),
  gambar_url: z.string().nullable().optional(),
});

export const createBankSoalSchema = z.object({
  guru_id: z.string().uuid('ID Guru tidak valid'),
  mapel_id: z.string().uuid('ID Mapel tidak valid'),
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  tingkat: z.enum(['X', 'XI', 'XII', 'SEMUA']),
  jurusan: z.string().nullable().optional(),
  alokasi_menit: z.number().int().min(10).max(300).default(90),
  acak_soal: z.boolean().default(true),
  acak_opsi: z.boolean().default(true),
});

export const updateBankSoalSchema = createBankSoalSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const queryBankSoalSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  tingkat: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  mapel_id: z.string().optional(),
  guru_id: z.string().optional(),
});

export const createSoalPgSchema = z.object({
  nomor_urut: z.number().int().min(1).default(1),
  jenis_soal: z.literal('PG').default('PG'),
  konten_pertanyaan: z.string().min(1, 'Konten pertanyaan wajib diisi'),
  gambar_stimulus_url: z.string().nullable().optional(),
  bobot: z.number().min(0.1).max(100).default(1.0),
  opsi_jawaban_json: z.array(opsiPilihanSchema).min(2, 'Minimal 2 opsi pilihan jawaban (A & B)'),
  kunci_jawaban: z.enum(['A', 'B', 'C', 'D', 'E']),
  pembahasan: z.string().nullable().optional(),
});

export const updateSoalPgSchema = createSoalPgSchema.partial();

export const bulkImportSoalSchema = z.object({
  items: z.array(createSoalPgSchema).min(1, 'Daftar soal impor tidak boleh kosong'),
});

export const settingKeamananSchema = z.object({
  lock_device: z.boolean().default(true),
  block_tab_switching: z.boolean().default(true),
  max_tab_switches: z.number().int().min(1).max(20).default(3),
  shuffle_questions: z.boolean().default(true),
  shuffle_options: z.boolean().default(true),
  show_result_instant: z.boolean().default(false),
}).partial();

export const createJadwalUjianSchema = z.object({
  bank_soal_id: z.string().uuid('ID Bank Soal tidak valid'),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran tidak valid'),
  semester_id: z.string().uuid('ID Semester tidak valid'),
  nama_sesi: z.string().min(3, 'Nama sesi minimal 3 karakter').max(150),
  tanggal_mulai: z.string().datetime({ message: 'Format tanggal_mulai harus ISO DateTime' }),
  tanggal_selesai: z.string().datetime({ message: 'Format tanggal_selesai harus ISO DateTime' }),
  durasi_menit: z.number().int().min(10).max(300).default(90),
  toleransi_terlambat_menit: z.number().int().min(0).max(120).default(15),
  target_kelas_ids: z.array(z.string().uuid()).min(1, 'Pilih minimal 1 kelas target'),
  setting_keamanan: settingKeamananSchema.optional(),
});

export const updateJadwalUjianSchema = createJadwalUjianSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  token_ujian: z.string().min(4).max(10).optional(),
});

export const queryJadwalUjianSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  bank_soal_id: z.string().optional(),
  guru_id: z.string().optional(),
});

// Siswa Engine Schemas
export const verifyExamTokenSchema = z.object({
  token_ujian: z.string().min(4).max(10, 'Token harus 4-10 karakter').transform((v) => v.toUpperCase().trim()),
});

export const startExamSessionSchema = z.object({
  jadwal_ujian_id: z.string().uuid(),
  token_masuk: z.string().min(4).max(10).transform((v) => v.toUpperCase().trim()),
  metadata_perangkat: z.record(z.any()).optional(),
});

export const syncAnswerItemSchema = z.object({
  soal_id: z.string().uuid(),
  jawaban_siswa: z.string(), // 'A' | 'B' | 'C' | 'D' | 'E' atau string kosong
  is_ragu: z.boolean().default(false),
  timestamp: z.number(),
});

export const syncAnswersBatchSchema = z.object({
  jawaban: z.array(syncAnswerItemSchema),
  sisa_waktu_detik: z.number().int().min(0),
});

export const recordViolationSchema = z.object({
  tipe_pelanggaran: z.enum(['TAB_SWITCH', 'FULLSCREEN_EXIT', 'DEVTOOLS_OPEN', 'BLUR_WINDOW', 'SUSPICIOUS_KEY']),
  detail: z.string().optional(),
  waktu: z.string().datetime().default(() => new Date().toISOString()),
});

export const submitExamFinalSchema = z.object({
  jawaban_final: z.array(syncAnswerItemSchema),
  log_pelanggaran: z.array(recordViolationSchema).optional(),
});

export const transferNilaiRaporSchema = z.object({
  target_slot: z.enum(['sumatif_1', 'sumatif_2', 'sumatif_3', 'sumatif_akhir']),
  tahun_pelajaran_id: z.string().uuid('ID Tahun Pelajaran tidak valid'),
  semester_id: z.string().uuid('ID Semester tidak valid'),
  mapel_id: z.string().uuid('ID Mapel tidak valid').optional(),
  kelas_ids: z.array(z.string().uuid()).optional(),
  overwrite_existing: z.boolean().default(true),
  round_integer: z.boolean().default(true),
});
