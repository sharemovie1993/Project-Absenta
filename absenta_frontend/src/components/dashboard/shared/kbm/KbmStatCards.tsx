import React from 'react';
import { Card } from '../../../ui/Card';
import { AnalyticsCard } from '../../../ui/AnalyticsCard';
import { cn } from '../../../../lib/utils';
import {
  LayoutGrid, Activity, BookOpen, CheckCircle2,
  Users, Clock, AlertCircle, Sparkles, ShieldAlert,
  Send, UserCheck, HeartPulse
} from 'lucide-react';

export interface KbmStats {
  total: number;
  live: number;
  withJournal: number;
  finished: number;
  overdue: number;
  upcoming: number;
  teacherOnTime: number;
  teacherLate: number;
  teacherDinasLuar: number;
  teacherInval: number;
  teacherIzinSakit: number;
  teacherPending: number;
  teacherNotArrived: number;
  teacherAlpa: number;
}

interface KbmStatCardsProps {
  stats: KbmStats;
  statusFilter: 'ALL' | 'LIVE' | 'FINISHED' | 'UPCOMING' | 'JURNAL';
  setStatusFilter: (filter: 'ALL' | 'LIVE' | 'FINISHED' | 'UPCOMING' | 'JURNAL') => void;
  teacherStatusFilter: string;
  setTeacherStatusFilter: (filter: string) => void;
  healthScore: number;
}

export const KbmStatCards = React.memo<KbmStatCardsProps>(({
  stats,
  statusFilter,
  setStatusFilter,
  teacherStatusFilter,
  setTeacherStatusFilter,
  healthScore
}) => {
  const total = stats.total || 1;
  const finishedPct = Math.round((stats.finished / total) * 100);
  const journalPct = Math.round((stats.withJournal / total) * 100);
  const normalRate = Math.round(((stats.teacherOnTime + stats.teacherDinasLuar + stats.teacherInval + stats.teacherIzinSakit) / total) * 100);

  return (
    <div className="space-y-6 w-full">
      {/* ── BARIS 1: 📊 4 KARTU METRIK UTAMA KBM (ANALYTICSCARD VARIANT PREMIUM) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            id: 'ALL',
            title: 'TOTAL SESI',
            value: stats.total,
            subtitle: 'Jadwal Aktif Hari Ini',
            icon: <LayoutGrid size={16} />,
            gradient: 'from-slate-800 to-slate-950',
          },
          {
            id: 'LIVE',
            title: 'SESI LIVE',
            value: stats.live,
            subtitle: 'Sesi Aktif di Kelas',
            icon: <Activity size={16} className={stats.live > 0 ? "animate-pulse" : ""} />,
            gradient: 'from-blue-600 to-indigo-700',
          },
          {
            id: 'JURNAL',
            title: 'JURNAL TERISI',
            value: stats.withJournal,
            subtitle: `${journalPct}% dari Total Sesi`,
            icon: <BookOpen size={16} />,
            gradient: 'from-indigo-600 to-purple-700',
          },
          {
            id: 'FINISHED',
            title: 'SESI SELESAI',
            value: stats.finished,
            subtitle: `${finishedPct}% Tuntas Terlaksana`,
            icon: <CheckCircle2 size={16} />,
            gradient: 'from-emerald-600 to-teal-700',
          },
        ].map((item) => {
          const active = statusFilter === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                "rounded-xl transition-all duration-200",
                active && "ring-4 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-950 shadow-md"
              )}
            >
              <AnalyticsCard
                title={item.title}
                value={item.value}
                subtitle={item.subtitle}
                icon={item.icon}
                gradient={item.gradient}
                variant="premium"
                onClick={() => setStatusFilter(statusFilter === item.id ? 'ALL' : item.id as any)}
                className="cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* ── BARIS 2: 👨‍🏫 6 RADAR KEHADIRAN GURU & INVAL PIKET (CLEAN & ZERO-NOISE) ── */}
      <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-xs font-bold shadow-2xs">
              👨‍🏫
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Radar Guru &amp; Inval
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Health Score Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <HeartPulse size={12} className={cn(
                healthScore > 80 ? "text-emerald-500 animate-pulse" :
                healthScore > 50 ? "text-amber-500" : "text-rose-500 animate-bounce"
              )} />
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                Health: <strong className={cn(
                  healthScore > 80 ? "text-emerald-600 dark:text-emerald-400" :
                  healthScore > 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                )}>{healthScore}%</strong>
              </span>
            </div>

            {teacherStatusFilter !== 'ALL' && (
              <button
                onClick={() => setTeacherStatusFilter('ALL')}
                className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* 7 Clean Interactive Chips (Zero Clipping) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
          {[
            { id: 'TEPAT_WAKTU', label: 'Tepat', val: stats.teacherOnTime, icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/30' },
            { id: 'TERLAMBAT', label: 'Telat', val: stats.teacherLate, icon: Clock, bg: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800', activeBg: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30' },
            { id: 'BELUM_MASUK', label: 'Belum Masuk', val: stats.teacherNotArrived, icon: AlertCircle, bg: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800', activeBg: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/30' },
            { id: 'INVAL', label: 'Inval', val: stats.teacherInval, icon: UserCheck, bg: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-100 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800', activeBg: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-fuchsia-600/30' },
            { id: 'DINAS_LUAR', label: 'Dinas', val: stats.teacherDinasLuar, icon: Send, bg: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800', activeBg: 'bg-purple-600 text-white border-purple-600 shadow-purple-600/30' },
            { id: 'IZIN', label: 'Izin', val: stats.teacherIzinSakit, icon: Users, bg: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800', activeBg: 'bg-blue-600 text-white border-blue-600 shadow-blue-600/30' },
            { id: 'ALPA', label: 'Alpa', val: stats.teacherAlpa, icon: ShieldAlert, bg: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', activeBg: 'bg-rose-600 text-white border-rose-600 shadow-rose-600/30' },
          ].map((chip) => {
            const active = teacherStatusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setTeacherStatusFilter(teacherStatusFilter === chip.id ? 'ALL' : chip.id)}
                className={cn(
                  "flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none hover:scale-[1.02] shadow-2xs",
                  active ? chip.activeBg : chip.bg
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <chip.icon size={15} className="shrink-0" />
                  <span className="text-xs font-black tracking-tight whitespace-nowrap">{chip.label}</span>
                </div>
                <span className="text-xs font-black ml-1.5 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 shrink-0">
                  {chip.val}
                </span>
              </button>
            );
          })}
        </div>

        {/* Visual Progress Bar Breakdown */}
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
          <div style={{ width: `${(stats.teacherOnTime / total) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-500" title={`Tepat: ${stats.teacherOnTime}`} />
          <div style={{ width: `${(stats.teacherLate / total) * 100}%` }} className="h-full bg-amber-500 transition-all duration-500" title={`Telat: ${stats.teacherLate}`} />
          <div style={{ width: `${(stats.teacherNotArrived / total) * 100}%` }} className="h-full bg-orange-500 transition-all duration-500" title={`Belum Masuk: ${stats.teacherNotArrived}`} />
          <div style={{ width: `${(stats.teacherInval / total) * 100}%` }} className="h-full bg-fuchsia-500 transition-all duration-500" title={`Inval: ${stats.teacherInval}`} />
          <div style={{ width: `${(stats.teacherDinasLuar / total) * 100}%` }} className="h-full bg-purple-500 transition-all duration-500" title={`Dinas: ${stats.teacherDinasLuar}`} />
          <div style={{ width: `${(stats.teacherIzinSakit / total) * 100}%` }} className="h-full bg-blue-500 transition-all duration-500" title={`Izin: ${stats.teacherIzinSakit}`} />
          <div style={{ width: `${(stats.teacherAlpa / total) * 100}%` }} className="h-full bg-rose-500 transition-all duration-500" title={`Alpa: ${stats.teacherAlpa}`} />
        </div>
      </div>
    </div>
  );
});

KbmStatCards.displayName = 'KbmStatCards';
