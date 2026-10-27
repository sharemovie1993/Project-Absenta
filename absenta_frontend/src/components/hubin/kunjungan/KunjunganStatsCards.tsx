import React from 'react';
import { Calendar, Building2, Users, CheckCircle2 } from 'lucide-react';
import type { KunjunganStats } from './types';

interface KunjunganStatsCardsProps {
  stats: KunjunganStats;
}

export const KunjunganStatsCards: React.FC<KunjunganStatsCardsProps> = React.memo(({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Kunjungan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kunjungan</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Calendar size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          {stats.totalKunjungan}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-0.5">Log observasi tercatat</div>
      </div>

      {/* 2. DU/DI Terkunjungi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mitra DU/DI</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Building2 size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          {stats.totalMitraTerkunjungi}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-0.5">Lokasi industri tersupervisi</div>
      </div>

      {/* 3. Siswa Terkunjungi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Siswa Bimbingan</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Users size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          {stats.totalSiswaTerkunjungi}
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-0.5">Siswa telah dipantau langsung</div>
      </div>

      {/* 4. Rasio Ketercapaian */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ketercapaian</span>
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <CheckCircle2 size={16} />
          </div>
        </div>
        <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          {stats.persentaseKunjungan}%
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-0.5">Target supervisi berkala</div>
      </div>
    </div>
  );
});

KunjunganStatsCards.displayName = 'KunjunganStatsCards';
