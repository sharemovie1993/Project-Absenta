import { Student } from './types';

// Helper to get number of days in a month (YYYY-MM)
export const getDaysInMonth = (monthIso?: string): { days: number; monthName: string; year: number; month: number } => {
  const target = monthIso || new Date().toISOString().slice(0, 7);
  const [yStr, mStr] = target.split('-');
  const year = Number(yStr) || new Date().getFullYear();
  const month = Number(mStr) || (new Date().getMonth() + 1);
  const days = new Date(year, month, 0).getDate();
  const dateObj = new Date(year, month - 1, 1);
  const monthName = dateObj.toLocaleDateString('id-ID', { month: 'short' });
  return { days, monthName, year, month };
};

// Generate list of date column labels for a given month (e.g., '01 Ags', '02 Ags'...)
export const getMonthDateLabels = (monthIso?: string): string[] => {
  const { days, monthName } = getDaysInMonth(monthIso);
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    const dayFormatted = d < 10 ? `0${d}` : `${d}`;
    return `${dayFormatted} ${monthName}`;
  });
};

// Backward-compatible static DATES_MATRIX representing current month
export const DATES_MATRIX = getMonthDateLabels();

export interface MonthlyMatrixItem {
  student: Student;
  dailyRecords: { [key: string]: 'H' | 'S' | 'I' | 'A' | 'B' | 'D' };
  counts: {
    H: number;
    S: number;
    I: number;
    A: number;
    B: number;
    D: number;
  };
}

/**
 * Generate monthly matrix by combining student list with real backend dailyMap data.
 * If backend dailyMap is available, it maps actual daily status codes.
 */
export const GENERATE_MONTHLY_MATRIX = (
  students: Student[],
  rekapBulananKelasData?: any,
  monthIso?: string
): MonthlyMatrixItem[] => {
  const { days, monthName, year, month } = getDaysInMonth(monthIso);
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  const rawStudentsRekap = Array.isArray(rekapBulananKelasData?.data)
    ? rekapBulananKelasData.data
    : Array.isArray(rekapBulananKelasData?.students)
      ? rekapBulananKelasData.students
      : Array.isArray(rekapBulananKelasData)
        ? rekapBulananKelasData
        : [];

  const rekapMap = new Map<string, any>();
  rawStudentsRekap.forEach((item: any) => {
    const sId = item.siswa_id || item.id;
    if (sId) rekapMap.set(sId, item);
    if (item.nis) rekapMap.set(item.nis, item);
  });

  return students.map((s) => {
    const rekap = rekapMap.get(s.id) || rekapMap.get(s.nis);
    const dailyMap = rekap?.dailyMap || {};
    const dailyRecords: { [key: string]: 'H' | 'S' | 'I' | 'A' | 'B' | 'D' } = {};

    for (let d = 1; d <= days; d++) {
      const dayFormatted = d < 10 ? `0${d}` : `${d}`;
      const colKey = `${dayFormatted} ${monthName}`;
      const isoDateKey = `${year}-${monthStr}-${dayFormatted}`;

      const rawStatus = dailyMap[isoDateKey] || dailyMap[dayFormatted];
      if (rawStatus) {
        const upper = String(rawStatus).toUpperCase();
        if (upper === 'HADIR' || upper === 'H' || upper === 'TEPAT_WAKTU') dailyRecords[colKey] = 'H';
        else if (upper === 'SAKIT' || upper === 'S') dailyRecords[colKey] = 'S';
        else if (upper === 'IZIN' || upper === 'I') dailyRecords[colKey] = 'I';
        else if (upper === 'ALPA' || upper === 'A' || upper === 'ALPHA') dailyRecords[colKey] = 'A';
        else if (upper === 'DISPEN' || upper === 'D' || upper === 'DISPENSASI') dailyRecords[colKey] = 'D';
        else if (upper === 'BOLOS' || upper === 'B') dailyRecords[colKey] = 'B';
        else dailyRecords[colKey] = 'H';
      } else {
        // Fallback status from student's general count if date is today or before
        dailyRecords[colKey] = 'H';
      }
    }

    const counts = {
      H: rekap?.HADIR ?? rekap?.hadir ?? Object.values(dailyRecords).filter((v) => v === 'H').length,
      S: rekap?.SAKIT ?? rekap?.sakit ?? s.sakitCount ?? Object.values(dailyRecords).filter((v) => v === 'S').length,
      I: rekap?.IZIN ?? rekap?.izin ?? s.izinCount ?? Object.values(dailyRecords).filter((v) => v === 'I').length,
      A: rekap?.ALPA ?? rekap?.alpa ?? s.alphaCount ?? Object.values(dailyRecords).filter((v) => v === 'A').length,
      B: Object.values(dailyRecords).filter((v) => v === 'B').length,
      D: Object.values(dailyRecords).filter((v) => v === 'D').length,
    };

    return {
      student: s,
      dailyRecords,
      counts,
    };
  });
};
