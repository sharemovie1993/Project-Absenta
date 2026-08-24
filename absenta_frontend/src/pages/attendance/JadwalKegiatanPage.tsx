import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button, SectionCard, TabSwitcher } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import type { JadwalKegiatanFormData } from '@/components/attendance/kegiatan/JadwalKegiatanFormModal';
import { formatDate } from '@/utils/layoutUtils';

// Lazy-loaded heavy modal form
const JadwalKegiatanFormModal = lazy(() => import('@/components/attendance/kegiatan/JadwalKegiatanFormModal'));

import { HARI_LIST as HARI_OPTION } from '../../constants/day.constants';
import { useJadwalKegiatan } from '@/hooks/attendance/useJadwalKegiatan';

interface CardItem {
  id: string;
  nama: string;
  jenis_kegiatan: string;
  master: JenisKegiatanMaster | null;
  dbItem: JadwalKegiatanItem | null;
}

const parseArrayField = (field: unknown): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field?.map(String) || [];
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed?.map(String) || [];
    } catch {
      // not JSON, fallback to comma-separated
    }
    return field.split(',')?.map((s: string) => s.trim()).filter(Boolean) || [];
  }
  return [];
};

export default React.memo(function JadwalKegiatanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PEMBIASAAN' | 'ESKUL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalKegiatanItem | null>(null);
  const [presetMasterNama, setPresetMasterNama] = useState<string | undefined>(undefined);

  // Data Fetching
  const { data: activeTp, isLoading: loadingTp } = useQuery({
    queryKey: ['active-tahun-pelajaran'],
    queryFn: getActiveTahunPelajaran,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tpListRes } = useQuery({
    queryKey: ['tahun-pelajaran-list-active-check'],
    queryFn: () => getActiveTahunPelajaran(),
    staleTime: 10 * 60 * 1000,
  });

  const activeTpData = (activeTp as Record<string, unknown>)?.data || activeTp;
  const tpList = (tpListRes as Record<string, unknown>)?.data || [];
  const activeTpFromList = Array.isArray(tpList) ? (tpList.find((t: { is_active?: boolean }) => t.is_active) || tpList[0]) : null;
  const activeTahunPelajaranId = (activeTpData as { id?: string })?.id || activeTpFromList?.id || '';
  const activeTahunPelajaranName = (activeTpData as { tahun?: string })?.tahun || activeTpFromList?.tahun || 'Tahun Ajaran Aktif';

  const { data: jadwalItems = [], isLoading: loadingJadwal } = useJadwalKegiatan(activeTahunPelajaranId);
  const { data: masterKegiatans = [], isLoading: loadingMasters } = useJenisKegiatanMaster();
  const { data: classes = [], isLoading: loadingClasses } = useKelasOptions();

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: JadwalKegiatanFormData) => createJadwalKegiatan({
      ...payload,
      hari: (payload.hari || [])?.map(h => h.toUpperCase()),
      tahun_pelajaran_id: activeTahunPelajaranId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan', activeTahunPelajaranId] });
      toast.success('Jadwal kegiatan berhasil disimpan!');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menyimpan jadwal kegiatan.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JadwalKegiatanFormData }) => updateJadwalKegiatan(id, {
      ...payload,
      hari: (payload.hari || [])?.map(h => h.toUpperCase()),
      tahun_pelajaran_id: activeTahunPelajaranId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan', activeTahunPelajaranId] });
      toast.success('Jadwal kegiatan berhasil diperbarui!');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal memperbarui jadwal kegiatan.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJadwalKegiatan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan', activeTahunPelajaranId] });
      toast.success('Jadwal kegiatan berhasil dihapus.');
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menghapus jadwal kegiatan.');
    }
  });

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setPresetMasterNama(undefined);
    setIsModalOpen(true);
  }, []);

  const handleOpenCreateFromMaster = useCallback((masterNama: string) => {
    setEditingItem(null);
    setPresetMasterNama(masterNama);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: JadwalKegiatanItem) => {
    setEditingItem(item);
    setPresetMasterNama(undefined);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPresetMasterNama(undefined);
  }, []);

  const handleFormSubmit = useCallback(async (formData: JadwalKegiatanFormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, payload: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  }, [editingItem, updateMutation, createMutation]);

  const handleDelete = useCallback(async (id: string, nama: string) => {
    const ok = await confirm({
      title: 'Hapus Jadwal Kegiatan?',
      description: `Apakah Anda yakin ingin menghapus jadwal untuk "${nama}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      await deleteMutation.mutateAsync(id);
    }
  }, [confirm, deleteMutation]);

  const handleToggleClick = useCallback(async (card: CardItem) => {
    if (!card.dbItem) {
      handleOpenCreateFromMaster(card.nama);
      return;
    }
    const item = card.dbItem;
    const nextAktif = !item.aktif;
    try {
      await updateJadwalKegiatan(item.id, { aktif: nextAktif });
      queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan', activeTahunPelajaranId] });
      toast.success(`Jadwal "${item.nama}" berhasil ${nextAktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch {
      toast.error('Gagal mengubah status aktif jadwal.');
    }
  }, [handleOpenCreateFromMaster, queryClient, activeTahunPelajaranId]);

  const filteredMasters = useMemo(() => {
    return (masterKegiatans ?? []).filter(m => {
      if (m.tipe === 'KBM') return false;
      if (activeTab === 'ALL') return true;
      return m.tipe === activeTab;
    });
  }, [masterKegiatans, activeTab]);

  const cards = useMemo<CardItem[]>(() => {
    const list: CardItem[] = (filteredMasters ?? [])?.map(master => {
      const match = (jadwalItems ?? []).find(j => 
        j.jenis_kegiatan_id === master.id ||
        j.nama?.toLowerCase().trim() === master.nama.toLowerCase().trim()
      );
      return {
        id: master.id,
        nama: master.nama,
        jenis_kegiatan: master.tipe,
        master,
        dbItem: match || null,
      };
    });

    (jadwalItems ?? []).forEach(j => {
      const existsInList = list.some(item => 
        (item.master && item.master.id === j.jenis_kegiatan_id) ||
        item.nama?.toLowerCase().trim() === j.nama?.toLowerCase().trim()
      );
      if (!existsInList) {
        if (activeTab === 'ALL' || j.jenis_kegiatan === activeTab) {
          list.push({
            id: j.id,
            nama: j.nama,
            jenis_kegiatan: j.jenis_kegiatan,
            master: null,
            dbItem: j,
          });
        }
      }
    });

    return list;
  }, [filteredMasters, jadwalItems, activeTab]);

  const loading = loadingTp || loadingJadwal || loadingMasters || loadingClasses;

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi', path: '/attendance' },
    { label: 'Jadwal Kegiatan & Eskul' }
  ], []);

  const tabOptions = useMemo(() => [
    { id: 'ALL', label: 'Semua Kegiatan' },
    { id: 'PEMBIASAAN', label: 'Pembiasaan Karakter' },
    { id: 'ESKUL', label: 'Ekstrakurikuler' },
  ], []);

  return (
    <AcademicPageLayout
      title="Jadwal Kegiatan & Eskul"
      description="Kelola jadwal jam pelaksanaan kegiatan rutin pembiasaan dan ekstrakurikuler sekolah."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="attendance_jadwal_kegiatan"
      topSlot={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => navigate('/attendance/anggota-eskul')}
            className="flex items-center gap-1.5 font-bold rounded-xl"
          >
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Anggota & Pembina Eskul
          </Button>
          <Button
            id="btn-tambah-jadwal"
            variant="toolbarPrimary"
            size="toolbar"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal
          </Button>
        </div>
      }
      instruction={{
        title: "Panduan Jadwal Kegiatan",
        description: "Kelola jadwal jam pelaksanaan kegiatan rutin pembiasaan dan ekstrakurikuler sekolah.",
        items: [
          { text: "Atur waktu mulai dan selesai untuk masing-masing kegiatan pembiasaan/eskul." },
          { text: "Gunakan toggle status untuk mengaktifkan atau menonaktifkan jadwal." },
          { text: "Klik Anggota & Pembina Eskul untuk memetakan siswa dan guru ke kegiatan." }
        ]
      }}
    >
      <PremiumFeatureGate
        isLocked={false}
        featureName="Jadwal Kegiatan Rutin"
        moduleName="KESISWAAN"
        description="Kelola jadwal kegiatan rutin pembiasaan dan eskul sekolah."
      >
        <SectionCard fullWidth className="p-0">
          <div className="p-6 pb-0">
            <TabSwitcher
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'ALL' | 'PEMBIASAAN' | 'ESKUL')}
            />
          </div>
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
            <div className="flex flex-col gap-3 p-6 max-w-full overflow-x-auto">
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
                    <div className="flex items-center gap-4 sm:min-w-[170px] md:border-r border-slate-100 dark:border-slate-800 pr-4 w-full md:w-auto mb-3 md:mb-0">
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

                      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">
                            {isConfigured
                              ? (parseArrayField(item?.hari) ?? [])?.map(h => HARI_OPTION.find(opt => opt.value === h)?.label ?? h).join(', ') || 'Hari: Belum diatur'
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
                          type="button"
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
                            type="button"
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
                        type="button"
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

      {/* Lazy + Suspense for heavy modal form */}
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
