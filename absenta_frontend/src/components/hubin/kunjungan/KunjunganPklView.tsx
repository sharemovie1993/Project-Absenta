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
import { KunjunganFeedItem } from './KunjunganFeedItem';
import { KunjunganTargetList } from './KunjunganTargetList';
import { useKunjunganData } from './useKunjunganData';
import type {
  UniversalKunjunganPklViewProps,
  KunjunganItemDetail,
  SiswaTargetItem,
} from './types';

// Lazy Loaded Modal Subsystems
const HubinPklKunjunganModal = lazy(() =>
  import('@/components/hubin/HubinPklKunjunganModal').then((m) => ({ default: m.HubinPklKunjunganModal }))
);
const KunjunganPrintModal = lazy(() =>
  import('./KunjunganPrintModal').then((m) => ({ default: m.KunjunganPrintModal }))
);

type ActiveViewMode = 'TARGET' | 'FEED';

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

  // 2. View Mode & Filter State
  const [activeViewMode, setActiveViewMode] = useState<ActiveViewMode>('TARGET');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMitraFilter, setSelectedMitraFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNVISITED' | 'VISITED'>('ALL');

  // Modal State for New/Edit Visit
  const [isKunjunganModalOpen, setIsKunjunganModalOpen] = useState(false);
  const [activeSelectedPkl, setActiveSelectedPkl] = useState<SiswaPkl | null>(null);
  const [editingKunjunganId, setEditingKunjunganId] = useState<string | undefined>(undefined);

  // Form State passed to HubinPklKunjunganModal
  const [visitLat, setVisitLat] = useState('');
  const [visitLng, setVisitLng] = useState('');
  const [visitFotoUrl, setVisitFotoUrl] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Print State (Universal Document Print Modal)
  const [printPkl, setPrintPkl] = useState<SiswaPkl | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 3. Query Siswa Penempatan PKL
  const { data: penempatanData, isLoading } = useQuery({
    queryKey: ['hubin-kunjungan-list', effectiveGuruId, effectiveTpId, effectiveJurusanId],
    queryFn: async () => {
      try {
        const res = await hubinApi.getPenempatan({
          pembimbing_id: effectiveGuruId,
          tahun_pelajaran_id: effectiveTpId,
          jurusan_id: effectiveJurusanId,
          limit: 100,
        });
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) return res.data as SiswaPkl[];
      } catch {
        /* Fallback */
      }
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

  // Filtered Feed List
  const filteredVisits = useMemo(() => {
    return allVisits.filter((v) => {
      const matchSearch =
        v.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.catatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.catatan_dudi && v.catatan_dudi.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMitra = selectedMitraFilter === 'ALL' || v.mitra_id === selectedMitraFilter;
      return matchSearch && matchMitra;
    });
  }, [allVisits, searchTerm, selectedMitraFilter]);

  // 5. Mutations
  const addVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hubinApi.addKunjungan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-kunjungan-list'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
      toast.success('Laporan kunjungan supervisi berhasil disimpan!');
      setIsKunjunganModalOpen(false);
      setActiveSelectedPkl(null);
      setEditingKunjunganId(undefined);
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
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
      setIsKunjunganModalOpen(false);
      setActiveSelectedPkl(null);
      setEditingKunjunganId(undefined);
      setVisitLat('');
      setVisitLng('');
      setVisitFotoUrl('');
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
    setActiveSelectedPkl(target.rawPkl);
    setEditingKunjunganId(undefined);
    setVisitLat('');
    setVisitLng('');
    setVisitFotoUrl('');
    setIsKunjunganModalOpen(true);
  }, []);

  const handleViewHistoryForSiswa = useCallback((target: SiswaTargetItem) => {
    setSearchTerm(target.nama_siswa);
    setActiveViewMode('FEED');
  }, []);

  const handlePrintForSiswa = useCallback((target: SiswaTargetItem) => {
    setPrintPkl(target.rawPkl);
    setIsPrintModalOpen(true);
  }, []);

  const handleEditVisit = useCallback((item: KunjunganItemDetail) => {
    const parentPkl = rawList.find((p) => p.id === item.penempatan_id);
    if (!parentPkl) {
      toast.error('Data penempatan siswa tidak ditemukan.');
      return;
    }
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

  const handlePrintVisit = useCallback((item: KunjunganItemDetail) => {
    const targetPkl = rawList.find((p) => p.id === item.penempatan_id);
    if (targetPkl) {
      setPrintPkl(targetPkl);
      setIsPrintModalOpen(true);
    }
  }, [rawList]);

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
              <Calendar className="text-indigo-600 dark:text-indigo-400" size={24} />
              Supervisi &amp; Kunjungan Industri DU/DI
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Peta monitoring target, checklist siswa bimbingan, geotagging GPS, dan dokumentasi supervisi berkala.
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

      {/* 4. Dual-View Mode Switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveViewMode('TARGET')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeViewMode === 'TARGET'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Target &amp; Siswa Bimbingan</span>
            {stats.unvisitedSiswaCount > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                {stats.unvisitedSiswaCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveViewMode('FEED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeViewMode === 'FEED'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History size={14} />
            <span>Riwayat Log Supervisi</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {allVisits.length}
            </span>
          </button>
        </div>

        {activeViewMode === 'TARGET' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['ALL', 'UNVISITED', 'VISITED'] as const).map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(st)}
                className="text-xs font-bold rounded-xl h-8 shrink-0"
              >
                {st === 'ALL' ? 'Semua Target' : st === 'UNVISITED' ? 'Belum Dikunjungi' : 'Sudah Dikunjungi'}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder={
                activeViewMode === 'TARGET'
                  ? 'Cari nama siswa, NIS, kelas, atau mitra DU/DI...'
                  : 'Cari catatan observasi, umpan balik DU/DI, nama siswa...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm rounded-xl h-10 w-full"
            />
          </div>

          {mitraFilterOptions.length > 0 && (
            <select
              value={selectedMitraFilter}
              onChange={(e) => setSelectedMitraFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 h-10 shrink-0 font-medium"
            >
              <option value="ALL">Semua Mitra Industri</option>
              {mitraFilterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 6. Body Content: TARGET vs FEED */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
          <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
          <p className="text-xs text-slate-400">Memuat data supervisi bimbingan...</p>
        </div>
      ) : activeViewMode === 'TARGET' ? (
        <KunjunganTargetList
          groups={filteredTargetGroups}
          readOnly={readOnly}
          onRecordVisit={handleRecordVisitForSiswa}
          onViewHistory={handleViewHistoryForSiswa}
          onPrint={handlePrintForSiswa}
        />
      ) : filteredVisits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Belum Ada Riwayat Kunjungan
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Beralihlah ke tab &apos;Target &amp; Siswa Bimbingan&apos; untuk mulai mencatat supervisi pertama Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map((item) => (
            <KunjunganFeedItem
              key={item.id}
              item={item}
              readOnly={readOnly}
              onEdit={handleEditVisit}
              onDelete={handleDeleteVisit}
              onPrint={handlePrintVisit}
            />
          ))}
        </div>
      )}

      {/* 7. Modal Form Catat / Edit Kunjungan (HubinPklKunjunganModal) */}
      {isKunjunganModalOpen && activeSelectedPkl && (
        <Suspense fallback={null}>
          <HubinPklKunjunganModal
            isOpen={isKunjunganModalOpen}
            onClose={() => {
              setIsKunjunganModalOpen(false);
              setActiveSelectedPkl(null);
              setEditingKunjunganId(undefined);
            }}
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
            onPrintMonitoring={(row) => {
              setPrintPkl(row);
              setIsPrintModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* 8. Universal Document Print Modal (True WYSIWYG, Kop Dinas Resmi & 2-Tier TTD) */}
      {isPrintModalOpen && printPkl && (
        <Suspense fallback={null}>
          <KunjunganPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => {
              setIsPrintModalOpen(false);
              setPrintPkl(null);
            }}
            selectedPkl={printPkl}
          />
        </Suspense>
      )}
    </div>
  );
});

KunjunganPklView.displayName = 'KunjunganPklView';
export default KunjunganPklView;
