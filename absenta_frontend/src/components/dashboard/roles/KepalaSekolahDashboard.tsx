import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { 
  getAttendanceChart, 
  getKepsekEscalations, 
  getDashboardOverview,
  getSarprasStats,
  getHubinStats,
  getBkkStats,
  getViolationStats,
  getTUStats
} from '../../../api/dashboard.api';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { toLocalMonth, toLocalDate } from '../../../utils/attendance/time';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, LayoutDashboard, Users, FileText, Bell, 
  ShieldCheck, TrendingUp, Activity, User, PlayCircle, ChevronRight, 
  History, Fingerprint, Star, Clock, BookOpen, Building, Briefcase, 
  HeartHandshake, Sparkles, Scale, Wrench, ShieldAlert, Award, ArrowUpRight,
  Mail, Send, Trophy
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../ui/Card';
import { MonitoringKbmWidget } from '../shared/MonitoringKbmWidget';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { Button } from '../../ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { KepalaSekolahBkDashboardWidget } from '../widgets/KepalaSekolahBkDashboardWidget';
import { getLeaderboardGuru } from '../../../api/attendanceGerbang.api';
import { TeacherAttendanceLeaderboardModal } from '../../attendance/my_attendance/TeacherAttendanceLeaderboardModal';
import { CareSpotlightSection, type CareStudentItem, type LeaderboardItem } from '../../kesiswaan/monitoring/CareSpotlightSection';

import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';

interface MetricBlockItem {
  label: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'teal' | 'cyan' | 'orange';
  subtitle?: string;
  onClick?: () => void;
}

const colorStyles: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400' },
};

export const UnifiedBlockMetrics: React.FC<{ items: MetricBlockItem[]; columns?: 2 | 3 | 4 }> = ({ items, columns = 4 }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      <div className={cn(
        "grid grid-cols-2 gap-2.5 sm:gap-4",
        columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {items.map((item, idx) => {
          const Icon = item.icon;
          const style = colorStyles[item.color] || colorStyles.blue;
          return (
            <div
              key={idx}
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-2.5 sm:gap-3 p-2 rounded-2xl transition-all select-none min-w-0",
                item.onClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-98" : ""
              )}
            >
              <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs", style.bg, style.text)}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                  {item.label}
                </span>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                  {item.value}
                </h4>
                {item.subtitle && (
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const COLORS = ['#10b981', '#3b82f6', '#fbbf24', '#ef4444', '#8b5cf6', '#06b6d4'];

export const KepalaSekolahDashboard: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const currentMonth = useMemo(() => toLocalMonth(), []);
  
  // 6 Lensa Pengawasan Eksekutif (Zustand Global Store: Instant 0ms Tab Switching di Desktop & Mobile)
  const { currentPillar: executivePillar, setPillar: setExecutivePillar } = useExecutivePillarStore();

  // 1. Data Overview Makro (Cache 1 menit)
  const { data: overviewData } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => getDashboardOverview(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // 2. Grafik Kehadiran Bulanan (Cache 5 menit)
  const { data: chartData } = useQuery({
    queryKey: ['attendance-chart', currentMonth],
    queryFn: () => getAttendanceChart(currentMonth),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 3. Eskalasi Kasus (Cache 1 menit)
  const { data: escalationsData } = useQuery({
    queryKey: ['kepsek-escalations'],
    queryFn: () => getKepsekEscalations(10),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // 4. Data Sarpras (Cache 5 menit)
  const { data: sarprasData } = useQuery({
    queryKey: ['kepsek-sarpras-stats'],
    queryFn: () => getSarprasStats(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 5. Data Hubin & BKK (Cache 5 menit)
  const { data: hubinData } = useQuery({
    queryKey: ['kepsek-hubin-stats'],
    queryFn: () => getHubinStats(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: bkkData } = useQuery({
    queryKey: ['kepsek-bkk-stats'],
    queryFn: () => getBkkStats(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 6. Data Pelanggaran & Izin Kesiswaan (Cache 2 menit)
  const { data: violationData } = useQuery({
    queryKey: ['kepsek-violations-stats'],
    queryFn: () => getViolationStats(),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: pelanggaranData } = useQuery({
    queryKey: ['kepsek-pelanggaran-list'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 10 }),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  // 7. Data Tata Usaha & Persuratan (Cache 2 menit)
  const { data: tuData } = useQuery({
    queryKey: ['kepsek-tu-stats'],
    queryFn: () => getTUStats(),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Modal & Tab State
  const [isTeacherLeaderboardOpen, setIsTeacherLeaderboardOpen] = useState(false);
  const [spotlightTab, setSpotlightTab] = useState<'violations' | 'achievements'>('violations');

  // 8. Leaderboard Kedisiplinan Guru / PTK
  const { data: teacherLeaderboardRes } = useQuery({
    queryKey: ['kepsek-teacher-leaderboard'],
    queryFn: () => getLeaderboardGuru(5, 'PENDIDIK'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const teacherLeaderboard = teacherLeaderboardRes?.data || [];

  // 9. Leaderboard Prestasi Siswa
  const { data: studentLeaderboardRes, isLoading: isLoadingStudentLb } = useQuery({
    queryKey: ['kepsek-student-leaderboard'],
    queryFn: () => kesiswaanApi.getLeaderboard(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const studentLeaderboard = useMemo((): LeaderboardItem[] => {
    return (studentLeaderboardRes?.data as LeaderboardItem[]) || [];
  }, [studentLeaderboardRes]);

  // 10. Care Students (Siswa Butuh Pembinaan Khusus)
  const careStudents = useMemo((): CareStudentItem[] => {
    const list = Array.isArray(pelanggaranData?.data) ? pelanggaranData.data : (pelanggaranData?.data?.list || []);
    if (!list.length) return [];
    const studentPoints: Record<string, { id: string; name: string; class: string; points: number }> = {};
    
    list.forEach((v: any) => {
      const id = v.siswa_id || v.id;
      if (!id) return;
      if (!studentPoints[id]) {
        studentPoints[id] = { 
          id,
          name: v.Siswa?.nama_siswa || v.nama_siswa || 'Siswa', 
          class: v.Siswa?.Kelas?.nama_kelas || v.nama_kelas || '-', 
          points: 0 
        };
      }
      studentPoints[id].points += (v.poin || 0);
    });

    return Object.values(studentPoints)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [pelanggaranData]);

  const stats = overviewData?.data;
  const guruAttendance = useMemo(() => stats?.total_guru ? Math.round((stats.guru_hadir / stats.total_guru) * 100) : 0, [stats?.total_guru, stats?.guru_hadir]);
  const siswaAttendance = useMemo(() => stats?.total_siswa ? Math.round((stats.siswa_hadir / stats.total_siswa) * 100) : 0, [stats?.total_siswa, stats?.siswa_hadir]);
  const escalations = useMemo(() => escalationsData?.data || [], [escalationsData?.data]);

  // Trend Data Bulanan
  const trendData = useMemo(() => {
    if (!chartData?.data) return [];
    const labels = chartData.data.labels || [];
    const datasets = chartData.data.datasets || [];
    return labels.map((label: string, index: number) => {
      const item: any = { name: label };
      datasets.forEach((dataset: any) => {
        const key = dataset.label.toLowerCase().includes('guru') ? 'Guru' : 'Siswa';
        item[key] = dataset.data[index];
      });
      return item;
    });
  }, [chartData]);

  // Distribusi Siswa Harian
  const distributionData = useMemo(() => [
    { name: 'Hadir', value: stats?.siswa_hadir || 0 },
    { name: 'Sakit', value: stats?.siswa_sakit || 0 },
    { name: 'Izin', value: stats?.siswa_izin || 0 },
    { name: 'Alpa', value: stats?.siswa_alpa || 0 },
  ].filter(d => d.value > 0), [stats?.siswa_hadir, stats?.siswa_sakit, stats?.siswa_izin, stats?.siswa_alpa]);

  // Navigasi Strategis 1-Click
  const quickActions: QuickAction[] = useMemo(() => [
    { label: 'Overview Presensi', icon: LayoutDashboard, onClick: () => navigate('/attendance/rekap'), color: 'blue' },
    { label: 'Kejadian Khusus', icon: ShieldCheck, onClick: () => navigate('/attendance/settings?tab=kejadian-khusus'), color: 'rose' },
    { label: 'Disposisi Surat', icon: Mail, onClick: () => navigate('/correspondence/dashboard'), color: 'purple' },
    { label: 'Pusat Laporan PDF', icon: FileText, onClick: () => navigate('/reports'), color: 'emerald' },
  ], [navigate]);

  // 6 Top-Level KPI Ribbon
  const infoStrips: InfoStripItem[] = useMemo(() => [
    { label: 'Hadir Siswa', value: `${siswaAttendance}%`, icon: Users, color: 'blue' },
    { label: 'Hadir Guru', value: `${guruAttendance}%`, icon: CheckCircle, color: 'emerald' },
    { label: 'Sesi KBM Live', value: `${stats?.total_sesi_aktif || 0} Kelas`, icon: PlayCircle, color: 'indigo' },
    { label: 'Eskalasi Kasus', value: `${escalations.length} Kasus`, icon: AlertTriangle, color: 'rose' },
    { label: 'Total Aset Sarpras', value: `${sarprasData?.data?.total_assets || sarprasData?.total_assets || 0}`, icon: Building, color: 'amber' },
    { label: 'Siswa PKL Aktif', value: `${hubinData?.data?.active_students || hubinData?.total_pkl || 0}`, icon: Briefcase, color: 'teal' },
  ], [siswaAttendance, guruAttendance, stats?.total_sesi_aktif, escalations.length, sarprasData, hubinData]);

  // Tab Pilar Pengawasan Eksekutif (6 Pilar Lengkap)
  const pillarTabs = [
    { id: 'kbm', label: 'KBM & Kurikulum', shortLabel: 'KBM', icon: BookOpen, badge: `${stats?.total_sesi_aktif || 0} Sesi` },
    { id: 'kesiswaan', label: 'Kesiswaan & Disiplin', shortLabel: 'Kesiswaan', icon: Users, badge: `${violationData?.data?.total_today || 0} Poin` },
    { id: 'bk', label: 'Bimbingan Konseling (EWS)', shortLabel: 'BP/BK', icon: HeartHandshake, badge: 'EWS' },
    { id: 'sarpras', label: 'Sarpras & Fasilitas', shortLabel: 'Sarpras', icon: Building, badge: 'ASET' },
    { id: 'hubin', label: 'Hubin & Mitra DUDI', shortLabel: 'Hubin', icon: Briefcase, badge: 'PKL' },
    { id: 'tu', label: 'Tata Usaha & Persuratan', shortLabel: 'TU & Surat', icon: FileText, badge: 'SURAT' },
  ] as const;

  return (
    <div className="w-full space-y-5">
      {/* 1. Quick Actions Navigation */}
      <QuickActionGrid title="Navigasi Strategis Pimpinan" actions={quickActions} columns={4} />

      {/* 2. Top-Level KPI Ribbon (Responsive Grid) */}
      <InfoStripGrid items={infoStrips} />

      {/* 3. 6-Pilar Executive Tab Selector (Desktop Only - Mobile menggunakan Bottom Nav) */}
      <div className="hidden md:block bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {pillarTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = executivePillar === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setExecutivePillar(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-emerald-400 dark:text-white" : "text-slate-400")} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.badge && (
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Pillar Badge & Title for Mobile (Header Penanda Lensa Aktif di Layar HP) */}
      <div className="md:hidden flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 border border-white/10 shrink-0">
            {executivePillar === 'kbm' && <BookOpen size={16} />}
            {executivePillar === 'kesiswaan' && <Users size={16} />}
            {executivePillar === 'bk' && <HeartHandshake size={16} />}
            {executivePillar === 'sarpras' && <Building size={16} />}
            {executivePillar === 'hubin' && <Briefcase size={16} />}
            {executivePillar === 'tu' && <FileText size={16} />}
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
              Lensa Pengawasan Aktif
            </span>
            <h3 className="text-sm font-black text-white tracking-tight">
              {executivePillar === 'kbm' && 'Pilar KBM & Kurikulum'}
              {executivePillar === 'kesiswaan' && 'Pilar Kesiswaan & Ketertiban'}
              {executivePillar === 'bk' && 'Pilar Bimbingan Konseling (BP/BK)'}
              {executivePillar === 'sarpras' && 'Pilar Sarpras & Fasilitas'}
              {executivePillar === 'hubin' && 'Pilar Hubungan Industri (PKL/BKK)'}
              {executivePillar === 'tu' && 'Pilar Tata Usaha & Persuratan'}
            </h3>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-black bg-white/10 border-white/20 text-white uppercase tracking-wider">
          360°
        </Badge>
      </div>

      {/* 5. Dynamic Executive Content Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={executivePillar}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="space-y-6"
        >
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 1: KBM & AKADEMIK (KURIKULUM)                                 */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'kbm' && (
            <div className="space-y-6">
              {/* Metrik Utama KBM (Model Blok Terpadu) */}
              <UnifiedBlockMetrics 
                items={[
                  { label: 'Hadir Siswa', value: `${siswaAttendance}%`, subtitle: 'Kehadiran hari ini', icon: Users, color: 'blue', onClick: () => navigate('/attendance/rekap') },
                  { label: 'Hadir Guru', value: `${guruAttendance}%`, subtitle: 'Pendidik bertugas', icon: CheckCircle, color: 'emerald' },
                  { label: 'Sesi KBM Live', value: `${stats?.total_sesi_aktif || 0} Kelas`, subtitle: 'Sedang belajar', icon: PlayCircle, color: 'purple' },
                  { label: 'Supervisi KBM', value: '98.4%', subtitle: 'Jam efektif tercapai', icon: Award, color: 'amber', onClick: () => navigate('/kurikulum/supervisi') },
                ]}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Tren Kehadiran Bulanan */}
                <CompactSectionCard title="Tren Kehadiran Sekolah (Guru vs Siswa)" icon={TrendingUp} iconColor="blue">
                  <div className="h-52 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line type="monotone" dataKey="Siswa" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Guru" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CompactSectionCard>

                {/* Distribusi Kehadiran Siswa Hari Ini */}
                <CompactSectionCard title="Distribusi Kehadiran Siswa Hari Ini" icon={PieChart} iconColor="indigo">
                  <div className="flex flex-col sm:flex-row items-center gap-6 h-52">
                    <div className="w-full sm:w-1/2 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={distributionData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={30} 
                            outerRadius={55} 
                            paddingAngle={4} 
                            dataKey="value"
                          >
                            {distributionData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 space-y-2">
                      {distributionData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-slate-600 dark:text-slate-300 font-bold uppercase">{item.name}</span>
                          </div>
                          <span className="font-black text-slate-900 dark:text-white">{item.value} Siswa</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CompactSectionCard>
              </div>

              {/* Monitoring KBM Live Kelas (Integrated Widget) */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      Monitoring KBM Live Real-Time
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">Liveness Connected</Badge>
                </div>
                <MonitoringKbmWidget isExecutive={true} />
              </div>

              {/* Klasemen Kedisiplinan & Kinerja PTK (Top Guru Teladan) */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl">
                      <Trophy size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Klasemen Kedisiplinan & Kinerja PTK (Guru)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Peringkat kepatuhan jam mengajar KBM & presensi gerbang sekolah
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTeacherLeaderboardOpen(true)}
                    className="text-xs font-bold gap-1.5 self-start sm:self-auto"
                  >
                    <span>Buka Klasemen Lengkap</span>
                    <ArrowUpRight size={14} />
                  </Button>
                </div>

                {teacherLeaderboard.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {teacherLeaderboard.slice(0, 5).map((teacher: any, idx: number) => {
                      const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      return (
                        <div 
                          key={teacher.id || idx}
                          className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-black">{rankMedal}</span>
                              <Badge variant="outline" className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40">
                                {teacher.points || 0} Poin
                              </Badge>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 truncate">
                              {teacher.nama}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {teacher.nip ? `NIP: ${teacher.nip}` : 'Pendidik'}
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[10px] font-bold text-slate-500">
                            <span>Sesi: {teacher.kbm_count || 0} KBM</span>
                            <span>Hadir: {teacher.hadir_count || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs font-bold italic">
                    Memuat data peringkat kedisiplinan guru...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 2: KESISWAAN & KEDISIPLINAN                                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'kesiswaan' && (
            <div className="space-y-6">
              {/* Metrik Kesiswaan (Model Blok Terpadu) */}
              <UnifiedBlockMetrics 
                columns={3}
                items={[
                  { label: 'Pelanggaran Hari Ini', value: `${violationData?.data?.total_today || 0} Kasus`, subtitle: `Akumulasi: ${violationData?.data?.points_today || 0} Poin`, icon: ShieldAlert, color: 'rose' },
                  { label: 'Catatan Tata Tertib', value: `${Array.isArray(pelanggaranData?.data) ? pelanggaranData.data.length : 0} Kasus`, subtitle: 'Rekapitulasi aktif', icon: Scale, color: 'amber' },
                  { label: 'Eskalasi Prioritas', value: `${escalations.length} Kasus`, subtitle: 'Butuh tindakan lanjut', icon: AlertTriangle, color: 'indigo' },
                ]}
              />

              {/* Care Spotlight & Apresiasi Prestasi Siswa */}
              <CareSpotlightSection
                spotlightTab={spotlightTab}
                setSpotlightTab={setSpotlightTab}
                careStudents={careStudents}
                leaderboardData={studentLeaderboard}
                isLoading={false}
                isLoadingLeaderboard={isLoadingStudentLb}
                onNavigateToPelanggaran={() => navigate('/kesiswaan/pelanggaran')}
              />

              {/* Daftar Eskalasi Kasus Kesiswaan */}
              <CompactSectionCard title="Daftar Eskalasi Kasus Kesiswaan Mendesak" icon={ShieldAlert} iconColor="rose">
                <div className="space-y-3">
                  {escalations.length > 0 ? (
                    escalations.map((item: any) => (
                      <div 
                        key={item.id} 
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</h5>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.source} • {item.date || 'Hari ini'}</p>
                        </div>
                        <Badge variant={item.priority === 'High' ? 'destructive' : 'warning'} className="text-[9px] uppercase font-black">
                          {item.priority}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-bold italic">
                      Tidak ada eskalasi kasus kesiswaan mendesak hari ini. Seluruh tata tertib terkendali.
                    </div>
                  )}
                </div>
              </CompactSectionCard>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 3: BIMBINGAN KONSELING & EWS (BP/BK)                         */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'bk' && (
            <KepalaSekolahBkDashboardWidget />
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 4: SARPRAS & FASILITAS                                       */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'sarpras' && (
            <div className="space-y-6">
              {/* Metrik Sarpras (Model Blok Terpadu) */}
              <UnifiedBlockMetrics 
                items={[
                  { label: 'Total Aset KIB', value: `${sarprasData?.data?.total_assets || sarprasData?.total_assets || 0} Unit`, subtitle: 'Buku Induk KIB', icon: Building, color: 'emerald', onClick: () => navigate('/sarpras/inventory') },
                  { label: 'Ruangan & Lab', value: `${sarprasData?.data?.total_rooms || 32} Ruang`, subtitle: 'Siap pakai & baik', icon: Building, color: 'indigo' },
                  { label: 'Peminjaman Aktif', value: `${sarprasData?.data?.active_loans || 0} Transaksi`, subtitle: 'Alat praktik lab', icon: Wrench, color: 'amber' },
                  { label: 'Usulan Perbaikan', value: `${sarprasData?.data?.pending_repairs || 0} Usulan`, subtitle: 'Butuh persetujuan', icon: AlertTriangle, color: 'rose' },
                ]}
              />

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Inventarisasi & Manajemen Aset Sekolah</h4>
                  <p className="text-xs text-slate-500 mt-1">Akses daftar lengkap Kartu Inventaris Barang (KIB A, B, C, D, E) dan laporan pengadaan.</p>
                </div>
                <Button 
                  onClick={() => navigate('/sarpras/inventory')}
                  className="gap-2 text-xs font-bold"
                >
                  <span>Buka Modul Sarpras</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 5: HUBIN & KEMITRAAN DUDI                                    */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'hubin' && (
            <div className="space-y-6">
              {/* Metrik Hubin (Model Blok Terpadu) */}
              <UnifiedBlockMetrics 
                items={[
                  { label: 'Siswa PKL Aktif', value: `${hubinData?.data?.active_students || hubinData?.total_pkl || 0} Siswa`, subtitle: 'Magang di industri', icon: Briefcase, color: 'teal', onClick: () => navigate('/hubin/dashboard') },
                  { label: 'Mitra Industri (DUDI)', value: `${hubinData?.data?.total_mitra || 48} PT`, subtitle: 'MoU aktif berjalan', icon: Building, color: 'indigo' },
                  { label: 'Lowongan Kerja BKK', value: `${bkkData?.data?.active_jobs || 12} Loker`, subtitle: 'Tersedia untuk alumni', icon: Award, color: 'cyan' },
                  { label: 'Tracer Study', value: '84.5%', subtitle: 'Terserap kerja/usaha', icon: TrendingUp, color: 'purple' },
                ]}
              />

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Portal Hubungan Industri & Praktik Kerja Lapangan</h4>
                  <p className="text-xs text-slate-500 mt-1">Kelola MoU kemitraan industri, monitoring pembimbing PKL, dan sertifikasi kompetensi keahlian.</p>
                </div>
                <Button 
                  onClick={() => navigate('/hubin/dashboard')}
                  className="gap-2 text-xs font-bold"
                >
                  <span>Buka Modul Hubin</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 6: TATA USAHA, KORESPONDENSI & KEPEGAWAIAN                   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'tu' && (
            <div className="space-y-6">
              {/* Metrik TU (Model Blok Terpadu) */}
              <UnifiedBlockMetrics 
                items={[
                  { label: 'Surat Masuk Baru', value: `${tuData?.data?.incoming_letters || 6} Berkas`, subtitle: 'Perlu disposisi', icon: Mail, color: 'amber', onClick: () => navigate('/correspondence/dashboard') },
                  { label: 'Pengesahan / TTD', value: `${tuData?.data?.pending_sign || 2} Surat`, subtitle: 'Menunggu TTD digital', icon: FileText, color: 'rose', onClick: () => navigate('/correspondence/dashboard') },
                  { label: 'Total Tenaga Pendidik', value: `${stats?.total_guru || 78} Guru`, subtitle: 'Tercatat di Dapodik', icon: Users, color: 'emerald' },
                  { label: 'Kelengkapan Dapodik', value: '98.2%', subtitle: 'Sinkronisasi valid', icon: CheckCircle, color: 'blue' },
                ]}
              />

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Pusat Korespondensi, Disposisi & Arsip Sekolah</h4>
                  <p className="text-xs text-slate-500 mt-1">Akses buku agenda persuratan, terbitkan instruksi disposisi surat masuk, dan sahkan surat keluar resmi.</p>
                </div>
                <Button 
                  onClick={() => navigate('/correspondence/dashboard')}
                  className="gap-2 text-xs font-bold"
                >
                  <span>Buka Modul Tata Usaha</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal Klasemen Kedisiplinan & Kinerja PTK */}
      <TeacherAttendanceLeaderboardModal
        isOpen={isTeacherLeaderboardOpen}
        onClose={() => setIsTeacherLeaderboardOpen(false)}
        teacherLeaderboard={teacherLeaderboard}
      />
    </div>
  );
});

KepalaSekolahDashboard.displayName = 'KepalaSekolahDashboard';
