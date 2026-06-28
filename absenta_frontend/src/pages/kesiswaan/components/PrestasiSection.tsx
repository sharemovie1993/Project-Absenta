import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { kesiswaanApi, type PrestasiSiswa, type JenisPrestasi } from '../../../api/kesiswaan.api';
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
import { Search, Plus, Edit2, Trash2, Trophy } from 'lucide-react';
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

export const PrestasiSection: React.FC = () => {
  const [data, setData] = useState<PrestasiSiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');


  const confirm = useConfirm();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<Student | null>(null);
  const [categories, setCategories] = useState<JenisPrestasi[]>([]);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    jenis_prestasi_id: '',
    nama_prestasi: '',
    poin: 0,
    keterangan: ''
  });

  const fetchCategories = useCallback(async () => {
    try {
      let res = await kesiswaanApi.getJenisPrestasi();
      if (!res.data || res.data.length === 0) {
        try {
          await kesiswaanApi.seedJenisPrestasi();
          res = await kesiswaanApi.getJenisPrestasi();
        } catch (e) {
          console.error('Failed to seed default jenis prestasi:', e);
        }
      }
      setCategories(res.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await kesiswaanApi.getPrestasiSiswa({
        page,
        limit,
        search: debouncedSearch
      });
      setData(res.data?.list || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalItems(res.data?.pagination?.totalItems || res.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchData();
    fetchCategories();
  }, [fetchData, fetchCategories]);

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      jenis_prestasi_id: '',
      nama_prestasi: '',
      poin: 0,
      keterangan: ''
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: PrestasiSiswa) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      jenis_prestasi_id: item.jenis_prestasi_id || '',
      nama_prestasi: item.nama_prestasi,
      poin: item.poin,
      keterangan: item.keterangan || ''
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Catatan Prestasi',
      description: 'Apakah Anda yakin ingin menghapus catatan prestasi ini? Poin penghargaan siswa akan berkurang.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await kesiswaanApi.deletePrestasiSiswa(id);
      if (res.success) {
        toast.success('Catatan prestasi berhasil dihapus');
        fetchData();
      } else {
        toast.error(res.message || 'Gagal menghapus catatan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Koneksi bermasalah');
    }
  }, [confirm, fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      toast.error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.nama_prestasi.trim()) {
      toast.error('Harap isi nama prestasi');
      return;
    }
    if (formData.poin <= 0) {
      toast.error('Poin penghargaan harus lebih besar dari 0');
      return;
    }

    try {
      if (selectedId) {
        await kesiswaanApi.updatePrestasiSiswa(selectedId, formData);
        toast.success('Catatan prestasi berhasil diperbarui');
      } else {
        await kesiswaanApi.createPrestasiSiswa(formData);
        toast.success('Catatan prestasi baru berhasil disimpan');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan catatan prestasi');
    }
  }, [selectedId, formData, fetchData, resetForm]);

  const handleCategoryChange = useCallback((catId: string) => {
    const matched = categories.find(c => c.id === catId);
    setFormData(prev => ({
      ...prev,
      jenis_prestasi_id: catId,
      nama_prestasi: matched ? matched.nama_prestasi : prev.nama_prestasi,
      poin: matched ? matched.poin : prev.poin
    }));
  }, [categories]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const handleCloseModal = useCallback(() => {
    resetForm();
    setModalOpen(false);
  }, [resetForm]);

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
      render: (_, item: PrestasiSiswa) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'nama_prestasi',
      label: 'Kategori / Nama Prestasi',
      render: (_, item: PrestasiSiswa) => (
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.nama_prestasi}</span>
          {item.Jenis && (
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Jenis.kategori}</div>
          )}
        </div>
      )
    },
    {
      key: 'poin',
      label: 'Poin',
      sortable: true,
      render: (value: number) => (
        <span className="text-xs font-black text-emerald-500">
          +{value}
        </span>
      )
    },
    {
      key: 'keterangan',
      label: 'Keterangan',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-500 line-clamp-1 max-w-xs">{value || '-'}</p>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: PrestasiSiswa) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-8 h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="w-8 h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Catatan Prestasi & Penghargaan Siswa</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pendataan penghargaan akademik/non-akademik siswa yang memberikan poin positif</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1/5" />
          Catat Prestasi
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari siswa atau nama penghargaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Prestasi...</p>
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

      {/* Form Modal */}
      <Suspense fallback={null}>
        <Modal isOpen={modalOpen} onClose={handleCloseModal} title={selectedId ? 'Edit Catatan Prestasi' : 'Catat Prestasi Baru'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Cari nama atau NIS siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Gunakan Master Kategori (Opsional)</Label>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Pilih Kategori (Bisa Diisi Manual Di Bawah) --' },
                  ...categories?.map(c => ({ value: c.id, label: `[+${c.poin}] ${c.nama_prestasi}` }))
                ]}
                value={formData.jenis_prestasi_id}
                onValueChange={handleCategoryChange}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Perolehan</Label>
                <Input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Poin Penghargaan (Reward)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.poin || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, poin: parseInt(e.target.value) || 0 }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Prestasi / Kegiatan</Label>
              <Input
                placeholder="Contoh: Juara 1 Lomba Debat Bahasa Inggris Tingkat Kota"
                value={formData.nama_prestasi}
                onChange={(e) => setFormData(prev => ({ ...prev, nama_prestasi: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan-prestasi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Keterangan / Rincian Tambahan</Label>
              <textarea
                id="keterangan-prestasi"
                aria-label="Keterangan / Rincian Tambahan"
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Tulis detail tambahan seperti penyelenggara, nama guru pembimbing, dll..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={handleCloseModal}>
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
};


