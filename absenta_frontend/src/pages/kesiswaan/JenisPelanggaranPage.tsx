import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Label } from '../../components/ui/Label';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';
import { kesiswaanApi } from '../../api/kesiswaan.api';
import type { JenisPelanggaran } from '../../api/kesiswaan.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Loader } from '../../components/ui/Loader';
import { Plus, Edit2, Trash2 } from 'lucide-react';

// Lazy load heavy components
const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

export default function JenisPelanggaranPage() {
  const [data, setData] = useState<JenisPelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Pagination & Sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    kategori: 'Pelanggaran Ringan',
    nama_pelanggaran: '',
    poin: 5
  });

  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      // API currently doesn't support pagination/sorting for JenisPelanggaran, 
      // but we implement the UI pattern and can simulate/prepare for it.
      const result = await kesiswaanApi.getJenisPelanggaran();
      const list = result.data || [];
      setData(list);
      
      // Simulate pagination info if API doesn't provide it yet
      setTotalPages(Math.ceil(list.length / itemsPerPage) || 1);
      setTotalItems(list.length);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data referensi');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchData(page);
  }, [fetchData]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    // In a real scenario, we would refetch with sort params
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedId) {
        await kesiswaanApi.updateJenisPelanggaran(selectedId, formData);
        toast.success('Data berhasil diperbarui');
      } else {
        await kesiswaanApi.createJenisPelanggaran(formData);
        toast.success('Data berhasil disimpan');
      }
      setModalOpen(false);
      fetchData(currentPage);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan data');
    }
  }, [selectedId, formData, fetchData, currentPage]);

  const resetForm = useCallback(() => {
    setFormData({
      kategori: 'Pelanggaran Ringan',
      nama_pelanggaran: '',
      poin: 5
    });
    setSelectedId(null);
  }, []);

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
        fetchData(currentPage);
      } catch (err) {
        toast.error('Gagal menghapus data');
      }
    }
  }, [fetchData, currentPage, confirm]);

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
}
