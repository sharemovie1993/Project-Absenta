import React, { useEffect, useState } from 'react';
import { bpbkApi } from '../../../api/bpbk.api';
import { Card, CardContent } from '../../ui/Card';
import { AnalyticsCard } from '../../ui/AnalyticsCard';
import { Loader } from '../../ui/Loader';
import { Badge } from '../../ui/Badge';
import { cn } from '../../../lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  ChevronRight,
  TrendingDown,
  Activity
} from 'lucide-react';

const RISK_COLORS = {
  LOW: '#10b981',    // Emerald Green
  MEDIUM: '#f59e0b', // Amber
  HIGH: '#ef4444'    // Rose Red
};

export const KepalaSekolahBkDashboardWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKepsekBkReports = async () => {
      try {
        setLoading(true);
        const res = await bpbkApi.getReports();
        if (res.success) {
          setData(res.data);
        } else {
          setError('Gagal memuat laporan BK Kepala Sekolah');
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
      }
    };
    fetchKepsekBkReports();
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader className="mb-3" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Analitik BK Executive...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 text-xs font-bold">
        {error || 'Gagal memuat data analitik BK Kepala Sekolah'}
      </div>
    );
  }

  const {
    statistikKasus,
    statistikRisiko,
    statistikJurusan = [],
    statistikKelas,
    statistikPenyelesaian
  } = data;

  // Preparing Data for Donut Chart (Risk Distribution Heatmap)
  const riskHeatmapData = [
    { name: 'Risiko Rendah (LOW)', value: statistikRisiko.distribution.LOW || 0, color: RISK_COLORS.LOW },
    { name: 'Risiko Sedang (MEDIUM)', value: statistikRisiko.distribution.MEDIUM || 0, color: RISK_COLORS.MEDIUM },
    { name: 'Risiko Tinggi (HIGH)', value: statistikRisiko.distribution.HIGH || 0, color: RISK_COLORS.HIGH }
  ].filter(d => d.value > 0);

  // Sorting Jurusan by Risk Score to find the most at risk major
  const sortedJurusan = [...statistikJurusan].sort((a, b) => b.averageRiskScore - a.averageRiskScore);
  const topRiskJurusan = sortedJurusan[0];

  return (
    <div className="space-y-6">
      
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50/40 to-rose-50/40 dark:from-slate-800/20 dark:to-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-850">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Tata Kelola & Analitik BK Sekolah</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Analisis strategis tingkat kepatuhan kesiswaan, penyelesaian kasus, dan penanganan kerawanan siswa</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-extrabold text-[10px] uppercase border-indigo-200 text-indigo-600 self-start md:self-auto">
          Executive Overview
        </Badge>
      </div>

      {/* KPI Stats Grid (Model Blok Terpadu 1 Kartu) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 p-2 rounded-2xl min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Completion Rate
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                {statistikPenyelesaian.completionRate}%
              </h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                {statistikPenyelesaian.totalCompleted} dari {statistikPenyelesaian.totalOpened} kasus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2 rounded-2xl min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Resolution Time
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                {statistikPenyelesaian.meanResolutionTimeDays} Hari
              </h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                Rata-rata waktu beres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2 rounded-2xl min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Jurusan EWS
              </span>
              <h4 className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 tracking-tight truncate mt-0.5">
                {topRiskJurusan ? topRiskJurusan.jurusan : '-'}
              </h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                EWS Score: {topRiskJurusan ? topRiskJurusan.averageRiskScore : 0}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 p-2 rounded-2xl min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <Activity size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                Kasus Aktif
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                {statistikKasus.active} Kasus
              </h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                Dalam bimbingan BK
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Heatmap (Pie / Donut Chart) */}
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="text-indigo-500 w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Risk Heatmap Siswa Sekolah (EWS)</h3>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
            {riskHeatmapData.length === 0 ? (
              <div className="text-slate-400 text-xs italic">Tidak ada data distribusi risiko siswa</div>
            ) : (
              <>
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskHeatmapData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {riskHeatmapData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1 w-full max-w-[200px]">
                  {riskHeatmapData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-500 font-bold truncate">{item.name.split(' ')[0]}</span>
                      </div>
                      <span className="font-extrabold text-slate-800 dark:text-white">{item.value} Siswa</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Vocational Risk Profile (Bar Chart) */}
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-rose-500 w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Profil Risiko Rata-Rata per Jurusan</h3>
          </div>
          <div className="flex-1 h-44 min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistikJurusan} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                <XAxis dataKey="jurusan" tick={{ fontSize: 8, fontWeight: 'bold' }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 8, fontWeight: 'bold' }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                <Bar dataKey="averageRiskScore" name="Rata-rata Risiko" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {statistikJurusan.map((entry: any, index: number) => {
                    const colors = ['#6366f1', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top 5 Critical Classes & Top At-Risk Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 5 Critical Classes */}
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
            <AlertTriangle className="text-rose-500 w-4 h-4" />
            <span>Peringkat 5 Kelas Paling Rawan</span>
          </h3>
          <div className="space-y-2">
            {(statistikKelas.atRisk || []).slice(0, 5).map((k: any, idx: number) => (
              <div key={k.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest block">RAWAN #{idx + 1}</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white block mt-0.5">{k.kelas}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">{k.jumlahKasus} Kasus</span>
                  </div>
                  <Badge variant="error" className="text-[8px] font-black px-1.5 py-0.5">
                    Score {k.averageRiskScore}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top At-Risk Students */}
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-1.5">
            <AlertTriangle className="text-amber-500 w-4 h-4" />
            <span>Daftar Siswa dengan Tingkat Kerawanan Tertinggi</span>
          </h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {(statistikRisiko.topRiskStudents || []).slice(0, 5).map((s: any) => (
              <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">{s.nama_siswa}</span>
                  <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">{s.nis} • Kelas: {s.kelas}</span>
                </div>
                <Badge variant={s.riskLevel === 'HIGH' ? 'error' : 'warning'} className="text-[8px] font-black px-1.5 py-0.5">
                  Score {s.riskScore}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
};

