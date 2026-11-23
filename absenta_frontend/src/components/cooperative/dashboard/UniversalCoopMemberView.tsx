import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Package,
  Tag,
  TrendingUp,
  Vote,
  Megaphone,
  MessageSquare,
  ShoppingBag,
  RefreshCw,
  SlidersHorizontal,
  ArrowLeft,
  X,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import {
  UniversalMobileSubtabSidebar,
  useMobileSubtabSidebar,
  type UniversalSubtabCategory,
  type UniversalSubtabItem,
} from '@/components/dashboard/roles/common/UniversalMobileSubtabSidebar';
import { UniversalEcosystemTopbar } from '@/components/dashboard/roles/common/UniversalEcosystemTopbar';
import { CoopMemberSection } from './CoopMemberSection';
import { printCoopReceipt, fetchCoopSettings, type CoopSettingsData } from '@/utils/cooperative/coopDocUtils';
import type { Sale, Announcement, CoopUserInfo } from '@/components/cooperative/types';
import type { MemberInfo, MemberDashboardSummary } from './types';

// Lazy-loaded Feature Subtabs
const Savings = lazy(() => import('@/pages/cooperative/Savings').then((m) => ({ default: m.default })));
const Loans = lazy(() => import('@/pages/cooperative/Loans').then((m) => ({ default: m.default })));
const Products = lazy(() => import('@/pages/cooperative/Products').then((m) => ({ default: m.default })));
const Vouchers = lazy(() => import('@/pages/cooperative/Vouchers').then((m) => ({ default: m.default })));
const SHUPage = lazy(() => import('@/pages/cooperative/SHU').then((m) => ({ default: m.default })));
const RatMeetingPage = lazy(() => import('@/pages/cooperative/RatMeetingPage').then((m) => ({ default: m.default })));
const Announcements = lazy(() => import('@/pages/cooperative/Announcements').then((m) => ({ default: m.default })));
const Tickets = lazy(() => import('@/pages/cooperative/Tickets').then((m) => ({ default: m.default })));
const ReceiptModal = lazy(() => import('@/pages/cooperative/components/ReceiptModal').then((m) => ({ default: m.ReceiptModal })));

export type CoopMemberTabId =
  | 'ringkasan'
  | 'simpanan'
  | 'pinjaman'
  | 'produk'
  | 'voucher'
  | 'shu'
  | 'rat'
  | 'pengumuman'
  | 'tiket';

export type CoopMemberCategory = 'ringkasan' | 'keuangan' | 'ritel' | 'organisasi';

export const COOP_MEMBER_CATEGORIES: UniversalSubtabCategory[] = [
  {
    id: 'ringkasan',
    label: 'Ringkasan & Informasi',
    shortLabel: 'Utama',
    icon: LayoutDashboard,
  },
  {
    id: 'keuangan',
    label: 'Simpan Pinjam & SHU',
    shortLabel: 'Keuangan',
    icon: Wallet,
  },
  {
    id: 'ritel',
    label: 'Belanja & Promo Toko',
    shortLabel: 'Toko',
    icon: ShoppingBag,
  },
  {
    id: 'organisasi',
    label: 'Suara Anggota & Bantuan',
    shortLabel: 'Organisasi',
    icon: Vote,
  },
];

interface MemberSubtabDef {
  id: CoopMemberTabId;
  label: string;
  shortLabel: string;
  category: CoopMemberCategory;
  icon: LucideIcon;
}

const COOP_MEMBER_SUBTABS_BASE: MemberSubtabDef[] = [
  {
    id: 'ringkasan',
    label: 'Ringkasan Anggota',
    shortLabel: 'Ringkasan',
    category: 'ringkasan',
    icon: LayoutDashboard,
  },
  {
    id: 'simpanan',
    label: 'Simpanan Saya',
    shortLabel: 'Simpanan',
    category: 'keuangan',
    icon: Wallet,
  },
  {
    id: 'pinjaman',
    label: 'Pinjaman & Kredit',
    shortLabel: 'Pinjaman',
    category: 'keuangan',
    icon: PiggyBank,
  },
  {
    id: 'shu',
    label: 'Sisa Hasil Usaha',
    shortLabel: 'SHU',
    category: 'keuangan',
    icon: TrendingUp,
  },
  {
    id: 'produk',
    label: 'Katalog Toko',
    shortLabel: 'Katalog',
    category: 'ritel',
    icon: Package,
  },
  {
    id: 'voucher',
    label: 'Poin & Voucher',
    shortLabel: 'Voucher',
    category: 'ritel',
    icon: Tag,
  },
  {
    id: 'rat',
    label: 'Sidang RAT & Voting',
    shortLabel: 'Sidang RAT',
    category: 'organisasi',
    icon: Vote,
  },
  {
    id: 'pengumuman',
    label: 'Papan Pengumuman',
    shortLabel: 'Pengumuman',
    category: 'ringkasan',
    icon: Megaphone,
  },
  {
    id: 'tiket',
    label: 'Tiket & Bantuan',
    shortLabel: 'Tiket Aduan',
    category: 'organisasi',
    icon: MessageSquare,
  },
];

const TabLoadingSkeleton: React.FC = () => (
  <div className="space-y-4 w-full animate-pulse p-4">
    <Skeleton className="h-14 w-full rounded-2xl" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
    <Skeleton className="h-64 w-full rounded-2xl" />
  </div>
);

export interface UniversalCoopMemberViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}

export const UniversalCoopMemberView: React.FC<UniversalCoopMemberViewProps> = React.memo(({
  isModal = false,
  onClose,
  onBack,
  backLabel = 'Kembali ke Portal Utama',
  className,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as CoopMemberTabId | null;

  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSubtabSidebar('koperasi');

  // Academic Filter SSOT (Sidebar & Mobile Toolbar)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });
  const semNama = academicFilter.selectedSemesterNama || '';
  const tpTahun = academicFilter.selectedTahunPelajaranNama || '';

  // 1. Data Query: Member Profile /me
  const { data: memberInfo = null, isLoading: loadingMemberInfo } = useQuery<MemberInfo | null>({
    queryKey: ['cooperative-member-me', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        return res?.data?.data || null;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  // 2. Data Query: Dedicated Member Summary
  const { data: memberSummaryRes, isLoading: loadingSummary } = useQuery<{ success: boolean; data: MemberDashboardSummary }>({
    queryKey: ['cooperative-dashboard', 'summary-member', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/dashboard/summary-member');
        return res.data;
      } catch {
        return { success: false, data: null as unknown as MemberDashboardSummary };
      }
    },
    staleTime: 45000,
  });
  const memberSummary = memberSummaryRes?.data || null;

  // 3. Status Evaluator
  const memberStatus = useMemo<'loading' | 'member' | 'non-member'>(() => {
    if (loadingMemberInfo || loadingSummary) return 'loading';
    if (memberSummary?.isMember) return 'member';
    return memberInfo && memberInfo.status === 'ACTIVE' ? 'member' : 'non-member';
  }, [loadingMemberInfo, loadingSummary, memberInfo, memberSummary]);

  // 4. Tabungan Personal
  const { data: mySavingsSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-savings', memberInfo?.memberNo || user?.id],
    queryFn: async () => {
      try {
        const savingsRes = await api.get('/cooperative/savings');
        return (savingsRes.data || []).reduce((sum: number, s: { amount?: number | string }) => sum + Number(s.amount || 0), 0);
      } catch {
        return 0;
      }
    },
    enabled: memberStatus === 'member',
    staleTime: 45000,
  });

  // 5. SHU Personal
  const { data: myShuSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-shu', memberInfo?.memberNo || user?.id],
    queryFn: async () => {
      try {
        const shuRes = await api.get('/cooperative/shu/my-history');
        if (shuRes.data?.success) {
          return (shuRes.data.data || []).reduce((sum: number, h: { totalShu?: number | string }) => sum + Number(h.totalShu || 0), 0);
        }
        return 0;
      } catch {
        return 0;
      }
    },
    enabled: memberStatus === 'member',
    staleTime: 60000,
  });

  // 6. Riwayat Belanja Kasir Toko
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['cooperative-sales-history', user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/toko/history');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
    enabled: memberStatus === 'member',
    staleTime: 45000,
  });

  // 7. Pengumuman Koperasi
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
    staleTime: 60000,
  });

  // 8. Pengaturan Koperasi (Kop & Logo Struk)
  const { data: coopSettings = null } = useQuery<CoopSettingsData | null>({
    queryKey: ['cooperative-settings'],
    queryFn: fetchCoopSettings,
    staleTime: 120000,
  });

  const effectiveSavingsSum = mySavingsSum || (memberSummary?.mySavings?.total ?? 0);
  const effectiveShuSum = myShuSum || (memberSummary?.myShuEstimate?.estimatedAmount ?? 0);
  const effectiveMemberInfo = memberInfo || memberSummary?.memberInfo || null;

  // Identitas Anggota Dinamis Berdasarkan Role / MemberType
  const memberIdentity = useMemo(() => {
    const rawRole = (
      typeof user?.role === 'string'
        ? user.role
        : user?.role?.name || (user as { roleName?: string })?.roleName || ''
    ).toUpperCase();

    const memberType = (effectiveMemberInfo as { type?: string })?.type?.toUpperCase() || '';

    if (rawRole === 'SISWA' || memberType === 'STUDENT') {
      return {
        unitTitle: 'Dashboard Koperasi Siswa',
        sidebarTitle: 'Koperasi Siswa',
        sidebarCode: effectiveMemberInfo?.memberNo || 'ANGGOTA SISWA',
        categoryLabel: 'SISWA',
      };
    }
    if (rawRole === 'ANGGOTA_KOPERASI_EXTERNAL' || memberType === 'GENERAL' || memberType === 'EXTERNAL') {
      return {
        unitTitle: 'Portal Anggota Koperasi',
        sidebarTitle: 'Anggota Mitra',
        sidebarCode: effectiveMemberInfo?.memberNo || 'MITRA EKSTERNAL',
        categoryLabel: 'EKSTERNAL',
      };
    }
    return {
      unitTitle: 'Dashboard Koperasi Saya',
      sidebarTitle: 'Koperasi Saya',
      sidebarCode: effectiveMemberInfo?.memberNo || 'ANGGOTA STAF',
      categoryLabel: 'GURU & STAF',
    };
  }, [user, effectiveMemberInfo]);

  // Subtab Navigation Items with Dynamic Badges
  const navTabs: UniversalSubtabItem[] = useMemo(() => {
    const activeLoansCount = memberSummary?.myLoans?.activeLoansCount ?? 0;
    const announcementsCount = announcements.length;

    return COOP_MEMBER_SUBTABS_BASE.map((tab) => {
      let badge: string | undefined;
      let badgeColor: string | undefined;

      if (tab.id === 'pinjaman' && activeLoansCount > 0) {
        badge = `${activeLoansCount}`;
        badgeColor = 'bg-purple-500 text-white';
      } else if (tab.id === 'pengumuman' && announcementsCount > 0) {
        badge = `${announcementsCount}`;
        badgeColor = 'bg-emerald-500 text-white';
      }

      return {
        id: tab.id,
        label: tab.label,
        shortLabel: tab.shortLabel,
        category: tab.category,
        icon: tab.icon,
        badge,
        badgeColor,
      };
    });
  }, [memberSummary?.myLoans?.activeLoansCount, announcements.length]);

  const allowedTabIds = useMemo(() => new Set<CoopMemberTabId>(COOP_MEMBER_SUBTABS_BASE.map((t) => t.id)), []);

  const [activeTab, setActiveTab] = useState<CoopMemberTabId>(() => {
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Cache: Instant 0ms Subtab Switching
  const [visitedTabs, setVisitedTabs] = useState<Set<CoopMemberTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (subtabParam && allowedTabIds.has(subtabParam)) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    } else if (!subtabParam) {
      setActiveTab('ringkasan');
    }
  }, [subtabParam, allowedTabIds]);

  const handleTabSelect = useCallback(
    (tabId: CoopMemberTabId) => {
      if (!allowedTabIds.has(tabId)) return;
      setActiveTab(tabId);
      setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));

      const currentSubtab = searchParams.get('subtab') || 'ringkasan';
      if (currentSubtab !== tabId) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cooperative-member-me'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard', 'summary-member'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-savings'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-shu'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-sales-history'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-announcements'] }),
      ]);
      toast.success('Data Koperasi Anda berhasil diperbarui');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const printReceipt = useCallback((sale: Sale) => {
    if (!sale || !coopSettings) return;
    const rawName = memberInfo?.User?.full_name || memberInfo?.name || user?.full_name || 'Anggota';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  }, [coopSettings, memberInfo, user]);

  return (
    <div className={cn('space-y-4 w-full max-w-full min-w-0', className)}>
      {/* 1. Universal Topbar Mobile (< lg) */}
      <UniversalEcosystemTopbar
        ecosystem="koperasi"
        title={memberIdentity.unitTitle}
        icon={ShoppingBag}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        actions={
          <div className="flex items-center gap-1.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-2.5 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer active:scale-95 shrink-0"
                title={backLabel}
              >
                <ArrowLeft size={13} />
                <span>Kembali</span>
              </button>
            )}
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
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 flex items-center justify-center transition-all cursor-pointer"
                title="Tutup"
              >
                <X size={14} />
              </button>
            )}
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
        title={memberIdentity.unitTitle}
        subtitle={`${tpTahun ? `TP ${tpTahun}` : 'Aktif'} • ${semNama}`}
        roleBadge={memberIdentity.sidebarCode}
        scope="koperasi"
        roleIcon={ShoppingBag}
        tabs={navTabs}
        activeTab={activeTab}
        onSelectTab={(tabId) => handleTabSelect(tabId as CoopMemberTabId)}
        categories={COOP_MEMBER_CATEGORIES}
      />

      {/* 2. Desktop 2-Column Layout (Identik dengan KaprogDashboard, KesiswaanDashboard & KoperasiDashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll) */}
        <aside className="hidden lg:block sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain role-dashboard-sidebar-scroll pr-1.5 space-y-3 pb-12">
          {/* Tombol Kembali (Jika diakses dari SiswaDashboard agar tetap 1 sidebar bersih) */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{backLabel}</span>
            </button>
          )}

          {/* Identitas Anggota Koperasi Ringkas (Ecosystem Banner Accent) */}
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
                  {memberIdentity.sidebarTitle}
                </h2>
              </div>
            </div>

            {/* Badge Info Keanggotaan */}
            <div className="pt-2 border-t border-white/20 space-y-1.5 text-[11px] text-white/80 relative z-10">
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-100">ID Anggota</span>
                <span className="font-bold text-white font-mono text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md truncate max-w-[125px]">
                  {memberIdentity.sidebarCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-100">Kategori</span>
                <span className="font-bold text-emerald-100 text-[10px]">
                  {memberIdentity.categoryLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="sidebar"
          />

          {/* Navigasi Subtab Vertikal Sidebar */}
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSelect(tab.id as CoopMemberTabId)}
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
              );
            })}
          </nav>

          {/* Quick Action Refresh */}
          <div className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin')} />
              <span>Segarkan Data Koperasi</span>
            </button>
          </div>
        </aside>

        {/* Right Column: Dynamic Subtab Viewports (Keep-Alive Cache) */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* SUBTAB 1: RINGKASAN ANGGOTA */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              {memberStatus === 'loading' ? (
                <TabLoadingSkeleton />
              ) : (
                <CoopMemberSection
                  memberStatus={memberStatus}
                  memberInfo={effectiveMemberInfo}
                  user={user as CoopUserInfo | null}
                  mySavingsSum={effectiveSavingsSum}
                  myShuSum={effectiveShuSum}
                  announcements={announcements}
                  salesHistory={salesHistory}
                  salesLoading={salesLoading}
                  printReceipt={printReceipt}
                  memberSummary={memberSummary}
                />
              )}
            </div>
          )}

          {/* SUBTAB 2: SIMPANAN SAYA */}
          {visitedTabs.has('simpanan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'simpanan'}
              className={cn('w-full min-w-0', activeTab === 'simpanan' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <Savings hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 3: PINJAMAN & KREDIT */}
          {visitedTabs.has('pinjaman') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'pinjaman'}
              className={cn('w-full min-w-0', activeTab === 'pinjaman' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <Loans hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 4: SISA HASIL USAHA (SHU) */}
          {visitedTabs.has('shu') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'shu'}
              className={cn('w-full min-w-0', activeTab === 'shu' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <SHUPage hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 5: KATALOG TOKO */}
          {visitedTabs.has('produk') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'produk'}
              className={cn('w-full min-w-0', activeTab === 'produk' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <Products hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 6: POIN & VOUCHER */}
          {visitedTabs.has('voucher') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'voucher'}
              className={cn('w-full min-w-0', activeTab === 'voucher' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <Vouchers hideLayout={true} mode="member" />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 7: SIDANG RAT & VOTING */}
          {visitedTabs.has('rat') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'rat'}
              className={cn('w-full min-w-0', activeTab === 'rat' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <RatMeetingPage hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 8: PAPAN PENGUMUMAN */}
          {visitedTabs.has('pengumuman') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'pengumuman'}
              className={cn('w-full min-w-0', activeTab === 'pengumuman' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <Announcements hideLayout={true} />
              </Suspense>
            </div>
          )}

          {/* SUBTAB 9: TIKET & BANTUAN */}
          {visitedTabs.has('tiket') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'tiket'}
              className={cn('w-full min-w-0', activeTab === 'tiket' ? 'block' : 'hidden')}
            >
              <Suspense fallback={<TabLoadingSkeleton />}>
                <Tickets hideLayout={true} />
              </Suspense>
            </div>
          )}
        </main>
      </div>

      {/* Modal Visual Receipt */}
      {showReceiptModal && selectedSale && (
        <Suspense fallback={null}>
          <ReceiptModal
            isOpen={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false);
              setSelectedSale(null);
            }}
            selectedSale={selectedSale}
            coopSettings={coopSettings}
            memberInfo={memberInfo}
            user={user as CoopUserInfo | null}
            printReceipt={printReceipt}
          />
        </Suspense>
      )}
    </div>
  );
});

UniversalCoopMemberView.displayName = 'UniversalCoopMemberView';
