import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { bpbkApi, type KasusBK, type KonselingSiswa, type PemanggilanOrangTua, type HomeVisit, type AsesmenSiswa, type RujukanKasus } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { Label } from '../../../components/ui/Label';
import { useToast } from '../../../hooks/useToast';
import useConfirm from '../../../hooks/useConfirm';
import { useAuth } from '../../../hooks/useAuth';
import { Search, Plus, Edit2, Trash2, Calendar, Tag, ShieldAlert, Eye, RotateCcw, RefreshCw, CheckCircle, MessageSquare, MailOpen, Home, Send } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

interface Student {
  id: string;
  nama_siswa?: string;
  nis?: string;
  Kelas?: {
    nama_kelas: string;
  };
}

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

export const CasesSection: React.FC = () => {
  const [data, setData] = useState<KasusBK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPrioritas, setSelectedPrioritas] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { success, error } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<KasusBK | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<Student | null>(null);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bpbkApi.getKasusBK({
        page,
        limit,
        search: debouncedSearch,
        kategori: selectedKategori,
        status: selectedStatus,
        prioritas: selectedPrioritas,
        visibility: selectedVisibility,
        show_deleted: showDeleted ? 'true' : 'false'
      });
      setData(res.data?.list || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalItems(res.data?.pagination?.totalItems || res.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedKategori, selectedStatus, selectedPrioritas, selectedVisibility, showDeleted]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    resetForm();
  }, [resetForm]);

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
      setLoading(true);
      const res = await bpbkApi.getKasusBKById(item.id);
      if (res.success) {
        setSelectedCase(res.data);
        setDetailModalOpen(true);
      } else {
        error('Gagal memuat rincian kasus');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    } finally {
      setLoading(false);
    }
  }, [error]);

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
        success('Kasus BK berhasil diarsipkan');
        fetchData();
      } else {
        error('Gagal menghapus kasus BK');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, [confirm, success, error, fetchData]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await bpbkApi.restoreKasusBK(id);
      if (res.success) {
        success('Kasus BK berhasil dipulihkan dari keranjang sampah');
        fetchData();
      } else {
        error('Gagal memulihkan kasus');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, [success, error, fetchData]);

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
        success('Kasus BK berhasil dibuka kembali');
        fetchData();
      } else {
        error('Gagal membuka kembali kasus');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Koneksi bermasalah');
    }
  }, [confirm, success, error, fetchData]);

  const handleCloseSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeCaseId) return;
    if (!catatanSelesai.trim()) {
      error('Harap masukkan catatan penyelesaian kasus');
      return;
    }

    try {
      const res = await bpbkApi.closeKasusBK(closeCaseId, catatanSelesai);
      if (res.success) {
        success('Kasus BK berhasil diselesaikan');
        setCloseModalOpen(false);
        setCloseCaseId(null);
        setCatatanSelesai('');
        fetchData();
      } else {
        error('Gagal menyelesaikan kasus');
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Gagal menutup kasus');
    }
  }, [closeCaseId, catatanSelesai, error, success, fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.judul.trim()) {
      error('Harap isi judul kasus');
      return;
    }

    try {
      if (selectedId) {
        await bpbkApi.updateKasusBK(selectedId, formData);
        success('Kasus BK berhasil diperbarui');
      } else {
        await bpbkApi.createKasusBK(formData);
        success('Kasus BK baru berhasil dibuka');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Gagal menyimpan kasus BK');
    }
  }, [selectedId, formData, error, success, fetchData, resetForm]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal_kasus',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => (
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Siswa',
      render: (_, item: KasusBK) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'judul',
      label: 'Kasus BK',
      render: (_, item: KasusBK) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs line-clamp-1 max-w-[200px]">{item.judul}</div>
          <Badge className={`text-[8px] font-black uppercase mt-1 px-1.5 border ${getKategoriColor(item.kategori)}`}>
            {item.kategori}
          </Badge>
        </div>
      )
    },
    {
      key: 'prioritas',
      label: 'Prioritas',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className={`text-[8px] font-black uppercase ${getPrioritasColor(value)}`}>
          {value}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant="outline" className={`text-[8px] font-black uppercase ${getStatusColor(value)}`}>
          {value}
        </Badge>
      )
    },
    {
      key: 'visibility',
      label: 'Privasi',
      render: (value: string) => (
        <Badge variant="outline" className={`text-[8px] font-black uppercase ${getVisibilityColor(value)}`}>
          {value}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: KasusBK) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewDetail(item)}
            className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Lihat Rincian & Modul Terhubung"
          >
            <Eye size={13} />
          </Button>
          {showDeleted ? (
            can('bk.recyclebin.restore') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRestore(item.id)}
                className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                title="Pulihkan Kasus"
              >
                <RotateCcw size={13} />
              </Button>
            )
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(item)}
                className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                title="Edit Kasus"
              >
                <Edit2 size={13} />
              </Button>
              {item.status === 'SELESAI' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReopen(item.id)}
                  className="w-8 h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  title="Buka Kembali Kasus"
                >
                  <RefreshCw size={13} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCloseCaseId(item.id); setCatatanSelesai(''); setCloseModalOpen(true); }}
                  className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Tutup Kasus (Selesaikan)"
                >
                  <CheckCircle size={13} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(item.id)}
                className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                title="Hapus Kasus"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      )
    }
  ], [showDeleted, can, handleViewDetail, handleRestore, handleEdit, handleReopen, handleDelete]);

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
        <Table
          columns={columns}
          data={data}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage: page,
            itemsPerPage: limit,
            totalItems: totalItems,
            totalPages,
            onPageChange: setPage,
            onLimitChange: (limitVal) => {
              setLimit(limitVal);
              setPage(1);
            }
          }}
        />
      )}

      {/* Modal Form */}
      <Suspense fallback={null}>
        <Modal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          title={selectedId ? 'Perbarui Kasus BK' : 'Buka Kasus BK Baru'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 p-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
              {selectedId ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                  <div className="font-bold text-xs">{selectedSiswa?.nama_siswa}</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{selectedSiswa?.nis}</div>
                </div>
              ) : (
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SmartStudentPicker
                    onSelect={(s) => {
                      setSelectedSiswa(s);
                      setFormData(prev => ({ ...prev, siswa_id: s.id }));
                    }}
                    mode="siswa"
                    placeholder="Ketik nama atau NIS siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Judul Kasus</Label>
              <Input
                placeholder="Contoh: Sering Membolos di Jam Ke-5 atau Gangguan Kecemasan Belajar"
                value={formData.judul}
                onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori Kasus</Label>
                <SearchableSelect
                  options={[
                    { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
                    { value: 'AKADEMIS', label: 'Akademis' },
                    { value: 'PRIBADI', label: 'Pribadi' },
                    { value: 'SOSIAL', label: 'Sosial' }
                  ]}
                  value={formData.kategori}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, kategori: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Prioritas Tindakan</Label>
                <SearchableSelect
                  options={[
                    { value: 'RENDAH', label: 'Rendah' },
                    { value: 'SEDANG', label: 'Sedang' },
                    { value: 'TINGGI', label: 'Tinggi (Darurat)' }
                  ]}
                  value={formData.prioritas}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, prioritas: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Awal</Label>
                <SearchableSelect
                  options={[
                    { value: 'TERBUKA', label: 'Terbuka' },
                    { value: 'PROSES', label: 'Pendampingan' },
                    { value: 'RUJUKAN', label: 'Rujukan' },
                    { value: 'SELESAI', label: 'Selesai' }
                  ]}
                  value={formData.status}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Level Visibilitas</Label>
                <SearchableSelect
                  options={[
                    { value: 'SENSITIVE', label: 'Sensitif (Hanya BK)' },
                    { value: 'LIMITED', label: 'Terbatas (BK + Wali Kelas)' },
                    { value: 'PUBLIC', label: 'Publik (Seluruh Guru)' }
                  ]}
                  value={formData.visibility}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, visibility: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Kasus</Label>
                <Input
                  type="date"
                  value={formData.tanggal_kasus}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal_kasus: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan-kasus" className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan / Kronologi Detil</Label>
              <textarea
                id="keterangan-kasus"
                aria-label="Keterangan / Kronologi Detil"
                rows={3}
                placeholder="Tuliskan latar belakang masalah, perilaku menyimpang yang diamati, atau aduan awal..."
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                className="w-full text-xs p-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="text-xs font-bold h-10 px-4 rounded-xl">
                Batal
              </Button>
              <Button type="submit" variant="primary" className="text-xs font-bold h-10 px-6 rounded-xl">
                {selectedId ? 'Simpan Perubahan' : 'Buka Kasus'}
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>

      {/* Case Details & Linked Modules View */}
      <Suspense fallback={null}>
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Rincian Kasus BK & Layanan Terintegrasi"
          size="3xl"
        >
          {selectedCase && (
            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              {/* Header profile */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 flex items-center justify-center font-black text-rose-500 text-sm">
                    {selectedCase.Siswa?.nama_siswa?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 dark:text-white text-xs">{selectedCase.Siswa?.nama_siswa}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">NIS: {selectedCase.Siswa?.nis} • Kelas: {selectedCase.Siswa?.Kelas?.nama_kelas || '-'}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={`text-[8px] font-black uppercase ${getKategoriColor(selectedCase.kategori)}`}>
                    KATEGORI: {selectedCase.kategori}
                  </Badge>
                  <Badge variant="outline" className={`text-[8px] font-black uppercase ${getPrioritasColor(selectedCase.prioritas)}`}>
                    PRIORITAS: {selectedCase.prioritas}
                  </Badge>
                  <Badge variant="outline" className={`text-[8px] font-black uppercase ${getStatusColor(selectedCase.status)}`}>
                    STATUS: {selectedCase.status}
                  </Badge>
                  <Badge variant="outline" className={`text-[8px] font-black uppercase ${getVisibilityColor(selectedCase.visibility)}`}>
                    PRIVASI: {selectedCase.visibility}
                  </Badge>
                </div>
              </div>

              {/* Case details text */}
              <div className="space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">{selectedCase.judul}</div>
                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar size={12} /> Terdaftar Tanggal: {new Date(selectedCase.tanggal_kasus).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedCase.keterangan || 'Tidak ada catatan kronologi detail.'}
                </div>
              </div>

              {selectedCase.status === 'SELESAI' && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>Resolusi Kasus Selesai</span>
                  </div>
                  {selectedCase.closed_at && (
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      Tanggal Selesai: {new Date(selectedCase.closed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  {selectedCase.catatan_selesai && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed whitespace-pre-line italic">
                      &ldquo;{selectedCase.catatan_selesai}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* Linked sub-components */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Layanan & Rekaman Terintegrasi</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Layanan Konseling */}
                  <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <MessageSquare size={14} className="text-emerald-500" />
                      <span>Layanan Konseling ({selectedCase.KonselingSiswa?.length || 0})</span>
                    </div>
                    {selectedCase.KonselingSiswa && selectedCase.KonselingSiswa.length > 0 ? (
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {selectedCase.KonselingSiswa.map((c: KonselingSiswa) => (
                          <div key={c.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl text-[11px]">
                            <div className="flex justify-between font-bold text-slate-500 mb-0.5">
                              <span>{new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              <Badge variant="outline" className="text-[7px] uppercase font-black">{c.tipe}</Badge>
                            </div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{c.masalah}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada sesi konseling.</p>
                    )}
                  </div>

                  {/* Pemanggilan Ortu */}
                  <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <MailOpen size={14} className="text-rose-500" />
                      <span>Pemanggilan Orang Tua ({selectedCase.PemanggilanOrangTua?.length || 0})</span>
                    </div>
                    {selectedCase.PemanggilanOrangTua && selectedCase.PemanggilanOrangTua.length > 0 ? (
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {selectedCase.PemanggilanOrangTua.map((p: PemanggilanOrangTua) => (
                          <div key={p.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl text-[11px]">
                            <div className="flex justify-between font-bold text-slate-500 mb-0.5">
                              <span>{new Date(p.tanggal_pemanggilan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              <Badge variant={p.status === 'HADIR' ? 'success' : 'warning'} className="text-[7px] uppercase font-black">{p.status}</Badge>
                            </div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{p.alasan}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada pemanggilan ortu.</p>
                    )}
                  </div>

                  {/* Home Visit */}
                  <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Home size={14} className="text-violet-500" />
                      <span>Kunjungan Rumah / Home Visit ({selectedCase.HomeVisit?.length || 0})</span>
                    </div>
                    {selectedCase.HomeVisit && selectedCase.HomeVisit.length > 0 ? (
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {selectedCase.HomeVisit.map((hv: HomeVisit) => (
                          <div key={hv.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl text-[11px]">
                            <div className="font-bold text-slate-500 mb-0.5">
                              {new Date(hv.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{hv.alasan}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada kunjungan rumah.</p>
                    )}
                  </div>

                  {/* Rujukan & Asesmen */}
                  <div className="p-4 border border-slate-200/40 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Send size={14} className="text-cyan-500" />
                      <span>Rujukan & Angket ({ (selectedCase.RujukanKasus?.length || 0) + (selectedCase.AsesmenSiswa?.length || 0) })</span>
                    </div>
                    <div className="space-y-2 max-h-36 overflow-y-auto text-[11px]">
                      {selectedCase.RujukanKasus?.map((r: RujukanKasus) => (
                        <div key={r.id} className="p-2.5 bg-white dark:bg-slate-900 border border-cyan-100 dark:border-cyan-950 rounded-xl">
                          <div className="flex justify-between font-bold text-cyan-600 dark:text-cyan-400 mb-0.5">
                            <span>RUJUKAN: {r.rujukan_ke}</span>
                            <span>{new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{r.alasan}</p>
                        </div>
                      ))}
                      {selectedCase.AsesmenSiswa?.map((a: AsesmenSiswa) => (
                        <div key={a.id} className="p-2.5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950 rounded-xl">
                          <div className="flex justify-between font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                            <span>ASESMEN: {a.nama_asesmen}</span>
                            <span>{new Date(a.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">Hasil: {a.hasil_skor || '-'}</p>
                        </div>
                      ))}
                      {(!selectedCase.RujukanKasus?.length && !selectedCase.AsesmenSiswa?.length) && (
                        <p className="text-[10px] font-bold text-slate-400 italic py-2 uppercase tracking-wide">Belum ada rujukan atau asesmen.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setDetailModalOpen(false)} className="text-xs font-bold h-10 px-6 rounded-xl">
                  Tutup Detail
                </Button>
              </div>
            </div>
          )}
        </Modal>
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
                aria-label="Catatan Penyelesaian Kasus"
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
};


