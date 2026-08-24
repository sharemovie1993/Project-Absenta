import React, { useEffect, useState } from 'react';
import { bpbkApi } from '../../../api/bpbk.api';
import { Card, CardContent } from '../../ui/Card';
import { Loader } from '../../ui/Loader';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  MailOpen,
  ShieldAlert,
  Users,
  Search,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export const WaliKelasBkDashboardWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'siswa' | 'cases' | 'summons'>('siswa');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchWaliKelasReports = async () => {
      try {
        setLoading(true);
        const res = await bpbkApi.getWaliKelasReports();
        if (res.success) {
          setData(res.data);
        } else {
          setError('Gagal memuat laporan BK Wali Kelas');
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat mengambil data');
      } finally {
        setLoading(false);
      }
    };
    fetchWaliKelasReports();
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader className="mb-3" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Analitik Kelas Binaan...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-rose-600 text-xs font-bold">
        {error || 'Gagal memuat laporan kelas binaan'}
      </div>
    );
  }

  const { kelas, activeCasesCount, pendingSummonsCount, siswaKritis = [], cases = [], summons = [], trend = [] } = data;

  const chartData = trend.map((t: any) => ({
    ...t,
    displayDate: new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }));

  // Filtering based on tab & search query
  const filteredSiswa = siswaKritis.filter((s: any) =>
    s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery)
  );

  const filteredCases = cases.filter((c: any) =>
    c.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSummons = summons.filter((s: any) =>
    s.alasan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-rose-50/40 to-indigo-50/40 dark:from-slate-800/20 dark:to-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-850">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Dashboard Risiko & BK Kelas</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Monitoring komprehensif perkembangan kesiswaan kelas binaan <span className="font-extrabold text-rose-500">{kelas}</span></p>
        </div>
        <Badge variant="outline" className="px-3 py-1 font-extrabold text-[10px] uppercase border-rose-200 text-rose-600 self-start md:self-auto">
          Wali Kelas View
        </Badge>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kasus Aktif Kelas</span>
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{activeCasesCount}</span>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
              <ShieldAlert size={18} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 block mt-2">Kasus berstatus Terbuka/Proses</span>
        </Card>

        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Panggilan Ortu Menunggu</span>
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{pendingSummonsCount}</span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-xl">
              <MailOpen size={18} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 block mt-2">Menunggu kedatangan orang tua siswa</span>
        </Card>

        <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/40 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Siswa Kritis Terdeteksi</span>
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                {siswaKritis.filter((s: any) => s.riskLevel === 'HIGH').length} <span className="text-xs font-bold text-slate-400">Siswa</span>
              </span>
            </div>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <span className="text-[9px] font-bold text-slate-400 block mt-2">Siswa dengan risiko tingkat tinggi (HIGH)</span>
        </Card>
      </div>

      {/* Class Risk Trend (Recharts) */}
      <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-indigo-500 w-4 h-4" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">Grafik Tren Risiko Kelas (30 Hari Terakhir)</h3>
        </div>
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 italic text-xs">Belum ada data historis snapshot kelas</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer minWidth={0} width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line
                  name="Rata-rata Skor Risiko Kelas"
                  type="monotone"
                  dataKey="average_risk_score"
                  stroke="#ef4444"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Details List Section */}
      <Card className="border border-slate-200/40 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* Tab Selector */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-950/40 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('siswa'); setSearchQuery(''); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === 'siswa'
                  ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Siswa Berisiko ({siswaKritis.length})
            </button>
            <button
              onClick={() => { setActiveTab('cases'); setSearchQuery(''); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === 'cases'
                  ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Kasus Aktif ({cases.length})
            </button>
            <button
              onClick={() => { setActiveTab('summons'); setSearchQuery(''); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                activeTab === 'summons'
                  ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Panggilan Ortu ({summons.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-60">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'siswa' ? "Cari nama, NIS..." : "Cari nama, detail..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === 'siswa' && (
          filteredSiswa.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">Tidak ada siswa berisiko terdaftar di kelas ini</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Siswa</th>
                    <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Poin Pelanggaran</th>
                    <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Poin Prestasi</th>
                    <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Alpa 30H</th>
                    <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">EWS Risk Score</th>
                    <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tingkat Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSiswa.map((s: any) => (
                    <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/40 last:border-0 hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                      <td className="py-3">
                        <div className="font-bold text-slate-800 dark:text-white text-xs">{s.nama_siswa}</div>
                        <div className="text-[9px] text-slate-400 font-bold tracking-widest">{s.nis}</div>
                      </td>
                      <td className="py-3 text-center text-xs font-bold text-rose-500">+{s.violations}</td>
                      <td className="py-3 text-center text-xs font-bold text-emerald-500">-{s.achievements}</td>
                      <td className="py-3 text-center text-xs font-bold text-slate-500">{s.alpaCount}x</td>
                      <td className="py-3 text-center text-xs font-black text-slate-700 dark:text-slate-300">{s.riskScore}</td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={s.riskLevel === 'HIGH' ? 'error' : s.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                          className="px-1.5 py-0.5 text-[8px] font-black uppercase"
                        >
                          {s.riskLevel}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'cases' && (
          filteredCases.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">Tidak ada kasus aktif terdaftar untuk siswa di kelas ini</div>
          ) : (
            <div className="space-y-3">
              {filteredCases.map((c: any) => (
                <div key={c.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">{c.judul}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">Siswa: {c.nama_siswa} • Kategori: <span className="text-indigo-500">{c.kategori}</span></p>
                    <p className="text-[8px] text-slate-400 font-semibold uppercase mt-1">Dibuka: {new Date(c.tanggal_kasus).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={c.prioritas === 'TINGGI' ? 'error' : c.prioritas === 'SEDANG' ? 'warning' : 'outline'} className="text-[8px] font-black uppercase">
                      {c.prioritas}
                    </Badge>
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200">
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'summons' && (
          filteredSummons.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">Tidak ada surat pemanggilan aktif untuk siswa di kelas ini</div>
          ) : (
            <div className="space-y-3">
              {filteredSummons.map((s: any) => (
                <div key={s.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">Panggilan Orang Tua</h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">Siswa: {s.nama_siswa} • Alasan: {s.alasan.slice(0, 80)}...</p>
                    <p className="text-[8px] text-slate-400 font-semibold uppercase mt-1">Rencana Pertemuan: {new Date(s.tanggal_pemanggilan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <Badge variant={s.status === 'DIKIRIM' ? 'warning' : 'outline'} className="text-[8px] font-black uppercase">
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )
        )}
      </Card>

    </div>
  );
};

