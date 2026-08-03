import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bpbkApi, type RujukanKasus, bpbkQueryKeys } from '../../../api/bpbk.api';
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
import { Plus, Edit2, Trash2 } from 'lucide-react';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));

export const RujukanSection: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // Form states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [formData, setFormData] = useState({
    siswa_id: '',
    tanggal: new Date().toISOString().split('T')[0],
    rujukan_ke: '',
    alasan: '',
    status: 'DIUSULKAN'
  });

  // ── useQuery: Rujukan List ────────────────────────────────────────────────
  const { data: rujukanRes, isLoading: loading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.rujukanList({ page, limit }),
    queryFn: () => bpbkApi.getRujukan({ page, limit }),
    staleTime: 5 * 60 * 1000,
  });

  const data = useMemo(() => rujukanRes?.data?.list || [], [rujukanRes]);
  const totalPages = rujukanRes?.data?.pagination?.totalPages || 1;

  const resetForm = useCallback(() => {
    setFormData({
      siswa_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      rujukan_ke: '',
      alasan: '',
      status: 'DIUSULKAN'
    });
    setSelectedSiswa(null);
    setSelectedId(null);
  }, []);

  const handleEdit = useCallback((item: RujukanKasus) => {
    setSelectedId(item.id);
    setSelectedSiswa(item.Siswa || null);
    setFormData({
      siswa_id: item.siswa_id,
      tanggal: new Date(item.tanggal).toISOString().split('T')[0],
      rujukan_ke: item.rujukan_ke,
      alasan: item.alasan,
      status: item.status
    });
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const ok = await confirm({
      title: 'Hapus Rujukan Kasus',
      description: 'Apakah Anda yakin ingin menghapus catatan rujukan kasus ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (!ok) return;

    try {
      const res = await bpbkApi.deleteRujukan(id);
      if (res.success) {
        toast.success('Catatan rujukan berhasil dihapus');
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id) {
      toast.error('Harap pilih siswa terlebih dahulu');
      return;
    }
    if (!formData.rujukan_ke.trim()) {
      toast.error('Harap isi instansi/pihak rujukan');
      return;
    }
    if (!formData.alasan.trim()) {
      toast.error('Harap isi alasan rujukan');
      return;
    }

    try {
      if (selectedId) {
        await bpbkApi.updateRujukan(selectedId, formData);
        toast.success('Log rujukan kasus berhasil diperbarui');
      } else {
        await bpbkApi.createRujukan(formData);
        toast.success('Rujukan kasus baru berhasil dicatat');
      }

      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
      refetch();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menyimpan rujukan kasus';
      toast.error(errorMsg);
    }
  }, [selectedId, formData, resetForm, queryClient, refetch]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal',
      label: 'Tanggal Rujukan',
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
      render: (_, item: any) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-white text-xs">{item.Siswa?.nama_siswa}</div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'rujukan_ke',
      label: 'Dirujuk Ke',
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</span>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan / Deskripsi Kasus',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-xs">{value}</p>
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
  ], [handleEdit, handleDelete]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Disposisi Rujukan Kasus Siswa (Referral)</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Penanganan kasus khusus yang didelegasikan ke psikolog klinis, rumah sakit, kepala sekolah, atau komite sekolah</p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => { resetForm(); setModalOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Catat Rujukan
        </Button>
      </div>

      {/* Table */}
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Rujukan...</p>
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

      {/* Form Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title={selectedId ? 'Perbarui Log Rujukan' : 'Catat Rujukan Baru'} 
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
                <Label htmlFor="tanggal-rujukan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal Rujukan</Label>
                <Input
                  id="tanggal-rujukan"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rujukan-ke" className="text-xs font-bold uppercase tracking-wider text-slate-500">Dirujuk Ke (Instansi/Pihak)</Label>
                <Input
                  id="rujukan-ke"
                  placeholder="Contoh: Psikolog Dinas Pendidikan, RS Jiwa, Kepala Sekolah"
                  value={formData.rujukan_ke}
                  onChange={(e) => setFormData(prev => ({ ...prev, rujukan_ke: e.target.value }))}
                  className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alasan-rekomendasi" className="text-xs font-bold uppercase tracking-wider text-slate-500">Alasan & Rekomendasi Rujukan</Label>
              <textarea
                id="alasan-rekomendasi"
                aria-label="Alasan & Rekomendasi Rujukan"
                value={formData.alasan}
                onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Tulis alasan dilaksanakannya rujukan kasus (contoh: Gangguan kecemasan berat, butuh tindakan disiplin pleno)..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-rujukan" className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Rujukan</Label>
              <SearchableSelect
                id="status-rujukan"
                options={[
                  { value: 'DIUSULKAN', label: 'Diusulkan (Belum Diproses)' },
                  { value: 'SELESAI', label: 'Tuntas (Siswa Sudah Menghadap)' }
                ]}
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                className="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
              />
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
};


