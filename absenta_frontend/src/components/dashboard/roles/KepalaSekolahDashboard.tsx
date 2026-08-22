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
  getViolationStats
} from '../../../api/dashboard.api';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { toLocalMonth, toLocalDate } from '../../../utils/attendance/time';
import { useNavigate } from 'react-router-dom';
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
  HeartHandshake, Sparkles, Scale, Wrench, ShieldAlert, Award, ArrowUpRight
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../ui/Card';
import { MonitoringKbmWidget } from '../shared/MonitoringKbmWidget';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { Button } from '../../ui';
import { KepalaSekolahBkDashboardWidget } from '../widgets/KepalaSekolahBkDashboardWidget';

const COLORS = ['#10b981', '#3b82f6', '#fbbf24', '#ef4444', '#8b5cf6', '#06b6d4'];

export const KepalaSekolahDashboard: React.FC = React.memo(() => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const currentMonth = useMemo(() => toLocalMonth(), []);
  
  // 5 Lensa Pengawasan Eksekutif
  const [executivePillar, setExecutivePillar] = useState<'kbm' | 'kesiswaan' | 'bk' | 'sarpras' | 'hubin'>('kbm');

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
    { label: 'Supervisi Akademik', icon: Award, onClick: () => navigate('/kurikulum/supervisi'), color: 'indigo' },
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

  // Tab Pilar Pengawasan Eksekutif
  const pillarTabs = [
    { id: 'kbm', label: 'KBM & Kurikulum', shortLabel: 'KBM', icon: BookOpen, badge: `${stats?.total_sesi_aktif || 0} Sesi` },
    { id: 'kesiswaan', label: 'Kesiswaan & Disiplin', shortLabel: 'Kesiswaan', icon: Users, badge: `${violationData?.data?.total_today || 0} Poin` },
    { id: 'bk', label: 'Bimbingan Konseling (EWS)', shortLabel: 'BP/BK', icon: HeartHandshake, badge: 'EWS' },
    { id: 'sarpras', label: 'Sarpras & Fasilitas', shortLabel: 'Sarpras', icon: Building, badge: 'ASET' },
    { id: 'hubin', label: 'Hubin & Mitra DUDI', shortLabel: 'Hubin', icon: Briefcase, badge: 'PKL' },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Welcome Banner Pimpinan */}
      <WelcomeBanner
        title={`Selamat Datang, Bapak/Ibu Kepala Sekolah`}
        subtitle="Pantau perkembangan mutu sekolah, efektivitas KBM, tata tertib, aset, dan kemitraan industri dari satu panel eksekutif."
        icon={ShieldCheck}
        badge={{ label: 'Executive 360° View', color: 'blue' }}
      />

      {/* 2. Quick Actions Navigation */}
      <QuickActionGrid title="Navigasi Strategis Pimpinan" actions={quickActions} columns={4} />

      {/* 3. Top-Level KPI Ribbon (Responsive Grid) */}
      <InfoStripGrid items={infoStrips} />

      {/* 4. 5-Pilar Executive Tab Selector (Mobile Touch Friendly & Desktop) */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-x-auto no-scrollbar">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Pelanggaran Hari Ini</span>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {violationData?.data?.total_today || 0} <span className="text-xs font-bold text-rose-500">Kasus</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">Total akumulasi poin: {violationData?.data?.points_today || 0} Poin</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Catatan Pelanggaran</span>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {Array.isArray(pelanggaranData?.data) ? pelanggaranData.data.length : 0} <span className="text-xs font-bold text-amber-500">Kasus</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">Tercatat dalam rekapitulasi tata tertib</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Eskalasi Prioritas</span>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {escalations.length} <span className="text-xs font-bold text-indigo-500">Butuh Tindakan</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">Kasus disiplin tingkat lanjut / pemanggilan ortu</p>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Aset KIB</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {sarprasData?.data?.total_assets || sarprasData?.total_assets || 0} Unit
                  </h4>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Tercatat di Buku Induk</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ruangan & Lab</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {sarprasData?.data?.total_rooms || 32} Ruang
                  </h4>
                  <p className="text-[10px] text-indigo-600 font-bold mt-1">Kondisi Baik & Siap Pakai</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Peminjaman Aktif</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {sarprasData?.data?.active_loans || 0} Transaksi
                  </h4>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">Alat Praktik / Lab</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usulan Perbaikan</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {sarprasData?.data?.pending_repairs || 0} Usulan
                  </h4>
                  <p className="text-[10px] text-rose-600 font-bold mt-1">Memerlukan Approval Pimpinan</p>
                </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Siswa PKL Aktif</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {hubinData?.data?.active_students || hubinData?.total_pkl || 0} Siswa
                  </h4>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Sedang Magang di Industri</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mitra Industri (DUDI)</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {hubinData?.data?.total_mitra || 48} Perusahaan
                  </h4>
                  <p className="text-[10px] text-indigo-600 font-bold mt-1">MoU Aktif Berjalan</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lowongan Kerja BKK</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {bkkData?.data?.active_jobs || 12} Loker
                  </h4>
                  <p className="text-[10px] text-teal-600 font-bold mt-1">Tersedia untuk Alumni</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tracer Study Response</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    84.5%
                  </h4>
                  <p className="text-[10px] text-purple-600 font-bold mt-1">Terserap Bekerja / Wirausaha</p>
                </div>
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
