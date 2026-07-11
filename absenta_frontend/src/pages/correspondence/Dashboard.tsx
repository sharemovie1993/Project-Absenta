import React from 'react';
import { Mail, Inbox, Send, FileText, Clock, UserCheck, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Card } from '@/components/ui/Card';
import { TvModeToggle } from '@/components/ui/TvModeToggle';

const mockChartData = [
  { name: 'Jan', Masuk: 12, Keluar: 8 },
  { name: 'Feb', Masuk: 19, Keluar: 14 },
  { name: 'Mar', Masuk: 22, Keluar: 18 },
  { name: 'Apr', Masuk: 15, Keluar: 20 },
  { name: 'May', Masuk: 28, Keluar: 25 },
  { name: 'Jun', Masuk: 35, Keluar: 30 },
];

const mockRecentInbox = [
  { id: 1, pengirim: 'Dinas Pendidikan', perihal: 'Undangan Rapat Koordinasi Kurikulum', tanggal: '11 Juli 2026', urgensi: 'PENTING' },
  { id: 2, pengirim: 'Kementerian Pendidikan', perihal: 'Pemberitahuan Akreditasi Sekolah', tanggal: '10 Juli 2026', urgensi: 'Biasa' },
  { id: 3, pengirim: 'PT. Telkom Indonesia', perihal: 'MOU Kerja Sama Magang Industri', tanggal: '08 Juli 2026', urgensi: 'PENTING' },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    'bg-blue-600': { 
      bg: 'from-blue-500/10 via-blue-600/5', 
      border: 'border-blue-100/40 dark:border-blue-900/20', 
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40'
    },
    'bg-purple-600': { 
      bg: 'from-purple-500/10 via-purple-600/5', 
      border: 'border-purple-100/40 dark:border-purple-900/20', 
      text: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40'
    },
    'bg-emerald-600': { 
      bg: 'from-emerald-500/10 via-emerald-600/5', 
      border: 'border-emerald-100/40 dark:border-emerald-900/20', 
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    'bg-rose-600': { 
      bg: 'from-rose-500/10 via-rose-600/5', 
      border: 'border-rose-100/40 dark:border-rose-900/20', 
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40'
    },
  };

  const style = colorMap[color] || colorMap['bg-blue-600'];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.bg} to-transparent border ${style.border} p-5 flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group`}>
      <div className="space-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
        <p className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">{value}</p>
        {subtext && <p className="text-[10px] text-slate-400">{subtext}</p>}
      </div>
      <div className={`p-3.5 ${style.iconBg} ${style.text} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
        {icon}
      </div>
    </div>
  );
};

export default function CorrespondenceDashboard() {
  const [chartData, setChartData] = React.useState(mockChartData);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => 
        prev.map(item => ({
          ...item,
          Masuk: Math.max(5, Math.min(30, item.Masuk + (Math.random() > 0.5 ? 1 : -1))),
          Keluar: Math.max(5, Math.min(25, item.Keluar + (Math.random() > 0.5 ? 1 : -1)))
        }))
      );
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AcademicPageLayout 
      title="Dashboard Persuratan" 
      description="Monitoring volume surat masuk, surat keluar, dan disposisi aktif"
      toolbar={<TvModeToggle />}
    >
      <div className="space-y-6">
        
        {/* Metrik Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Surat Masuk Baru" value="14 Surat" icon={<Inbox size={20} />} color="bg-blue-600" subtext="Belum didisposisikan" />
          <StatCard title="Surat Keluar Disetujui" value="38 Surat" icon={<Send size={20} />} color="bg-emerald-600" subtext="Siap dikirim/distribusikan" />
          <StatCard title="Menunggu Tanda Tangan" value="5 Dokumen" icon={<UserCheck size={20} />} color="bg-purple-600" subtext="Menunggu Kepala Sekolah" />
          <StatCard title="Total Arsip" value="324 Dokumen" icon={<FileText size={20} />} color="bg-rose-600" subtext="Terarsip secara digital" />
        </div>

        {/* Chart & Recent Inbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-none shadow-sm dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Volume Surat Masuk & Keluar</h3>
                <p className="text-xs text-slate-450 dark:text-slate-450">Statistik aktivitas persuratan 6 bulan terakhir</p>
              </div>
              <TrendingUp size={16} className="text-slate-400" />
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Bar dataKey="Masuk" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={20} name="Surat Masuk" />
                  <Bar dataKey="Keluar" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} name="Surat Keluar" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Agenda Kanan */}
          <Card className="p-6 border-none shadow-sm dark:bg-slate-900/40 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Surat Masuk Terbaru</h3>
              <p className="text-xs text-slate-450 dark:text-slate-450">Daftar agenda surat masuk resmi yang baru diterima</p>
            </div>
            <div className="space-y-4">
              {mockRecentInbox.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.pengirim}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{item.perihal}</p>
                    <p className="text-[9px] text-slate-400">{item.tanggal}</p>
                  </div>
                  {item.urgensi === 'PENTING' ? (
                    <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full flex-shrink-0">Penting</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full flex-shrink-0">Biasa</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </AcademicPageLayout>
  );
}
