import React, { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { bpbkApi, bpbkQueryKeys } from '../../../api/bpbk.api';
import { Card } from '../../../components/ui/Card';
import { Loader } from '../../../components/ui/Loader';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AnalyticsCard } from '../../../components/ui/AnalyticsCard';
import { cn } from '../../../lib/utils';
import { formatDate } from '../../../utils/layoutUtils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Search,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  ShieldAlert,
  Calendar
} from 'lucide-react';

interface JurusanStat {
  id: string;
  jurusan: string;
  nama_jurusan: string;
  averageRiskScore: number;
  jumlahKasus: number;
  jumlahPelanggaran: number;
}

interface ClassRiskStat {
  id: string;
  kelas: string;
  jumlahKasus: number;
  averageRiskScore: number;
}

interface AtRiskStudent {
  id: string;
  nama_siswa: string;
  nis: string;
  kelas: string;
  riskScore: number;
  riskLevel: string;
}

interface RiskTrendEvent {
  date: string;
  type: string;
  title: string;
  description: string;
}

interface RiskTrendSnapshot {
  date: string;
  risk_score: number;
  violations_score: number;
  achievement_score: number;
  alpa_count: number;
  active_cases: number;
  risk_level: string;
}

interface RiskTrendData {
  snapshots: RiskTrendSnapshot[];
  events: RiskTrendEvent[];
}

const searchSchema = z.object({
  search: z.string().optional(),
});

export const ReportsSection: React.FC = React.memo(() => {
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  // ── useQuery: Reports Data ────────────────────────────────────────────────
  const { data, isLoading: loading } = useQuery({
    queryKey: bpbkQueryKeys.reports(),
    queryFn: async () => {
      const res = await bpbkApi.getReports();
      if (!res.success) throw new Error(res.message || 'Gagal memuat laporan analitik');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── useQuery: Student Risk Trend ──────────────────────────────────────────
  const { data: trendData, isLoading: trendLoading, error: trendQueryError } = useQuery({
    queryKey: bpbkQueryKeys.studentRiskTrend(selectedStudent?.id || ''),
    queryFn: async () => {
      if (!selectedStudent?.id) return null;
      const res = await bpbkApi.getStudentRiskTrend(selectedStudent.id);
      if (!res.success) throw new Error(res.message || 'Gagal memuat tren risiko');
      return res.data as RiskTrendData;
    },
    enabled: !!selectedStudent?.id,
    staleTime: 5 * 60 * 1000,
  });

  const trendError = trendQueryError ? (trendQueryError instanceof Error ? trendQueryError.message : 'Terjadi kesalahan') : null;

  const handleSelectStudent = (student: AtRiskStudent) => {
    setSelectedStudent(student);
    setTimeout(() => {
      const element = document.getElementById('student-trend-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const statistikKasus = useMemo(() => data?.statistikKasus || { active: 0, completed: 0, reopened: 0 }, [data]);
  const statistikPenyelesaian = useMemo(() => data?.statistikPenyelesaian || { completionRate: 0, meanResolutionTimeDays: 0 }, [data]);
  const statistikReopen = useMemo(() => data?.statistikReopen || { totalReopened: 0 }, [data]);
  const statistikRisiko = useMemo(() => data?.statistikRisiko || { levelDistribution: {}, topRiskStudents: [] }, [data]);
  const statistikJurusan = useMemo(() => (data?.statistikJurusan || []) as JurusanStat[], [data]);
  const statistikKelas = useMemo(() => data?.statistikKelas || { atRisk: [] }, [data]);

  const kasusKategoriData = useMemo(() => {
    const raw = data?.statistikKategori || {};
    return Object.keys(raw)?.map(key => ({
      name: key,
      value: raw[key] || 0
    }));
  }, [data]);

  const riskDistributionData = useMemo(() => {
    const dist = statistikRisiko.levelDistribution || {};
    return [
      { name: 'Kritis (High)', value: dist.HIGH || 0, color: '#ef4444' },
      { name: 'Waspada (Med)', value: dist.MEDIUM || 0, color: '#f59e0b' },
      { name: 'Aman (Low)', value: dist.LOW || 0, color: '#10b981' }
    ];
  }, [statistikRisiko]);

  const CustomizedDot = (props: { cx?: number; cy?: number; payload?: RiskTrendSnapshot & { hasEvent?: boolean } }) => {
    const { cx, cy, payload } = props;
    if (payload && payload.hasEvent && cx !== undefined && cy !== undefined) {
      return (
        <svg x={cx - 6} y={cy - 6} width={12} height={12} fill="red" viewBox="0 0 1024 1024">
          <circle cx="512" cy="512" r="400" fill="#ef4444" stroke="#ffffff" strokeWidth="150" />
        </svg>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RiskTrendSnapshot & { events?: RiskTrendEvent[] } }> }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl max-w-xs z-50">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              {formatDate(d.date, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <Badge 
              variant={d.risk_level === 'HIGH' ? 'error' : d.risk_level === 'MEDIUM' ? 'warning' : 'success'}
              className="text-[8px] font-black uppercase px-1.5 py-0"
            >
              {d.risk_level} ({d.risk_score})
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
              <span>Poin Pelanggaran (1.5x):</span>
              <span className="text-rose-500">+{d.violations_score}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
              <span>Poin Penghargaan (0.5x):</span>
              <span className="text-emerald-500">-{d.achievement_score}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
              <span>Alpa (30 Hari):</span>
              <span>{d.alpa_count}x</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
              <span>Kasus Aktif:</span>
              <span>{d.active_cases}</span>
            </div>
          </div>
          {d.events && d.events.length > 0 && (
            <div className="mt-2.5 space-y-2">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Kejadian Linimasa:</span>
              {d.events?.map((e: RiskTrendEvent, idx: number) => (
                <div key={idx} className="p-2 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-100 dark:border-slate-800/60 text-left">
                  <div className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      e.type === 'VIOLATION' && 'bg-rose-500',
                      e.type === 'ACHIEVEMENT' && 'bg-emerald-500',
                      e.type === 'COUNSELING' && 'bg-blue-500',
                      e.type === 'SUMMONS' && 'bg-amber-500',
                      e.type === 'HOMEVISIT' && 'bg-violet-500',
                      e.type.startsWith('CASE') && 'bg-red-500'
                    )}></span>
                    {e.title}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5 font-medium">{e.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Filter top at-risk students for table search
  const filteredStudents = useMemo(() => {
    return (statistikRisiko.topRiskStudents || []).filter((s: AtRiskStudent) =>
      s.nama_siswa.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nis.includes(studentSearch) ||
      s.kelas.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [statistikRisiko.topRiskStudents, studentSearch]);

  // Prepare line chart trend data
  const chartData = useMemo(() => {
    return trendData
      ? (trendData.snapshots || [])?.map((s: RiskTrendSnapshot) => {
          const dayEvents = (trendData.events || []).filter((e: RiskTrendEvent) => e.date === s.date);
          return {
            ...s,
            events: dayEvents,
            hasEvent: dayEvents.length > 0,
            displayDate: formatDate(s.date, { day: '2-digit', month: 'short' })
          };
        })
      : [];
  }, [trendData]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader className="mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Analitik & Laporan BK...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Analytics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Total Kasus Terbuka"
          value={String(statistikKasus.active)}
          icon={ShieldAlert}
          color="rose"
        />
        <AnalyticsCard
          title="Penyelesaian Kasus"
          value={`${statistikKasus.completed} (${statistikPenyelesaian.completionRate}%)`}
          icon={UserCheck}
          color="emerald"
        />
        <AnalyticsCard
          title="Rata-rata Waktu Resolusi"
          value={`${statistikPenyelesaian.meanResolutionTimeDays} Hari`}
          icon={Clock}
          color="blue"
        />
        <AnalyticsCard
          title="Kasus BK Reopened"
          value={`${statistikKasus.reopened}x`}
          icon={ArrowRightLeft}
          color="amber"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Case Category Breakdown */}
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-indigo-500 w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Statistik Kasus per Kategori</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kasusKategoriData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Jumlah Kasus">
                  {kasusKategoriData?.map((_, index) => {
                    const colors = ['#6366f1', '#f59e0b', '#3b82f6', '#10b981'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* EWS Risk Levels Distribution */}
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-rose-500 w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Distribusi Level Risiko Siswa (EWS)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskDistributionData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {riskDistributionData?.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Risiko {entry.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{entry.value} Siswa</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Top 20 At-Risk Students & Vocation/Class statistics */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top 20 At-Risk Students (2 cols) */}
        <div className="xl:col-span-2">
          <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-rose-600 w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Top 20 Siswa Teridentifikasi Kritis</h3>
              </div>
              <div className="relative w-full md:w-64 shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reports-student-search"
                  type="text"
                  aria-label="Cari siswa, NIS, kelas"
                  placeholder="Cari siswa, NIS, kelas..."
                  value={studentSearch}
                  onChange={(e) => {
                    const parsed = searchSchema.safeParse({ search: e.target.value });
                    if (parsed.success) {
                      setStudentSearch(e.target.value);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="py-20 text-center opacity-50 flex flex-col items-center justify-center">
                <UserCheck className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada siswa berisiko ditemukan</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900">Profil Siswa</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900">Kelas</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center bg-white dark:bg-slate-900">Risk Score</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center bg-white dark:bg-slate-900">Status</th>
                      <th className="pb-3 text-[9px] font-black text-slate-400 tracking-widest text-right bg-white dark:bg-slate-900">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents?.map((s: AtRiskStudent) => (
                      <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/40 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-800 dark:text-white text-xs">{s.nama_siswa}</div>
                          <div className="text-[9px] text-slate-400 font-bold tracking-widest">{s.nis}</div>
                        </td>
                        <td className="py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">{s.kelas}</td>
                        <td className="py-2.5 text-center text-xs font-black text-slate-700 dark:text-slate-300">{s.riskScore}</td>
                        <td className="py-2.5 text-center">
                          <Badge 
                            variant={s.riskLevel === 'HIGH' ? 'error' : s.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                            className="px-1.5 py-0.5 text-[8px] font-black uppercase"
                          >
                            {s.riskLevel}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            variant="toolbarOutline"
                            size="toolbar"
                            onClick={() => handleSelectStudent(s)}
                            className={cn(
                              "text-[9px] font-black h-7 px-3 rounded-lg border",
                              selectedStudent?.id === s.id 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-800"
                                : "hover:bg-slate-50"
                            )}
                          >
                            Pilih Tren
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Vocation & Class Performance (1 col) */}
        <div className="space-y-6">
          {/* Jurusan stats */}
          <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block"></span>
              Statistik per Jurusan
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {statistikJurusan.length === 0 ? (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-4">Belum ada data</p>
              ) : (
                statistikJurusan?.map((j: JurusanStat) => (
                  <div key={j.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100/50 dark:border-slate-800/50">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-slate-800 dark:text-white truncate">{j.jurusan}</div>
                        <div className="text-[9px] text-slate-400 font-bold truncate">{j.nama_jurusan}</div>
                      </div>
                      <Badge variant="outline" className="text-[8px] font-black px-1.5 py-0 border-slate-200">
                        Avg EWS: {j.averageRiskScore}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                      <div className="font-medium text-slate-500">
                        Kasus: <span className="font-extrabold text-slate-800 dark:text-white">{j.jumlahKasus}</span>
                      </div>
                      <div className="font-medium text-slate-500">
                        Pelanggaran: <span className="font-extrabold text-rose-500">+{j.jumlahPelanggaran}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Top at-risk classes */}
          <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block"></span>
              Peringkat Risiko Kelas
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {(statistikKelas.atRisk || [])?.map((k: ClassRiskStat, idx: number) => (
                <div key={k.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-black text-slate-400 w-4">#{idx + 1}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white">{k.kelas}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <span>{k.jumlahKasus} Kasus</span>
                    <Badge variant="error" className="text-[9px] font-black px-1.5 py-0">
                      Score {k.averageRiskScore}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Selected Student Risk Trend & Event Overlay (LineChart) */}
      <div id="student-trend-section" className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-indigo-500 w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Analisis Tren Risiko & overlay Linimasa Kejadian
              </h3>
            </div>
            {selectedStudent && (
              <Badge variant="outline" className="px-2 py-0.5 border-slate-200 font-extrabold text-xs">
                Siswa Terpilih: {selectedStudent.nama_siswa} ({selectedStudent.nis})
              </Badge>
            )}
          </div>

          {!selectedStudent ? (
            <div className="py-24 text-center opacity-50 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              <Calendar className="w-12 h-12 text-slate-400 mb-4 animate-bounce" />
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Silakan Pilih Siswa Terlebih Dahulu</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-1 max-w-sm">
                Klik tombol "Pilih Tren" pada tabel siswa kritis di atas untuk me-render grafik tren risiko harian beserta kejadian linimasanya.
              </p>
            </div>
          ) : trendLoading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <Loader className="mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat data tren historis...</p>
            </div>
          ) : trendError || !trendData ? (
            <div className="py-10 text-center text-rose-500 text-xs font-bold bg-rose-50 rounded-2xl">
              {trendError || 'Gagal memuat tren siswa'}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Event Overlay Legend Banner */}
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/30 rounded-xl text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-3">
                <AlertTriangle className="shrink-0 w-4 h-4 text-indigo-500 animate-pulse" />
                <div>
                  <span className="font-extrabold">Petunjuk Event Overlay:</span> Titik merah berbayang (<span className="text-rose-600 font-extrabold">●</span>) pada grafik di bawah menandakan tanggal terjadinya kejadian penting. Arahkan kursor Anda ke titik tersebut untuk melihat daftar detail kejadian.
                </div>
              </div>

              {/* The LineChart */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Line
                      name="EWS Risk Score"
                      type="monotone"
                      dataKey="risk_score"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={<CustomizedDot />}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      name="Poin Pelanggaran (1.5x)"
                      type="monotone"
                      dataKey="violations_score"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      name="Poin Penghargaan (0.5x)"
                      type="monotone"
                      dataKey="achievement_score"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chronological Event list */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white">Linimasa Riwayat Kejadian ({trendData.events.length})</h4>
                {trendData.events.length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 italic">Belum ada kejadian tercatat untuk siswa ini</p>
                ) : (
                  <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-4">
                    {trendData.events?.map((e: RiskTrendEvent, idx: number) => (
                      <div key={idx} className="relative">
                        <span className={cn(
                          "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900",
                          e.type === 'VIOLATION' && 'bg-rose-500',
                          e.type === 'ACHIEVEMENT' && 'bg-emerald-500',
                          e.type === 'COUNSELING' && 'bg-blue-500',
                          e.type === 'SUMMONS' && 'bg-amber-500',
                          e.type === 'HOMEVISIT' && 'bg-violet-500',
                          e.type.startsWith('CASE') && 'bg-red-500'
                        )}></span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {formatDate(e.date, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs font-black text-slate-800 dark:text-white">{e.title}</span>
                          <Badge variant="outline" className="text-[8px] font-black px-1.5 py-0 leading-none">
                            {e.type}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">{e.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
});
