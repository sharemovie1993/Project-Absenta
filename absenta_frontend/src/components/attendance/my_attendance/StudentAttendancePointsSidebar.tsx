import React from 'react';
import { Trophy, Award, FileText, ChevronRight, PlusCircle, Star, Clock, Shield } from 'lucide-react';
import { SectionCard, Badge, Button } from '../../ui';
import type { StudentAttendanceRecord } from './StudentAttendanceTypes';
import { calculateStudentGamification } from '../../../utils/attendance/attendanceGamification.utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StudentAttendancePointsSidebarProps {
  myRankIndex: number;
  classmatesCount: number;
  myTotalPoin: number;
  myStreak: number;
  attendanceRate?: number;
  detailHarianList?: any[];
  rekapStats?: {
    HADIR?: number;
    TERLAMBAT?: number;
    SAKIT?: number;
    IZIN?: number;
    DISPEN?: number;
    ALPA?: number;
  };
  bulanKey?: string;
  onOpenLeaderboardModal: () => void;
  onOpenIzinModal: () => void;
  top3Classmates: StudentAttendanceRecord[];
}

export const StudentAttendancePointsSidebar: React.FC<StudentAttendancePointsSidebarProps> = React.memo(({
  myRankIndex,
  classmatesCount,
  myTotalPoin,
  myStreak,
  attendanceRate = 100,
  detailHarianList = [],
  rekapStats,
  bulanKey,
  onOpenLeaderboardModal,
  onOpenIzinModal,
  top3Classmates
}) => {
  const gamification = calculateStudentGamification(detailHarianList, attendanceRate, 0);

  const hadirCount = rekapStats?.HADIR || 0;
  const telatCount = rekapStats?.TERLAMBAT || 0;
  const izinCount = (rekapStats?.SAKIT || 0) + (rekapStats?.IZIN || 0) + (rekapStats?.DISPEN || 0);

  const poinHadir = hadirCount * 10;
  const poinTelat = telatCount * 5;
  const poinIzin = izinCount * 2;
  const computedTotalPoin = myTotalPoin || (poinHadir + poinTelat + poinIzin);

  return (
    <div className="space-y-4">
      {/* KARD 1: KARTU RINCIAN POIN KEHADIRAN (SIMPLIFIED & CLEAN) */}
      <SectionCard fullWidth className="p-4 flex flex-col w-full min-w-0">
        {/* HEADER: TITLE & TOTAL POINTS */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs tracking-tight truncate">
              Riwayat Poin & Apresiasi
            </h3>
          </div>
          <Badge className="bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200 border-none font-black text-xs px-2.5 py-0.5 shrink-0">
            +{computedTotalPoin} Pts
          </Badge>
        </div>

        {/* GELAR & STREAK (SINGLE COMPACT BAR) */}
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 dark:border-amber-900/50 mb-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-base shrink-0">{gamification.iconSymbol}</span>
            <span className="font-black text-slate-800 dark:text-slate-200 text-xs truncate">
              {gamification.level}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-200 shrink-0">
            🔥 {myStreak} Hari Streak
          </span>
        </div>

        {/* CLEAN 1-LINE ROWS FOR POINT BREAKDOWN */}
        <div className="space-y-1.5">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold truncate">
              <Star size={13} className="fill-amber-400 text-amber-400 shrink-0" />
              <span className="truncate text-[11px]">Hadir Tepat Waktu</span>
            </div>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-[11px] shrink-0">
              +{poinHadir} Pts <span className="text-[9px] font-normal text-slate-400">({hadirCount}x)</span>
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold truncate">
              <Clock size={13} className="text-orange-500 shrink-0" />
              <span className="truncate text-[11px]">Hadir Terlambat</span>
            </div>
            <span className="font-black text-orange-600 dark:text-orange-400 text-[11px] shrink-0">
              +{poinTelat} Pts <span className="text-[9px] font-normal text-slate-400">({telatCount}x)</span>
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold truncate">
              <FileText size={13} className="text-blue-500 shrink-0" />
              <span className="truncate text-[11px]">Izin / Sakit / Dispen</span>
            </div>
            <span className="font-black text-blue-600 dark:text-blue-400 text-[11px] shrink-0">
              +{poinIzin} Pts <span className="text-[9px] font-normal text-slate-400">({izinCount}x)</span>
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold truncate">
              <Shield size={13} className="text-indigo-500 shrink-0" />
              <span className="truncate text-[11px]">Pelanggaran BK</span>
            </div>
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-[11px] shrink-0">
              Bersih (0)
            </span>
          </div>
        </div>
      </SectionCard>

      {/* KARD 2: Klasemen Kelas */}
      <SectionCard fullWidth className="p-4 flex flex-col w-full min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs tracking-tight">
              Klasemen Kedisiplinan Kelas
            </h3>
          </div>
          <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-none font-bold text-[10px]">
            {myRankIndex >= 0 ? `#${myRankIndex + 1}` : 'N/A'}
          </Badge>
        </div>

        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200 dark:border-amber-900/50 p-3 rounded-2xl mb-3 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">
              Posisi Saya
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-amber-950 dark:text-amber-100">
                Peringkat #{myRankIndex >= 0 ? myRankIndex + 1 : 1} dari {classmatesCount || 32} Siswa
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Total Poin: <strong className="text-amber-600">{computedTotalPoin} Pts</strong> • Streak {myStreak} Hari
            </span>
          </div>
          <Button
            size="sm"
            onClick={onOpenLeaderboardModal}
            className="bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 hover:bg-amber-50 font-black text-[10px] h-7 px-2.5 rounded-xl border border-amber-200 dark:border-amber-800 shrink-0 shadow-xs flex items-center gap-1"
          >
            <span>Lihat Klasemen</span>
            <ChevronRight size={12} />
          </Button>
        </div>

        {/* TOP 3 PREVIEW */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Top 3 Kelas:
          </span>
          <div className="space-y-1">
            {top3Classmates?.slice(0, 3)?.map((student, idx) => (
              <div
                key={student.id || idx}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : 'bg-amber-700 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] truncate">
                    {student.nama || student.nama_siswa}
                  </span>
                </div>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-[11px] shrink-0">
                  {student.total_poin || 0} Pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* KARD 3: Status Permohonan Izin / Sakit */}
      <SectionCard fullWidth className="p-4 flex flex-col w-full min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs tracking-tight">
              Status Permohonan Izin / Sakit
            </h3>
          </div>
          <Button
            size="sm"
            onClick={onOpenIzinModal}
            className="bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 hover:bg-sky-100 font-bold text-[10px] h-6 px-2 rounded-lg border-none flex items-center gap-1"
          >
            <PlusCircle size={12} />
            <span>Ajukan</span>
          </Button>
        </div>

        <div className="p-3 bg-sky-50/50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Surat Sakit Dokter
                </span>
                <span className="text-[9px] text-slate-400">(Terbaru)</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Dikirim 27 Juli 2026 • Menunggu Verifikasi Wali Kelas
              </span>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none text-[9px] font-black shrink-0">
            MENUNGGU
          </Badge>
        </div>
      </SectionCard>
    </div>
  );
});

export default StudentAttendancePointsSidebar;
