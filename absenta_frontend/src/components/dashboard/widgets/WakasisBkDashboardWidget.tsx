import React, { useEffect, useState } from 'react';
import { bpbkApi } from '../../../api/bpbk.api';
import { Card } from '../../ui/Card';
import { Loader } from '../../ui/Loader';
import { Badge } from '../../ui/Badge';
import { cn } from '../../../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from 'recharts';
import {
  ShieldAlert,
  ArrowRightLeft,
  AlertTriangle,
  Users,
  Search,
  BookOpen,
  PieChart as PieChartIcon
} from 'lucide-react';

export const WakasisBkDashboardWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchWakasisReports = async () => {
      try {
        setLoading(true);
        const res = await bpbkApi.getReports();
        if (res.success) {
          setData(res.data);
        } else {
          setError('Gagal memuat laporan BK sekolah');
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
      }
    };
    fetchWakasisReports();
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader className="mb-3" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Analitik Kesiswaan (Wakasis)...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 text-xs font-bold">
        {error || 'Gagal memuat data analitik Wakasis'}
      </div>
    );
  }

  const { statistikKasus, statistikRisiko, statistikJurusan, statistikKelas, statistikPenyelesaian, statistikReopen } = data;

  const casesReopened = statistikKasus.reopened || 0;
  const totalReopens = statistikReopen?.totalReopened || 0;

  // Filter top kelas by search query
  const filteredClasses = (statistikKelas.all || []).filter((k: any) =>
    k.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-amber-50/40 to-indigo-50/40 dark:from-slate-800/20 dark:to-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-850">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Dashboard Kesiswaan & Kedisiplinan Sekolah</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Analisis risiko perilaku, kerawanan kelas, dan efektivitas resolusi kasus sekolah</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-extrabold text-[10px] uppercase border-amber-200 text-amber-600 self-start md:self-auto">
          Wakasis View
        </Badge>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kasus Aktif Sekolah</span>
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{statistikKasus.active}</span>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
              <ShieldAlert size={18} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 block mt-2">Total kasus terbuka di seluruh tingkat kelas</span>
        </Card>

        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kasus Direopen</span>
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                {casesReopened} <span className="text-xs font-bold text-slate-400">Kasus</span>
              </span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
              <ArrowRightLeft size={18} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 block mt-2">Total Reopen Count: {totalReopens}x di seluruh kasus</span>
        </Card>

        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Siswa Risiko Tinggi</span>
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                {statistikRisiko.distribution.HIGH || 0} <span className="text-xs font-bold text-slate-400">Siswa</span>
              </span>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 block mt-2">Siswa kritis membutuhkan intervensi mendesak</span>
        </Card>
      </div>

      {/* Top Jurusan Chart (Recharts) */}
      <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="text-indigo-500 w-4 h-4" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
            Grafik Indeks Risiko Rata-rata per Jurusan (Vocational Risk Profile)
          </h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer minWidth={0} width="100%" height="100%">
            <BarChart data={statistikJurusan} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
              <XAxis dataKey="jurusan" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="averageRiskScore" name="Rata-rata Skor Risiko" fill="#6366f1" radius={[4, 4, 0, 0]}>
                {statistikJurusan.map((entry: any, index: number) => {
                  const colors = ['#6366f1', '#f59e0b', '#3b82f6', '#10b981', '#ef4444'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top Kelas Risiko Ranking */}
      <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="text-rose-500 w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
              Peringkat Kerawanan Kelas Binaan (EWS Index)
            </h3>
          </div>
          <div className="relative w-full md:w-60">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">Tidak ada data kelas ditemukan</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
            {filteredClasses.map((k: any, idx: number) => {
              const score = k.averageRiskScore;
              const alertClass = score >= 50 
                ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20' 
                : score >= 20 
                ? 'bg-amber-50/80 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-850';
                
              const labelColor = score >= 50 
                ? 'text-rose-600 dark:text-rose-400' 
                : score >= 20 
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400';

              return (
                <div key={k.id} className={cn("p-3.5 rounded-xl border flex items-center justify-between transition-colors", alertClass)}>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Kelas Rank #{idx + 1}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-white block mt-0.5">{k.kelas}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">{k.jumlahKasus} Kasus</span>
                      <span className="text-[9px] text-slate-400 font-semibold block">{k.jumlahPelanggaran} Pelanggaran</span>
                    </div>
                    <Badge variant={score >= 50 ? 'error' : score >= 20 ? 'warning' : 'success'} className="px-2 py-0.5 text-[9px] font-black">
                      Score {score}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

    </div>
  );
};

