import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { bpbkApi, type HomeVisit, bpbkQueryKeys } from '../../../api/bpbk.api';
import { uploadSiswaDocument, downloadSiswaDocumentFile } from '../../../api/academic/siswa.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import { DebouncedSearchInput } from '../../../components/ui';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { formatDate } from '../../../utils/layoutUtils';
import { Plus, Edit2, Trash2, Home, Paperclip, Eye, History, Download, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));
const BpbkSiswaHistoryView = lazy(() => import('./BpbkSiswaHistoryView').then(m => ({ default: m.BpbkSiswaHistoryView })));

const homeVisitSchema = z.object({
  siswa_id: z.string().min(1, 'Harap pilih siswa terlebih dahulu'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  alasan: z.string().min(1, 'Harap isi alasan kunjungan'),
  hasil: z.string().optional()
});

export const HomeVisitSection: React.FC = React.memo(() => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const confirm = useConfirm();

  // Form & Viewer states
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<{ id: string; nama_siswa?: string; nis?: string; Kelas?: { nama_kelas?: string }; kelas_name?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<HomeVisit | null>(null);

  // Documentation Preview Modal state
  const [previewTarget, setPreviewTarget] = useState<(HomeVisit & { Dokumen?: { id?: string; file_original_name?: string; mime_type?: string } }) | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const handleClosePreview = useCallback(() => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setPreviewMime('');
    setPreviewTarget(null);
  }, [previewBlobUrl]);

  const handleOpenPreview = useCallback(async (item: HomeVisit & { Dokumen?: { id?: string; file_original_name?: string; mime_type?: string } }) => {
    const docId = item.foto_dokumen_id || item.Dokumen?.id;
    if (!docId || !item.siswa_id) {
      toast.error('Dokumentasi belum tersedia');
      return;
    }
    setPreviewTarget(item);
    setLoadingPreview(true);
    try {
      const blob = await downloadSiswaDocumentFile(item.siswa_id, docId);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setPreviewMime(blob.type || item.Dokumen?.mime_type || '');
    } catch {
      toast.error('Gagal memuat file dokumentasi');
      setPreviewTarget(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleDownloadAttachment = useCallback(() => {
    if (!previewBlobUrl || !previewTarget) return;
    const a = document.createElement('a');
    a.href = previewBlobUrl;
    a.download = previewTarget.Dokumen?.file_original_name || `home-visit-${previewTarget.id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [previewBlobUrl, previewTarget]);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    alasan: '',
    hasil: '',
    file: null as File | null
  });

  const queryClient = useQueryClient();

  // ── useQuery: Home Visit List ─────────────────────────────────────────────
  const { data: homeVisitRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.homeVisitList({ page, limit }),
    queryFn: () => bpbkApi.getHomeVisits({ page, limit }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => Array.isArray(homeVisitRes?.data) ? homeVisitRes.data : homeVisitRes?.data?.list || [], [homeVisitRes]);
  const totalPages = homeVisitRes?.data?.pagination?.totalPages || 1;
  const totalItems = homeVisitRes?.data?.pagination?.total || data.length;

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item: HomeVisit) =>
      (item.Siswa?.nama_siswa || '').toLowerCase().includes(q) ||
      (item.alasan || '').toLowerCase().includes(q) ||
      (item.hasil || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = data.filter((item: HomeVisit) => {
      const d = new Date(item.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const withDocs = data.filter((item: HomeVisit & { Dokumen?: unknown }) => Boolean(item.foto_dokumen_id || item.Dokumen)).length;
    return {
      total: totalItems,
      thisMonth,
      withDocs,
    };
  }, [data, totalItems]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      alasan: '',
      hasil: '',
      file: null
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: HomeVisit) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      alasan: item.alasan,
      hasil: item.hasil || '',
      file: null
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Log Home Visit',
      description: 'Apakah Anda yakin ingin menghapus catatan kunjungan rumah ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deleteHomeVisit(id);
      if (res.success) {
        toast.success('Log kunjungan rumah berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
        refetch();
      } else {
        toast.error(res.message || 'Gagal menghapus');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi bermasalah';
      toast.error(errorMsg);
    }
  }, [confirm, queryClient, refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parseResult = homeVisitSchema.safeParse(formData);
    if (!parseResult.success) {
      toast.error(parseResult.error.errors[0]?.message || 'Data tidak valid');
      return;
    }

    try {
      setSaving(true);
      let docId = undefined;

      // 1. Upload scan file if chosen
      if (formData.file) {
        const uploadRes = await uploadSiswaDocument(
          formData.siswa_id,
          formData.file,
          `Foto/Laporan Home Visit - ${selectedSiswa?.nama_siswa || 'Siswa'}`,
          'LAPORAN_BK'
        );
        docId = (uploadRes as { data?: { id?: string } })?.data?.id;
      }

      const payload = {
        siswa_id: formData.siswa_id,
        tanggal: new Date(formData.tanggal),
        alasan: formData.alasan,
        hasil: formData.hasil || undefined,
        foto_dokumen_id: docId
      };

      if (selectedId) {
        await bpbkApi.updateHomeVisit(selectedId, payload);
        toast.success('Log kunjungan rumah berhasil diperbarui');
      } else {
        await bpbkApi.createHomeVisit(payload);
        toast.success('Kunjungan rumah baru berhasil dicatat');
      }

      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan kunjungan rumah';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal Kunjungan',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          {value ? formatDate(String(value), { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_: unknown, item: unknown) => {
        const row = item as HomeVisit;
        return (
          <div
            className="cursor-pointer group min-w-[130px]"
            onClick={() => row.siswa_id && setHistorySiswaId(row.siswa_id)}
            title="Lihat Riwayat & Rekam Jejak BP/BK Siswa"
          >
            <div className="font-bold text-slate-800 dark:text-white text-xs group-hover:text-indigo-600 transition-colors">
              {row.Siswa?.nama_siswa}
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              {row.Siswa?.Kelas?.nama_kelas || '-'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'alasan',
      label: 'Alasan Kunjungan',
      render: (value: unknown) => (
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2 max-w-xs">{String(value || '-')}</p>
      )
    },
    {
      key: 'hasil',
      label: 'Hasil / Kesepakatan',
      render: (value: unknown) => (
        <p className="text-xs font-medium text-slate-500 line-clamp-2 max-w-xs">{String(value || '-')}</p>
      )
    },
    {
      key: 'attachments',
      label: 'Dokumentasi',
      render: (_: unknown, item: unknown) => {
        const row = item as HomeVisit & { Dokumen?: { id?: string; file_original_name?: string; mime_type?: string } };
        if (!row.Dokumen && !row.foto_dokumen_id) {
          return <span className="text-slate-400 text-[10px] font-bold uppercase">-</span>;
        }
        return (
          <button
            type="button"
            onClick={() => handleOpenPreview(row)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 transition-colors cursor-pointer whitespace-nowrap"
            title={row.Dokumen?.file_original_name || 'Lihat Dokumentasi'}
          >
            <ImageIcon className="w-3 h-3 shrink-0" />
            <span>Lihat Foto / File</span>
          </button>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: unknown) => {
        const row = item as HomeVisit;
        return (
          <div className="flex items-center gap-1 justify-end whitespace-nowrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailTarget(row)}
              className="h-7 px-2 text-[10px] font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg"
              title="Lihat Detail & Hasil Kunjungan"
            >
              <Eye size={12} className="mr-1" /> Detail
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => row.siswa_id && setHistorySiswaId(row.siswa_id)}
              className="w-7 h-7 text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-lg"
              title="Riwayat BP/BK Siswa"
            >
              <History size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row)}
              className="w-7 h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
              title="Edit Log Home Visit"
            >
              <Edit2 size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.id)}
              className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
              title="Hapus Log Home Visit"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        );
      }
    }
  ], [handleEdit, handleDelete, handleOpenPreview]);

  const isMobile = useIsMobile();

  const renderMobileCard = (item: HomeVisit & { Dokumen?: { id?: string; file_original_name?: string; mime_type?: string } }) => {
    return (
      <div
        key={item.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {formatDate(item.tanggal)}
            </span>
            <h4
              onClick={() => item.siswa_id && setHistorySiswaId(item.siswa_id)}
              className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight truncate cursor-pointer hover:text-indigo-600"
            >
              {item.Siswa?.nama_siswa}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 font-mono">
              Kelas: {item.Siswa?.Kelas?.nama_kelas || '-'} • NIS: {item.Siswa?.nis || '-'}
            </p>
          </div>
          {(item.Dokumen || item.foto_dokumen_id) && (
            <button
              type="button"
              onClick={() => handleOpenPreview(item)}
              className="flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/70 px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Lihat Foto
            </button>
          )}
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Alasan Kunjungan:</span>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">
            {item.alasan}
          </p>
          {item.hasil && (
            <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
              Hasil: {item.hasil}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailTarget(item)}
              className="h-8 px-2.5 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 text-[11px] font-bold rounded-lg"
            >
              <Eye size={13} className="mr-1" /> Detail
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => item.siswa_id && setHistorySiswaId(item.siswa_id)}
              className="h-8 px-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 text-[11px] font-bold rounded-lg"
            >
              <History size={13} className="mr-1" /> Riwayat
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(item)}
              className="w-8 h-8 text-indigo-600 hover:bg-indigo-50"
              title="Edit"
            >
              <Edit2 size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.id)}
              className="w-8 h-8 text-rose-600 hover:bg-rose-50"
              title="Hapus"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Dokumentasi Kunjungan Rumah (Home Visit)</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Catatan kunjungan rumah langsung ke kediaman wali murid untuk observasi lingkungan belajar</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
          className="self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Catat Home Visit
        </Button>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Kunjungan</span>
            <span className="text-xl font-black text-slate-800 dark:text-white font-mono">{analytics.total}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Home size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/70 dark:border-violet-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 block">Bulan Berjalan</span>
            <span className="text-xl font-black text-violet-700 dark:text-violet-300 font-mono">{analytics.thisMonth}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 flex items-center justify-center">
            <Calendar size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Dengan Dokumentasi</span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">{analytics.withDocs}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
            <Paperclip size={15} />
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="max-w-md">
        <DebouncedSearchInput
          placeholder="Cari nama siswa, alasan, atau hasil kunjungan..."
          value={search}
          onChange={setSearch}
          isLoading={loading}
          className="w-full"
          inputClassName="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
        />
      </div>

      {/* Table / Mobile Cards */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Kunjungan...</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          <MobileAcademicList
            title="Daftar Kunjungan Rumah"
            data={filteredData}
            loading={loading}
            totalItems={filteredData.length}
            emptyMessage="Belum ada catatan kunjungan rumah (home visit)."
            pagination={{
              currentPage: page,
              itemsPerPage: limit,
              totalItems: totalPages * limit,
              totalPages,
              onPageChange: setPage,
              onLimitChange: (limitVal) => {
                setLimit(limitVal);
                setPage(1);
              }
            }}
            renderCard={renderMobileCard}
          />
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredData}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalPages * limit,
            totalPages,
            onPageChange: setPage,
            onLimitChange: (limitVal) => {
              setLimit(limitVal);
              setPage(1);
            }
          }}
        />
      )}

      {/* Form Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title={selectedId ? 'Perbarui Log Home Visit' : 'Catat Home Visit Baru'} 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-violet-50 via-purple-50/70 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 border border-violet-200/70 dark:border-violet-800/50">
              <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Home size={17} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Dokumentasi Kunjungan Rumah</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Catat latar belakang kunjungan, hasil kesepakatan orang tua, dan lampirkan foto.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Pilih Siswa</Label>
              {selectedSiswa ? (
                <div className="flex items-center justify-between p-3 bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {(selectedSiswa.nama_siswa || 'S').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{selectedSiswa.nama_siswa}</div>
                      <div className="text-[10px] text-violet-600 dark:text-violet-300 font-bold uppercase tracking-wider mt-0.5">
                        {selectedSiswa.Kelas?.nama_kelas || selectedSiswa.kelas_name || '-'} • NIS: {selectedSiswa.nis || '-'}
                      </div>
                    </div>
                  </div>
                  {!selectedId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedSiswa(null);
                        setFormData(prev => ({ ...prev, siswa_id: '' }));
                      }}
                      className="text-xs font-black text-rose-600 hover:bg-rose-100/70 px-3 py-1.5 rounded-lg shrink-0"
                    >
                      UBAH SISWA
                    </Button>
                  )}
                </div>
              ) : (
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SmartStudentPicker
                    scope="global"
                    onSelect={(s) => {
                      setSelectedSiswa(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    mode="siswa"
                    placeholder="Cari nama atau NIS siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-sky-50/45 dark:bg-sky-950/20 border border-sky-200/70">
              <Label htmlFor="tanggal-kunjungan" className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Tanggal Kunjungan</Label>
              <Input
                id="tanggal-kunjungan"
                type="date"
                value={formData.tanggal}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                className="h-10 text-xs bg-white dark:bg-slate-900 border-sky-200/80 rounded-xl"
              />
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-50/45 dark:bg-amber-950/20 border border-amber-200/70">
              <Label htmlFor="alasan-kunjungan" className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Alasan / Latar Belakang Kunjungan</Label>
              <textarea
                id="alasan-kunjungan"
                aria-label="Alasan / Latar Belakang Kunjungan"
                value={formData.alasan}
                onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Tulis latar belakang dilaksanakannya home visit (contoh: Siswa sering terlambat, bermasalah di kelas, dll)..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-amber-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-emerald-50/45 dark:bg-emerald-950/20 border border-emerald-200/70">
              <Label htmlFor="hasil-kunjungan" className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Hasil Kunjungan & Kesepakatan Bersama</Label>
              <textarea
                id="hasil-kunjungan"
                aria-label="Hasil Kunjungan & Kesepakatan Bersama"
                value={formData.hasil}
                onChange={(e) => setFormData(prev => ({ ...prev, hasil: e.target.value }))}
                placeholder="Tulis kondisi lingkungan rumah, tanggapan orang tua, serta komitmen kesepakatan bersama..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-emerald-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-dashed border-blue-300 dark:border-blue-800">
              <Label htmlFor="scan-dokumen" className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <Paperclip size={13} />
                Unggah Foto Kunjungan / Laporan Scan Home Visit (Opsional)
              </Label>
              <Input
                id="scan-dokumen"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="text-xs bg-white dark:bg-slate-900 border-blue-200/80 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => { setModalOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Catatan'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Detail Kunjungan Rumah */}
        {detailTarget && (
          <Modal
            isOpen={Boolean(detailTarget)}
            onClose={() => setDetailTarget(null)}
            title={`Detail Home Visit: ${detailTarget.Siswa?.nama_siswa || 'Siswa'}`}
            size="lg"
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Tanggal Kunjungan</span>
                  <span className="font-bold text-slate-800">{formatDate(detailTarget.tanggal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Kelas</span>
                  <span className="font-bold text-slate-800">{detailTarget.Siswa?.Kelas?.nama_kelas || '-'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Alasan / Latar Belakang</span>
                <p className="p-3 rounded-xl bg-white border border-slate-200/80 text-slate-700 leading-relaxed">
                  {detailTarget.alasan}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Hasil Kunjungan & Kesepakatan</span>
                <p className="p-3 rounded-xl bg-white border border-slate-200/80 text-slate-700 leading-relaxed">
                  {detailTarget.hasil || 'Belum ada catatan hasil kunjungan.'}
                </p>
              </div>

              {(detailTarget.foto_dokumen_id || (detailTarget as any).Dokumen) && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <span className="font-bold text-blue-900 truncate">
                      {(detailTarget as any).Dokumen?.file_original_name || 'Lampiran Dokumentasi Home Visit'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPreview(detailTarget as any)}
                    className="h-8 px-3 text-xs font-bold border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
                  >
                    <ImageIcon size={13} className="mr-1.5" /> Buka Dokumentasi
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const sid = detailTarget.siswa_id;
                    setDetailTarget(null);
                    if (sid) setHistorySiswaId(sid);
                  }}
                >
                  <History size={13} className="mr-1.5" /> Riwayat Siswa
                </Button>
                <Button
                  type="button"
                  variant="toolbarPrimary"
                  onClick={() => {
                    const target = detailTarget;
                    setDetailTarget(null);
                    handleEdit(target);
                  }}
                >
                  <Edit2 size={13} className="mr-1.5" /> Edit Catatan
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Preview Dokumentasi (Foto / PDF) */}
        {previewTarget && (
          <Modal
            isOpen={Boolean(previewTarget)}
            onClose={handleClosePreview}
            title={previewTarget.Dokumen?.file_original_name || 'Dokumentasi Home Visit'}
            size="3xl"
          >
            <div className="space-y-4">
              {loadingPreview ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader />
                  <span className="text-xs font-medium">Memuat dokumentasi kunjungan...</span>
                </div>
              ) : previewBlobUrl ? (
                <div className="space-y-3">
                  {previewMime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(previewTarget.Dokumen?.file_original_name || '') ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 flex items-center justify-center max-h-[65vh]">
                      <img
                        src={previewBlobUrl}
                        alt={previewTarget.Dokumen?.file_original_name || 'Foto Home Visit'}
                        className="max-h-[65vh] w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <iframe
                      src={previewBlobUrl}
                      title="Preview Dokumentasi"
                      className="w-full h-[65vh] rounded-xl border border-slate-200"
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClosePreview}>
                      Tutup
                    </Button>
                    <Button type="button" variant="toolbarPrimary" onClick={handleDownloadAttachment}>
                      <Download size={14} className="mr-1.5" /> Unduh Dokumentasi
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-center text-slate-500 py-8">Dokumentasi tidak dapat ditampilkan.</p>
              )}
            </div>
          </Modal>
        )}

        {/* Modal Riwayat BP/BK Siswa */}
        {historySiswaId && (
          <Modal
            isOpen={Boolean(historySiswaId)}
            onClose={() => setHistorySiswaId(null)}
            title="Riwayat & Rekam Jejak BP/BK Siswa"
            size="3xl"
          >
            <Suspense fallback={<div className="p-10 flex justify-center"><Loader /></div>}>
              <BpbkSiswaHistoryView siswaId={historySiswaId} />
            </Suspense>
          </Modal>
        )}
      </Suspense>
    </Card>
  );
});


