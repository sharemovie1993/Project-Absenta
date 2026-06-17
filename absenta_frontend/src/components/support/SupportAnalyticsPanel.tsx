import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  Ticket, 
  Award, 
  RefreshCw,
  TrendingUp,
  AlertOctagon
} from 'lucide-react';
import { supportTicketApi, type SupportAnalytics, getCategoryLabel } from '../../api/support-ticket.api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#a855f7'];
const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#3b82f6',
  HIGH: '#f59e0b',
  URGENT: '#ef4444'
};

export default function SupportAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SupportAnalytics | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await supportTicketApi.getSupportAnalytics();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat analitik support.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Memuat telemetri data analitik support platform...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
        <AlertOctagon className="w-10 h-10 text-slate-350" />
        <p className="text-xs font-bold">Gagal memuat data analitik.</p>
        <button
          onClick={fetchAnalytics}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // Format data Kategori Chart
  const categoryData = Object.entries(data.category_distribution).map(([key, val]) => ({
    name: getCategoryLabel(key as any),
    Jumlah: val
  }));

  // Format data Urgensi Chart
  const priorityData = Object.entries(data.priority_distribution).map(([key, val]) => ({
    name: key,
    value: val
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 🚀 Top Header Widget */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
            Live SLA & Support Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Metrik performa tanggapan, penyelesaian aduan, dan kepuasan pelanggan secara real-time.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* 📊 KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Total Tickets */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 dark:from-indigo-950/30 dark:to-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-indigo-500 dark:text-indigo-400 tracking-wider">
              Total Pengaduan
            </span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {data.total_tickets}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              Keluhan masuk nasional
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shadow-inner">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Resolve Rate */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-emerald-500 dark:text-emerald-400 tracking-wider">
              Resolve Rate (SLA)
            </span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {data.resolve_rate}%
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Target Platform: &gt;95%
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-inner">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Avg Response Time */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/30 dark:to-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">
              Avg Response Time
            </span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {data.average_response_time_minutes} <span className="text-sm font-bold text-slate-500">Mnt</span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              Kecepatan respon pertama (FRT)
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 📊 Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Kategori Keluhan */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl p-5 shadow-sm space-y-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Distribusi Topik Masalah</h4>
            <p className="text-[10px] text-slate-400">Pembagian jumlah aduan masuk berdasarkan kategori teknis.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9, fontWeight: 600 }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '16px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 750
                  }} 
                />
                <Bar dataKey="Jumlah" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Urgensi Keluhan */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Urgensi & Prioritas Keluhan</h4>
            <p className="text-[10px] text-slate-400">Pembagian tiket aduan berdasarkan tingkat keparahan (SLA).</p>
          </div>
          <div className="grid grid-cols-5 items-center gap-4">
            
            <div className="col-span-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '16px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 750
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="col-span-2 space-y-2.5">
              {priorityData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block" 
                      style={{ backgroundColor: PRIORITY_COLORS[entry.name] }}
                    />
                    <span className="font-extrabold text-slate-650 dark:text-slate-300 text-[10px]">{entry.name}</span>
                  </div>
                  <span className="font-black text-slate-900 dark:text-white">{entry.value} Tiket</span>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* 🏆 Active Support Agents Card */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-500 animate-bounce" />
              Top Active Support Agents (KPI)
            </h4>
            <p className="text-[10px] text-slate-400">Peringkat agen bantuan CS nasional berdasarkan kontribusi resolusi aduan.</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {data.active_agents.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-bold">
              Belum ada agen yang aktif memegang tiket aduan saat ini.
            </div>
          ) : (
            data.active_agents.map((agent, index) => {
              const maxCount = Math.max(...data.active_agents.map(a => a.count), 1);
              const percentage = (agent.count / maxCount) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black rounded-lg text-[10px] flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                        #{index + 1}
                      </div>
                      <span className="font-extrabold text-slate-750 dark:text-slate-200">{agent.name}</span>
                    </div>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded text-[10px]">
                      {agent.count} Tiket Diselesaikan
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
