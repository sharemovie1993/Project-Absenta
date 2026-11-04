import React from 'react';
import { CheckCircle2, AlertCircle, BookOpen, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CbtReadinessStatsBarProps {
  totalTeoriPaket: number;
  paketSudahSiap: number;
  paketBelumSiap: number;
  totalGuruPenugasan: number;
  guruSudahSiap: number;
  guruBelumSiap: number;
}

export const CbtReadinessStatsBar: React.FC<CbtReadinessStatsBarProps> = ({
  totalTeoriPaket,
  paketSudahSiap,
  paketBelumSiap,
  totalGuruPenugasan,
  guruSudahSiap,
  guruBelumSiap,
}) => {
  const percentPaket = totalTeoriPaket > 0 ? Math.round((paketSudahSiap / totalTeoriPaket) * 100) : 0;
  const percentGuru = totalGuruPenugasan > 0 ? Math.round((guruSudahSiap / totalGuruPenugasan) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
      {/* ── 3 Kartu Barometer Utama ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Total Teori Bank Soal */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen size={13} className="text-violet-600 dark:text-violet-400" />
              <span>1. Total Teori Bank Soal</span>
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalTeoriPaket}</span>
              <span className="text-xs text-slate-500 font-medium">Paket Mapel-Tingkat</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Mewadahi {totalGuruPenugasan} penugasan guru aktif
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 flex items-center justify-center font-black text-sm">
            100%
          </div>
        </div>

        {/* 2. Sudah Siap (Bank Asli + Shared MGMP) */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>2. Sudah Siap (Asli + Shared)</span>
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{paketSudahSiap}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Paket Terpenuhi</span>
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 flex items-center gap-1">
              <Users size={11} />
              <span>{guruSudahSiap} Guru Aman / Ter-cover</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-200 flex items-center justify-center font-black text-sm">
            {percentPaket}%
          </div>
        </div>

        {/* 3. Belum Siap (Perlu Tindakan) */}
        <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle size={13} className="text-rose-600 dark:text-rose-400" />
              <span>3. Belum Siap (Perlu Colek)</span>
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{paketBelumSiap}</span>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Paket Kurang</span>
            </div>
            <div className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5 flex items-center gap-1">
              <Users size={11} />
              <span>{guruBelumSiap} Guru Belum Menyerahkan</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 flex items-center justify-center font-black text-sm">
            {100 - percentPaket}%
          </div>
        </div>
      </div>

      {/* ── Progress Bar Visual Minimalis ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-0.5">
          <span>Kesiapan Paket Soal: <strong>{paketSudahSiap}</strong> dari <strong>{totalTeoriPaket}</strong> paket ({percentPaket}%)</span>
          <span>Cakupan Guru: <strong>{guruSudahSiap}</strong> dari <strong>{totalGuruPenugasan}</strong> guru ({percentGuru}%)</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
          <div
            style={{ width: `${percentPaket}%` }}
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            title={`Sudah Siap: ${percentPaket}%`}
          />
        </div>
      </div>
    </div>
  );
};
