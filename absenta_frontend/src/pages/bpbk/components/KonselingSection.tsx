import { z } from 'zod';
import { formatDate } from '../../../utils/layoutUtils';
import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bpbkApi, type KonselingSiswa, type KasusBK, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import type { Column } from '../../../components/ui/Table';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Loader } from '../../../components/ui/Loader';
import { Badge } from '../../../components/ui/Badge';
import { Label } from '../../../components/ui/Label';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { Search, Plus, Edit2, Trash2, Calendar, Clipboard, UserCheck, MessageSquare, RotateCcw } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

const konselingFormSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  tipe: z.string().min(1, 'Tipe konseling wajib dipilih'),
  masalah: z.string().min(1, 'Uraian masalah wajib diisi'),
  solusi: z.string().optional(),
  status: z.string().default('PROSES')
});

export const KonselingSection: React.FC = React.memo(() => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedTipe, setSelectedTipe] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);


  const confirm = useConfirm();
  const { can } = useCapabilities();
  const queryClient = useQueryClient();
  const invalidateBpbkCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['bpbk-cases-list'] });
    queryClient.invalidateQueries({ queryKey: ['konseling-history'] });
    queryClient.invalidateQueries({ queryKey: ['ews-risk-students'] });
    queryClient.invalidateQueries({ queryKey: ['bpbk-stats'] });
  }, [queryClient]);

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    tipe: 'INDIVIDU',
    masalah: '',
    solusi: '',
    status: 'PROSES',
    kasus_bk_id: '',
    visibility: 'SENSITIVE'
  });

  // ── useQuery: Konseling List ─────────────────────────────────────────────
  const { data: konselingRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.konselingList({ page, limit, search: debouncedSearch, tipe: selectedTipe, status: selectedStatus, show_deleted: showDeleted }),
    queryFn: () => bpbkApi.getKonseling({
      page,
      limit,
      search: debouncedSearch,
      tipe: selectedTipe,
      status: selectedStatus,
      show_deleted: showDeleted ? 'true' : 'false'
    }),
    staleTime: 5 * 60 * 1000,
  });

  // ── useQuery: Cases for Student ──────────────────────────────────────────
  const { data: studentCasesRes } = useQuery({
    queryKey: ['bpbk-cases-by-student', formData.siswa_id],
    queryFn: () => bpbkApi.getKasusBK({ siswa_id: formData.siswa_id, limit: 100 }),
    enabled: !!formData.siswa_id,
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => konselingRes?.data?.list || [], [konselingRes]);
  const totalPages = konselingRes?.data?.pagination?.totalPages || 1;
  const cases = useMemo(() => studentCasesRes?.data?.list || [], [studentCasesRes]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      tipe: 'INDIVIDU',
      masalah: '',
      solusi: '',
      status: 'PROSES',
      kasus_bk_id: '',
      visibility: 'SENSITIVE'
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: KonselingSiswa) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      tipe: item.tipe,
      masalah: item.masalah,
      solusi: item.solusi || '',
      status: item.status,
      kasus_bk_id: item.kasus_bk_id || '',
      visibility: item.visibility || 'SENSITIVE'
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Catatan Konseling',
      description: 'Apakah Anda yakin ingin menghapus catatan konseling ini? Tindakan ini bersifat permanen.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deleteKonseling(id);
      if (res.success) {
        toast.success('Catatan konseling berhasil dihapus');
        invalidateBpbkCache();
        refetch();
      } else {
        toast.error(res.message || 'Gagal menghapus catatan');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi bermasalah';
      toast.error(errorMsg);
    }
  }, [confirm, invalidateBpbkCache, refetch]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await bpbkApi.restoreKonseling(id);
      if (res.success) {
        toast.success('Catatan konseling berhasil dipulihkan');
        invalidateBpbkCache();
        refetch();
      } else {
        toast.error('Gagal memulihkan catatan');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Koneksi bermasalah';
      toast.error(errorMsg);
    }
  }, [invalidateBpbkCache, refetch]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      toast.error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.masalah.trim()) {
      toast.error('Harap isi deskripsi masalah');
      return;
    }

    try {
      if (selectedId) {
        await bpbkApi.updateKonseling(selectedId, formData);
        toast.success('Sesi konseling berhasil diperbarui');
      } else {
        await bpbkApi.createKonseling(formData);
        toast.success('Sesi konseling baru berhasil dicatat');
      }
      setModalOpen(false);
      resetForm();
      invalidateBpbkCache();
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan catatan konseling';
      toast.error(errorMsg);
    }
  }, [selectedId, formData, resetForm, invalidateBpbkCache, refetch]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: unknown) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'tipe',
      label: 'Tipe',
      render: (value: string) => (
        <Badge variant="outline" className="text-[9px] font-black uppercase">
          {value}
        </Badge>
      )
    },
    {
      key: 'masalah',
      label: 'Ringkasan Kasus',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-1 max-w-xs">{value}</p>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'SELESAI' ? 'success' : 'warning'} className="text-[9px] font-black uppercase">
          {value}
        </Badge>
      )
    },
    {
      key: 'petugas',
      label: 'Konselor/BK',
      render: (_, item: unknown) => (
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {item.Petugas?.full_name || 'Petugas BK'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: unknown) => (
        <div className="flex gap-1 justify-end">
          {showDeleted ? (
            can('bk.recyclebin.restore') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRestore(item.id)}
                className="w-8 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                title="Pulihkan Catatan"
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
                title="Edit Catatan"
              >
                <Edit2 size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(item.id)}
                className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                title="Hapus Catatan"
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      )
    }
  ], [showDeleted, can, handleRestore, handleEdit, handleDelete]);

  const isMobile = useIsMobile();

  const renderMobileCard = (item: any) => {
    return (
      <div
        key={item.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              {item.Siswa?.nama_siswa}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 font-mono">
              Kelas: {item.Siswa?.Kelas?.nama_kelas || '-'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={item.status === 'SELESAI' ? 'success' : 'warning'} className="text-[9px] font-black uppercase">
              {item.status}
            </Badge>
            <Badge variant="outline" className="text-[8px] font-black uppercase">
              {item.tipe}
            </Badge>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Ringkasan Masalah:</span>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {item.masalah}
          </p>
          {item.solusi && (
            <p className="text-[11px] text-slate-500 italic mt-1">
              Solusi: {item.solusi}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[10px] font-bold text-slate-400">
            BK: {item.Petugas?.full_name || 'Petugas BK'}
          </span>

          <div className="flex items-center gap-1">
            {showDeleted ? (
              can('bk.recyclebin.restore') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestore(item.id)}
                  className="h-8 px-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-[11px] font-bold"
                >
                  <RotateCcw size={13} className="mr-1" /> Pulihkan
                </Button>
              )
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  className="h-8 px-2.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-[11px] font-bold"
                >
                  <Edit2 size={13} className="mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  title="Hapus Catatan"
                >
                  <Trash2 size={13} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Jurnal & Layanan Bimbingan Konseling (BK)</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Catatan pendampingan psikososial, masalah pribadi, dan bimbingan karir siswa</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Catat Konseling
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Cari siswa atau ringkasan kasus"
            placeholder="Cari siswa atau ringkasan kasus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Tipe Sesi' },
              { value: 'INDIVIDU', label: 'Individu' },
              { value: 'KELOMPOK', label: 'Kelompok' }
            ]}
            value={selectedTipe}
            onValueChange={setSelectedTipe}
            placeholder="Tipe Konseling"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <SearchableSelect
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'PROSES', label: 'Pendampingan' },
              { value: 'SELESAI', label: 'Selesai' }
            ]}
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            placeholder="Status Layanan"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {can('bk.recyclebin.view') && (
        <div className="flex justify-between items-center mb-4 mt-2 px-1">
          <label htmlFor="show-deleted-counseling" className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-300 cursor-pointer">
            <input
              id="show-deleted-counseling"
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

      {/* Logs Table / Mobile Cards */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyelaraskan Catatan BK...</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          <MobileAcademicList
            title="Daftar Catatan Konseling"
            data={data}
            loading={loading}
            totalItems={totalPages * limit}
            emptyMessage="Belum ada catatan layanan konseling siswa."
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
          data={data}
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

      {/* Record Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title={selectedId ? 'Edit Catatan Konseling' : 'Catat Konseling Baru'} 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Pilih Siswa</Label>
              {selectedSiswa ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 rounded-xl">
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{selectedSiswa.nama_siswa}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {selectedSiswa.Kelas?.nama_kelas || selectedSiswa.kelas_name || '-'} • NIS: {selectedSiswa.nis || '-'}
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
                      className="text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-lg"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal-sesi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Sesi</Label>
                <Input
                  id="tanggal-sesi"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipe-sesi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Sesi</Label>
                <SearchableSelect
                  id="tipe-sesi"
                  options={[
                    { value: 'INDIVIDU', label: 'Konseling Individu' },
                    { value: 'KELOMPOK', label: 'Konseling Kelompok' }
                  ]}
                  value={formData.tipe}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, tipe: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kasus-masalah" className="text-xs font-bold uppercase tracking-wider text-slate-500">Kasus / Masalah yang Dihadapi</Label>
              <textarea
                id="kasus-masalah"
                aria-label="Kasus / Masalah yang Dihadapi"
                value={formData.masalah}
                onChange={(e) => setFormData(prev => ({ ...prev, masalah: e.target.value }))}
                placeholder="Tulis ringkasan masalah atau keluhan siswa..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solusi-hasil" className="text-xs font-bold uppercase tracking-wider text-slate-500">Solusi / Rekomendasi Hasil Konseling</Label>
              <textarea
                id="solusi-hasil"
                aria-label="Solusi / Rekomendasi Hasil Konseling"
                value={formData.solusi}
                onChange={(e) => setFormData(prev => ({ ...prev, solusi: e.target.value }))}
                placeholder="Tulis hasil bimbingan, komitmen siswa, atau rencana tindak lanjut..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-pendampingan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Pendampingan</Label>
              <SearchableSelect
                id="status-pendampingan"
                options={[
                  { value: 'PROSES', label: 'Pendampingan Berjalan (PROSES)' },
                  { value: 'SELESAI', label: 'Selesai (Kasus Tuntas)' }
                ]}
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hubungkan-kasus" className="text-xs font-bold uppercase tracking-wider text-slate-500">Hubungkan dengan Kasus BK</Label>
                <SearchableSelect
                  id="hubungkan-kasus"
                  options={[
                    { value: '', label: '-- Tidak Dihubungkan --' },
                    ...cases?.map(c => ({ value: c.id, label: `${c.judul} (${c.kategori})` }))
                  ]}
                  value={formData.kasus_bk_id || ''}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, kasus_bk_id: val || '' }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level-visibilitas" className="text-xs font-bold uppercase tracking-wider text-slate-500">Level Visibilitas</Label>
                <SearchableSelect
                  id="level-visibilitas"
                  options={[
                    { value: 'SENSITIVE', label: 'Sensitif (Hanya Guru BK)' },
                    { value: 'LIMITED', label: 'Terbatas (BK + Wali Kelas)' },
                    { value: 'PUBLIC', label: 'Publik (Seluruh Guru)' }
                  ]}
                  value={formData.visibility || 'SENSITIVE'}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, visibility: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => { setModalOpen(false); resetForm(); }}>
                Batal
              </Button>
              <Button type="submit" variant="toolbarPrimary" size="toolbar" className="px-6">
                Simpan Catatan
              </Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </Card>
  );
});


