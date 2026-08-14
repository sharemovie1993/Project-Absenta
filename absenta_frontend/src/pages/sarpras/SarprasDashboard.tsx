import React, { useEffect, useState, useMemo } from 'react';
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
} from './components/SarprasDashboardComponents';
import { SarprasTvModeLayout } from './components/SarprasTvModeLayout';

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
        title="Toolman Dashboard"
        description={`Halo ${user?.full_name || 'User'}, selamat datang di pusat kendali aset Anda.`}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="sarpras_dashboard"
        toolbar={
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 p-1 rounded-xl flex gap-2 shadow-sm items-center">
             <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {stats?.jurisdiction?.type === 'unit' ? `Unit: ${stats.jurisdiction.name}` : 'Global Access'}
                </span>
             </div>
             <TvModeToggle />
             <Link
               to="/sarpras/inventory"
               className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer select-none shrink-0"
             >
               <span>Buka Ruang Kerja</span>
               <ArrowRight size={14} />
             </Link>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Bagian I: Ringkasan Aset & Kondisi Terkini */}
          <Divider title="Bagian I: Ringkasan Aset & Kondisi Terkini" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards?.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-full"
              >
                <AnalyticsCard
                  title={card.label}
                  value={card.value}
                  isLoading={isLoading}
                  icon={<card.icon size={20} />}
                  gradient={
                    card.color === 'blue'
                      ? 'from-blue-600 to-indigo-500'
                      : card.color === 'emerald'
                      ? 'from-emerald-600 to-teal-500'
                      : card.color === 'amber'
                      ? 'from-amber-500 to-orange-500'
                      : 'from-rose-600 to-red-500'
                  }
                  subtitle={card.desc}
                />
              </motion.div>
            ))}
          </div>

          {/* Bagian II: Transaksi Peminjaman Terbaru & Aset Belum Kembali */}
          <Divider title="Bagian II: Transaksi Peminjaman Terbaru & Aset Belum Kembali" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentTransactionsList loans={loans} />
            <UnreturnedLoansList loans={loans} />
          </div>

          {/* Bagian III: Peringatan Aset Rusak & Pemeliharaan */}
          <Divider title="Bagian III: Peringatan Aset Rusak & Pemeliharaan" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <MaintenanceAlertsList repairs={repairs} />
            </div>
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl flex items-start gap-4">
                <div className="bg-emerald-500 p-2 rounded-xl text-white">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-800">Sistem Online</h4>
                  <p className="text-[11px] text-emerald-600 mt-1 leading-relaxed">Pencatatan dilakukan secara real-time. Laporkan jika ada kendala sistem.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bagian IV: Aksi Cepat Operasional Toolman */}
          <Divider title="Bagian IV: Aksi Cepat Operasional Toolman" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Actions */}
            <div className="lg:col-span-2">
              <SectionCard title="Aktivitas Cepat" icon={TrendingUp} fullWidth>
                <div className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button className="h-20 rounded-xl flex flex-col items-start gap-1 justify-center px-6 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 bottom-0 w-24 bg-white/5 skew-x-12 translate-x-12 group-hover:translate-x-8 transition-all" />
                      <span className="text-sm font-bold">Pinjamkan Barang</span>
                      <span className="text-[10px] opacity-70">Scan barcode atau pilih manual</span>
                    </Button>
                    <Button variant="outline" className="h-20 rounded-xl border-white/60 bg-white/40 flex flex-col items-start gap-1 justify-center px-6 hover:bg-white transition-all">
                      <span className="text-sm font-bold">Data Pengembalian</span>
                      <span className="text-[10px] text-muted-foreground">Lihat daftar barang dipinjam</span>
                    </Button>
                  </div>
                </div>
              </SectionCard>
            </div>
            {/* Sidebar Info */}
            <div className="space-y-6">
              <Card className="border-primary/20 shadow-2xl bg-primary shadow-primary/20 text-white rounded-xl overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                 <div className="p-8 space-y-6">
                    <Package className="w-12 h-12 opacity-80" />
                    <div>
                      <h3 className="text-2xl font-black">Cek Inventaris</h3>
                      <p className="text-sm opacity-80 mt-2">Pastikan semua barang di unit {stats?.jurisdiction?.name || ''} selalu dalam kondisi optimal untuk praktikum.</p>
                    </div>
                    <Button variant="secondary" className="w-full rounded-xl font-bold bg-white text-primary hover:bg-slate-100">
                      Pergi ke Gudang
                    </Button>
                 </div>
              </Card>
            </div>
          </div>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default SarprasDashboard;
