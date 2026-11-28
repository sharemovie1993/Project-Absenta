import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  createJadwalKegiatan,
  updateJadwalKegiatan,
  deleteJadwalKegiatan,
  type JadwalKegiatanItem,
} from '@/api/attendance/jadwalKegiatan.api';
import type { JenisKegiatanMaster } from '@/api/academic/jenisKegiatanMaster.api';
import { useJenisKegiatanMaster } from '@/hooks/academic/useJenisKegiatanMaster';
import { useKelasOptions } from '@/hooks/useKelasOptions';
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
  Layers,
  LayoutGrid,
  ListFilter,
  X,
} from 'lucide-react';
import { Button, SectionCard, TabSwitcher } from '@/components/ui';
import { Loader } from '@/components/ui/Loader';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import type { JadwalKegiatanFormData } from '@/components/attendance/kegiatan/JadwalKegiatanFormModal';
import { formatDate } from '@/utils/layoutUtils';
import { HARI_LIST as HARI_OPTION } from '@/constants/day.constants';
import { useJadwalKegiatan } from '@/hooks/attendance/useJadwalKegiatan';
import { KesiswaanJadwalBuilder } from './KesiswaanJadwalBuilder';
import { KegiatanWajibPolicyPanel } from './KegiatanWajibPolicyPanel';
import { cn } from '@/lib/utils';

// Lazy-loaded modal form
const JadwalKegiatanFormModal = lazy(() => import('@/components/attendance/kegiatan/JadwalKegiatanFormModal'));

export interface UniversalJadwalKegiatanViewProps {
  /** Injected academic scope from parent role dashboard */
  tahunPelajaranId?: string;
  semesterId?: string;
  /** True when embedded in a dashboard tab (hides duplicate page header / outer frame) */
  hideLayout?: boolean;
  /** True when opened in a quick modal dialog */
  isModal?: boolean;
  /** True for read-only view */
  readOnly?: boolean;
  onClose?: () => void;
  className?: string;
}

interface CardItem {
  id: string;
  nama: string;
  jenis_kegiatan: string;
  master: JenisKegiatanMaster | null;
  dbItems: JadwalKegiatanItem[];
  dbItem: JadwalKegiatanItem | null;
}

const parseArrayField = (field: unknown): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String) || [];
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed.map(String) || [];
    } catch {
      // fallback to comma-separated
    }
    return field.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
  }
  return [];
};

export const JadwalKegiatanView: React.FC<UniversalJadwalKegiatanViewProps> = React.memo(({
  tahunPelajaranId: propTpId,
  semesterId: propSemesterId,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
  className,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const [viewMode, setViewMode] = useState<'BUILDER' | 'LIST' | 'POLICY'>('BUILDER');
  const [activeTab, setActiveTab] = useState<'PEMBIASAAN' | 'ESKUL'>('PEMBIASAAN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalKegiatanItem | null>(null);
  const [editingItems, setEditingItems] = useState<JadwalKegiatanItem[]>([]);
  const [presetMasterNama, setPresetMasterNama] = useState<string | undefined>(undefined);
  const [presetDay, setPresetDay] = useState<string | undefined>(undefined);
  const [focusDay, setFocusDay] = useState<string | undefined>(undefined);

  // Fallback ke Platform-Wide Academic Filter jika tidak diinjeksi oleh parent
  const internalAcademic = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const effectiveTpId = propTpId || internalAcademic.values.tahunPelajaranId || internalAcademic.activeTpYear?.id || '';
  const effectiveTpName = internalAcademic.activeTpYear?.tahun || 'Tahun Ajaran Aktif';

  const { rawList: jadwalItems = [], isLoading: loadingJadwal } = useJadwalKegiatan();
  const { rawList: masterKegiatans = [], isLoading: loadingMasters } = useJenisKegiatanMaster();
  const { rawList: classes = [], isLoading: loadingClasses } = useKelasOptions();

  const invalidateJadwal = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-list'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan'] });
  }, [queryClient]);

  const handleOpenCreate = useCallback(() => {
    if (readOnly) return;
    setEditingItem(null);
    setEditingItems([]);
    setPresetMasterNama(undefined);
    setPresetDay(undefined);
    setFocusDay(undefined);
    setIsModalOpen(true);
  }, [readOnly]);

  const handleOpenCreateForDay = useCallback((day: string) => {
    if (readOnly) return;
    setEditingItem(null);
    setEditingItems([]);
    setPresetMasterNama(undefined);
    setPresetDay(day);
    setFocusDay(day ? day.toUpperCase() : undefined);
    setIsModalOpen(true);
  }, [readOnly]);

  const handleOpenCreateFromMaster = useCallback((masterNama: string) => {
    if (readOnly) return;
    setEditingItem(null);
    setEditingItems([]);
    setPresetMasterNama(masterNama);
    setPresetDay(undefined);
    setFocusDay(undefined);
    setIsModalOpen(true);
  }, [readOnly]);

  const handleOpenEdit = useCallback((primary: JadwalKegiatanItem, allItems: JadwalKegiatanItem[] = [], targetDay?: string) => {
    if (readOnly) return;
    setEditingItem(primary);
    setEditingItems(allItems.length > 0 ? allItems : [primary]);
    setPresetMasterNama(undefined);
    setPresetDay(undefined);
    setFocusDay(targetDay ? targetDay.toUpperCase() : undefined);
    setIsModalOpen(true);
  }, [readOnly]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setEditingItems([]);
    setPresetMasterNama(undefined);
    setPresetDay(undefined);
    setFocusDay(undefined);
  }, []);

  const handleFormSubmit = useCallback(async (payloads: JadwalKegiatanFormData[]) => {
    if (!payloads || payloads.length === 0) return;

    const existingItemsToUpdate = [...editingItems];

    try {
      for (let i = 0; i < payloads.length; i++) {
        const payload = payloads[i];
        if (i < existingItemsToUpdate.length) {
          await updateJadwalKegiatan(existingItemsToUpdate[i].id, {
            ...payload,
            hari: (payload.hari || []).map(h => h.toUpperCase()),
            tahun_pelajaran_id: effectiveTpId,
          });
        } else {
          await createJadwalKegiatan({
            ...payload,
            hari: (payload.hari || []).map(h => h.toUpperCase()),
            tahun_pelajaran_id: effectiveTpId,
          });
        }
      }

      if (existingItemsToUpdate.length > payloads.length) {
        for (let i = payloads.length; i < existingItemsToUpdate.length; i++) {
          await deleteJadwalKegiatan(existingItemsToUpdate[i].id);
        }
      }

      invalidateJadwal();
      toast.success(
        payloads.length > 1
          ? `Matrix jadwal kegiatan (${payloads.length} slot waktu) berhasil disimpan!`
          : 'Jadwal kegiatan berhasil disimpan!'
      );
      setIsModalOpen(false);
      setEditingItem(null);
      setEditingItems([]);
      setPresetDay(undefined);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan jadwal kegiatan.';
      toast.error(msg);
    }
  }, [editingItems, effectiveTpId, invalidateJadwal]);

  const handleDelete = useCallback(async (items: JadwalKegiatanItem[], nama: string) => {
    if (readOnly || !items || items.length === 0) return;
    const isMultiple = items.length > 1;
    const ok = await confirm({
      title: 'Hapus Jadwal Kegiatan?',
      description: isMultiple
        ? `Apakah Anda yakin ingin menghapus seluruh jadwal (${items.length} slot waktu matrix) untuk "${nama}"?`
        : `Apakah Anda yakin ingin menghapus jadwal untuk "${nama}"?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    if (ok) {
      try {
        await Promise.all(items.map(i => deleteJadwalKegiatan(i.id)));
        invalidateJadwal();
        toast.success(`Jadwal "${nama}" berhasil dihapus.`);
      } catch {
        toast.error('Gagal menghapus jadwal kegiatan.');
      }
    }
  }, [confirm, invalidateJadwal, readOnly]);

  const handleToggleClick = useCallback(async (card: CardItem) => {
    if (readOnly) return;
    if (!card.dbItems || card.dbItems.length === 0) {
      handleOpenCreateFromMaster(card.nama);
      return;
    }
    const anyActive = card.dbItems.some(i => i.aktif);
    const nextAktif = !anyActive;
    try {
      await Promise.all(card.dbItems.map(i => updateJadwalKegiatan(i.id, { aktif: nextAktif })));
      invalidateJadwal();
      toast.success(`Jadwal "${card.nama}" berhasil ${nextAktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch {
      toast.error('Gagal mengubah status aktif jadwal.');
    }
  }, [handleOpenCreateFromMaster, invalidateJadwal, readOnly]);

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
      const matches = safeJadwal.filter(j => 
        (j as any).jenis_kegiatan_id === master.id ||
        j.nama?.toLowerCase().trim() === master.nama.toLowerCase().trim() ||
        j.jenis_kegiatan?.toLowerCase().trim() === master.nama.toLowerCase().trim()
      );
      return {
        id: master.id,
        nama: master.nama,
        jenis_kegiatan: master.tipe,
        master,
        dbItems: matches,
        dbItem: matches[0] || null,
      };
    });

    const handledIds = new Set<string>();
    list.forEach(item => {
      item.dbItems.forEach(j => handledIds.add(j.id));
    });

    safeJadwal.forEach(j => {
      if (!handledIds.has(j.id)) {
        const sameNameGroup = safeJadwal.filter(other => 
          !handledIds.has(other.id) &&
          other.nama?.toLowerCase().trim() === j.nama?.toLowerCase().trim()
        );
        sameNameGroup.forEach(item => handledIds.add(item.id));

        const matchedMaster = allMasters.find(
          m => m.nama?.toLowerCase().trim() === j.jenis_kegiatan?.toLowerCase().trim() || m.id === (j as any).jenis_kegiatan_id
        );
        const resolvedTab = matchedMaster?.tipe || j.jenis_kegiatan;
        if (resolvedTab === activeTab || (activeTab === 'PEMBIASAAN' && resolvedTab !== 'ESKUL')) {
          list.push({
            id: j.id,
            nama: j.nama,
            jenis_kegiatan: j.jenis_kegiatan,
            master: matchedMaster || null,
            dbItems: sameNameGroup,
            dbItem: j,
          });
        }
      }
    });

    return list;
  }, [filteredMasters, masterKegiatans, jadwalItems, activeTab]);

  const loading = loadingJadwal || loadingMasters || loadingClasses;

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
    <div className={cn('space-y-4 w-full min-w-0', isModal && 'p-2 sm:p-4', className)}>
      {/* Action Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Jadwal Kegiatan &amp; Ekstrakurikuler</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pengaturan jadwal rutin pembiasaan, eskul, dan ketarunaan dalam format Jadwal Builder Mingguan &amp; Master.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('BUILDER')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                viewMode === 'BUILDER'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <LayoutGrid size={13} />
              <span>Jadwal Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                viewMode === 'LIST'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <ListFilter size={13} />
              <span>Daftar Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('POLICY')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                viewMode === 'POLICY'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Shield size={13} />
              <span>Aturan Presensi Guru</span>
            </button>
          </div>

          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => navigate('/kesiswaan/pembina-upacara')}
            className="flex items-center gap-1.5 font-bold rounded-xl text-indigo-600 dark:text-indigo-400 text-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Pembina Upacara</span>
          </Button>
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={() => navigate('/attendance/anggota-eskul')}
            className="flex items-center gap-1.5 font-bold rounded-xl text-xs"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Anggota Eskul</span>
          </Button>
          {!readOnly && (
            <Button
              id="btn-tambah-jadwal-view"
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-md text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jadwal</span>
            </Button>
          )}
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Academic Filter Toolbar (jika tidak dipasok dari luar) */}
      {!propTpId && (
        <div>
          <AcademicFilterToolbar
            {...internalAcademic.toolbarProps}
            variant="compact"
            readOnly={readOnly}
          />
        </div>
      )}

      {/* Main Content Area: BUILDER vs LIST vs POLICY */}
      {viewMode === 'POLICY' ? (
        <KegiatanWajibPolicyPanel readOnly={readOnly} />
      ) : viewMode === 'BUILDER' ? (
        <KesiswaanJadwalBuilder
          jadwalItems={jadwalItems}
          classes={classes}
          readOnly={readOnly}
          onEditItem={(item, targetDay) => {
            const allRelated = jadwalItems.filter(j => 
              j.id === item.id ||
              (j.nama && item.nama && j.nama.toLowerCase().trim() === item.nama.toLowerCase().trim())
            );
            handleOpenEdit(item, allRelated, targetDay);
          }}
          onDeleteItem={(id, nama) => handleDelete([{ id, nama } as any], nama)}
          onAddNewToDay={(day) => handleOpenCreateForDay(day)}
        />
      ) : (
        <SectionCard fullWidth className="p-0 border border-slate-200 dark:border-slate-800">
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
              {cards.map((card) => {
                const isConfigured = card.dbItems && card.dbItems.length > 0;
                const isActive = isConfigured && card.dbItems.some(i => i.aktif);
                const isMultiple = card.dbItems.length > 1;
                const primaryItem = card.dbItem;
                const allDays = Array.from(new Set(card.dbItems.flatMap(i => parseArrayField(i.hari))));

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
                    <div className="flex items-center gap-3.5 sm:min-w-[190px] md:border-r border-slate-100 dark:border-slate-800 pr-4 w-full md:w-auto mb-3 md:mb-0">
                      <div className={`p-2.5 rounded-xl ${!isConfigured ? 'bg-slate-100 text-slate-400' : isMultiple ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'}`}>
                        {isMultiple ? <Layers size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="flex flex-col">
                        {!isConfigured ? (
                          <span className="text-base font-bold text-slate-400 italic">Belum diatur</span>
                        ) : !isMultiple ? (
                          <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                            {primaryItem?.waktu_mulai} - {primaryItem?.waktu_selesai ?? 'Selesai'}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                Matrix ({card.dbItems.length} Slot)
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              {card.dbItems.map((slot, idx) => {
                                const daysStr = parseArrayField(slot.hari).map(h => HARI_OPTION.find(o => o.value === h)?.shortLabel || h).join(', ');
                                return (
                                  <div key={slot.id || idx} className="flex items-center gap-1 text-[10px]">
                                    <span className="text-slate-500 font-bold">{daysStr}:</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{slot.waktu_mulai}–{slot.waktu_selesai || 'Selesai'}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">Jam Pelaksanaan</span>
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
                          {isConfigured && primaryItem && (
                            <span className="text-[10px] text-slate-400 font-semibold font-mono">
                              Mulai: {formatDate(primaryItem.berlaku_mulai ?? '')}
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
                            {isConfigured && allDays.length > 0
                              ? allDays.map(h => HARI_OPTION.find(opt => opt.value === h)?.label ?? h).join(', ')
                              : 'Hari: Belum diatur'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">
                            {isConfigured
                              ? formatTargetKelasSummary(primaryItem, card.nama)
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
                          onClick={() => isConfigured && primaryItem ? handleOpenEdit(primaryItem, card.dbItems) : handleOpenCreateFromMaster(card.nama)}
                          className={`px-3 py-2 rounded-xl transition-all text-xs font-extrabold flex items-center gap-1.5 ${
                            !isConfigured
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                              : 'bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                          }`}
                        >
                          <Edit3 size={13} />
                          <span>{isConfigured ? 'Edit' : 'Atur'}</span>
                        </button>
                        {isConfigured && card.dbItems.length > 0 && !readOnly && (
                          <button
                            id={`btn-hapus-jadwal-${card.id}`}
                            type="button"
                            aria-label={`Hapus jadwal ${card.nama}`}
                            onClick={() => handleDelete(card.dbItems, card.nama)}
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
                        disabled={readOnly}
                        onClick={() => handleToggleClick(card)}
                        className={`p-2 rounded-xl transition-all ${
                          readOnly || !isConfigured
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : isActive
                            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <JadwalKegiatanFormModal
            editingItem={editingItem}
            editingItems={editingItems}
            masterKegiatans={masterKegiatans}
            classes={classes}
            activeTahunPelajaranId={effectiveTpId}
            activeTahunPelajaranName={effectiveTpName}
            presetNama={presetMasterNama}
            presetDay={presetDay}
            focusDay={focusDay}
            conflictReferenceKegiatan={jadwalItems.filter(j => j.jenis_kegiatan === 'PEMBIASAAN' || (j.nama && (j.nama.toLowerCase().includes('ketarunaan') || j.nama.toLowerCase().includes('upacara') || j.nama.toLowerCase().includes('apel') || j.nama.toLowerCase().includes('duha'))))}
            onClose={handleCloseModal}
            onSubmit={handleFormSubmit}
          />
        </Suspense>
      )}
    </div>
  );
});

export default JadwalKegiatanView;
