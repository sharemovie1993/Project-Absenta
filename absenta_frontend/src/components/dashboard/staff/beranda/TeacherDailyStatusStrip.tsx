import React from 'react';
import { Clock, Zap, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineItem } from '../tabs/StaffKbmAbsenTab';

interface TeacherDailyStatusStripProps {
  jamKerja?: string;
  activeKbm?: TimelineItem | null;
  nextKbm?: TimelineItem | null;
  isAllFinished?: boolean;
  totalJp?: number;
  totalMinutes?: number;
  guruTapTime?: string | null;
  isGuruHadir?: boolean;
  className?: string;
}

export const TeacherDailyStatusStrip: React.FC<TeacherDailyStatusStripProps> = React.memo(({
  jamKerja = '07:00 - 15:00',
  activeKbm,
  nextKbm,
  isAllFinished = false,
  totalJp = 0,
  totalMinutes = 0,
  guruTapTime,
  isGuruHadir = true,
  className,
}) => {
  return (
    <div 
      className={cn(
        "w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-xs flex items-center justify-between gap-1.5 sm:gap-3 text-[11px] sm:text-xs",
        className
      )}
    >
      {/* 1. Jam Kerja */}
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0">
        <Clock size={13} className="text-blue-500 shrink-0" />
        <span className="font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Jam Kerja:</span>
        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate">{jamKerja}</span>
      </div>

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 2. Status KBM Sesi Hari Ini */}
      <div className="flex items-center gap-1.5 min-w-0">
        {activeKbm ? (
          <span className="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" />
            <span className="truncate">Live: {activeKbm.kelas_nama}</span>
          </span>
        ) : nextKbm ? (
          <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 truncate">
            <Zap size={12} className="text-blue-500 shrink-0" />
            <span className="truncate">Next: {nextKbm.jam_mulai} ({nextKbm.kelas_nama})</span>
          </span>
        ) : isAllFinished && totalJp > 0 ? (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 truncate">
            <CheckCircle2 size={12} className="shrink-0" />
            <span className="truncate">{totalJp} JP Tuntas</span>
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400 truncate font-medium">
            Tidak Ada KBM
          </span>
        )}
      </div>

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 3. Status Presensi Guru Mandiri */}
      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 shrink-0 font-medium">
        {guruTapTime ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck size={13} className="shrink-0" />
            <span>Hadir {guruTapTime}</span>
          </span>
        ) : isGuruHadir ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <ShieldCheck size={13} className="shrink-0" />
            <span className="hidden sm:inline">Presensi:</span> Terdata
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
            <AlertCircle size={13} className="shrink-0" />
            <span>Belum Tap</span>
          </span>
        )}
      </div>
    </div>
  );
});

TeacherDailyStatusStrip.displayName = 'TeacherDailyStatusStrip';
