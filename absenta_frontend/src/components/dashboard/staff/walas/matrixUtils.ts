import { Student } from './types';

// Generate 20 school days attendance matrix for table view
export const DATES_MATRIX = Array.from({ length: 20 }, (_, i) => {
  const day = i + 1;
  const dateStr = `${day < 10 ? '0' + day : day} Ags`;
  return dateStr;
});

export const GENERATE_MONTHLY_MATRIX = (students: Student[]) => {
  return students.map(s => {
    const dailyRecords: { [key: string]: 'H' | 'S' | 'I' | 'A' | 'B' | 'D' } = {};
    let remainingSakit = s.sakitCount || 0;
    let remainingIzin = s.izinCount || 0;
    let remainingAlpha = s.alphaCount || 0;

    DATES_MATRIX.forEach((date, index) => {
      if (remainingAlpha > 0 && (index % 5 === 2 || index === 18)) {
        dailyRecords[date] = 'A';
        remainingAlpha--;
      } else if (remainingSakit > 0 && (index % 4 === 1 || index === 15)) {
        dailyRecords[date] = 'S';
        remainingSakit--;
      } else if (remainingIzin > 0 && (index % 3 === 0 || index === 12)) {
        dailyRecords[date] = 'I';
        remainingIzin--;
      } else {
        dailyRecords[date] = 'H';
      }
    });

    const counts = {
      H: Object.values(dailyRecords).filter(v => v === 'H' || v === 'D').length,
      S: Object.values(dailyRecords).filter(v => v === 'S').length,
      I: Object.values(dailyRecords).filter(v => v === 'I').length,
      A: Object.values(dailyRecords).filter(v => v === 'A').length,
      B: Object.values(dailyRecords).filter(v => v === 'B').length,
      D: Object.values(dailyRecords).filter(v => v === 'D').length,
    };

    return {
      student: s,
      dailyRecords,
      counts
    };
  });
};
