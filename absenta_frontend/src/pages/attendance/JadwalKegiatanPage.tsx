import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  UserCheck,
  Shield,
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Button, SectionCard, TabSwitcher } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
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
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'PEMBIASAAN' | 'ESKUL'>('PEMBIASAAN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalKegiatanItem | null>(null);
  const [presetMasterNama, setPresetMasterNama] = useState<string | undefined>(undefined);

  // Konteks Akademik Terpusat
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const {
    values: { tahunPelajaranId: selectedTpId, semesterId: selectedSemId },
    handleTpChange: setSelectedTpId,
    setSemesterId: setSelectedSemId,
    tpOptions,
    semesterOptions,
    activeTpYear,
  } = academicFilter;

  const activeTahunPelajaranId = selectedTpId || activeTpYear?.id || '';
  const activeTahunPelajaranName = activeTpYear?.tahun || 'Tahun Ajaran Aktif';

  const { rawList: jadwalItems = [], isLoading: loadingJadwal } = useJadwalKegiatan();
  const { rawList: masterKegiatans = [], isLoading: loadingMasters } = useJenisKegiatanMaster();
  const { rawList: classes = [], isLoading: loadingClasses } = useKelasOptions();

  const invalidateJadwal = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-list'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan'] });
  }, [queryClient]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: JadwalKegiatanFormData) => createJadwalKegiatan({
      ...payload,
      hari: (payload.hari || [])?.map(h => h.toUpperCase()),
      tahun_pelajaran_id: activeTahunPelajaranId,
    }),
    onSuccess: () => {
      invalidateJadwal();
      toast.success('Jadwal kegiatan berhasil disimpan!');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan jadwal kegiatan.';
      toast.error(msg);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: JadwalKegiatanFormData }) => updateJadwalKegiatan(id, {
      ...payload,
      hari: (payload.hari || [])?.map(h => h.toUpperCase()),
      tahun_pelajaran_id: activeTahunPelajaranId,
    }),
    onSuccess: () => {
      invalidateJadwal();
      toast.success('Jadwal kegiatan berhasil diperbarui!');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal memperbarui jadwal kegiatan.';
      toast.error(msg);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJadwalKegiatan(id),
    onSuccess: () => {
      invalidateJadwal();
      toast.success('Jadwal kegiatan berhasil dihapus.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menghapus jadwal kegiatan.';
      toast.error(msg);
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
      invalidateJadwal();
      toast.success(`Jadwal "${item.nama}" berhasil ${nextAktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch {
      toast.error('Gagal mengubah status aktif jadwal.');
    }
  }, [handleOpenCreateFromMaster, invalidateJadwal]);

  const filteredMasters = useMemo(() => {
    const list = Array.isArray(masterKegiatans) ? masterKegiatans : [];
    return list.filter(m => {
      if (m.tipe === 'KBM') return false;
      return m.tipe === activeTab;
    });
  }, [masterKegiatans, activeTab]);

  const cards = useMemo<CardItem[]>(() => {
    const safeJadwal = Array.isArray(jadwalItems) ? jadwalItems : [];
    const safeFilteredMasters = Array.isArray(filteredMasters) ? filteredMasters : [];
    const allMasters = Array.isArray(masterKegiatans) ? masterKegiatans : [];

    const list: CardItem[] = safeFilteredMasters.map(master => {
      const match = safeJadwal.find(j => 
        j.jenis_kegiatan_id === master.id ||
        j.nama?.toLowerCase().trim() === master.nama.toLowerCase().trim() ||
        j.jenis_kegiatan?.toLowerCase().trim() === master.nama.toLowerCase().trim()
      );
      return {
        id: master.id,
        nama: master.nama,
        jenis_kegiatan: master.tipe,
        master,
        dbItem: match || null,
      };
    });

    safeJadwal.forEach(j => {
      const existsInList = list.some(item => 
        item.dbItem?.id === j.id ||
        (item.master && item.master.id === j.jenis_kegiatan_id) ||
        item.nama?.toLowerCase().trim() === j.nama?.toLowerCase().trim()
      );
      if (!existsInList) {
        const matchedMaster = allMasters.find(
          m => m.nama?.toLowerCase().trim() === j.jenis_kegiatan?.toLowerCase().trim() || m.id === j.jenis_kegiatan_id
        );
        const resolvedTab = matchedMaster?.tipe || j.jenis_kegiatan;
        if (resolvedTab === activeTab || (activeTab === 'PEMBIASAAN' && resolvedTab !== 'ESKUL')) {
          list.push({
            id: j.id,
            nama: j.nama,
            jenis_kegiatan: j.jenis_kegiatan,
            master: matchedMaster || null,
            dbItem: j,
          });
        }
      }
    });

    return list;
  }, [filteredMasters, masterKegiatans, jadwalItems, activeTab]);

  const loading = loadingJadwal || loadingMasters || loadingClasses;

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi', path: '/attendance' },
    { label: 'Jadwal Kegiatan & Eskul' }
  ], []);

  const tabOptions = useMemo(() => [
    { id: 'PEMBIASAAN', label: 'Pembiasaan Karakter' },
    { id: 'ESKUL', label: 'Ekstrakurikuler' },
  ], []);

  const formatTargetKelasSummary = useCallback((item: JadwalKegiatanItem | null | undefined, namaKegiatan: string) => {
    if (!item) return 'Target: Belum diatur';
    if (item.target_semua_kelas) {
      return 'Seluruh Kelas (Kelas X masuk Radar Ketarunaan)';
    }
    const targetIds = parseArrayField(item.target_kelas_ids);
    if (targetIds.length === 0) return '0 Kelas';
    const classList = Array.isArray(classes) ? classes : [];
    if (classList.length > 0) {
      const matched = classList.filter((c: any) => targetIds.includes(c.id));
      if (matched.length > 0) {
        const countX = matched.filter((c: any) => c.tingkat === 10 || String(c.nama || '').toUpperCase().startsWith('X ')).length;
        const countXI = matched.filter((c: any) => c.tingkat === 11 || String(c.nama || '').toUpperCase().startsWith('XI ')).length;
        const countXII = matched.filter((c: any) => c.tingkat === 12 || String(c.nama || '').toUpperCase().startsWith('XII ')).length;
        if (countX === matched.length) {
          return `Khusus Kelas X (${countX} Rombel Taruna — Apel + Makan Lapangan)`;
        }
        const parts: string[] = [];
        if (countX > 0) parts.push(`Kelas X: ${countX}`);
        if (countXI > 0) parts.push(`Kelas XI: ${countXI}`);
        if (countXII > 0) parts.push(`Kelas XII: ${countXII}`);
        if (parts.length > 0) {
          return `${targetIds.length} Kelas (${parts.join(', ')})`;
        }
      }
    }
    if (namaKegiatan.toLowerCase().includes('ketarunaan')) {
      return `Khusus Kelas X (${targetIds.length} Rombel Taruna)`;
    }
    return `${targetIds.length} Kelas`;
  }, [classes]);

  return (
    <AcademicPageLayout
      title="Jadwal Kegiatan & Eskul"
      description="Kelola jadwal jam pelaksanaan kegiatan rutin pembiasaan dan ekstrakurikuler sekolah."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="attendance_jadwal_kegiatan"
      topSlot={
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => navigate('/kesiswaan/pembina-upacara')}
            className="flex items-center gap-1.5 font-bold rounded-xl text-indigo-600 dark:text-indigo-400"
          >
            <UserCheck className="w-4 h-4" />
            Jadwal Pembina Upacara
          </Button>
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
          { text: "Klik Anggota & Pembina Eskul untuk memetakan siswa dan guru ke kegiatan." },
          { text: "Klik Jadwal Pembina Upacara untuk menyusun rotasi giliran pembina upacara Senin." }
        ]
      }}
    >
      <PremiumFeatureGate
        isLocked={false}
        featureName="Jadwal Kegiatan Rutin"
        moduleName="KESISWAAN"
        description="Kelola jadwal kegiatan rutin pembiasaan dan eskul sekolah."
      >
        <div className="mb-4">
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="compact"
          />
        </div>

        <SectionCard fullWidth className="p-0">
          <div className="p-6 pb-0">
            <TabSwitcher
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'PEMBIASAAN' | 'ESKUL')}
            />
          </div>

          {activeTab === 'PEMBIASAAN' && (
            <div className="mx-6 mt-5 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      Aturan Siklus Mingguan Pembiasaan &amp; Radar Perhitungan Ketarunaan (Senin – Sabtu)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Meskipun jadwal <strong>Ketarunaan</strong> diatur pada hari <strong>Selasa, Rabu, Kamis, Sabtu</strong>, sistem secara otomatis menggabungkan <strong>Upacara (Senin)</strong>, <strong>Dhuha (Jum&apos;at)</strong>, dan <strong>Apel Pulang (Senin–Sabtu)</strong> ke dalam <strong>Radar Perhitungan Ketarunaan khusus Kelas X (Peserta Taruna)</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                      1. Peserta Ketarunaan (Khusus Kelas X — 20 Rombel)
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Apel + Makan Pagi di Lapangan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mengikuti apel pagi penuh Senin–Sabtu (<strong>Senin: Upacara</strong>, <strong>Selasa–Kamis &amp; Sabtu: Apel Ketarunaan</strong>, <strong>Jum&apos;at: Pembiasaan Dhuha</strong>) yang dilanjutkan <strong>Makan Pagi Bersama di Lapangan</strong> sebelum masuk KBM, serta <strong>Apel Sore</strong>. Ke-4 agenda ini dihitung menyatu di Dashboard &amp; Ranking Ketarunaan.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">
                      2. Non-Ketarunaan (Kelas XI &amp; XII)
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Apel Langsung Masuk Kelas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mengikuti jadwal <strong>Upacara (Senin)</strong>, <strong>Dhuha (Jum&apos;at)</strong>, dan <strong>Apel Pulang</strong>. Setelah apel pagi selesai, siswa Kelas XI/XII <strong>langsung masuk ke ruang kelas untuk KBM</strong> (tidak ada sesi makan lapangan dan tidak dijadwalkan pada sesi Ketarunaan Selasa, Rabu, Kamis, Sabtu).
                  </p>
                </div>
              </div>
            </div>
          )}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase ${
                            !isConfigured
                              ? 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                              : card.jenis_kegiatan === 'ESKUL'
                              ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400'
                              : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {card.jenis_kegiatan}
                          </span>
                          {activeTab === 'PEMBIASAAN' && ['upacara', 'ketarunaan', 'duha', 'dhuha', 'apel'].some(k => card.nama.toLowerCase().includes(k)) && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                              {card.nama.toLowerCase().includes('ketarunaan')
                                ? 'Inti Ketarunaan Kelas X (Apel + Makan Lapangan)'
                                : 'Masuk Radar Siklus Ketarunaan (Kelas X)'}
                            </span>
                          )}
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

                      <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:min-w-[230px]">
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
                              ? formatTargetKelasSummary(item, card.nama)
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
