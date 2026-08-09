import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '../../api/kurikulum.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  ClipboardCheck,
  Calendar,
  Award,
  TrendingUp,
  User,
  Star
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const SupervisiAnalyticsDashboard: React.FC = React.memo(() => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['supervisi-analytics'],
    queryFn: () => kurikulumApi.getSupervisiAnalytics()
  });

  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  const stats = analytics?.stats || { total: 0, scheduled: 0, completed: 0, avgScore: 0, avgSelfScore: 0 };
  const monthlyTrend = analytics?.monthlyTrend || [];
  const topTeachers = analytics?.topTeachers || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 -mr-8 -mt-8 rounded-full"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Supervisi</span>
              <ClipboardCheck size={16} className="text-blue-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.total}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Jadwal direncanakan</p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 -mr-8 -mt-8 rounded-full"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Akan Datang</span>
              <Calendar size={16} className="text-amber-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.scheduled}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Belum terlaksana</p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 -mr-8 -mt-8 rounded-full"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terlaksana</span>
              <ClipboardCheck size={16} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.completed}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Selesai dievaluasi</p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 -mr-8 -mt-8 rounded-full"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rerata Nilai</span>
              <Award size={16} className="text-indigo-500" />
            </div>
            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.avgScore}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hasil observasi kelas</p>
          </div>
        </Card>

        <Card className="p-5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 -mr-8 -mt-8 rounded-full"></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rerata Mandiri</span>
              <User size={16} className="text-purple-500" />
            </div>
            <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{stats.avgSelfScore}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hasil evaluasi diri</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-8 p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center">
                <TrendingUp size={16} className="mr-2 text-indigo-600" />
                Tren Nilai Observasi Lintas Periode
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Grafik rata-rata skor bulanan</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-[10px] font-black">REFRESH</Button>
          </div>

          <div className="h-64 w-full text-xs">
            {monthlyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 italic font-bold">
                Belum ada tren nilai observasi pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                    labelClassName="font-bold text-slate-700 dark:text-slate-300"
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_score"
                    name="Rerata Skor"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top Teachers */}
        <Card className="lg:col-span-4 p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center">
              <Star size={16} className="mr-2 text-indigo-600" />
              Guru Kompetensi Tertinggi
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">5 besar rerata skor observasi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="pb-3">Guru</th>
                  <th className="pb-3 text-right">Rerata Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                {topTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-xs font-bold text-gray-400 italic">
                      Belum ada data supervisi.
                    </td>
                  </tr>
                ) : (
                  (topTeachers as Array<{ name: string; avg: number }>).map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center text-[9px] font-black bg-indigo-50 text-indigo-600 rounded-md">
                          {idx + 1}
                        </span>
                        {t.name}
                      </td>
                      <td className="py-3 text-right">
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-black border-none text-[10px]">
                          {t.avg}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
});
