import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Users,
  Search,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { piketGuruApi } from '@/api/piketGuru.api';
import { cn } from '@/lib/utils';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

const HARI_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export interface KurikulumPiketTabProps {
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const KurikulumPiketTab: React.FC<KurikulumPiketTabProps> = ({
  tahunPelajaranId,
  semesterId,
}) => {
  const navigate = useNavigate();
  const [selectedHari, setSelectedHari] = useState<string>('SENIN');
  const [search, setSearch] = useState('');

  const { data: rawPiket, isLoading } = useQuery({
    queryKey: ['piket-guru-kurikulum-tab', tahunPelajaranId, semesterId],
    queryFn: () => piketGuruApi.getList({
      tahun_pelajaran_id: tahunPelajaranId,
      semester_id: semesterId,
    }),
    enabled: !!tahunPelajaranId,
    staleTime: 5 * 60 * 1000,
  });

  const piketList = useMemo(() => {
    return safeArr<any>(rawPiket);
  }, [rawPiket]);

  const filteredPiket = useMemo(() => {
    return piketList.filter((p) => {
      const matchHari = !selectedHari || p.hari?.toUpperCase() === selectedHari.toUpperCase();
      const guruName = p.Guru?.nama_guru || p.nama_guru || '';
      const matchSearch = !search || guruName.toLowerCase().includes(search.toLowerCase());
      return matchHari && matchSearch;
    });
  }, [piketList, selectedHari, search]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Jadwal Piket Guru Harian
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              {piketList.length} Petugas Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pengaturan penugasan piket KBM, gerbang, dan ketertiban sekolah
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/kurikulum/piket')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Sparkles size={14} />
          Atur Penugasan Piket
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Filter Row: Day Pills + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {HARI_LIST.map((h) => {
            const countForDay = piketList.filter((p) => p.hari?.toUpperCase() === h).length;
            const isSelected = selectedHari === h;

            return (
              <button
                type="button"
                key={h}
                onClick={() => setSelectedHari(h)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                  isSelected
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                <span>{h.charAt(0) + h.slice(1).toLowerCase()}</span>
                {countForDay > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-md text-[10px]",
                      isSelected
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {countForDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru piket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {/* Piket List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredPiket.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center">
          <Clock size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Belum ada guru piket yang ditugaskan pada hari {selectedHari.toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPiket.map((p, idx) => {
            const nama = p.Guru?.nama_guru || p.nama_guru || 'Pendidik';
            const peran = p.peran || p.posisi || 'Petugas Piket KBM';

            return (
              <div
                key={p.id || idx}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-amber-500/20">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {nama}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {peran}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40 shrink-0">
                  {p.hari}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
