import { z } from 'zod';

// ==========================================
// CBT SCHEMAS (ZOD VALIDATION)
// ==========================================

export const opsiPilihanSchema = z.object({
  kode: z.enum(['A', 'B', 'C', 'D', 'E']),
  teks: z.string().default(''),
  gambar_url: z.string().nullable().optional(),
});

export const VALID_CBT_TINGKAT = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII',
  'SEMUA',
] as const;

const FINAL_GRADUATING_GRADES = new Set(['6', 'VI', '9', 'IX', '12', 'XII', '13', 'XIII']);
const NON_FINAL_GRADES = new Set([
  '1', '2', '3', '4', '5', 'I', 'II', 'III', 'IV', 'V',
  '7', '8', 'VII', 'VIII',
  '10', '11', 'X', 'XI'
]);

const bankSoalBaseSchema = z.object({
  guru_id: z.string().uuid('ID Guru tidak valid'),
  mapel_id: z.string().uuid('ID Mapel tidak valid'),
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  tingkat: z.enum(VALID_CBT_TINGKAT),
  jurusan: z.string().nullable().optional(),
  alokasi_menit: z.number().int().min(10).max(300).default(90),
  acak_soal: z.boolean().default(true),
  acak_opsi: z.boolean().default(true),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  is_shared: z.boolean().optional(),
});

/**
 * Validasi domain aturan dinas / kurikulum multi-jenjang untuk Bank Soal:
 * 1. PSAJ (Penilaian Sumatif Akhir Jenjang) hanya untuk tingkat akhir (SD: VI, SMP: IX, SMA/SMK: XII/XIII).
 * 2. SAT (Sumatif Akhir Tahun) adalah kenaikan kelas bagi seluruh tingkat KECUALI tingkat akhir.
 */
const refineBankSoalAsesmen = (
  data: { kode_bank?: string; tingkat?: string },
  ctx: z.RefinementCtx
) => {
  if (!data.kode_bank || !data.tingkat) return;
  const kodeUpper = data.kode_bank.toUpperCase();
  const tingkatUpper = data.tingkat.toUpperCase().trim();

  if (kodeUpper.startsWith('PSAJ-') && NON_FINAL_GRADES.has(tingkatUpper)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Paket bank soal PSAJ adalah evaluasi kelulusan akhir jenjang yang hanya diperkenankan untuk kelas tingkat akhir (Kelas 6/VI di SD, Kelas 9/IX di SMP, atau Kelas 12/13 di SMA/SMK)',
      path: ['tingkat'],
    });
  }

  if (kodeUpper.startsWith('SAT-') && FINAL_GRADUATING_GRADES.has(tingkatUpper)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Paket bank soal SAT adalah evaluasi kenaikan kelas (Tingkat akhir menempuh kelulusan PSAJ)',
      path: ['tingkat'],
    });
  }
};

export const createBankSoalSchema = bankSoalBaseSchema.superRefine(refineBankSoalAsesmen);

export const updateBankSoalSchema = bankSoalBaseSchema
  .partial()
  .extend({
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    is_shared: z.boolean().optional(),
  })
  .superRefine(refineBankSoalAsesmen);

export const queryBankSoalSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  tingkat: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  mapel_id: z.string().optional(),
  guru_id: z.string().optional(),
  include_shared: z.coerce.boolean().optional().default(true),
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
  auto_transfer_rapor: z.boolean().default(false),
  target_rapor_slot: z.enum(['sumatif_1', 'sumatif_2', 'sumatif_3', 'sumatif_akhir']).nullable().optional(),
  created_by_guru_id: z.string().uuid().nullable().optional(),
  ruang_ujian: z.string().max(120).nullable().optional(),
  pengawas_1_id: z.string().nullable().optional(),
  pengawas_1_nama: z.string().max(150).nullable().optional(),
  pengawas_1_nip: z.string().max(60).nullable().optional(),
  pengawas_2_id: z.string().nullable().optional(),
  pengawas_2_nama: z.string().max(150).nullable().optional(),
  pengawas_2_nip: z.string().max(60).nullable().optional(),
  proktor_id: z.string().nullable().optional(),
  proktor_nama: z.string().max(150).nullable().optional(),
  proktor_nip: z.string().max(60).nullable().optional(),
}).partial();

const jadwalUjianBaseSchema = z.object({
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

/**
 * Validasi domain rentang waktu pelaksanaan ujian:
 * Batas akhir tanggal dan jam selesai ujian harus lebih besar dari tanggal mulai.
 */
const refineJadwalUjianWaktu = (
  data: { tanggal_mulai?: string; tanggal_selesai?: string },
  ctx: z.RefinementCtx
) => {
  if (data.tanggal_mulai && data.tanggal_selesai) {
    const startMs = new Date(data.tanggal_mulai).getTime();
    const endMs = new Date(data.tanggal_selesai).getTime();

    if (endMs <= startMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Batas akhir tanggal dan jam selesai ujian harus lebih besar dari tanggal mulai',
        path: ['tanggal_selesai'],
      });
    }
  }
};

export const createJadwalUjianSchema = jadwalUjianBaseSchema.superRefine(refineJadwalUjianWaktu);

export const updateJadwalUjianSchema = jadwalUjianBaseSchema
  .partial()
  .extend({
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
    token_ujian: z.string().min(4).max(10).optional(),
  })
  .superRefine(refineJadwalUjianWaktu);

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

export const bulkPlottingItemSchema = z.object({
  jadwal_id: z.string().uuid('ID Jadwal tidak valid'),
  ruang_ujian: z.string().optional(),
  pengawas_1_id: z.string().optional(),
  pengawas_1_nama: z.string().optional(),
  pengawas_1_nip: z.string().optional(),
  pengawas_2_id: z.string().optional(),
  pengawas_2_nama: z.string().optional(),
  pengawas_2_nip: z.string().optional(),
  proktor_id: z.string().optional(),
  proktor_nama: z.string().optional(),
  proktor_nip: z.string().optional(),
  tanggal_mulai: z.string().optional(),
  tanggal_selesai: z.string().optional(),
});

export const bulkPlottingJadwalSchema = z.object({
  items: z.array(bulkPlottingItemSchema).min(1, 'Minimal 1 jadwal ujian untuk diploting'),
});

export const bulkCreateJadwalSchema = z.object({
  items: z.array(createJadwalUjianSchema).min(1, 'Minimal 1 jadwal ujian untuk dibuat'),
});
