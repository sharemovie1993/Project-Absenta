import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { 
  Building2, Users, Briefcase, GraduationCap
} from 'lucide-react';
import { useTvStore } from '@/store/tvStore';
import { hubinApi } from '@/api/hubin.api';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { 
  type HubinStats, type HubinActivity 
} from './components/HubinDashboardComponents';
import { HubinDashboard as HubinDashboardComponent } from '@/components/dashboard/roles/HubinDashboard';
import { HubinDashboardSkeleton } from '@/components/dashboard/roles/hubin/HubinDashboardSkeleton';
import { useQuery } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useIsMobile } from '@/hooks/useIsMobile';

const HubinTvModeLayout = React.lazy(() => import('./components/HubinTvModeLayout').then(m => ({ default: m.HubinTvModeLayout })));

export const HubinDashboardPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user, subscription } = useAuthStore();
  const { isTvMode } = useTvStore();
  const { can } = useCapabilities();
  const isMobile = useIsMobile();

  const canViewHubinDashboard = useMemo(() => can('dashboard.view.hubin'), [can]);

  // Gracefully redirect teachers/pembimbing to their guidance page instead of showing Access Denied
  useEffect(() => {
    if (!canViewHubinDashboard && can('hubin.guidance.manage')) {
      navigate('/hubin/penempatan', { replace: true });
    }
  }, [canViewHubinDashboard, can, navigate]);

  const [currentScene, setCurrentScene] = useState(0);

  // React Query Data Fetching for TV Mode
  const { data: statsRes, isLoading: loading, dataUpdatedAt } = useQuery({
    queryKey: ['hubin-dashboard-stats'],
    queryFn: () => hubinApi.getStats(),
    enabled: subscription !== undefined && canViewHubinDashboard,
    refetchInterval: isTvMode ? 60_000 : false,
    staleTime: 30_000,
  });

  const { data: actRes } = useQuery({
    queryKey: ['hubin-recent-activities'],
    queryFn: () => hubinApi.getRecentActivity(),
    enabled: subscription !== undefined && canViewHubinDashboard,
    refetchInterval: isTvMode ? 60_000 : false,
    staleTime: 30_000,
  });

  const stats = (statsRes?.data as HubinStats) || null;
  const activities = (actRes?.data as HubinActivity[]) || [];
  const lastRefresh = useMemo(() => new Date(dataUpdatedAt || Date.now()), [dataUpdatedAt]);

  // TV Mode Auto Rotation
  useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTvMode]);

  const instruction = useMemo(() => ({
    title: "Panduan Portal Hubungan Industri (HUBIN)",
    items: [
      { text: "Dashboard Hubin menampilkan ringkasan data keterserapan alumni dan keaktifan PKL." },
      { text: "Gunakan menu sidebar utama untuk mengakses sub-modul HUBIN lainnya." }
    ]
  }), []);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Hubin Dashboard', path: '/hubin/dashboard' }
  ], []);

  const statCards = useMemo(() => [
    { 
      label: 'Mitra Industri', 
      value: stats?.totalMitra || 0, 
      icon: Building2, 
      color: 'indigo',
      desc: 'DU-DI rekanan terdaftar'
    },
    { 
      label: 'PKL Aktif', 
      value: stats?.pklAktif || 0, 
      icon: Users, 
      color: 'emerald',
      desc: stats?.pklOverdue 
        ? `${stats.pklOverdue} periode berakhir (siap ditarik)` 
        : `Dari ${stats?.totalSiswaPkl || 0} terdaftar PKL`
    },
    { 
      label: 'PKL Selesai', 
      value: (() => {
        const selesai = Number(
          stats?.pklSelesai ?? 
          stats?.penilaianStats?.selesaiPraktikCount ?? 
          Math.max(0, Number(stats?.totalSiswaPkl || 0) - Number(stats?.pklAktif || 0))
        );
        return selesai + Number(stats?.pklOverdue || 0);
      })(), 
      icon: GraduationCap, 
      color: 'purple',
      desc: stats?.pklOverdue 
        ? `${stats.pklOverdue} periode berakhir (siap ditarik)` 
        : `${Number(stats?.pklSelesai ?? stats?.penilaianStats?.selesaiPraktikCount ?? Math.max(0, Number(stats?.totalSiswaPkl || 0) - Number(stats?.pklAktif || 0)))} tuntas dari plotting PKL`
    },
    { 
      label: 'Lowongan BKK', 
      value: stats?.totalLowonganAktif || 0, 
      icon: Briefcase, 
      color: 'sky',
      desc: 'Dibuka di portal BKK sekolah'
    },
  ], [stats]);

  const scenes = useMemo(() => [
    { title: "Statistik Kemitraan & Siswa PKL", desc: "Kondisi keseluruhan mitra industri & siswa PKL aktif" },
    { title: "Keterserapan Lulusan & Tracer Study", desc: "Statistik penyerapan alumni dan program keahlian" },
    { title: "Log Penempatan PKL Siswa & Partner Teratas", desc: "Aktivitas penempatan siswa PKL baru-baru ini" },
    { title: "Timeline Log Audit Trail Hubin", desc: "Log riwayat aktivitas tim hubungan industri" }
  ], []);

  if (isTvMode) {
    return (
      <React.Suspense fallback={<div className="fixed inset-0 bg-slate-900 flex items-center justify-center text-white font-bold">Memuat TV Mode...</div>}>
        <HubinTvModeLayout
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          scenes={scenes}
          lastRefresh={lastRefresh}
          stats={stats}
          activities={activities}
          statCards={statCards}
        />
      </React.Suspense>
    );
  }

  if (loading && !stats) {
    return (
      <PremiumFeatureGate
        moduleName="HUBIN"
        featureName="Pusat Kendali Hubungan Industri"
        description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri."
      >
        <AcademicPageLayout 
          hardeningModuleKey="hubin_dashboard"
          breadcrumbs={breadcrumbs}
          instruction={instruction}
        >
          <HubinDashboardSkeleton />
        </AcademicPageLayout>
      </PremiumFeatureGate>
    );
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Pusat Kendali Hubungan Industri"
      description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri, mencakup pengelolaan mitra, MoU, program PKL, BKK lowongan kerja, Tracer Study alumni, dan Teaching Factory."
    >
      <AcademicPageLayout 
        hardeningModuleKey="hubin_dashboard"
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        topSlot={!isMobile ? <WorkspaceAppLauncherCard workspaceId="HUBIN_WORKSPACE" /> : undefined}
      >
        <div className="pt-1">
          <HubinDashboardComponent />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

HubinDashboardPage.displayName = 'HubinDashboardPage';

export default HubinDashboardPage;
