import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  Calendar,
  Settings,
  ShieldCheck,
  Building2,
  BookOpen,
  Key,
  History,
  SlidersHorizontal,
  RefreshCw,
  Award,
  Printer,
  ArrowLeft,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { Button, Loader } from '@/components/ui';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/authStore';
import { getDashboardOverview, getAttendanceChart } from '@/api/dashboard.api';
import { getAcademicStats } from '@/api/academic-stats.api';
import toast from 'react-hot-toast';
import { 
  AdminTabId, 
  AdminCategory, 
  AdminNavTabItem, 
  AdminCategoryConfig 
} from './admin/types';
import { AdminDashboardSkeleton } from './admin/AdminDashboardSkeleton';

// Tab Subcomponents
import { AdminRingkasanTab } from './admin/tabs/AdminRingkasanTab';

// Lazy-loaded Universal Pages (Pilar 21B & TBT Optimization)
const SiswaPage = lazy(() => import('@/pages/academic/SiswaPage').then((m) => ({ default: m.SiswaPage })));
const GuruPage = lazy(() => import('@/pages/academic/GuruPage').then((m) => ({ default: m.GuruPage })));
const KelasPage = lazy(() => import('@/pages/academic/KelasPage').then((m) => ({ default: m.KelasPage })));
const JurusanPage = lazy(() => import('@/pages/academic/JurusanPage').then((m) => ({ default: m.JurusanPage })));
const MapelPage = lazy(() => import('@/pages/academic/MapelPage').then((m) => ({ default: m.MapelPage })));
const TahunPelajaranPage = lazy(() => import('@/pages/academic/TahunPelajaranPage').then((m) => ({ default: m.TahunPelajaranPage })));
const UserPage = lazy(() => import('@/pages/users/UsersPage'));
const StrukturOrganisasiPage = lazy(() => import('@/pages/academic/struktur-organisasi/StrukturOrganisasiPage').then((m) => ({ default: m.StrukturOrganisasiPage })));
const StaffActivityLogPage = lazy(() => import('@/pages/academic/StaffActivityLogPage').then((m) => ({ default: m.StaffActivityLogPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const CetakBerkasPage = lazy(() => import('@/pages/academic/CetakBerkasPage').then((m) => ({ default: m.CetakBerkasPage })));
const TenantSettingsView = lazy(() => import('@/components/tenant/TenantSettingsView').then((m) => ({ default: m.TenantSettingsView })));

export interface AdminDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    name?: string;
    role?: any;
    [key: string]: unknown;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user: propUser }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { user: authUser } = useAuthStore();
  const currentUser = propUser || authUser;

  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as AdminTabId | null;

  const validTabs: AdminTabId[] = [
    'ringkasan',
    'audit',
    'siswa',
    'guru',
    'kelas',
    'jurusan',
    'mapel',
    'tahun_pelajaran',
    'users',
    'roles',
    'sekolah',
    'pengaturan',
  ];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<AdminTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat pindah tab (Instant 0ms Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<AdminTabId>>(() => new Set([activeTab]));

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
    (tabId: AdminTabId) => {
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

  // Academic Filter SSOT (Sama persis dengan Kurikulum & Kaprog)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const semNama = academicFilter.selectedSemesterNama || academicFilter.activeSemester?.nama_semester?.replace(/\s*⭐\s*/g, '').trim() || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || academicFilter.activeTpYear?.tahun || '';

  // Data Fetching dengan React Query (Pilar 31 Optimasi Data Fetching)
  const { data: overviewRes, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: () => getDashboardOverview(),
    staleTime: 60 * 1000,
  });

  const { data: chartRes, isLoading: isChartLoading } = useQuery({
    queryKey: ['admin-attendance-chart'],
    queryFn: () => getAttendanceChart(),
    staleTime: 60 * 1000,
  });

  const { data: academicRes, isLoading: isAcademicLoading } = useQuery({
    queryKey: ['academic-stats'],
    queryFn: () => getAcademicStats(),
    staleTime: 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-overview-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-attendance-chart'] }),
        queryClient.invalidateQueries({ queryKey: ['academic-stats'] }),
      ]);
      toast.success('Data dashboard admin berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Nav Tabs Definition (Dikategorisasi berdasarkan Separation of Concerns ala Kurikulum & Kaprog)
  const navTabs: AdminNavTabItem[] = useMemo(
    () => [
      // ⚡ KATEGORI 1: PUSAT KONTROL & AUDIT
      {
        id: 'ringkasan',
        label: 'Ringkasan Eksekutif',
        shortLabel: 'Ringkasan',
        category: 'kontrol',
        icon: LayoutDashboard,
      },
      {
        id: 'audit',
        label: 'Audit & Log Aktivitas',
        shortLabel: 'Log Audit',
        category: 'kontrol',
        icon: History,
      },

      // ⚙️ KATEGORI 2: DATA MASTER SEKOLAH
      {
        id: 'siswa',
        label: 'Data Master Siswa',
        shortLabel: 'Siswa',
        category: 'master',
        icon: Users,
      },
      {
        id: 'guru',
        label: 'Data Guru & PTK',
        shortLabel: 'Guru & PTK',
        category: 'master',
        icon: GraduationCap,
      },
      {
        id: 'kelas',
        label: 'Rombel & Kelas',
        shortLabel: 'Rombel',
        category: 'master',
        icon: Layers,
      },
      {
        id: 'jurusan',
        label: 'Program Keahlian',
        shortLabel: 'Jurusan',
        category: 'master',
        icon: Building2,
      },
      {
        id: 'mapel',
        label: 'Mata Pelajaran',
        shortLabel: 'Mapel',
        category: 'master',
        icon: BookOpen,
      },
      {
        id: 'tahun_pelajaran',
        label: 'Tahun Pelajaran',
        shortLabel: 'TP & Semester',
        category: 'master',
        icon: Calendar,
      },

      // 🔒 KATEGORI 3: HAK AKSES & AKUN
      {
        id: 'users',
        label: 'Akun Pengguna',
        shortLabel: 'Akun User',
        category: 'keamanan',
        icon: Key,
      },
      {
        id: 'roles',
        label: 'Struktur Organisasi',
        shortLabel: 'Struktur & Hak',
        category: 'keamanan',
        icon: Award,
      },

      // 🛠️ KATEGORI 4: SISTEM & DOKUMEN
      {
        id: 'sekolah',
        label: 'Kop & Profil Sekolah',
        shortLabel: 'Kop Surat',
        category: 'sistem',
        icon: Printer,
      },
      {
        id: 'pengaturan',
        label: 'Pengaturan Sistem',
        shortLabel: 'Pengaturan',
        category: 'sistem',
        icon: Settings,
      },
    ],
    []
  );

  // Kategori Menu Sidebar
  const categories: AdminCategoryConfig[] = useMemo(
    () => [
      {
        id: 'kontrol',
        label: 'Pusat Kontrol',
        badge: 'Utama',
        badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
        icon: LayoutDashboard,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
      },
      {
        id: 'master',
        label: 'Data Master',
        badge: 'Akademik',
        badgeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
        icon: Database,
        iconColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        id: 'keamanan',
        label: 'Hak Akses & Akun',
        badge: 'IAM',
        badgeColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
        icon: Lock,
        iconColor: 'text-purple-600 dark:text-purple-400',
      },
      {
        id: 'sistem',
        label: 'Konfigurasi Sistem',
        badge: 'Platform',
        badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
        icon: Settings,
        iconColor: 'text-amber-600 dark:text-amber-400',
      },
    ],
    []
  );

  const isInitialLoading = isOverviewLoading && isAcademicLoading;

  if (isInitialLoading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      {/* ── 1. Header Toolbar Mobile & Desktop (Konsep Standar Kurikulum & Kaprog) ── */}
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
                  Dashboard Administrator
                </h1>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline">
                  &bull; {tpTahun ? `TP ${tpTahun}` : ''} {semNama}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                Pusat Kendali Data Master, Hak Akses Akun, & Operasional Sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            {/* Tombol Toggle Filter Periode (Khusus Mobile) */}
            <button
              type="button"
              onClick={() => setShowMobileFilter((prev) => !prev)}
              className={cn(
                'lg:hidden p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer',
                showMobileFilter
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              )}
              title="Atur Periode Akademik"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Periode</span>
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

        {/* Mobile Horizontal Subtab Scroller (Shopee-Grade Horizontal Scroller) */}
        <div className="lg:hidden mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-0.5">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800'
                )}
              >
                <Icon size={13} className="shrink-0" />
                <span>{tab.shortLabel || tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[9px] font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky) */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
          {/* Identitas Admin Ringkas & Minimalis */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block leading-tight">
                  Pusat Kendali
                </span>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                  Administrator
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

          {/* Navigasi Menu Vertikal Terkelompok (Separation of Concerns ala Kurikulum & Kaprog) */}
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            {categories.map((cat, idx) => {
              const catTabs = navTabs.filter((t) => t.category === cat.id);
              if (catTabs.length === 0) return null;
              const CatIcon = cat.icon;

              return (
                <React.Fragment key={cat.id}>
                  {idx > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80 mx-1.5" />
                  )}

                  <div className="space-y-0.5">
                    {/* Header Kategori */}
                    <div className="px-2.5 pt-1 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <span className={cn('flex items-center gap-1.5', cat.iconColor)}>
                        <CatIcon className="w-3 h-3" />
                        {cat.label}
                      </span>
                      <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-bold', cat.badgeColor)}>
                        {cat.badge}
                      </span>
                    </div>

                    {/* Tombol Sub-tab dalam Kategori */}
                    {catTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleTabSelect(tab.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                            isActive
                              ? 'bg-indigo-600 text-white shadow-xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{tab.label}</span>
                          </div>

                          {tab.badge !== undefined && (
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center transition-colors shrink-0',
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                              )}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </nav>
        </aside>

        {/* Right Column: Main Content Canvas */}
        <main className="min-w-0 space-y-4">
          {/* TAB 1: RINGKASAN EKSEKUTIF */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              <AdminRingkasanTab
                user={currentUser}
                stats={overviewRes?.data}
                academicStats={academicRes?.data}
                chartData={chartRes?.data}
                loading={isOverviewLoading || isAcademicLoading}
                tpTahun={tpTahun}
                semNama={semNama}
                onNavigateSubtab={handleTabSelect}
              />
            </div>
          )}

          {/* TAB 2: AUDIT & LOG AKTIVITAS */}
          {visitedTabs.has('audit') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'audit'}
              className={cn('w-full min-w-0', activeTab === 'audit' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Log Audit...</span>
                  </div>
                }
              >
                <StaffActivityLogPage />
              </Suspense>
            </div>
          )}

          {/* TAB 3: DATA MASTER SISWA */}
          {visitedTabs.has('siswa') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'siswa'}
              className={cn('w-full min-w-0', activeTab === 'siswa' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Master Siswa...</span>
                  </div>
                }
              >
                <SiswaPage />
              </Suspense>
            </div>
          )}

          {/* TAB 4: DATA GURU & TENDIK */}
          {visitedTabs.has('guru') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'guru'}
              className={cn('w-full min-w-0', activeTab === 'guru' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Master Guru & Tendik...</span>
                  </div>
                }
              >
                <GuruPage />
              </Suspense>
            </div>
          )}

          {/* TAB 5: ROMBEL & KELAS */}
          {visitedTabs.has('kelas') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'kelas'}
              className={cn('w-full min-w-0', activeTab === 'kelas' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Data Kelas & Rombel...</span>
                  </div>
                }
              >
                <KelasPage />
              </Suspense>
            </div>
          )}

          {/* TAB 6: PROGRAM KEAHLIAN / JURUSAN */}
          {visitedTabs.has('jurusan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'jurusan'}
              className={cn('w-full min-w-0', activeTab === 'jurusan' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Program Keahlian...</span>
                  </div>
                }
              >
                <JurusanPage />
              </Suspense>
            </div>
          )}

          {/* TAB 7: MATA PELAJARAN */}
          {visitedTabs.has('mapel') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'mapel'}
              className={cn('w-full min-w-0', activeTab === 'mapel' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Kurikulum Mata Pelajaran...</span>
                  </div>
                }
              >
                <MapelPage />
              </Suspense>
            </div>
          )}

          {/* TAB 8: TAHUN PELAJARAN */}
          {visitedTabs.has('tahun_pelajaran') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'tahun_pelajaran'}
              className={cn('w-full min-w-0', activeTab === 'tahun_pelajaran' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Tahun Pelajaran & Semester...</span>
                  </div>
                }
              >
                <TahunPelajaranPage />
              </Suspense>
            </div>
          )}

          {/* TAB 9: AKUN PENGGUNA */}
          {visitedTabs.has('users') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'users'}
              className={cn('w-full min-w-0', activeTab === 'users' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Manajemen Akun Pengguna...</span>
                  </div>
                }
              >
                <UserPage />
              </Suspense>
            </div>
          )}

          {/* TAB 10: STRUKTUR ORGANISASI */}
          {visitedTabs.has('roles') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'roles'}
              className={cn('w-full min-w-0', activeTab === 'roles' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Struktur Organisasi...</span>
                  </div>
                }
              >
                <StrukturOrganisasiPage />
              </Suspense>
            </div>
          )}

          {/* TAB 11: IDENTITAS SEKOLAH & KOP SURAT */}
          {visitedTabs.has('sekolah') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'sekolah'}
              className={cn('w-full min-w-0', activeTab === 'sekolah' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Pengaturan Profil &amp; Kop Sekolah...</span>
                  </div>
                }
              >
                <TenantSettingsView hideLayout={true} initialSection="profil" />
              </Suspense>
            </div>
          )}

          {/* TAB 12: PENGATURAN SISTEM */}
          {visitedTabs.has('pengaturan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'pengaturan'}
              className={cn('w-full min-w-0', activeTab === 'pengaturan' ? 'block' : 'hidden')}
            >
              <Suspense
                fallback={
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader size="md" />
                    <span className="text-xs text-slate-500 font-medium">Memuat Pengaturan Sistem...</span>
                  </div>
                }
              >
                <SettingsPage hideLayout={true} />
              </Suspense>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
