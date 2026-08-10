import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Loader } from '../../components/ui/Loader';
import { Badge } from '../../components/ui/Badge';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { correspondenceApi, type SuratMasuk } from '../../api/correspondence.api';
import { getAllUsersForDropdown, type DropdownOption } from '../../api/dropdown.api';
import { useDebounce } from '../../hooks/useDebounce';
import useConfirm from '../../hooks/useConfirm';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Mail, FileText, CheckSquare, Clock } from 'lucide-react';

const Modal = lazy(() => import('../../components/ui/Modal').then(m => ({ default: m.Modal })));

export default function SuratMasukPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [dispoModalOpen, setDispoModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const confirm = useConfirm();

  const [formData, setFormData] = useState({
    nomor_surat: '',
    judul: '',
    asal_surat: '',
    tanggal_surat: new Date().toISOString().split('T')[0],
    tanggal_terima: new Date().toISOString().split('T')[0],
    ringkasan: '',
    dokumen_url: ''
  });

  const [dispoData, setDispoData] = useState({
    instruksi: '',
    penerima_id: ''
  });

  const resetForm = useCallback(() => {
    setFormData({
      nomor_surat: '',
      judul: '',
      asal_surat: '',
      tanggal_surat: new Date().toISOString().split('T')[0],
      tanggal_terima: new Date().toISOString().split('T')[0],
      ringkasan: '',
      dokumen_url: ''
    });
    setSelectedId(null);
  }, []);

  const suratMasukQuery = useQuery({
    queryKey: ['surat-masuk-list', page, limit, debouncedSearch, statusFilter],
    queryFn: async () => {
      const res = await correspondenceApi.getSuratMasuk({
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter || undefined
      });
      return {
        list: res.data?.list || [],
        totalPages: res.data?.pagination?.totalPages || 1,
        totalItems: res.data?.pagination?.total || res.data?.pagination?.totalItems || 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = suratMasukQuery.data?.list || [];
  const totalPages = suratMasukQuery.data?.totalPages || 1;
  const totalItems = suratMasukQuery.data?.totalItems || 0;
  const loading = suratMasukQuery.isLoading;

  const usersQuery = useQuery({
    queryKey: ['users-dropdown-disposisi'],
    queryFn: () => getAllUsersForDropdown(),
    staleTime: 5 * 60 * 1000,
  });

  const users = usersQuery.data || [];

  const fetchData = useCallback(async () => {
    await suratMasukQuery.refetch();
  }, [suratMasukQuery]);

  const deleteSuratMasukMutation = useMutation({
    mutationFn: (id: string) => correspondenceApi.deleteSuratMasuk(id),
    onSuccess: () => {
      toast.success('Surat masuk berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['surat-masuk-list'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus surat masuk');
    }
  });

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Surat Masuk',
      description: 'Apakah Anda yakin ingin menghapus surat masuk ini? Tindakan ini tidak bisa dibatalkan.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;
    await deleteSuratMasukMutation.mutateAsync(id);
  }, [confirm, deleteSuratMasukMutation]);

  const handleEdit = useCallback((item: SuratMasuk) => {
    setSelectedId(item.id);
    setFormData({
      nomor_surat: item.nomor_surat || '',
      judul: item.judul || '',
      asal_surat: item.asal_surat || '',
      tanggal_surat: item.tanggal_surat ? item.tanggal_surat.split('T')[0] : new Date().toISOString().split('T')[0],
      tanggal_terima: item.tanggal_terima ? item.tanggal_terima.split('T')[0] : new Date().toISOString().split('T')[0],
      ringkasan: item.ringkasan || '',
      dokumen_url: item.dokumen_url || ''
    });
    setModalOpen(true);
  }, []);

  const handleOpenDisposisi = useCallback((item: SuratMasuk) => {
    setSelectedId(item.id);
    setDispoData({
      instruksi: item.disposisi_instruksi || '',
      penerima_id: item.penerima_disposisi_id || ''
    });
    setDispoModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomor_surat.trim() || !formData.judul.trim()) {
      toast.error('Nomor Surat dan Perihal wajib diisi');
      return;
    }

    try {
      if (selectedId) {
        await correspondenceApi.updateSuratMasuk(selectedId, formData);
        toast.success('Surat masuk berhasil diperbarui');
      } else {
        await correspondenceApi.createSuratMasuk(formData);
        toast.success('Surat masuk baru berhasil direkam');
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan surat masuk');
    }
  }, [selectedId, formData, fetchData, resetForm]);

  const handleDisposisiSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!dispoData.penerima_id || !dispoData.instruksi.trim()) {
      toast.error('Pilih penerima dan isi instruksi disposisi');
      return;
    }

    try {
      await correspondenceApi.disposisiSuratMasuk(selectedId, dispoData);
      toast.success('Instruksi disposisi berhasil diteruskan');
      setDispoModalOpen(false);
      setSelectedId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal meneruskan disposisi');
    }
  }, [selectedId, dispoData, fetchData]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'BARU': return <Badge variant="info">Baru</Badge>;
      case 'DISPOSISI': return <Badge variant="warning">Disposisi</Badge>;
      case 'PROSES': return <Badge variant="default">Proses</Badge>;
      case 'SELESAI': return <Badge variant="success">Selesai</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const columns: Column[] = useMemo(() => [
    {
      key: 'nomor_surat',
      label: 'Nomor Surat / Pengirim',
      render: (_, item: SuratMasuk) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.nomor_surat}</div>
          <div className="text-[10px] text-slate-400 font-medium">{item.asal_surat || '-'}</div>
        </div>
      )
    },
    {
      key: 'judul',
      label: 'Perihal & Ringkasan',
      render: (_, item: SuratMasuk) => (
        <div className="max-w-md">
          <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">{item.judul}</div>
          {item.ringkasan && (
            <p className="text-[10px] text-slate-400 line-clamp-1">{item.ringkasan}</p>
          )}
        </div>
      )
    },
    {
      key: 'tanggal_terima',
      label: 'Tgl Terima',
      render: (val: string) => (
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val: string) => statusBadge(val)
    },
    {
      key: 'disposisi',
      label: 'Disposisi',
      render: (_, item: SuratMasuk) => (
        <div>
          {item.PenerimaDisposisi ? (
            <div>
              <div className="font-semibold text-indigo-600 dark:text-indigo-400 text-[10px]">{item.PenerimaDisposisi.full_name}</div>
              <div className="text-[9px] text-slate-400 max-w-[150px] truncate">{item.disposisi_instruksi}</div>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Belum Ada</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: SuratMasuk) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            title="Disposisi"
            onClick={() => handleOpenDisposisi(item)}
            className="w-7 h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          >
            <CheckSquare size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-7 h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete, handleOpenDisposisi]);

  const stats = useMemo(() => {
    const total = data.length;
    const baru = data.filter(d => d.status === 'BARU').length;
    const dispo = data.filter(d => d.status === 'DISPOSISI').length;
    return { total, baru, dispo };
  }, [data]);

  return (
    <AcademicPageLayout
      title="Surat Masuk Sekolah"
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Persuratan', path: '/correspondence' },
        { label: 'Surat Masuk', path: '/correspondence/surat-masuk' }
      ]}
      hardeningModuleKey="correspondence_inbox"
      instruction={{
        title: "Panduan Surat Masuk",
        description: "Gunakan halaman ini untuk meregistrasikan surat eksternal yang masuk ke sekolah dan meneruskan lembar disposisi.",
        items: [
          { text: "Klik 'Registrasi Surat' untuk merekam surat baru masuk." },
          { text: "Klik ikon centang pada baris surat untuk menginput disposisi Kepala Sekolah." }
        ]
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center justify-between border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Surat Masuk</div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{totalItems}</div>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl">
            <Mail size={18} />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surat Baru</div>
            <div className="text-xl font-black text-sky-500 mt-1">{data.filter(d => d.status === 'BARU').length}</div>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/20 text-sky-500 rounded-xl">
            <Clock size={18} />
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-between border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lembar Disposisi Aktif</div>
            <div className="text-xl font-black text-amber-500 mt-1">{data.filter(d => d.status === 'DISPOSISI').length}</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
            <CheckSquare size={18} />
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nomor, perihal, atau pengirim..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 rounded-xl min-w-[150px] font-semibold text-slate-600 dark:text-slate-300"
            >
              <option value="">Semua Status</option>
              <option value="BARU">Baru</option>
              <option value="DISPOSISI">Disposisi</option>
              <option value="PROSES">Proses</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => { resetForm(); setModalOpen(true); }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Registrasi Surat
          </Button>
        </div>

        {loading && data.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader className="mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Server Surat...</p>
          </div>
        ) : (
          <Table
            columns={columns}
            data={data}
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
      </Card>

      <Suspense fallback={null}>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedId ? 'Edit Surat Masuk' : 'Registrasi Surat Masuk Baru'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nomor Surat Asal</Label>
                <Input
                  placeholder="Contoh: 005/12/2026"
                  value={formData.nomor_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomor_surat: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Asal Surat / Pengirim</Label>
                <Input
                  placeholder="Contoh: Dinas Pendidikan Kota"
                  value={formData.asal_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, asal_surat: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Perihal / Hal</Label>
              <Input
                placeholder="Tulis ringkasan perihal surat..."
                value={formData.judul}
                onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Surat Asal</Label>
                <Input
                  type="date"
                  value={formData.tanggal_surat}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal_surat: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Terima Sekolah</Label>
                <Input
                  type="date"
                  value={formData.tanggal_terima}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal_terima: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan Isi / Catatan (Opsional)</Label>
              <textarea
                value={formData.ringkasan}
                onChange={(e) => setFormData(prev => ({ ...prev, ringkasan: e.target.value }))}
                className="w-full p-3 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={3}
                placeholder="Tulis ringkasan isi surat jika diperlukan..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="submit" variant="primary">Simpan Registrasi</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={dispoModalOpen} onClose={() => setDispoModalOpen(false)} title="Lembar Disposisi Kepala Sekolah" size="md">
          <form onSubmit={handleDisposisiSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Penerima Disposisi (Tindak Lanjut)</Label>
              <SearchableSelect
                options={[
                  { value: '', label: '-- Pilih Guru / Staff --' },
                  ...users
                ]}
                value={dispoData.penerima_id}
                onValueChange={(val) => setDispoData(prev => ({ ...prev, penerima_id: val }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Instruksi Disposisi / Catatan</Label>
              <textarea
                value={dispoData.instruksi}
                onChange={(e) => setDispoData(prev => ({ ...prev, instruksi: e.target.value }))}
                className="w-full p-3 text-xs border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={4}
                placeholder="Contoh: Harap tindaklanjuti, buatkan draf balasan surat, koordinasikan..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDispoModalOpen(false)}>Batal</Button>
              <Button type="submit" variant="primary">Teruskan Disposisi</Button>
            </div>
          </form>
        </Modal>
      </Suspense>
    </AcademicPageLayout>
  );
}