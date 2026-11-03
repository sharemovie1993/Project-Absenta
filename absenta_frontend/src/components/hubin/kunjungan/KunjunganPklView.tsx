import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Building2,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  History,
  AlertCircle,
  CheckCircle2,
  Printer,
  X,
} from 'lucide-react';
import { Button, Input, SectionCard, Badge } from '@/components/ui';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { hubinApi, type SiswaPkl } from '@/api/hubin.api';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { KunjunganStatsCards } from './KunjunganStatsCards';
import { KunjunganTargetList } from './KunjunganTargetList';
import { useKunjunganData } from './useKunjunganData';
import type { UniversalKunjunganPklViewProps, KunjunganItemDetail, SiswaTargetItem, MitraTargetGroup } from './types';

// Lazy Loaded Modal Subsystems
const HubinPklKunjunganModal = lazy(() => import('@/components/hubin/HubinPklKunjunganModal').then(m => ({ default: m.HubinPklKunjunganModal })));
const KunjunganPrintModal = lazy(() => import('./KunjunganPrintModal').then(m => ({ default: m.KunjunganPrintModal })));
const HubinPklKunjunganKolektifModal = lazy(() => import('./HubinPklKunjunganKolektifModal').then(m => ({ default: m.HubinPklKunjunganKolektifModal })));
const KunjunganMitraPrintModal = lazy(() => import('./KunjunganMitraPrintModal').then(m => ({ default: m.KunjunganMitraPrintModal })));
const KunjunganSiswaHistoryModal = lazy(() => import('./KunjunganSiswaHistoryModal').then(m => ({ default: m.KunjunganSiswaHistoryModal })));

export const KunjunganPklView: React.FC<UniversalKunjunganPklViewProps> = React.memo(({
  guruId: propGuruId,
  jurusanId: propJurusanId,
  tahunPelajaranId: propTpId,
  isModal = false,
  hideLayout = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  readOnly = false,
  className,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // 1. Integrated Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const effectiveGuruId = propGuruId || user?.guru_profile?.id || user?.id;
  const effectiveTpId = propTpId || academicFilter.activeTpYear?.id;
  const effectiveJurusanId = propJurusanId;

  // 2. Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMitraFilter, setSelectedMitraFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNVISITED' | 'VISITED'>('ALL');

  // Modal State for New/Edit Visit
  const [isKunjunganModalOpen, setIsKunjunganModalOpen] = useState(false);
  const [activeSelectedPkl, setActiveSelectedPkl] = useState<SiswaPkl | null>(null);
  const [editingKunjunganId, setEditingKunjunganId] = useState<string | undefined>(undefined);

  // Form & Modal States
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [printPkl, setPrintPkl] = useState<SiswaPkl | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedBulkGroup, setSelectedBulkGroup] = useState<MitraTargetGroup | null>(null);
  const [printMitraGroup, setPrintMitraGroup] = useState<MitraTargetGroup | null>(null);
  const [selectedHistoryTarget, setSelectedHistoryTarget] = useState<SiswaTargetItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const resetVisitForm = useCallback(() => {
    setIsKunjunganModalOpen(false);
    setActiveSelectedPkl(null);
    setEditingKunjunganId(undefined);
    setVisitLat('');
    setVisitLng('');
    setVisitFotoUrl('');
  }, []);

  // 3. Query Siswa Penempatan PKL
  const { data: penempatanData, isLoading } = useQuery({
    queryKey: ['hubin-kunjungan-list', effectiveGuruId, effectiveTpId, effectiveJurusanId],
    queryFn: async () => {
      const res = await hubinApi.getPenempatan({
        pembimbing_id: effectiveGuruId,
        tahun_pelajaran_id: effectiveTpId,
        jurusan_id: effectiveJurusanId,
        limit: 100,
      }).catch(() => null);
      if (Array.isArray(res?.data) && res.data.length > 0) return res.data as SiswaPkl[];
      const myRes = await hubinApi.getMyPenempatan().catch(() => ({ data: [] }));
      if (Array.isArray(myRes?.data) && myRes.data.length > 0) return myRes.data as SiswaPkl[];
      const allRes = await hubinApi.getPenempatan({ limit: 100 }).catch(() => ({ data: [] }));
      return (allRes?.data || []) as SiswaPkl[];
    },
  });

  const rawList: SiswaPkl[] = useMemo(() => {
    return Array.isArray(penempatanData) ? penempatanData : [];
  }, [penempatanData]);

  // 4. Extracted Business Logic & Computations Hook
  const { allVisits, targetGroups, stats, mitraFilterOptions } = useKunjunganData(rawList);

  // Filtered Target Groups
  const filteredTargetGroups = useMemo(() => {
    return targetGroups
      .filter((g) => {
        if (selectedMitraFilter !== 'ALL' && g.mitra_id !== selectedMitraFilter) return false;
        if (statusFilter === 'UNVISITED' && !g.hasUnvisited) return false;
        if (statusFilter === 'VISITED' && g.totalVisits === 0) return false;
        return true;
      })
      .map((g) => {
        const filteredSiswa = g.siswaList.filter((s) => {
          if (statusFilter === 'UNVISITED' && s.visitsCount > 0) return false;
          if (statusFilter === 'VISITED' && s.visitsCount === 0) return false;
          if (!searchTerm) return true;
          const q = searchTerm.toLowerCase();
          return (
            s.nama_siswa.toLowerCase().includes(q) ||
            s.nis.toLowerCase().includes(q) ||
            s.kelas.toLowerCase().includes(q) ||
            g.nama_mitra.toLowerCase().includes(q)
          );
        });
        return { ...g, siswaList: filteredSiswa };
      })
      .filter((g) => g.siswaList.length > 0);
  }, [targetGroups, selectedMitraFilter, statusFilter, searchTerm]);

  // 5. Mutations
  const addVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hubinApi.addKunjungan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Laporan kunjungan supervisi berhasil disimpan!');
      resetVisitForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan laporan kunjungan.');
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, kunjunganId, data }: { id: string; kunjunganId: string; data: any }) =>
      hubinApi.updateKunjungan(id, kunjunganId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Catatan kunjungan berhasil diperbarui!');
      resetVisitForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui kunjungan.');
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: ({ id, kunjunganId }: { id: string; kunjunganId: string }) =>
      hubinApi.deleteKunjungan(id, kunjunganId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Catatan kunjungan berhasil dihapus!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus kunjungan.');
    },
  });

  // 6. Handlers
  const handleRecordVisitForSiswa = useCallback((target: SiswaTargetItem) => {
    resetVisitForm();
    setActiveSelectedPkl(target.rawPkl);
    setIsKunjunganModalOpen(true);
  }, [resetVisitForm]);

  const handleViewHistoryForSiswa = useCallback((target: SiswaTargetItem) => {
    setSelectedHistoryTarget(target);
    setIsHistoryModalOpen(true);
  }, []);

  const targetVisits = useMemo(() => {
    if (!selectedHistoryTarget) return [];
    return allVisits.filter((v) => v.penempatan_id === selectedHistoryTarget.penempatan_id);
  }, [selectedHistoryTarget, allVisits]);

  const handlePrintForSiswa = useCallback((target: SiswaTargetItem) => {
    setPrintPkl(target.rawPkl);
    setIsPrintModalOpen(true);
  }, []);

  const handleEditVisit = useCallback((item: KunjunganItemDetail) => {
    const parentPkl = rawList.find((p) => p.id === item.penempatan_id);
    if (!parentPkl) return toast.error('Data penempatan siswa tidak ditemukan.');
    setActiveSelectedPkl(parentPkl);
    setEditingKunjunganId(item.rawKunjunganId);
    setVisitLat(item.latitude !== undefined ? String(item.latitude) : '');
    setVisitLng(item.longitude !== undefined ? String(item.longitude) : '');
    setVisitFotoUrl(item.foto_url || '');
    setIsKunjunganModalOpen(true);
  }, [rawList]);

  const handleDeleteVisit = useCallback((item: KunjunganItemDetail) => {
    if (!window.confirm(`Yakin ingin menghapus catatan kunjungan di ${item.nama_mitra}?`)) return;
    deleteVisitMutation.mutate({ id: item.penempatan_id, kunjunganId: item.rawKunjunganId });
  }, [deleteVisitMutation]);

  const handleKunjunganSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>, editId?: string) => {
      e.preventDefault();
      if (!activeSelectedPkl) return;

      const formData = new FormData(e.currentTarget);
      const payload = {
        tanggal: (formData.get('tanggal') as string) || new Date().toISOString(),
        catatan: (formData.get('catatan') as string) || '',
        catatan_dudi: (formData.get('catatan_dudi') as string) || undefined,
        foto_url: visitFotoUrl || undefined,
        latitude: visitLat ? parseFloat(visitLat) : undefined,
        longitude: visitLng ? parseFloat(visitLng) : undefined,
      };

      if (editId !== undefined) {
        updateVisitMutation.mutate({ id: activeSelectedPkl.id, kunjunganId: editId, data: payload });
      } else {
        addVisitMutation.mutate({ id: activeSelectedPkl.id, data: payload });
      }
    },
    [activeSelectedPkl, visitFotoUrl, visitLat, visitLng, addVisitMutation, updateVisitMutation]
  );

  return (
    <div className={cn('space-y-4 w-full min-w-0', isModal && 'p-2 sm:p-4', className)}>
      {/* 1. Header (Standalone / Modal Mode) */}
      {!hideLayout && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="text-teal-600 dark:text-teal-400" size={24} />
              Monitoring &amp; Kunjungan PKL
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Peta monitoring target, checklist siswa bimbingan, geotagging GPS, dan dokumentasi berkala.
            </p>
          </div>
          {isModal && onClose && (
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Tutup
            </Button>
          )}
        </div>
      )}

      {/* 2. Standar Academic Filter Toolbar */}
      {!hideScopeBanner && (
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          readOnly={readOnly}
        />
      )}

      {/* 3. Bento Metric Stats */}
      {!hideHeaderStats && <KunjunganStatsCards stats={stats} />}

      {/* 4. Streamlined Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Sisi Kiri: Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {(['ALL', 'UNVISITED', 'VISITED'] as const).map((st) => {
            const isActive = statusFilter === st;
            return (
              <Button
                key={st}
                size="sm"
                variant={isActive ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'text-xs font-bold rounded-xl h-9 shrink-0 px-3 cursor-pointer transition-all',
                  isActive
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs border-transparent'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <span>
                  {st === 'ALL'
                    ? 'Semua Target'
                    : st === 'UNVISITED'
                    ? 'Belum Dikunjungi'
                    : 'Sudah Dikunjungi'}
                </span>
                {st === 'UNVISITED' && stats.unvisitedSiswaCount > 0 && (
                  <span
                    className={cn(
                      'ml-1.5 text-[10px] font-black px-1.5 py-0.2 rounded-full',
                      isActive
                        ? 'bg-white text-rose-600'
                        : 'bg-rose-500 text-white'
                    )}
                  >
                    {stats.unvisitedSiswaCount}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Sisi Kanan: Search & Mitra Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:justify-end min-w-0">
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
            <Input
              type="text"
              placeholder="Cari nama siswa, NIS, kelas, atau mitra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 text-xs sm:text-sm rounded-xl h-9 w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Hapus filter pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {mitraFilterOptions.length > 0 && (
            <select
              value={selectedMitraFilter}
              onChange={(e) => setSelectedMitraFilter(e.target.value)}
              className="px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 h-9 shrink-0 font-medium cursor-pointer"
            >
              <option value="ALL">Semua Mitra Industri</option>
              {mitraFilterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          )}

          {(searchTerm || selectedMitraFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedMitraFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="h-9 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl shrink-0 gap-1 cursor-pointer"
              title="Reset seluruh filter"
            >
              <X size={13} />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* 5. Target List Workspace */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="animate-spin w-8 h-8 mx-auto text-teal-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
          <p className="text-xs text-slate-400 font-medium">Memuat data target supervisi bimbingan...</p>
        </div>
      ) : (
        <KunjunganTargetList
          groups={filteredTargetGroups}
          readOnly={readOnly}
          onRecordVisit={handleRecordVisitForSiswa}
          onViewHistory={handleViewHistoryForSiswa}
          onPrint={handlePrintForSiswa}
          onBulkRecordVisit={(group) => setSelectedBulkGroup(group)}
          onPrintMitraGroup={(group) => setPrintMitraGroup(group)}
        />
      )}

      {/* 7. Modal Form Catat / Edit Kunjungan (HubinPklKunjunganModal) */}
      {isKunjunganModalOpen && activeSelectedPkl && (
        <Suspense fallback={null}>
          <HubinPklKunjunganModal
            isOpen={isKunjunganModalOpen}
            onClose={resetVisitForm}
            selectedPkl={activeSelectedPkl as any}
            selectedKunjunganList={(activeSelectedPkl.kunjungan_json as any) || []}
            handleKunjunganSubmit={handleKunjunganSubmit}
            onDeleteKunjungan={(kId) => {
              if (activeSelectedPkl) {
                deleteVisitMutation.mutate({ id: activeSelectedPkl.id, kunjunganId: kId });
              }
            }}
            isPending={addVisitMutation.isPending || updateVisitMutation.isPending || deleteVisitMutation.isPending}
            isDetectingGps={isDetectingGps}
            setIsDetectingGps={setIsDetectingGps}
            visitLat={visitLat}
            setVisitLat={setVisitLat}
            visitLng={visitLng}
            setVisitLng={setVisitLng}
            visitFotoUrl={visitFotoUrl}
            setVisitFotoUrl={setVisitFotoUrl}
            onPrintMonitoring={(row) => { setPrintPkl(row); setIsPrintModalOpen(true); }}
          />
        </Suspense>
      )}

      {/* 8. Universal Document Print Modal (True WYSIWYG, Kop Dinas Resmi & 2-Tier TTD) */}
      {isPrintModalOpen && printPkl && (
        <Suspense fallback={null}>
          <KunjunganPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => { setIsPrintModalOpen(false); setPrintPkl(null); }}
            selectedPkl={printPkl}
          />
        </Suspense>
      )}

      {/* 9. Modal Kunjungan Kolektif Berbasis Mitra DU/DI */}
      {selectedBulkGroup && (
        <Suspense fallback={null}>
          <HubinPklKunjunganKolektifModal
            isOpen={Boolean(selectedBulkGroup)}
            onClose={() => setSelectedBulkGroup(null)}
            group={selectedBulkGroup}
            onSuccess={() => {
              ['hubin-kunjungan-list', 'penempatan-pkl', 'hubin-penempatan-pembimbing'].forEach((k) =>
                queryClient.invalidateQueries({ queryKey: [k] })
              );
            }}
          />
        </Suspense>
      )}

      {/* 10. Modal Cetak Berita Acara Supervisi Kolektif Mitra DU/DI */}
      {printMitraGroup && (
        <Suspense fallback={null}>
          <KunjunganMitraPrintModal
            isOpen={Boolean(printMitraGroup)}
            onClose={() => setPrintMitraGroup(null)}
            group={printMitraGroup}
          />
        </Suspense>
      )}

      {/* 11. Modal Riwayat Supervisi Siswa (Dialog Responsif Desktop & Mobile) */}
      {isHistoryModalOpen && selectedHistoryTarget && (
        <Suspense fallback={null}>
          <KunjunganSiswaHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => {
              setIsHistoryModalOpen(false);
              setSelectedHistoryTarget(null);
            }}
            target={selectedHistoryTarget}
            visits={targetVisits}
            readOnly={readOnly}
            onRecordVisit={handleRecordVisitForSiswa}
            onEditVisit={handleEditVisit}
            onDeleteVisit={handleDeleteVisit}
            onPrint={handlePrintForSiswa}
          />
        </Suspense>
      )}
    </div>
  );
});

KunjunganPklView.displayName = 'KunjunganPklView';
export default KunjunganPklView;
