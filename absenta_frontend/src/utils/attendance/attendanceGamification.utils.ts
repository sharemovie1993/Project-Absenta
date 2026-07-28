/**
 * 🏆 Attendance Gamification & Calculation Helper
 * Modul terpusat untuk kalkulasi poin kedisiplinan, streak, level/gelar siswa, dan kelayakan ujian.
 */

export const ATTENDANCE_POINTS_MAP = {
  HADIR_TEPAT_WAKTU: 10,
  HADIR_TERLAMBAT: 5,
  SAKIT: 2,
  IZIN: 2,
  DISPEN: 2,
  ALPA: 0,
} as const;

export interface GamificationResult {
  streak: number;
  level: string;
  badgeColor: string;
  iconSymbol: string;
  description: string;
  attendanceRate: number;
  totalPoinPelanggaran: number;
}

/**
 * 🧮 Kalkulasi Gelar & Streak Kedisiplinan Siswa
 */
export function calculateStudentGamification(
  detailHarian: any[],
  attendanceRate: number = 100,
  totalPoinPelanggaran: number = 0
): GamificationResult {
  const detail = Array.isArray(detailHarian) ? detailHarian : [];

  // 1. Calculate Streak
  let streak = 0;
  const sortedDays = [...detail].sort(
    (a: any, b: any) => new Date(b.tanggal || b.created_at).getTime() - new Date(a.tanggal || a.created_at).getTime()
  );

  for (const d of sortedDays) {
    const status = String(d.status || '').toUpperCase();
    if (status === 'HADIR' || status === 'TERLAMBAT') {
      streak++;
    } else if (status !== 'LIBUR' && status !== 'MINGGU') {
      break;
    }
  }

  // 2. Determine Level & Title
  let level = 'Prajurit';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let iconSymbol = '🔰';
  let description = 'Memerlukan peningkatan kedisiplinan presensi.';

  if (attendanceRate >= 95 && totalPoinPelanggaran === 0) {
    level = 'Ksatria Absenta';
    badgeColor = 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300';
    iconSymbol = '🛡️';
    description = 'Presensi sempurna & bersih dari poin pelanggaran BK!';
  } else if (attendanceRate >= 85 && totalPoinPelanggaran < 50) {
    level = 'Penjaga Disiplin';
    badgeColor = 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-300';
    iconSymbol = '🎖️';
    description = 'Kedisiplinan baik & memenuhi syarat kelayakan ujian.';
  } else if (attendanceRate >= 70) {
    level = 'Siswa Aktif';
    badgeColor = 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300';
    iconSymbol = '🥉';
    description = 'Kehadiran memenuhi batas minimum standar.';
  }

  return {
    streak,
    level,
    badgeColor,
    iconSymbol,
    description,
    attendanceRate,
    totalPoinPelanggaran,
  };
}

/**
 * 📋 Kalkulasi Kelayakan Ujian (Batas Minimum 85%)
 */
export function evaluateExamEligibility(attendancePercentage: number): {
  isEligible: boolean;
  statusLabel: string;
  colorTheme: 'emerald' | 'amber' | 'rose';
  message: string;
} {
  if (attendancePercentage >= 85) {
    return {
      isEligible: true,
      statusLabel: 'Lulus Syarat Ujian (>= 85%)',
      colorTheme: 'emerald',
      message: 'Kehadiran Anda memenuhi syarat mengikuti Ujian Tengah Semester & Akhir Semester.',
    };
  } else if (attendancePercentage >= 75) {
    return {
      isEligible: false,
      statusLabel: 'Peringatan Syarat Ujian (75% - 84%)',
      colorTheme: 'amber',
      message: 'Persentase hampir kurang dari batas 85%. Segera perbaiki kehadiran Anda!',
    };
  } else {
    return {
      isEligible: false,
      statusLabel: 'Bermasalah / Tidak Lulus Ujian (< 75%)',
      colorTheme: 'rose',
      message: 'Kehadiran Anda di bawah batas aman 85%. Konsultasikan dengan Wali Kelas / BK!',
    };
  }
}
