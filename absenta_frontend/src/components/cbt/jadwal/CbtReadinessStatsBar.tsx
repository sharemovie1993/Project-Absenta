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
  scopeLabel,
}) => {
  const percentPaket = totalTeoriPaket > 0 ? Math.round((paketSudahSiap / totalTeoriPaket) * 100) : 0;
  const percentBelum = 100 - percentPaket;

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-full min-w-0"
      role="region"
      aria-label="Statistik Kesiapan Bank Soal"
    >
      {/* 1. Total Kebutuhan Paket */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Paket Soal {scopeLabel ? `(${scopeLabel})` : ''}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {totalTeoriPaket}
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40">
          <BookOpen size={17} />
        </div>
      </div>

      {/* 2. Sudah Siap */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Sudah Siap
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {paketSudahSiap}
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
              {percentPaket}%
            </span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
          <CheckCircle2 size={17} />
        </div>
      </div>

      {/* 3. Belum Siap */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Belum Siap
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {paketBelumSiap}
            </span>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200/80 dark:border-rose-800/60">
              {percentBelum}%
            </span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
          <AlertCircle size={17} />
        </div>
      </div>
    </div>
  );
};
