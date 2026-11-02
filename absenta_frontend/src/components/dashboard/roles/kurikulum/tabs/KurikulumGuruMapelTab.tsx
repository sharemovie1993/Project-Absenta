import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Award,
  AlertCircle,
  CheckCircle2,
  Filter,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuruMapelView } from '@/components/kurikulum/guru-mapel/GuruMapelView';

export interface KurikulumGuruMapelTabProps {
  tahunPelajaranId?: string;
  teachersLoad: { id: string; nama: string; jp: number; nip?: string }[];
  loading?: boolean;
}

export const KurikulumGuruMapelTab: React.FC<KurikulumGuruMapelTabProps> = ({
  tahunPelajaranId,
  teachersLoad,
  loading = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'plotting' | 'analisis'>('plotting');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overload' | 'normal' | 'underload'>('all');

  const stats = useMemo(() => {
    const total = teachersLoad.length;
    const overload = teachersLoad.filter((t) => t.jp > 24).length;
    const underload = teachersLoad.filter((t) => t.jp < 12).length;
    const normal = total - overload - underload;
    const totalJp = teachersLoad.reduce((acc, curr) => acc + (curr.jp || 0), 0);
    const avgJp = total > 0 ? (totalJp / total).toFixed(1) : '0';

    return { total, overload, underload, normal, totalJp, avgJp };
  }, [teachersLoad]);

  const filtered = useMemo(() => {
    return teachersLoad.filter((t) => {
      const matchSearch =
        !search ||
        t.nama.toLowerCase().includes(search.toLowerCase()) ||
        (t.nip && t.nip.includes(search));

      const isOverload = t.jp > 24;
      const isUnderload = t.jp < 12;

      if (filterStatus === 'overload') return matchSearch && isOverload;
      if (filterStatus === 'underload') return matchSearch && isUnderload;
      if (filterStatus === 'normal') return matchSearch && !isOverload && !isUnderload;
      return matchSearch;
    });
  }, [teachersLoad, search, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Subtab Navigator */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setActiveSubTab('plotting')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeSubTab === 'plotting'
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Layers size={14} />
            Plotting & Beban Guru
          </button>
          <button
            onClick={() => setActiveSubTab('analisis')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeSubTab === 'analisis'
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Users size={14} />
            Analisis Beban ({stats.overload > 0 ? `${stats.overload} Overload` : 'Optimal'})
          </button>
        </div>
      </div>

      {activeSubTab === 'plotting' ? (
        <GuruMapelView
          hideLayout={true}
          propTahunPelajaranId={tahunPelajaranId}
        />
      ) : (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <Users size={14} className="text-blue-500" />
                Total Pendidik
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.total}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Rata-rata {stats.avgJp} JP/minggu
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                <AlertCircle size={14} />
                Beban Lebih (&gt;24 JP)
              </div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {stats.overload}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Perlu redistribusi pengampu
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                Beban Ideal (12-24 JP)
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.normal}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Sesuai standar kementerian
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <Award size={14} />
                Beban Kurang (&lt;12 JP)
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {stats.underload}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                Dapat diberi tugas tambahan
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama guru atau NIP..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter size={14} className="text-slate-400 shrink-0 ml-1" />
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'overload', label: 'Overload' },
                  { id: 'normal', label: 'Ideal' },
                  { id: 'underload', label: 'Underload' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors",
                    filterStatus === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Teachers */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Memuat data beban mengajar...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Tidak ada data guru yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((t) => {
                const isOver = t.jp > 24;
                const isUnder = t.jp < 12;

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-blue-500/20">
                        {t.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {t.nama}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-mono mt-0.5">
                          {t.nip ? `NIP: ${t.nip}` : 'Pendidik Tetap'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-black",
                          isOver
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                            : isUnder
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                        )}
                      >
                        {t.jp} JP / Minggu
                      </span>
                      <span
                        className={cn(
                          "hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md",
                          isOver
                            ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                            : isUnder
                            ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                            : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                        )}
                      >
                        {isOver ? 'Overload' : isUnder ? 'Underload' : 'Ideal'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
