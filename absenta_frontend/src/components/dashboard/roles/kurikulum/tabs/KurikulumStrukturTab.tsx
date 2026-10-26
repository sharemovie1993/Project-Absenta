import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  BookOpen,
  Search,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeArr, getKelompokLabel, type RowItem } from '@/components/kurikulum/dashboard/DashboardComponents';

export interface KurikulumStrukturTabProps {
  strRows: any[];
  kelompokOptions: { value: string; label: string }[];
  isVocational: boolean;
  loading?: boolean;
}

export const KurikulumStrukturTab: React.FC<KurikulumStrukturTabProps> = ({
  strRows,
  kelompokOptions,
  isVocational,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [selectedTingkat, setSelectedTingkat] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => safeArr<any>(strRows), [strRows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchTingkat = selectedTingkat === 'all' || Number(r.tingkat) === selectedTingkat;
      const mapelName = r.MataPelajaran?.nama_mapel || r.nama_mapel || '';
      const jurusanName = r.Jurusan?.nama || '';
      const matchSearch =
        !search ||
        mapelName.toLowerCase().includes(search.toLowerCase()) ||
        jurusanName.toLowerCase().includes(search.toLowerCase()) ||
        (r.kelompok && r.kelompok.toLowerCase().includes(search.toLowerCase()));
      return matchTingkat && matchSearch;
    });
  }, [rows, selectedTingkat, search]);

  const totalJp = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + (curr.jp_per_minggu || 0), 0);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Struktur Kurikulum & Alokasi JP
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
              {filtered.length} Mata Pelajaran ({totalJp} JP)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Komposisi kelompok mata pelajaran umum, kejuruan, muatan lokal, dan pilihan
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/kurikulum/struktur')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Sparkles size={14} />
          Kelola Struktur Lengkap
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedTingkat('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
              selectedTingkat === 'all'
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            Semua Tingkat
          </button>
          {[10, 11, 12].map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setSelectedTingkat(t)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                selectedTingkat === t
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              Kelas {t}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari mata pelajaran / jurusan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Rows Table / List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center">
          <BookOpen size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tidak ada data mata pelajaran pada filter ini
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((r, idx) => {
            const mapelName = r.MataPelajaran?.nama_mapel || r.nama_mapel || 'Mata Pelajaran';
            const kelompokLbl = getKelompokLabel(r.kelompok, kelompokOptions);
            const jurusan = r.Jurusan?.nama || 'Umum';

            return (
              <div
                key={r.id || idx}
                className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Tingkat {r.tingkat}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                      {kelompokLbl}
                    </span>
                    {isVocational && jurusan !== 'Umum' && (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        {jurusan}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {mapelName}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                    {r.jp_per_minggu || 0} JP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
