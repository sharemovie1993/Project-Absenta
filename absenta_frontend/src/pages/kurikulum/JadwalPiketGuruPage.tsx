import { z } from 'zod';
import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, SectionCard, Button, SearchableSelect, Input } from '../../components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Users,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Bell
} from 'lucide-react';
import { piketGuruApi, JadwalPiketGuru, Hari } from '../../api/piketGuru.api';
import { getMyTenant } from '../../api/tenants.api';
import { useJenjang } from '../../hooks/useJenjang';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useGuruOptions } from '../../hooks/useGuruOptions';
import { useJurusanOptions } from '../../hooks/useJurusanOptions';
import { usePiketGuruOptions } from '../../hooks/usePiketGuruOptions';
import { HARI_LIST } from '../../constants/day.constants';

const SingleAssignModal = lazy(() => import('../../components/kurikulum/piket/SingleAssignModal'));
const BulkAssignModal = lazy(() => import('../../components/kurikulum/piket/BulkAssignModal'));
const PiketGridView = lazy(() => import('../../components/kurikulum/piket/PiketGridView'));
const PiketTableView = lazy(() => import('../../components/kurikulum/piket/PiketTableView'));
const PiketNotifModal = lazy(() => import('../../components/piket/PiketNotifModal').then(m => ({ default: m.PiketNotifModal })));

// Zod Filter Guard (Pilar 25)
const filterSchema = z.object({
  searchTerm: z.string().optional(),
  tpId: z.string().optional(),
  semId: z.string().optional()
});

export const JadwalPiketGuruPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isKurikulum, isKesiswaan, isAdmin, can } = useCapabilities();
  const currentGuruId = user?.guru_profile?.id;

  const isKurikulumAdmin = useMemo(() => {
    if (isAdmin) return true;
    return isKurikulum || isKesiswaan || can('curriculum.piket.schedules.manage') || can('attendance.schedules.manage') || can('curriculum.piket.schedules.view');
  }, [isAdmin, isKurikulum, isKesiswaan, can]);

  const { jenjang } = useJenjang();
  const isSmk = useMemo(() => ['SMK', 'MAK'].includes((jenjang || '').toUpperCase()), [jenjang]);

  const [activeHari, setActiveHari] = useState<Hari>('SENIN');
  const [piketFilterMode, setPiketFilterMode] = useState<'ALL' | 'MY_PIKET'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTpId, setSelectedTpId] = useState<string>('');
  const [selectedSemId, setSelectedSemId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Standardized Options Hooks (Pilar 31)
  const { rawList: tahunPelajaranList, activeYear: activeTp } = useTahunPelajaranOptions();
  const { rawList: semesterList, activeSemester: activeSem } = useSemesterOptions({ tahunPelajaranId: selectedTpId });
  const { rawList: guruList } = useGuruOptions({ jenisPtk: 'ALL' });
  const { rawList: jurusanList } = useJurusanOptions();

  useEffect(() => {
    if (activeTp && !selectedTpId) setSelectedTpId(activeTp.id);
  }, [activeTp, selectedTpId]);

  useEffect(() => {
    if (activeSem && !selectedSemId) setSelectedSemId(activeSem.id);
  }, [activeSem, selectedSemId]);

  const { list: schedules, isLoading: loading, refetch: fetchSchedules } = usePiketGuruOptions(
    selectedTpId && selectedSemId ? { tahun_pelajaran_id: selectedTpId, semester_id: selectedSemId } : undefined
  );

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    filterSchema.safeParse({ searchTerm, tpId: selectedTpId, semId: selectedSemId });
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
  }, [schedules, activeHari, isKurikulumAdmin, piketFilterMode, currentGuruId, searchTerm, selectedTpId, selectedSemId]);

  const handleOpenAdd = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: JadwalPiketGuru) => {
    setEditingItem(item);
    setIsModalOpen(true);
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

  const tpOptions = useMemo(() => {
    return (tahunPelajaranList ?? [])?.map(tp => ({ value: tp.id, label: `TP ${tp.tahun} ${tp.is_active ? '(Aktif)' : ''}` }));
  }, [tahunPelajaranList]);

  const semOptions = useMemo(() => {
    return (semesterList ?? [])?.map(sem => ({ value: sem.id, label: `${sem.nama_semester} ${sem.is_active ? '(Aktif)' : ''}` }));
  }, [semesterList]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title={isKurikulumAdmin ? "Penjadwalan & Pengelolaan Piket Guru" : "Jadwal Piket Guru & Penugasan Saya"}
        description={isKurikulumAdmin ? "Kelola alokasi penugasan guru piket harian per semester dan pos tugas sekolah." : "Lihat jadwal penugasan piket Anda dan daftar guru piket harian sekolah."}
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="kurikulum_jadwal_piket"
        topSlot={
          isKurikulumAdmin ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setIsNotifModalOpen(true)}
                className="flex items-center gap-1.5 font-bold rounded-xl text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <Bell className="w-3.5 h-3.5" />
                Pengingat Piket
              </Button>
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-1.5 font-bold rounded-xl"
              >
                <Users className="w-3.5 h-3.5" />
                Penugasan Massal
              </Button>
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Guru Piket
              </Button>
            </div>
          ) : null
        }
        instruction={{
          title: isKurikulumAdmin ? 'Panduan Pengelolaan Piket Guru' : 'Panduan Penugasan Piket Guru',
          description: isKurikulumAdmin ? 'Tentukan penugasan guru piket harian untuk menjaga kedisiplinan dan keamanan lingkungan sekolah.' : 'Informasi penugasan piket harian guru.',
          items: [
            { text: 'Pilih Tahun Pelajaran & Semester aktif sebagai konteks penugasan.' },
            { text: 'Klik tab Hari (Senin–Sabtu) untuk melihat daftar guru yang bertugas.' },
            { text: 'Gunakan tombol Tambah Guru Piket atau Penugasan Massal untuk mengalokasikan tugas.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Filter Bar */}
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-48">
                    <SearchableSelect
                      id="piket-tp-filter"
                      aria-label="Filter Tahun Pelajaran"
                      value={selectedTpId}
                      onValueChange={setSelectedTpId}
                      options={tpOptions}
                      placeholder="Pilih TP"
                    />
                  </div>
                  <div className="w-44">
                    <SearchableSelect
                      id="piket-sem-filter"
                      aria-label="Filter Semester"
                      value={selectedSemId}
                      onValueChange={setSelectedSemId}
                      options={semOptions}
                      placeholder="Pilih Semester"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewMode('GRID')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      <LayoutGrid size={13} />
                      <span className="hidden sm:inline">Kartu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('TABLE')}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        viewMode === 'TABLE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      <TableIcon size={13} />
                      <span className="hidden sm:inline">Tabel</span>
                    </button>
                  </div>

                  <Input
                    id="piket-search-guru"
                    aria-label="Cari guru piket"
                    placeholder="Cari guru piket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-44 text-xs rounded-xl"
                  />
                </div>
              </div>
            </Card>

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
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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

            {/* Content View */}
            {loading ? (
              <div className="text-center py-20 text-xs text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mx-auto mb-2" />
                Memuat jadwal piket guru...
              </div>
            ) : activeHariSchedules.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                Belum ada guru piket yang ditugaskan pada hari ini.
              </div>
            ) : viewMode === 'GRID' ? (
              <Suspense fallback={null}>
                <PiketGridView
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
        </SectionCard>

        {/* Lazy Loaded Modals */}
        <Suspense fallback={null}>
          {isModalOpen && (
            <SingleAssignModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
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
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default JadwalPiketGuruPage;
