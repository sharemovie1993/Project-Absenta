import { z } from 'zod';
import { formatDate } from '../../../utils/layoutUtils';
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
import { DebouncedSearchInput } from '../../../components/ui';
import toast from 'react-hot-toast';
import useConfirm from '../../../hooks/useConfirm';
import { Plus, Edit2, Trash2, Share2, CheckCircle2, Clock, Eye, History, Building2 } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { MobileAcademicList } from '../../../components/academic/shared/MobileAcademicList';

const Modal = lazy(() => import('../../../components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('../../../components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));
const BpbkSiswaHistoryView = lazy(() => import('./BpbkSiswaHistoryView').then(m => ({ default: m.BpbkSiswaHistoryView })));

const rujukanFormSchema = z.object({
  kasus_bk_id: z.string().min(1, 'Kasus wajib dipilih'),
  pihak_rujukan: z.string().min(1, 'Pihak rujukan wajib diisi'),
  tanggal_rujukan: z.string().min(1, 'Tanggal rujukan wajib diisi'),
  alasan_rujukan: z.string().min(1, 'Alasan rujukan wajib diisi'),
  progres_terakhir: z.string().optional()
});

export const RujukanSection: React.FC = React.memo(() => {
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

  // Form & Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSiswa, setSelectedSiswa] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<RujukanKasus | null>(null);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);
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
  const totalItems = rujukanRes?.data?.pagination?.total || data.length;

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item: RujukanKasus) => {
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesQuery =
        !q ||
        (item.Siswa?.nama_siswa || '').toLowerCase().includes(q) ||
        (item.rujukan_ke || '').toLowerCase().includes(q) ||
        (item.alasan || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [data, search, statusFilter]);

  const analytics = useMemo(() => {
    const diusulkan = data.filter((i: RujukanKasus) => i.status !== 'SELESAI').length;
    const selesai = data.filter((i: RujukanKasus) => i.status === 'SELESAI').length;
    const instansiCount = new Set(data.map((i: RujukanKasus) => (i.rujukan_ke || '').trim()).filter(Boolean)).size;
    return {
      total: totalItems,
      diusulkan,
      selesai,
      instansiCount,
    };
  }, [data, totalItems]);

  const handleMarkComplete = useCallback(async (item: RujukanKasus) => {
    try {
      await bpbkApi.updateRujukan(item.id, { status: 'SELESAI' });
      toast.success('Status rujukan ditandai Tuntas (SELESAI)');
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
      refetch();
    } catch {
      toast.error('Gagal memperbarui status rujukan');
    }
  }, [queryClient, refetch]);

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
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          {new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: any) => (
        <div
          className="cursor-pointer group min-w-[130px]"
          onClick={() => item.siswa_id && setHistorySiswaId(item.siswa_id)}
          title="Lihat Riwayat & Rekam Jejak BP/BK Siswa"
        >
          <div className="font-bold text-slate-800 dark:text-white text-xs group-hover:text-indigo-600 transition-colors">
            {item.Siswa?.nama_siswa}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'rujukan_ke',
      label: 'Dirujuk Ke',
      render: (value: string) => (
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{value}</span>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan / Deskripsi Kasus',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">{value}</p>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'SELESAI' ? 'success' : 'warning'} className="text-[9px] font-black uppercase whitespace-nowrap">
          {value}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: any) => (
        <div className="flex items-center gap-1 justify-end whitespace-nowrap">
          {item.status !== 'SELESAI' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkComplete(item)}
              className="h-7 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100 rounded-lg"
              title="Tandai Rujukan Tuntas"
            >
              <CheckCircle2 size={12} className="mr-1" /> Tuntas
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDetailTarget(item)}
            className="w-7 h-7 text-blue-600 bg-blue-50/80 hover:bg-blue-100 rounded-lg"
            title="Lihat Detail Rujukan"
          >
            <Eye size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => item.siswa_id && setHistorySiswaId(item.siswa_id)}
            className="w-7 h-7 text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-lg"
            title="Riwayat BP/BK Siswa"
          >
            <History size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            className="w-7 h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg"
            title="Edit Rujukan"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.id)}
            className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
            title="Hapus Rujukan"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [handleEdit, handleDelete, handleMarkComplete]);

  const isMobile = useIsMobile();

  const renderMobileCard = (item: RujukanKasus) => {
    return (
      <div
        key={item.id}
        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {formatDate(item.tanggal)}
            </span>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-tight">
              {item.Siswa?.nama_siswa}
            </h4>
            <p className="text-[10px] font-bold text-slate-500 font-mono">
              Kelas: {item.Siswa?.Kelas?.nama_kelas || '-'} • NIS: {item.Siswa?.nis || '-'}
            </p>
          </div>
          <Badge
            variant={item.status === 'SELESAI' ? 'success' : item.status === 'DISETUJUI' ? 'info' : 'warning'}
            className="text-[9px] font-black uppercase"
          >
            {item.status}
          </Badge>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>Rujukan ke:</span>
            <span>{item.rujukan_ke}</span>
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {item.alasan}
          </p>
        </div>

        <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            {item.status !== 'SELESAI' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkComplete(item)}
                className="h-8 px-2.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-bold rounded-lg"
              >
                <CheckCircle2 size={13} className="mr-1" /> Tuntas
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailTarget(item)}
              className="h-8 px-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100 text-[11px] font-bold rounded-lg"
            >
              <Eye size={13} className="mr-1" /> Detail
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => item.siswa_id && setHistorySiswaId(item.siswa_id)}
              className="w-8 h-8 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              title="Riwayat Siswa"
            >
              <History size={13} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(item)}
              className="w-8 h-8 text-indigo-600 hover:bg-indigo-50"
              title="Edit Rujukan"
            >
              <Edit2 size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(item.id)}
              className="w-8 h-8 text-rose-600 hover:bg-rose-50"
              title="Hapus Rujukan"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Analytics Strip (Standar Konseling) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Rujukan</span>
            <span className="text-xl font-black text-slate-800 dark:text-white font-mono">{analytics.total}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Share2 size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Diusulkan</span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">{analytics.diusulkan}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
            <Clock size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Tuntas / Selesai</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{analytics.selesai}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Pihak / Instansi</span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">{analytics.instansiCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
            <Building2 size={15} />
          </div>
        </div>
      </div>

      {/* Filters & Table Card */}
      <Card noPadding className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <DebouncedSearchInput
              placeholder="Cari siswa, instansi rujukan, atau alasan..."
              value={search}
              onChange={setSearch}
              isLoading={loading}
              className="w-full"
              inputClassName="h-10 text-xs border-slate-200/60 dark:border-slate-800 rounded-xl"
            />
          </div>
          <div>
            <SearchableSelect
              options={[
                { value: '', label: 'Semua Status' },
                { value: 'DIUSULKAN', label: 'Diusulkan' },
                { value: 'SELESAI', label: 'Tuntas / Selesai' }
              ]}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Status Rujukan"
            />
          </div>
        </div>
      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader className="mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Database Rujukan...</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-4">
          <MobileAcademicList
            title="Daftar Rujukan Kasus"
            data={filteredData}
            loading={loading}
            totalItems={filteredData.length}
            emptyMessage="Belum ada catatan rujukan kasus siswa."
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
      </Card>

      {/* Form Modal */}
      <Suspense fallback={null}>
        <Modal 
          isOpen={modalOpen} 
          onClose={() => { setModalOpen(false); resetForm(); }} 
          title={selectedId ? 'Perbarui Log Rujukan' : 'Catat Rujukan Baru'} 
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-sky-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/50">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Share2 size={17} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-white">Rujukan Kasus Eksternal / Lanjutan</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Catat pihak rujukan ahli, alasan klinis/disiplin, dan pantau status tindak lanjutnya.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Pilih Siswa</Label>
              {selectedSiswa ? (
                <div className="flex items-center justify-between p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {(selectedSiswa.nama_siswa || 'S').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{selectedSiswa.nama_siswa}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase tracking-wider mt-0.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-sky-50/45 dark:bg-sky-950/20 border border-sky-200/70">
              <div className="space-y-1.5">
                <Label htmlFor="tanggal-rujukan" className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Tanggal Rujukan</Label>
                <Input
                  id="tanggal-rujukan"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="h-10 text-xs bg-white dark:bg-slate-900 border-sky-200/80 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rujukan-ke" className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Dirujuk Ke (Instansi/Pihak)</Label>
                <Input
                  id="rujukan-ke"
                  placeholder="Contoh: Psikolog Dinas Pendidikan, RS Jiwa, Kepala Sekolah"
                  value={formData.rujukan_ke}
                  onChange={(e) => setFormData(prev => ({ ...prev, rujukan_ke: e.target.value }))}
                  className="h-10 text-xs bg-white dark:bg-slate-900 border-sky-200/80 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-50/45 dark:bg-amber-950/20 border border-amber-200/70">
              <Label htmlFor="alasan-rekomendasi" className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Alasan & Rekomendasi Rujukan</Label>
              <textarea
                id="alasan-rekomendasi"
                aria-label="Alasan & Rekomendasi Rujukan"
                value={formData.alasan}
                onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Tulis alasan dilaksanakannya rujukan kasus (contoh: Gangguan kecemasan berat, butuh tindakan disiplin pleno)..."
                className="w-full min-h-[100px] p-3 text-xs bg-white dark:bg-slate-900 border border-amber-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>

            <div className="space-y-1.5 p-3.5 rounded-2xl bg-emerald-50/45 dark:bg-emerald-950/20 border border-emerald-200/70">
              <Label htmlFor="status-rujukan" className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Status Rujukan</Label>
              <SearchableSelect
                id="status-rujukan"
                options={[
                  { value: 'DIUSULKAN', label: 'Diusulkan (Belum Diproses)' },
                  { value: 'SELESAI', label: 'Tuntas (Siswa Sudah Menghadap)' }
                ]}
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                className="h-10 text-xs bg-white dark:bg-slate-900 border-emerald-200/80 rounded-xl"
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

        {/* Modal Detail Rujukan */}
        {detailTarget && (
          <Modal
            isOpen={Boolean(detailTarget)}
            onClose={() => setDetailTarget(null)}
            title={`Detail Rujukan: ${detailTarget.Siswa?.nama_siswa || 'Siswa'}`}
            size="lg"
          >
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600 block">Tanggal Rujukan</span>
                  <span className="font-bold text-slate-800">{formatDate(detailTarget.tanggal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600 block">Dirujuk Ke</span>
                  <span className="font-bold text-blue-900">{detailTarget.rujukan_ke}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-700 block">Alasan & Rekomendasi Rujukan</span>
                <p className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/80 text-slate-700 leading-relaxed">
                  {detailTarget.alasan}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                {detailTarget.status !== 'SELESAI' && (
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const target = detailTarget;
                      setDetailTarget(null);
                      handleMarkComplete(target);
                    }}
                  >
                    <CheckCircle2 size={13} className="mr-1.5" /> Tandai Tuntas
                  </Button>
                )}
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
                  <Edit2 size={13} className="mr-1.5" /> Edit
                </Button>
              </div>
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
    </div>
  );
});


