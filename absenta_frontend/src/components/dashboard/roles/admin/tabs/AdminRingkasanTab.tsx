import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Calendar,
  Settings,
  ShieldCheck,
  Server,
  Activity,
  ArrowRight,
  BookOpen,
  Building2,
  Key,
  Layers,
  Database,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getDashboardOverview, getAttendanceChart } from '@/api/dashboard.api';
import { getAcademicStats, type AcademicStats } from '@/api/academic-stats.api';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { Loader } from '@/components/ui/Loader';
import { AdminTabId } from '../types';
import type { DashboardOverviewStats, ChartData } from '@/types/dashboard';

const AttendanceChart = lazy(() => import('@/components/charts/AttendanceChart'));

export interface AdminRingkasanTabProps {
  user?: any;
  onNavigateSubtab?: (subtab: AdminTabId) => void;
}

export const AdminRingkasanTab: React.FC<AdminRingkasanTabProps> = React.memo(({
  user,
  onNavigateSubtab,
}) => {
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
          getAcademicStats(),
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
        console.warn('[AdminRingkasanTab] Failed to load some dashboard metrics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalSiswa = stats?.total_siswa ?? academicStats?.total_siswa ?? 0;
  const totalGuru = stats?.total_guru ?? academicStats?.total_guru ?? 0;
  const persentaseSiswa = stats?.persentase_siswa ?? 0;
  const persentaseGuru = stats?.persentase_guru ?? 0;

  const quickShortcuts = useMemo(
    () => [
      {
        label: 'Data Master Siswa',
        sublabel: `${totalSiswa} Siswa Aktif`,
        icon: Users,
        subtab: 'siswa' as AdminTabId,
        color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/40',
      },
      {
        label: 'Data Guru & Tendik',
        sublabel: `${totalGuru} Pendidik & Staf`,
        icon: GraduationCap,
        subtab: 'guru' as AdminTabId,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/40',
      },
      {
        label: 'Rombel & Kelas',
        sublabel: 'Kelola Rombongan Belajar',
        icon: Layers,
        subtab: 'kelas' as AdminTabId,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40',
      },
      {
        label: 'Tahun Pelajaran',
        sublabel: 'Kalender & Semester',
        icon: Calendar,
        subtab: 'tahun_pelajaran' as AdminTabId,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40',
      },
      {
        label: 'Akun Pengguna',
        sublabel: 'Manajemen Hak Akses',
        icon: Key,
        subtab: 'users' as AdminTabId,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/40',
      },
      {
        label: 'Pengaturan Sistem',
        sublabel: 'WhatsApp & Konfigurasi',
        icon: Settings,
        subtab: 'pengaturan' as AdminTabId,
        color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/40',
      },
    ],
    [totalSiswa, totalGuru]
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Workspace App Launcher Portal ── */}
      <WorkspaceAppLauncherCard workspaceId="ADMIN_WORKSPACE" />

      {/* ── 2. Quick Shortcuts Operasional Admin ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {quickShortcuts.map((sc, i) => {
          const Icon = sc.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (onNavigateSubtab) {
                  onNavigateSubtab(sc.subtab);
                }
              }}
              className="flex flex-col p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left shadow-2xs hover:shadow-xs cursor-pointer group"
            >
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2.5 ${sc.color} group-hover:scale-105 transition-transform`}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                {sc.label}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {sc.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Key Metrics Grid (AnalyticsCard Premium) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Total Siswa"
          value={totalSiswa}
          description="Siswa terdaftar aktif"
          icon={<Users size={20} className="text-indigo-400" />}
          gradient="from-indigo-600 to-purple-600"
          onClick={() => onNavigateSubtab && onNavigateSubtab('siswa')}
        />
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Total Guru & Tendik"
          value={totalGuru}
          description="Tenaga pendidik & staf aktif"
          icon={<GraduationCap size={20} className="text-cyan-400" />}
          gradient="from-blue-600 to-cyan-600"
          onClick={() => onNavigateSubtab && onNavigateSubtab('guru')}
        />
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Kehadiran Siswa"
          value={`${persentaseSiswa.toFixed(1)}%`}
          description={`${stats?.siswa_hadir ?? 0} dari ${totalSiswa} hadir hari ini`}
          icon={<CalendarCheck size={20} className="text-emerald-400" />}
          gradient="from-emerald-600 to-teal-700"
        />
        <AnalyticsCard
          variant="compact-premium"
          mobileCompact={true}
          title="Kehadiran Guru"
          value={`${persentaseGuru.toFixed(1)}%`}
          description={`${stats?.guru_hadir ?? 0} guru mengajar di kelas`}
          icon={<CheckCircle2 size={20} className="text-amber-400" />}
          gradient="from-amber-500 to-orange-600"
        />
      </div>

      {/* ── 4. Attendance Chart ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Tren Kehadiran Bulanan Siswa &amp; Guru</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grafik komparasi kedisiplinan dan absensi harian pergerakan kehadiran sekolah.
            </p>
          </div>
        </div>

        <Suspense fallback={<div className="h-[300px] flex items-center justify-center"><Loader /></div>}>
          <AttendanceChart 
            data={chartData}
            title="Tren Kehadiran Bulanan Siswa & Guru"
            height={300}
          />
        </Suspense>
      </div>

      {/* ── 5. Detailed Attendance Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Siswa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Users size={15} className="text-emerald-500" />
            <span>Detail Kehadiran Siswa Hari Ini</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">Hadir</span>
              <span className="text-base font-black text-emerald-800 dark:text-emerald-300">{stats?.siswa_hadir ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block uppercase">Izin</span>
              <span className="text-base font-black text-amber-800 dark:text-amber-300">{stats?.siswa_izin ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-center">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 block uppercase">Sakit</span>
              <span className="text-base font-black text-blue-800 dark:text-blue-300">{stats?.siswa_sakit ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-center">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block uppercase">Alpa</span>
              <span className="text-base font-black text-rose-800 dark:text-rose-300">{stats?.siswa_alpa ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Guru */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <GraduationCap size={15} className="text-blue-500" />
            <span>Detail Kehadiran Guru &amp; Tendik Hari Ini</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">Hadir Mengajar</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Guru di sekolah</span>
              </div>
              <span className="text-lg font-black text-emerald-800 dark:text-emerald-300">{stats?.guru_hadir ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block uppercase">Belum Hadir / Absen</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Izin, sakit, alpa</span>
              </div>
              <span className="text-lg font-black text-rose-800 dark:text-rose-300">{stats?.guru_tidak_hadir ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AdminRingkasanTab.displayName = 'AdminRingkasanTab';
export default AdminRingkasanTab;
