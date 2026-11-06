/**
 * Single Source of Truth (SSOT) — Resolusi Kelompok Mata Pelajaran Rapor.
 *
 * Dipakai bersama oleh:
 *  - Panel Pengaturan Urutan Kelompok Rapor (RaporMapelOrderingPanel)
 *  - Pratinjau Modal Cetak Rapor (RaporSemesterPrintModal)
 *  - Generator PDF Rapor (renderRaporCk)
 *
 * ATURAN MUTLAK:
 *  1. Nilai `kelompok_mapel` yang disimpan di Pengaturan Rapor / Struktur Kurikulum
 *     SELALU menang. Heuristik nama mapel TIDAK BOLEH menimpa kelompok eksplisit.
 *  2. Heuristik nama mapel hanya dipakai bila `kelompok_mapel` kosong / tidak dikenali.
 *  3. Era legacy (≤ 2024/2025, 2 kelompok): Muatan Lokal (Bahasa Sunda/Jawa/Daerah)
 *     termasuk Kelompok A (Umum), BUKAN Kejuruan.
 */

export type RaporKelompokLegacy = 'Kelompok Umum' | 'Kelompok Kejuruan';
export type RaporKelompokModern =
  | 'Mata Pelajaran Umum'
  | 'Mata Pelajaran Kejuruan'
  | 'Mata Pelajaran Pilihan'
  | 'Muatan Lokal';

const hasWord = (text: string, word: string) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(text);

const isMulokName = (n: string) => n.includes('sunda') || n.includes('jawa') || n.includes('daerah');

const isPilihanName = (n: string) =>
  n.includes('pilihan') ||
  n.includes('koding') ||
  n.includes('kecerdasan artifisial') ||
  n.includes('kecerdasan buatan') ||
  n.includes('robotika') ||
  hasWord(n, 'ai');

const isKejuruanName = (n: string) =>
  n.includes('matematika') ||
  n.includes('inggris') ||
  n.includes('informatika') ||
  n.includes('ipas') ||
  (n.includes('alam') && n.includes('sosial')) ||
  n.includes('dasar') ||
  n.includes('program keahlian') ||
  n.includes('konsentrasi') ||
  n.includes('kejuruan') ||
  n.includes('pkk') ||
  n.includes('kewirausahaan') ||
  n.includes('pkl') ||
  n.includes('praktik kerja') ||
  n.includes('gtm') ||
  n.includes('pdtm') ||
  n.includes('dptm') ||
  n.includes('gambar teknik') ||
  n.includes('pemesinan') ||
  n.includes('otomotif') ||
  n.includes('pengelasan') ||
  n.includes('elektronika');

/** Era 2 kelompok (≤ 2024/2025): A. Kelompok Umum & B. Kelompok Kejuruan */
export const resolveKelompokLegacy = (
  rawKelompok?: string | null,
  mapelName?: string | null,
  isSmk = true
): RaporKelompokLegacy => {
  const g = (rawKelompok || '').toLowerCase().trim();
  const n = (mapelName || '').toLowerCase().trim();

  // Prioritas 1: konfigurasi eksplisit Pengaturan Rapor (SSOT)
  if (g) {
    if (g.includes('umum') || g.includes('nasional') || /^a[.\s:]/.test(g)) return 'Kelompok Umum';
    if (g.includes('kejuruan') || g.includes('pilihan') || g.includes('peminatan') || /^b[.\s:]/.test(g)) {
      return 'Kelompok Kejuruan';
    }
    // Muatan lokal di era legacy masuk Kelompok A
    if (g.includes('lokal') || g.includes('mulok')) return 'Kelompok Umum';
  }

  // Prioritas 2: fallback heuristik HANYA bila kelompok kosong / tak dikenali
  if (isMulokName(n)) return 'Kelompok Umum';
  if (isSmk && (isKejuruanName(n) || isPilihanName(n))) return 'Kelompok Kejuruan';
  return 'Kelompok Umum';
};

/** Era 4 kelompok (≥ 2025/2026): Umum, Kejuruan, Pilihan, Muatan Lokal */
export const resolveKelompokModern = (
  rawKelompok?: string | null,
  mapelName?: string | null,
  isSmk = true
): RaporKelompokModern => {
  const g = (rawKelompok || '').toLowerCase().trim();
  const n = (mapelName || '').toLowerCase().trim();

  // Prioritas 1: konfigurasi eksplisit Pengaturan Rapor (SSOT)
  if (g) {
    if (g.includes('lokal') || g.includes('mulok')) return 'Muatan Lokal';
    if (g.includes('pilihan') || g.includes('peminatan')) return 'Mata Pelajaran Pilihan';
    if (g.includes('kejuruan')) return 'Mata Pelajaran Kejuruan';
    if (g.includes('umum') || g.includes('nasional')) return 'Mata Pelajaran Umum';
  }

  // Prioritas 2: fallback heuristik HANYA bila kelompok kosong / tak dikenali
  if (isMulokName(n)) return 'Muatan Lokal';
  if (isPilihanName(n)) return 'Mata Pelajaran Pilihan';
  if (isSmk && isKejuruanName(n)) return 'Mata Pelajaran Kejuruan';
  return 'Mata Pelajaran Umum';
};

export const resolveRaporKelompok = (
  isLegacyEra: boolean,
  rawKelompok?: string | null,
  mapelName?: string | null,
  isSmk = true
): string =>
  isLegacyEra
    ? resolveKelompokLegacy(rawKelompok, mapelName, isSmk)
    : resolveKelompokModern(rawKelompok, mapelName, isSmk);
