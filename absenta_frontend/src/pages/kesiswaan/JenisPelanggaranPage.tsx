import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Label } from '../../components/ui/Label';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { kesiswaanApi, kesiswaanQueryKeys } from '../../api/kesiswaan.api';
import type { JenisPelanggaran } from '../../api/kesiswaan.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Loader } from '../../components/ui/Loader';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileAcademicList } from '../../components/academic/shared/MobileAcademicList';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

// Lazy load heavy components
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

// Skema validasi Zod (Pilar 25)
const jenisPelanggaranSchema = z.object({
  kategori: z.string().min(1, 'Kategori wajib dipilih'),
  nama_pelanggaran: z.string().min(1, 'Nama pelanggaran wajib diisi'),
  poin: z.number().min(0, 'Bobot poin minimal 0')
});

export default React.memo(function JenisPelanggaranPage() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    kategori: 'Pelanggaran Ringan',
    nama_pelanggaran: '',
    poin: 5
  });

  // ── useQuery: Jenis Pelanggaran List ─────────────────────────────────────
  const { data: rawRes, isLoading: loading, refetch } = useQuery({
    queryKey: kesiswaanQueryKeys.jenisPelanggaran(),
    queryFn: () => kesiswaanApi.getJenisPelanggaran(),
    staleTime: 10 * 60 * 1000,
  });

  const listData = useMemo(() => rawRes?.data || [], [rawRes]);
  const totalItems = listData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const data = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return listData.slice(start, start + itemsPerPage);
  }, [listData, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      kategori: 'Pelanggaran Ringan',
      nama_pelanggaran: '',
      poin: 5
    });
    setSelectedId(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = jenisPelanggaranSchema.safeParse(formData);
    if (!validation.success) {
      const errMsg = validation.error.issues[0]?.message || 'Data form tidak valid';
      toast.error(errMsg);
      return;
    }
    try {
      if (selectedId) {
        await kesiswaanApi.updateJenisPelanggaran(selectedId, formData);
        toast.success('Data berhasil diperbarui');
      } else {
        await kesiswaanApi.createJenisPelanggaran(formData);
        toast.success('Data berhasil disimpan');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['jenis-pelanggaran-options-list'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
      queryClient.invalidateQueries({ queryKey: ['pelanggaran-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
      refetch();
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan data');
    }
  }, [selectedId, formData, queryClient, refetch, resetForm]);

  const handleEdit = useCallback((item: JenisPelanggaran) => {
    setFormData({
      kategori: item.kategori,
      nama_pelanggaran: item.nama_pelanggaran,
      poin: item.poin
    });
    setSelectedId(item.id);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Data',
      description: 'Apakah Anda yakin ingin menghapus jenis pelanggaran ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      try {
        await kesiswaanApi.deleteJenisPelanggaran(id);
        toast.success('Data berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: kesiswaanQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ['jenis-pelanggaran-options-list'] });
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-monitoring-violations'] });
        queryClient.invalidateQueries({ queryKey: ['pelanggaran-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
        refetch();
      } catch (err) {
        toast.error('Gagal menghapus data');
      }
    }
  }, [queryClient, refetch, confirm]);

  const renderMobileCard = useCallback((item: JenisPelanggaran) => (
    <div
      key={item.id}
      className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle size={15} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              {item.kategori}
            </span>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mt-0.5">
              {item.nama_pelanggaran}
            </h4>
          </div>
        </div>
        <span className={cn(
          "px-2.5 py-1 text-xs font-black rounded-xl border shrink-0",
          item.poin >= 50
            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-500/20"
            : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-500/20"
        )}>
          +{item.poin} Poin
        </span>
      </div>

      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(item)}
          className="h-8 px-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(item.id)}
          className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1"
        >
          <Trash2 size={13} />
          <span>Hapus</span>
        </Button>
      </div>
    </div>
  ), [handleEdit, handleDelete]);

  const columns: Column[] = useMemo(() => [
    { 
      key: 'kategori', 
      label: 'Kategori',
      sortable: true 
    },
    { 
      key: 'nama_pelanggaran', 
      label: 'Nama Pelanggaran',
      sortable: true 
    },
    { 
      key: 'poin', 
      label: 'Poin',
      sortable: true 
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, item: JenisPelanggaran) => (
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleEdit(item)}
            className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
          >
            <Edit2 size={14} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleDelete(item.id)}
            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete]);

  return (
    <AcademicPageLayout
      title="Jenis Pelanggaran"
      description="Kelola referensi kategori dan jenis pelanggaran beserta poin sanksinya."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kesiswaan', path: '/kesiswaan' },
        { label: 'Jenis Pelanggaran', path: '/kesiswaan/jenis-pelanggaran' }
      ]}
      hardeningModuleKey="kesiswaan_jenis_pelanggaran"
      instruction={{
        title: "Panduan Master Pelanggaran",
        description: "Kelola daftar kategori dan bobot poin pelanggaran siswa.",
        items: [
          { text: "Gunakan tombol '+ Tambah Data' untuk menambah kategori baru." },
          { text: "Klik ikon pensil untuk mengubah nama atau bobot poin pelanggaran." },
          { text: "Data ini akan digunakan sebagai referensi saat mencatat pelanggaran siswa." }
        ]
      }}
    >
      <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
        {isMobile ? (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <Button 
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => { resetForm(); setModalOpen(true); }}
                className="w-full sm:w-auto"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Tambah Kategori Pelanggaran
              </Button>
            </div>

            <MobileAcademicList
              title="Daftar Jenis Pelanggaran"
              data={data}
              loading={loading}
              totalItems={totalItems}
              emptyMessage="Belum ada data jenis pelanggaran"
              pagination={{
                currentPage,
                totalPages,
                totalItems,
                itemsPerPage,
                onPageChange: handlePageChange,
                onLimitChange: (limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }
              }}
              renderCard={renderMobileCard}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="Belum ada data. Tambah baru atau data akan di-seed otomatis saat membuka halaman Pelanggaran."
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            toolbarLeft={
              <div className="p-4">
                <Button 
                  variant="toolbarPrimary"
                  size="toolbar"
                  onClick={() => { resetForm(); setModalOpen(true); }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Tambah Data
                </Button>
              </div>
            }
            pagination={{
              currentPage,
              totalPages,
              totalItems,
              itemsPerPage,
              onPageChange: handlePageChange,
              onLimitChange: (limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }
            }}
          />
        )}
      </Card>

      <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedId ? "Edit Jenis Pelanggaran" : "Tambah Jenis Pelanggaran"} size="md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="kategori-select" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Kategori</Label>
              <SearchableSelect
                  id="kategori-select"
                  value={formData.kategori}
                  onValueChange={(val) => setFormData({...formData, kategori: val})}
                  options={[
                      { label: 'Pelanggaran Ringan', value: 'Pelanggaran Ringan' },
                      { label: 'Pelanggaran Sedang', value: 'Pelanggaran Sedang' },
                      { label: 'Pelanggaran Berat', value: 'Pelanggaran Berat' }
                  ]}
                  placeholder="Pilih Kategori"
                  searchPlaceholder="Cari Kategori..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama-pelanggaran-input" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nama Pelanggaran</Label>
              <Input
                  id="nama-pelanggaran-input"
                  aria-label="Nama Pelanggaran"
                  value={formData.nama_pelanggaran}
                  onChange={(e) => setFormData({...formData, nama_pelanggaran: e.target.value})}
                  placeholder="Contoh: Terlambat masuk sekolah"
                  className="h-11 rounded-xl"
                  required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poin-input" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bobot Poin</Label>
              <Input
                  id="poin-input"
                  aria-label="Poin Pelanggaran"
                  type="number"
                  min="0"
                  value={formData.poin}
                  onChange={(e) => setFormData({...formData, poin: Number(e.target.value)})}
                  className="h-11 rounded-xl"
                  required
              />
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
              <Button type="button" variant="outline" className="rounded-xl h-12 px-6 font-bold" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 border-none">Simpan Data</Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
});
