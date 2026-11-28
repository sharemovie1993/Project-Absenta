import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Medal,
  Shield,
  Users,
  BarChart2,
  LayoutList,
  FileText,
  Activity,
  SlidersHorizontal,
  FileSpreadsheet,
  Radio,
  LayoutGrid,
  TableProperties,
  Clock,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionCard } from '@/components/ui/SectionCard';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import {
  UniversalEcosystemTopbar,
  UniversalMobileSubtabSidebar,
  useMobileSubtabSidebar,
  type UniversalSubtabItem,
} from './common';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { HubBentoGrid, type HubBentoCell } from '@/components/ui/hub';
import {
  getKetarunaanGuardStatus,
  getKetarunaanStats,
  getKetarunaanSesiHariIni,
} from '@/api/kesiswaan/programKetarunaan.api';

// Sub-tab modular components (Keep-Alive + Lazy-Mount)
import { KetarunaanKepanitiaanTab } from '@/components/kesiswaan/program-ketarunaan/KetarunaanKepanitiaanTab';

const KetarunaanPenilaianTab = lazy(() =>
  import('@/components/kesiswaan/program-ketarunaan/KetarunaanPenilaianTab').then((m) => ({
    default: m.KetarunaanPenilaianTab,
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
const AttendanceStagingView = lazy(() =>
  import('@/components/attendance/staging/AttendanceStagingView').then((m) => ({
    default: m.AttendanceStagingView,
  }))
);
const AttendanceStagingManualBackfillModal = lazy(() =>
  import('@/components/attendance/staging/AttendanceStagingManualBackfillModal').then((m) => ({
    default: m.AttendanceStagingManualBackfillModal,
  }))
);
const HistoricalBackfillModal = lazy(() =>
  import('@/components/attendance/backfill/HistoricalBackfillModal').then((m) => ({
    default: m.HistoricalBackfillModal,
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

function formatWaktu(w?: string | null) {
  if (!w) return '-';
  return w.length === 5 ? w : w.slice(0, 5);
}

export type KetarunaanSubtabId =
  | 'ringkasan'
  | 'terminal_absensi'
  | 'penilaian'
  | 'laporan_kelas'
  | 'laporan_tim'
  | 'struktur_organisasi'
  | 'ploting_panitia'
  | 'backfill_presensi';

function normalizeKetarunaanSubtab(raw: string | null): KetarunaanSubtabId {
  if (!raw) return 'terminal_absensi';
  switch (raw) {
    case 'ringkasan':
    case 'statistik':
      return 'ringkasan';
    case 'terminal_absensi':
    case 'kepanitiaan':
      return 'terminal_absensi';
    case 'penilaian':
      return 'penilaian';
    case 'laporan_kelas':
      return 'laporan_kelas';
    case 'laporan_tim':
      return 'laporan_tim';
    case 'struktur_organisasi':
      return 'struktur_organisasi';
    case 'ploting_panitia':
      return 'ploting_panitia';
    case 'backfill_presensi':
    case 'staging_presensi':
    case 'backfill':
      return 'backfill_presensi';
    default:
      return 'terminal_absensi';
  }
}

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
  const subtabParam = searchParams.get('subtab');

  // Default pertama kali ditampilkan adalah Terminal Presensi ('terminal_absensi')
  const [activeTab, setActiveTab] = useState<KetarunaanSubtabId>(() =>
    normalizeKetarunaanSubtab(subtabParam)
  );

  // Keep-Alive Cache: Catat tab yang pernah dibuka (0ms Instant Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<KetarunaanSubtabId>>(
    () => new Set([activeTab])
  );

  const queryClient = useQueryClient();
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [isManualBackfillModalOpen, setIsManualBackfillModalOpen] = useState(false);
  const [isBackfillModalOpen, setIsBackfillModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('ketarunaan');

  // Synchronize Tab with URL
  useEffect(() => {
    const resolved = normalizeKetarunaanSubtab(subtabParam);
    if (resolved !== activeTab) {
      setActiveTab(resolved);
    }
  }, [subtabParam]);

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
      const validId = normalizeKetarunaanSubtab(tabId);
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

  // Konteks Akademik Terpadu (Sidebar Variant SSOT)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    enableKelas: true,
  });

  const selectedTpId = academicFilter.values.tahunPelajaranId;
  const selectedSemId = academicFilter.values.semesterId;
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';
  const semNama = academicFilter.selectedSemesterNama || '';

  // 1. Guard Status
  const { data: guard, isLoading: isGuardLoading, refetch: refetchGuard } = useQuery({
    queryKey: ['ketarunaan-guard'],
    queryFn: getKetarunaanGuardStatus,
    staleTime: 60 * 1000,
  });

  const jadwalKegiatanId = guard?.jadwal_kegiatan_id ?? null;

  // 2. Sesi Hari Ini
  const { data: sesiData, isLoading: isSesiLoading, refetch: refetchSesi } = useQuery({
    queryKey: ['ketarunaan-sesi-hari-ini', jadwalKegiatanId],
    queryFn: () =>
      getKetarunaanSesiHariIni({
        jadwal_kegiatan_id: jadwalKegiatanId ?? undefined,
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

  // Shopee-Grade Mobile Hub Bento Cells
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
        onClick: () => handleTabChange('terminal_absensi'),
      },
      {
        id: 'totalPertemuan',
        title: 'Total Pertemuan',
        value: loading ? '...' : `${stats?.trend?.length ?? 0} Sesi`,
        icon: BarChart2,
        iconColorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => handleTabChange('ringkasan'),
      },
    ];
  }, [stats, guard, isStatsLoading, isGuardLoading, handleTabChange]);

  // Susunan Subtab Sidebar:
  // 1. Ringkasan (Berisi Monitoring)
  // 2. Terminal Absensi (Default saat pertama kali dibuka)
  // 3. Penilaian
  // 4. Rekap Rombel
  // 5. Pembina & Walas
  // 6. Bagan Struktur Organisasi
  // 7. Tabel Ploting Panitia
  const navTabs: UniversalSubtabItem[] = useMemo(() => {
    const totalPertemuan = stats?.trend?.length ?? 0;
    const avgPersenSiswa = stats?.ringkasan_periode?.avg_persen_siswa ?? stats?.latest?.persen_hadir_siswa ?? null;
    const shortKelasLabel = academicFilter.selectedKelasLabel
      ? academicFilter.selectedKelasLabel.split(' - ')[0].trim()
      : undefined;

    return [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        shortLabel: 'Ringkasan',
        icon: Activity,
        badge: totalPertemuan > 0 ? `${totalPertemuan} Sesi` : undefined,
      },
      {
        id: 'terminal_absensi',
        label: 'Terminal Absensi',
        shortLabel: 'Terminal Absensi',
        icon: Radio,
        badge: sesiId ? 'Aktif' : undefined,
        badgeColor: 'bg-emerald-500 text-white',
      },
      {
        id: 'penilaian',
        label: 'Penilaian',
        shortLabel: 'Penilaian',
        icon: Medal,
        badge: shortKelasLabel,
      },
      {
        id: 'laporan_kelas',
        label: 'Rekap Rombel',
        shortLabel: 'Rekap Rombel',
        icon: LayoutList,
        badge: avgPersenSiswa !== null ? `${avgPersenSiswa}%` : undefined,
      },
      {
        id: 'laporan_tim',
        label: 'Pembina & Walas',
        shortLabel: 'Pembina & Walas',
        icon: FileText,
      },
      {
        id: 'struktur_organisasi',
        label: 'Bagan Struktur Organisasi',
        shortLabel: 'Struktur Organisasi',
        icon: LayoutGrid,
      },
      {
        id: 'ploting_panitia',
        label: 'Tabel Ploting Panitia',
        shortLabel: 'Ploting Panitia',
        icon: TableProperties,
      },
      {
        id: 'backfill_presensi',
        label: 'Rekap Backfill & Staging',
        shortLabel: 'Backfill & Staging',
        icon: FileSpreadsheet,
        badge: 'Guard',
        badgeColor: 'bg-amber-500 text-white',
      },
    ];
  }, [stats, sesiId, academicFilter.selectedKelasLabel]);

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan':
        return 'Ringkasan & Monitoring';
      case 'terminal_absensi':
        return 'Terminal Absensi Ketarunaan';
      case 'penilaian':
        return 'Penilaian & Sertifikat Taruna';
      case 'laporan_kelas':
        return 'Rekap Kehadiran Rombel';
      case 'laporan_tim':
        return 'Audit Pembina & Walas';
      case 'struktur_organisasi':
        return 'Bagan Struktur Organisasi';
      case 'ploting_panitia':
        return 'Tabel Ploting Panitia';
      case 'backfill_presensi':
        return 'Rekap Backfill & Staging Presensi (Event Resmi)';
      default:
        return 'Dashboard Ketarunaan';
    }
  }, [activeTab]);

  return (
    <InfraErrorBoundary>
      <div className="space-y-4 w-full max-w-full min-w-0 pb-8">
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
                onClick={() => setIsManualBackfillModalOpen(true)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] font-bold bg-amber-500/25 hover:bg-amber-500/40 text-white border-amber-300/40 gap-1.5 cursor-pointer shadow-2xs"
                title="Buka Wizard Backfill Presensi GUI (Ceklis Siswa Non-Hadir)"
              >
                <Clock className="w-3.5 h-3.5 text-amber-200" />
                <span className="hidden sm:inline">Backfill GUI (Non-Hadir)</span>
              </Button>
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
              <button
                type="button"
                onClick={() => navigate('/kesiswaan/jadwal-kegiatan')}
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs border border-white/30 cursor-pointer transition-colors"
                title="Pengaturan Jadwal & Agenda Ketarunaan"
              >
                <Lock className="w-3 h-3 text-amber-200" />
                <span>Pengaturan Agenda</span>
              </button>
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
          subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
          roleBadge="KETARUNAAN"
          scope="ketarunaan"
          roleIcon={Medal}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabChange(tabId)}
        />

        {/* 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll) */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain role-dashboard-sidebar-scroll pr-1.5 space-y-3 pb-12">
            {/* Identitas Ketarunaan Ringkas & Minimalis (Ecosystem Banner Accent) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white shadow-xs space-y-2.5 border border-rose-500/40 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" aria-hidden="true" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Medal className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100/90 block leading-tight drop-shadow-2xs">
                    Korps Pembina
                  </span>
                  <h2 className="text-sm font-black text-white tracking-wider truncate uppercase drop-shadow-2xs">
                    Ketarunaan
                  </h2>
                </div>
              </div>

              {/* Info Jadwal & Periode Aktif */}
              <div className="pt-2 border-t border-white/20 space-y-1 text-[11px] text-white/90 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-rose-100/80">Periode Aktif</span>
                  <span className="font-bold text-white text-[10px] bg-white/20 backdrop-blur-xs border border-white/25 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                    {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                  </span>
                </div>
                {guard?.jadwal_waktu_mulai && (
                  <div className="flex items-center gap-1 text-[10px] text-rose-100/90 truncate pt-0.5">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {hariAktifLabel ? `${hariAktifLabel} • ` : ''}
                      {formatWaktu(guard.jadwal_waktu_mulai)}–{formatWaktu(guard.jadwal_waktu_selesai)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="sidebar"
            />

            {/* Navigasi Menu Vertikal Sidebar */}
            <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                      isActive
                        ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge !== null && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 ml-1.5',
                          isActive
                            ? 'bg-white/20 text-white'
                            : tab.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Column: Main Content Area */}
          <main className="min-w-0 flex-1 space-y-3">
            {/* Shopee-Grade Hairline Bento Grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <HubBentoGrid cells={bentoCells} columns={4} />
            </div>

            {/* Area Kerja Aktif Sesuai Subtab Terpilih (Keep-Alive Cache) */}
            <SectionCard fullWidth noPadding className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-900">
                {/* 1. RINGKASAN (MONITORING & STATISTIK) */}
                {visitedTabs.has('ringkasan') && (
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'ringkasan'}
                    className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block animate-in fade-in duration-100' : 'hidden')}
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

                {/* 2. TERMINAL ABSENSI (DEFAULT PERTAMA KALI DIBUKA) */}
                {visitedTabs.has('terminal_absensi') && (
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'terminal_absensi'}
                    className={cn('w-full min-w-0', activeTab === 'terminal_absensi' ? 'block animate-in fade-in duration-100' : 'hidden')}
                  >
                    <KetarunaanKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                      mode="PRESENSI"
                    />
                  </div>
                )}

                {/* 3. PENILAIAN & SERTIFIKAT */}
                {visitedTabs.has('penilaian') && (
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'penilaian'}
                    className={cn('w-full min-w-0', activeTab === 'penilaian' ? 'block animate-in fade-in duration-100' : 'hidden')}
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
                      <KetarunaanPenilaianTab
                        tahunPelajaranId={selectedTpId}
                        tahunPelajaranNama={academicFilter.selectedTahunPelajaranNama}
                        semesterId={selectedSemId}
                        semesterNama={academicFilter.selectedSemesterNama}
                        kelasId={academicFilter.values.kelasId}
                        kelasNama={academicFilter.selectedKelasLabel}
                        jurusanId={academicFilter.values.jurusanId}
                      />
                    </Suspense>
                  </div>
                )}

                {/* 4. REKAP ROMBEL */}
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

                {/* 5. PEMBINA & WALAS */}
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

                {/* 6. BAGAN STRUKTUR ORGANISASI */}
                {visitedTabs.has('struktur_organisasi') && (
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'struktur_organisasi'}
                    className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block animate-in fade-in duration-100' : 'hidden')}
                  >
                    <KetarunaanKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                      mode="STRUKTUR"
                    />
                  </div>
                )}

                {/* 7. TABEL PLOTING PANITIA */}
                {visitedTabs.has('ploting_panitia') && (
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'ploting_panitia'}
                    className={cn('w-full min-w-0', activeTab === 'ploting_panitia' ? 'block animate-in fade-in duration-100' : 'hidden')}
                  >
                    <KetarunaanKepanitiaanTab
                      jadwalKegiatanId={jadwalKegiatanId}
                      sesiId={sesiId}
                      refetchSesi={refetchSesi}
                      guard={guard}
                      mode="PLOTING"
                    />
                  </div>
                )}

                {/* 8. REKAP BACKFILL & STAGING PRESENSI (DILINDUNGI ADMIN GUARD) */}
                {visitedTabs.has('backfill_presensi') && (
                  <div
                    role="tabpanel"
                    aria-hidden={activeTab !== 'backfill_presensi'}
                    className={cn('w-full min-w-0 p-3 sm:p-4', activeTab === 'backfill_presensi' ? 'block animate-in fade-in duration-100' : 'hidden')}
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
                      <AttendanceStagingView
                        tahunPelajaranId={selectedTpId}
                        semesterId={selectedSemId}
                        kelasId={academicFilter.values.kelasId}
                        hideLayout
                        onOpenExcelBackfill={() => setIsBackfillModalOpen(true)}
                        onSyncSuccess={() => {
                          handleRefresh();
                          queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                          queryClient.invalidateQueries({ queryKey: ['ketarunaan-sesi-hari-ini'] });
                          queryClient.invalidateQueries({ queryKey: ['ketarunaan-penilaian'] });
                        }}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </SectionCard>
          </main>
        </div>

        {/* Manual Multi-Date GUI Backfill Modal (Ceklis Siswa Non-Hadir - Dilindungi Guard Event Resmi) */}
        {isManualBackfillModalOpen && (
          <Suspense fallback={null}>
            <AttendanceStagingManualBackfillModal
              isOpen={isManualBackfillModalOpen}
              onClose={() => setIsManualBackfillModalOpen(false)}
              defaultAgendaMode="AUTO_SIKLUS"
              onSuccess={() => {
                handleRefresh();
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-sesi-hari-ini'] });
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-penilaian'] });
              }}
            />
          </Suspense>
        )}

        {/* Historical Backfill Excel Modal (Dilindungi Guard Event Resmi) */}
        {isBackfillModalOpen && (
          <Suspense fallback={null}>
            <HistoricalBackfillModal
              isOpen={isBackfillModalOpen}
              onClose={() => setIsBackfillModalOpen(false)}
              kelasId={
                academicFilter.values.kelasId ||
                academicFilter.options.kelasOptions?.[0]?.value ||
                ''
              }
              kelasNama={
                academicFilter.selectedKelasLabel ||
                academicFilter.options.kelasOptions?.[0]?.label ||
                'Pilih Rombel'
              }
              kelasList={academicFilter.options.kelasOptions}
              jenisKegiatan="KETARUNAAN"
              jadwalKegiatanId={jadwalKegiatanId || undefined}
              tahunPelajaranId={selectedTpId}
              semesterId={selectedSemId}
              onSuccess={() => {
                handleRefresh();
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-stats'] });
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-sesi-hari-ini'] });
                queryClient.invalidateQueries({ queryKey: ['ketarunaan-penilaian'] });
              }}
            />
          </Suspense>
        )}

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
