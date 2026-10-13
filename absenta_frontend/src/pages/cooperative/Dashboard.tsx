import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, UserCheck, ShieldCheck } from 'lucide-react';
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
import { CoopManagementDashboard } from './components/CoopManagementDashboard';
import { CoopMemberDashboard, type MemberInfo } from './components/CoopMemberDashboard';

const CoopTvMode = lazy(() => import('./components/CoopTvMode').then(m => ({ default: m.CoopTvMode })));
const ReceiptModal = lazy(() => import('./components/ReceiptModal').then(m => ({ default: m.ReceiptModal })));

const Dashboard: React.FC = React.memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, subscription } = useAuthStore();
  const { isTvMode } = useTvStore();
  const [currentScene, setCurrentScene] = useState(0);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { isKoperasi, isKoperasiHead, isKoperasiFinance, isKoperasiStore, isAdmin } = useCapabilities();
  const isKoperasiStaff = isAdmin || isKoperasi || isKoperasiHead || isKoperasiFinance || isKoperasiStore;
  const isGuruOrSiswa = !isKoperasiStaff;

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

  const memberStatus = useMemo<'loading' | 'member' | 'non-member'>(() => {
    if (!isGuruOrSiswa && activeTab === 'management') return 'member';
    if (loadingMemberInfo) return 'loading';
    return memberInfo && memberInfo.status === 'ACTIVE' ? 'member' : 'non-member';
  }, [isGuruOrSiswa, activeTab, loadingMemberInfo, memberInfo]);

  // Statistik Agregat Koperasi (Hanya untuk pengelola atau mode TV)
  const { data: stats = { totalMembers: 0, totalSavings: 0, totalLoans: 0, dueInstallments: 0 }, isLoading: loadingStats, dataUpdatedAt } = useQuery({
    queryKey: ['cooperative-dashboard-stats'],
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
  });

  // Tabungan Personal Anggota
  const { data: mySavingsSum = 0 } = useQuery<number>({
    queryKey: ['cooperative-my-savings', memberInfo?.memberNo],
    queryFn: async () => {
      const savingsRes = await api.get('/cooperative/savings');
      return (savingsRes.data || []).reduce((sum: number, s: { amount?: number | string }) => sum + Number(s.amount || 0), 0);
    },
    enabled: memberStatus === 'member' || activeTab === 'member',
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
  });

  // Riwayat Belanja Kasir Toko Anggota
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['cooperative-sales-history'],
    queryFn: async () => {
      const res = await api.get('/cooperative/toko/history');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: memberStatus === 'member' || activeTab === 'member',
  });

  // Pengaturan Koperasi (untuk cetak struk)
  const { data: coopSettings = null } = useQuery<CoopSettingsData | null>({
    queryKey: ['cooperative-settings'],
    queryFn: fetchCoopSettings,
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

  if (isTvMode) {
    return (
      <Suspense fallback={<div className="p-8 text-center text-white">Memuat TV Mode...</div>}>
        <CoopTvMode
          isGuruOrSiswa={isGuruOrSiswa}
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          lastRefresh={lastRefresh}
          mySavingsSum={mySavingsSum}
          myShuSum={myShuSum}
          memberInfo={memberInfo}
          user={user as CoopUserInfo | null}
          announcements={announcements}
          salesHistory={salesHistory}
          stats={stats}
          chartData={chartData}
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
            <CoopFiscalYearSelector showSetDefaultButton />
            <div className="flex justify-end">
              <TvModeToggle />
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
              <CoopManagementDashboard
                stats={stats}
                loadingStats={loadingStats}
                chartData={stats.monthlyTrend || emptyMonthlyTrend}
                announcements={announcements}
                criticalStock={criticalStock}
                criticalStockLoading={criticalStockLoading}
              />
            ) : (
              <CoopMemberDashboard
                memberStatus={memberStatus}
                memberInfo={memberInfo}
                user={user}
                mySavingsSum={mySavingsSum}
                myShuSum={myShuSum}
                announcements={announcements}
                salesHistory={salesHistory}
                salesLoading={salesLoading}
                printReceipt={printReceipt}
              />
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
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

Dashboard.displayName = 'CooperativeDashboard';

export default Dashboard;
