/**
 * Absenta Spasial Engine - Tingkat Class & Color Differentiation Helper
 * 
 * Membedakan kartu ruangan denah berdasarkan tingkat kelas (Tingkat 10/X, Tingkat 11/XI, Tingkat 12/XII)
 * agar visualisasi layout kampus dan plotting ruangan ujian langsung terbaca jelas secara visual.
 */

export interface TingkatVisualMeta {
  name: string;
  badgeLabel: string;
  bg: string;
  border: string;
  text: string;
  badge: string;
  subtext: string;
  accent: string;
  glow: string;
  legendColor: string;
}

export const TINGKAT_STYLES: Record<number, TingkatVisualMeta> = {
  10: {
    name: 'Tingkat X (10)',
    badgeLabel: 'TK. X',
    bg: 'bg-sky-50/90 dark:bg-sky-950/50',
    border: 'border-2 border-sky-400 dark:border-sky-500 hover:border-sky-500',
    text: 'text-sky-950 dark:text-sky-100',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/80 dark:text-sky-200 border border-sky-200/90 dark:border-sky-800',
    subtext: 'text-sky-900 dark:text-sky-200 font-black',
    accent: 'text-sky-600 dark:text-sky-400',
    glow: 'shadow-[0_2px_10px_rgba(14,165,233,0.18)]',
    legendColor: 'bg-sky-500',
  },
  11: {
    name: 'Tingkat XI (11)',
    badgeLabel: 'TK. XI',
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/50',
    border: 'border-2 border-emerald-500 dark:border-emerald-500 hover:border-emerald-600',
    text: 'text-emerald-950 dark:text-emerald-100',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-200/90 dark:border-emerald-800',
    subtext: 'text-emerald-900 dark:text-emerald-200 font-black',
    accent: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-[0_2px_10px_rgba(16,185,129,0.18)]',
    legendColor: 'bg-emerald-500',
  },
  12: {
    name: 'Tingkat XII (12)',
    badgeLabel: 'TK. XII',
    bg: 'bg-amber-50/90 dark:bg-amber-950/50',
    border: 'border-2 border-amber-500 dark:border-amber-500 hover:border-amber-600',
    text: 'text-amber-950 dark:text-amber-100',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-200/90 dark:border-amber-800',
    subtext: 'text-amber-900 dark:text-amber-200 font-black',
    accent: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-[0_2px_10px_rgba(245,158,11,0.18)]',
    legendColor: 'bg-amber-500',
  },
  13: {
    name: 'Tingkat XIII (13)',
    badgeLabel: 'TK. XIII',
    bg: 'bg-purple-50/90 dark:bg-purple-950/50',
    border: 'border-2 border-purple-500 dark:border-purple-500 hover:border-purple-600',
    text: 'text-purple-950 dark:text-purple-100',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200 border border-purple-200/90 dark:border-purple-800',
    subtext: 'text-purple-900 dark:text-purple-200 font-black',
    accent: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-[0_2px_10px_rgba(168,85,247,0.18)]',
    legendColor: 'bg-purple-500',
  },
};

export const PRINT_TINGKAT_STYLES: Record<
  number,
  { bg: string; border: string; text: string; subtext: string; badge: string; badgeText: string }
> = {
  10: {
    bg: '#f0f9ff', // sky-50
    border: '#0284c7', // sky-600
    text: '#0c4a6e', // sky-900
    subtext: '#0369a1', // sky-700
    badge: '#e0f2fe', // sky-100
    badgeText: '#0369a1',
  },
  11: {
    bg: '#ecfdf5', // emerald-50
    border: '#059669', // emerald-600
    text: '#064e3b', // emerald-900
    subtext: '#047857', // emerald-700
    badge: '#d1fae5', // emerald-100
    badgeText: '#047857',
  },
  12: {
    bg: '#fffbeb', // amber-50
    border: '#d97706', // amber-600
    text: '#78350f', // amber-900
    subtext: '#b45309', // amber-700
    badge: '#fef3c7', // amber-100
    badgeText: '#b45309',
  },
  13: {
    bg: '#faf5ff', // purple-50
    border: '#9333ea', // purple-600
    text: '#581c87', // purple-900
    subtext: '#7e22ce', // purple-700
    badge: '#f3e8ff', // purple-100
    badgeText: '#7e22ce',
  },
};

/**
 * Deteksi tingkat kelas dari node denah secara cerdas & tahan banting.
 * Memeriksa property `tingkat`, serta pola teks pada `label_sub`, `catatan`, dan `label_utama`.
 */
export function detectNodeTingkat(node: {
  tingkat?: number;
  label_sub?: string;
  catatan?: string;
  label_utama?: string;
}): number | null {
  if (typeof node.tingkat === 'number' && node.tingkat >= 10 && node.tingkat <= 13) {
    return node.tingkat;
  }

  // Gabungkan seluruh teks deskriptif
  const rawText = `${node.label_sub || ''} ${node.catatan || ''} ${node.label_utama || ''}`.trim();
  if (!rawText) return null;

  const upper = rawText.toUpperCase();

  // 1. Deteksi Tingkat 13 (SMK 4 Tahun)
  if (/\b(XIII|13|TINGKAT 13|KELAS 13|KELAS XIII)\b/.test(upper)) {
    return 13;
  }

  // 2. Deteksi Tingkat 12 (XII)
  if (/\b(XII|12|TINGKAT 12|KELAS 12|KELAS XII)\b/.test(upper)) {
    return 12;
  }

  // 3. Deteksi Tingkat 11 (XI)
  if (/\b(XI|11|TINGKAT 11|KELAS 11|KELAS XI)\b/.test(upper)) {
    return 11;
  }

  // 4. Deteksi Tingkat 10 (X) - Word boundary mencegah false match pada XI atau XII
  if (/\b(X|10|TINGKAT 10|KELAS 10|KELAS X)\b/.test(upper)) {
    return 10;
  }

  return null;
}

/**
 * Mengubah angka tingkat ke format Romawi (10 -> X, 11 -> XI, 12 -> XII, 13 -> XIII)
 */
export function getTingkatRomawi(tingkat: number): string {
  switch (tingkat) {
    case 10:
      return 'X';
    case 11:
      return 'XI';
    case 12:
      return 'XII';
    case 13:
      return 'XIII';
    default:
      return String(tingkat);
  }
}
