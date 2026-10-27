import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trophy,
  Award,
  ChevronRight,
  TrendingUp,
  Activity,
  Calendar,
  Sparkles,
  LogIn,
  LogOut,
  FileText,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiswaMonthStats, SiswaGamification, SiswaDisciplineItem } from '../types';

export interface SiswaRingkasanTabProps {
  isAktifPkl: boolean;
  todayFormattedDate: string;
  todayIso: string;
  // PKL data
  todayPklAbsensi: any;
  pklHadir: number;
  pklSisaHari: number | null;
  // School Attendance data
  dailyRecap: any;
  monthStats: SiswaMonthStats;
  gamification: SiswaGamification;
  // Leaderboard data
  myRank: { rank: number; totalStudents: number };
  kelasLeaderboardStudents: any[];
  currentClassName: string;
  currentUserId?: string;
  studentName?: string;
  onOpenLeaderboard: () => void;
  // Schedule data
  todayKbmSchedule: any[];
  isLoadingSchedule: boolean;
  // Discipline data
  disciplineHistory: SiswaDisciplineItem[];
  totalPoinPrestasi: number;
  totalPoinPelanggaran: number;
  currentDisciplineScore: number;
  onOpenPrestasiModal: () => void;
  onOpenKehadiranModal: () => void;
  onOpenPklModal?: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const SiswaRingkasanTab: React.FC<SiswaRingkasanTabProps> = ({
  isAktifPkl,
  todayFormattedDate,
  todayPklAbsensi,
  pklHadir,
  pklSisaHari,
  dailyRecap,
  monthStats,
  gamification,
  myRank,
  kelasLeaderboardStudents,
  currentClassName,
  currentUserId,
  studentName,
  onOpenLeaderboard,
  todayKbmSchedule,
  isLoadingSchedule,
  disciplineHistory,
  totalPoinPrestasi,
  totalPoinPelanggaran,
  currentDisciplineScore,
  onOpenPrestasiModal,
  onOpenKehadiranModal,
  onOpenPklModal,
  onNavigateTab,
}) => {
  const topStudents = kelasLeaderboardStudents?.slice(0, 3) || [];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. TODAY'S PRESENCE & DISCIPLINE SCORE BANNER */}
      {isAktifPkl ? (
        /* STATUS PKL HARI INI */
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-5 sm:p-6 text-slate-800 dark:text-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border transition-all',
            todayPklAbsensi?.status === 'SAKIT'
              ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-amber-500/15 dark:from-slate-900 dark:via-amber-950/30 dark:to-slate-900 border-amber-500/30'
              : todayPklAbsensi?.status === 'IZIN'
              ? 'bg-gradient-to-r from-blue-500/15 via-indigo-500/5 to-blue-500/15 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border-blue-500/30'
              : todayPklAbsensi?.jam_masuk || todayPklAbsensi?.status === 'HADIR'
              ? 'bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 border-emerald-500/20'
              : 'bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 border-emerald-500/20'
          )}
        >
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="space-y-1.5">
              <span
                className={cn(
                  'inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider border',
                  todayPklAbsensi?.status === 'SAKIT'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : todayPklAbsensi?.status === 'IZIN'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                )}
              >
                STATUS PKL – {todayFormattedDate}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Presensi PKL:</span>
                <span
                  className={cn(
                    'underline underline-offset-4 font-mono font-black',
                    todayPklAbsensi?.status === 'SAKIT'
                      ? 'text-amber-600 dark:text-amber-400 decoration-amber-500'
                      : todayPklAbsensi?.status === 'IZIN'
                      ? 'text-blue-600 dark:text-blue-400 decoration-blue-500'
                      : todayPklAbsensi?.jam_pulang
                      ? 'text-emerald-600 dark:text-emerald-400 decoration-emerald-500'
                      : todayPklAbsensi?.jam_masuk || todayPklAbsensi?.status === 'HADIR'
                      ? 'text-blue-600 dark:text-blue-400 decoration-blue-500'
                      : 'text-rose-600 dark:text-rose-400 decoration-rose-500'
                  )}
                >
                  {todayPklAbsensi?.status || (todayPklAbsensi?.jam_masuk ? 'HADIR' : 'BELUM ABSEN')}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock size={14} className="text-emerald-500" />
                <span>Masuk: <strong>{todayPklAbsensi?.jam_masuk ? todayPklAbsensi.jam_masuk.substring(0, 5) : '–'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock size={14} className="text-blue-500" />
                <span>Pulang: <strong>{todayPklAbsensi?.jam_pulang ? todayPklAbsensi.jam_pulang.substring(0, 5) : '–'}</strong></span>
              </span>
            </div>
          </div>

          {onOpenPklModal && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {!todayPklAbsensi?.jam_masuk &&
              todayPklAbsensi?.status !== 'SAKIT' &&
              todayPklAbsensi?.status !== 'IZIN' ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenPklModal}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <LogIn size={15} />
                    <span>Presensi Masuk (Check-In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPklModal}
                    className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Calendar size={14} />
                    <span>Izin / Sakit</span>
                  </button>
                </>
              ) : todayPklAbsensi?.jam_masuk && !todayPklAbsensi?.jam_pulang ? (
                <>
                  <button
                    type="button"
                    onClick={onOpenPklModal}
                    className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <LogOut size={15} />
                    <span>Presensi Pulang (Check-Out)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenPklModal}
                    className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FileText size={14} />
                    <span>Isi Jurnal</span>
                  </button>
                </>
              ) : (
              {todayPklAbsensi?.jam_pulang && (
                <button
                  type="button"
                  onClick={onOpenPklModal}
                  className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Lihat Presensi Hari Ini</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigateTab('pkl')}
                className="px-3.5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Buka Ruang Kerja & Dashboard PKL Siswa"
              >
                <Briefcase size={14} />
                <span>Ruang PKL ↗</span>
              </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* STATUS PRESENSI SEKOLAH HARI INI */
        <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-blue-600/10 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-500/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                STATUS PRESENSI GERBANG • {todayFormattedDate}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Gerbang Hari Ini:</span>
                <span
                  className={cn(
                    'underline underline-offset-4 font-mono font-black',
                    dailyRecap?.jam_masuk ? 'text-emerald-600 dark:text-emerald-400 decoration-emerald-500' : 'text-rose-600 dark:text-rose-400 decoration-rose-500'
                  )}
                >
                  {dailyRecap?.status || (dailyRecap?.jam_masuk ? 'HADIR' : 'BELUM SCAN TAP')}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock size={14} className="text-emerald-500" />
                <span>Tap Masuk: <strong>{dailyRecap?.jam_masuk ? dailyRecap.jam_masuk.substring(0, 5) : '–'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock size={14} className="text-blue-500" />
                <span>Tap Pulang: <strong>{dailyRecap?.jam_pulang ? dailyRecap.jam_pulang.substring(0, 5) : '–'}</strong></span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles size={14} className="text-amber-500" />
                <span>Skor Disiplin: <strong className="text-emerald-600 dark:text-emerald-400">{currentDisciplineScore}/100</strong></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenKehadiranModal}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Rincian Absen</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2. 4 STAT CARDS SUMMARY */}
      {isAktifPkl ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Hari Hadir PKL</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{pklHadir} Hari</div>
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">Terus semangat!</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Sisa Hari PKL</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{pklSisaHari !== null ? `${pklSisaHari} Hari` : '–'}</div>
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">Selesai penempatan</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
              <Trophy size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Poin Bonus PKL</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">+{totalPoinPrestasi}</div>
              <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 truncate">Kinerja industri</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Presensi PKL</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{gamification.attendanceRate}%</div>
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">Rasio kehadiran</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">HADIR BULAN INI</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{monthStats.hadir} Hari</div>
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">Presensi {gamification.attendanceRate}%</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">SAKIT</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{monthStats.sakit} Hari</div>
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 truncate">Surat dokter tercatat</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">IZIN RESMI</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{monthStats.izin} Hari</div>
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">Dispensasi & surat izin</p>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">ALPA / TANPA KET</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">{monthStats.alpa} Hari</div>
              <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 truncate">
                {monthStats.alpa === 0 ? 'Sempurna, zero alpa!' : 'Perhatikan kehadiran!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. 2-COLUMN BENTO: LEADERBOARD & REAL-TIME KBM SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEADERBOARD PREVIEW */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Klasemen Kedisiplinan Kelas
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Kelas {currentClassName}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenLeaderboard}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* My Rank Banner */}
          {myRank.rank > 0 && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center font-mono">
                  #{myRank.rank}
                </div>
                <div>
                  <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 block">Peringkat Anda</span>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300">Dari total {myRank.totalStudents} siswa</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-mono">
                {gamification.points} XP
              </span>
            </div>
          )}

          {/* Top 3 Students */}
          <div className="space-y-2">
            {topStudents.length > 0 ? (
              topStudents.map((st: any, idx: number) => (
                <div
                  key={st.id || idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-black font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{st.nama}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    +{st.total_poin || 0} Poin
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada data klasemen bulan ini.</p>
            )}
          </div>
        </div>

        {/* TODAY'S KBM SCHEDULE FEED */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Jadwal KBM Hari Ini
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {todayKbmSchedule.length} Sesi Terjadwal
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('kehadiran')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Kalender Presensi</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar">
            {isLoadingSchedule ? (
              <div className="text-xs text-slate-400 text-center py-6 animate-pulse">Memuat jadwal KBM...</div>
            ) : todayKbmSchedule.length > 0 ? (
              todayKbmSchedule.map((sesi: any, idx: number) => (
                <div
                  key={sesi.id || idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {sesi.mata_pelajaran || sesi.mapel || 'Mata Pelajaran'}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      Guru: {sesi.guru_pengampu || sesi.guru || '–'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono shrink-0">
                    {sesi.jam_mulai || '07:00'} - {sesi.jam_selesai || '08:30'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                Tidak ada jadwal KBM yang tercatat untuk hari ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. RECENT DISCIPLINE & PRESTASI FEED */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Catatan Kedisiplinan &amp; Prestasi Terbaru
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Poin Prestasi (+{totalPoinPrestasi}) • Poin Pelanggaran (-{totalPoinPelanggaran})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPrestasiModal}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Buku Prestasi</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {disciplineHistory.length > 0 ? (
            disciplineHistory.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className={cn(
                  'p-3 rounded-2xl border flex items-center justify-between gap-3',
                  item.type === 'prestasi'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/20'
                    : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/20'
                )}
              >
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{item.judul}</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {item.kategori} • {item.tanggal ? item.tanggal.substring(0, 10) : '–'}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-black font-mono shrink-0',
                    item.type === 'prestasi'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                  )}
                >
                  {item.poin > 0 ? `+${item.poin}` : item.poin} Poin
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">Belum ada catatan kedisiplinan terbaru.</p>
          )}
        </div>
      </div>
    </div>
  );
};
