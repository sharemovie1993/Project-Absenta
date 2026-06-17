import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  MapPin
} from 'lucide-react';
import { requestWithFallback } from '@/api/apiUtils';
import type { StandardApiResponse } from '@/api/apiUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

interface AssetStats {
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

const SarprasDashboard: React.FC = () => {
  const { user, subscription } = useAuthStore();
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dummyCallback = useCallback(() => {}, []);

  // Gating Logic
  const features = useMemo(() => {
    const sub = subscription as SubscriptionFeature;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => {
    return !Array.isArray(features) || !features.includes('SARPRAS');
  }, [features]);

  useEffect(() => {
    if (subscription === undefined) return;

    const fetchStats = async () => {
      if (isLocked) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await requestWithFallback<StandardApiResponse<AssetStats>>('get', '/sarpras/assets/stats');
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [subscription, isLocked]);

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
      desc: 'Seluruh aset di yurisdiksi Anda'
    },
    { 
      label: 'Tersedia', 
      value: stats?.available || 0, 
      icon: CheckCircle2, 
      color: 'emerald',
      desc: 'Ready untuk dipinjamkan'
    },
    { 
      label: 'Sedang Dipinjam', 
      value: stats?.borrowed || 0, 
      icon: History, 
      color: 'amber',
      desc: 'Saat ini dibawa oleh siswa/guru'
    },
    { 
      label: 'Kondisi Rusak', 
      value: stats?.repair || 0, 
      icon: AlertCircle, 
      color: 'rose',
      desc: 'Membutuhkan perbaikan segera'
    },
  ], [stats]);

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
          <div className="bg-white/60 backdrop-blur-md border border-white p-1 rounded-xl flex gap-1 shadow-sm">
             <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {stats?.jurisdiction?.type === 'unit' ? `Unit: ${stats.jurisdiction.name}` : 'Global Access'}
                </span>
             </div>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Stats Grid */}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Actions & Activity */}
            <div className="lg:col-span-2 space-y-8">
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

              {/* Recent Logs Placeholder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Transaksi Terakhir
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs text-primary font-bold">
                    Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                
                {[1, 2, 3]?.map((_, i) => (
                  <div key={i} className="bg-white/40 backdrop-blur-sm border border-white/60 p-4 rounded-xl flex items-center justify-between hover:bg-white/60 transition-all cursor-default group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Box size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Kameramen Kit #0{i+1}</h4>
                        <p className="text-xs text-slate-500">Dipinjam oleh Ahmad (XI TKJ 1)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">OUT</Badge>
                      <p className="text-[10px] text-slate-400 mt-1">2 jam yang lalu</p>
                    </div>
                  </div>
                ))}
              </div>
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
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default SarprasDashboard;
