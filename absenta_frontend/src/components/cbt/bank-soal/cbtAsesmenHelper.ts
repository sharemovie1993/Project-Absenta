import { z } from 'zod';

export type CbtBankSoalScope = 'TERPUSAT_MASSAL' | 'MANDIRI_GURU';

// ==========================================
// 1. UNIVERSAL GRADE LEVEL CONVERTERS
// ==========================================

export const NUMERAL_TO_ROMAN: Record<string, string> = {
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI',
  '7': 'VII', '8': 'VIII', '9': 'IX',
  '10': 'X', '11': 'XI', '12': 'XII', '13': 'XIII',
  'I': 'I', 'II': 'II', 'III': 'III', 'IV': 'IV', 'V': 'V', 'VI': 'VI',
  'VII': 'VII', 'VIII': 'VIII', 'IX': 'IX',
  'X': 'X', 'XI': 'XI', 'XII': 'XII', 'XIII': 'XIII',
};

export const ROMAN_TO_NUMERAL: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
  'VII': 7, 'VIII': 8, 'IX': 9,
  'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9,
  '10': 10, '11': 11, '12': 12, '13': 13,
};

/**
 * Mengonversi angka tingkat (1-13) atau string ke representasi Romawi standar
 */
export function getTingkatRoman(tingkat: number | string): string {
  const key = String(tingkat).toUpperCase().trim();
  return NUMERAL_TO_ROMAN[key] || key;
}

/**
 * Mengonversi string tingkat (Romawi atau angka) ke nomor integer (1-13)
 */
export function parseTingkatToNumber(tingkat: number | string): number | undefined {
  const key = String(tingkat).toUpperCase().trim();
  return ROMAN_TO_NUMERAL[key] ?? (Number.isInteger(Number(key)) ? Number(key) : undefined);
}

/**
 * Format label visual tingkat kelas (misal: 'Kelas X', 'Kelas VII', 'Kelas I')
 */
export function formatTingkatLabel(tingkat: string | number): string {
  const rawStr = String(tingkat).toUpperCase().trim();
  if (rawStr === 'SEMUA') return 'Semua Kelas';
  const roman = getTingkatRoman(rawStr);
  return `Kelas ${roman}`;
}

export interface OfficialAsesmenType {
  key: string;
  singkatan: string;
  namaResmi: string;
  keterangan: string;
  defaultPrefix: string;
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
  },
  {
    key: 'SAT',
    singkatan: 'SAT',
    namaResmi: 'Sumatif Akhir Tahun',
    keterangan: 'Kenaikan Kelas (Sem. 2)',
    defaultPrefix: 'SAT',
    tingkatRuleExplanation: 'Khusus Kenaikan Kelas (Selain Tingkat Akhir)',
  },
  {
    key: 'STS',
    singkatan: 'STS',
    namaResmi: 'Sumatif Tengah Semester',
    keterangan: 'Tengah Semester',
    defaultPrefix: 'STS',
  },
  {
    key: 'PSAJ',
    singkatan: 'PSAJ',
    namaResmi: 'Penilaian Sumatif Akhir Jenjang',
    keterangan: 'Evaluasi Kelulusan Akhir',
    defaultPrefix: 'PSAJ',
    tingkatRuleExplanation: 'Khusus Kelulusan Tingkat Akhir',
  },
  {
    key: 'SLM',
    singkatan: 'SLM',
    namaResmi: 'Sumatif Lingkup Materi',
    keterangan: 'Ulangan Bab / TP',
    defaultPrefix: 'SLM',
  },
  {
    key: 'TRYOUT',
    singkatan: 'Simulasi',
    namaResmi: 'Simulasi / Try Out Asesmen',
    keterangan: 'Try Out & ANBK',
    defaultPrefix: 'TRYOUT',
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
 * berdasarkan kalender bulan berjalan, semester aktif, dan jenjang sekolah.
 */
export function detectSmartAsesmenType(
  activeSemester?: { nama_semester?: string; is_active?: boolean } | null,
  tingkat?: string,
  tingkatList: number[] = [10, 11, 12]
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

  const isGanjil = isExplicitGanjil ? true : isExplicitGenap ? false : (month >= 7 && month <= 12);
  const semesterLabel = isGanjil ? 'Semester Ganjil' : 'Semester Genap';

  const maxTingkatNum = tingkatList.length > 0 ? Math.max(...tingkatList) : 12;
  const currentTingkatNum = tingkat ? parseTingkatToNumber(tingkat) : undefined;
  const isFinalGrade = currentTingkatNum === maxTingkatNum;
  const finalGradeRoman = getTingkatRoman(maxTingkatNum);

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
    if (isFinalGrade && (month === 2 || month === 3 || month === 4)) {
      return {
        recommendedKey: 'PSAJ',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} bagi tingkat akhir (${finalGradeRoman}) adalah agenda Penilaian Sumatif Akhir Jenjang (PSAJ / Kelulusan).`,
        shortTag: `Periode PSAJ (Tingkat ${finalGradeRoman})`,
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
  const romanTingkat = getTingkatRoman(targetTingkat);

  const generatedCode = `${prefix}-${year}-${cleanMapelCode}-${romanTingkat}`;
  const generatedTitle = `${prefix} - ${mapelName} Tingkat ${romanTingkat} (${fullOfficialName})`;

  return { kodeBank: generatedCode, judul: generatedTitle };
}

/**
 * Menghitung daftar tingkat kelas yang sah untuk asesmen tertentu secara dinamis
 * berdasarkan jenjang sekolah (SD: 1-6, SMP: 7-9, SMA: 10-12, SMK: 10-12/13).
 */
export function getAllowedTingkatForAsesmen(
  scope: CbtBankSoalScope,
  jenisKegiatanKey: string,
  tingkatList: number[] = [10, 11, 12]
): string[] {
  const romanList = tingkatList.map((t) => getTingkatRoman(t));
  if (scope !== 'TERPUSAT_MASSAL') {
    return [...romanList, 'SEMUA'];
  }

  const maxTingkat = tingkatList.length > 0 ? Math.max(...tingkatList) : 12;
  const finalGradeRoman = getTingkatRoman(maxTingkat);

  if (jenisKegiatanKey === 'PSAJ') {
    // PSAJ hanya untuk tingkat akhir kelulusan (VI di SD, IX di SMP, XII di SMA/SMK)
    return [finalGradeRoman];
  }

  if (jenisKegiatanKey === 'SAT') {
    // SAT adalah evaluasi kenaikan kelas untuk seluruh tingkat selain tingkat akhir
    return romanList.filter((r) => r !== finalGradeRoman);
  }

  return [...romanList, 'SEMUA'];
}

// ==========================================
// FORM SCHEMAS (ZOD VALIDATION GUARD)
// ==========================================
export const cbtBankSoalStep1Schema = z.object({
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.string().min(1, 'Pilih tingkat/kelas bank soal'),
});

export const cbtBankSoalPayloadSchema = z.object({
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  guru_id: z.string().min(1, 'Guru pembuat/penyusun soal wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.string().min(1, 'Pilih tingkat/kelas bank soal'),
  alokasi_menit: z.number().int().min(10, 'Alokasi durasi minimal 10 menit').max(300),
});
