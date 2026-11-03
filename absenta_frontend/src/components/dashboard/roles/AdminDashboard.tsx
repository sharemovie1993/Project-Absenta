import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
  ChevronRight,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { Button, Loader } from '@/components/ui';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/authStore';
import { 
  AdminTabId, 
  AdminCategory, 
  AdminNavTabItem, 
  AdminCategoryConfig 
} from './admin/types';

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

  // Keep-Alive Cache: Instant 0ms Tab Switching
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

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Kategorisasi Navigasi Admin Berstandar Industri ──
  const navTabs: AdminNavTabItem[] = useMemo(
    () => [
      // Kategori 1: PUSAT KONTROL & ANALITIK
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
        shortLabel: 'Audit Log',
        category: 'kontrol',
        icon: History,
      },

      // Kategori 2: DATA MASTER & AKADEMIK
      {
        id: 'siswa',
        label: 'Data Master Siswa',
        shortLabel: 'Siswa',
        category: 'master',
        icon: Users,
      },
      {
        id: 'guru',
        label: 'Data Guru & Tendik',
        shortLabel: 'Guru',
        category: 'master',
        icon: GraduationCap,
      },
      {
        id: 'kelas',
        label: 'Rombel & Kelas',
        shortLabel: 'Kelas',
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

      // Kategori 3: HAK AKSES & PENGGUNA
      {
        id: 'users',
        label: 'Akun Pengguna',
        shortLabel: 'Pengguna',
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

      // Kategori 4: SISTEM & PENGATURAN
      {
        id: 'sekolah',
        label: 'Identitas Sekolah & Kop',
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
        icon: Layers,
        iconColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        id: 'keamanan',
        label: 'Hak Akses & Akun',
        badge: 'IAM',
        badgeColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
        icon: ShieldCheck,
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

  return (
    <div className="space-y-4">
      {/* ── 1. Top Unified Academic Filter Toolbar (Sticky Top SSOT) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Mobile Filter Toggle */}
        <div className="p-3 sm:p-3.5 flex items-center justify-between sm:hidden border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Konteks Akademik Admin
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileFilter(!showMobileFilter)}
            className="text-xs font-semibold h-8 px-2.5 rounded-xl gap-1 text-slate-600 dark:text-slate-300"
          >
            <span>{showMobileFilter ? 'Tutup Filter' : 'Buka Filter'}</span>
            {showMobileFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>

        {/* Filter Toolbar Body */}
        <div className={cn('p-3 sm:p-3.5', !showMobileFilter && 'hidden sm:block')}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <AcademicFilterToolbar
              filter={academicFilter}
              showActiveBadge={true}
              compact={true}
              className="border-0 shadow-none p-0 bg-transparent"
            />
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 px-3 rounded-xl gap-1.5 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              >
                <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin text-indigo-600')} />
                <span className="text-xs font-bold">Segarkan</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Mobile Horizontal Navigation Bar (Shopee-Grade Mobile Hub) ── */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon size={14} />
                <span>{tab.shortLabel || tab.label}</span>
                {tab.badge && (
                  <span className={cn('ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black', tab.badgeColor || 'bg-rose-500 text-white')}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Desktop Main Dashboard Layout (Sidebar + Content Workspace) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-3 sticky top-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-4">
            {/* Header Profil Singkat Admin */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  Administrator Sekolah
                </div>
                <div className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                  Pusat Kendali Sistem
                </div>
              </div>
            </div>

            {/* Categorized Nav Groups */}
            <nav className="space-y-4">
              {categories.map((cat) => {
                const categoryTabs = navTabs.filter((t) => t.category === cat.id);
                if (categoryTabs.length === 0) return null;

                const CatIcon = cat.icon;

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="px-2.5 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <CatIcon size={12} className={cat.iconColor} />
                        <span>{cat.label}</span>
                      </div>
                      {cat.badge && (
                        <span className={cn('px-1.5 py-0.2 rounded text-[9.5px] font-semibold', cat.badgeColor)}>
                          {cat.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {categoryTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabSelect(tab.id)}
                            className={cn(
                              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer group text-left',
                              isActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon
                                size={15}
                                className={cn(
                                  isActive
                                    ? 'text-white'
                                    : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 transition-colors'
                                )}
                              />
                              <span className="truncate">{tab.label}</span>
                            </div>
                            {tab.badge && (
                              <span
                                className={cn(
                                  'px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0',
                                  tab.badgeColor || (isActive ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white')
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
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right Main Content Workspace (9 Cols Desktop) */}
        <main className="col-span-1 lg:col-span-9 space-y-4 min-w-0">
          {/* TAB 1: RINGKASAN EKSEKUTIF */}
          {visitedTabs.has('ringkasan') && (
            <div
              key="tab-ringkasan"
              className={cn('w-full', activeTab === 'ringkasan' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <AdminRingkasanTab user={currentUser} onNavigateSubtab={handleTabSelect} />
            </div>
          )}

          {/* TAB 2: AUDIT & LOG AKTIVITAS */}
          {visitedTabs.has('audit') && (
            <div
              key="tab-audit"
              className={cn('w-full', activeTab === 'audit' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <StaffActivityLogPage />
              </Suspense>
            </div>
          )}

          {/* TAB 3: DATA MASTER SISWA */}
          {visitedTabs.has('siswa') && (
            <div
              key="tab-siswa"
              className={cn('w-full', activeTab === 'siswa' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <SiswaPage />
              </Suspense>
            </div>
          )}

          {/* TAB 4: DATA MASTER GURU & TENDIK */}
          {visitedTabs.has('guru') && (
            <div
              key="tab-guru"
              className={cn('w-full', activeTab === 'guru' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <GuruPage />
              </Suspense>
            </div>
          )}

          {/* TAB 5: ROMBEL & KELAS */}
          {visitedTabs.has('kelas') && (
            <div
              key="tab-kelas"
              className={cn('w-full', activeTab === 'kelas' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <KelasPage />
              </Suspense>
            </div>
          )}

          {/* TAB 6: PROGRAM & KONSENTRASI KEAHLIAN */}
          {visitedTabs.has('jurusan') && (
            <div
              key="tab-jurusan"
              className={cn('w-full', activeTab === 'jurusan' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <JurusanPage />
              </Suspense>
            </div>
          )}

          {/* TAB 7: MATA PELAJARAN */}
          {visitedTabs.has('mapel') && (
            <div
              key="tab-mapel"
              className={cn('w-full', activeTab === 'mapel' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <MapelPage />
              </Suspense>
            </div>
          )}

          {/* TAB 8: TAHUN PELAJARAN & SEMESTER */}
          {visitedTabs.has('tahun_pelajaran') && (
            <div
              key="tab-tahun_pelajaran"
              className={cn('w-full', activeTab === 'tahun_pelajaran' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <TahunPelajaranPage />
              </Suspense>
            </div>
          )}

          {/* TAB 9: AKUN PENGGUNA */}
          {visitedTabs.has('users') && (
            <div
              key="tab-users"
              className={cn('w-full', activeTab === 'users' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <UserPage />
              </Suspense>
            </div>
          )}

          {/* TAB 10: STRUKTUR ORGANISASI & HAK AKSES */}
          {visitedTabs.has('roles') && (
            <div
              key="tab-roles"
              className={cn('w-full', activeTab === 'roles' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <StrukturOrganisasiPage />
              </Suspense>
            </div>
          )}

          {/* TAB 11: IDENTITAS SEKOLAH & KOP SURAT */}
          {visitedTabs.has('sekolah') && (
            <div
              key="tab-sekolah"
              className={cn('w-full', activeTab === 'sekolah' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <CetakBerkasPage />
              </Suspense>
            </div>
          )}

          {/* TAB 12: PENGATURAN SISTEM & WHATSAPP */}
          {visitedTabs.has('pengaturan') && (
            <div
              key="tab-pengaturan"
              className={cn('w-full', activeTab === 'pengaturan' ? 'block animate-in fade-in duration-100' : 'hidden')}
            >
              <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400"><Loader /></div>}>
                <SettingsPage />
              </Suspense>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

AdminDashboard.displayName = 'AdminDashboard';
export default AdminDashboard;
