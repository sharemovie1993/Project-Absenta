import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { 
  Building2, Users, ClipboardList, Briefcase, GraduationCap, 
  Activity, AlertTriangle, ArrowRight, TrendingUp, Clock, Award
} from 'lucide-react';
import { useTvStore } from '@/store/tvStore';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { hubinApi } from '@/api/hubin.api';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { 
  Divider, TracerStudyUraian, TopJurusanList, RecentPklTable, 
  TopMitraGrid, ActivityLogTimeline, type HubinStats, type HubinActivity 
} from './components/HubinDashboardComponents';
import { HubinTvModeLayout } from './components/HubinTvModeLayout';

import { useQuery } from '@tanstack/react-query';

export const HubinDashboardPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user, subscription } = useAuthStore();
  const { isTvMode } = useTvStore();

  const [currentScene, setCurrentScene] = useState(0);

  const isStudent = useMemo(() => user?.role?.name === 'SISWA', [user]);

  const title = useMemo(
    () => isStudent ? "Portal Hubungan Industri (HUBIN)" : "Pusat Kendali Hubungan Industri (HUBIN)",
    [isStudent]
  );

  const description = useMemo(
    () => isStudent
      ? "Akses presensi PKL, bursa kerja khusus, dan kuesioner tracer study"
      : "Kelola kemitraan industri, program PKL, BKK lowongan kerja, tracer study alumni, dan teaching factory (TEFA).",
    [isStudent]
  );

  const handleNavigateTab = useCallback((tabId: string) => {
    navigate(`/hubin/${tabId}`);
  }, [navigate]);

  // React Query Data Fetching (Pilar 31)
  const { data: statsRes, isLoading: loading, error: statsErr, dataUpdatedAt } = useQuery({
    queryKey: ['hubin-dashboard-stats'],
    queryFn: () => hubinApi.getStats(),
    enabled: subscription !== undefined,
    refetchInterval: isTvMode ? 60_000 : false,
    staleTime: 30_000,
  });

  const { data: actRes, isLoading: activitiesLoading } = useQuery({
    queryKey: ['hubin-recent-activities'],
    queryFn: () => hubinApi.getRecentActivity(),
    enabled: subscription !== undefined,
    refetchInterval: isTvMode ? 60_000 : false,
    staleTime: 30_000,
  });

  const stats = statsRes?.data || null;
  const activities = actRes?.data || [];
  const error = statsErr ? (statsErr as Error).message : (!statsRes?.success && statsRes ? 'Gagal memuat statistik HUBIN' : null);
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
      label: 'Siswa PKL Aktif', 
      value: stats?.pklAktif || 0, 
      icon: Users, 
      color: 'emerald',
      desc: `Dari ${stats?.totalSiswaPkl || 0} terdaftar PKL`
    },
    { 
      label: 'Logbook Belum Review', 
      value: stats?.pendingReports || 0, 
      icon: ClipboardList, 
      color: 'amber',
      desc: 'Menunggu review verifikasi'
    },
    { 
      label: 'Lowongan BKK Aktif', 
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
      <HubinTvModeLayout
        currentScene={currentScene}
        setCurrentScene={setCurrentScene}
        scenes={scenes}
        lastRefresh={lastRefresh}
        stats={stats}
        activities={activities}
        statCards={statCards}
      />
    );
  }

  if (loading) {
    return (
      <PremiumFeatureGate
        moduleName="HUBIN"
        featureName="Pusat Kendali Hubungan Industri"
        description="Pusat kolaborasi terpadu antara sekolah dengan dunia industri."
      >
        <AcademicPageLayout 
          title={title}
          description={description}
          hardeningModuleKey="hubin_dashboard"
          breadcrumbs={breadcrumbs}
          instruction={instruction}
        >
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memproses Dashboard Hubin...</p>
          </div>
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
        title={title}
        description={description}
        hardeningModuleKey="hubin_dashboard"
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        toolbar={
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 p-1 rounded-xl flex gap-1 shadow-sm items-center">
             <TvModeToggle />
          </div>
        }
      >
        <div className="space-y-8">
          {/* MoU Expiring Alert Banner */}
          {stats && stats.mouExpiringCount > 0 && (
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Perhatian: Dokumen MoU Rekan Industri Expiring</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ada {stats.mouExpiringCount} mitra industri dengan MoU yang akan berakhir dalam 30 hari kedepan.</p>
                </div>
              </div>
              <button 
                onClick={() => handleNavigateTab('mitra')} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors active:scale-[0.97] cursor-pointer"
              >
                Tinjau MoU
                <ArrowRight size={10} />
              </button>
            </div>
          )}

          {/* Bagian I: Ringkasan Statistik & KPI Kemitraan */}
          <Divider title="Bagian I: Ringkasan Statistik & KPI Kemitraan" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards?.map((card) => (
              <div key={card.label} className="w-full cursor-pointer" onClick={() => {
                if (card.label.includes('Mitra')) handleNavigateTab('mitra');
                if (card.label.includes('PKL')) handleNavigateTab('penempatan');
                if (card.label.includes('Logbook')) handleNavigateTab('absensi');
                if (card.label.includes('BKK')) handleNavigateTab('bkk');
              }}>
                <AnalyticsCard
                  title={card.label}
                  value={card.value}
                  isLoading={loading}
                  icon={<card.icon size={20} />}
                  gradient={
                    card.color === 'indigo'
                      ? 'from-indigo-500 to-indigo-600'
                      : card.color === 'emerald'
                      ? 'from-emerald-500 to-emerald-600'
                      : card.color === 'amber'
                      ? 'from-amber-500 to-orange-500'
                      : 'from-sky-500 to-sky-600'
                  }
                  subtitle={card.desc}
                />
              </div>
            ))}
          </div>

          {/* Bagian II: Serapan Tracer Study & Top Program Keahlian */}
          <Divider title="Bagian II: Serapan Tracer Study & Top Program Keahlian" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnalyticsCard
              title="Coverage Tracer Study"
              value={`${stats?.tracerCoverage?.toFixed(1) || 0}%`}
              icon={<GraduationCap />}
              gradient="from-indigo-500 to-indigo-600"
              subtitle={`${stats?.totalAlumniTraced || 0} alumni terlacak`}
            />
            <AnalyticsCard
              title="Serapan Kerja Alumni"
              value={`${stats?.employmentRate?.toFixed(1) || 0}%`}
              icon={<TrendingUp />}
              gradient="from-emerald-500 to-emerald-600"
              subtitle="Bekerja & Wirausaha"
            />
            <AnalyticsCard
              title="Rekrutmen Sukses BKK"
              value={`${stats?.totalRecruitmentSuccess || 0} siswa`}
              icon={<Award />}
              gradient="from-sky-500 to-sky-600"
              subtitle="Diterima bekerja di industri"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <TracerStudyUraian stats={stats} onNavigateTab={handleNavigateTab} />
            </div>
            <div className="lg:col-span-2">
              <TopJurusanList stats={stats} />
            </div>
          </div>

          {/* Bagian III: Aktivitas Penempatan Siswa PKL & Partner Teratas */}
          <Divider title="Bagian III: Aktivitas Penempatan Siswa PKL & Partner Teratas" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentPklTable stats={stats} onNavigateTab={handleNavigateTab} />
            </div>
            <div className="lg:col-span-1">
              <TopMitraGrid stats={stats} />
            </div>
          </div>

          {/* Bagian IV: Log Aktivitas Hubin Terbaru (Audit Trail) */}
          <Divider title="Bagian IV: Log Aktivitas Hubin Terbaru (Audit Trail)" />
          <ActivityLogTimeline activities={activities} activitiesLoading={activitiesLoading} />
          {/* <SectionCard> <Card> </SectionCard> </Card> */}
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default HubinDashboardPage;
