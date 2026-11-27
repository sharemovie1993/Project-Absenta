import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  PiggyBank,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Tv,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import api from '@/lib/axiosInstance';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { useCapabilities } from '@/hooks/useCapabilities';
import { KoperasiDashboardSkeleton } from './koperasi/KoperasiDashboardSkeleton';
import type { KoperasiTabId } from './koperasi/types';
import {
  getKoperasiNavTabs,
  getVisibleKoperasiCategories,
} from './koperasi/koperasiNavigation.config';
import type { CoopManagementStats } from '@/components/cooperative/dashboard/types';
import type { Announcement, CriticalStockItem } from '@/components/cooperative/types';
import toast from 'react-hot-toast';

// Tab Subcomponents
import { KoperasiBerandaTab } from './koperasi/tabs/KoperasiBerandaTab';
import { KoperasiPosTab } from './koperasi/tabs/KoperasiPosTab';
import { KoperasiSimpananTab } from './koperasi/tabs/KoperasiSimpananTab';
import { KoperasiPinjamanTab } from './koperasi/tabs/KoperasiPinjamanTab';
import { KoperasiAnggotaTab } from './koperasi/tabs/KoperasiAnggotaTab';
import { KoperasiProdukTab } from './koperasi/tabs/KoperasiProdukTab';
import { KoperasiShuTab } from './koperasi/tabs/KoperasiShuTab';
import { KoperasiAkuntansiTab } from './koperasi/tabs/KoperasiAkuntansiTab';
import { KoperasiAsetTab } from './koperasi/tabs/KoperasiAsetTab';
import { KoperasiRatTab } from './koperasi/tabs/KoperasiRatTab';
import { KoperasiTiketTab } from './koperasi/tabs/KoperasiTiketTab';

// Lazy-loaded Additional Management Subtabs (Aligned with Single-Page Cooperative Menu)
const SuppliersPage = lazy(() => import('@/pages/cooperative/Suppliers').then((m) => ({ default: m.default })));
const VouchersPage = lazy(() => import('@/pages/cooperative/Vouchers').then((m) => ({ default: m.default })));
const SalesReportPage = lazy(() => import('@/pages/cooperative/SalesReportPage').then((m) => ({ default: m.default })));
const LaporanInventoriPage = lazy(() => import('@/pages/cooperative/LaporanInventori').then((m) => ({ default: m.default })));
const CashBankPage = lazy(() => import('@/pages/cooperative/CashBankPage').then((m) => ({ default: m.default })));
const ChartOfAccountsPage = lazy(() => import('@/pages/cooperative/ChartOfAccountsPage').then((m) => ({ default: m.default })));
const AnnouncementsPage = lazy(() => import('@/pages/cooperative/Announcements').then((m) => ({ default: m.default })));
const SettingsPage = lazy(() => import('@/pages/cooperative/Settings').then((m) => ({ default: m.default })));
const ServiceCenterView = lazy(() => import('@/pages/billing/ServiceCenterPage').then((m) => ({ default: m.ServiceCenterView })));

const SubtabFallbackSkeleton: React.FC = () => (
  <div className="space-y-4 w-full animate-pulse p-4">
    <Skeleton className="h-12 w-full rounded-2xl" />
    <Skeleton className="h-64 w-full rounded-2xl" />
  </div>
);
import {
  UniversalMobileSubtabSidebar,
  useMobileSubtabSidebar,
} from './common/UniversalMobileSubtabSidebar';
import { UniversalEcosystemTopbar } from './common/UniversalEcosystemTopbar';

export interface KoperasiDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const KoperasiDashboard: React.FC<KoperasiDashboardProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KoperasiTabId | null;

  const {
    can,
    isAdmin,
    isKoperasiHead,
    isKoperasiFinance,
    isKoperasiSecretary,
    isKoperasiStore,
    isKoperasiAuditor,
  } = useCapabilities();

  const canCoopCap = useCallback(
    (capability: string) => {
      if (isAdmin) return true;
      if (can(capability)) return true;
      // SSOT Role Fallback: Ketua Koperasi memiliki akses penuh ke seluruh subtab manajemen, keuangan, ritel, laporan & pengaturan (selain kasir POS)
      if (isKoperasiHead && capability !== 'cooperative.store.orders.manage' && capability !== 'coop.pos.access') {
        return true;
      }
      if (
        isKoperasiFinance &&
        (capability.startsWith('cooperative.savings.') ||
          capability.startsWith('cooperative.loans.') ||
          capability.startsWith('cooperative.reports.') ||
          capability.startsWith('cooperative.shu.') ||
          capability.startsWith('cooperative.settings.') ||
          capability.startsWith('cooperative.setup.'))
      ) {
        return true;
      }
      if (
        isKoperasiSecretary &&
        (capability.startsWith('cooperative.members.') ||
          capability.startsWith('cooperative.assets.') ||
          capability.startsWith('cooperative.announcements.') ||
          capability.startsWith('cooperative.tickets.') ||
          capability.startsWith('cooperative.rat.'))
      ) {
        return true;
      }
      if (
        isKoperasiStore &&
        (capability.startsWith('cooperative.store.') ||
          capability.startsWith('cooperative.suppliers.') ||
          capability.startsWith('cooperative.vouchers.') ||
          capability === 'coop.pos.access')
      ) {
        return true;
      }
      return false;
    },
    [isAdmin, can, isKoperasiHead, isKoperasiFinance, isKoperasiSecretary, isKoperasiStore]
  );

  // Identitas Jabatan Koperasi Dinamis (1 Unified Capability-Driven Shell)
  const koperasiIdentity = useMemo(() => {
    const activeRoles: string[] = [];
    if (isKoperasiHead) activeRoles.push('Ketua Koperasi');
    if (isKoperasiFinance) activeRoles.push('Bendahara Koperasi');
    if (isKoperasiSecretary) activeRoles.push('Sekretaris Koperasi');
    if (isKoperasiStore) activeRoles.push('Manajer Toko');
    if (isKoperasiAuditor) activeRoles.push('Pengawas Koperasi');

    const isPureAuditor =
      isKoperasiAuditor &&
      !isAdmin &&
      !isKoperasiHead &&
      !isKoperasiFinance &&
      !isKoperasiSecretary &&
      !isKoperasiStore;

    if (isKoperasiHead) {
      return {
        unitTitle: 'Dashboard Ketua Koperasi',
        subtitle: 'Pengawasan Eksekutif, Approval Pinjaman & Keanggotaan, SHU, dan Tata Kelola',
        sidebarTitle: 'Ketua',
        sidebarCode: 'KETUA KOP',
        isReadOnlyAuditor: false,
      };
    }
    if (isKoperasiFinance && activeRoles.length === 1) {
      return {
        unitTitle: 'Dashboard Bendahara Koperasi',
        subtitle: 'Simpan Pinjam, Pencairan Kredit, Pembukuan Akuntansi, dan Kalkulasi SHU',
        sidebarTitle: 'Bendahara',
        sidebarCode: 'BENDAHARA',
        isReadOnlyAuditor: false,
      };
    }
    if (isKoperasiSecretary && activeRoles.length === 1) {
      return {
        unitTitle: 'Dashboard Sekretaris Koperasi',
        subtitle: 'Registrasi Anggota, Inventaris Aset, Sidang RAT, Pengumuman & Tiket Aduan',
        sidebarTitle: 'Sekretaris',
        sidebarCode: 'SEKRETARIS',
        isReadOnlyAuditor: false,
      };
    }
    if (isKoperasiStore && activeRoles.length === 1) {
      return {
        unitTitle: 'Dashboard Toko & Kasir Koperasi',
        subtitle: 'Operasional Kasir POS, Katalog Produk, Stok Minimarket, Supplier & Voucher',
        sidebarTitle: 'Manajer Toko',
        sidebarCode: 'TOKO KOP',
        isReadOnlyAuditor: false,
      };
    }
    if (isPureAuditor) {
      return {
        unitTitle: 'Dashboard Pengawas Koperasi',
        subtitle: 'Audit Independen Simpan Pinjam, Laporan Keuangan, Aset & SHU (Mode Baca Saja)',
        sidebarTitle: 'Pengawas',
        sidebarCode: 'PENGAWAS',
        isReadOnlyAuditor: true,
      };
    }

    return {
      unitTitle: 'Dashboard Koperasi',
      subtitle:
        activeRoles.length > 0
          ? activeRoles.join(' • ')
          : 'Simpan Pinjam, Kasir Minimarket, Sisa Hasil Usaha & Pembukuan Akuntansi',
      sidebarTitle: 'Koperasi',
      sidebarCode: 'KOPERASI',
      isReadOnlyAuditor: false,
    };
  }, [
    isAdmin,
    isKoperasiHead,
    isKoperasiFinance,
    isKoperasiSecretary,
    isKoperasiStore,
    isKoperasiAuditor,
  ]);

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('koperasi');

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const semNama = academicFilter.selectedSemesterNama || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  const canFetchInventoryStock =
    canCoopCap('cooperative.store.products.view.list') ||
    canCoopCap('cooperative.store.view.catalog') ||
    canCoopCap('cooperative.store.inventory.manage');

  // Data Queries
  const { data: stats = null, isLoading: loadingStats } = useQuery<CoopManagementStats | null>({
    queryKey: ['cooperative-dashboard', 'stats'],
    queryFn: async () => {
      const statsRes = await api.get('/cooperative/dashboard/stats');
      const raw = statsRes.data?.data || {};
      return {
        ...raw,
        totalMembers: Number(raw.totalMembers) || 0,
        totalSavings: Number(raw.totalSavings) || 0,
        totalLoans: Number(raw.totalLoans) || 0,
        dueInstallments: Number(raw.dueInstallments) || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ['cooperative-announcements'],
    queryFn: async () => {
      try {
        const annRes = await api.get('/cooperative/announcements');
        const annList = annRes.data?.data;
        return Array.isArray(annList) ? annList : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: criticalStock = [], isLoading: criticalStockLoading } = useQuery<CriticalStockItem[]>({
    queryKey: ['cooperative-critical-stock'],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/reports/inventory/stock');
        const items = res.data?.items || [];
        return items.filter((item: CriticalStockItem) => item.status === 'HABIS' || item.status === 'RENDAH');
      } catch {
        return [];
      }
    },
    enabled: canFetchInventoryStock,
    staleTime: 5 * 60 * 1000,
  });

  // Navigation Items Desktop Sidebar & Mobile Sheet (Filtered by Canonical Capabilities)
  const navBadges = useMemo(
    () => ({
      dueInstallments: stats?.dueInstallments ?? 0,
      pendingMembers: stats?.pendingMembers?.count ?? 0,
      criticalStock: criticalStock.length,
      openTickets: stats?.openTickets ?? 0,
    }),
    [stats?.dueInstallments, stats?.pendingMembers?.count, criticalStock.length, stats?.openTickets]
  );

  const navTabs = useMemo(
    () => getKoperasiNavTabs(navBadges, canCoopCap, { isKoperasiHead }),
    [navBadges, canCoopCap, isKoperasiHead]
  );

  const visibleCategories = useMemo(
    () => getVisibleKoperasiCategories(navTabs),
    [navTabs]
  );

  const allowedTabIds = useMemo(() => new Set(navTabs?.map((t) => t.id)), [navTabs]);

  // Active Tab State (Strictly validated against permitted capabilities)
  const [activeTab, setActiveTab] = useState<KoperasiTabId>(() => {
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      return subtabParam;
    }
    return navTabs[0]?.id || 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Tab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<KoperasiTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (navTabs.length === 0) return;

    const firstAllowed = navTabs[0]?.id || 'ringkasan';
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam || !allowedTabIds.has(subtabParam)) {
      setActiveTab(firstAllowed);
      setVisitedTabs((prev) => (prev.has(firstAllowed) ? prev : new Set(prev).add(firstAllowed)));
      if (subtabParam && !allowedTabIds.has(subtabParam)) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (firstAllowed === 'ringkasan') {
              next.delete('subtab');
            } else {
              next.set('subtab', firstAllowed);
            }
            return next;
          },
          { replace: true }
        );
      }
    }
  }, [subtabParam, allowedTabIds, navTabs, setSearchParams]);

  const handleTabSelect = useCallback(
    (tabId: KoperasiTabId) => {
      if (!allowedTabIds.has(tabId)) return;
      setActiveTab(tabId);
      setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));

      const currentSubtab = searchParams.get('subtab') || 'ringkasan';
      if (currentSubtab !== tabId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            const parentTab = prev.get('tab') || 'koperasi';
            next.set('tab', parentTab);
            next.delete('inner_tab');
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
    [allowedTabIds, searchParams, setSearchParams]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-announcements'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-critical-stock'] }),
      ]);
      toast.success('Data Koperasi berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loadingStats && !stats) {
    return <KoperasiDashboardSkeleton />;
  }

  return (
    <PremiumFeatureGate
      moduleName="KOPERASI"
      featureName="Dashboard Koperasi"
      description="Kelola transaksi kasir, simpan pinjam, bagi hasil SHU, dan pembukuan akuntansi koperasi sekolah dalam satu dashboard terintegrasi."
    >
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) - Mobile Only (< lg) */}
        <UniversalEcosystemTopbar
          ecosystem="koperasi"
          title={koperasiIdentity.unitTitle}
          icon={Receipt}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          actions={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate('/cooperative/dashboard')}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                title="Buka Mode TV Monitor Koperasi"
                aria-label="Mode TV"
              >
                <Tv size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0',
                  showMobileFilter
                    ? 'bg-white text-emerald-800 shadow-xs'
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

        {/* Collapsible Academic Filter Toolbar Mobile */}
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
          title={koperasiIdentity.unitTitle}
          subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
          roleBadge={koperasiIdentity.sidebarCode}
          scope="koperasi"
          roleIcon={Receipt}
          tabs={navTabs}
          activeTab={activeTab}
          onSelectTab={(tabId) => handleTabSelect(tabId as KoperasiTabId)}
          categories={visibleCategories}
          footerExtra={
            <button
              type="button"
              onClick={() => {
                setIsMobileSidebarOpen(false);
                navigate('/dashboard?tab=koperasi-saya');
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <PiggyBank size={15} className="stroke-[2.2]" />
              <span>Buka Koperasi Saya (Portal Anggota)</span>
            </button>
          }
        />

        {/* 2. Desktop 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll with elegant sleek scrollbar) */}
          <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain role-dashboard-sidebar-scroll pr-1.5 space-y-3 pb-12">
            {/* Identitas Koperasi Ringkas (Ecosystem Banner Accent) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-700 to-green-800 text-white shadow-xs space-y-2.5 border border-emerald-500/40 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" aria-hidden="true" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/95 border border-white/40 text-emerald-700 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block leading-tight">
                    Ekonomi Sekolah
                  </span>
                  <h2 className="text-sm font-black text-white tracking-wider truncate uppercase">
                    {koperasiIdentity.sidebarTitle}
                  </h2>
                </div>
              </div>

              {/* Badge Info Periode */}
              <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-white/80 relative z-10">
                <span className="font-medium text-emerald-100">Jabatan</span>
                <span className="font-bold text-white font-mono text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {koperasiIdentity.sidebarCode}
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
                  <React.Fragment key={tab.id}>
                    {tab.dividerBefore && (
                      <div className="my-1.5 border-t border-slate-200/70 dark:border-slate-800" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleTabSelect(tab.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                        isActive
                          ? 'bg-gradient-to-r from-emerald-700 to-green-800 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0',
                            isActive ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-200 text-slate-700'
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Quick Shortcuts */}
            <div className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <button
                type="button"
                onClick={() => navigate('/dashboard?tab=koperasi-saya')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                title="Buka Portal Koperasi Saya sebagai Anggota"
              >
                <ShieldCheck size={14} />
                <span>Portal Anggota Saya</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/cooperative/dashboard')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                title="Buka Mode TV Monitor Koperasi"
              >
                <Tv size={14} />
                <span>Mode Monitor TV</span>
              </button>
            </div>
          </aside>

          {/* Right Column: Dynamic Subtab Viewports (Keep-Alive Cache, Strictly Capability-Gated) */}
          <main className="min-w-0 flex-1 space-y-4">
            {/* TAB 1: BERANDA RINGKASAN KOPERASI */}
            {allowedTabIds.has('ringkasan') && visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                <KoperasiBerandaTab
                  stats={stats}
                  announcements={announcements}
                  criticalStock={criticalStock}
                  criticalStockLoading={criticalStockLoading}
                  loading={loadingStats}
                  onTabSelect={handleTabSelect}
                  canAccess={canCoopCap}
                />
              </div>
            )}

            {/* TAB 2: KASIR POINT OF SALE (POS) */}
            {allowedTabIds.has('pos') && visitedTabs.has('pos') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pos'}
                className={cn('w-full min-w-0', activeTab === 'pos' ? 'block' : 'hidden')}
              >
                <KoperasiPosTab />
              </div>
            )}

            {/* TAB 3: SIMPANAN ANGGOTA */}
            {allowedTabIds.has('simpanan') && visitedTabs.has('simpanan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'simpanan'}
                className={cn('w-full min-w-0', activeTab === 'simpanan' ? 'block' : 'hidden')}
              >
                <KoperasiSimpananTab />
              </div>
            )}

            {/* TAB 4: PINJAMAN & KREDIT */}
            {allowedTabIds.has('pinjaman') && visitedTabs.has('pinjaman') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pinjaman'}
                className={cn('w-full min-w-0', activeTab === 'pinjaman' ? 'block' : 'hidden')}
              >
                <KoperasiPinjamanTab />
              </div>
            )}

            {/* TAB 5: BUKU ANGGOTA */}
            {allowedTabIds.has('anggota') && visitedTabs.has('anggota') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'anggota'}
                className={cn('w-full min-w-0', activeTab === 'anggota' ? 'block' : 'hidden')}
              >
                <KoperasiAnggotaTab />
              </div>
            )}

            {/* TAB 6: KATALOG & STOK */}
            {allowedTabIds.has('produk') && visitedTabs.has('produk') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'produk'}
                className={cn('w-full min-w-0', activeTab === 'produk' ? 'block' : 'hidden')}
              >
                <KoperasiProdukTab />
              </div>
            )}

            {/* TAB 7: SISA HASIL USAHA (SHU) */}
            {allowedTabIds.has('shu') && visitedTabs.has('shu') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'shu'}
                className={cn('w-full min-w-0', activeTab === 'shu' ? 'block' : 'hidden')}
              >
                <KoperasiShuTab />
              </div>
            )}

            {/* TAB 8: BUKU AKUNTANSI */}
            {allowedTabIds.has('akuntansi') && visitedTabs.has('akuntansi') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'akuntansi'}
                className={cn('w-full min-w-0', activeTab === 'akuntansi' ? 'block' : 'hidden')}
              >
                <KoperasiAkuntansiTab />
              </div>
            )}

            {/* TAB 9: INVENTARIS ASET KOPERASI */}
            {allowedTabIds.has('aset') && visitedTabs.has('aset') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'aset'}
                className={cn('w-full min-w-0', activeTab === 'aset' ? 'block' : 'hidden')}
              >
                <KoperasiAsetTab />
              </div>
            )}

            {/* TAB 10: SIDANG RAT & E-VOTING */}
            {allowedTabIds.has('rat') && visitedTabs.has('rat') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rat'}
                className={cn('w-full min-w-0', activeTab === 'rat' ? 'block' : 'hidden')}
              >
                <KoperasiRatTab />
              </div>
            )}

            {/* TAB 11: TIKET & ADUAN KOPERASI */}
            {allowedTabIds.has('tiket') && visitedTabs.has('tiket') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'tiket'}
                className={cn('w-full min-w-0', activeTab === 'tiket' ? 'block' : 'hidden')}
              >
                <KoperasiTiketTab />
              </div>
            )}

            {/* TAB 11B: PAKET LANGGANAN (Universal Service Center, terfilter kategori KOPERASI) */}
            {allowedTabIds.has('langganan') && visitedTabs.has('langganan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'langganan'}
                className={cn('w-full min-w-0', activeTab === 'langganan' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <ServiceCenterView
                    hideLayout={true}
                    lockedCategory="KOPERASI"
                    embeddedTitle="Paket Langganan Koperasi & POS"
                  />
                </Suspense>
              </div>
            )}

            {/* TAB 12: DATA PEMASOK / SUPPLIER */}
            {allowedTabIds.has('pemasok') && visitedTabs.has('pemasok') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pemasok'}
                className={cn('w-full min-w-0', activeTab === 'pemasok' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <SuppliersPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 13: VOUCHER & PROMO */}
            {allowedTabIds.has('voucher') && visitedTabs.has('voucher') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'voucher'}
                className={cn('w-full min-w-0', activeTab === 'voucher' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <VouchersPage hideLayout={true} mode="manage" />
                </Suspense>
              </div>
            )}

            {/* TAB 14: LAPORAN PENJUALAN */}
            {allowedTabIds.has('laporan_penjualan') && visitedTabs.has('laporan_penjualan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'laporan_penjualan'}
                className={cn('w-full min-w-0', activeTab === 'laporan_penjualan' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <SalesReportPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 15: LAPORAN STOK / PERSEDIAAN */}
            {allowedTabIds.has('laporan_stok') && visitedTabs.has('laporan_stok') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'laporan_stok'}
                className={cn('w-full min-w-0', activeTab === 'laporan_stok' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <LaporanInventoriPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 16: KAS & BANK */}
            {allowedTabIds.has('kas_bank') && visitedTabs.has('kas_bank') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'kas_bank'}
                className={cn('w-full min-w-0', activeTab === 'kas_bank' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <CashBankPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 17: BAGAN AKUN (COA) */}
            {allowedTabIds.has('coa') && visitedTabs.has('coa') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'coa'}
                className={cn('w-full min-w-0', activeTab === 'coa' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <ChartOfAccountsPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 18: PENGUMUMAN */}
            {allowedTabIds.has('pengumuman') && visitedTabs.has('pengumuman') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pengumuman'}
                className={cn('w-full min-w-0', activeTab === 'pengumuman' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <AnnouncementsPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 19: PENGATURAN KOPERASI */}
            {allowedTabIds.has('pengaturan') && visitedTabs.has('pengaturan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'pengaturan'}
                className={cn('w-full min-w-0', activeTab === 'pengaturan' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <SettingsPage hideLayout={true} />
                </Suspense>
              </div>
            )}

            {/* TAB 20: DELEGASI WEWENANG KETUA */}
            {allowedTabIds.has('delegasi_ketua') && visitedTabs.has('delegasi_ketua') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'delegasi_ketua'}
                className={cn('w-full min-w-0', activeTab === 'delegasi_ketua' ? 'block' : 'hidden')}
              >
                <Suspense fallback={<SubtabFallbackSkeleton />}>
                  <SettingsPage hideLayout={true} initialTab="delegation" />
                </Suspense>
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

KoperasiDashboard.displayName = 'KoperasiDashboard';
