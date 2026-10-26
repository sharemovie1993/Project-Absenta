import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Sparkles,
  Users,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

export interface KurikulumPerangkatTabProps {
  perangkatStats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    pctCompleteness: number;
    uniqueApprovedTeachersCount: number;
  };
  activeEducators: { id: string; nama_guru: string; nip?: string }[];
  perangkatList: any[];
  loading?: boolean;
}

export const KurikulumPerangkatTab: React.FC<KurikulumPerangkatTabProps> = ({
  perangkatStats,
  activeEducators,
  perangkatList,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'unsubmitted'>('all');

  const teachersSubmission = useMemo(() => {
    const list = safeArr<any>(perangkatList);
    const approvedGuruIds = new Set(
      list.filter((p) => p.status?.toUpperCase() === 'APPROVED' && p.guru_id).map((p) => p.guru_id)
    );
    const pendingGuruIds = new Set(
      list.filter((p) => (p.status?.toUpperCase() === 'PENDING' || p.status?.toUpperCase() === 'SUBMITTED') && p.guru_id).map((p) => p.guru_id)
    );

    return activeEducators.map((g) => {
      let status: 'approved' | 'pending' | 'unsubmitted' = 'unsubmitted';
      if (approvedGuruIds.has(g.id)) {
        status = 'approved';
      } else if (pendingGuruIds.has(g.id)) {
        status = 'pending';
      }

      const docs = list.filter((p) => p.guru_id === g.id);

      return {
        id: g.id,
        nama: g.nama_guru,
        nip: g.nip,
        status,
        docCount: docs.length,
      };
    });
  }, [activeEducators, perangkatList]);

  const filteredTeachers = useMemo(() => {
    return teachersSubmission.filter((t) => {
      const matchSearch =
        !search ||
        t.nama.toLowerCase().includes(search.toLowerCase()) ||
        (t.nip && t.nip.includes(search));

      if (filterStatus === 'approved') return matchSearch && t.status === 'approved';
      if (filterStatus === 'pending') return matchSearch && t.status === 'pending';
      if (filterStatus === 'unsubmitted') return matchSearch && t.status === 'unsubmitted';
      return matchSearch;
    });
  }, [teachersSubmission, search, filterStatus]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Perangkat & Modul Ajar Guru
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
              {perangkatStats.pctCompleteness}% Kelengkapan
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pemeriksaan dan persetujuan ATP, Modul Ajar, Silabus, dan Program Tahunan
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/kurikulum/perangkat')}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors"
        >
          <Sparkles size={14} />
          Verifikasi Perangkat
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
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Total Berkas</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{perangkatStats.total}</div>
          <div className="text-[10px] opacity-60 mt-0.5">{activeEducators.length} Guru</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('approved')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'approved'
              ? "bg-emerald-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Telah Disetujui</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{perangkatStats.approved}</div>
          <div className="text-[10px] opacity-60 mt-0.5">{perangkatStats.uniqueApprovedTeachersCount} Guru tuntas</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'pending'
              ? "bg-amber-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-amber-600 dark:text-amber-400 hover:border-amber-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Menunggu Review</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">{perangkatStats.pending}</div>
          <div className="text-[10px] opacity-60 mt-0.5">Perlu diverifikasi</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus('unsubmitted')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all",
            filterStatus === 'unsubmitted'
              ? "bg-rose-600 text-white border-transparent shadow-xs"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-rose-600 dark:text-rose-400 hover:border-rose-300"
          )}
        >
          <div className="text-[10px] sm:text-xs font-bold opacity-75">Belum Lengkap</div>
          <div className="text-lg sm:text-2xl font-black mt-0.5">
            {Math.max(0, activeEducators.length - perangkatStats.uniqueApprovedTeachersCount)}
          </div>
          <div className="text-[10px] opacity-60 mt-0.5">Pendidik pending</div>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama guru pendidik..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* Teachers Perangkat List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center">
          <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tidak ditemukan data pendidik dengan filter ini
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTeachers.map((t) => (
            <div
              key={t.id}
              className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-teal-500/20">
                  {t.nama.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {t.nama}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {t.docCount > 0 ? `${t.docCount} dokumen diunggah` : 'Belum mengunggah perangkat'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {t.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 size={13} />
                    Lengkap
                  </span>
                ) : t.status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                    <Clock size={13} />
                    Menunggu Verifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                    <XCircle size={13} />
                    Belum Lengkap
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
