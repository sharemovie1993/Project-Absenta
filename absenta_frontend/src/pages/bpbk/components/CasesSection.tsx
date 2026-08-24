import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bpbkApi, type KasusBK, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Label } from '../../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { Search, Plus } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';

// Extracted Components
const CaseTable = lazy(() => import('./cases/CaseTable').then(m => ({ default: m.CaseTable })));
const CaseFormModal = lazy(() => import('./cases/CaseFormModal').then(m => ({ default: m.CaseFormModal })));
const CaseDetailModal = lazy(() => import('./cases/CaseDetailModal').then(m => ({ default: m.CaseDetailModal })));

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));

const getKategoriColor = (kat: string) => {
  switch (kat) {
    case 'KEDISIPLINAN': return 'text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30';
    case 'AKADEMIS': return 'text-amber-500 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30';
    case 'PRIBADI': return 'text-blue-500 bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30';
    case 'SOSIAL': return 'text-indigo-500 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30';
    default: return 'text-slate-500 bg-slate-50 border-slate-100 dark:bg-slate-900/20 dark:border-slate-800/30';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'TERBUKA': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20';
    case 'PROSES': return 'text-blue-500 bg-blue-50 dark:bg-blue-950/20';
    case 'RUJUKAN': return 'text-purple-500 bg-purple-50 dark:bg-purple-950/20';
    case 'SELESAI': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
    default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
  }
};

const getPrioritasColor = (prio: string) => {
  switch (prio) {
    case 'RENDAH': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
    case 'SEDANG': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20';
    case 'TINGGI': return 'text-rose-500 bg-rose-50 dark:bg-rose-950/20';
    default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
  }
};

const getVisibilityColor = (vis: string) => {
  switch (vis) {
    case 'PUBLIC': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20';
    case 'LIMITED': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20';
    case 'SENSITIVE': return 'text-rose-600 bg-rose-50 dark:bg-rose-950/20';
    default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
  }
};

export const CasesSection: React.FC = React.memo(() => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPrioritas, setSelectedPrioritas] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const confirm = useConfirm();
  const { can } = useCapabilities();
  const queryClient = useQueryClient();
  const invalidateBpbkCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['ews-risk-students'] });
  }, [queryClient]);

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<KasusBK | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any | null>(null);

  const [showDeleted, setShowDeleted] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeCaseId, setCloseCaseId] = useState<string | null>(null);
  const [catatanSelesai, setCatatanSelesai] = useState('');

  const [formData, setFormData] = useState({
    siswa_id: '',
    judul: '',
    kategori: 'KEDISIPLINAN',
    status: 'TERBUKA',
    prioritas: 'SEDANG',
    visibility: 'SENSITIVE',
    tanggal_kasus: new Date().toISOString().split('T')[0],
    keterangan: ''
  });

  // ── useQuery: Cases List ──────────────────────────────────────────────────
  const { data: casesRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.casesList({
      page,
      limit,
      search: debouncedSearch,
      kategori: selectedKategori,
      status: selectedStatus,
      prioritas: selectedPrioritas,
      visibility: selectedVisibility,
      show_deleted: showDeleted ? 'true' : 'false'
    }),
    queryFn: () => bpbkApi.getKasusBK({
      page,
      limit,
      search: debouncedSearch,
      kategori: selectedKategori,
      status: selectedStatus,
      prioritas: selectedPrioritas,
      visibility: selectedVisibility,
      show_deleted: showDeleted ? 'true' : 'false'
    }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => casesRes?.data?.list || [], [casesRes]);
  const totalPages = casesRes?.data?.pagination?.totalPages || 1;
  const totalItems = casesRes?.data?.pagination?.totalItems || casesRes?.data?.pagination?.total || 0;

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      judul: '',
      kategori: 'KEDISIPLINAN',
      status: 'TERBUKA',
      prioritas: 'SEDANG',
      visibility: 'SENSITIVE',
      tanggal_kasus: new Date().toISOString().split('T')[0],
      keterangan: ''
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: KasusBK) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      judul: item.judul,
      kategori: item.kategori,
      status: item.status,
      prioritas: item.prioritas,
      visibility: item.visibility,
      tanggal_kasus: new Date(item.tanggal_kasus).toISOString().split('T')[0],
      keterangan: item.keterangan || ''
    });
    setModalOpen(true);
  }, []);

  const handleViewDetail = useCallback(async (item: KasusBK) => {
    try {
      const res = await bpbkApi.getKasusBKById(item.id);
      if (res.success) {
        setSelectedCase(res.data);
        setDetailModalOpen(true);
      } else {
        toast.error('Gagal memuat rincian kasus');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Kasus BK',
      description: 'Apakah Anda yakin ingin menghapus Kasus BK ini? Semua sesi konseling dan dokumen terhubung akan diarsipkan/dihapus.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deleteKasusBK(id);
      if (res.success) {
        toast.success('Kasus BK berhasil diarsipkan');
        invalidateBpbkCache();
        refetch();
      } else {
        toast.error('Gagal menghapus kasus BK');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, [confirm, invalidateBpbkCache, refetch]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await bpbkApi.restoreKasusBK(id);
      if (res.success) {
        toast.success('Kasus BK berhasil dipulihkan dari keranjang sampah');
        invalidateBpbkCache();
        refetch();
      } else {
        toast.error('Gagal memulihkan kasus');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, [invalidateBpbkCache, refetch]);

  const handleReopen = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Buka Kembali Kasus',
      description: 'Apakah Anda yakin ingin membuka kembali Kasus BK ini? Status kasus akan di-set menjadi PROSES dan catatan penyelesaian akan di-reset.',
      confirmText: 'Buka Kembali',
      cancelText: 'Batal',
      style: 'warning'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.reopenKasusBK(id);
      if (res.success) {
        toast.success('Kasus BK berhasil dibuka kembali');
        invalidateBpbkCache();
        refetch();
      } else {
        toast.error('Gagal membuka kembali kasus');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, [confirm, invalidateBpbkCache, refetch]);

  const handleCloseSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeCaseId) return;
    if (!catatanSelesai.trim()) {
      toast.error('Harap masukkan catatan penyelesaian kasus');
      return;
    }

    try {
      const res = await bpbkApi.closeKasusBK(closeCaseId, catatanSelesai);
      if (res.success) {
        toast.success('Kasus BK berhasil diselesaikan');
        setCloseModalOpen(false);
        setCloseCaseId(null);
        setCatatanSelesai('');
        invalidateBpbkCache();
        refetch();
      } else {
        toast.error('Gagal menyelesaikan kasus');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menutup kasus');
    }
  }, [closeCaseId, catatanSelesai, invalidateBpbkCache, refetch]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      toast.error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.judul.trim()) {
      toast.error('Harap isi judul kasus');
      return;
    }

    try {
      if (selectedId) {
        await bpbkApi.updateKasusBK(selectedId, formData);
        toast.success('Kasus BK berhasil diperbarui');
      } else {
        await bpbkApi.createKasusBK(formData);
        toast.success('Kasus BK baru berhasil dibuka');
      }
      setModalOpen(false);
      resetForm();
      invalidateBpbkCache();
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan kasus BK');
    }
  }, [selectedId, formData, invalidateBpbkCache, refetch, resetForm]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Pusat Manajemen Kasus BK (KasusBK)</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Entitas induk yang memadukan catatan konseling, pemanggilan, visitasi, asesmen, dan rujukan</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Buka Kasus BK
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari siswa atau judul kasus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Kategori' },
              { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
              { value: 'AKADEMIS', label: 'Akademis' },
              { value: 'PRIBADI', label: 'Pribadi' },
              { value: 'SOSIAL', label: 'Sosial' }
            ]}
            value={selectedKategori}
            onValueChange={setSelectedKategori}
            placeholder="Kategori Kasus"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'TERBUKA', label: 'Terbuka' },
              { value: 'PROSES', label: 'Pendampingan' },
              { value: 'RUJUKAN', label: 'Rujukan' },
              { value: 'SELESAI', label: 'Selesai' }
            ]}
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            placeholder="Status Kasus"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Prioritas' },
              { value: 'RENDAH', label: 'Rendah' },
              { value: 'SEDANG', label: 'Sedang' },
              { value: 'TINGGI', label: 'Tinggi' }
            ]}
            value={selectedPrioritas}
            onValueChange={setSelectedPrioritas}
            placeholder="Prioritas Kasus"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {can('bk.recyclebin.view') && (
        <div className="flex justify-between items-center mb-4 mt-2 px-1">
          <label htmlFor="show-deleted-checkbox" className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-300 cursor-pointer">
            <input
              id="show-deleted-checkbox"
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => {
                setShowDeleted(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-slate-350 dark:border-slate-800 text-rose-600 focus:ring-rose-500"
            />
            <span>Tampilkan Keranjang Sampah / Arsip Terhapus</span>
          </label>
        </div>
      )}

      {/* Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Kasus...</p>
        </div>
      ) : (
        <CaseTable
          data={data}
          loading={loading}
          page={page}
          limit={limit}
          totalItems={totalItems}
          totalPages={totalPages}
          sortBy={sortBy}
          sortOrder={sortOrder}
          showDeleted={showDeleted}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          onSort={handleSort}
          onViewDetail={handleViewDetail}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onReopen={handleReopen}
          onCloseCase={(id) => { setCloseCaseId(id); setCatatanSelesai(''); setCloseModalOpen(true); }}
          canRestore={can('bk.recyclebin.restore')}
          getKategoriColor={getKategoriColor}
          getStatusColor={getStatusColor}
          getPrioritasColor={getPrioritasColor}
          getVisibilityColor={getVisibilityColor}
        />
      )}

      {/* Modal Form */}
      <Suspense fallback={null}>
        <CaseFormModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); resetForm(); }}
          onSubmit={handleSubmit}
          selectedId={selectedId}
          selectedSiswa={selectedSiswa}
          setSelectedSiswa={setSelectedSiswa}
          formData={formData}
          setFormData={setFormData}
        />
      </Suspense>

      {/* Case Details */}
      <Suspense fallback={null}>
        <CaseDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          selectedCase={selectedCase}
          getKategoriColor={getKategoriColor}
          getStatusColor={getStatusColor}
          getPrioritasColor={getPrioritasColor}
          getVisibilityColor={getVisibilityColor}
        />
      </Suspense>

      {/* Modal Close Case */}
      <Suspense fallback={null}>
        <Modal
          isOpen={closeModalOpen}
          onClose={() => { setCloseModalOpen(false); setCloseCaseId(null); }}
          title="Selesaikan / Tutup Kasus BK"
          size="md"
        >
          <form onSubmit={handleCloseSubmit} className="space-y-4 p-1">
            <div className="space-y-2">
              <Label htmlFor="catatan-selesai" className="text-xs font-bold uppercase tracking-wider text-slate-500">Catatan Penyelesaian Kasus</Label>
              <textarea
                id="catatan-selesai"
                rows={4}
                placeholder="Tuliskan memo penyelesaian, komitmen siswa, atau hasil mediasi..."
                value={catatanSelesai}
                onChange={(e) => setCatatanSelesai(e.target.value)}
                className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setCloseModalOpen(false); setCloseCaseId(null); }} className="text-xs font-bold h-10 px-4 rounded-xl">
                Batal
              </Button>
              <Button type="submit" variant="primary" className="text-xs font-bold h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700">
                Selesaikan Kasus
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </Card>
  );
});
