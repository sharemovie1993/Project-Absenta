import { z } from 'zod';

export type CbtBankSoalScope = 'TERPUSAT_MASSAL' | 'MANDIRI_GURU';

export interface OfficialAsesmenType {
  key: string;
  singkatan: string;
  namaResmi: string;
  keterangan: string;
  defaultPrefix: string;
  allowedTingkat?: Array<'X' | 'XI' | 'XII' | 'SEMUA'>;
  tingkatRuleExplanation?: string;
}

/**
 * Nomenklatur resmi asesmen nasional & dinas pendidikan
 * berdasarkan Permendikbudristek No. 21 Tahun 2022
 */
export const OFFICIAL_ASESMEN_TYPES: OfficialAsesmenType[] = [
  {
    key: 'SAS',
    singkatan: 'SAS',
    namaResmi: 'Sumatif Akhir Semester',
    keterangan: 'Semester 1 (Ganjil)',
    defaultPrefix: 'SAS',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
  {
    key: 'SAT',
    singkatan: 'SAT',
    namaResmi: 'Sumatif Akhir Tahun',
    keterangan: 'Kenaikan Kelas (Sem. 2)',
    defaultPrefix: 'SAT',
    allowedTingkat: ['X', 'XI'],
    tingkatRuleExplanation: 'Khusus Kenaikan Kelas X & XI',
  },
  {
    key: 'STS',
    singkatan: 'STS',
    namaResmi: 'Sumatif Tengah Semester',
    keterangan: 'Tengah Semester',
    defaultPrefix: 'STS',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
  {
    key: 'PSAJ',
    singkatan: 'PSAJ',
    namaResmi: 'Penilaian Sumatif Akhir Jenjang',
    keterangan: 'Kelulusan Kelas XII',
    defaultPrefix: 'PSAJ',
    allowedTingkat: ['XII'],
    tingkatRuleExplanation: 'Khusus Kelulusan Kelas XII',
  },
  {
    key: 'SLM',
    singkatan: 'SLM',
    namaResmi: 'Sumatif Lingkup Materi',
    keterangan: 'Ulangan Bab / TP',
    defaultPrefix: 'SLM',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
  {
    key: 'TRYOUT',
    singkatan: 'Simulasi',
    namaResmi: 'Simulasi / Try Out Asesmen',
    keterangan: 'Try Out & ANBK',
    defaultPrefix: 'TRYOUT',
    allowedTingkat: ['X', 'XI', 'XII', 'SEMUA'],
  },
];

export interface SmartPeriodDetection {
  recommendedKey: string;
  semesterLabel: string;
  monthName: string;
  reason: string;
  shortTag: string;
}

/**
 * Mendeteksi jenis kegiatan asesmen yang paling relevan secara cerdas
 * berdasarkan kalender bulan berjalan & semester aktif sekolah.
 * 
 * - Semester Ganjil (Juli - Des):
 *   * Juli-Agustus: SLM (Sumatif Lingkup Materi / Ulangan Awal Bab)
 *   * September-Oktober: STS (Sumatif Tengah Semester)
 *   * November-Desember: SAS (Sumatif Akhir Semester)
 * - Semester Genap (Januari - Juni):
 *   * Januari-Februari: SLM / Simulasi ANBK
 *   * Februari-Maret: STS (Sumatif Tengah Semester Genap)
 *   * Maret-April: PSAJ (Penilaian Sumatif Akhir Jenjang / Kelulusan XII)
 *   * Mei-Juni: SAT (Sumatif Akhir Tahun / Kenaikan Kelas)
 */
export function detectSmartAsesmenType(
  activeSemester?: { nama_semester?: string; is_active?: boolean } | null,
  tingkat?: string
): SmartPeriodDetection {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthName = monthNames[month - 1];

  const semName = (activeSemester?.nama_semester || '').toLowerCase();
  const isExplicitGenap = semName.includes('genap') || semName.includes('2');
  const isExplicitGanjil = semName.includes('ganjil') || semName.includes('gasal') || semName.includes('1');

  // Bila semester belum tersetting, gunakan kalender nasional Indonesia:
  // Bulan 7 - 12 (Juli - Desember) = Semester Ganjil
  // Bulan 1 - 6 (Januari - Juni) = Semester Genap
  const isGanjil = isExplicitGanjil ? true : isExplicitGenap ? false : (month >= 7 && month <= 12);
  const semesterLabel = isGanjil ? 'Semester Ganjil' : 'Semester Genap';

  if (isGanjil) {
    if (month >= 11 || month === 12) {
      return {
        recommendedKey: 'SAS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} berada di penghujung Semester Ganjil — waktu pelaksanaan Sumatif Akhir Semester (SAS).`,
        shortTag: 'Periode SAS (Akhir Smt 1)',
      };
    } else if (month === 9 || month === 10) {
      return {
        recommendedKey: 'STS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah periode evaluasi progres Sumatif Tengah Semester (STS) Ganjil.`,
        shortTag: 'Periode STS (Tengah Smt 1)',
      };
    } else {
      return {
        recommendedKey: 'SLM',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah awal semester — pelaksanaan Sumatif Lingkup Materi / Ulangan Bab (SLM).`,
        shortTag: 'Periode SLM (Lingkup Materi)',
      };
    }
  } else {
    // Semester Genap (Januari - Juni)
    if (tingkat === 'XII' && (month === 2 || month === 3 || month === 4)) {
      return {
        recommendedKey: 'PSAJ',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} bagi tingkat akhir (XII) adalah agenda Penilaian Sumatif Akhir Jenjang (PSAJ / Kelulusan).`,
        shortTag: 'Periode PSAJ (Tingkat XII)',
      };
    } else if (month >= 5 || month === 6) {
      return {
        recommendedKey: 'SAT',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} berada di penghujung Semester Genap — waktu pelaksanaan evaluasi kenaikan kelas (SAT).`,
        shortTag: 'Periode SAT (Kenaikan Kelas)',
      };
    } else if (month === 2 || month === 3) {
      return {
        recommendedKey: 'STS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah periode evaluasi progres Sumatif Tengah Semester (STS) Genap.`,
        shortTag: 'Periode STS (Tengah Smt 2)',
      };
    } else {
      return {
        recommendedKey: 'TRYOUT',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} awal semester genap lazim untuk Simulasi / Try Out asesmen dan persiapan ANBK.`,
        shortTag: 'Simulasi / Try Out',
      };
    }
  }
}

/**
 * Generator Otomatis Judul & Kode Bank Soal Standar
 */
export function generateAutoFillMassal(params: {
  mapelOptions: Array<{ value: string; label: string }>;
  targetMapelId: string;
  targetTingkat: string;
  targetKegiatanKey: string;
}): { kodeBank: string; judul: string } {
  const { mapelOptions, targetMapelId, targetTingkat, targetKegiatanKey } = params;
  const selectedMapel = mapelOptions.find((m) => m.value === targetMapelId);
  const mapelName = selectedMapel?.label?.split('(')[0]?.trim() || 'Mata Pelajaran';
  const year = new Date().getFullYear();
  const cleanMapelCode = (selectedMapel?.label || 'MAPEL')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase();

  const selectedDef = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === targetKegiatanKey);
  const prefix = selectedDef?.defaultPrefix || targetKegiatanKey;
  const fullOfficialName = selectedDef?.namaResmi || targetKegiatanKey;

  const generatedCode = `${prefix}-${year}-${cleanMapelCode}-${targetTingkat}`;
  const generatedTitle = `${prefix} - ${mapelName} Tingkat ${targetTingkat} (${fullOfficialName})`;

  return { kodeBank: generatedCode, judul: generatedTitle };
}

/**
 * Menghitung daftar tingkat kelas yang sah untuk asesmen tertentu
 */
export function getAllowedTingkatForAsesmen(
  scope: CbtBankSoalScope,
  jenisKegiatanKey: string
): Array<'X' | 'XI' | 'XII' | 'SEMUA'> {
  if (scope !== 'TERPUSAT_MASSAL') {
    return ['X', 'XI', 'XII', 'SEMUA'];
  }
  const def = OFFICIAL_ASESMEN_TYPES.find((t) => t.key === jenisKegiatanKey);
  return def?.allowedTingkat || ['X', 'XI', 'XII', 'SEMUA'];
}

// ==========================================
// FORM SCHEMAS (ZOD VALIDATION GUARD)
// ==========================================
export const cbtBankSoalStep1Schema = z.object({
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.enum(['X', 'XI', 'XII', 'SEMUA']),
});

export const cbtBankSoalPayloadSchema = z.object({
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  guru_id: z.string().min(1, 'Guru pembuat/penyusun soal wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.enum(['X', 'XI', 'XII', 'SEMUA']),
  alokasi_menit: z.number().int().min(10, 'Alokasi durasi minimal 10 menit').max(300),
});
