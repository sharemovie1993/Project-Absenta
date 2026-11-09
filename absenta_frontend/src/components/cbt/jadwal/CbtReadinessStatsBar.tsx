import React from 'react';
import { BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

interface CbtReadinessStatsBarProps {
  totalTeoriPaket: number;
  paketSudahSiap: number;
  paketBelumSiap: number;
  totalGuruPenugasan?: number;
  guruSudahSiap?: number;
  guruBelumSiap?: number;
  scopeLabel?: string;
}

export const CbtReadinessStatsBar: React.FC<CbtReadinessStatsBarProps> = ({
  totalTeoriPaket,
  paketSudahSiap,
  paketBelumSiap,
}) => {
  const percentPaket = totalTeoriPaket > 0 ? Math.round((paketSudahSiap / totalTeoriPaket) * 100) : 0;
  const percentBelum = 100 - percentPaket;

  return (
    <div
      className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full max-w-full min-w-0"
      role="region"
      aria-label="Statistik Kesiapan Bank Soal"
    >
      {/* 3 Metrik Inti Horizontal Compact */}
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs">
        {/* Total Paket */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shrink-0">
            <BookOpen size={13} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Total Paket</span>
            <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">{totalTeoriPaket} Paket</span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Sudah Siap */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shrink-0">
            <CheckCircle2 size={13} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block leading-tight">Sudah Siap</span>
            <div className="flex items-baseline gap-1.5 leading-tight">
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{paketSudahSiap}</span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">({percentPaket}%)</span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Belum Siap */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40 shrink-0">
            <AlertCircle size={13} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block leading-tight">Belum Siap</span>
            <div className="flex items-baseline gap-1.5 leading-tight">
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">{paketBelumSiap}</span>
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">({percentBelum}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Visual Mini */}
      <div className="w-full sm:w-44 flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>Kesiapan Soal</span>
          <span className={percentPaket === 100 ? 'text-emerald-600' : 'text-indigo-600'}>{percentPaket}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${percentPaket}%` }}
          />
        </div>
      </div>
    </div>
  );
};
