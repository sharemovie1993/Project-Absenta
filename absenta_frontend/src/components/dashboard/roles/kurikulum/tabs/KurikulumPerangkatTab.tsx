import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  CheckSquare,
  Sparkles,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';
import { kurikulumApi } from '@/api/kurikulum.api';
import toast from 'react-hot-toast';

const PerangkatAjarReviewModal = lazy(() => import('@/components/kurikulum/perangkat-ajar/PerangkatAjarReviewModal'));

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'unsubmitted'>('all');
  const [expandedGuruId, setExpandedGuruId] = useState<string | null>(null);

  // Modal Review State (In-place Approval)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocForReview, setSelectedDocForReview] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState<{
    status: 'APPROVED' | 'REJECTED';
    catatan_reviewer: string;
  }>({
    status: 'APPROVED',
    catatan_reviewer: '',
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      if (pendingGuruIds.has(g.id)) {
        status = 'pending';
      } else if (approvedGuruIds.has(g.id)) {
        status = 'approved';
      }

      const docs = list.filter((p) => p.guru_id === g.id);

      return {
        id: g.id,
        nama: g.nama_guru,
        nip: g.nip,
        status,
        docCount: docs.length,
        docs,
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

  const handleOpenReview = (doc: any) => {
    setSelectedDocForReview(doc);
    setReviewForm({
      status: (doc.status?.toUpperCase() === 'APPROVED' || doc.status?.toUpperCase() === 'REJECTED')
        ? doc.status.toUpperCase()
        : 'APPROVED',
      catatan_reviewer: doc.catatan_reviewer || '',
    });
    setReviewModalOpen(true);
  };

  const handleCloseReview = () => {
    setReviewModalOpen(false);
    setSelectedDocForReview(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForReview?.id) return;

    try {
      setIsSubmittingReview(true);
      await kurikulumApi.reviewPerangkatAjar(selectedDocForReview.id, {
        status: reviewForm.status,
        catatan_reviewer: reviewForm.catatan_reviewer || null,
      });

      toast.success(
        reviewForm.status === 'APPROVED'
          ? 'Perangkat ajar berhasil disetujui (Approved)'
          : 'Catatan revisi berhasil disimpan (Rejected)'
      );

      queryClient.invalidateQueries({ queryKey: ['kurikulum', 'perangkat-dash'] });
      queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
      handleCloseReview();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses verifikasi');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card — Murni Monitoring & Status Persetujuan In-Place */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Monitoring & Verifikasi Perangkat Ajar
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300">
              {perangkatStats.pctCompleteness}% Kelengkapan
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pemeriksaan dan persetujuan ATP, Modul Ajar, Silabus, dan Program Tahunan guru secara langsung
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {perangkatStats.pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold shadow-xs animate-pulse">
              <Clock size={14} />
              {perangkatStats.pending} Berkas Menunggu Review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-xs">
              <CheckCircle2 size={14} />
              Semua Berkas Terverifikasi
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards — Filterable Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={cn(
            "p-3 rounded-xl border text-left transition-all cursor-pointer",
            filterStatus === 'all'
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs ring-2 ring-slate-400"
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
            "p-3 rounded-xl border text-left transition-all cursor-pointer",
            filterStatus === 'approved'
              ? "bg-emerald-600 text-white border-transparent shadow-xs ring-2 ring-emerald-400"
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
            "p-3 rounded-xl border text-left transition-all cursor-pointer",
            filterStatus === 'pending'
              ? "bg-amber-600 text-white border-transparent shadow-xs ring-2 ring-amber-400"
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
            "p-3 rounded-xl border text-left transition-all cursor-pointer",
            filterStatus === 'unsubmitted'
              ? "bg-rose-600 text-white border-transparent shadow-xs ring-2 ring-rose-400"
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

      {/* Teachers Perangkat List (Interactive In-Place Inspection) */}
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
          {filteredTeachers.map((t) => {
            const isExpanded = expandedGuruId === t.id;
            return (
              <div key={t.id} className="transition-colors">
                <div
                  onClick={() => setExpandedGuruId(isExpanded ? null : t.id)}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none"
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
                        {t.docCount > 0 ? `${t.docCount} dokumen tersimpan • Klik untuk periksa berkas` : 'Belum mengunggah perangkat'}
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
                        Menunggu Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                        <XCircle size={13} />
                        Belum Lengkap
                      </span>
                    )}

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded In-Place Documents List */}
                {isExpanded && (
                  <div className="bg-slate-50/70 dark:bg-slate-950/40 px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                    {t.docs.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Belum ada dokumen perangkat ajar yang diunggah oleh guru ini.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                          Daftar Dokumen ({t.docs.length})
                        </div>
                        {t.docs.map((doc: any) => {
                          const docStatus = String(doc.status || 'PENDING').toUpperCase();
                          return (
                            <div
                              key={doc.id}
                              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-2xs"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {doc.judul}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {doc.jenis}
                                  </span>
                                  {doc.Mapel?.nama_mapel && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                      {doc.Mapel.nama_mapel}
                                    </span>
                                  )}
                                </div>
                                {doc.catatan_reviewer && (
                                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                                    <MessageSquare size={12} className="shrink-0" />
                                    <span>Catatan Revisi: {doc.catatan_reviewer}</span>
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                {docStatus === 'APPROVED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    Disetujui
                                  </span>
                                ) : docStatus === 'REJECTED' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                    Perlu Revisi
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    Menunggu Review
                                  </span>
                                )}

                                {doc.file_url && (
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Lihat Berkas"
                                  >
                                    <Eye size={15} />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenReview(doc);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  <CheckSquare size={13} />
                                  Verifikasi
                                </button>
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
          })}
        </div>
      )}

      {/* In-Place Review Modal */}
      <Suspense fallback={null}>
        {reviewModalOpen && (
          <PerangkatAjarReviewModal
            isOpen={reviewModalOpen}
            onClose={handleCloseReview}
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            isSubmitting={isSubmittingReview}
            onSubmit={handleSubmitReview}
          />
        )}
      </Suspense>
    </div>
  );
};
