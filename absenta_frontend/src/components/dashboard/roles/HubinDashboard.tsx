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
  Settings,
  Network,
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
import { HubinSettingsTab } from './hubin/tabs/HubinSettingsTab';
import { DivisiStrukturOrganisasiView } from '@/components/academic/struktur/DivisiStrukturOrganisasiView';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
} from './common';
import {
  HUBIN_CATEGORIES,
  getHubinNavTabs,
} from './hubin/hubinNavigation.config';

const VALID_HUBIN_TABS: readonly HubinTabId[] = [
  'ringkasan',
  'mitra',
  'penempatan',
  'absensi',
  'nilai',
  'bkk',
  'tracer',
  'rekap',
  'pengaturan',
  'struktur_organisasi',
] as const;

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


  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('hubin');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<HubinTabId>(() => {
    if (subtabParam && (VALID_HUBIN_TABS as readonly string[]).includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<HubinTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (subtabParam && (VALID_HUBIN_TABS as readonly string[]).includes(subtabParam)) {
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

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const currentSubtab = next.get('subtab') || 'ringkasan';
          if (currentSubtab === tabId) return prev;
          if (tabId === 'ringkasan') {
            next.delete('subtab');
          } else {
            next.set('subtab', tabId);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
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

  // Navigation Items Desktop Sidebar (SSOT Kanonikal - 100% DRY)
  const navTabs = useMemo(
    () =>
      getHubinNavTabs({
        mouExpiringCount: stats?.mouExpiringCount,
        pklAktif: stats?.pklAktif,
        unverifiedPresensi: stats?.todayPresensi?.unverified,
        belumDinilai: stats?.penilaianStats?.belumDinilai,
        totalLowonganAktif: stats?.totalLowonganAktif,
      }),
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

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Pusat Kendali';
      case 'mitra': return 'Mitra DUDI';
      case 'penempatan': return 'Penempatan PKL';
      case 'absensi': return 'Presensi PKL';
      case 'nilai': return 'Penilaian PKL';
      case 'bkk': return 'Bursa Kerja (BKK)';
      case 'tracer': return 'Tracer Study';
      case 'rekap': return 'Cetak Dokumen';
      case 'pengaturan': return 'Pengaturan & Kuota';
      case 'struktur_organisasi': return 'Struktur Organisasi';
      default: return 'Beranda';
    }
  }, [activeTab]);

  const isInitialLoading = loadingStats && !stats && activeTab === 'ringkasan';
  if (isInitialLoading) {
    return <HubinDashboardSkeleton />;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pusat Kendali Hubungan Industri"
      description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri, mencakup pengelolaan mitra, MoU, program PKL, BKK lowongan kerja, Tracer Study alumni, dan Teaching Factory."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
        <UniversalEcosystemTopbar
          ecosystem="hubin"
          title={currentSubtabTitle}
          icon={Briefcase}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/hubin/dashboard')}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs shrink-0"
                title="Buka Mode TV Monitor Hubin"
              >
                <Tv size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
                  showMobileFilter
                    ? 'bg-white text-orange-800 shadow-xs'
                    : 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs'
                )}
                title="Atur Periode Akademik"
                aria-label="Atur Periode Akademik"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          }
        />

        {/* Standalone Collapsible Mobile Filter Toolbar (Terpisah secara mandiri) */}
        {showMobileFilter && (
          <div className="lg:hidden p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="compact"
              className="w-full"
            />
          </div>
        )}

        {/* Dedicated Universal Mobile Subtab Sidebar Drawer */}
        <UniversalMobileSubtabSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          title="Dashboard Hubin"
          subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
          roleBadge="HUBIN"
          scope="hubin"
          roleIcon={Briefcase}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabSelect(tabId as HubinTabId)}
          categories={HUBIN_CATEGORIES}
        />

        {/* 2. Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll without scrollbar UI) */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain no-scrollbar space-y-3 pb-6">
            {/* Identitas Hubin Ringkas */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200/60 dark:border-orange-800/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block leading-tight">
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
              {navTabs?.map((tab) => {
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

            {/* TAB 9: PENGATURAN & REFERENSI HUBIN */}
            {visitedTabs.has('pengaturan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pengaturan'}
                className={cn('w-full min-w-0', activeTab === 'pengaturan' ? 'block' : 'hidden')}
              >
                <HubinSettingsTab />
              </div>
            )}

            {/* TAB: STRUKTUR ORGANISASI HUBIN */}
            {visitedTabs.has('struktur_organisasi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'struktur_organisasi'}
                className={cn('w-full min-w-0', activeTab === 'struktur_organisasi' ? 'block' : 'hidden')}
              >
                <DivisiStrukturOrganisasiView
                  divisionCode="HUBIN"
                  divisionTitle="Struktur Organisasi Hubin"
                  hideLayout={true}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

HubinDashboard.displayName = 'HubinDashboard';
