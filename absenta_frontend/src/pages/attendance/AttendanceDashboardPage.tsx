import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
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
  Calendar,
  Settings,
  Camera,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { 
  getGerbangStats, 
  getAttendanceFeed, 
  getStatistikHarian, 
  getRekapHarianSiswaMe,
  getRekapBulananSiswaMe
} from '@/api/attendanceGerbang.api';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'RFID' | 'CAMERA';
  status: 'ONLINE' | 'OFFLINE';
  lastPing: string;
  location: string;
}

const AttendanceDashboardPage: React.FC = () => {
  const { user, subscription } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState<any>(null);

  const isSiswa = useMemo(() => {
    return String(user?.role?.name || '').toUpperCase() === 'SISWA';
  }, [user]);

  const isTeacher = useMemo(() => {
    return String(user?.role?.name || '').toUpperCase() === 'GURU';
  }, [user]);

  // Premium gating config check
  const subFeatures = useMemo(() => {
    const sub = subscription as any;
    return sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
  }, [subscription]);

  const isLocked = useMemo(() => {
    return !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');
  }, [subFeatures]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const computedStats = useMemo(() => {
    if (isSiswa) {
      const monthlyStats = stats?.statistik || {};
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

  const myAttendanceTimes = useMemo(() => {
    if (!myAttendance || !Array.isArray(myAttendance.rincian)) return { masuk: null, pulang: null };
    const hadirRincian = myAttendance.rincian.filter((r: any) => r.waktu_tap);
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

  // Breadcrumbs config
  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Absensi', path: '/attendance/dashboard' }
  ], []);

  // Guide box documentation config
  const instruction = useMemo(() => ({
    title: 'Panduan Dashboard Absensi',
    description: 'Pusat pemantauan tingkat kehadiran siswa, status perangkat tapping gerbang, dan rekapitulasi waktu nyata.',
    items: [
      { text: 'Pantau grafik kehadiran siswa per kelas untuk melihat perbandingan tingkat kehadiran hari ini.' },
      { text: 'Gunakan panel Feed Aktivitas untuk melihat kedatangan siswa real-time secara langsung.' },
      { text: 'Pastikan seluruh terminal perangkat gate sensor (online/offline) terhubung stabil ke server.' }
    ]
  }), []);

  // Mock devices status
  const mockDevices = useMemo((): DeviceInfo[] => [
    { id: '1', name: 'Gate Utama RFID-01', type: 'RFID', status: 'ONLINE', lastPing: '1 detik yang lalu', location: 'Pintu Gerbang Utama' },
    { id: '2', name: 'Kamera Face Recognition-01', type: 'CAMERA', status: 'ONLINE', lastPing: '5 detik yang lalu', location: 'Lobby Gedung A' },
    { id: '3', name: 'Gate Samping RFID-02', type: 'RFID', status: 'OFFLINE', lastPing: '2 jam yang lalu', location: 'Pintu Gerbang Barat' }
  ], []);

  // Render stats cards
  const statCards = useMemo(() => {
    if (isSiswa) {
      return [
        { label: 'Hadir Bulan Ini', value: computedStats.hadir, icon: <UserCheck />, gradient: 'from-emerald-500 to-teal-600', desc: 'Total kehadiran tercatat' },
        { label: 'Terlambat', value: computedStats.terlambat, icon: <Clock />, gradient: 'from-amber-500 to-orange-600', desc: 'Butuh perbaikan ketepatan waktu' },
        { label: 'Izin / Sakit', value: computedStats.sakitIzin, icon: <Calendar />, gradient: 'from-blue-500 to-indigo-600', desc: 'Melalui persetujuan piket' },
        { label: 'Alpa (Tanpa Keterangan)', value: computedStats.alpa, icon: <AlertTriangle />, gradient: 'from-rose-500 to-red-600', desc: 'Segera hubungi wali kelas' }
      ];
    } else {
      return [
        { label: 'Siswa Hadir Hari Ini', value: computedStats.hadir, icon: <UserCheck />, gradient: 'from-emerald-500 to-teal-600', desc: 'Sudah melakukan presensi kelas' },
        { label: 'Terlambat', value: computedStats.terlambat, icon: <Clock />, gradient: 'from-amber-500 to-orange-600', desc: 'Masuk setelah batas toleransi' },
        { label: 'Sakit / Izin', value: computedStats.sakitIzin, icon: <Calendar />, gradient: 'from-blue-500 to-indigo-600', desc: 'Telah terkonfirmasi piket/guru' },
        { label: 'Belum Hadir (Alpa)', value: computedStats.alpa, icon: <AlertTriangle />, gradient: 'from-rose-500 to-red-600', desc: 'Belum ada catatan kehadiran' }
      ];
    }
  }, [isSiswa, computedStats]);

  const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

  return (
    <PremiumFeatureGate
      moduleName="ABSENSI"
      featureName="Dashboard Kehadiran & Gerbang"
      description="Kelola jadwal template KBM, rekam wajah biometrik siswa, status mesin RFID gerbang, dan log kehadiran real-time."
    >
      <AcademicPageLayout
        title="Dashboard Absensi"
        description={isSiswa ? `Halo ${user?.full_name || 'Siswa'}, berikut ringkasan presensi Anda.` : `Halo ${user?.full_name || 'Staf'}, pantau operasional presensi sekolah hari ini.`}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="attendance_dashboard"
        toolbar={
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 p-1 rounded-xl flex gap-1 shadow-sm">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Sistem Aktif
                </span>
             </div>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, i) => (
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

              {/* Rencana KBM/Jadwal Template Siswa */}
              <SectionCard
                title={
                  <div className="flex flex-col">
                    <span>Jadwal Pelajaran Anda</span>
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
                  <p className="text-xs mt-1">Gunakan tab menu samping untuk melihat template jadwal KBM lengkap</p>
                </div>
              </SectionCard>
            </div>
          ) : (
            /* ───── ADMIN/TEACHER DASHBOARD VIEW ───── */
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

              {/* Live KBM Feed */}
              <SectionCard
                title={
                  <div className="flex flex-col">
                    <span>Feed Aktivitas Kelas KBM</span>
                    <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Status sesi absensi kelas hari ini</span>
                  </div>
                }
                icon={Clock}
                className="lg:col-span-1"
                fullWidth
              >
                <div className="h-80 overflow-y-auto space-y-4 pr-1">
                  {feed.length > 0 ? (
                    feed.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:shadow-sm transition-all duration-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                            {item.title}
                          </span>
                          <Badge variant={item.status === 'BERLANGSUNG' ? 'warning' : item.status === 'SELESAI' ? 'success' : 'info'}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Guru: {item.guru || 'Umum'}</span>
                          <span>{item.message?.split('|')[1]?.trim() || ''}</span>
                        </div>
                        {item.counts && (
                          <div className="flex gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/50 text-[9px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">H: {item.counts.HADIR || 0}</span>
                            <span className="text-amber-500">T: {item.counts.TERLAMBAT || 0}</span>
                            <span className="text-blue-500">I: {item.counts.IZIN || 0}</span>
                            <span className="text-rose-500">A: {item.counts.ALPA || 0}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-10">
                      <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-sm font-semibold">Tidak ada sesi KBM hari ini</p>
                      <p className="text-xs mt-1">Sesi absensi akan muncul saat kelas dimulai.</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Status Perangkat Scanner Absensi */}
              <SectionCard
                title={
                  <div className="flex flex-col">
                    <span>Status Koneksi Terminal Perangkat</span>
                    <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Konektivitas hardware RFID & camera biometrik</span>
                  </div>
                }
                icon={Cpu}
                className="lg:col-span-2"
                fullWidth
              >
                <div className="space-y-4">
                  {mockDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", device.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600')}>
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{device.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{device.location} • Ping: {device.lastPing}</p>
                        </div>
                      </div>
                      <Badge variant={device.status === 'ONLINE' ? 'success' : 'destructive'}>
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Quick Actions Panel */}
              <SectionCard
                title={
                  <div className="flex flex-col">
                    <span>Aksi Cepat Admin</span>
                    <span className="text-[9px] font-medium text-slate-500 normal-case tracking-normal mt-0.5">Pintasan cepat fitur operasional absensi</span>
                  </div>
                }
                icon={Settings}
                className="lg:col-span-1"
                fullWidth
              >
                <div className="flex flex-col gap-3">
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
          )}
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default AttendanceDashboardPage;
