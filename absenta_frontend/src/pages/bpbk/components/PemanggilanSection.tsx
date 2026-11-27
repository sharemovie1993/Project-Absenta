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
import {
  Search,
  Plus,
  RotateCcw,
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  FileText,
  History,
  MessageSquare,
  MailOpen,
  Clock,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/utils/layoutUtils';
import { PemanggilanCard } from '@/components/bpbk/pemanggilan/PemanggilanCard';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileAcademicList } from '@/components/academic/shared/MobileAcademicList';

const Modal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.Modal })));
const SmartStudentPicker = lazy(() => import('@/components/common/SmartStudentPicker').then(m => ({ default: m.SmartStudentPicker })));
const ConfirmModal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal })));
const BpbkSiswaHistoryView = lazy(() => import('./BpbkSiswaHistoryView').then(m => ({ default: m.BpbkSiswaHistoryView })));

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Modal Catat Hasil Pertemuan (HADIR / TIDAK_HADIR + Berita Acara)
  const [outcomeTarget, setOutcomeTarget] = useState<PemanggilanOrangTua | null>(null);
  const [outcomeForm, setOutcomeForm] = useState({
    status: 'HADIR' as 'HADIR' | 'TIDAK_HADIR',
    tanggal_pertemuan: new Date().toISOString().split('T')[0],
    keterangan_pertemuan: '',
  });
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    siswa_id: '',
    alasan: '',
    tanggal_pemanggilan: new Date().toISOString().split('T')[0],
    jam_pemanggilan: '09:00 WIB',
    ruangan: 'Ruang BK',
    ortu_notified: true,
  });

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormData({
      siswa_id: '',
      alasan: '',
      tanggal_pemanggilan: new Date().toISOString().split('T')[0],
      jam_pemanggilan: '09:00 WIB',
      ruangan: 'Ruang BK',
      ortu_notified: true,
    });
  }, []);

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

  const handleCreateOrUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pemanggilanFormSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data belum valid.');
      return;
    }

    try {
      if (editingId) {
        await bpbkApi.updatePemanggilan(editingId, {
          alasan: formData.alasan,
          tanggal_pemanggilan: new Date(formData.tanggal_pemanggilan),
          waktu_pertemuan: formData.jam_pemanggilan,
          tempat_pertemuan: formData.ruangan,
          ortu_notified: formData.ortu_notified,
        });
        toast.success('Surat pemanggilan berhasil diperbarui.');
      } else {
        await bpbkApi.createPemanggilan({
          siswa_id: formData.siswa_id,
          alasan: formData.alasan,
          tanggal_pemanggilan: new Date(formData.tanggal_pemanggilan),
          waktu_pertemuan: formData.jam_pemanggilan,
          tempat_pertemuan: formData.ruangan,
          ortu_notified: formData.ortu_notified,
        });
        toast.success('Surat pemanggilan berhasil dibuat.');
      }
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    } catch {
      toast.error(editingId ? 'Gagal memperbarui pemanggilan.' : 'Gagal membuat pemanggilan.');
    }
  }, [editingId, formData, queryClient, resetForm]);

  const handleOpenEdit = useCallback((item: PemanggilanOrangTua) => {
    setEditingId(item.id);
    setFormData({
      siswa_id: item.siswa_id,
      alasan: item.alasan,
      tanggal_pemanggilan: new Date(item.tanggal_pemanggilan).toISOString().split('T')[0],
      jam_pemanggilan: (item as any).waktu_pertemuan || '09:00 WIB',
      ruangan: (item as any).tempat_pertemuan || 'Ruang BK',
      ortu_notified: Boolean((item as any).ortu_notified ?? true),
    });
    setModalOpen(true);
  }, []);

  const handleSendToParent = useCallback(async (item: PemanggilanOrangTua, isResend = false) => {
    setSendingId(item.id);
    try {
      if (!isResend && item.status === 'BARU') {
        await bpbkApi.updatePemanggilan(item.id, {
          status: 'DIKIRIM',
          ortu_notified: true,
        });
      }
      try {
        await bpbkApi.sendWhatsappParent(item.id);
        toast.success(
          isResend
            ? 'Pengingat WhatsApp berhasil dikirim ulang ke Orang Tua.'
            : 'Panggilan diterbitkan & dikirim ke Orang Tua (App & WhatsApp).'
        );
      } catch {
        toast.success(
          isResend
            ? 'WA Gateway tidak aktif; notifikasi aplikasi tetap aktif.'
            : 'Status diubah ke DIKIRIM (notifikasi aplikasi aktif; WA Gateway belum terhubung).'
        );
      }
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    } catch {
      toast.error('Gagal memproses pengiriman panggilan.');
    } finally {
      setSendingId(null);
    }
  }, [queryClient]);

  const handleOpenOutcomeModal = useCallback((item: PemanggilanOrangTua) => {
    setOutcomeTarget(item);
    setOutcomeForm({
      status: item.status === 'TIDAK_HADIR' ? 'TIDAK_HADIR' : 'HADIR',
      tanggal_pertemuan: (item as any).tanggal_pertemuan
        ? new Date((item as any).tanggal_pertemuan).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      keterangan_pertemuan: item.keterangan_pertemuan || '',
    });
  }, []);

  const handleSaveOutcome = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeTarget) return;
    setSavingOutcome(true);
    try {
      await bpbkApi.updatePemanggilan(outcomeTarget.id, {
        status: outcomeForm.status,
        tanggal_pertemuan: new Date(outcomeForm.tanggal_pertemuan),
        keterangan_pertemuan: outcomeForm.keterangan_pertemuan.trim() || null,
      });
      toast.success(`Hasil pertemuan disimpan (${outcomeForm.status}).`);
      setOutcomeTarget(null);
      queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all });
    } catch {
      toast.error('Gagal menyimpan hasil pertemuan.');
    } finally {
      setSavingOutcome(false);
    }
  }, [outcomeTarget, outcomeForm, queryClient]);

  const handleReSummon = useCallback((item: PemanggilanOrangTua) => {
    setEditingId(null);
    setFormData({
      siswa_id: item.siswa_id,
      alasan: `Panggilan ulang: ${item.alasan}`,
      tanggal_pemanggilan: new Date().toISOString().split('T')[0],
      jam_pemanggilan: '09:00 WIB',
      ruangan: 'Ruang BK',
      ortu_notified: true,
    });
    setModalOpen(true);
  }, []);

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
      label: 'Tanggal & Jadwal',
      render: (value: string, item: PemanggilanOrangTua) => {
        const waktu = (item as any).waktu_pertemuan as string | undefined;
        const tempat = (item as any).tempat_pertemuan as string | undefined;
        return (
          <div className="space-y-0.5 whitespace-nowrap">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
              {formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {(waktu || tempat) && (
              <span className="text-[10px] font-medium text-slate-400 block">
                {[waktu, tempat].filter(Boolean).join(' • ')}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'siswa',
      label: 'Profil Siswa',
      render: (_, item: PemanggilanOrangTua) => (
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
      key: 'alasan',
      label: 'Alasan Pemanggilan',
      render: (value: string, item: PemanggilanOrangTua) => (
        <div className="space-y-1 max-w-xs">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug">{value}</p>
          {Boolean((item as any).ortu_notified) && (
            <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70">
              Notif App Ortu Aktif
            </span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge
          variant={value === 'HADIR' ? 'success' : value === 'TIDAK_HADIR' ? 'error' : 'warning'}
          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap"
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, item: PemanggilanOrangTua) => {
        const isBusy = sendingId === item.id;
        return (
          <div className="flex items-center gap-1 justify-end flex-wrap">
            {item.status === 'BARU' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => handleSendToParent(item, false)}
                  className="h-7 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                  title="Kirim Panggilan ke Orang Tua (App & WhatsApp)"
                >
                  <Send size={12} className="mr-1" /> {isBusy ? 'Mengirim...' : 'Kirim'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenEdit(item)}
                  className="w-7 h-7 text-indigo-600 hover:bg-indigo-50"
                  title="Edit Jadwal & Alasan"
                >
                  <Edit2 size={13} />
                </Button>
              </>
            )}

            {item.status === 'DIKIRIM' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenOutcomeModal(item)}
                  className="h-7 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                  title="Catat Kehadiran & Berita Acara Pertemuan"
                >
                  <CheckCircle2 size={12} className="mr-1" /> Catat Hasil
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isBusy}
                  onClick={() => handleSendToParent(item, true)}
                  className="w-7 h-7 text-amber-600 hover:bg-amber-50"
                  title="Kirim Ulang Pengingat WhatsApp"
                >
                  <MessageSquare size={13} />
                </Button>
              </>
            )}

            {(item.status === 'HADIR' || item.status === 'TIDAK_HADIR') && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenOutcomeModal(item)}
                  className="h-7 px-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                  title="Lihat / Edit Berita Acara Pertemuan"
                >
                  <FileText size={12} className="mr-1" /> Berita Acara
                </Button>
                {item.status === 'TIDAK_HADIR' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReSummon(item)}
                    className="h-7 px-2 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                    title="Buat Jadwal Panggilan Ulang"
                  >
                    <RotateCcw size={12} className="mr-1" /> Panggil Ulang
                  </Button>
                )}
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistorySiswaId(item.siswa_id)}
              className="h-7 px-2 text-[10px] font-bold text-slate-700 bg-slate-100/80 hover:bg-slate-200 rounded-lg"
              title="Lihat Riwayat & Rekam Jejak BP/BK Siswa"
            >
              <History size={12} className="mr-1" /> Riwayat
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteId(item.id)}
              className="w-7 h-7 text-rose-500 hover:bg-rose-50"
              title="Hapus"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        );
      }
    }
  ], [sendingId, handleSendToParent, handleOpenEdit, handleOpenOutcomeModal, handleReSummon]);

  const isMobile = useIsMobile();

  const renderMobileCard = useCallback((item: PemanggilanOrangTua) => {
    return (
      <PemanggilanCard
        key={item.id}
        item={item}
        isSending={sendingId === item.id}
        onViewDetail={(i) => setHistorySiswaId(i.siswa_id)}
        onEdit={(i) => handleOpenEdit(i)}
        onDelete={(id) => setDeleteId(id)}
        onSend={handleSendToParent}
        onRecordOutcome={handleOpenOutcomeModal}
        onReSummon={handleReSummon}
      />
    );
  }, [sendingId, handleOpenEdit, handleSendToParent, handleOpenOutcomeModal, handleReSummon]);

  const analytics = useMemo(() => {
    const baru = list.filter((i) => i.status === 'BARU').length;
    const dikirim = list.filter((i) => i.status === 'DIKIRIM').length;
    const hadir = list.filter((i) => i.status === 'HADIR').length;
    return {
      total: totalItems || list.length,
      baru,
      dikirim,
      hadir,
    };
  }, [list, totalItems]);

  return (
    <Card className="border border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 p-4 sm:p-6 rounded-2xl space-y-5">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Surat Pemanggilan Orang Tua / Wali
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Penerbitan surat panggilan resmi, notifikasi WA/App orang tua, dan berita acara pertemuan
          </p>
        </div>
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 font-bold rounded-xl shadow-md shrink-0 self-start md:self-auto"
        >
          <Plus size={14} />
          Buat Panggilan
        </Button>
      </div>

      {/* Analytics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Surat</span>
            <span className="text-xl font-black text-slate-800 dark:text-white font-mono">{analytics.total}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <MailOpen size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Baru / Draft</span>
            <span className="text-xl font-black text-slate-800 dark:text-white font-mono">{analytics.baru}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-600 flex items-center justify-center">
            <FileText size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Menunggu Hadir</span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">{analytics.dikirim}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
            <Clock size={15} />
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Hadir / Selesai</span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">{analytics.hadir}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={15} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

        <div className="w-full sm:w-48 min-w-0">
          <SearchableSelect
            id="bpbk-status-filter"
            aria-label="Filter status pemanggilan"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'Semua Status' },
              { value: 'BARU', label: 'Baru' },
              { value: 'DIKIRIM', label: 'Dikirim / Menunggu' },
              { value: 'HADIR', label: 'Hadir' },
              { value: 'TIDAK_HADIR', label: 'Tidak Hadir' },
            ]}
            placeholder="Status"
          />
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

      {/* Create / Edit Modal */}
      <Suspense fallback={null}>
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              resetForm();
            }}
            title={editingId ? 'Edit Surat Pemanggilan Orang Tua' : 'Buat Surat Pemanggilan Orang Tua'}
          >
            <form onSubmit={handleCreateOrUpdate} className="space-y-4 p-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Siswa</label>
                <Suspense fallback={<div className="h-10 bg-slate-100 rounded-xl" />}>
                  <SmartStudentPicker
                    value={formData.siswa_id}
                    onChange={(val) => setFormData(prev => ({ ...prev, siswa_id: val }))}
                    disabled={Boolean(editingId)}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <label htmlFor="panggilan-jam" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Waktu Pertemuan</label>
                  <Input
                    id="panggilan-jam"
                    aria-label="Waktu pertemuan"
                    placeholder="09:00 WIB"
                    value={formData.jam_pemanggilan}
                    onChange={(e) => setFormData(prev => ({ ...prev, jam_pemanggilan: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="panggilan-ruangan" className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tempat / Ruangan</label>
                  <Input
                    id="panggilan-ruangan"
                    aria-label="Tempat pertemuan"
                    placeholder="Ruang BK"
                    value={formData.ruangan}
                    onChange={(e) => setFormData(prev => ({ ...prev, ruangan: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ortu_notified}
                  onChange={(e) => setFormData(prev => ({ ...prev, ortu_notified: e.target.checked }))}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] font-semibold text-amber-900">
                  Kirim notifikasi ke aplikasi orang tua
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary">
                  {editingId ? 'Simpan Perubahan' : 'Simpan Panggilan'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Catat Hasil Pertemuan / Berita Acara */}
        {outcomeTarget && (
          <Modal
            isOpen={Boolean(outcomeTarget)}
            onClose={() => setOutcomeTarget(null)}
            title={`Berita Acara Pertemuan: ${outcomeTarget.Siswa?.nama_siswa || 'Siswa'}`}
          >
            <form onSubmit={handleSaveOutcome} className="space-y-4 p-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Alasan Pemanggilan
                </span>
                <p className="text-xs font-medium text-slate-700">{outcomeTarget.alasan}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kehadiran Orang Tua</label>
                  <select
                    value={outcomeForm.status}
                    onChange={(e) =>
                      setOutcomeForm((prev) => ({ ...prev, status: e.target.value as 'HADIR' | 'TIDAK_HADIR' }))
                    }
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                  >
                    <option value="HADIR">HADIR (Pertemuan Terlaksana)</option>
                    <option value="TIDAK_HADIR">TIDAK HADIR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pertemuan</label>
                  <Input
                    type="date"
                    value={outcomeForm.tanggal_pertemuan}
                    onChange={(e) => setOutcomeForm((prev) => ({ ...prev, tanggal_pertemuan: e.target.value }))}
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan / Berita Acara Pertemuan</label>
                <textarea
                  rows={4}
                  value={outcomeForm.keterangan_pertemuan}
                  onChange={(e) => setOutcomeForm((prev) => ({ ...prev, keterangan_pertemuan: e.target.value }))}
                  placeholder="Tuliskan ringkasan hasil pertemuan, kesepakatan orang tua/wali, atau alasan ketidakhadiran..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOutcomeTarget(null)}>
                  Batal
                </Button>
                <Button type="submit" variant="primary" disabled={savingOutcome}>
                  {savingOutcome ? 'Menyimpan...' : 'Simpan Hasil Pertemuan'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Riwayat & Rekam Jejak BP/BK Siswa */}
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
