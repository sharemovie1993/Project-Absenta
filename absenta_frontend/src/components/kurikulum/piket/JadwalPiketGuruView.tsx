import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { SectionCard, Button } from '../../ui';
import { AcademicPageLayout } from '../../academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import ConfirmDialog from '../../ui/ConfirmDialog';
import {
  Plus,
  Users,
  Bell,
  Printer
} from 'lucide-react';
import { piketGuruApi, JadwalPiketGuru, Hari } from '../../../api/piketGuru.api';
import { useJenjang } from '../../../hooks/useJenjang';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { AcademicFilterToolbar, useAcademicFilter } from '../../common/academic-filter';
import { useGuruOptions } from '../../../hooks/useGuruOptions';
import { useJurusanOptions } from '../../../hooks/useJurusanOptions';
import { usePiketGuruOptions } from '../../../hooks/usePiketGuruOptions';
import { HARI_LIST } from '../../../constants/day.constants';
import { JadwalPiketPrintModal } from './JadwalPiketPrintModal';

const SingleAssignModal = lazy(() => import('./SingleAssignModal'));
const BulkAssignModal = lazy(() => import('./BulkAssignModal'));
const PiketTableView = lazy(() => import('./PiketTableView'));
const PiketNotifModal = lazy(() => import('../../piket/PiketNotifModal').then(m => ({ default: m.PiketNotifModal })));

export interface UniversalJadwalPiketGuruProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  propHari?: Hari;
  tahunPelajaranId?: string;
  semesterId?: string;
}

export const JadwalPiketGuruView: React.FC<UniversalJadwalPiketGuruProps> = React.memo(({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  propHari,
  tahunPelajaranId: propTpId,
  semesterId: propSemId,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isKurikulum, isKesiswaan, isAdmin, can } = useCapabilities();
  const currentGuruId = user?.guru_profile?.id;

  const isKurikulumAdmin = useMemo(() => {
    if (readOnly) return false;
    if (isAdmin) return true;
    return isKurikulum || isKesiswaan || can('curriculum.piket.schedules.manage') || can('attendance.schedules.manage') || can('curriculum.piket.schedules.view');
  }, [readOnly, isAdmin, isKurikulum, isKesiswaan, can]);

  const { jenjang } = useJenjang();
  const isSmk = useMemo(() => ['SMK', 'MAK'].includes((jenjang || '').toUpperCase()), [jenjang]);

  const [activeHari, setActiveHari] = useState<Hari>(propHari || 'SENIN');
  const [piketFilterMode] = useState<'ALL' | 'MY_PIKET'>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Konteks Akademik Terpusat
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableSearch: true,
    initialTpId: propTpId,
    initialSemesterId: propSemId,
  });

  const {
    values: { tahunPelajaranId: selectedTpId, semesterId: selectedSemId, searchQuery: searchTerm },
    tpOptions,
    semesterOptions,
  } = academicFilter;

  const effectiveTpId = propTpId || selectedTpId;
  const effectiveSemId = propSemId || selectedSemId;

  const selectedTpNama = useMemo(() => {
    return tpOptions.find(t => t.value === effectiveTpId)?.label || '2026/2027';
  }, [tpOptions, effectiveTpId]);

  const selectedSemNama = useMemo(() => {
    return semesterOptions.find(s => s.value === effectiveSemId)?.label || 'Ganjil';
  }, [semesterOptions, effectiveSemId]);

  const { rawList: guruList } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: jurusanList } = useJurusanOptions();

  const { list: schedules, isLoading: loading, refetch: fetchSchedules } = usePiketGuruOptions(
    effectiveTpId && effectiveSemId ? { tahun_pelajaran_id: effectiveTpId, semester_id: effectiveSemId } : undefined
  );

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPiketGuru | null>(null);

  // Confirm Delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const getSlotStartTime = useCallback((slot: number) => {
    return slot === 1 ? '06:30' : `0${slot + 6}:00`;
  }, []);

  const getSlotEndTime = useCallback((slot: number) => {
    return slot === 10 ? '15:30' : `0${slot + 7}:00`;
  }, []);

  // Filtered List for active tab
  const activeHariSchedules = useMemo(() => {
    let list = (schedules ?? []).filter(item => item.hari === activeHari);
    if (!isKurikulumAdmin && piketFilterMode === 'MY_PIKET' && currentGuruId) {
      list = list.filter(item => item.guru_id === currentGuruId);
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      item =>
        item.Guru?.nama_guru.toLowerCase().includes(term) ||
        item.Guru?.nip?.toLowerCase().includes(term) ||
        item.pos_piket?.toLowerCase().includes(term)
    );
  }, [schedules, activeHari, isKurikulumAdmin, piketFilterMode, currentGuruId, searchTerm]);

  const handleOpenAdd = useCallback(() => {
    setEditingItem(null);
    setIsAssignModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: JadwalPiketGuru) => {
    setEditingItem(item);
    setIsAssignModalOpen(true);
  }, []);

  const handleDeleteSchedule = useCallback(async () => {
    if (!itemToDelete) return;
    try {
      await piketGuruApi.delete(itemToDelete);
      toast.success('Penugasan piket guru berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['jadwal-piket-list'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus penugasan piket';
      toast.error(msg);
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, queryClient, fetchSchedules]);

  const breadcrumbs = useMemo(() => [
    { label: 'Kurikulum', path: '/kurikulum' },
    { label: 'Jadwal Piket Guru' }
  ], []);

  const content = (
    <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
      <div className="space-y-4">
        {/* Action Header / Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 font-bold rounded-xl text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 text-xs shadow-xs"
              title="Cetak Jadwal Piket Guru Resmi"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Jadwal Piket
            </Button>

            {isKurikulumAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNotifModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold rounded-xl text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Pengingat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold rounded-xl text-xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  Penugasan Massal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 font-bold rounded-xl shadow-xs text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Guru Piket
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar Terpadu (Hanya jika bukan mode tab tersemat) */}
        {!hideLayout && (
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            searchPlaceholder="Cari guru piket atau pos..."
            variant="card"
          />
        )}

        {/* Day Switcher */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          {HARI_LIST?.map(hari => {
            const count = (schedules ?? []).filter(s => s.hari === hari.id).length;
            const isActive = activeHari === hari.id;
            return (
              <button
                key={hari.id}
                onClick={() => setActiveHari(hari.id as Hari)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{hari.label}</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content View: Grouped Operational Table/List */}
        {loading ? (
          <div className="text-center py-20 text-xs text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
            Memuat jadwal piket guru...
          </div>
        ) : (
          <Suspense fallback={null}>
            <PiketTableView
              schedules={activeHariSchedules}
              currentGuruId={currentGuruId}
              isKurikulumAdmin={isKurikulumAdmin}
              onEdit={handleOpenEdit}
              onDelete={(id) => {
                setItemToDelete(id);
                setDeleteConfirmOpen(true);
              }}
            />
          </Suspense>
        )}
      </div>

      {/* Lazy Loaded Modals */}
      <Suspense fallback={null}>
        {isAssignModalOpen && (
          <SingleAssignModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            editingItem={editingItem}
            activeHari={activeHari}
            selectedTpId={selectedTpId}
            selectedSemId={selectedSemId}
            isSmk={isSmk}
            jurusanList={jurusanList}
            onSuccess={fetchSchedules}
            getSlotStartTime={getSlotStartTime}
            getSlotEndTime={getSlotEndTime}
          />
        )}

        {isBulkModalOpen && (
          <BulkAssignModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            activeHari={activeHari}
            selectedTpId={selectedTpId}
            selectedSemId={selectedSemId}
            guruList={guruList}
            onSuccess={fetchSchedules}
            getSlotStartTime={getSlotStartTime}
            getSlotEndTime={getSlotEndTime}
          />
        )}

        {isNotifModalOpen && (
          <PiketNotifModal
            isOpen={isNotifModalOpen}
            onClose={() => setIsNotifModalOpen(false)}
          />
        )}

        <JadwalPiketPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          schedules={schedules || []}
          tahunPelajaranNama={selectedTpNama}
          semesterNama={selectedSemNama}
        />

        {deleteConfirmOpen && (
          <ConfirmDialog
            isOpen={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            onConfirm={handleDeleteSchedule}
            title="Hapus Penugasan Guru Piket"
            message="Apakah Anda yakin ingin menghapus penugasan piket guru ini?"
            confirmText="Ya, Hapus"
            cancelText="Batal"
            variant="danger"
          />
        )}
      </Suspense>
    </SectionCard>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title={isKurikulumAdmin ? "Penjadwalan & Pengelolaan Piket Guru" : "Jadwal Piket Guru & Penugasan Saya"}
        description={isKurikulumAdmin ? "Kelola alokasi penugasan guru piket harian per semester dan pos tugas sekolah." : "Lihat jadwal penugasan piket Anda dan daftar guru piket harian sekolah."}
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="kurikulum_jadwal_piket"
        instruction={{
          title: isKurikulumAdmin ? 'Panduan Pengelolaan Piket Guru' : 'Panduan Penugasan Piket Guru',
          description: isKurikulumAdmin ? 'Tentukan penugasan guru piket harian untuk menjaga kedisiplinan dan keamanan lingkungan sekolah.' : 'Informasi penugasan piket harian guru.',
          items: [
            { text: 'Pilih Tahun Pelajaran & Semester aktif sebagai konteks penugasan.' },
            { text: 'Klik tab Hari (Senin–Sabtu) untuk melihat daftar guru yang bertugas.' },
            { text: 'Gunakan tombol Cetak Jadwal Piket untuk menerbitkan SK tugas piket resmi sekolah.' }
          ]
        }}
      >
        {content}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});
