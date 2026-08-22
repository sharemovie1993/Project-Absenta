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

export type AttendanceStatusCode = 'H' | 'T' | 'S' | 'I' | 'A' | 'B' | 'D' | '-';

export interface MonthlyMatrixItem {
  student: Student;
  dailyRecords: { [key: string]: AttendanceStatusCode };
  counts: {
    H: number;
    T: number;
    S: number;
    I: number;
    A: number;
    B: number;
    D: number;
  };
  recordedDaysCount: number;
  attendanceRate: number;
}

/**
 * Generate monthly matrix by combining student list with real backend dailyMap data.
 * Pure real data parsing: If no backend record exists for a date, displays '-' (no fallback to mock 'H').
 */
export const GENERATE_MONTHLY_MATRIX = (
  students: Student[],
  rekapBulananKelasData?: any,
  monthIso?: string
): MonthlyMatrixItem[] => {
  const { days, monthName, year, month } = getDaysInMonth(monthIso);
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  // Extract raw backend list from various wrapper formats
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
    if (sId) rekapMap.set(String(sId), item);
    if (item.nis) rekapMap.set(String(item.nis), item);
    if (item.nama_siswa) rekapMap.set(String(item.nama_siswa).toLowerCase(), item);
    if (item.nama) rekapMap.set(String(item.nama).toLowerCase(), item);
  });

  return students.map((s) => {
    const rekap = rekapMap.get(String(s.id)) || 
                  rekapMap.get(String(s.nis)) || 
                  rekapMap.get(String(s.name).toLowerCase());
    
    const dailyMap = rekap?.dailyMap || {};
    const dailyRecords: { [key: string]: AttendanceStatusCode } = {};

    for (let d = 1; d <= days; d++) {
      const dayFormatted = d < 10 ? `0${d}` : `${d}`;
      const colKey = `${dayFormatted} ${monthName}`;
      const isoDateKey = `${year}-${monthStr}-${dayFormatted}`;
      const dayKeyString = String(d);

      // Backend rekap engine provides dailyMap keyed by day number "1".."31", "01".."31", or "YYYY-MM-DD"
      const rawStatus = dailyMap[dayKeyString] ?? dailyMap[dayFormatted] ?? dailyMap[isoDateKey];

      if (rawStatus !== undefined && rawStatus !== null && rawStatus !== '') {
        const upper = String(rawStatus).toUpperCase().trim();
        if (upper === 'HADIR' || upper === 'H' || upper === 'TEPAT_WAKTU') {
          dailyRecords[colKey] = 'H';
        } else if (upper === 'TERLAMBAT' || upper === 'T' || upper === 'TELAT') {
          dailyRecords[colKey] = 'T';
        } else if (upper === 'SAKIT' || upper === 'S') {
          dailyRecords[colKey] = 'S';
        } else if (upper === 'IZIN' || upper === 'I') {
          dailyRecords[colKey] = 'I';
        } else if (upper === 'ALPA' || upper === 'A' || upper === 'ALPHA') {
          dailyRecords[colKey] = 'A';
        } else if (upper === 'DISPEN' || upper === 'D' || upper === 'DISPENSASI') {
          dailyRecords[colKey] = 'D';
        } else if (upper === 'BOLOS' || upper === 'B') {
          dailyRecords[colKey] = 'B';
        } else {
          dailyRecords[colKey] = '-';
        }
      } else {
        // Zero fallback: if date has no attendance transactions logged in database, mark as '-'
        dailyRecords[colKey] = '-';
      }
    }

    // Calculate exact counts strictly from real database records or dailyRecords
    const realH = rekap?.HADIR ?? rekap?.hadir ?? Object.values(dailyRecords).filter((v) => v === 'H').length;
    const realT = rekap?.TERLAMBAT ?? rekap?.telat ?? Object.values(dailyRecords).filter((v) => v === 'T').length;
    const realS = rekap?.SAKIT ?? rekap?.sakit ?? Object.values(dailyRecords).filter((v) => v === 'S').length;
    const realI = rekap?.IZIN ?? rekap?.izin ?? Object.values(dailyRecords).filter((v) => v === 'I').length;
    const realA = rekap?.ALPA ?? rekap?.alpa ?? Object.values(dailyRecords).filter((v) => v === 'A').length;
    const realB = Object.values(dailyRecords).filter((v) => v === 'B').length;
    const realD = Object.values(dailyRecords).filter((v) => v === 'D').length;

    const counts = {
      H: realH,
      T: realT,
      S: realS,
      I: realI,
      A: realA,
      B: realB,
      D: realD,
    };

    const recordedDaysCount = (counts.H + counts.T) + counts.S + counts.I + counts.A;
    const attendanceRate = recordedDaysCount > 0
      ? Math.round(((counts.H + counts.T) / recordedDaysCount) * 100)
      : 0;

    return {
      student: s,
      dailyRecords,
      counts,
      recordedDaysCount,
      attendanceRate,
    };
  });
};
