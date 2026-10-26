import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  ExternalLink,
  Award,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Filter,
  GraduationCap,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KurikulumGuruMapelTabProps {
  teachersLoad: { id: string; nama: string; jp: number; nip?: string }[];
  loading?: boolean;
}

export const KurikulumGuruMapelTab: React.FC<KurikulumGuruMapelTabProps> = ({
  teachersLoad,
  loading = false,
}) => {
  const navigate = useNavigate();
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
      const isNormal = !isOverload && !isUnderload;

      if (filterStatus === 'overload') return matchSearch && isOverload;
      if (filterStatus === 'underload') return matchSearch && isUnderload;
      if (filterStatus === 'normal') return matchSearch && isNormal;
      return matchSearch;
    });
  }, [teachersLoad, search, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Plotting Beban Mengajar Guru
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
              {stats.total} Pendidik
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitoring pemenuhan jam wajib mengajar (12 - 24 JP per minggu)
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/kurikulum/guru-mapel')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Sparkles size={14} />
          Kelola Plotting Guru
          <ExternalLink size={13} />
        </button>
      </div>

      {/* KPI Bento Grid */}
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
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Total Pendidik</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.total}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Rata-rata: {stats.avgJp} JP</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('normal')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'normal'
              ? "bg-emerald-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Beban Ideal (12-24 JP)</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.normal}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Sesuai ketentuan</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('overload')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'overload'
              ? "bg-rose-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:border-rose-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Beban Lebih (&gt;24 JP)</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.overload}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Perlu pemerataan</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('underload')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'underload'
              ? "bg-amber-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:border-amber-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Beban Kurang (&lt;12 JP)</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{stats.underload}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Belum memenuhi target</div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama guru pendidik atau NIP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Teachers List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center">
          <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tidak ditemukan data guru dengan kriteria yang dipilih
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((t) => {
            const isOver = t.jp > 24;
            const isUnder = t.jp < 12;

            return (
              <div
                key={t.id}
                className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
  );
};
