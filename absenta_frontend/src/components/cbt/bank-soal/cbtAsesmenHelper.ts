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

export const formatTingkatRomawi = getTingkatRoman;

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
  aliases?: string[];
}

/**
 * Memperoleh daftar jenis asesmen resmi disesuaikan dengan jenis jenjang sekolah.
 * Semua jenis evaluasi secara konsisten diawali dengan istilah resmi "Penilaian":
 * - PSAS: Penilaian Sumatif Akhir Semester (Semester 1 / Ganjil)
 * - PSAT: Penilaian Sumatif Akhir Tahun (Kenaikan Kelas Semester 2)
 * - PSTS: Penilaian Sumatif Tengah Semester (Tengah Semester 1 & 2)
 * - PSAJ: Penilaian Sumatif Akhir Jenjang (Kelulusan Tingkat Akhir) / AM (Asesmen Madrasah untuk Kemenag)
 * - UKK: Uji Kompetensi Keahlian (Khusus Kejuruan SMK/MAK)
 * - PSLM: Penilaian Sumatif Lingkup Materi (Ulangan Bab / Formatif-Sumatif)
 * - Simulasi: Simulasi & Try Out Asesmen
 */
export function getOfficialAsesmenTypes(jenjang?: string): OfficialAsesmenType[] {
  const normalizedJenjang = (jenjang || 'SMK').toUpperCase().trim();
  const isMadrasah = ['MI', 'MTS', 'MA', 'MAK'].includes(normalizedJenjang);
  const isKejuruan = ['SMK', 'MAK'].includes(normalizedJenjang);

  const baseTypes: OfficialAsesmenType[] = [
    {
      key: 'PSAS',
      singkatan: 'PSAS',
      namaResmi: 'Penilaian Sumatif Akhir Semester (PSAS / SAS)',
      keterangan: 'Semester 1 (Ganjil)',
      defaultPrefix: 'PSAS',
      aliases: ['SAS', 'PAS', 'UAS'],
    },
    {
      key: 'PSAT',
      singkatan: 'PSAT',
      namaResmi: 'Penilaian Sumatif Akhir Tahun (PSAT / SAT)',
      keterangan: 'Kenaikan Kelas (Sem. 2)',
      defaultPrefix: 'PSAT',
      tingkatRuleExplanation: 'Khusus Kenaikan Kelas (Selain Tingkat Akhir)',
      aliases: ['SAT', 'PAT'],
    },
    {
      key: 'PSTS',
      singkatan: 'PSTS',
      namaResmi: 'Penilaian Sumatif Tengah Semester (PSTS / STS)',
      keterangan: 'Tengah Semester',
      defaultPrefix: 'PSTS',
      aliases: ['STS', 'PTS', 'UTS'],
    },
    {
      key: isMadrasah ? 'AM' : 'PSAJ',
      singkatan: isMadrasah ? 'AM' : 'PSAJ',
      namaResmi: isMadrasah
        ? 'Penilaian Asesmen Madrasah (AM)'
        : 'Penilaian Sumatif Akhir Jenjang (PSAJ)',
      keterangan: isMadrasah ? 'Evaluasi Kelulusan Madrasah' : 'Evaluasi Kelulusan Akhir Jenjang',
      defaultPrefix: isMadrasah ? 'AM' : 'PSAJ',
      tingkatRuleExplanation: 'Khusus Kelulusan Tingkat Akhir',
      aliases: ['PSAJ', 'AM', 'ASAJ', 'US', 'USBN'],
    },
  ];

  // Tambahan khusus untuk SMK/MAK
  if (isKejuruan) {
    baseTypes.push({
      key: 'UKK',
      singkatan: 'UKK',
      namaResmi: 'Penilaian Uji Kompetensi Keahlian (UKK Teori)',
      keterangan: 'Sertifikasi Kejuruan LSP/DUDI',
      defaultPrefix: 'UKK',
      tingkatRuleExplanation: 'Khusus Kejuruan Tingkat Akhir',
      aliases: ['UKK'],
    });
  }

  // Asesmen materi & simulasi
  baseTypes.push(
    {
      key: 'PSLM',
      singkatan: 'PSLM',
      namaResmi: 'Penilaian Sumatif Lingkup Materi (PSLM / SLM)',
      keterangan: 'Ulangan Bab / TP',
      defaultPrefix: 'PSLM',
      aliases: ['SLM', 'UH'],
    },
    {
      key: 'TRYOUT',
      singkatan: 'Simulasi',
      namaResmi: 'Simulasi / Try Out Asesmen',
      keterangan: 'Try Out & ANBK',
      defaultPrefix: 'TRYOUT',
      aliases: ['TRYOUT', 'SIMULASI'],
    }
  );

  return baseTypes;
}

/**
 * Daftar default fallback untuk kompatibilitas ke belakang
 */
export const OFFICIAL_ASESMEN_TYPES: OfficialAsesmenType[] = getOfficialAsesmenTypes('SMK');

/**
 * Mencocokkan kode bank soal dengan jenis asesmen resmi secara fleksibel (mendukung alias lama & baru)
 */
export function findMatchingAsesmenType(
  code: string,
  types: OfficialAsesmenType[]
): OfficialAsesmenType | undefined {
  const upper = code.toUpperCase();
  return types.find((t) => {
    if (upper.startsWith(`${t.key}-`) || upper.startsWith(`${t.defaultPrefix}-`)) return true;
    return t.aliases?.some((a) => upper.startsWith(`${a}-`));
  });
}

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
  tingkatList: number[] = [10, 11, 12],
  jenjang?: string
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

  const isMadrasah = ['MI', 'MTS', 'MA', 'MAK'].includes((jenjang || '').toUpperCase().trim());
  const kelulusanKey = isMadrasah ? 'AM' : 'PSAJ';
  const kelulusanLabel = isMadrasah ? 'Asesmen Madrasah (AM)' : 'Penilaian Sumatif Akhir Jenjang (PSAJ)';

  if (isGanjil) {
    if (month >= 11 || month === 12) {
      return {
        recommendedKey: 'PSAS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} berada di penghujung Semester Ganjil — waktu pelaksanaan Penilaian Sumatif Akhir Semester (PSAS / SAS).`,
        shortTag: 'Periode PSAS (Akhir Smt 1)',
      };
    } else if (month === 9 || month === 10) {
      return {
        recommendedKey: 'PSTS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah periode evaluasi progres Penilaian Sumatif Tengah Semester (PSTS / STS) Ganjil.`,
        shortTag: 'Periode PSTS (Tengah Smt 1)',
      };
    } else {
      return {
        recommendedKey: 'PSLM',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah awal semester — pelaksanaan Penilaian Sumatif Lingkup Materi / Ulangan Bab (PSLM / SLM).`,
        shortTag: 'Periode PSLM (Lingkup Materi)',
      };
    }
  } else {
    // Semester Genap (Januari - Juni)
    if (isFinalGrade && (month === 2 || month === 3 || month === 4)) {
      return {
        recommendedKey: kelulusanKey,
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} bagi tingkat akhir (${finalGradeRoman}) adalah agenda evaluasi kelulusan: ${kelulusanLabel}.`,
        shortTag: `Periode ${kelulusanKey} (Tingkat ${finalGradeRoman})`,
      };
    } else if (month >= 5 || month === 6) {
      return {
        recommendedKey: 'PSAT',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} berada di penghujung Semester Genap — waktu pelaksanaan Penilaian Sumatif Akhir Tahun / Kenaikan Kelas (PSAT / SAT).`,
        shortTag: 'Periode PSAT (Kenaikan Kelas)',
      };
    } else if (month === 2 || month === 3) {
      return {
        recommendedKey: 'PSTS',
        semesterLabel,
        monthName,
        reason: `Bulan ${monthName} adalah periode evaluasi progres Penilaian Sumatif Tengah Semester (PSTS / STS) Genap.`,
        shortTag: 'Periode PSTS (Tengah Smt 2)',
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
 * Resolves standard curriculum subject acronym / short code
 * - Mapel umum panjang: Pendidikan Agama dan Budi Pekerti -> PABK, Pancasila -> PKN, Jasmani -> PJOK
 * - Produktif / Kejuruan: MPP-TKJ, DDPK-TKJ, KK-RPL tetap utuh dengan tanda hubung (tidak dipotong)
 */
export function resolveMapelShortCode(mapelLabel: string, rawMapel?: any): string {
  // 1. Cek kode resmi dari raw object jika ada
  const rawCode = (rawMapel?.kode_mapel || rawMapel?.kode || '').trim().toUpperCase();
  if (rawCode && rawCode.length >= 2 && rawCode.length <= 15) {
    if (rawCode.includes('-')) {
      return rawCode;
    }
  }

  // 2. Cek apakah di dalam label terdapat kurung berisi kode (misal: "Pendidikan Agama (PABK)" atau "(MPP-TKJ)")
  const parenMatch = mapelLabel.match(/\(([A-Za-z0-9\-_]+)\)/);
  if (parenMatch) {
    const codeInParen = parenMatch[1].trim().toUpperCase();
    if (codeInParen.length >= 2 && codeInParen.length <= 12) {
      return codeInParen;
    }
  }

  // Ambil nama mapel bersih (sebelum tanda kurung atau strip kelompok)
  const cleanName = mapelLabel.split('(')[0].split(' - [')[0].trim();
  const lower = cleanName.toLowerCase();

  // 3. Deteksi nama mapel produktif yang sudah berbentuk singkatan (misal: MPP-TKJ, DDPK-TKJ, MP-KODING-AI)
  if (/^[A-Za-z0-9]+-[A-Za-z0-9]+(-[A-Za-z0-9]+)?$/.test(cleanName)) {
    return cleanName.toUpperCase();
  }

  // 4. Kamus Resmi Singkatan Mapel Nasional (Kurikulum Merdeka & K13)
  // Agama & Budi Pekerti -> PABK / PAI / PAK / dll.
  if (lower.includes('agama') || lower.includes('budi pekerti')) {
    if (lower.includes('islam')) return 'PAI';
    if (lower.includes('kristen')) return 'PAK';
    if (lower.includes('katolik')) return 'PAKT';
    if (lower.includes('hindu')) return 'PAH';
    if (lower.includes('buddha')) return 'PAB';
    if (lower.includes('khonghucu')) return 'PAKONG';
    return 'PABK';
  }

  // Pancasila & Kewarganegaraan -> PKN
  if (lower.includes('pancasila') || lower.includes('kewarganegaraan') || lower.includes('ppkn') || lower.includes('pkn')) {
    return 'PKN';
  }

  // Penjasorkes / PJOK -> PJOK
  if (lower.includes('jasmani') || lower.includes('olahraga') || lower.includes('penjas') || lower.includes('pjok')) {
    return 'PJOK';
  }

  // Bahasa
  if (lower.includes('bahasa indonesia') || lower.includes('b. indonesia')) return 'BIND';
  if (lower.includes('bahasa inggris') || lower.includes('b. inggris')) return 'BING';
  if (lower.includes('sunda')) return 'BSUN';
  if (lower.includes('jawa')) return 'BJAW';
  if (lower.includes('arab')) return 'BARB';
  if (lower.includes('jepang')) return 'BJEP';
  if (lower.includes('mandarin')) return 'BMAND';
  if (lower.includes('jerman')) return 'BJER';

  // Matematika
  if (lower.includes('matematika') || lower.includes('mtk')) {
    if (lower.includes('lanjut') || lower.includes('peminatan')) return 'MTK-LANJUT';
    return 'MTK';
  }

  // Sains & IPAS
  if (lower.includes('ipas')) return 'IPAS';
  if (lower.includes('alam') || lower.includes('ipa')) return 'IPA';
  if (lower.includes('fisika')) return 'FIS';
  if (lower.includes('kimia')) return 'KIM';
  if (lower.includes('biologi')) return 'BIO';

  // Sosial & Humaniora
  if (lower.includes('sosial') || lower.includes('ips')) return 'IPS';
  if (lower.includes('sejarah')) return 'SEJ';
  if (lower.includes('geografi')) return 'GEO';
  if (lower.includes('ekonomi')) return 'EKO';
  if (lower.includes('sosiologi')) return 'SOS';

  // Informatika & Koding
  if (lower.includes('informatika') || lower.includes('komputer')) return 'INF';
  if (lower.includes('koding') || lower.includes('coding')) return 'KODING';

  // Seni & Prakarya
  if (lower.includes('seni musik')) return 'MUSIK';
  if (lower.includes('seni rupa')) return 'RUPA';
  if (lower.includes('seni tari')) return 'TARI';
  if (lower.includes('seni teater')) return 'TEATER';
  if (lower.includes('seni budaya') || lower.includes('seni')) return 'SBK';
  if (lower.includes('prakarya') || lower.includes('kewirausahaan') || lower.includes('pkwu')) return 'PKWU';

  // Bimbingan Konseling
  if (lower.includes('bimbingan') || lower.includes('konseling') || lower.includes('bk')) return 'BK';

  // 5. Pola Kejuruan / Produktif (DDPK, MPP, KK dengan jurusan)
  if (lower.includes('dasar') && lower.includes('kejuruan')) {
    const jur = cleanName.match(/\b(TKJ|RPL|DKV|TAV|TITL|TKRO|TBSM|OTKP|AKL|BDP|TB|PH|MM|SIJA)\b/i);
    return jur ? `DDPK-${jur[1].toUpperCase()}` : 'DDPK';
  }
  if (lower.includes('pilihan') || lower.includes('mpp')) {
    const jur = cleanName.match(/\b(TKJ|RPL|DKV|TAV|TITL|TKRO|TBSM|OTKP|AKL|BDP|TB|PH|MM|SIJA)\b/i);
    return jur ? `MPP-${jur[1].toUpperCase()}` : 'MPP';
  }
  if (lower.includes('konsentrasi') || lower.includes('kk')) {
    const jur = cleanName.match(/\b(TKJ|RPL|DKV|TAV|TITL|TKRO|TBSM|OTKP|AKL|BDP|TB|PH|MM|SIJA)\b/i);
    return jur ? `KK-${jur[1].toUpperCase()}` : 'KK';
  }

  // 6. Jika rawCode tersedia
  if (rawCode) {
    return rawCode;
  }

  // 7. Fallback cerdas: Inisial kata pertama (akronim)
  const words = cleanName.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) {
    const acronym = words
      .filter((w) => !['dan', 'untuk', 'yang', 'di', 'ke', 'dari', 'pada'].includes(w.toLowerCase()))
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    if (acronym.length >= 2 && acronym.length <= 6) {
      return acronym;
    }
  }

  // Single word: bersihkan karakter non-alphanumeric, ambil max 6 karakter
  return cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'MAPEL';
}

/**
 * Generator Otomatis Judul & Kode Bank Soal Standar
 */
export function generateAutoFillMassal(params: {
  mapelOptions: Array<{ value: string; label: string; raw?: any }>;
  targetMapelId: string;
  targetTingkat: string;
  targetKegiatanKey: string;
  targetJurusan?: string;
  jenjang?: string;
  isShared?: boolean;
  eventPrefix?: string;
}): { kodeBank: string; judul: string } {
  const { mapelOptions, targetMapelId, targetTingkat, targetKegiatanKey, targetJurusan, jenjang, isShared, eventPrefix } = params;
  const selectedMapel = mapelOptions.find((m) => m.value === targetMapelId);
  const mapelLabel = selectedMapel?.label || 'Mata Pelajaran';
  const mapelName = mapelLabel.split('(')[0]?.trim() || 'Mata Pelajaran';
  const year = new Date().getFullYear();

  const mapelShortCode = resolveMapelShortCode(mapelLabel, selectedMapel?.raw);

  const allTypes = getOfficialAsesmenTypes(jenjang);
  const selectedDef = allTypes.find((t) => t.key === targetKegiatanKey);
  const cleanEventPrefix = (eventPrefix || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const prefix = cleanEventPrefix || selectedDef?.defaultPrefix || targetKegiatanKey;
  const romanTingkat = getTingkatRoman(targetTingkat);
  const isSemua = !targetTingkat || targetTingkat.toUpperCase() === 'SEMUA';

  const cleanJurusan = (targetJurusan || '').trim().toUpperCase();
  const jurCodePart = cleanJurusan ? cleanJurusan.replace(/[,;\s|]+/g, '-').replace(/-+/g, '-') : '';
  const jurSuffix = jurCodePart ? `-${jurCodePart}` : '';
  const jurTitle = cleanJurusan ? ` (${cleanJurusan})` : '';
  const mandiriSuffix = isShared === false ? '-M' : '';

  const generatedCode = isSemua
    ? `${prefix}-${year}-${mapelShortCode}${jurSuffix}${mandiriSuffix}`
    : `${prefix}-${year}-${mapelShortCode}-${romanTingkat}${jurSuffix}${mandiriSuffix}`;
  const generatedTitle = isSemua
    ? `${prefix} - ${mapelName}${jurTitle}`
    : `${prefix} - ${mapelName} Tingkat ${romanTingkat}${jurTitle}`;

  return { kodeBank: generatedCode, judul: generatedTitle };
}

/**
 * Normalisasi Display Judul Bank Soal:
 * Membersihkan kurung siku event panjang yang di-generate panitia (misal: '[Asesmen Sumatif Akhir Semester (ASAS) Ganjil] MP-KODING AI Tingkat 10')
 * menjadi format standar ringkas yang rapi dan konsisten: 'PSAS - MP-KODING AI Tingkat X'.
 */
export function formatDisplayJudulBankSoal(rawJudul?: string | null, kodeBank?: string | null, tingkat?: string | number | null): string {
  if (!rawJudul) return '-';
  const trimmed = rawJudul.trim();

  if (trimmed.startsWith('[')) {
    // Ambil isi teks setelah kurung siku penutup ]
    const afterBracket = trimmed.replace(/^\[[^\]]+\]\s*/i, '').trim();

    // Tentukan prefix standar dari kode bank atau event di kurung siku
    let resolvedPrefix = 'PSAS';
    const codeUpper = (kodeBank || '').toUpperCase();
    if (codeUpper.startsWith('PSAT-') || codeUpper.startsWith('SAT-') || codeUpper.startsWith('PAT-')) {
      resolvedPrefix = 'PSAT';
    } else if (codeUpper.startsWith('PSTS-') || codeUpper.startsWith('STS-') || codeUpper.startsWith('PTS-')) {
      resolvedPrefix = 'PSTS';
    } else if (codeUpper.startsWith('PSAJ-') || codeUpper.startsWith('AM-') || codeUpper.startsWith('US-')) {
      resolvedPrefix = 'PSAJ';
    } else if (codeUpper.startsWith('UKK-')) {
      resolvedPrefix = 'UKK';
    } else if (codeUpper.startsWith('TRYOUT-') || codeUpper.startsWith('SIMULASI-')) {
      resolvedPrefix = 'TRYOUT';
    } else if (codeUpper.startsWith('PSAS-') || codeUpper.startsWith('SAS-') || codeUpper.startsWith('PAS-')) {
      resolvedPrefix = 'PSAS';
    } else {
      // Cek isi dalam kurung siku
      const bracketMatch = trimmed.match(/^\[([^\]]+)\]/);
      const bracketContent = (bracketMatch ? bracketMatch[1] : '').toUpperCase();
      if (bracketContent.includes('AKHIR TAHUN') || bracketContent.includes('PSAT') || bracketContent.includes('KENAIKAN')) {
        resolvedPrefix = 'PSAT';
      } else if (bracketContent.includes('TENGAH') || bracketContent.includes('PSTS') || bracketContent.includes('PTS')) {
        resolvedPrefix = 'PSTS';
      } else if (bracketContent.includes('JENJANG') || bracketContent.includes('PSAJ') || bracketContent.includes('KELULUSAN')) {
        resolvedPrefix = 'PSAJ';
      } else if (bracketContent.includes('UKK')) {
        resolvedPrefix = 'UKK';
      }
    }

    // Normalisasi 'Tingkat 10/11/12' menjadi Romawi 'Tingkat X/XI/XII'
    const normalizedBody = afterBracket
      .replace(/\bTingkat\s+10\b/gi, 'Tingkat X')
      .replace(/\bTingkat\s+11\b/gi, 'Tingkat XI')
      .replace(/\bTingkat\s+12\b/gi, 'Tingkat XII')
      .replace(/\bTingkat\s+13\b/gi, 'Tingkat XIII');

    return `${resolvedPrefix} - ${normalizedBody}`;
  }

  // Jika judul tidak diawali kurung siku, pastikan tingkat angka dinormalisasi ke Romawi
  return trimmed
    .replace(/\bTingkat\s+10\b/gi, 'Tingkat X')
    .replace(/\bTingkat\s+11\b/gi, 'Tingkat XI')
    .replace(/\bTingkat\s+12\b/gi, 'Tingkat XII');
}

/**
 * SSOT: Resolusi Prefix Kanonikal Event Asesmen CBT (PSAS, PSAT, PSTS, PSAJ, UKK, TRYOUT)
 * Menerima sembarang input (teks panjang event, kode event, dsb) dan mengembalikan singkatan baku resmi.
 */
export function resolveCbtEventPrefix(rawEventName?: string | null, rawEventCode?: string | null): string {
  const combined = `${rawEventCode || ''} ${rawEventName || ''}`.toUpperCase().trim();
  if (!combined) return 'PSAS';

  if (combined.includes('AKHIR TAHUN') || combined.includes('KENAIKAN') || /\b(PSAT|SAT|PAT)\b/i.test(combined)) {
    return 'PSAT';
  }
  if (combined.includes('TENGAH') || /\b(PSTS|STS|PTS|UTS)\b/i.test(combined)) {
    return 'PSTS';
  }
  if (combined.includes('AKHIR JENJANG') || combined.includes('KELULUSAN') || /\b(PSAJ|AM|US|USBN)\b/i.test(combined)) {
    return 'PSAJ';
  }
  if (combined.includes('KEJURUAN') || /\bUKK\b/i.test(combined)) {
    return 'UKK';
  }
  if (combined.includes('SIMULASI') || combined.includes('TRYOUT') || /\b(TRY OUT|TRYOUT)\b/i.test(combined)) {
    return 'TRYOUT';
  }
  // Default Semester 1 / Ganjil / Akhir Semester
  return 'PSAS';
}

/**
 * SSOT: Label Ringkas Event untuk Badge / Pill di UI (misal: 'PSAS Ganjil', 'PSAT Genap')
 */
export function resolveCbtEventShortPill(rawEventName?: string | null, rawEventCode?: string | null): string {
  const prefix = resolveCbtEventPrefix(rawEventName, rawEventCode);
  const combined = `${rawEventCode || ''} ${rawEventName || ''}`.toUpperCase().trim();
  const isGenap = combined.includes('GENAP') || combined.includes('SEM. 2') || combined.includes('SEMESTER 2');

  if (prefix === 'PSAS') return isGenap ? 'PSAS Genap' : 'PSAS Ganjil';
  if (prefix === 'PSAT') return 'PSAT Genap';
  if (prefix === 'PSTS') return isGenap ? 'PSTS Genap' : 'PSTS Ganjil';
  return prefix;
}

/**
 * SSOT: Generator Nama Sesi Ujian Standar Terpusat Panitia
 * Format Baku: {PREFIX} - {MAPEL} [({JURUSAN})] ({KELAS} - {RUANG})
 * Contoh: 'PSAS - MP-KODING AI (TOI) (X TJKT 2 - R.06)'
 */
export function formatCanonicalSesiUjian(params: {
  eventPrefix?: string | null;
  eventName?: string | null;
  eventCode?: string | null;
  mapelName: string;
  targetJurusan?: string | null;
  namaKelas: string;
  slotRuang: string;
}): string {
  const { eventPrefix, eventName, eventCode, mapelName, targetJurusan, namaKelas, slotRuang } = params;
  const cleanPrefix = resolveCbtEventPrefix(eventPrefix || eventName, eventCode);
  const cleanJurusan = (targetJurusan || '').trim().toUpperCase();
  const jurTag = cleanJurusan && cleanJurusan !== 'SEMUA' && cleanJurusan !== 'UMUM' ? ` (${cleanJurusan})` : '';
  const cleanMapel = mapelName.trim();

  return `${cleanPrefix} - ${cleanMapel}${jurTag} (${namaKelas} - ${slotRuang})`;
}

/**
 * Menghitung daftar tingkat kelas yang sah untuk asesmen tertentu secara dinamis
 * berdasarkan jenjang sekolah (SD: 1-6, SMP: 7-9, SMA: 10-12, SMK: 10-12/13).
 */
export function getAllowedTingkatForAsesmen(
  scope: CbtBankSoalScope,
  jenisKegiatanKey: string,
  tingkatList: number[] = [10, 11, 12],
  jenjang?: string
): string[] {
  const romanList = tingkatList.map((t) => getTingkatRoman(t));
  if (scope !== 'TERPUSAT_MASSAL') {
    return [...romanList, 'SEMUA'];
  }

  const maxTingkat = tingkatList.length > 0 ? Math.max(...tingkatList) : 12;
  const finalGradeRoman = getTingkatRoman(maxTingkat);

  // Evaluasi kelulusan tingkat akhir (PSAJ, AM, atau UKK Teori Kejuruan)
  if (jenisKegiatanKey === 'PSAJ' || jenisKegiatanKey === 'AM' || jenisKegiatanKey === 'UKK') {
    return [finalGradeRoman];
  }

  // Evaluasi kenaikan kelas (PSAT / SAT)
  if (jenisKegiatanKey === 'PSAT' || jenisKegiatanKey === 'SAT') {
    return romanList.filter((r) => r !== finalGradeRoman);
  }

  return [...romanList, 'SEMUA'];
}

// ==========================================
// FORM SCHEMAS (ZOD VALIDATION GUARD)
// ==========================================
export const cbtBankSoalStep1Schema = z.object({
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.string().min(1, 'Tingkat kelas sasaran wajib dipilih (X, XI, atau XII)'),
});

export const cbtBankSoalPayloadSchema = z.object({
  kode_bank: z.string().min(2, 'Kode bank soal minimal 2 karakter').max(50),
  judul: z.string().min(3, 'Judul bank soal minimal 3 karakter').max(200),
  guru_id: z.string().min(1, 'Guru pembuat/penyusun soal wajib dipilih'),
  mapel_id: z.string().min(1, 'Mata pelajaran wajib dipilih'),
  tingkat: z.string().min(1, 'Tingkat kelas sasaran wajib dipilih (X, XI, atau XII)'),
  jurusan: z.string().optional().nullable(),
  alokasi_menit: z.number().int().min(10, 'Alokasi durasi minimal 10 menit').max(300),
});

// ==========================================
// 6. VOCATIONAL JURUSAN SYNONYMS & MATCHING
// ==========================================

export const VOCATIONAL_SYNONYMS: Record<string, string[]> = {
  TKJ: ['TJKT', 'TKJ', 'KOMPUTER', 'JARINGAN'],
  TKR: ['TO', 'TKR', 'OTOMOTIF', 'KENDARAAN'],
  TSM: ['TO', 'TSM', 'SEPEDA', 'MOTOR', 'TBSM'],
  TOI: ['TE', 'TOI', 'OTOMASI', 'INDUSTRI'],
  TAV: ['TE', 'TAV', 'AUDIO', 'VIDEO'],
  TP: ['TM', 'TP', 'MESIN', 'PEMESINAN'],
  AKL: ['AKL', 'AK', 'AKUNTANSI'],
  PHT: ['PHT', 'AP', 'HOTEL', 'PERHOTELAN'],
  KUL: ['KUL', 'TB', 'KULINER', 'BOGA', 'TATA BOGA'],
};

/**
 * Memeriksa apakah penugasan mengajar (GuruMapel) cocok dengan target jurusan tertentu.
 * Mendukung pencocokan presisi via:
 * 1. Kode / Singkatan Jurusan resmi (Kelas.Jurusan atau GM.Jurusan)
 * 2. ID Jurusan resmi
 * 3. Nama resmi Jurusan
 * 4. Sinonim Rombel Kurikulum Merdeka (misal 'X TJKT 2' <-> 'TKJ', 'X TM 1' <-> 'TP', 'X TE 3' <-> 'TOI')
 */
export function isAssignmentMatchingJurusan(
  gm: any,
  targetJurusanTokens: string[]
): boolean {
  if (
    targetJurusanTokens.length === 0 ||
    targetJurusanTokens.includes('SEMUA') ||
    targetJurusanTokens.includes('UMUM')
  ) {
    return true;
  }

  const kName = String(gm.Kelas?.nama_kelas || '').toUpperCase().trim();
  const jurObj = gm.Kelas?.Jurusan || gm.Jurusan;

  const candidateCodes = [
    jurObj?.kode,
    jurObj?.singkatan,
    jurObj?.kode_jurusan,
    gm.Jurusan?.kode,
    gm.Jurusan?.singkatan,
    gm.Kelas?.Jurusan?.kode,
    gm.Kelas?.Jurusan?.singkatan,
  ]
    .filter(Boolean)
    .map((s) => String(s).toUpperCase().trim());

  const candidateNames = [
    jurObj?.nama,
    gm.Jurusan?.nama,
    gm.Kelas?.Jurusan?.nama,
  ]
    .filter(Boolean)
    .map((s) => String(s).toUpperCase().trim())
    .filter((s) => s.length >= 3);

  const candidateIds = [
    jurObj?.id,
    gm.jurusan_id,
    gm.Kelas?.jurusan_id,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());

  return targetJurusanTokens.some((rawTok) => {
    const tok = rawTok.toUpperCase().trim();
    if (!tok) return false;

    // 1. Cocok persis dengan kode/singkatan jurusan (misal 'TKJ', 'TP', 'TOI', 'AKL')
    if (candidateCodes.includes(tok)) return true;

    // 2. Cocok dengan ID jurusan
    if (candidateIds.includes(rawTok.trim())) return true;

    // 3. Cocok dengan nama panjang jurusan (misal 'TEKNIK KOMPUTER DAN JARINGAN')
    if (candidateNames.some((name) => name.includes(tok))) return true;

    // 4. Fallback regex kata pada nama kelas (misal 'X AKL 1' -> match 'AKL')
    if (kName && new RegExp(`\\b${tok}\\b`, 'i').test(kName)) return true;

    // 5. Cocok via kamus sinonim vokasi Kurikulum Merdeka (misal target 'TKJ' mencocokkan rombel 'X TJKT 2')
    const synonyms = VOCATIONAL_SYNONYMS[tok];
    if (synonyms) {
      const matchSynOnClass = synonyms.some((syn) => kName && new RegExp(`\\b${syn}\\b`, 'i').test(kName));
      // Jika nama kelas memakai generic rombel (misal TO/TE/TM), verifikasi dengan candidateCodes
      if (matchSynOnClass && candidateCodes.length > 0) {
        return candidateCodes.includes(tok);
      }
      if (matchSynOnClass) return true;
    }

    return false;
  });
}
