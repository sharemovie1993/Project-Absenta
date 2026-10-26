import { formatDate } from '@/utils/date.utils';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { motion } from 'framer-motion';
import { 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowRight,
  Box,
  TrendingUp,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { requestWithFallback } from '@/api/apiUtils';
import type { StandardApiResponse } from '@/api/apiUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { useTvStore } from '@/store/tvStore';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { sarprasApi } from '@/api/sarpras.api';
import { 
  Divider, 
  UnreturnedLoansList, 
  RecentTransactionsList, 
  MaintenanceAlertsList,
  type LoanRecord,
  type RepairRecord
} from '@/components/sarpras/dashboard/SarprasDashboardComponents';
import { SarprasTvModeLayout } from '@/components/sarpras/dashboard/SarprasTvModeLayout';
import { SarprasDashboard as SarprasDashboardComponent } from '@/components/dashboard/roles/SarprasDashboard';

export interface AssetStats {
  total: number;
  available: number;
  borrowed: number;
  repair: number;
  jurisdiction: {
    type: string;
    name: string;
  };
}

interface SubscriptionFeature {
  features?: string[];
  Plan?: {
    features_json?: string[];
  };
  plan?: {
    features_json?: string[];
  };
}

const SarprasDashboard: React.FC = React.memo(() => {
  const { user, subscription } = useAuthStore();
  const { isSarpras, isAdmin, can } = useCapabilities();
  const { isTvMode } = useTvStore();
  const [currentScene, setCurrentScene] = useState(0);

  // TV Mode Auto Rotation
  useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(interval);
  }, [isTvMode]);

  // Gating Logic
  const features = useMemo(() => {
    const sub = subscription as SubscriptionFeature;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => {
    return !Array.isArray(features) || !features.includes('SARPRAS');
  }, [features]);

  // ── Query Hooks ──
  const { data: stats = null, isLoading: loadingStats, dataUpdatedAt } = useQuery<AssetStats | null>({
    queryKey: ['sarpras-stats'],
    queryFn: async () => {
      const statsRes = await requestWithFallback<StandardApiResponse<AssetStats>>('get', '/sarpras/assets/stats');
      return statsRes.success && statsRes.data ? statsRes.data : null;
    },
    refetchInterval: isTvMode ? 60000 : false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: loans = [], isLoading: loadingLoans } = useQuery<LoanRecord[]>({
    queryKey: ['sarpras-loans-recent'],
    queryFn: async () => {
      const loansRes = await sarprasApi.getLoans({ limit: 50 });
      if (loansRes.success && loansRes.data) {
        return Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.list || []);
      }
      return [];
    },
    refetchInterval: isTvMode ? 60000 : false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: repairs = [], isLoading: loadingRepairs } = useQuery<RepairRecord[]>({
    queryKey: ['sarpras-repairs-active'],
    queryFn: async () => {
      const repairsRes = await sarprasApi.getRepairs({ limit: 50, status: 'PROSES' });
      if (repairsRes.success && repairsRes.data) {
        return Array.isArray(repairsRes.data) ? repairsRes.data : (repairsRes.data?.list || []);
      }
      return [];
    },
    refetchInterval: isTvMode ? 60000 : false,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingStats || loadingLoans || loadingRepairs;
  const lastRefresh = useMemo(() => new Date(dataUpdatedAt || Date.now()), [dataUpdatedAt]);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Sarpras', path: '/sarpras' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Toolman Dashboard',
    description: 'Pusat kontrol pemantauan aset, transaksi cepat peminjaman, dan status sistem online.',
    items: [
      { text: 'Pantau grafik status kondisi aset secara berkala (Total, Tersedia, Dipinjam, Rusak).' },
      { text: 'Gunakan aksi cepat untuk mempercepat peminjaman barang praktikum secara digital.' },
      { text: 'Pastikan yurisdiksi unit Anda sesuai dengan tugas operasional yang berlaku.' }
    ]
  }), []);

  const statCards = useMemo(() => [
    { 
      label: 'Total Barang', 
      value: stats?.total || 0, 
      icon: Package, 
      color: 'blue',
      desc: 'Total aset terdaftar'
    },
    { 
      label: 'Tersedia', 
      value: stats?.available || 0, 
      icon: CheckCircle2, 
      color: 'emerald',
      desc: 'Aset siap dipinjam'
    },
    { 
      label: 'Sedang Dipinjam', 
      value: stats?.borrowed || 0, 
      icon: History, 
      color: 'amber',
      desc: 'Aset sedang dipinjam'
    },
    { 
      label: 'Kondisi Rusak', 
      value: stats?.repair || 0, 
      icon: AlertCircle, 
      color: 'rose',
      desc: 'Perlu perbaikan segera'
    },
  ], [stats]);

  const scenes = useMemo(() => [
    { title: "Statistik & Ketersediaan Aset Gudang", desc: "Kondisi keseluruhan inventori sarana prasarana sekolah" },
    { title: "Log Transaksi & Penagihan Aset (OUT/IN)", desc: "Status peminjaman terbaru dan daftar barang belum kembali" },
    { title: "Peringatan Pemeliharaan & Perbaikan Aktif", desc: "Daftar aset rusak yang dalam proses maintenance" },
    { title: "Status Operasional & Yurisdiksi Gudang", desc: "Detail unit akses yurisdiksi sarpras" }
  ], []);

  if (isTvMode) {
    return (
      <SarprasTvModeLayout
        currentScene={currentScene}
        setCurrentScene={setCurrentScene}
        scenes={scenes}
        lastRefresh={lastRefresh}
        stats={stats}
        loans={loans}
        repairs={repairs}
        statCards={statCards}
      />
    );
  }

  return (
    <PremiumFeatureGate
      moduleName="SARPRAS"
      featureName="Dashboard Manajemen Aset"
      description="Pantau seluruh aset sekolah, status peminjaman, dan jadwal pemeliharaan barang dalam satu dashboard terintegrasi."
    >
      <AcademicPageLayout
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="sarpras_dashboard"
        topSlot={<WorkspaceAppLauncherCard workspaceId="SARPRAS_WORKSPACE" />}
      >
        <div className="pt-1">
          <SarprasDashboardComponent />
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default SarprasDashboard;
