import React, { useMemo, useCallback, useState, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  Clock,
  ShieldAlert,
  Search,
  Activity,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { kesiswaanApi, type Pelanggaran } from '../../api/kesiswaan.api';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useTvStore } from '../../store/tvStore';
import { TvModeToggle } from '../../components/ui/TvModeToggle';
import { PiketAgendaPanel, RombelDisiplinPanel } from './components/MonitoringKesiswaanComponents';
import { MemoizedAnalyticsCard } from '../../components/ui/AnalyticsCard';
import type { CareStudentItem, LeaderboardItem } from '../../components/kesiswaan/monitoring/CareSpotlightSection';
import type { MonthlyTrendItem } from '../../components/kesiswaan/monitoring/MonthlyTrendChart';

// Lazy load heavy subcomponents (Pilar 21)
const CareSpotlightSection = lazy(() => import('../../components/kesiswaan/monitoring/CareSpotlightSection').then(m => ({ default: m.CareSpotlightSection })));
const MonthlyTrendChart = lazy(() => import('../../components/kesiswaan/monitoring/MonthlyTrendChart').then(m => ({ default: m.MonthlyTrendChart })));
const CatatPelanggaranModal = lazy(() => import('../../components/kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = lazy(() => import('../../components/kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

const REFETCH = 60_000;
const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const MonitoringKesiswaanPage: React.FC = () => {
  const navigate = useNavigate();
  const { isTvMode } = useTvStore();
  const [currentScene, setCurrentScene] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [spotlightTab, setSpotlightTab] = useState<'violations' | 'achievements'>('violations');
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);

  useEffect(() => {
    if (!isTvMode) return;
    const timer = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15_000);
    return () => clearInterval(timer);
  }, [isTvMode]);

  useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, REFETCH);
    return () => clearInterval(interval);
  }, [isTvMode]);

  const { data: violations, isLoading } = useQuery({
    queryKey: ['kesiswaan-monitoring-violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['kesiswaan-leaderboard'],
    queryFn: () => kesiswaanApi.getPrestasiLeaderboard({ limit: 5 }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['kesiswaan-analytics'],
    queryFn: () => kesiswaanApi.getPelanggaranAnalytics({ year: new Date().getFullYear() }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    if (!violations?.data?.list) return { today: 0, severe: 0, totalPoints: 0, needDiscipline: 0 };
    const list = violations.data.list;
    const now = new Date();
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const today = list.filter((v: Pelanggaran) => {
      const dateRaw = v.created_at || v.tanggal;
      if (!dateRaw) return false;
      const dateObj = new Date(dateRaw);
      if (isNaN(dateObj.getTime())) return false;
      const vLocalStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      return vLocalStr === localTodayStr;
    }).length;

    const severe = list.filter((v: Pelanggaran) => v.poin >= 25).length;
    const needDiscipline = list.filter((v: Pelanggaran) => v.status === 'BARU' || v.status === 'PERLU_PEMBINAAN' || v.status === 'PROSES').length;
    const totalPoints = list.reduce((acc: number, curr: Pelanggaran) => acc + curr.poin, 0);
    
    return { today, severe, totalPoints, needDiscipline };
  }, [violations]);

  const careStudents = useMemo((): CareStudentItem[] => {
    if (!violations?.data?.list) return [];
    const studentPoints: Record<string, { id: string; name: string; class: string; points: number }> = {};
    
    violations.data.list.forEach((v: Pelanggaran) => {
      const id = v.siswa_id;
      if (!studentPoints[id]) {
        studentPoints[id] = { 
          id,
          name: v.Siswa?.nama_siswa || 'Unknown', 
          class: v.Siswa?.Kelas?.nama_kelas || '-', 
          points: 0 
        };
      }
      studentPoints[id].points += v.poin;
    });

    return Object.values(studentPoints)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [violations]);

  const recentViolations = useMemo((): Pelanggaran[] => {
    return violations?.data?.list.slice(0, 5) || [];
  }, [violations]);

  const handleNavigateToPelanggaran = useCallback(() => {
    navigate('/kesiswaan/pelanggaran');
  }, [navigate]);

  const monthlyTrend = useMemo((): MonthlyTrendItem[] => {
    return (analytics?.data?.trend_bulanan as MonthlyTrendItem[]) || [];
  }, [analytics]);

  const leaderboardData = useMemo((): LeaderboardItem[] => {
    return (leaderboard?.data as LeaderboardItem[]) || [];
  }, [leaderboard]);

  const maxCases = useMemo(() => {
    if (monthlyTrend.length === 0) return 1;
    return Math.max(...(monthlyTrend?.map((m: MonthlyTrendItem) => m.total_kasus) || [1]), 1);
  }, [monthlyTrend]);

  const academicStats = useMemo(() => [
    {
      title: "Pelanggaran Hari Ini",
      value: stats.today,
      subtitle: "Catatan baru masuk hari ini",
      icon: <Clock size={14} />,
      gradient: "from-indigo-500 to-indigo-600",
      variant: "compact-premium" as const,
    },
    {
      title: "Butuh Pembinaan",
      value: stats.needDiscipline,
      subtitle: "Menunggu tindakan / tap kartu",
      icon: <ShieldAlert size={14} />,
      gradient: "from-rose-500 to-pink-600",
      variant: "compact-premium" as const,
    },
    {
      title: "Kasus Berat (≥ 25 Poin)",
      value: stats.severe,
      subtitle: "Memerlukan penanganan khusus",
      icon: <Users size={14} />,
      gradient: "from-amber-500 to-orange-600",
      variant: "compact-premium" as const,
    },
    {
      title: "Akumulasi Poin",
      value: stats.totalPoints,
      subtitle: "Total poin seluruh kelas",
      icon: <TrendingUp size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      variant: "compact-premium" as const,
    }
  ], [stats]);

  const monitoringInstruction = useMemo(() => ({
    title: "Panduan Monitoring Kesiswaan & Disiplin",
    description: "Halaman ini digunakan untuk memantau data kedisiplinan dan pembinaan siswa secara real-time.",
    items: [
      { text: "Statistik di bagian atas menampilkan ringkasan data pelanggaran siswa." },
      { text: "Gunakan 'Care Spotlight' untuk melihat siswa yang memerlukan perhatian atau pembinaan intensif segera." },
      { text: "Catatan pelanggaran terkini menampilkan aktivitas real-time." }
    ]
  }), []);

  if (isTvMode) {
    const scenes = [
      { title: "Ringkasan Harian, Piket & Agenda", desc: "Statistik harian, piket aktif, dan agenda terdekat" },
      { title: "Aktivitas Pelanggaran Real-time", desc: "Catatan pelanggaran masuk terbaru" },
      { title: "Spotlight Perilaku & Prestasi Siswa", desc: "Care spotlight siswa dan leaderboard prestasi" },
      { title: "Kepatuhan Rombel & Tren Bulanan", desc: "Kondisi disiplin kelas dan analisis tren tahunan" }
    ];

    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-8 overflow-hidden font-sans select-none">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">Layar Monitor Kesiswaan</h1>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
                Scene {currentScene + 1} dari 4: {scenes[currentScene].title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {scenes?.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentScene(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    currentScene === i ? "bg-indigo-500 scale-125" : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                  }`}
                  aria-label={`Go to scene ${i + 1}`}
                />
              ))}
            </div>

            <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-normal border-l border-slate-200 dark:border-slate-800 pl-6">
              <div>Diperbarui: {fmt(lastRefresh)}</div>
              <div>Auto-refresh: 60s</div>
            </div>

            <TvModeToggle variant="floating-exit" />
          </div>
        </div>

        {/* TV Mode Body */}
        <div className="flex-1 min-h-0 relative">
          <button 
            onClick={() => setCurrentScene(prev => (prev - 1 + 4) % 4)}
            className="fixed left-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-start pl-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Previous Scene"
          >
            <ChevronLeft size={36} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button 
            onClick={() => setCurrentScene(prev => (prev + 1) % 4)}
            className="fixed right-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-end pr-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Next Scene"
          >
            <ChevronRight size={36} className="transition-transform group-hover:translate-x-1" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col justify-between"
            >
              {currentScene === 0 && (
                <div className="space-y-6 h-full flex flex-col justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                    {academicStats?.map((s, idx) => (
                      <MemoizedAnalyticsCard
                        key={idx}
                        title={s.title}
                        value={s.value}
                        subtitle={s.subtitle}
                        icon={s.icon}
                        gradient={s.gradient}
                        variant="compact-premium"
                        mobileCompact={true}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-h-0 pt-2">
                    <PiketAgendaPanel />
                  </div>
                </div>
              )}

              {currentScene === 1 && (
                <div className="h-full flex flex-col bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Catatan Pelanggaran Terkini</h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Feed aktivitas perilaku siswa real-time</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-2">
                    {isLoading ? [1,2,3,4]?.map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />) : 
                    recentViolations.length > 0 ? recentViolations?.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${v.poin >= 50 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/30'}`}>
                            <ShieldAlert size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase truncate">{v.Siswa?.nama_siswa}</h4>
                            <p className="text-xs text-slate-500 font-medium truncate">{v.jenis_pelanggaran} • {v.Siswa?.Kelas?.nama_kelas}</p>
                          </div>
                        </div>
                        <span className="font-black text-rose-600">+{v.poin}</span>
                      </div>
                    )) : null}
                  </div>
                </div>
              )}

              {currentScene === 2 && (
                <Suspense fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
                  <CareSpotlightSection
                    spotlightTab={spotlightTab}
                    setSpotlightTab={setSpotlightTab}
                    careStudents={careStudents}
                    leaderboardData={leaderboardData}
                    isLoading={isLoading}
                    isLoadingLeaderboard={isLoadingLeaderboard}
                    onNavigateToPelanggaran={handleNavigateToPelanggaran}
                  />
                </Suspense>
              )}

              {currentScene === 3 && (
                <div className="space-y-6">
                  <RombelDisiplinPanel violations={violations} analytics={analytics} />
                  <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
                    <MonthlyTrendChart
                      monthlyTrend={monthlyTrend}
                      maxCases={maxCases}
                      isLoadingAnalytics={isLoadingAnalytics}
                    />
                  </Suspense>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Monitoring Disiplin Kesiswaan"
      description="Live Display & Analitik Real-Time"
      stats={academicStats}
      toolbar={
        <div className="flex gap-2 items-center flex-wrap">
          <TvModeToggle />
          <Button 
            onClick={() => setTindakMasalModalOpen(true)}
            variant="outline"
            className="rounded-lg h-8 px-3 font-bold text-xs border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={14} /> ⚡ Tindak Masal
          </Button>
          <Button 
            onClick={() => setCatatModalOpen(true)}
            variant="default"
            className="rounded-lg h-8 px-3 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white hidden sm:inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> ⚡ Catat Pelanggaran
          </Button>
        </div>
      }
      instruction={monitoringInstruction}
      topSlot={<WorkspaceAppLauncherCard workspaceId="KESISWAAN_WORKSPACE" />}
      hardeningModuleKey="kesiswaan_monitoring"
    >
      <div className="space-y-6 pb-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2">
          <div className="lg:col-span-5 flex">
            <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm w-full">
              <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight mb-4">Papan Informasi Piket & Agenda</h3>
              <PiketAgendaPanel />
            </Card>
          </div>
          <div className="lg:col-span-7 flex">
            <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col justify-between w-full min-h-[360px]">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight mb-4">Catatan Pelanggaran Terkini</h3>
                <div className="space-y-3">
                  {isLoading ? [1,2,3]?.map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />) :
                  recentViolations?.map((v) => (
                    <div key={v.id} className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                      <div className="min-w-0 flex-1 pr-3">
                        <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase truncate">{v.Siswa?.nama_siswa}</h4>
                        <p className="text-[11px] text-gray-500 font-medium truncate">{v.jenis_pelanggaran} • {v.Siswa?.Kelas?.nama_kelas}</p>
                      </div>
                      <span className="font-black text-rose-600 text-xs shrink-0">+{v.poin} Poin</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <CareSpotlightSection
            spotlightTab={spotlightTab}
            setSpotlightTab={setSpotlightTab}
            careStudents={careStudents}
            leaderboardData={leaderboardData}
            isLoading={isLoading}
            isLoadingLeaderboard={isLoadingLeaderboard}
            onNavigateToPelanggaran={handleNavigateToPelanggaran}
          />
        </Suspense>

        <RombelDisiplinPanel violations={violations} analytics={analytics} />

        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <MonthlyTrendChart
            monthlyTrend={monthlyTrend}
            maxCases={maxCases}
            isLoadingAnalytics={isLoadingAnalytics}
          />
        </Suspense>

        {/* Modal Pencatatan Kilat Pelanggaran (Quick Entry) */}
        <Suspense fallback={null}>
          <CatatPelanggaranModal
            isOpen={catatModalOpen}
            onClose={() => setCatatModalOpen(false)}
          />
        </Suspense>

        {/* Modal Penindakan Masal (Bulk Discipline Action) */}
        <Suspense fallback={null}>
          <TindakMasalPelanggaranModal
            isOpen={tindakMasalModalOpen}
            onClose={() => setTindakMasalModalOpen(false)}
          />
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
};

export default MonitoringKesiswaanPage;
