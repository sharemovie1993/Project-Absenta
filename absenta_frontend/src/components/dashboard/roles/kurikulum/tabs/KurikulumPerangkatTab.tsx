import React, { useState, useMemo, useCallback, useDeferredValue, useEffect, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckSquare,
  MessageSquare,
  Copy,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';
import { PersonPhoto } from '@/components/ui/PersonPhoto';
import { kurikulumApi } from '@/api/kurikulum.api';
import toast from 'react-hot-toast';
import { PerangkatAjarRolloverModal } from '@/components/kurikulum/perangkat-ajar/PerangkatAjarRolloverModal';

const PerangkatAjarReviewModal = lazy(() => import('@/components/kurikulum/perangkat-ajar/PerangkatAjarReviewModal'));

const PAGE_SIZE = 15;

export interface ActiveEducatorItem {
  id: string;
  nama_guru: string;
  nip?: string;
  foto?: string | null;
  foto_url?: string | null;
  User?: {
    foto?: string | null;
    foto_profil?: string | null;
  };
}

export interface KurikulumPerangkatTabProps {
  perangkatStats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    pctCompleteness: number;
    uniqueApprovedTeachersCount: number;
  };
  activeEducators: ActiveEducatorItem[];
  perangkatList: any[];
  loading?: boolean;
  currentTargetTpId?: string;
}

interface TeacherSubmissionItem {
  id: string;
  nama: string;
  nip?: string;
  foto: string | null;
  status: 'approved' | 'pending' | 'rejected' | 'unsubmitted';
  docCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  docs: any[];
}

function getFileFormatBadge(fileUrl?: string): { ext: string; badgeClass: string } {
  const cleanUrl = String(fileUrl || '').split('?')[0].toLowerCase();
  const extMatch = cleanUrl.match(/\.([a-z0-9]+)$/);
  const ext = (extMatch?.[1] || '').toUpperCase();

  if (ext === 'PDF') {
    return {
      ext,
      badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
    };
  }
  if (ext === 'PPTX' || ext === 'PPT') {
    return {
      ext,
      badgeClass: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-800',
    };
  }
  if (ext === 'DOCX' || ext === 'DOC') {
    return {
      ext,
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    };
  }
  if (ext === 'XLSX' || ext === 'XLS') {
    return {
      ext,
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  return {
    ext,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
}

const STATUS_PRIORITY: Record<TeacherSubmissionItem['status'], number> = {
  pending: 0,
  rejected: 1,
  approved: 2,
  unsubmitted: 3,
};

interface TeacherRowProps {
  teacher: TeacherSubmissionItem;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onOpenReview: (doc: any) => void;
  onOpenRolloverForGuru: (id: string, nama: string) => void;
}

const TeacherRow: React.FC<TeacherRowProps> = React.memo(({
  teacher: t,
  isExpanded,
  onToggleExpand,
  onOpenReview,
  onOpenRolloverForGuru,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand(t.id);
    }
  };

  const summaryParts: string[] = [];
  if (t.nip) summaryParts.push(`NIP ${t.nip}`);
  if (t.docCount > 0) {
    const counts: string[] = [];
    if (t.pendingCount > 0) counts.push(`${t.pendingCount} menunggu`);
    if (t.approvedCount > 0) counts.push(`${t.approvedCount} disetujui`);
    if (t.rejectedCount > 0) counts.push(`${t.rejectedCount} revisi`);
    summaryParts.push(`${t.docCount} berkas${counts.length > 0 ? ` (${counts.join(', ')})` : ''}`);
  } else {
    summaryParts.push('Belum mengunggah perangkat');
  }

  return (
    <div className="transition-colors">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => onToggleExpand(t.id)}
        onKeyDown={handleKeyDown}
        className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 cursor-pointer select-none focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
      >
        <div className="flex items-center gap-3 min-w-0">
          <PersonPhoto
            name={t.nama}
            foto={t.foto}
            variant="circle"
            size="md"
          />
          <div className="min-w-0">
            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {t.nama}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {summaryParts.join(' • ')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {t.status === 'approved' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
              <CheckCircle2 size={13} />
              <span className="hidden xs:inline">Lengkap</span>
            </span>
          ) : t.status === 'pending' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70">
              <Clock size={13} />
              <span className="hidden xs:inline">Menunggu Review</span>
            </span>
          ) : t.status === 'rejected' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/70">
              <XCircle size={13} />
              <span className="hidden xs:inline">Perlu Revisi</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70">
              <XCircle size={13} />
              <span className="hidden xs:inline">Belum Lengkap</span>
            </span>
          )}

          <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-slate-50/70 dark:bg-slate-950/40 px-3.5 sm:px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          {t.docs.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 italic space-y-2">
              <div>Belum ada dokumen perangkat ajar yang diunggah oleh guru ini pada tahun ajaran aktif.</div>
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRolloverForGuru(t.id, t.nama);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold not-italic transition-all shadow-xs cursor-pointer"
                >
                  <Copy size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Salin dari Tahun Lalu untuk Guru Ini</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Dokumen ({t.docs.length})
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRolloverForGuru(t.id, t.nama);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 text-[10px] font-bold transition-all cursor-pointer"
                  title={`Salin perangkat tahun lalu khusus untuk ${t.nama}`}
                >
                  <Copy size={11} />
                  <span>Salin Tahun Lalu</span>
                </button>
              </div>
              {t.docs.map((doc: any) => {
                const docStatus = String(doc.status || 'PENDING').toUpperCase();
                const { ext: fileExt, badgeClass: fmtBadgeClass } = getFileFormatBadge(doc.file_url);
                return (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {String(doc.judul || 'Dokumen Perangkat Ajar')}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {doc.jenis}
                        </span>
                        {fileExt && (
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-black uppercase border font-mono', fmtBadgeClass)}>
                            {fileExt}
                          </span>
                        )}
                        {doc.Mapel?.nama_mapel && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {doc.Mapel.nama_mapel}
                          </span>
                        )}
                        {doc.file_exists === false && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                            Berkas Hilang
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReview(doc);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Baca Langsung & Pratinjau Berkas"
                        >
                          <Eye size={15} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReview(doc);
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
});
TeacherRow.displayName = 'TeacherRow';

export const KurikulumPerangkatTab: React.FC<KurikulumPerangkatTabProps> = ({
  perangkatStats,
  activeEducators,
  perangkatList,
  loading = false,
  currentTargetTpId,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'unsubmitted'>('all');
  const [expandedGuruId, setExpandedGuruId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Rollover Modal States
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [rolloverTargetGuruId, setRolloverTargetGuruId] = useState<string | undefined>();
  const [rolloverTargetGuruNama, setRolloverTargetGuruNama] = useState<string | undefined>();

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

  const safeEducators = useMemo(() => safeArr<ActiveEducatorItem>(activeEducators), [activeEducators]);

  // O(N + M) grouping by guru_id + priority sorting (pending -> rejected -> approved -> unsubmitted)
  const teachersSubmission = useMemo<TeacherSubmissionItem[]>(() => {
    const list = safeArr<any>(perangkatList);
    const docsByGuru = new Map<string, any[]>();

    for (const p of list) {
      if (!p?.guru_id) continue;
      const bucket = docsByGuru.get(p.guru_id);
      if (bucket) {
        bucket.push(p);
      } else {
        docsByGuru.set(p.guru_id, [p]);
      }
    }

    const mapped = safeEducators.map((g) => {
      const docs = docsByGuru.get(g.id) || [];
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      for (const d of docs) {
        const st = String(d?.status || '').toUpperCase();
        if (st === 'APPROVED') approvedCount += 1;
        else if (st === 'REJECTED') rejectedCount += 1;
        else pendingCount += 1;
      }

      let status: TeacherSubmissionItem['status'] = 'unsubmitted';
      if (pendingCount > 0) status = 'pending';
      else if (rejectedCount > 0) status = 'rejected';
      else if (approvedCount > 0) status = 'approved';

      const foto = g.foto || g.foto_url || g.User?.foto || g.User?.foto_profil || null;

      return {
        id: g.id,
        nama: String(g.nama_guru || 'Guru Tanpa Nama').trim(),
        nip: g.nip,
        foto,
        status,
        docCount: docs.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        docs,
      };
    });

    mapped.sort((a, b) => {
      const prioDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (prioDiff !== 0) return prioDiff;
      return a.nama.localeCompare(b.nama, 'id');
    });

    return mapped;
  }, [safeEducators, perangkatList]);

  const filteredTeachers = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return teachersSubmission.filter((t) => {
      const matchSearch =
        !q ||
        t.nama.toLowerCase().includes(q) ||
        (t.nip ? t.nip.toLowerCase().includes(q) : false);

      if (!matchSearch) return false;
      if (filterStatus === 'approved') return t.status === 'approved';
      if (filterStatus === 'pending') return t.status === 'pending';
      if (filterStatus === 'unsubmitted') return t.status === 'unsubmitted' || t.status === 'rejected';
      return true;
    });
  }, [teachersSubmission, deferredSearch, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, filterStatus]);

  const paginatedTeachers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTeachers.slice(start, start + PAGE_SIZE);
  }, [filteredTeachers, safePage]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedGuruId((prev) => (prev === id ? null : id));
  }, []);

  const handleOpenRolloverForGuru = useCallback((id: string, nama: string) => {
    setRolloverTargetGuruId(id);
    setRolloverTargetGuruNama(nama);
    setIsRolloverModalOpen(true);
  }, []);

  const handleOpenReview = useCallback((doc: any) => {
    if (!doc) return;
    setSelectedDocForReview(doc);
    const st = String(doc.status || '').toUpperCase();
    setReviewForm({
      status: st === 'APPROVED' || st === 'REJECTED' ? st : 'APPROVED',
      catatan_reviewer: doc.catatan_reviewer || '',
    });
    setReviewModalOpen(true);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewModalOpen(false);
    setSelectedDocForReview(null);
  }, []);

  const handleSubmitReview = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForReview?.id || isSubmittingReview) return;

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
  }, [selectedDocForReview, isSubmittingReview, reviewForm, queryClient, handleCloseReview]);

  return (
    <div className="space-y-4">
      {/* Top Header Card — Murni Monitoring & Status Persetujuan In-Place */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              setRolloverTargetGuruId(undefined);
              setRolloverTargetGuruNama(undefined);
              setIsRolloverModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Salin Perangkat Ajar dari Tahun Sebelumnya (Massal / Per-Guru)"
          >
            <Copy size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Salin dari Tahun Lalu</span>
          </button>

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
          <div className="text-[10px] opacity-60 mt-0.5">{safeEducators.length} Guru</div>
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
            {Math.max(0, safeEducators.length - perangkatStats.uniqueApprovedTeachersCount)}
          </div>
          <div className="text-[10px] opacity-60 mt-0.5">Pendidik pending</div>
        </button>
      </div>

      {/* Search Bar & Counter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama atau NIP guru pendidik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/25 shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0 text-center">
          {filteredTeachers.length} Pendidik
        </div>
      </div>

      {/* Teachers Perangkat List (Paginated & Memoized In-Place Inspection) */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedTeachers.map((t) => (
              <TeacherRow
                key={t.id}
                teacher={t}
                isExpanded={expandedGuruId === t.id}
                onToggleExpand={handleToggleExpand}
                onOpenReview={handleOpenReview}
                onOpenRolloverForGuru={handleOpenRolloverForGuru}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Menampilkan {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredTeachers.length)} dari {filteredTeachers.length} pendidik
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <span className="px-2 text-[11px] font-black text-slate-700 dark:text-slate-300 font-mono">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In-Place Review Modal */}
      <Suspense fallback={null}>
        {reviewModalOpen && (
          <PerangkatAjarReviewModal
            isOpen={reviewModalOpen}
            onClose={handleCloseReview}
            reviewingItem={selectedDocForReview}
            reviewForm={reviewForm}
            setReviewForm={setReviewForm}
            isSubmitting={isSubmittingReview}
            onSubmit={handleSubmitReview}
          />
        )}
      </Suspense>

      {/* Rollover Salin dari Tahun Lalu Modal */}
      <PerangkatAjarRolloverModal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
        currentTargetTpId={currentTargetTpId}
        currentGuruId={rolloverTargetGuruId}
        currentGuruNama={rolloverTargetGuruNama}
        isGuruContext={Boolean(rolloverTargetGuruId)}
        activeEducators={safeEducators}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['kurikulum', 'perangkat-dash'] });
          queryClient.invalidateQueries({ queryKey: ['perangkat-ajar'] });
        }}
      />
    </div>
  );
};
