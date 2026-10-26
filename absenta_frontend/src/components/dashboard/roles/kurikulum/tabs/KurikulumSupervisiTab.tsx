import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Search,
  ExternalLink,
  Sparkles,
  Award,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeArr, type SupervisiRecentItem } from '@/components/kurikulum/dashboard/DashboardComponents';

export interface KurikulumSupervisiTabProps {
  supRows: SupervisiRecentItem[];
  supPct: number;
  loading?: boolean;
}

export const KurikulumSupervisiTab: React.FC<KurikulumSupervisiTabProps> = ({
  supRows,
  supPct,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'selesai' | 'terjadwal'>('all');

  const rows = useMemo(() => safeArr<SupervisiRecentItem>(supRows), [supRows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const selesai = rows.filter((r) => r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI').length;
    const terjadwal = rows.filter((r) => r.status?.toUpperCase() === 'SCHEDULED' || r.status?.toUpperCase() === 'TERJADWAL').length;
    const belum = Math.max(0, total - selesai - terjadwal);
    return { total, selesai, terjadwal, belum };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const guruName = r.Guru?.nama_guru || r.nama_guru || '';
      const supervisorName = r.Supervisor?.nama_guru || r.nama_penilai || '';
      const matchSearch =
        !search ||
        guruName.toLowerCase().includes(search.toLowerCase()) ||
        supervisorName.toLowerCase().includes(search.toLowerCase());

      const statusUpper = r.status?.toUpperCase() || '';
      const isSelesai = statusUpper === 'COMPLETED' || statusUpper === 'SELESAI';
      const isTerjadwal = statusUpper === 'SCHEDULED' || statusUpper === 'TERJADWAL';

      if (filterStatus === 'selesai') return matchSearch && isSelesai;
      if (filterStatus === 'terjadwal') return matchSearch && isTerjadwal;
      return matchSearch;
    });
  }, [rows, search, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Supervisi & Kinerja Akademik Guru
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
              {supPct}% Tuntas Observasi
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pelaksanaan observasi pembelajaran kelas dan evaluasi pedagogik guru
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/kurikulum/supervisi')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Sparkles size={14} />
          Jadwalkan Observasi
          <ExternalLink size={13} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'all'
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Target Observasi</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.total}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Seluruh pendidik</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('selesai')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'selesai'
              ? "bg-emerald-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Selesai Dinilai</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.selesai}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Observasi rampung</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('terjadwal')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'terjadwal'
              ? "bg-amber-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:border-amber-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Terjadwal</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.terjadwal}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Menunggu observasi</div>
        </button>

        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200">
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Tingkat Capaian</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5 text-purple-600 dark:text-purple-400">
            {supPct}%
          </div>
          <div className="text-[10px] opacity-60 mt-0.5">Progres akademik</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama guru atau supervisor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
        />
      </div>

      {/* Supervisi Rows */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center">
          <CheckCircle2 size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tidak ditemukan data supervisi dengan filter ini
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((r, idx) => {
            const guruName = r.Guru?.nama_guru || r.nama_guru || 'Pendidik';
            const penilaiName = r.Supervisor?.nama_guru || r.nama_penilai || 'Kepala Sekolah / Tim';
            const isCompleted = r.status?.toUpperCase() === 'COMPLETED' || r.status?.toUpperCase() === 'SELESAI';
            const dateStr = r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

            return (
              <div
                key={r.id || idx}
                className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-purple-500/20">
                    <Award size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {guruName}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      Penilai: {penilaiName} &bull; Tanggal: {dateStr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {r.nilai && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">
                      Skor: {r.nilai}
                    </span>
                  )}
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      <CheckCircle2 size={13} />
                      Selesai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                      <Clock size={13} />
                      Terjadwal
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
