import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Building,
  Search,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { getJadwalKBM } from '@/api/attendance/jadwalKBM.api';
import { cn } from '@/lib/utils';
import { safeArr, detectConflicts, type JadwalEntry } from '@/components/kurikulum/dashboard/DashboardComponents';

const HARI_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export interface KurikulumJadwalTabProps {
  semesterId?: string;
  tahunPelajaranId?: string;
}

export const KurikulumJadwalTab: React.FC<KurikulumJadwalTabProps> = ({
  semesterId,
  tahunPelajaranId,
}) => {
  const navigate = useNavigate();
  const [selectedHari, setSelectedHari] = useState<string>('SENIN');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rawJadwal, isLoading } = useQuery({
    queryKey: ['attendance', 'jadwal-kbm-tab', semesterId, tahunPelajaranId],
    queryFn: () => getJadwalKBM({ semester_id: semesterId }),
    enabled: !!semesterId,
    staleTime: 5 * 60 * 1000,
  });

  const schedules = useMemo(() => {
    return safeArr<any>(rawJadwal);
  }, [rawJadwal]);

  const conflicts = useMemo(() => {
    return detectConflicts(safeArr<JadwalEntry>(rawJadwal));
  }, [rawJadwal]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchHari = !selectedHari || s.hari?.toUpperCase() === selectedHari.toUpperCase();
      const matchSearch =
        !searchQuery ||
        s.Kelas?.nama_kelas?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.Guru?.nama_guru?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.MataPelajaran?.nama_mapel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ruangan?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchHari && matchSearch;
    }).sort((a, b) => (a.jam_ke || 0) - (b.jam_ke || 0));
  }, [schedules, selectedHari, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Jadwal Pelajaran KBM
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
              {schedules.length} Sesi Terjadwal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Plotting jam tatap muka guru dan rombel kelas pada semester aktif
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/kurikulum/jadwal')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Sparkles size={14} />
          Buka Jadwal Builder
          <ExternalLink size={13} />
        </button>
      </div>

      {/* Conflict Box if any */}
      {conflicts.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <span className="font-bold">Perhatian: </span>
            Ditemukan {conflicts.length} jadwal bertabrakan pada hari dan jam yang sama. Periksa di Jadwal Builder.
          </div>
        </div>
      )}

      {/* Filter Row: Days + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Day Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {HARI_LIST.map((h) => {
            const countForDay = schedules.filter((s) => s.hari?.toUpperCase() === h).length;
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

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kelas, guru, mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Schedule Items Grid / Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center">
          <Calendar size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tidak ada jadwal pelajaran untuk hari {selectedHari.toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSchedules.map((s, idx) => (
            <div
              key={s.id || idx}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock size={11} />
                    Jam Ke-{s.jam_ke || '-'}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg">
                    {s.Kelas?.nama_kelas || 'Semua Kelas'}
                  </span>
                </div>

                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {s.MataPelajaran?.nama_mapel || 'Mata Pelajaran'}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Users size={13} className="shrink-0" />
                  <span className="truncate">{s.Guru?.nama_guru || 'Belum diplot'}</span>
                </div>
              </div>

              {s.ruangan && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building size={12} />
                    Ruang: {s.ruangan}
                  </span>
                  {s.durasi_menit && <span>{s.durasi_menit} menit</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
