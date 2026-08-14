import { format } from 'date-fns';

export interface TeacherSession {
  guru_status?: string;
  waktu_tap?: string;
  AbsenGuru?: Array<{ status?: string; waktu_tap?: string }>;
  _summary?: { teacherStatus?: string };
}

export interface TeacherSessionStats {
  totalSesiHariIni: number;
  sesiHadirHariIni: number;
  firstSessionTapTime: string | null;
}

export interface TeacherAspectEvaluation {
  gerbangStatusLabel: string;
  gerbangBadgeClass: string;
  gerbangSubtitle: string;
  kbmStatusLabel: string;
  kbmBadgeClass: string;
  kbmSubtitle: string;
}

export interface TeacherTimelineStyle {
  st: string;
  isHadir: boolean;
  isLate: boolean;
  isAlpa: boolean;
  isGate: boolean;
  isDatang: boolean;
  isPulang: boolean;
  dotClass: string;
  badgeClass: string;
}

/**
 * Calculates aggregated session statistics for teacher
 */
export function computeTeacherSessionStats(teacherSessions: TeacherSession[] = []): TeacherSessionStats {
  const totalSesiHariIni = teacherSessions.length;
  const sesiHadirHariIni = teacherSessions.filter((s) => {
    const st = String(s.guru_status || s.AbsenGuru?.[0]?.status || s._summary?.teacherStatus || '').toUpperCase();
    return !!s.AbsenGuru?.[0]?.waktu_tap || (st !== '' && !st.includes('BELUM') && (st === 'HADIR' || st.includes('HADIR') || st === 'TEPAT_WAKTU'));
  }).length;

  let firstSessionTapTime: string | null = null;
  if (teacherSessions.length > 0) {
    for (const s of teacherSessions) {
      const tap = s.AbsenGuru?.[0]?.waktu_tap || s.waktu_tap;
      if (tap) {
        try {
          firstSessionTapTime = format(new Date(tap), 'HH:mm');
          break;
        } catch {}
      }
    }
  }

  return {
    totalSesiHariIni,
    sesiHadirHariIni,
    firstSessionTapTime,
  };
}

/**
 * Evaluates Aspek 1 (Gerbang) & Aspek 2 (KBM) for Teacher Discipline Widget
 */
export function evaluateTeacherDisciplineAspects(params: {
  jamMasukDisplay?: string | null;
  jamPulangDisplay?: string | null;
  rawStatusFinal?: string;
  totalSesiHariIni: number;
  sesiHadirHariIni: number;
}): TeacherAspectEvaluation {
  const { jamMasukDisplay, jamPulangDisplay, rawStatusFinal, totalSesiHariIni, sesiHadirHariIni } = params;

  // Aspek 1: Gerbang
  const gerbangSubtitle = jamMasukDisplay
    ? `Masuk: ${jamMasukDisplay} WIB${jamPulangDisplay ? ` • Pulang: ${jamPulangDisplay} WIB` : ''}`
    : 'Belum tap gerbang hari ini';

  const gerbangStatusLabel = jamMasukDisplay
    ? (rawStatusFinal === 'TERLAMBAT' ? '🟠 Terlambat' : '🟢 Tepat Waktu')
    : '⚪ Belum Tap';

  const gerbangBadgeClass = jamMasukDisplay
    ? (rawStatusFinal === 'TERLAMBAT'
        ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300')
    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

  // Aspek 2: KBM
  const kbmSubtitle = totalSesiHariIni > 0
    ? `${totalSesiHariIni} Sesi Kelas Terjadwal`
    : (jamMasukDisplay ? '1 Sesi Mengajar Hari Ini' : 'Belum Ada Sesi Kelas');

  const kbmStatusLabel = totalSesiHariIni > 0
    ? `📖 ${sesiHadirHariIni}/${totalSesiHariIni} Hadir`
    : (jamMasukDisplay ? '🟢 1 Sesi Hadir' : '☕ Tidak Ada Sesi');

  const kbmBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';


  return {
    gerbangStatusLabel,
    gerbangBadgeClass,
    gerbangSubtitle,
    kbmStatusLabel,
    kbmBadgeClass,
    kbmSubtitle,
  };
}

/**
 * Computes Timeline Item visual styles and flags
 */
export function getTeacherTimelineItemStyle(status?: string, jenisKegiatan?: string): TeacherTimelineStyle {
  const st = String(status || '').toUpperCase();
  const isGate = !!jenisKegiatan?.includes('Gerbang');
  const isDatang = !!jenisKegiatan?.includes('Datang');
  const isPulang = !!jenisKegiatan?.includes('Pulang');
  const isHadir = (st === 'HADIR' || (st.includes('HADIR') && !st.includes('BELUM')) || st.includes('MENGAJAR') || st === 'TEPAT_WAKTU') && !st.includes('BELUM');
  const isLate = st === 'TERLAMBAT' || st.includes('TELAT');
  const isAlpa = st === 'ALPA';

  const dotClass = isHadir
    ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60'
    : isLate
    ? 'bg-orange-500 ring-4 ring-orange-100 dark:ring-orange-950/60'
    : isAlpa
    ? 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60'
    : 'bg-slate-300 dark:bg-slate-600';

  const badgeClass = isHadir
    ? 'bg-emerald-100/90 text-emerald-950 dark:bg-emerald-950/90 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 font-black'
    : isLate
    ? 'bg-orange-100/90 text-orange-950 dark:bg-orange-950/90 dark:text-orange-200 border border-orange-300 dark:border-orange-800 font-black'
    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 font-bold';

  return {
    st,
    isHadir,
    isLate,
    isAlpa,
    isGate,
    isDatang,
    isPulang,
    dotClass,
    badgeClass,
  };
}
