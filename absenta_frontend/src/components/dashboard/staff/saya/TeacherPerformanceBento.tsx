import React from 'react';
import { Target, Clock, CheckCircle2, Award, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherPerformanceBentoProps {
  kehadiranPersen?: number;
  totalHadir?: number;
  totalIzin?: number;
  totalTerlambatMenit?: number;
  avgTapTime?: string;
  currentJp?: number;
  targetJp?: number;
  jurnalPersen?: number;
  onOpenKehadiranDetail?: () => void;
  onOpenBebanDetail?: () => void;
  className?: string;
}

export const TeacherPerformanceBento: React.FC<TeacherPerformanceBentoProps> = React.memo(({
  kehadiranPersen = 100,
  totalHadir = 22,
  totalIzin = 0,
  totalTerlambatMenit = 0,
  avgTapTime = '06:48 WIB',
  currentJp = 24,
  targetJp = 24,
  jurnalPersen = 100,
  onOpenKehadiranDetail,
  onOpenBebanDetail,
  className,
}) => {
  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Performa &amp; Kehadiran Saya (Bulan Ini)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
        {/* 1. Kehadiran Guru */}
        <div 
          onClick={onOpenKehadiranDetail}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-500/40 active:scale-95 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kehadiran
            </span>
            <Target size={14} className="text-emerald-500" />
          </div>
          <div className="pt-2">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {kehadiranPersen}%
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate pt-0.5">
              {totalHadir} Hadir • {totalIzin} Izin
            </p>
          </div>
        </div>

        {/* 2. Ketepatan Waktu */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Disiplin Waktu
            </span>
            <Clock size={14} className="text-blue-500" />
          </div>
          <div className="pt-2">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {totalTerlambatMenit === 0 ? '0 Mnt' : `${totalTerlambatMenit} Mnt`}
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate pt-0.5">
              Rata-rata Tap {avgTapTime}
            </p>
          </div>
        </div>

        {/* 3. Beban JP Sertifikasi */}
        <div 
          onClick={onOpenBebanDetail}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between cursor-pointer hover:border-indigo-500/40 active:scale-95 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Beban JP
            </span>
            <Award size={14} className="text-indigo-500" />
          </div>
          <div className="pt-2">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {currentJp} / {targetJp} <span className="text-[10px] font-bold text-slate-400">JP</span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate pt-0.5">
              {currentJp >= targetJp ? 'Memenuhi Syarat' : 'Belum Tuntas'}
            </p>
          </div>
        </div>

        {/* 4. Kepatuhan Jurnal */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jurnal Ajar
            </span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="pt-2">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {jurnalPersen}%
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate pt-0.5">
              Dokumentasi Lengkap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

TeacherPerformanceBento.displayName = 'TeacherPerformanceBento';
