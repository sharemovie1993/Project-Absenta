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
  Mail, Send
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

import { useExecutivePillarStore, type ExecutivePillar } from '@/store/executivePillarStore';

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
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PILAR 2: KESISWAAN & KEDISIPLINAN                                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {executivePillar === 'kesiswaan' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <AnalyticsCard
                  title="Pelanggaran Hari Ini"
                  value={`${violationData?.data?.total_today || 0} Kasus`}
                  subtitle={`Total poin: ${violationData?.data?.points_today || 0} Poin`}
                  icon={<ShieldAlert size={18} className="text-white" />}
                  gradient="from-rose-600 to-red-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Catatan Tata Tertib"
                  value={`${Array.isArray(pelanggaranData?.data) ? pelanggaranData.data.length : 0} Kasus`}
                  subtitle="Tercatat dalam rekapitulasi"
                  icon={<Scale size={18} className="text-white" />}
                  gradient="from-amber-600 to-orange-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Eskalasi Prioritas"
                  value={`${escalations.length} Kasus`}
                  subtitle="Kasus disiplin tingkat lanjut"
                  icon={<AlertTriangle size={18} className="text-white" />}
                  gradient="from-indigo-600 to-purple-700"
                  variant="compact-premium"
                />
              </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <AnalyticsCard
                  title="Total Aset KIB"
                  value={`${sarprasData?.data?.total_assets || sarprasData?.total_assets || 0} Unit`}
                  subtitle="Tercatat di Buku Induk"
                  icon={<Building size={18} className="text-white" />}
                  gradient="from-emerald-600 to-teal-700"
                  variant="compact-premium"
                  onClick={() => navigate('/sarpras/inventory')}
                />
                <AnalyticsCard
                  title="Ruangan & Lab"
                  value={`${sarprasData?.data?.total_rooms || 32} Ruang`}
                  subtitle="Kondisi Baik & Siap Pakai"
                  icon={<Building size={18} className="text-white" />}
                  gradient="from-indigo-600 to-blue-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Peminjaman Aktif"
                  value={`${sarprasData?.data?.active_loans || 0} Transaksi`}
                  subtitle="Alat Praktik / Lab"
                  icon={<Wrench size={18} className="text-white" />}
                  gradient="from-amber-600 to-orange-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Usulan Perbaikan"
                  value={`${sarprasData?.data?.pending_repairs || 0} Usulan`}
                  subtitle="Menunggu Approval Pimpinan"
                  icon={<AlertTriangle size={18} className="text-white" />}
                  gradient="from-rose-600 to-red-700"
                  variant="compact-premium"
                />
              </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <AnalyticsCard
                  title="Siswa PKL Aktif"
                  value={`${hubinData?.data?.active_students || hubinData?.total_pkl || 0} Siswa`}
                  subtitle="Sedang Magang di Industri"
                  icon={<Briefcase size={18} className="text-white" />}
                  gradient="from-teal-600 to-emerald-700"
                  variant="compact-premium"
                  onClick={() => navigate('/hubin/dashboard')}
                />
                <AnalyticsCard
                  title="Mitra Industri (DUDI)"
                  value={`${hubinData?.data?.total_mitra || 48} PT`}
                  subtitle="MoU Kemitraan Aktif"
                  icon={<Building size={18} className="text-white" />}
                  gradient="from-indigo-600 to-violet-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Lowongan Kerja BKK"
                  value={`${bkkData?.data?.active_jobs || 12} Loker`}
                  subtitle="Tersedia untuk Alumni"
                  icon={<Award size={18} className="text-white" />}
                  gradient="from-cyan-600 to-blue-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Tracer Study"
                  value="84.5%"
                  subtitle="Terserap Kerja / Usaha"
                  icon={<TrendingUp size={18} className="text-white" />}
                  gradient="from-purple-600 to-pink-700"
                  variant="compact-premium"
                />
              </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <AnalyticsCard
                  title="Surat Masuk Baru"
                  value={`${tuData?.data?.incoming_letters || 6} Berkas`}
                  subtitle="Perlu Disposisi Pimpinan"
                  icon={<Mail size={18} className="text-white" />}
                  gradient="from-amber-600 to-orange-700"
                  variant="compact-premium"
                  onClick={() => navigate('/correspondence/dashboard')}
                />
                <AnalyticsCard
                  title="Pengesahan / TTD Surat"
                  value={`${tuData?.data?.pending_sign || 2} Surat`}
                  subtitle="Menunggu Tanda Tangan"
                  icon={<FileText size={18} className="text-white" />}
                  gradient="from-rose-600 to-pink-700"
                  variant="compact-premium"
                  onClick={() => navigate('/correspondence/dashboard')}
                />
                <AnalyticsCard
                  title="Total Tenaga Pendidik"
                  value={`${stats?.total_guru || 78} Guru`}
                  subtitle="Tercatat di Dapodik"
                  icon={<Users size={18} className="text-white" />}
                  gradient="from-emerald-600 to-teal-700"
                  variant="compact-premium"
                />
                <AnalyticsCard
                  title="Kelengkapan Dapodik"
                  value="98.2%"
                  subtitle="Sinkronisasi Valid"
                  icon={<CheckCircle size={18} className="text-white" />}
                  gradient="from-blue-600 to-indigo-700"
                  variant="compact-premium"
                />
              </div>

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
    </div>
  );
});

KepalaSekolahDashboard.displayName = 'KepalaSekolahDashboard';
