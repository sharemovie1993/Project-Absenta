import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Users, 
  UserCheck, 
  AlertTriangle, 
  LayoutDashboard, 
  MapPin, 
  Activity, 
  Cpu, 
  ChevronRight, 
  ChevronLeft,
  Calendar,
  Settings,
  Camera,
  FileText,
  RefreshCw,
  TrendingUp,
  Zap,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useTvStore } from '@/store/tvStore';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { toLocalDate } from '../../utils/attendance/time';
import { useJenjang } from '@/hooks/useJenjang';
import { 
  getGerbangStats, 
  getAttendanceFeed, 
  getStatistikHarian, 
  getRekapHarianSiswaMe,
  getRekapBulananSiswaMe,
  type GerbangStats
} from '@/api/attendanceGerbang.api';
import { 
  Divider, 
  SektorKehadiranList, 
  KbmFeedPanel, 
  TerminalDevicesPanel, 
  type DeviceInfo, 
  type FeedItem 
} from './components/AttendanceDashboardComponents';
import { AttendanceTvModeLayout } from './components/AttendanceTvModeLayout';

interface MyAttendanceData {
  status: string;
  rincian: Array<{
    waktu_tap: string;
    [key: string]: unknown;
  }>;
}

interface DailyStatItem {
  kelas: string;
  HADIR: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
  TERLAMBAT: number;
  DISPEN?: number;
}

interface SubscriptionData {
  features?: string[];
  Plan?: { features_json?: string[] };
  plan?: { features_json?: string[] };
}

const AttendanceDashboardPage: React.FC = React.memo(() => {
  const { user, subscription } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<GerbangStats | Record<string, unknown> | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [chartData, setChartData] = useState<DailyStatItem[]>([]);
  const [myAttendance, setMyAttendance] = useState<MyAttendanceData | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { isTvMode } = useTvStore();
  const { jenjang, sekolah } = useJenjang();
  const [currentScene, setCurrentScene] = useState(0);

  // Auto-rotation TV Mode scene
  useEffect(() => {
    if (!isTvMode) return;
    const timer = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15000);
    return () => clearInterval(timer);
  }, [isTvMode]);

  const isSiswa = useMemo(() => {
    return !!user?.isStudent;
  }, [user]);

  const isGuru = useMemo(() => {
    return !!user?.isTeacher;
  }, [user]);

  // Premium gating config check
  const subFeatures = useMemo(() => {
    const sub = subscription as SubscriptionData | undefined;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => {
    return !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');
  }, [subFeatures]);

  const todayStr = useMemo(() => {
    return toLocalDate();
  }, []);

  const computedStats = useMemo(() => {
    if (isSiswa) {
      const statsObj = stats as Record<string, any> | null;
      const monthlyStats = statsObj?.statistik || {};
      return {
        hadir: monthlyStats.HADIR || 0,
        terlambat: monthlyStats.TERLAMBAT || 0,
        sakitIzin: (monthlyStats.IZIN || 0) + (monthlyStats.SAKIT || 0),
        alpa: monthlyStats.ALPA || 0
      };
    } else {
      let hadir = 0;
      let terlambat = 0;
      let sakitIzin = 0;
      let alpa = 0;

      if (Array.isArray(chartData) && chartData.length > 0) {
        chartData.forEach(c => {
          hadir += c.HADIR || 0;
          terlambat += c.TERLAMBAT || 0;
          sakitIzin += (c.IZIN || 0) + (c.SAKIT || 0) + (c.DISPEN || 0);
          alpa += c.ALPA || 0;
        });
      }

      return { hadir, terlambat, sakitIzin, alpa };
    }
  }, [isSiswa, stats, chartData]);

  // Group stats by Jurusan (SMA/SMK) or Tingkat Kelas (SD/SMP) dynamically
  const statsBySector = useMemo(() => {
    if (isSiswa) return [];
    const isSmkOrSma = String(jenjang || '').toUpperCase() === 'SMK' || String(jenjang || '').toUpperCase() === 'SMA';
    const sectorStats: Record<string, { hadir: number; total: number }> = {};

    chartData?.forEach(c => {
      let key = 'Lainnya';
      if (isSmkOrSma) {
        // Extract Jurusan e.g., "X RPL 1" -> "RPL"
        const parts = c.kelas.split(' ');
        key = parts.length > 1 ? parts[1] : 'Umum';
      } else {
        // Extract Tingkat e.g., "Kelas 7A" -> "Tingkat 7"
        const match = c.kelas.match(/\d+/);
        key = match ? `Tingkat ${match[0]}` : 'Lainnya';
      }

      if (!sectorStats[key]) {
        sectorStats[key] = { hadir: 0, total: 0 };
      }

      const totalKelas = (c.HADIR || 0) + (c.TERLAMBAT || 0) + (c.IZIN || 0) + (c.SAKIT || 0) + (c.ALPA || 0);
      sectorStats[key].hadir += (c.HADIR || 0) + (c.TERLAMBAT || 0);
      sectorStats[key].total += totalKelas;
    });

    return Object.entries(sectorStats)?.map(([name, data]) => ({
      name,
      percentage: data.total > 0 ? Math.round((data.hadir / data.total) * 100) : 0
    })).sort((a, b) => b.percentage - a.percentage);
  }, [chartData, jenjang, isSiswa]);

  const myAttendanceTimes = useMemo(() => {
    if (!myAttendance || !Array.isArray(myAttendance.rincian)) return { masuk: null, pulang: null };
    const hadirRincian = myAttendance.rincian.filter((r: { waktu_tap: string }) => r.waktu_tap);
    if (hadirRincian.length === 0) return { masuk: null, pulang: null };
    const masuk = hadirRincian[0].waktu_tap;
    const pulang = hadirRincian.length > 1 ? hadirRincian[hadirRincian.length - 1].waktu_tap : null;
    return {
      masuk: masuk ? new Date(masuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null,
      pulang: pulang ? new Date(pulang).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
    };
  }, [myAttendance]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSiswa) {
        // Fetch student self logs
        const [dailyRes, monthlyRes] = await Promise.all([
          getRekapHarianSiswaMe({ tanggal: todayStr }),
          getRekapBulananSiswaMe({ bulan: todayStr.substring(0, 7) })
        ]);
        if (dailyRes.success) setMyAttendance(dailyRes.data);
        if (monthlyRes.success) setStats(monthlyRes.data);
      } else {
        // Fetch admin/staff logs
        const [statsRes, feedRes, chartRes] = await Promise.all([
          getGerbangStats(),
          getAttendanceFeed({ tanggal: todayStr }),
          getStatistikHarian({ tanggal: todayStr })
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (feedRes.success) setFeed(feedRes.data || []);
        if (chartRes.success) setChartData(chartRes.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSiswa, todayStr]);

  useEffect(() => {
    if (subscription === undefined) return;
    fetchDashboardData();
  }, [subscription, fetchDashboardData]);

  // Auto-refresh data in TV Mode
  useEffect(() => {
    if (!isTvMode) return;
    const timer = setInterval(() => {
      fetchDashboardData();
    }, 60000);
    return () => clearInterval(timer);
  }, [isTvMode, fetchDashboardData]);

  // Breadcrumbs config
  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Absensi', path: '/attendance/dashboard' }
  ], []);

  // Guide box documentation config
  const instruction = useMemo(() => {
    const isSmkOrSma = String(jenjang || '').toUpperCase() === 'SMK' || String(jenjang || '').toUpperCase() === 'SMA';
    return {
      title: 'Panduan Dashboard Absensi',
      description: `Pusat pemantauan tingkat kehadiran siswa, status perangkat tapping gerbang, dan rekapitulasi waktu nyata di ${sekolah?.name || 'Sekolah'}.`,
      items: [
        { text: isSmkOrSma 
          ? 'Pantau grafik dan persentase kehadiran siswa per kelas serta per jurusan secara visual.' 
          : 'Pantau grafik dan persentase kehadiran siswa per kelas serta tingkat kelas secara visual.' },
        { text: 'Gunakan panel Feed Aktivitas untuk melihat kedatangan siswa real-time secara langsung.' },
        { text: 'Pastikan seluruh terminal perangkat gate sensor (online/offline) terhubung stabil ke server.' }
      ]
    };
  }, [sekolah, jenjang]);

  // Terminal devices status
  const terminalDevices = useMemo((): DeviceInfo[] => [
    { id: '1', name: 'Gate Utama RFID-01', type: 'RFID', status: 'ONLINE', lastPing: '1 detik yang lalu', location: 'Pintu Gerbang Utama' },
    { id: '2', name: 'Kamera Face Recognition-01', type: 'CAMERA', status: 'ONLINE', lastPing: '5 detik yang lalu', location: 'Lobby Gedung A' },
    { id: '3', name: 'Gate Samping RFID-02', type: 'RFID', status: 'OFFLINE', lastPing: '2 jam yang lalu', location: 'Pintu Gerbang Barat' }
  ], []);

  // Render stats cards
  const statCards = useMemo(() => {
    if (isSiswa) {
      return [
        { label: 'Hadir Bulan Ini', value: computedStats.hadir, icon: <UserCheck />, gradient: 'from-emerald-500 to-teal-600', desc: 'Total kehadiran tercatat' },
        { label: 'Terlambat', value: computedStats.terlambat, icon: <Clock />, gradient: 'from-amber-500 to-orange-600', desc: 'Total telat bulan ini' },
        { label: 'Izin / Sakit', value: computedStats.sakitIzin, icon: <Calendar />, gradient: 'from-blue-500 to-indigo-600', desc: 'Izin & sakit disetujui' },
        { label: 'Alpa (Tanpa Keterangan)', value: computedStats.alpa, icon: <AlertTriangle />, gradient: 'from-rose-500 to-red-600', desc: 'Kehadiran tanpa keterangan' }
      ];
    } else {
      return [
        { label: 'Siswa Hadir Hari Ini', value: computedStats.hadir, icon: <UserCheck />, gradient: 'from-emerald-500 to-teal-600', desc: 'Siswa hadir kelas hari ini' },
        { label: 'Terlambat', value: computedStats.terlambat, icon: <Clock />, gradient: 'from-amber-500 to-orange-600', desc: 'Siswa datang terlambat' },
        { label: 'Sakit / Izin', value: computedStats.sakitIzin, icon: <Calendar />, gradient: 'from-blue-500 to-indigo-600', desc: 'Sakit & izin terkonfirmasi' },
        { label: 'Belum Hadir (Alpa)', value: computedStats.alpa, icon: <AlertTriangle />, gradient: 'from-rose-500 to-red-600', desc: 'Tanpa keterangan kehadiran' }
      ];
    }
  }, [isSiswa, computedStats]);

  const Divider = ({ title }: { title: string }) => (
    <div className="relative py-4 shrink-0 select-none">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-slate-200 dark:border-slate-800" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
          {title}
        </span>
      </div>
    </div>
  );

  const isSmkOrSma = String(jenjang || '').toUpperCase() === 'SMK' || String(jenjang || '').toUpperCase() === 'SMA';
  const sectorName = isSmkOrSma ? 'Jurusan' : 'Tingkat Kelas';
  const scenes = useMemo(() => {
    return [
      { title: "Statistik Kehadiran Harian & Per Kelas", desc: "Metrik absensi hari ini dan grafik perbandingan kelas" },
      { title: "Feed Aktivitas Sesi KBM", desc: "Status real-time presensi per sesi pelajaran" },
      { title: "Konektivitas Terminal Perangkat", desc: "Status aktif terminal RFID gate & AI kamera biometrik" },
      { title: `Evaluasi Sektoral Kehadiran per ${sectorName}`, desc: "Analisis statistik tingkat partisipasi sektoral sekolah" }
    ];
  }, [sectorName]);

  if (isTvMode && !isSiswa) {
    return (
      <AttendanceTvModeLayout
        currentScene={currentScene}
        setCurrentScene={setCurrentScene}
        scenes={scenes}
        lastRefresh={lastRefresh}
        stats={stats}
        feed={feed}
        terminalDevices={terminalDevices}
        statsBySector={statsBySector}
        sectorName={sectorName}
        statCards={statCards}
        chartData={chartData}
        sekolah={sekolah}
      />
    );
  }

  return (
    <PremiumFeatureGate
      moduleName="ABSENSI"
      featureName="Dashboard Kehadiran & Gerbang"
      description="Kelola jadwal KBM KBM, rekam wajah biometrik siswa, status mesin RFID gerbang, dan log kehadiran real-time."
    >
      <AcademicPageLayout
        title="Live Monitoring KBM Kelas"
        description={isSiswa ? `Halo ${user?.full_name || 'Siswa'}, berikut ringkasan presensi Anda di ${sekolah?.name || 'Sekolah'}.` : `Halo ${user?.full_name || 'Staf'}, pantau operasional presensi & KBM kelas ${sekolah?.name || 'Sekolah'} hari ini.`}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="attendance_dashboard"
        toolbar={
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 p-1 rounded-xl flex gap-1 shadow-sm items-center">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Sistem Aktif
                </span>
             </div>
             {!isSiswa && <TvModeToggle />}
          </div>
        }
      >
        <div className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards?.map((card, i) => (
              <AnalyticsCard
                key={i}
                title={card.label}
                value={card.value}
                icon={card.icon}
                gradient={card.gradient}
                subtitle={card.desc}
              />
            ))}
          </div>

          {isSiswa ? (
            /* ───── SISWA DASHBOARD VIEW ───── */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Status Hari Ini */}
              <SectionCard
                title={
                  <div className="flex flex-col">
                    <span>Status Kehadiran Hari Ini</span>
                    <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Log absensi gerbang per hari ini</span>
                  </div>
                }
                icon={Clock}
                className="lg:col-span-1"
                fullWidth
              >
                <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                    <UserCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                      {myAttendance?.status || 'BELUM ABSEN'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {myAttendanceTimes.masuk ? `Presensi Masuk KBM: ${myAttendanceTimes.masuk}` : 'Belum melakukan presensi kelas hari ini'}
                    </p>
                  </div>
                  {myAttendanceTimes.pulang && (
                    <Badge variant="success">Sudah Absen Pulang ({myAttendanceTimes.pulang})</Badge>
                  )}
                </div>
              </SectionCard>

              {/* Rencana KBM/Jadwal KBM Siswa */}
              <SectionCard
                title={
                  <div className="flex flex-col">
                    <span>Jadwal KBM Anda</span>
                    <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Daftar kegiatan pembelajaran terjadwal hari ini</span>
                  </div>
                }
                icon={Calendar}
                className="lg:col-span-2"
                fullWidth
              >
                <div className="p-4 flex flex-col items-center justify-center text-center text-slate-500">
                  <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-semibold">Tidak ada jadwal KBM khusus hari ini</p>
                  <p className="text-xs mt-1">Gunakan tab menu samping untuk melihat jadwal KBM KBM lengkap</p>
                </div>
              </SectionCard>
            </div>
          ) : (
            /* ───── ADMIN/TEACHER DASHBOARD VIEW ───── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recharts Bar Chart Kehadiran per Kelas */}
                <SectionCard
                  title={
                    <div className="flex flex-col">
                      <span>Persentase Kehadiran per Kelas</span>
                      <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Data tingkat partisipasi real-time hari ini</span>
                    </div>
                  }
                  icon={Activity}
                  className="lg:col-span-2"
                  fullWidth
                >
                  <div className="h-80 w-full pt-4">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
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
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-sm font-semibold">Belum ada statistik masuk hari ini</p>
                        <p className="text-xs mt-1">Data akan otomatis diperbarui saat siswa mulai melakukan tap di pintu gerbang.</p>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Sektoral Kehadiran (Agregasi Jurusan/Tingkat) */}
                <SektorKehadiranList statsBySector={statsBySector} sectorName={sectorName} />
              </div>

              {/* Feed Aktivitas Sesi KBM */}
              <div className="grid grid-cols-1 gap-8">
                <KbmFeedPanel feed={feed} />
              </div>

              {/* Status Koneksi Terminal Perangkat */}
              <div className="grid grid-cols-1 gap-8">
                <TerminalDevicesPanel terminalDevices={terminalDevices} />
              </div>

              {/* Aksi Cepat Admin */}
              <div className="grid grid-cols-1 gap-8">
                {/* Quick Actions Panel */}
                <SectionCard
                  title={
                    <div className="flex flex-col">
                      <span>Aksi Cepat Admin</span>
                      <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Pintasan cepat fitur operasional absensi</span>
                    </div>
                  }
                  icon={Settings}
                  fullWidth
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/attendance/ops')}>
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <Activity className="w-4 h-4 text-emerald-600" /> Operasional Presensi
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/attendance/rekam-wajah')}>
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <Camera className="w-4 h-4 text-rose-600" /> Registrasi Biometrik AI
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/attendance/rekap')}>
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <FileText className="w-4 h-4 text-indigo-600" /> Rekapitulasi Laporan
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between" onClick={() => navigate('/attendance/settings')}>
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                        <Settings className="w-4 h-4 text-slate-600" /> Pengaturan Jam Kerja
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default AttendanceDashboardPage;
