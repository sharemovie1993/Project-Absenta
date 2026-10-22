/**
 * UKK REGULATORY REGISTRY (Multi-Edition Historical Compliance Engine)
 *
 * Dirancang untuk mendukung fleksibilitas regulasi pemerintah yang berubah per tahun ajaran.
 * Sesuai:
 * - Pedoman UKK 2026 (Direktorat SMK Kemendikdasmen RI, 5 Januari 2026)
 * - Pedoman UKK 2022/2023 & 2023/2024 (Direktorat SMK Kemendikbudristek RI, e-Rapor SMK v6)
 */

export interface UkkThresholdItem {
  min: number;
  max: number;
  labelId: string;
  labelEn: string;
  badgeClass: string;
}

export interface UkkRegulatoryEdition {
  id: string; // e.g. '2026', '2023_2024', '2025'
  label: string;
  tahunAjaranDefault: string;
  dasarHukum: string[];
  masaBerlakuTahun: number;
  klausulMasaBerlakuId: string;
  klausulMasaBerlakuEn: string;

  // Bilingual Phrases
  titleId: string;
  titleEn: string;
  statementId: string;
  statementEn: string;
  hasTakenId: string;
  hasTakenEn: string;
  competencyPrefixId: string;
  competencyPrefixEn: string;

  // Signatures
  labelTtdKepalaSekolah: string;
  labelTtdKepalaSekolahEn: string;

  // Thresholds
  thresholdMandiri: {
    sangatKompeten: UkkThresholdItem;
    kompeten: UkkThresholdItem;
    cukupKompeten: UkkThresholdItem;
    belumKompeten: UkkThresholdItem;
  };
  thresholdLsp: {
    sangatKompeten?: UkkThresholdItem;
    kompeten: UkkThresholdItem;
    belumKompeten: UkkThresholdItem;
  };
}

export const UKK_REGULATORY_EDITIONS: Record<string, UkkRegulatoryEdition> = {
  // =========================================================================
  // 1. EDISI 2026: PEDOMAN KEMENDIKDASMEN TERBARU (5 JANUARI 2026)
  // =========================================================================
  '2026': {
    id: '2026',
    label: 'Pedoman Kemendikdasmen 2026 (Resmi Terbaru)',
    tahunAjaranDefault: '2025/2026',
    dasarHukum: [
      'Peraturan Pemerintah No. 4 Tahun 2022 tentang Standar Nasional Pendidikan',
      'Permendikdasmen No. 1 Tahun 2024 tentang Organisasi & Tata Kerja Kemendikdasmen',
      'Permendikbudristek No. 21 Tahun 2022 tentang Standar Penilaian Pendidikan',
      'Kepmendikbudristek No. 244/M/2024 tentang Spektrum Keahlian SMK',
      'Perpres No. 188 Tahun 2024 tentang Kementerian Pendidikan Dasar dan Menengah',
      'Surat Keputusan Direktur SMK tentang Pedoman Penyelenggaraan UKK 2026 (5 Jan 2026)',
    ],
    masaBerlakuTahun: 3,
    klausulMasaBerlakuId: 'Sertifikat ini berlaku untuk : 3 (tiga) Tahun',
    klausulMasaBerlakuEn: 'This certificate is valid for : 3 (three) Years',

    titleId: 'SERTIFIKAT KOMPETENSI',
    titleEn: 'COMPETENCY CERTIFICATE',
    statementId: 'Dengan ini menyatakan bahwa,',
    statementEn: 'Hereby declare that',
    hasTakenId: 'Telah mengikuti Uji Kompetensi Keahlian',
    hasTakenEn: 'Has taken the skills competency test',
    competencyPrefixId: 'pada Kompetensi /Konsentrasi Keahlian',
    competencyPrefixEn: 'on Competency of',

    labelTtdKepalaSekolah: 'Atas nama',
    labelTtdKepalaSekolahEn: 'On behalf of',

    // Ambang Nilai Sesuai Pedoman 2026 Hal. 15
    thresholdMandiri: {
      sangatKompeten: {
        min: 91,
        max: 100,
        labelId: 'Sangat Kompeten',
        labelEn: 'Very Competent',
        badgeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800',
      },
      kompeten: {
        min: 75,
        max: 90,
        labelId: 'Kompeten',
        labelEn: 'Competent',
        badgeClass: 'border-blue-600 bg-blue-50 text-blue-800',
      },
      cukupKompeten: {
        min: 61,
        max: 74,
        labelId: 'Cukup Kompeten',
        labelEn: 'Fairly Competent',
        badgeClass: 'border-amber-600 bg-amber-50 text-amber-800',
      },
      belumKompeten: {
        min: 0,
        max: 60,
        labelId: 'Belum Kompeten',
        labelEn: 'Not Yet Competent',
        badgeClass: 'border-rose-600 bg-rose-50 text-rose-800',
      },
    },
    thresholdLsp: {
      kompeten: {
        min: 75,
        max: 100,
        labelId: 'Kompeten',
        labelEn: 'Competent',
        badgeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800',
      },
      belumKompeten: {
        min: 0,
        max: 74,
        labelId: 'Belum Kompeten',
        labelEn: 'Not Yet Competent',
        badgeClass: 'border-rose-600 bg-rose-50 text-rose-800',
      },
    },
  },

  // =========================================================================
  // 2. EDISI 2023 - 2024: PEDOMAN KEMENDIKBUDRISTEK RESMI (e-Rapor SMK v6)
  //    Sesuai Dokumen Resmi Januari 2023 (Hal 16-17 & Contoh Sertifikat Hal 20)
  // =========================================================================
  '2023_2024': {
    id: '2023_2024',
    label: 'Pedoman Kemendikbudristek TA 2023/2024 (e-Rapor SMK v6)',
    tahunAjaranDefault: '2023/2024',
    dasarHukum: [
      'Peraturan Pemerintah No. 4 Tahun 2022 tentang Standar Nasional Pendidikan',
      'Permendikbudristek No. 21 Tahun 2022 tentang Standar Penilaian Pendidikan',
      'Kepmendikbudristek No. 262/M/2022 tentang Pedoman Penerapan Kurikulum',
      'Pedoman Penyelenggaraan Uji Kompetensi Keahlian SMK Tahun 2023',
    ],
    masaBerlakuTahun: 3,
    klausulMasaBerlakuId: 'Sertifikat ini berlaku untuk : 3 (tiga) Tahun',
    klausulMasaBerlakuEn: 'This certificate is valid for : 3 (three) Years',

    // Frasa Resmi Bilingual Sesuai Hal 20 Dokumen 2023
    titleId: 'SERTIFIKAT KOMPETENSI',
    titleEn: 'CERTIFICATE OF COMPETENCY',
    statementId: 'Dengan ini menyatakan bahwa,',
    statementEn: 'This is to certify that',
    hasTakenId: 'Telah mengikuti Uji Kompetensi Keahlian',
    hasTakenEn: 'has taken the competency test',
    competencyPrefixId: 'pada Kompetensi Keahlian',
    competencyPrefixEn: 'in Competency of',

    labelTtdKepalaSekolah: 'Atas nama',
    labelTtdKepalaSekolahEn: 'On behalf of',

    // Ambang Nilai Sesuai Pedoman 2023 Hal. 17 (91-100 Sangat, 80-90 Kompeten, 70-79 Cukup)
    thresholdMandiri: {
      sangatKompeten: {
        min: 91,
        max: 100,
        labelId: 'Sangat Kompeten',
        labelEn: 'Very Competent',
        badgeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800',
      },
      kompeten: {
        min: 80,
        max: 90,
        labelId: 'Kompeten',
        labelEn: 'Competent',
        badgeClass: 'border-blue-600 bg-blue-50 text-blue-800',
      },
      cukupKompeten: {
        min: 70,
        max: 79,
        labelId: 'Cukup Kompeten',
        labelEn: 'Fairly Competent',
        badgeClass: 'border-amber-600 bg-amber-50 text-amber-800',
      },
      belumKompeten: {
        min: 0,
        max: 69,
        labelId: 'Belum Kompeten',
        labelEn: 'Not Yet Competent',
        badgeClass: 'border-rose-600 bg-rose-50 text-rose-800',
      },
    },
    // Ambang Nilai LSP Sesuai Hal. 16
    thresholdLsp: {
      sangatKompeten: {
        min: 91,
        max: 100,
        labelId: 'Sangat Kompeten',
        labelEn: 'Very Competent',
        badgeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800',
      },
      kompeten: {
        min: 80,
        max: 90,
        labelId: 'Kompeten',
        labelEn: 'Competent',
        badgeClass: 'border-blue-600 bg-blue-50 text-blue-800',
      },
      belumKompeten: {
        min: 0,
        max: 79,
        labelId: 'Belum Kompeten',
        labelEn: 'Not Yet Competent',
        badgeClass: 'border-rose-600 bg-rose-50 text-rose-800',
      },
    },
  },

  // =========================================================================
  // 3. EDISI 2024/2025: TRANSISI SPEKTRUM KEAHLIAN 244/M
  // =========================================================================
  '2025': {
    id: '2025',
    label: 'Pedoman Kemendikbudristek TA 2024/2025 (Transisi Spektrum)',
    tahunAjaranDefault: '2024/2025',
    dasarHukum: [
      'Permendikbudristek No. 12 Tahun 2024 tentang Kurikulum Merdeka Nasional',
      'Kepmendikbudristek No. 244/M/2024 tentang Spektrum Keahlian SMK',
    ],
    masaBerlakuTahun: 3,
    klausulMasaBerlakuId: 'Sertifikat ini berlaku untuk : 3 (tiga) Tahun',
    klausulMasaBerlakuEn: 'This certificate is valid for : 3 (three) Years',

    titleId: 'SERTIFIKAT KOMPETENSI',
    titleEn: 'COMPETENCY CERTIFICATE',
    statementId: 'Dengan ini menyatakan bahwa,',
    statementEn: 'This is to certify that',
    hasTakenId: 'Telah mengikuti Uji Kompetensi Keahlian',
    hasTakenEn: 'has taken the skills competency test',
    competencyPrefixId: 'pada Konsentrasi Keahlian',
    competencyPrefixEn: 'in Concentration of',

    labelTtdKepalaSekolah: 'Atas nama',
    labelTtdKepalaSekolahEn: 'On behalf of',

    thresholdMandiri: {
      sangatKompeten: {
        min: 91,
        max: 100,
        labelId: 'Sangat Kompeten',
        labelEn: 'Very Competent',
        badgeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800',
      },
      kompeten: {
        min: 75,
        max: 90,
        labelId: 'Kompeten',
        labelEn: 'Competent',
        badgeClass: 'border-blue-600 bg-blue-50 text-blue-800',
      },
      cukupKompeten: {
        min: 65,
        max: 74,
        labelId: 'Cukup Kompeten',
        labelEn: 'Fairly Competent',
        badgeClass: 'border-amber-600 bg-amber-50 text-amber-800',
      },
      belumKompeten: {
        min: 0,
        max: 64,
        labelId: 'Belum Kompeten',
        labelEn: 'Not Yet Competent',
        badgeClass: 'border-rose-600 bg-rose-50 text-rose-800',
      },
    },
    thresholdLsp: {
      kompeten: {
        min: 75,
        max: 100,
        labelId: 'Kompeten',
        labelEn: 'Competent',
        badgeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800',
      },
      belumKompeten: {
        min: 0,
        max: 74,
        labelId: 'Belum Kompeten',
        labelEn: 'Not Yet Competent',
        badgeClass: 'border-rose-600 bg-rose-50 text-rose-800',
      },
    },
  },
};

/**
 * Resolve Regulatory Edition based on editionId, year string, or defaults to latest 2026
 */
export const getUkkRegulatoryEdition = (editionIdOrYear?: string): UkkRegulatoryEdition => {
  if (!editionIdOrYear) return UKK_REGULATORY_EDITIONS['2026'];

  const clean = String(editionIdOrYear).toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (clean.includes('2022') || clean.includes('2023') || clean.includes('22_23') || clean.includes('23_24')) {
    return UKK_REGULATORY_EDITIONS['2023_2024'];
  }
  if (clean.includes('2024') || clean.includes('2025') || clean.includes('24_25')) {
    return UKK_REGULATORY_EDITIONS['2025'];
  }
  return UKK_REGULATORY_EDITIONS['2026'];
};

/**
 * List all available regulatory editions for select dropdowns
 */
export const getAvailableRegulatoryEditions = (): { id: string; label: string }[] => {
  return Object.values(UKK_REGULATORY_EDITIONS).map((e) => ({
    id: e.id,
    label: e.label,
  }));
};

/**
 * Calculate Predikat mathematically based on score and regulatory edition
 */
export const calculateUkkPredikat = (
  score: number | string | null | undefined,
  editionId = '2026',
  isLsp = false
): {
  predikatId: string;
  predikatEn: string;
  isKompeten: boolean;
  badgeClass: string;
} => {
  const numericScore = typeof score === 'number' ? score : Number(score) || 0;
  const edition = getUkkRegulatoryEdition(editionId);

  if (isLsp) {
    if (edition.thresholdLsp.sangatKompeten && numericScore >= edition.thresholdLsp.sangatKompeten.min) {
      return {
        predikatId: edition.thresholdLsp.sangatKompeten.labelId,
        predikatEn: edition.thresholdLsp.sangatKompeten.labelEn,
        isKompeten: true,
        badgeClass: edition.thresholdLsp.sangatKompeten.badgeClass,
      };
    }
    if (numericScore >= edition.thresholdLsp.kompeten.min) {
      return {
        predikatId: edition.thresholdLsp.kompeten.labelId,
        predikatEn: edition.thresholdLsp.kompeten.labelEn,
        isKompeten: true,
        badgeClass: edition.thresholdLsp.kompeten.badgeClass,
      };
    }
    return {
      predikatId: edition.thresholdLsp.belumKompeten.labelId,
      predikatEn: edition.thresholdLsp.belumKompeten.labelEn,
      isKompeten: false,
      badgeClass: edition.thresholdLsp.belumKompeten.badgeClass,
    };
  }

  // Mandiri scheme
  const { sangatKompeten, kompeten, cukupKompeten, belumKompeten } = edition.thresholdMandiri;

  if (numericScore >= sangatKompeten.min) {
    return {
      predikatId: sangatKompeten.labelId,
      predikatEn: sangatKompeten.labelEn,
      isKompeten: true,
      badgeClass: sangatKompeten.badgeClass,
    };
  }
  if (numericScore >= kompeten.min) {
    return {
      predikatId: kompeten.labelId,
      predikatEn: kompeten.labelEn,
      isKompeten: true,
      badgeClass: kompeten.badgeClass,
    };
  }
  if (numericScore >= cukupKompeten.min) {
    return {
      predikatId: cukupKompeten.labelId,
      predikatEn: cukupKompeten.labelEn,
      isKompeten: true,
      badgeClass: cukupKompeten.badgeClass,
    };
  }
  return {
    predikatId: belumKompeten.labelId,
    predikatEn: belumKompeten.labelEn,
    isKompeten: false,
    badgeClass: belumKompeten.badgeClass,
  };
};
