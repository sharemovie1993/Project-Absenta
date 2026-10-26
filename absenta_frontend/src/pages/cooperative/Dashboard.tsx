import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, UserCheck, RefreshCw } from 'lucide-react';
import api from '../../lib/axiosInstance';
import { SectionCard } from '../../components/ui';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { printCoopReceipt, fetchCoopSettings, type CoopSettingsData } from '../../utils/cooperative/coopDocUtils';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import { useTvStore } from '../../store/tvStore';
import { TvModeToggle } from '../../components/ui/TvModeToggle';
import type { CriticalStockItem, Announcement, Sale, CoopUserInfo } from '@/components/cooperative/types';
import { CoopFiscalYearSelector } from '../../components/cooperative/shared/CoopFiscalYearSelector';
import { formatDate } from '../../utils/date.utils';
import type { MemberInfo, MemberDashboardSummary } from '@/components/cooperative/dashboard/types';
import { CoopSetupProgressBanner } from '../../components/cooperative/setup/CoopSetupProgressBanner';
import { CoopSetupWizardModal } from '../../components/cooperative/setup/CoopSetupWizardModal';

export const coopDashboardKeys = {
  all: ['cooperative-dashboard'] as const,
  stats: () => [...coopDashboardKeys.all, 'stats'] as const,
  summaryMember: (userId?: string) => [...coopDashboardKeys.all, 'summary-member', userId] as const,
  quickActions: () => [...coopDashboardKeys.all, 'quick-actions'] as const,
};

const CoopManagementSection = lazy(() => import('@/components/cooperative/dashboard/CoopManagementSection').then(m => ({ default: m.CoopManagementSection })));
const CoopMemberSection = lazy(() => import('@/components/cooperative/dashboard/CoopMemberSection').then(m => ({ default: m.CoopMemberSection })));
const CoopTvMode = lazy(() => import('./components/CoopTvMode').then(m => ({ default: m.CoopTvMode })));
const ReceiptModal = lazy(() => import('./components/ReceiptModal').then(m => ({ default: m.ReceiptModal })));
import { KoperasiDashboard as KoperasiDashboardComponent } from '@/components/dashboard/roles/KoperasiDashboard';

const Dashboard: React.FC = React.memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, subscription } = useAuthStore();
  const { isTvMode } = useTvStore();
  const [currentScene, setCurrentScene] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const { isKoperasi, isKoperasiHead, isKoperasiFinance, isKoperasiStore, isAdmin } = useCapabilities();
  const isKoperasiStaff = isAdmin || isKoperasi || isKoperasiHead || isKoperasiFinance || isKoperasiStore;
  const isGuruOrSiswa = !isKoperasiStaff;

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coopDashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-announcements'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-critical-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-member-me'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-savings'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-my-shu'] }),
        queryClient.invalidateQueries({ queryKey: ['cooperative-sales-history'] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  // Context View Switcher State
  const tabParam = searchParams.get('tab');
  const activeTab: 'management' | 'member' = useMemo(() => {
    if (!isKoperasiStaff) return 'member';
    if (tabParam === 'member') return 'member';
    return 'management';
  }, [isKoperasiStaff, tabParam]);

  const handleTabChange = useCallback((tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'member') {
        next.set('tab', 'member');
      } else {
        next.delete('tab');
      }
      return next;
    });
  }, [setSearchParams]);

  const tabOptions: TabOption[] = useMemo(() => [
    { id: 'management', label: 'Dashboard Pengelola', icon: LayoutDashboard },
    { id: 'member', label: 'Akun Anggota Saya', icon: UserCheck },
  ], []);

  // Default empty monthly trend
  const emptyMonthlyTrend = useMemo(() => [], []);

  // ── React Query Hooks ──
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
    enabled: isGuruOrSiswa || activeTab === 'member',
  });

  // Ringkasan Akun Personal Anggota (Dedicated Fast Endpoint)
  const { data: memberSummaryRes } = useQuery<{ success: boolean; data: MemberDashboardSummary }>({
    queryKey: coopDashboardKeys.summaryMember(user?.id),
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/dashboard/summary-member');
        return res.data;
      } catch {
        return { success: false, data: null as any };
      }
    },
    enabled: subscription !== undefined && (isGuruOrSiswa || activeTab === 'member'),
    staleTime: 45000,
  });
  const memberSummary = memberSummaryRes?.data || null;

  const memberStatus = useMemo<'loading' | 'member' | 'non-member'>(() => {
    if (!isGuruOrSiswa && activeTab === 'management') return 'member';
    if (loadingMemberInfo) return 'loading';
    if (memberSummary?.isMember) return 'member';
    return memberInfo && memberInfo.status === 'ACTIVE' ? 'member' : 'non-member';
  }, [isGuruOrSiswa, activeTab, loadingMemberInfo, memberInfo, memberSummary]);

  // Statistik Agregat Koperasi (Hanya untuk pengelola atau mode TV)
  const { data: stats = { totalMembers: 0, totalSavings: 0, totalLoans: 0, dueInstallments: 0 }, isLoading: loadingStats, dataUpdatedAt } = useQuery({
    queryKey: coopDashboardKeys.stats(),
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
    enabled: subscription !== undefined && (isKoperasiStaff || isTvMode),
    refetchInterval: isTvMode ? 60000 : false,
    staleTime: 30000,
  });

  // Pengumuman Koperasi
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
    enabled: subscription !== undefined,
    staleTime: 60000,
  });

  // Stok Kritis Minimarket Koperasi (Khusus Staf Pengelola)
  const { data: criticalStock = [], isLoading: criticalStockLoading } = useQuery<CriticalStockItem[]>({
    queryKey: ['cooperative-critical-stock'],
    queryFn: async () => {
      const res = await api.get('/cooperative/reports/inventory/stock');
      const items = res.data?.items || [];
      return items.filter((item: CriticalStockItem) => item.status === 'HABIS' || item.status === 'RENDAH');
    },
    enabled: isKoperasiStaff && activeTab === 'management',
    refetchInterval: isTvMode ? 60000 : false,
    staleTime: 30000,
  });

  // Tabungan Personal Anggota
  const { data: mySavingsSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-savings', memberInfo?.memberNo],
    queryFn: async () => {
      const savingsRes = await api.get('/cooperative/savings');
      return (savingsRes.data || []).reduce((sum: number, s: { amount?: number | string }) => sum + Number(s.amount || 0), 0);
    },
    enabled: memberStatus === 'member' || activeTab === 'member',
    staleTime: 45000,
  });

  // SHU Personal Anggota
  const { data: myShuSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-shu', memberInfo?.memberNo],
    queryFn: async () => {
      const shuRes = await api.get('/cooperative/shu/my-history');
      if (shuRes.data?.success) {
        return (shuRes.data.data || []).reduce((sum: number, h: { totalShu?: number | string }) => sum + Number(h.totalShu || 0), 0);
      }
      return 0;
    },
    enabled: memberStatus === 'member' || activeTab === 'member',
    staleTime: 60000,
  });

  // Riwayat Belanja Kasir Toko Anggota
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['cooperative-sales-history'],
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/history');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: memberStatus === 'member' || activeTab === 'member',
    staleTime: 45000,
  });

  // Pengaturan Koperasi (untuk cetak struk)
  const { data: coopSettings = null } = useQuery<CoopSettingsData | null>({
    queryKey: ['cooperative-settings'],
    queryFn: fetchCoopSettings,
    staleTime: 120000,
  });

  const lastRefresh = useMemo(() => new Date(dataUpdatedAt || Date.now()), [dataUpdatedAt]);

  // TV Mode Auto Rotation
  useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTvMode]);

  const printReceipt = useCallback((sale: Sale) => {
    if (!sale || !coopSettings) return;
    const rawName = memberInfo?.User?.full_name || memberInfo?.name || user?.full_name || 'Tamu';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  }, [coopSettings, memberInfo, user]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', path: '/cooperative' },
    { label: 'Dashboard', path: '/cooperative/dashboard' },
  ], []);

  const effectiveSavingsSum = mySavingsSum || (memberSummary?.mySavings?.total ?? 0);
  const effectiveShuSum = myShuSum || (memberSummary?.myShuEstimate?.estimatedAmount ?? 0);
  const effectiveMemberInfo = memberInfo || memberSummary?.memberInfo || null;

  if (isTvMode) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-white">Memuat TV Mode...</div>}>
        <CoopTvMode
          isGuruOrSiswa={isGuruOrSiswa}
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          lastRefresh={lastRefresh}
          mySavingsSum={effectiveSavingsSum}
          myShuSum={effectiveShuSum}
          memberInfo={effectiveMemberInfo}
          user={user as CoopUserInfo | null}
          announcements={announcements}
          salesHistory={salesHistory}
          stats={stats}
          chartData={stats.monthlyTrend || emptyMonthlyTrend}
          criticalStockLoading={criticalStockLoading}
          criticalStock={criticalStock}
        />
      </Suspense>
    );
  }

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI" 
      featureName="Dashboard Koperasi"
    >
      <AcademicPageLayout
        title="Dashboard Koperasi"
        description={
          activeTab === 'management'
            ? 'Ringkasan aktivitas, performa keuangan, dan operasional koperasi sekolah'
            : 'Ringkasan saldo tabungan, SHU, dan riwayat belanja Anda di koperasi'
        }
        hardeningModuleKey="coop_dashboard"
        breadcrumbs={breadcrumbs}
        topSlot={
          <div className="space-y-3">
            <WorkspaceAppLauncherCard workspaceId="COOPERATIVE_WORKSPACE" />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <CoopFiscalYearSelector showSetDefaultButton />
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  disabled={isRefreshing}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  title="Segarkan Data Realtime"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary-600' : 'text-slate-500'} />
                  <span className="hidden sm:inline">{isRefreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
                </button>
                <TvModeToggle />
              </div>
            </div>
          </div>
        }
        instruction={{
          title: activeTab === 'management' ? 'Panduan Dashboard Pengelola' : 'Panduan Dashboard Anggota',
          description: activeTab === 'management'
            ? 'Pantau statistik anggota, simpanan agregat, pinjaman, dan perputaran kas dalam satu layar.'
            : 'Pantau saldo tabungan aktif, hak pembagian SHU, dan riwayat belanja mandiri Anda.',
          items: activeTab === 'management'
            ? [
                { text: 'Pantau ringkasan total anggota dan sirkulasi dana pada kartu statistik.' },
                { text: 'Analisis grafik simpanan vs pinjaman untuk melihat tren keuangan bulanan.' },
                { text: 'Pantau persediaan minimarket yang menipis pada kartu peringatan stok kritis.' },
                { text: 'Beralih ke tab "Akun Anggota Saya" untuk melihat transaksi belanja atau tabungan pribadi Anda.' },
              ]
            : [
                { text: 'Periksa saldo simpanan aktif Anda dan status verifikasi keanggotaan koperasi.' },
                { text: 'Lihat akumulasi pembagian deviden SHU yang telah diterima.' },
                { text: 'Cek riwayat transaksi belanja kasir minimarket dan cetak ulang struk mandiri.' },
                { text: 'Ikuti pengumuman resmi pengurus koperasi sekolah di bagian informasi.' },
              ],
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Onboarding & Setup Wizard Banner (Khusus Pengurus/Staf Koperasi) */}
            {isKoperasiStaff && (
              <CoopSetupProgressBanner onOpenWizard={() => setShowSetupWizard(true)} />
            )}

            {/* Tab Context View Switcher (Khusus Pengurus/Staf Koperasi) */}
            {isKoperasiStaff && (
              <div className="flex items-center justify-between pb-1 overflow-x-auto">
                <TabSwitcher
                  tabs={tabOptions}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                />
              </div>
            )}

            {/* Rendering View Sesuai Context Mode */}
            {activeTab === 'management' ? (
              <KoperasiDashboardComponent />
            ) : (
              <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium text-xs">Memuat Dashboard Anggota...</div>}>
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
              </Suspense>
            )}
          </div>
        </SectionCard>

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

        {/* Modal Setup & Onboarding Wizard */}
        <CoopSetupWizardModal
          isOpen={showSetupWizard}
          onClose={() => setShowSetupWizard(false)}
        />
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

Dashboard.displayName = 'CooperativeDashboard';

export default Dashboard;
