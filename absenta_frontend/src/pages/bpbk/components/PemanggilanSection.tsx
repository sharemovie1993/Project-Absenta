import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bpbkApi, type PemanggilanOrangTua, bpbkQueryKeys } from '@/api/bpbk.api';
import { Card } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Loader } from '@/components/ui/Loader';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { Search, Plus, RotateCcw, Eye, Printer, Edit2, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/utils/layoutUtils';
import { PemanggilanCard } from '@/components/bpbk/pemanggilan/PemanggilanCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';

const Modal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('@/components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));
const ConfirmModal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal })));

// Zod Schema Validation Guard (Pilar 25)
const pemanggilanFormSchema = z.object({
  siswa_id: z.string().min(1, 'Siswa wajib dipilih'),
  alasan: z.string().min(3, 'Alasan pemanggilan minimal 3 karakter'),
  tanggal_pemanggilan: z.string().min(1, 'Tanggal pemanggilan wajib diisi'),
  jam_pemanggilan: z.string().optional(),
  ruangan: z.string().optional(),
});

export const PemanggilanSection: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    siswa_id: '',
    alasan: '',
    tanggal_pemanggilan: new Date().toISOString().split('T')[0],
    jam_pemanggilan: '09:00',
    ruangan: 'Ruang BK',
  });

  // Query Fetching (Pilar 31)
  const { data: queryData, isLoading, refetch } = useQuery({
    queryKey: bpbkQueryKeys.pemanggilan({ page, limit, status: statusFilter, search: debouncedSearch }),
    queryFn: () => bpbkApi.getPemanggilan({ page, limit, status: statusFilter === 'ALL' ? undefined : statusFilter, search: debouncedSearch }),
    staleTime: 2 * 60 * 1000,
  });

  const list: PemanggilanOrangTua[] = useMemo(() => {
    const raw = queryData?.data?.list || queryData?.data;
    return Array.isArray(raw) ? raw : [];
  }, [queryData]);

  const totalItems = queryData?.data?.pagination?.total || list.length;
  const totalPages = queryData?.data?.pagination?.totalPages || Math.ceil(totalItems / limit) || 1;

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pemanggilanFormSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data belum valid.');
      return;
    }

    try {
      await bpbkApi.createPemanggilan({
        siswa_id: formData.siswa_id,
        alasan: formData.alasan,
        tanggal_pemanggilan: new Date(formData.tanggal_pemanggilan),
        keterangan_pertemuan: `Ruangan: ${formData.ruangan}, Jam: ${formData.jam_pemanggilan}`,
      });
      toast.success('Surat pemanggilan berhasil dibuat.');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    } catch {
      toast.error('Gagal membuat pemanggilan.');
    }
  }, [formData, queryClient]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await bpbkApi.deletePemanggilan(deleteId);
      toast.success('Data pemanggilan berhasil dihapus.');
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    } catch {
      toast.error('Gagal menghapus data.');
    }
  }, [deleteId, queryClient]);

  const columns: Column[] = useMemo(() => [
    {
      key: 'tanggal_pemanggilan',
      label: 'Tanggal Panggilan',
      render: (value: string) => (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          {formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: PemanggilanOrangTua) => (
        <div
          className="cursor-pointer group"
          onClick={() => item.Siswa?.id && navigate(`/academic/siswa?id=${item.Siswa.id}`)}
        >
          <div className="font-bold text-slate-800 dark:text-white text-xs group-hover:text-indigo-600 transition-colors">
            {item.Siswa?.nama_siswa}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.Siswa?.Kelas?.nama_kelas || '-'}</div>
        </div>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan Pemanggilan',
      render: (value: string) => (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs">{value}</p>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'HADIR' ? 'success' : value === 'TIDAK_HADIR' ? 'error' : 'warning'}
          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: PemanggilanOrangTua) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(item.id)}
            className="w-8 h-8 text-rose-500 hover:bg-rose-50"
            title="Hapus"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      )
    }
  ], [navigate]);

  const isMobile = useIsMobile();

  const renderMobileCard = useCallback((item: PemanggilanOrangTua) => {
    return (
      <PemanggilanCard
        key={item.id}
        item={item}
        onViewDetail={(i) => navigate(`/bpbk/cases/${i.siswa_id}`)}
        onEdit={(i) => {
          setFormData({
            siswa_id: i.siswa_id,
            alasan: i.alasan,
            tanggal_pemanggilan: new Date(i.tanggal_pemanggilan).toISOString().split('T')[0],
            jam_pemanggilan: '09:00',
            ruangan: 'Ruang BK',
          });
          setModalOpen(true);
        }}
        onDelete={(id) => setDeleteId(id)}
        onPrint={(i) => navigate(`/bpbk/pemanggilan/${i.id}/print`)}
      />
    );
  }, [navigate]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900 p-6 rounded-2xl space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            id="bpbk-pemanggilan-search"
            aria-label="Cari nama siswa atau alasan panggilan"
            placeholder="Cari nama siswa atau alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-xs w-full rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-40 min-w-0">
            <SearchableSelect
              id="bpbk-status-filter"
              aria-label="Filter status pemanggilan"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Semua Status' },
                { value: 'DIKIRIM', label: 'Menunggu' },
                { value: 'HADIR', label: 'Hadir' },
                { value: 'TIDAK_HADIR', label: 'Tidak Hadir' },
              ]}
              placeholder="Status"
            />
          </div>
          <Button
            variant="toolbarPrimary"
            size="toolbar"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 font-bold rounded-xl shadow-md shrink-0"
          >
            <Plus size={14} />
            Buat Panggilan
          </Button>
        </div>
      </div>

      {/* Table Data Master / Mobile Cards */}
      <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        {isMobile ? (
          <div className="p-2 space-y-4">
            <MobileAcademicList
              title="Daftar Surat Pemanggilan"
              data={list}
              loading={isLoading}
              totalItems={totalItems}
              emptyMessage="Tidak ada data pemanggilan yang sesuai."
              pagination={{
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
                onPageChange: setPage,
                onLimitChange: setLimit,
              }}
              renderCard={renderMobileCard}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            data={list}
            loading={isLoading}
            emptyMessage="Tidak ada data pemanggilan yang sesuai."
            pagination={{
              currentPage: page,
              totalPages,
              totalItems,
              itemsPerPage: limit,
              onPageChange: setPage,
              onLimitChange: setLimit,
            }}
          />
        )}
      </div>

      {/* Create Modal */}
      <Suspense fallback={null}>
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Buat Surat Pemanggilan Orang Tua"
          >
            <form onSubmit={handleCreate} className="space-y-4 p-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Siswa</label>
                <Suspense fallback={<div className="h-10 bg-slate-100 rounded-xl" />}>
                  <SmartStudentPicker
                    value={formData.siswa_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, siswa_id: val }))}
                  />
                </Suspense>
              </div>

              <div>
                <label htmlFor="panggilan-alasan" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Alasan Pemanggilan</label>
                <Input
                  id="panggilan-alasan"
                  aria-label="Alasan pemanggilan"
                  placeholder="Misal: Pembahasan absensi / konseling kasus..."
                  value={formData.alasan}
                  onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="panggilan-tgl" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Panggilan</label>
                  <Input
                    id="panggilan-tgl"
                    aria-label="Tanggal pemanggilan"
                    type="date"
                    value={formData.tanggal_pemanggilan}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal_pemanggilan: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="panggilan-jam" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jam & Ruangan</label>
                  <Input
                    id="panggilan-jam"
                    aria-label="Jam dan ruangan"
                    value={formData.jam_pemanggilan}
                    onChange={(e) => setFormData(prev => ({ ...prev, jam_pemanggilan: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
                <Button type="submit" variant="primary">Simpan & Terbitkan</Button>
              </div>
            </form>
          </Modal>
        )}

        {deleteId && (
          <ConfirmModal
            isOpen={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={handleConfirmDelete}
            title="Hapus Pemanggilan?"
            message="Data surat pemanggilan orang tua ini akan dihapus secara permanen."
            confirmText="Ya, Hapus"
            cancelText="Batal"
            variant="danger"
          />
        )}
      </Suspense>
    </Card>
  );
});
