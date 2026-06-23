import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { bkApi, type KonselingSiswa } from '../../../../api/kesiswaan/bk.api';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import type { Column } from '../../../../components/ui/Table';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { Loader } from '../../../../components/ui/Loader';
import { Badge } from '../../../../components/ui/Badge';
import { Label } from '../../../../components/ui/Label';
import { useToast } from '../../../../hooks/useToast';
import useConfirm from '../../../../hooks/useConfirm';
import { Search, Plus, Edit2, Trash2, Calendar, Clipboard, UserCheck, MessageSquare } from 'lucide-react';
import { useDebounce } from '../../../../hooks/useDebounce';

const Modal = lazy(() => import('../../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

export const KonselingSection: React.FC = () => {
  const [data, setData] = useState<KonselingSiswa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [selectedTipe, setSelectedTipe] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  const { success, error } = useToast();
  const confirm = useConfirm();

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
    status: 'PROSES'
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bkApi.getKonseling({
        page,
        limit,
        search: debouncedSearch,
        tipe: selectedTipe,
        status: selectedStatus
      });
      setData(res.data?.list || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching counselings:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, selectedTipe, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      tipe: 'INDIVIDU',
      masalah: '',
      solusi: '',
      status: 'PROSES'
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  };

  const handleEdit = (item: KonselingSiswa) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      tipe: item.tipe,
      masalah: item.masalah,
      solusi: item.solusi || '',
      status: item.status
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Catatan Konseling',
      description: 'Apakah Anda yakin ingin menghapus catatan konseling ini? Tindakan ini bersifat permanen.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bkApi.deleteKonseling(id);
      if (res.success) {
        success('Catatan konseling berhasil dihapus');
        fetchData();
      } else {
        error(res.message || 'Gagal menghapus catatan');
      }
    } catch (err: any) {
      error(err.message || 'Koneksi bermasalah');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.masalah.trim()) {
      error('Harap isi deskripsi masalah');
      return;
    }

    try {
      let res;
      if (selectedId) {
        res = await bkApi.updateKonseling(selectedId, formData);
        success('Sesi konseling berhasil diperbarui');
      } else {
        res = await bkApi.createKonseling(formData);
        success('Sesi konseling baru berhasil dicatat');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan catatan konseling');
    }
  };

  const columns: Column[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: any) => (
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
      render: (_, item: any) => (
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {item.Petugas?.full_name || 'Petugas BK'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: any) => (
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
  ];

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
            onChange={setSelectedTipe}
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
            onChange={setSelectedStatus}
            placeholder="Status Layanan"
            className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menyelaraskan Catatan BK...</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={data}
          pagination={{
            page,
            limit,
            total: totalPages * limit,
            totalPages,
            onPageChange: setPage
          }}
        />
      )}

      {/* Record Modal */}
      <Suspense fallback={null}>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedId ? 'Edit Catatan Konseling' : 'Catat Konseling Baru'} size="lg">
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
                    placeholder="Ketik nama atau NIS siswa..."
                  />
                </Suspense>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Sesi</Label>
                <Input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipe Sesi</Label>
                <SearchableSelect
                  options={[
                    { value: 'INDIVIDU', label: 'Konseling Individu' },
                    { value: 'KELOMPOK', label: 'Konseling Kelompok' }
                  ]}
                  value={formData.tipe}
                  onChange={(val) => setFormData(prev => ({ ...prev, tipe: val }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Kasus / Masalah yang Dihadapi</Label>
              <textarea
                value={formData.masalah}
                onChange={(e) => setFormData(prev => ({ ...prev, masalah: e.target.value }))}
                placeholder="Tulis ringkasan masalah atau keluhan siswa..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Solusi / Rekomendasi Hasil Konseling</Label>
              <textarea
                value={formData.solusi}
                onChange={(e) => setFormData(prev => ({ ...prev, solusi: e.target.value }))}
                placeholder="Tulis hasil bimbingan, komitmen siswa, atau rencana tindak lanjut..."
                className="w-full min-h-[80px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Pendampingan</Label>
              <SearchableSelect
                options={[
                  { value: 'PROSES', label: 'Pendampingan Berjalan (PROSES)' },
                  { value: 'SELESAI', label: 'Selesai (Kasus Tuntas)' }
                ]}
                value={formData.status}
                onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setModalOpen(false)}>
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
