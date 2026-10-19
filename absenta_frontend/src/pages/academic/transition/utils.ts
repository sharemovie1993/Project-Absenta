import type { TahunPelajaran } from '../../../types/academic';

/**
 * Mengekstrak angka tahun awal dan akhir dari string tahun pelajaran.
 * Contoh: "2026/2027" -> { start: 2026, end: 2027 }
 */
export const extractTahunRange = (tahunStr?: string): { start: number; end: number } => {
  if (!tahunStr) return { start: 0, end: 0 };
  const matches = tahunStr.match(/\d{4}/g);
  if (!matches || matches.length === 0) return { start: 0, end: 0 };
  const start = parseInt(matches[0], 10);
  const end = matches.length > 1 ? parseInt(matches[1], 10) : start + 1;
  return { start, end };
};

/**
 * Memeriksa apakah target tahun pelajaran berada setelah source tahun pelajaran secara kronologis.
 * Kenaikan kelas hanya sah jika berpindah dari tahun yang lebih rendah ke tahun yang lebih tinggi.
 */
export const isChronologicallyAfter = (sourceTahun?: string, targetTahun?: string): boolean => {
  if (!sourceTahun || !targetTahun) return false;
  const source = extractTahunRange(sourceTahun);
  const target = extractTahunRange(targetTahun);
  
  if (source.start > 0 && target.start > 0) {
    return target.start > source.start;
  }
  return false;
};

/**
 * Memberikan saran nama tahun pelajaran berikutnya berdasarkan tahun saat ini.
 * Contoh: "2026/2027" -> "2027/2028"
 */
export const getSuggestedNextTahun = (sourceTahun?: string): string => {
  if (!sourceTahun) return '';
  const range = extractTahunRange(sourceTahun);
  if (range.start > 0) {
    const nextStart = range.end;
    const nextEnd = nextStart + 1;
    return `${nextStart}/${nextEnd}`;
  }
  return '';
};

/**
 * Menyaring daftar tahun pelajaran agar hanya menyisakan tahun-tahun
 * yang berada di masa mendatang (setelah tahun sumber) secara kronologis.
 */
export const filterFutureAcademicYears = (
  sourceTahun?: string,
  years: TahunPelajaran[] = []
): TahunPelajaran[] => {
  if (!sourceTahun) return years;
  return (years ?? []).filter(tp => isChronologicallyAfter(sourceTahun, tp.tahun));
};
