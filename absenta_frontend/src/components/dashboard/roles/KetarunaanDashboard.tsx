import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Medal,
  Shield,
  Users,
  BarChart2,
  Lock,
  LayoutList,
  FileText,
  Activity,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionCard } from '@/components/ui/SectionCard';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import {
  UniversalEcosystemTopbar,
  UniversalMobileSubtabSidebar,
  useMobileSubtabSidebar,
} from './common';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import {
  getKetarunaanGuardStatus,
  getKetarunaanStats,
  getKetarunaanSesiHariIni,
} from '@/api/kesiswaan/programKetarunaan.api';

// Tab utama above-the-fold static import, sub-tab lainnya React.lazy (Zero Network Leak & Keep-Alive)
import { KetarunaanPenilaianTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanPenilaianTab';
import {
  KetarunaanWorkdeskFlightDeck,
} from '@/components/kesiswaan/program-ketarunaan/KetarunaanWorkdeskFlightDeck';

const KetarunaanKepanitiaanTab = lazy(() =>
  import('@/components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab').then((m) => ({
    default: m.KetarunaanKepanitiaanTab,
  }))
);
const KetarunaanStatistikTab = lazy(() =>
  import('@/components/kesiswaan/program-ketarunaan/KetarunaanStatistikTab').then((m) => ({
    default: m.KetarunaanStatistikTab,
  }))
);
const KetarunaanLaporanTimTab = lazy(() =>
  import('@/components/kesiswaan/program-ketarunaan/KetarunaanLaporanTimTab').then((m) => ({
    default: m.KetarunaanLaporanTimTab,
  }))
);
const KetarunaanLaporanKelasTab = lazy(() =>
  import('@/components/kesiswaan/program-ketarunaan/KetarunaanLaporanKelasTab').then((m) => ({
    default: m.KetarunaanLaporanKelasTab,
  }))
);
const AttendanceStagingModal = lazy(() =>
  import('@/components/attendance/staging/AttendanceStagingModal').then((m) => ({
    default: m.AttendanceStagingModal,
  }))
);

const HARI_LABEL: Record<string, string> = {
  SENIN: 'Senin',
  SELASA: 'Selasa',
  RABU: 'Rabu',
  KAMIS: 'Kamis',
  JUMAT: "Jum'at",
  SABTU: 'Sabtu',
  AHAD: 'Ahad',
  MINGGU: 'Minggu',
};

export type KetarunaanSubtabId = 'penilaian' | 'statistik' | 'laporan_kelas' | 'laporan_tim' | 'kepanitiaan';

export interface KetarunaanDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KetarunaanDashboard: React.FC<KetarunaanDashboardProps> = React.memo(() => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KetarunaanSubtabId | null;

  const validTabs: KetarunaanSubtabId[] = ['penilaian', 'statistik', 'laporan_kelas', 'laporan_tim', 'kepanitiaan'];

  const [activeTab, setActiveTab] = useState<KetarunaanSubtabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'penilaian';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka (0ms Instant Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<KetarunaanSubtabId>>(
    () => new Set([activeTab])
  );

  // Mobile Filter Collapsible State & Mobile Subtab Sidebar
  const queryClient = useQueryClient();
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('ketarunaan');

  // Synchronize Tab with URL
  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam) && subtabParam !== activeTab) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam, activeTab]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const validId = tabId as KetarunaanSubtabId;
      setActiveTab(validId);
      setVisitedTabs((prev) => (prev.has(validId) ? prev : new Set(prev).add(validId)));
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'ketarunaan');
          next.set('subtab', validId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Konteks Akademik Terpadu
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableKelas: true,
  });

  const selectedTpId = academicFilter.values.tahunPelajaranId;
  const selectedSemId = academicFilter.values.semesterId;

  // 1. Guard Status
  const { data: guard, isLoading: isGuardLoading, refetch: refetchGuard } = useQuery({
    queryKey: ['ketarunaan-guard'],
    queryFn: getKetarunaanGuardStatus,
    staleTime: 60 * 1000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id;

  // 2. Sesi Hari Ini
  const { data: sesiData, isLoading: isSesiLoading, refetch: refetchSesi } = useQuery({
    queryKey: ['ketarunaan-sesi-hari-ini', jadwalKegiatanId],
    queryFn: () =>
      getKetarunaanSesiHariIni({
        jadwal_kegiatan_id: jadwalKegiatanId,
        tanggal: new Date().toISOString().slice(0, 10),
      }),
    enabled: Boolean(guard?.is_active && jadwalKegiatanId),
    staleTime: 30 * 1000,
  });

  const sesiId = sesiData?.data?.id ?? (sesiData as any)?.sesi?.id ?? null;

  // 3. Stats Agregat
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ketarunaan-stats', jadwalKegiatanId, selectedTpId, selectedSemId],
    queryFn: () =>
      getKetarunaanStats({
        jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
        tahun_pelajaran_id: selectedTpId || undefined,
        semester_id: selectedSemId || undefined,
      }),
    enabled: Boolean(guard?.is_active),
    staleTime: 60 * 1000,
  });

  const stats = statsData?.data ?? (statsData as any);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchGuard(), refetchSesi(), refetchStats()]);
    setIsRefreshing(false);
  };

  const hariAktifLabel = useMemo(() => {
    const list =
      guard?.is_today_scheduled_day && guard?.jadwal_hari_spesifik?.length
        ? guard.jadwal_hari_spesifik
        : guard?.hari_aktif || (guard as any)?.jadwal_hari || [];
    if (!list.length) return null;
    return list.map((h: string) => HARI_LABEL[h] || h).join(', ');
  }, [guard]);

  // Shopee-Grade Mobile Hub Bento Cells (Strictly Max 2 Lines, Hairline 1px Dividers)
  const bentoCells: HubBentoCell[] = useMemo(() => {
    const ringkasan = stats?.ringkasan_periode;
    const summaryTerkini = stats?.latest;
    const hasPastSession = Boolean(stats?.trend && stats.trend.length > 0);
    const loading = isStatsLoading || isGuardLoading;

    const hadirValue = loading
      ? '...'
      : ringkasan && ringkasan.total_sesi > 0
      ? `${ringkasan.avg_persen_siswa}%`
      : hasPastSession && summaryTerkini
      ? `${summaryTerkini.persen_hadir_siswa}%`
      : guard?.is_active
      ? 'Siaga'
      : '—';

    const pembinaValue = loading
      ? '...'
      : ringkasan && ringkasan.total_sesi > 0
      ? `${ringkasan.avg_persen_guru}%`
      : hasPastSession && summaryTerkini
      ? `${summaryTerkini.persen_hadir_pendamping}%`
      : guard?.is_active
      ? 'Siaga'
      : '—';

    return [
      {
        id: 'hadirTaruna',
        title: 'Rata-rata Hadir Taruna',
        value: hadirValue,
        icon: Users,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
        onClick: () => handleTabChange('laporan_kelas'),
      },
      {
        id: 'kepatuhanPembina',
        title: 'Kepatuhan Pembina',
        value: pembinaValue,
        icon: Shield,
        iconColorClass: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
        onClick: () => handleTabChange('laporan_tim'),
      },
      {
        id: 'statusProgram',
        title: 'Status Program',
        value: loading ? '...' : guard?.is_active ? 'Aktif' : 'Nonaktif',
        icon: Medal,
        iconColorClass: guard?.is_active
          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
          : 'text-slate-500 bg-slate-100 dark:bg-slate-800',
        onClick: () => handleTabChange('kepanitiaan'),
      },
      {
        id: 'totalPertemuan',
        title: 'Total Pertemuan',
        value: loading ? '...' : `${stats?.trend?.length ?? 0} Sesi`,
        icon: BarChart2,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => handleTabChange('statistik'),
      },
    ];
  }, [stats, guard, isStatsLoading, isGuardLoading, handleTabChange]);

  const navTabs = useMemo(
    () => [
      { id: 'kepanitiaan', label: 'Pos & Presensi', shortLabel: 'Presensi', icon: Users },
      { id: 'laporan_kelas', label: 'Rekap Rombel', shortLabel: 'Rombel', icon: LayoutList },
      { id: 'laporan_tim', label: 'Pembina & Walas', shortLabel: 'Pembina', icon: FileText },
      { id: 'penilaian', label: 'Nilai & Sertifikat', shortLabel: 'Penilaian', icon: Medal },
      { id: 'statistik', label: 'Monitoring & Tren', shortLabel: 'Monitoring', icon: Activity },
    ],
    []
  );

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'kepanitiaan':
        return 'Pos & Presensi Ketarunaan';
      case 'laporan_kelas':
        return 'Rekap Kehadiran Rombel';
      case 'laporan_tim':
        return 'Audit Pembina & Walas';
      case 'penilaian':
        return 'Nilai & Sertifikat Taruna';
      case 'statistik':
        return 'Monitoring & Statistik';
      default:
        return 'Dashboard Ketarunaan';
    }
  }, [activeTab]);

  return (
    <InfraErrorBoundary>
      <div className="w-full max-w-full min-w-0 space-y-2.5 sm:space-y-3 pb-8">
        {/* 1. Universal Topbar Ramping */}
        <UniversalEcosystemTopbar
          ecosystem="ketarunaan"
          title={currentSubtabTitle}
          icon={Medal}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsStagingModalOpen(true)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white border-white/30 gap-1.5 cursor-pointer shadow-2xs"
                title="Buka Wadah Penampung Presensi (Attendance Staging Hub)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Staging Presensi</span>
              </Button>
              <span className="hidden md:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/30">
                🎖️ Tim Pembina Taruna
              </span>
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
                  showMobileFilter
                    ? 'bg-white text-rose-800 shadow-xs'
                    : 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs'
                )}
                title="Atur Filter & Kelas"
                aria-label="Atur Filter & Kelas"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          }
        />

        {/* Collapsible Mobile Filter Toolbar */}
        {showMobileFilter && (
          <div className="lg:hidden p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="compact"
              className="w-full"
            />
          </div>
        )}

        {/* Universal Mobile Subtab Sidebar Drawer */}
        <UniversalMobileSubtabSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          title="Program Ketarunaan"
          subtitle={`${academicFilter.selectedTahunPelajaranNama ? `TP ${academicFilter.selectedTahunPelajaranNama}` : 'Aktif'} • ${academicFilter.selectedSemesterNama || ''}`}
          roleBadge="KETARUNAAN"
          scope="ketarunaan"
          roleIcon={Medal}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabChange(tabId)}
        />

        {/* 2. Shopee-Grade Hairline Bento Grid (1 Card Container, 2 Lines Max) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          <HubBentoGrid cells={bentoCells} columns={4} />
        </div>

        {/* 3. Meja Kerja Ketarunaan (Workflow Stepper 5 Tahap + Filter Akademik Desktop) */}
        <KetarunaanWorkdeskFlightDeck
          activeStep={activeTab}
          onSelectStep={(step) => handleTabChange(step)}
          guard={guard}
          hariAktifLabel={hariAktifLabel}
          sesiId={sesiId}
          stats={stats}
          totalKelasCount={Math.max(1, (academicFilter.kelasOptions?.length || 1) - (academicFilter.toolbarProps.allowAllKelas ? 1 : 0))}
          selectedTahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
          selectedSemesterNama={academicFilter.selectedSemesterNama}
          selectedKelasLabel={academicFilter.selectedKelasLabel}
          onOpenSettings={() => navigate('/kesiswaan/jadwal-kegiatan')}
          onOpenStaging={() => setIsStagingModalOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing || isGuardLoading || isSesiLoading}
          filterToolbarNode={<AcademicFilterToolbar {...academicFilter.toolbarProps} variant="compact" />}
        />

        {/* 4. Area Kerja Aktif Sesuai Tahap Terpilih (Keep-Alive + Zero Double Padding) */}
        <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="bg-white dark:bg-slate-900">
            {visitedTabs.has('penilaian') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'penilaian'}
                className={cn('w-full min-w-0', activeTab === 'penilaian' ? 'block animate-in fade-in duration-100' : 'hidden')}
              >
                <KetarunaanPenilaianTab
                  tahunPelajaranId={selectedTpId}
                  tahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
                  semesterId={selectedSemId}
                  semesterNama={academicFilter.selectedSemesterNama}
                  kelasId={academicFilter.values.kelasId}
                  kelasNama={academicFilter.selectedKelasLabel}
                  jurusanId={academicFilter.values.jurusanId}
                />
              </div>
            )}

            {visitedTabs.has('statistik') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'statistik'}
                className={cn('w-full min-w-0', activeTab === 'statistik' ? 'block animate-in fade-in duration-100' : 'hidden')}
              >
                <Suspense
                  fallback={
                    <div className="p-4 space-y-2.5">
                      {[1, 2, 3].map((itemKey) => (
                        <Skeleton key={itemKey} className="h-12 rounded-2xl" />
                      ))}
                    </div>
                  }
                >
                  <KetarunaanStatistikTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    tahunPelajaranId={selectedTpId}
                    semesterId={selectedSemId}
                  />
                </Suspense>
              </div>
            )}

            {visitedTabs.has('laporan_kelas') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'laporan_kelas'}
                className={cn('w-full min-w-0', activeTab === 'laporan_kelas' ? 'block animate-in fade-in duration-100' : 'hidden')}
              >
                <Suspense
                  fallback={
                    <div className="p-4 space-y-2.5">
                      {[1, 2, 3].map((itemKey) => (
                        <Skeleton key={itemKey} className="h-12 rounded-2xl" />
                      ))}
                    </div>
                  }
                >
                  <KetarunaanLaporanKelasTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                    tahunPelajaranId={selectedTpId}
                    semesterId={selectedSemId}
                  />
                </Suspense>
              </div>
            )}

            {visitedTabs.has('laporan_tim') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'laporan_tim'}
                className={cn('w-full min-w-0', activeTab === 'laporan_tim' ? 'block animate-in fade-in duration-100' : 'hidden')}
              >
                <Suspense
                  fallback={
                    <div className="p-4 space-y-2.5">
                      {[1, 2, 3].map((itemKey) => (
                        <Skeleton key={itemKey} className="h-12 rounded-2xl" />
                      ))}
                    </div>
                  }
                >
                  <KetarunaanLaporanTimTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                    tahunPelajaranId={selectedTpId}
                    semesterId={selectedSemId}
                  />
                </Suspense>
              </div>
            )}

            {visitedTabs.has('kepanitiaan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'kepanitiaan'}
                className={cn('w-full min-w-0', activeTab === 'kepanitiaan' ? 'block animate-in fade-in duration-100' : 'hidden')}
              >
                <Suspense
                  fallback={
                    <div className="p-4 space-y-2.5">
                      {[1, 2, 3].map((itemKey) => (
                        <Skeleton key={itemKey} className="h-12 rounded-2xl" />
                      ))}
                    </div>
                  }
                >
                  <KetarunaanKepanitiaanTab
                    jadwalKegiatanId={jadwalKegiatanId}
                    sesiId={sesiId}
                    refetchSesi={refetchSesi}
                    guard={guard}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Universal Attendance Staging Modal (Hub Penampung Presensi Spreadsheet) */}
        {isStagingModalOpen && (
          <Suspense fallback={null}>
            <AttendanceStagingModal
              isOpen={isStagingModalOpen}
              onClose={() => setIsStagingModalOpen(false)}
              tahunPelajaranId={selectedTpId}
              semesterId={selectedSemId}
              kelasId={academicFilter.values.kelasId}
              onSyncSuccess={() => {
                handleRefresh();
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-sesi-hari-ini'] });
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-penilaian'] });
              }}
            />
          </Suspense>
        )}
      </div>
    </InfraErrorBoundary>
  );
});

KetarunaanDashboard.displayName = 'KetarunaanDashboard';
export default KetarunaanDashboard;
