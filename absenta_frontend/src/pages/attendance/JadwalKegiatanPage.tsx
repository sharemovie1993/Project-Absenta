import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  getJadwalKegiatan,
  createJadwalKegiatan,
  updateJadwalKegiatan,
  deleteJadwalKegiatan,
  type JadwalKegiatanItem,
} from '@/api/attendance/jadwalKegiatan.api';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
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

// ─── Constants ───────────────────────────────────────────────────────────────
const HARI_OPTION: { value: string; label: string }[] = [
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
  { value: 'MINGGU', label: 'Minggu' },
];

// ─── Types (Point #3: No any) ─────────────────────────────────────────────────
interface CardItem {
  id: string;
  nama: string;
  jenis_kegiatan: string;
  master: JenisKegiatanMaster | null;
  dbItem: JadwalKegiatanItem | null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function JadwalKegiatanPage() {
  // ── State ──
  const [items, setItems] = useState<JadwalKegiatanItem[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [masterKegiatans, setMasterKegiatans] = useState<JenisKegiatanMaster[]>([]);
  const [activeTahunPelajaranId, setActiveTahunPelajaranId] = useState<string>('');
  const [activeTahunPelajaranName, setActiveTahunPelajaranName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalKegiatanItem | null>(null);
  // Preset master name when opening 'Atur' from a card (not yet configured)
  const [presetMasterNama, setPresetMasterNama] = useState<string>('');

  // Point #7: useConfirm instead of window.confirm
  const { confirm } = useConfirm();

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resJadwal, resClasses, resMaster, activeTp] = await Promise.all([
        getJadwalKegiatan(),
        // Point #1: Safe fallback on error
        getKelasList(1, 100).catch(() => ({ data: [] as Kelas[] })),
        jenisKegiatanMasterApi.getAll({ limit: 100 }).catch(() => ({ data: [] as JenisKegiatanMaster[] })),
        getActiveTahunPelajaran().catch(() => null),
      ]);
      if (resJadwal.success) setItems(resJadwal.data ?? []);
      setClasses(resClasses.data ?? []);
      setMasterKegiatans(resMaster.data ?? []);
      if (activeTp) {
        setActiveTahunPelajaranId(activeTp.id);
        setActiveTahunPelajaranName(activeTp.tahun);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // ── Submit (from form modal) ──
  const handleFormSubmit = useCallback(async (formData: JadwalKegiatanFormData) => {
    const payload = {
      ...formData,
      waktu_selesai: formData.waktu_selesai ?? null,
      berlaku_sampai: formData.berlaku_sampai ?? null,
    };

    if (editingItem) {
      const res = await updateJadwalKegiatan(editingItem.id, payload);
      if (res.success) {
        toast.success('Jadwal Kegiatan berhasil diperbarui');
        handleCloseModal();
        fetchData();
      }
    } else {
      const res = await createJadwalKegiatan(payload);
      if (res.success) {
        toast.success('Jadwal Kegiatan berhasil dibuat');
        handleCloseModal();
        fetchData();
      }
    }
  }, [editingItem, handleCloseModal, fetchData]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string, nama: string) => {
    // Point #7: useConfirm dialog
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
        fetchData();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus data';
      toast.error(message);
    }
  }, [confirm, fetchData]);

  // ── Toggle Active ──
  const handleToggleActive = useCallback(async (item: JadwalKegiatanItem) => {
    try {
      const res = await updateJadwalKegiatan(item.id, { aktif: !item.aktif });
      if (res.success) {
        toast.success(`Jadwal ${!item.aktif ? 'diaktifkan' : 'dinonaktifkan'}`);
        fetchData();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengubah status';
      toast.error(message);
    }
  }, [fetchData]);

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

    const list: CardItem[] = filteredMasters.map(master => {
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
                        ? 'bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    {/* Time Block */}
                    <div className="flex items-center gap-4 min-w-[170px] md:border-r border-slate-100 dark:border-slate-750 pr-4 w-full md:w-auto mb-3 md:mb-0">
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
                              Mulai: {new Date(item?.berlaku_mulai ?? '').toLocaleDateString('id-ID', { dateStyle: 'short' })}
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
                              // Point #1: safe ?.map
                              ? (item?.hari ?? []).map(h => HARI_OPTION.find(opt => opt.value === h)?.label ?? h).join(', ')
                              : 'Hari: Belum diatur'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">
                            {isConfigured
                              ? (item?.target_semua_kelas ? 'Seluruh Kelas' : `${item?.target_kelas_ids?.length ?? 0} Kelas`)
                              : 'Target: Belum diatur'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-750">
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
}
