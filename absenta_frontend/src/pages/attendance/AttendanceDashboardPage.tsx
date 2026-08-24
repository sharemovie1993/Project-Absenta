import React, { useMemo, lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  Calendar,
  Settings,
  Camera,
  FileText,
  RefreshCw,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAuthStore } from '@/store/authStore';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard } from '@/components/ui/SectionCard';
import Button from '@/components/ui/Button';
import { useTvStore } from '@/store/tvStore';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { formatDate } from '@/utils/date.utils';
import { useJenjang } from '@/hooks/useJenjang';
import { 
  getGerbangStats, 
  getAttendanceFeed, 
  getStatistikHarian, 
  getRekapHarianSiswaMe, 
  getRekapBulananSiswaMe,
  type GerbangStats
} from '@/api/attendanceGerbang.api';

// Lazy Loaded Subcomponents (Pilar 13)
const AttendanceTvModeLayout = lazy(() => import('./components/AttendanceTvModeLayout').then(m => ({ default: m.AttendanceTvModeLayout })));
const SektorKehadiranList = lazy(() => import('./components/AttendanceDashboardComponents').then(m => ({ default: m.SektorKehadiranList })));
const KbmFeedPanel = lazy(() => import('./components/AttendanceDashboardComponents').then(m => ({ default: m.KbmFeedPanel })));
const TerminalDevicesPanel = lazy(() => import('./components/AttendanceDashboardComponents').then(m => ({ default: m.TerminalDevicesPanel })));

interface DailyStatItem {
  kelas: string;
  HADIR: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
  TERLAMBAT: number;
}

export const AttendanceDashboardPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isTvMode = useTvStore((state) => state.isTvMode);
  const { jenjang, sekolah } = useJenjang();
  const [currentScene, setCurrentScene] = useState<number>(0);

  const isSiswa = user?.role?.name?.toLowerCase() === 'siswa' || user?.role === 'siswa';

  // React Query Data Fetching (Pilar 31)
  const { data: dashboardData, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['attendance-dashboard-live', isSiswa],
    queryFn: async () => {
      if (isSiswa) {
        const [dailyRes, monthlyRes] = await Promise.all([
          getRekapHarianSiswaMe().catch(() => null),
          getRekapBulananSiswaMe().catch(() => null)
        ]);
        return {
          myAttendance: dailyRes?.data || null,
          stats: monthlyRes?.data || null,
          feed: [],
          statistikHarian: []
        };
      } else {
        const [statsRes, feedRes, harianRes] = await Promise.all([
          getGerbangStats().catch(() => null),
          getAttendanceFeed().catch(() => null),
          getStatistikHarian().catch(() => null)
        ]);
        return {
          myAttendance: null,
          stats: statsRes?.data || null,
          feed: feedRes?.data || [],
          statistikHarian: (harianRes?.data || []) as DailyStatItem[]
        };
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const stats = dashboardData?.stats || null;
  const feed = useMemo(() => dashboardData?.feed || [], [dashboardData]);
  const statistikHarian = useMemo(() => dashboardData?.statistikHarian || [], [dashboardData]);

  const computedStats = useMemo(() => {
    return {
      hadir: stats?.summary?.hadir || stats?.hadir || 0,
      terlambat: stats?.summary?.terlambat || stats?.terlambat || 0,
      sakitIzin: (stats?.summary?.sakit || 0) + (stats?.summary?.izin || 0) || (stats?.sakit || 0) + (stats?.izin || 0),
      alpa: stats?.summary?.alpa || stats?.alpa || 0,
    };
  }, [stats]);

  const chartData = useMemo(() => {
    return (statistikHarian ?? [])?.map(item => ({
      kelas: item.kelas,
      HADIR: item.HADIR || 0,
      TERLAMBAT: item.TERLAMBAT || 0,
      ALPA: item.ALPA || 0
    }));
  }, [statistikHarian]);

  const statsBySector = useMemo(() => {
    const sectors: Record<string, { hadir: number; total: number }> = {};
    (statistikHarian ?? []).forEach(item => {
      const parts = item.kelas.split(' ');
      const sector = parts[0] || 'Umum';
      if (!sectors[sector]) sectors[sector] = { hadir: 0, total: 0 };
      sectors[sector].hadir += item.HADIR || 0;
      sectors[sector].total += (item.HADIR || 0) + (item.TERLAMBAT || 0) + (item.ALPA || 0) + (item.IZIN || 0) + (item.SAKIT || 0);
    });
    return Object.entries(sectors)?.map(([name, data]) => ({
      nama: name,
      persentase: data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0,
      hadir: data.hadir,
      total: data.total
    }));
  }, [statistikHarian]);

  const terminalDevices = useMemo(() => [
    { id: 'gate-1', name: 'RFID Gate 01 (Utama)', status: 'online', type: 'rfid', location: 'Pintu Gerbang Depan' },
    { id: 'gate-2', name: 'Face AI Camera 01', status: 'online', type: 'camera', location: 'Lobi Gedung Utama' },
    { id: 'gate-3', name: 'RFID Gate 02 (Timur)', status: 'offline', type: 'rfid', location: 'Pintu Gerbang Samping' },
  ], []);

  const headerStats = useMemo(() => [
    {
      title: isSiswa ? 'Hadir Bulan Ini' : 'Siswa Hadir Hari Ini',
      value: computedStats.hadir,
      icon: <UserCheck size={16} className="text-white" />,
      gradient: 'from-emerald-600 to-teal-800',
      subtitle: isSiswa ? 'Kehadiran tercatat' : 'Siswa hadir kelas hari ini'
    },
    {
      title: 'Terlambat',
      value: computedStats.terlambat,
      icon: <Clock size={16} className="text-white" />,
      gradient: 'from-amber-600 to-orange-800',
      subtitle: 'Presensi melewati batas'
    },
    {
      title: 'Sakit / Izin',
      value: computedStats.sakitIzin,
      icon: <Calendar size={16} className="text-white" />,
      gradient: 'from-blue-600 to-indigo-800',
      subtitle: 'Terkonfirmasi wali kelas'
    },
    {
      title: 'Belum Hadir (Alpa)',
      value: computedStats.alpa,
      icon: <AlertTriangle size={16} className="text-white" />,
      gradient: 'from-rose-600 to-red-800',
      subtitle: 'Tanpa keterangan'
    }
  ], [isSiswa, computedStats]);

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi & Kehadiran' },
    { label: 'Live Monitoring KBM' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Monitoring Presensi',
    description: 'Pantau status presensi harian siswa, aktivitas tap gerbang RFID, dan log kehadiran secara langsung.',
    items: [
      { text: 'Aktifkan Mode TV untuk menampilkan metrik kehadiran di layar monitor lobi sekolah.' },
      { text: 'Grafik diperbarui secara otomatis setiap 30 detik dari mesin gerbang.' },
      { text: 'Gunakan panel aksi cepat untuk membuka operasional presensi dan cetak rekap.' }
    ]
  }), []);

  const isSmkOrSma = String(jenjang || '').toUpperCase() === 'SMK' || String(jenjang || '').toUpperCase() === 'SMA';
  const sectorName = isSmkOrSma ? 'Jurusan' : 'Tingkat Kelas';

  const scenes = useMemo(() => [
    { title: "Statistik Kehadiran Harian & Per Kelas", desc: "Metrik absensi hari ini dan grafik perbandingan kelas" },
    { title: "Feed Aktivitas Sesi KBM", desc: "Status real-time presensi per sesi pelajaran" },
    { title: "Konektivitas Terminal Perangkat", desc: "Status aktif terminal RFID gate & AI kamera biometrik" },
    { title: `Evaluasi Sektoral Kehadiran per ${sectorName}`, desc: "Analisis statistik tingkat partisipasi sektoral sekolah" }
  ], [sectorName]);

  const lastUpdatedFormatted = useMemo(() => {
    return dataUpdatedAt ? formatDate(new Date(dataUpdatedAt)) : formatDate(new Date());
  }, [dataUpdatedAt]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleNavigateOps = useCallback(() => {
    navigate('/attendance/ops');
  }, [navigate]);

  const handleNavigateRekam = useCallback(() => {
    navigate('/attendance/rekam-wajah');
  }, [navigate]);

  const handleNavigateRekap = useCallback(() => {
    navigate('/attendance/rekap');
  }, [navigate]);

  const handleNavigateSettings = useCallback(() => {
    navigate('/attendance/settings');
  }, [navigate]);

  if (isTvMode && !isSiswa) {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">Memuat Mode TV...</div>}>
        <AttendanceTvModeLayout
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          scenes={scenes}
          lastRefresh={new Date(dataUpdatedAt || Date.now())}
          stats={stats}
          feed={feed}
          terminalDevices={terminalDevices}
          statsBySector={statsBySector}
          sectorName={sectorName}
          statCards={headerStats}
          chartData={chartData}
          sekolah={sekolah}
        />
      </Suspense>
    );
  }

  return (
    <InfraErrorBoundary>
      <PremiumFeatureGate
        moduleName="ABSENSI"
        featureName="Dashboard Kehadiran &amp; Gerbang"
        description="Kelola jadwal KBM, rekam wajah biometrik siswa, status mesin RFID gerbang, dan log kehadiran real-time."
      >
        <AcademicPageLayout
          title="Live Monitoring KBM Kelas"
          description={isSiswa ? `Halo ${user?.full_name || 'Siswa'}, berikut ringkasan presensi Anda di ${sekolah?.name || 'Sekolah'}.` : `Halo ${user?.full_name || 'Staf'}, pantau operasional presensi &amp; KBM kelas ${sekolah?.name || 'Sekolah'} hari ini.`}
          breadcrumbs={breadcrumbs}
          instruction={instruction}
          hardeningModuleKey="attendance_dashboard"
          stats={headerStats}
        >
          <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6 w-full min-w-0 max-w-full">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Gateway Aktif
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Terakhir diperbarui: {lastUpdatedFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="rounded-xl"
                  >
                    <RefreshCw size={12} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Segarkan
                  </Button>
                  {!isSiswa && <TvModeToggle />}
                </div>
              </div>

              {/* Views */}
              {!isSiswa && (
                <div className="space-y-6 w-full min-w-0 max-w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0 max-w-full">
                    {/* Recharts Bar Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm min-w-0">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                            Persentase Kehadiran per Kelas
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Tingkat kehadiran siswa hari ini</p>
                        </div>
                      </div>

                      <div className="h-72 w-full pt-2">
                        {chartData.length > 0 ? (
                          <ResponsiveContainer minWidth={0} width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                              <XAxis dataKey="kelas" tick={{ fontSize: 10 }} className="text-slate-600 dark:text-slate-400" />
                              <YAxis tick={{ fontSize: 10 }} className="text-slate-600 dark:text-slate-400" />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Bar dataKey="HADIR" fill="#10B981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="TERLAMBAT" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="ALPA" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <Activity className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                            <p className="text-xs font-bold">Belum ada statistik presensi hari ini</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sektoral Kehadiran */}
                    <div className="min-w-0">
                      <Suspense fallback={<div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />}>
                        <SektorKehadiranList statsBySector={statsBySector} sectorName={sectorName} />
                      </Suspense>
                    </div>
                  </div>

                  {/* Feed Aktivitas */}
                  <Suspense fallback={null}>
                    <KbmFeedPanel feed={feed} />
                  </Suspense>

                  {/* Terminal Perangkat */}
                  <Suspense fallback={null}>
                    <TerminalDevicesPanel terminalDevices={terminalDevices} />
                  </Suspense>

                  {/* Quick Actions Panel */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Aksi Cepat Operasional Presensi
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Button variant="toolbarOutline" className="w-full justify-between rounded-xl h-10" onClick={handleNavigateOps}>
                        <span className="flex items-center gap-2 text-xs font-bold">
                          <Activity className="w-4 h-4 text-emerald-600" /> Operasional Presensi
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="toolbarOutline" className="w-full justify-between rounded-xl h-10" onClick={handleNavigateRekam}>
                        <span className="flex items-center gap-2 text-xs font-bold">
                          <Camera className="w-4 h-4 text-rose-600" /> Registrasi Biometrik
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="toolbarOutline" className="w-full justify-between rounded-xl h-10" onClick={handleNavigateRekap}>
                        <span className="flex items-center gap-2 text-xs font-bold">
                          <FileText className="w-4 h-4 text-indigo-600" /> Rekapitulasi Laporan
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="toolbarOutline" className="w-full justify-between rounded-xl h-10" onClick={handleNavigateSettings}>
                        <span className="flex items-center gap-2 text-xs font-bold">
                          <Settings className="w-4 h-4 text-slate-600" /> Pengaturan Jam Kerja
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </AcademicPageLayout>
      </PremiumFeatureGate>
    </InfraErrorBoundary>
  );
});

export default AttendanceDashboardPage;
