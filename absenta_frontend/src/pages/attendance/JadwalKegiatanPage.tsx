import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getJadwalKegiatan,
  createJadwalKegiatan,
  updateJadwalKegiatan,
  deleteJadwalKegiatan,
  type JadwalKegiatanItem,
} from '@/api/attendance/jadwalKegiatan.api';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
import { useJenisKegiatanMaster } from '@/hooks/academic/useJenisKegiatanMaster';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { getKelasList } from '@/api/academic/kelas.api';
import { getActiveTahunPelajaran } from '@/api/academic/tahunPelajaran.api';
import type { Kelas } from '@/types/academic';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/providers/ConfirmProvider';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Users,
  Info,
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button, SectionCard } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import type { JadwalKegiatanFormData } from './JadwalKegiatanFormModal';

// ─── Lazy-loaded heavy modal form (Point #6: Lazy + Suspense) ────────────────
const JadwalKegiatanFormModal = lazy(() => import('./JadwalKegiatanFormModal'));

import { HARI_LIST as HARI_OPTION } from '../../constants/day.constants';
import { getTimezone } from '../../utils/attendance/time';
import { useJadwalKegiatan } from '@/hooks/attendance/useJadwalKegiatan';

// ─── Types (Point #3: No any) ─────────────────────────────────────────────────
interface CardItem {
  id: string;
  nama: string;
  jenis_kegiatan: string;
  master: JenisKegiatanMaster | null;
  dbItem: JadwalKegiatanItem | null;
}

const formatDate = (date?: Date | string | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  try {
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: getTimezone() });
  } catch {
    return '-';
  }
};

const parseArrayField = (field: any): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return field.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export default React.memo(function JadwalKegiatanPage() {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalKegiatanItem | null>(null);
  const [presetMasterNama, setPresetMasterNama] = useState<string>('');

  // ── useQuery: Jadwal & Master Data ───────────────────────────────────────
  const { data: jadwalRes, isLoading: loadingJadwal, refetch: refetchJadwal } = useJadwalKegiatan();
  const { rawList: classes } = useKelasOptions();
  const { rawList: masterKegiatans } = useJenisKegiatanMaster();

  const { data: activeTp } = useQuery({
    queryKey: ['active-tahun-pelajaran'],
    queryFn: () => getActiveTahunPelajaran().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tpListRes } = useQuery({
    queryKey: ['tahun-pelajaran-list-fallback'],
    queryFn: () => getTahunPelajaranList(1, 50).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const items = useMemo(() => jadwalRes?.data ?? [], [jadwalRes]);
  const activeTpData = (activeTp as any)?.data || activeTp;
  const tpList = (tpListRes as any)?.data || [];
  const activeTpFromList = Array.isArray(tpList) ? (tpList.find((t: any) => t.is_active) || tpList[0]) : null;

  const activeTahunPelajaranId = activeTpData?.id || activeTpFromList?.id || '';
  const activeTahunPelajaranName = activeTpData?.tahun || activeTpFromList?.tahun || '';
  const loading = loadingJadwal;

  // ── Modal Handlers ──
  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setPresetMasterNama('');
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: JadwalKegiatanItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPresetMasterNama('');
  }, []);

  const invalidateAllJadwalKegiatanCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-list'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-builder'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-all-builder'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-pelajaran-grid'] });
    queryClient.invalidateQueries({ queryKey: ['jenis-kegiatan-master'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['kesiswaan-stats'] });
  }, [queryClient]);

  // ── Submit (from form modal) ──
  const handleFormSubmit = useCallback(async (formData: JadwalKegiatanFormData) => {
    const payload = {
      ...formData,
      hari: (formData.hari || []).map(h => h.toUpperCase()),
      waktu_selesai: formData.waktu_selesai && formData.waktu_selesai.trim() !== '' ? formData.waktu_selesai.trim() : null,
      berlaku_mulai: formData.berlaku_mulai ? formData.berlaku_mulai.trim().split('T')[0] : toLocalDate(),
      berlaku_sampai: formData.berlaku_sampai && formData.berlaku_sampai.trim() !== '' ? formData.berlaku_sampai.trim().split('T')[0] : null,
      tahun_pelajaran_id: (formData.tahun_pelajaran_id || activeTahunPelajaranId || '').trim(),
    };

    try {
      if (editingItem) {
        const res = await updateJadwalKegiatan(editingItem.id, payload);
        if (res.success) {
          toast.success('Jadwal Kegiatan berhasil diperbarui');
          handleCloseModal();
          invalidateAllJadwalKegiatanCaches();
          refetchJadwal();
        }
      } else {
        const res = await createJadwalKegiatan(payload);
        if (res.success) {
          toast.success('Jadwal Kegiatan berhasil dibuat');
          handleCloseModal();
          invalidateAllJadwalKegiatanCaches();
          refetchJadwal();
        }
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || err?.message || 'Gagal menyimpan jadwal kegiatan';
      toast.error(serverMsg);
    }
  }, [editingItem, activeTahunPelajaranId, handleCloseModal, invalidateAllJadwalKegiatanCaches, refetchJadwal]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string, nama: string) => {
    const confirmed = await confirm({
      title: 'Hapus Jadwal Kegiatan',
      description: `Apakah Anda yakin ingin menghapus jadwal "${nama}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await deleteJadwalKegiatan(id);
      if (res.success) {
        toast.success('Jadwal Kegiatan berhasil dihapus');
        invalidateAllJadwalKegiatanCaches();
        refetchJadwal();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus data';
      toast.error(message);
    }
  }, [confirm, invalidateAllJadwalKegiatanCaches, refetchJadwal]);

  // ── Toggle Active ──
  const handleToggleActive = useCallback(async (item: JadwalKegiatanItem) => {
    try {
      const res = await updateJadwalKegiatan(item.id, { aktif: !item.aktif });
      if (res.success) {
        toast.success(`Jadwal ${!item.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
        invalidateAllJadwalKegiatanCaches();
        refetchJadwal();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengubah status';
      toast.error(message);
    }
  }, [invalidateAllJadwalKegiatanCaches, refetchJadwal]);

  // ── Handle open create from master card (pre-fills kategori kegiatan) ──
  const handleOpenCreateFromMaster = useCallback((nama: string) => {
    setEditingItem(null);
    setPresetMasterNama(nama);
    setIsModalOpen(true);
  }, []);

  const handleToggleClick = useCallback(async (card: CardItem) => {
    if (card.dbItem) {
      await handleToggleActive(card.dbItem);
    } else {
      handleOpenCreateFromMaster(card.nama);
    }
  }, [handleToggleActive, handleOpenCreateFromMaster]);

  // ── Point #2: useMemo for card list computation ──
  const cards = useMemo<CardItem[]>(() => {
    const matchedDbIds = new Set<string>();
    const filteredMasters = (masterKegiatans ?? []).filter(m => m.nama !== 'KBM' && m.tipe !== 'KBM');

    const list: CardItem[] = filteredMasters?.map(master => {
      // Point #1: safe array access
      const dbItem = (items ?? []).find(item => item.nama?.toLowerCase() === master.nama?.toLowerCase()) ?? null;
      if (dbItem) matchedDbIds.add(dbItem.id);
      return {
        id: dbItem ? dbItem.id : `master-${master.id}`,
        nama: master.nama,
        jenis_kegiatan: master.tipe,
        master,
        dbItem,
      };
    });

    // Point #1: safe .forEach
    (items ?? []).forEach(item => {
      if (!matchedDbIds.has(item.id)) {
        list.push({
          id: item.id,
          nama: item.nama,
          jenis_kegiatan: item.jenis_kegiatan,
          master: null,
          dbItem: item,
        });
      }
    });

    return list.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [masterKegiatans, items]);

  // ── Layout config (memoized) ──
  const breadcrumbs = useMemo(() => [
    { label: 'Kesiswaan', path: '/attendance/dashboard' },
    { label: 'Jadwal Kegiatan Rutin' },
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Jadwal Kegiatan Rutin',
    description: (
      <div className="space-y-2">
        <p>Kelola jadwal pembiasaan ketarunaan, apel pagi, upacara, dan kegiatan ekstrakurikuler non-KBM secara otomatis.</p>
        <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-700/50 flex items-start gap-2 mt-2">
          <Info className="text-blue-500 mt-0.5 shrink-0 w-4 h-4" />
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            <strong>Sistem Auto-Session:</strong> Jadwal ini akan otomatis di-generate menjadi sesi kehadiran setiap hari sekolah pada pukul 01:00 dini hari.
          </p>
        </div>
      </div>
    ),
    items: [
      { text: "Klik 'Tambah Jadwal' untuk menambahkan jadwal kegiatan baru secara mandiri." },
      { text: "Klik 'Atur' pada kartu kegiatan master untuk mengaktifkan jadwal otomatis." },
      { text: "Gunakan toggle ON/OFF untuk menonaktifkan jadwal sementara tanpa menghapus." },
      { text: "Atur target kelas agar sesi kehadiran hanya dibuat untuk kelas yang relevan." },
    ],
  }), []);

  return (
    <AcademicPageLayout
      title="Jadwal Kegiatan Rutin"
      description="Kelola jadwal pembiasaan dan ekstrakurikuler non-KBM yang berjalan otomatis setiap hari"
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="attendance_jadwal_kegiatan"
      actions={
        <Button
          id="btn-tambah-jadwal"
          variant="primary"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Jadwal
        </Button>
      }
    >
      {/* Point #9: PremiumFeatureGate */}
      <PremiumFeatureGate
        isLocked={false}
        featureName="Jadwal Kegiatan Rutin"
        moduleName="KESISWAAN"
        description="Kelola jadwal kegiatan rutin pembiasaan dan eskul sekolah."
      >
        <SectionCard fullWidth className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size="lg" />
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 m-6">
              <Calendar className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Belum ada jadwal kegiatan</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto text-sm">
                Mulai tambahkan jadwal kegiatan rutin pembiasaan atau ekstrakurikuler pertama untuk sekolah Anda.
              </p>
            </div>
          ) : (
            // Point #2: list rendering from memoized cards
            <div className="flex flex-col gap-3 p-6">
              {/* Point #1: safe ?.map guard */}
              {cards?.map((card) => {
                const isConfigured = !!card.dbItem;
                const isActive = isConfigured && card.dbItem?.aktif;
                const item = card.dbItem;

                return (
                  <div
                    key={card.id}
                    className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${
                      !isConfigured
                        ? 'bg-slate-50/20 dark:bg-slate-900/10 border-dashed border-slate-300 dark:border-slate-800'
                        : isActive
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    {/* Time Block */}
                    <div className="flex items-center gap-4 min-w-[170px] md:border-r border-slate-100 dark:border-slate-800 pr-4 w-full md:w-auto mb-3 md:mb-0">
                      <div className={`p-2.5 rounded-xl ${!isConfigured ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'}`}>
                        <Clock size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${!isConfigured ? 'text-slate-400 italic' : 'text-slate-800 dark:text-slate-100'}`}>
                          {isConfigured ? `${item?.waktu_mulai} - ${item?.waktu_selesai ?? 'Selesai'}` : 'Belum diatur'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Jam Pelaksanaan</span>
                      </div>
                    </div>

                    {/* Activity Info */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between px-0 md:px-6 w-full gap-3 md:gap-4 mb-3 md:mb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase ${
                            !isConfigured
                              ? 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                              : card.jenis_kegiatan === 'ESKUL'
                              ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {card.jenis_kegiatan}
                          </span>
                          {isConfigured && (
                            <span className="text-[10px] text-slate-400 font-semibold font-mono">
                              Mulai: {formatDate(item?.berlaku_mulai ?? '')}
                            </span>
                          )}
                        </div>
                        <h3 className={`text-lg font-extrabold mt-1 leading-tight ${!isConfigured ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {card.nama}
                        </h3>
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">
                            {isConfigured
                              ? parseArrayField(item?.hari).map(h => HARI_OPTION.find(opt => opt.value === h)?.label ?? h).join(', ') || 'Hari: Belum diatur'
                              : 'Hari: Belum diatur'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">
                            {isConfigured
                              ? (item?.target_semua_kelas ? 'Seluruh Kelas' : `${parseArrayField(item?.target_kelas_ids).length} Kelas`)
                              : 'Target: Belum diatur'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-edit-jadwal-${card.id}`}
                          aria-label={isConfigured ? `Edit jadwal ${card.nama}` : `Atur jadwal ${card.nama}`}
                          onClick={() => isConfigured && item ? handleOpenEdit(item) : handleOpenCreateFromMaster(card.nama)}
                          className={`px-3 py-2 rounded-xl transition-all text-xs font-extrabold flex items-center gap-1.5 ${
                            !isConfigured
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                              : 'bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}
                        >
                          <Edit3 size={13} />
                          <span>{isConfigured ? 'Edit' : 'Atur'}</span>
                        </button>
                        {isConfigured && item && (
                          <button
                            id={`btn-hapus-jadwal-${card.id}`}
                            aria-label={`Hapus jadwal ${card.nama}`}
                            onClick={() => handleDelete(item.id, item.nama)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <button
                        id={`btn-toggle-jadwal-${card.id}`}
                        aria-label={`${isActive ? 'Nonaktifkan' : 'Aktifkan'} jadwal ${card.nama}`}
                        aria-pressed={!!isActive}
                        onClick={() => handleToggleClick(card)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                      >
                        {isActive
                          ? <ToggleRight size={32} className="text-indigo-600" />
                          : <ToggleLeft size={32} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </PremiumFeatureGate>

      {/* Point #6: Lazy + Suspense for heavy modal form */}
      {isModalOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 flex items-center gap-3 shadow-2xl">
              <Loader size="md" />
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Memuat form...</span>
            </div>
          </div>
        }>
          <JadwalKegiatanFormModal
            editingItem={editingItem}
            masterKegiatans={masterKegiatans}
            classes={classes}
            activeTahunPelajaranId={activeTahunPelajaranId}
            activeTahunPelajaranName={activeTahunPelajaranName}
            presetNama={presetMasterNama}
            onClose={handleCloseModal}
            onSubmit={handleFormSubmit}
          />
        </Suspense>
      )}
    </AcademicPageLayout>
  );
});
