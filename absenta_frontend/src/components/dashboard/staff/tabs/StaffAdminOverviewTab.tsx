import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  ArrowRight,
  Calendar,
  Settings
} from 'lucide-react';
import { getDashboardOverview, getAttendanceChart } from '@/api/dashboard.api';
import { getAcademicStats, type AcademicStats } from '@/api/academic-stats.api';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { Loader } from '@/components/ui/Loader';
import type { DashboardOverviewStats, ChartData } from '@/types/dashboard';

const AttendanceChart = lazy(() => import('@/components/charts/AttendanceChart'));

interface StaffAdminOverviewTabProps {
  user: any;
}

export const StaffAdminOverviewTab: React.FC<StaffAdminOverviewTabProps> = ({ user }) => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardOverviewStats | null>(null);
  const [academicStats, setAcademicStats] = useState<AcademicStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [overviewRes, chartRes, academicRes] = await Promise.allSettled([
          getDashboardOverview(),
          getAttendanceChart(),
          getAcademicStats()
        ]);

        if (!isMounted) return;

        if (overviewRes.status === 'fulfilled' && overviewRes.value?.data) {
          setStats(overviewRes.value.data);
        }
        if (chartRes.status === 'fulfilled' && chartRes.value?.data) {
          setChartData(chartRes.value.data);
        }
        if (academicRes.status === 'fulfilled' && academicRes.value?.data) {
          setAcademicStats(academicRes.value.data);
        }
      } catch (err) {
        console.warn('[StaffAdminOverviewTab] Failed to load some dashboard metrics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Pagi';
    if (hour < 15) return 'Siang';
    if (hour < 19) return 'Sore';
    return 'Malam';
  };

  const totalSiswa = stats?.total_siswa ?? academicStats?.total_siswa ?? 0;
  const totalGuru = stats?.total_guru ?? academicStats?.total_guru ?? 0;
  const persentaseSiswa = stats?.persentase_siswa ?? 0;
  const persentaseGuru = stats?.persentase_guru ?? 0;

  const quickShortcuts = [
    { label: 'Tahun Pelajaran', icon: Calendar, path: '/academic/tahun-pelajaran', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Data Master Siswa', icon: Users, path: '/academic/siswa', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' },
    { label: 'Jadwal & KBM', icon: CalendarCheck, path: '/kurikulum/jadwal-pelajaran', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Pengaturan Sistem', icon: Settings, path: '/settings', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Selamat {getTimeGreeting()}, {user?.full_name || user?.name || 'Administrator'} 👋
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Inilah ringkasan aktivitas dan operasional sekolah Anda hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
          </p>
        </div>
        <Link
          to="/academic"
          className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all select-none shrink-0"
        >
          <span>Ruang Kerja Akademik</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Workspace App Launcher Portal */}
      <WorkspaceAppLauncherCard workspaceId="ADMIN_WORKSPACE" />

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickShortcuts.map((sc, i) => {
          const Icon = sc.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => navigate(sc.path)}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left shadow-xs hover:shadow-md cursor-pointer group"
            >
              <div className={`p-2.5 rounded-xl ${sc.color} group-hover:scale-105 transition-transform`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate group-hover:text-blue-600 transition-colors">
                  {sc.label}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Buka Menu ➔</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <AnalyticsCard
          title="Total Siswa"
          value={totalSiswa}
          subtitle="Siswa terdaftar aktif"
          icon={<Users size={20} />}
          gradient="from-indigo-500 to-purple-600"
          onClick={() => navigate('/academic/siswa')}
        />
        <AnalyticsCard
          title="Total Guru & Tendik"
          value={totalGuru}
          subtitle="Tenaga pendidik aktif"
          icon={<GraduationCap size={20} />}
          gradient="from-blue-500 to-cyan-600"
          onClick={() => navigate('/academic/guru')}
        />
        <AnalyticsCard
          title="Kehadiran Siswa"
          value={`${persentaseSiswa.toFixed(1)}%`}
          subtitle={`${stats?.siswa_hadir ?? 0} dari ${totalSiswa} siswa hadir`}
          icon={<CalendarCheck size={20} />}
          gradient="from-emerald-500 to-teal-600"
          onClick={() => navigate('/attendance/rekap/siswa-harian')}
        />
        <AnalyticsCard
          title="Kehadiran Guru"
          value={`${persentaseGuru.toFixed(1)}%`}
          subtitle={`${stats?.guru_hadir ?? 0} guru hadir mengajar`}
          icon={<CalendarCheck size={20} />}
          gradient="from-amber-500 to-orange-600"
          onClick={() => navigate('/attendance/monitoring')}
        />
      </div>

      {/* Attendance Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <Suspense fallback={<div className="h-[350px] flex items-center justify-center"><Loader /></div>}>
          <AttendanceChart 
            data={chartData}
            title="Tren Kehadiran Bulanan Siswa & Guru"
            height={350}
          />
        </Suspense>
      </div>

      {/* Detailed Attendance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Users size={16} className="text-emerald-500" />
            Detail Kehadiran Siswa Hari Ini
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Hadir Tepat Waktu / Terlambat</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats?.siswa_hadir ?? 0} Siswa</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Izin (Disetujui Piket/Walas)</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400">{stats?.siswa_izin ?? 0} Siswa</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sakit (Keterangan Medis)</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">{stats?.siswa_sakit ?? 0} Siswa</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Alpa / Tanpa Keterangan</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">{stats?.siswa_alpa ?? 0} Siswa</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-4 flex items-center gap-2">
            <GraduationCap size={16} className="text-blue-500" />
            Detail Kehadiran Guru Hari Ini
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Guru Hadir / Mengajar di Kelas</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats?.guru_hadir ?? 0} Guru</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Guru Belum Hadir / Izin / Alpa</span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400">{stats?.guru_tidak_hadir ?? 0} Guru</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
export default StaffAdminOverviewTab;
