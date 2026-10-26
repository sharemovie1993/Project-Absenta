import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  Award,
  Briefcase,
  GraduationCap,
  Printer,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { hubinApi } from '@/api/hubin.api';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { HubinDashboardSkeleton } from './hubin/HubinDashboardSkeleton';
import type { HubinTabId, HubinNavTabItem } from './hubin/types';
import type { HubinStats, HubinActivity } from '@/pages/hubin/components/HubinDashboardComponents';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { HubinBerandaTab } from './hubin/tabs/HubinBerandaTab';
import { HubinMitraTab } from './hubin/tabs/HubinMitraTab';
import { HubinPenempatanTab } from './hubin/tabs/HubinPenempatanTab';
import { HubinAbsensiTab } from './hubin/tabs/HubinAbsensiTab';
import { HubinNilaiTab } from './hubin/tabs/HubinNilaiTab';
import { HubinBkkTab } from './hubin/tabs/HubinBkkTab';
import { HubinTracerTab } from './hubin/tabs/HubinTracerTab';
import { HubinRekapTab } from './hubin/tabs/HubinRekapTab';

export interface HubinDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const HubinDashboard: React.FC<HubinDashboardProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as HubinTabId | null;

  const validTabs: HubinTabId[] = [
    'ringkasan',
    'mitra',
    'penempatan',
    'absensi',
    'nilai',
    'bkk',
    'tracer',
    'rekap',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<HubinTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<HubinTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam) {
      setActiveTab('ringkasan');
      setVisitedTabs((prev) => (prev.has('ringkasan') ? prev : new Set(prev).add('ringkasan')));
    }
  }, [subtabParam]);

  const handleTabSelect = useCallback(
    (tabId: HubinTabId) => {
      setActiveTab(tabId);
      setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));

      const currentSubtab = searchParams.get('subtab') || 'ringkasan';
      if (currentSubtab !== tabId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (tabId === 'ringkasan') {
              next.delete('subtab');
            } else {
              next.set('subtab', tabId);
            }
            return next;
          },
          { replace: true }
        );
      }
    },
    [searchParams, setSearchParams]
  );

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const semNama = academicFilter.selectedSemesterNama || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  // Data Queries
  const { data: statsRes, isLoading: loadingStats } = useQuery({
    queryKey: ['hubin-dashboard-stats'],
    queryFn: () => hubinApi.getStats(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: actRes, isLoading: loadingActivities } = useQuery({
    queryKey: ['hubin-recent-activities'],
    queryFn: () => hubinApi.getRecentActivity(),
    staleTime: 5 * 60 * 1000,
  });

  const stats = (statsRes?.data as HubinStats) || null;
  const activities = (actRes?.data as HubinActivity[]) || [];

  // Navigation Items Desktop Sidebar
  const navTabs: HubinNavTabItem[] = useMemo(
    () => [
      {
        id: 'ringkasan',
        label: 'Beranda Hubin',
        shortLabel: 'Beranda',
        icon: LayoutDashboard,
      },
      {
        id: 'mitra',
        label: 'Mitra Industri DU-DI',
        shortLabel: 'Mitra DU-DI',
        icon: Building2,
        badge: (stats?.mouExpiringCount ?? 0) > 0 ? `${stats?.mouExpiringCount} Exp` : undefined,
        badgeColor: 'bg-amber-500 text-white',
      },
      {
        id: 'penempatan',
        label: 'Penempatan Siswa PKL',
        shortLabel: 'Penempatan',
        icon: Users,
        badge: (stats?.pklAktif ?? 0) > 0 ? `${stats?.pklAktif}` : undefined,
        badgeColor: 'bg-teal-500 text-white',
      },
      {
        id: 'absensi',
        label: 'Monitoring Absensi PKL',
        shortLabel: 'Presensi',
        icon: ClipboardList,
        badge: (stats?.todayPresensi?.unverified ?? 0) > 0 ? `${stats?.todayPresensi?.unverified}` : undefined,
        badgeColor: 'bg-emerald-500 text-white',
      },
      {
        id: 'nilai',
        label: 'Penilaian & Sertifikasi',
        shortLabel: 'Nilai PKL',
        icon: Award,
        badge: (stats?.penilaianStats?.belumDinilai ?? 0) > 0 ? `${stats?.penilaianStats?.belumDinilai}` : undefined,
        badgeColor: 'bg-purple-500 text-white',
      },
      {
        id: 'bkk',
        label: 'Bursa Kerja Khusus (BKK)',
        shortLabel: 'BKK Loker',
        icon: Briefcase,
        badge: (stats?.totalLowonganAktif ?? 0) > 0 ? `${stats?.totalLowonganAktif}` : undefined,
        badgeColor: 'bg-sky-500 text-white',
      },
      {
        id: 'tracer',
        label: 'Tracer Study Alumni',
        shortLabel: 'Tracer Study',
        icon: GraduationCap,
      },
      {
        id: 'rekap',
        label: 'Cetak Dokumen Hubin',
        shortLabel: 'Cetak Dokumen',
        icon: Printer,
      },
    ],
    [stats?.mouExpiringCount, stats?.pklAktif, stats?.todayPresensi?.unverified, stats?.penilaianStats?.belumDinilai, stats?.totalLowonganAktif]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hubin-dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['hubin-recent-activities'] }),
      ]);
      toast.success('Data Hubin berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadingStats && !stats) {
    return <HubinDashboardSkeleton />;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pusat Kendali Hubungan Industri"
      description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri, mencakup pengelolaan mitra, MoU, program PKL, BKK lowongan kerja, Tracer Study alumni, dan Teaching Factory."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Header Toolbar Mobile & Desktop */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate('/dashboard?tab=ringkasan');
                  }
                }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all shrink-0 cursor-pointer"
                title="Kembali ke Portal"
                aria-label="Kembali"
              >
                <ArrowLeft size={18} className="stroke-[2.2]" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    Dashboard Hubin
                  </h1>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
                    &bull; {tpTahun ? `TP ${tpTahun}` : ''} {semNama}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                  Kemitraan Industri, Praktik Kerja Lapangan, Bursa Kerja & Tracer Study Alumni
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* TV Mode Shortcut */}
              <button
                type="button"
                onClick={() => navigate('/hubin/dashboard')}
                className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Buka Mode TV Monitor Hubin"
              >
                <Tv size={14} />
                <span className="hidden sm:inline">Layar TV</span>
              </button>

              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  showMobileFilter
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                )}
                aria-label="Filter Akademik"
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filter</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                title="Segarkan Data"
              >
                <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Collapsible Academic Filter Toolbar Mobile */}
          {showMobileFilter && (
            <div className="lg:hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <AcademicFilterToolbar
                {...academicFilter.toolbarProps}
                variant="compact"
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* 2. Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky) */}
          <aside className="hidden lg:block sticky top-20 space-y-3">
            {/* Identitas Hubin Ringkas */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block leading-tight">
                    Hubungan Industri
                  </span>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                    Hubin & PKL
                  </h2>
                </div>
              </div>

              {/* Badge Info Periode */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">Periode Aktif</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                </span>
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
                    onClick={() => handleTabSelect(tab.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                          isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-200 text-slate-700'
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

          {/* Right Column: Dynamic Subtab Viewports (Keep-Alive Cache) */}
          <main className="min-w-0 flex-1 space-y-4">
            {/* TAB 1: BERANDA RINGKASAN HUBIN */}
            {visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                <HubinBerandaTab
                  stats={stats}
                  activities={activities}
                  activitiesLoading={loadingActivities}
                  loading={loadingStats}
                  onTabSelect={handleTabSelect}
                />
              </div>
            )}

            {/* TAB 2: MITRA INDUSTRI DU-DI */}
            {visitedTabs.has('mitra') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'mitra'}
                className={cn('w-full min-w-0', activeTab === 'mitra' ? 'block' : 'hidden')}
              >
                <HubinMitraTab />
              </div>
            )}

            {/* TAB 3: PENEMPATAN SISWA PKL */}
            {visitedTabs.has('penempatan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'penempatan'}
                className={cn('w-full min-w-0', activeTab === 'penempatan' ? 'block' : 'hidden')}
              >
                <HubinPenempatanTab />
              </div>
            )}

            {/* TAB 4: MONITORING ABSENSI PKL */}
            {visitedTabs.has('absensi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'absensi'}
                className={cn('w-full min-w-0', activeTab === 'absensi' ? 'block' : 'hidden')}
              >
                <HubinAbsensiTab />
              </div>
            )}

            {/* TAB 5: PENILAIAN & SERTIFIKASI PKL */}
            {visitedTabs.has('nilai') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'nilai'}
                className={cn('w-full min-w-0', activeTab === 'nilai' ? 'block' : 'hidden')}
              >
                <HubinNilaiTab />
              </div>
            )}

            {/* TAB 6: BURSA KERJA KHUSUS (BKK) */}
            {visitedTabs.has('bkk') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'bkk'}
                className={cn('w-full min-w-0', activeTab === 'bkk' ? 'block' : 'hidden')}
              >
                <HubinBkkTab />
              </div>
            )}

            {/* TAB 7: TRACER STUDY ALUMNI */}
            {visitedTabs.has('tracer') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'tracer'}
                className={cn('w-full min-w-0', activeTab === 'tracer' ? 'block' : 'hidden')}
              >
                <HubinTracerTab />
              </div>
            )}

            {/* TAB 8: CETAK DOKUMEN HUBIN */}
            {visitedTabs.has('rekap') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rekap'}
                className={cn('w-full min-w-0', activeTab === 'rekap' ? 'block' : 'hidden')}
              >
                <HubinRekapTab />
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

HubinDashboard.displayName = 'HubinDashboard';
