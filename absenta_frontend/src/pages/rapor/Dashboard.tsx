import React from 'react';
import { BookOpen, FileText, CheckSquare, Award, Clock, Users, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Card } from '@/components/ui/Card';
import { TvModeToggle } from '@/components/ui/TvModeToggle';

const mockChartData = [
  { name: 'X-RPL-1', Nilai: 84 },
  { name: 'X-TKJ-1', Nilai: 81 },
  { name: 'XI-RPL-1', Nilai: 86 },
  { name: 'XI-TKJ-1', Nilai: 83 },
  { name: 'XII-RPL-1', Nilai: 88 },
  { name: 'XII-TKJ-1', Nilai: 85 },
];

const mockRecentReports = [
  { id: 1, kelas: 'XII-RPL-1', wali: 'Dian Wijaya, S.Kom', inputStatus: '100% Selesai', totalSiswa: 36 },
  { id: 2, kelas: 'XI-TKJ-1', wali: 'Hendra Saputra, S.Pd', inputStatus: '85% Input', totalSiswa: 34 },
  { id: 3, kelas: 'X-RPL-1', wali: 'Amalia Rahma, S.Pd', inputStatus: '60% Input', totalSiswa: 32 },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    'bg-sky-600': { 
      bg: 'from-sky-500/10 via-sky-600/5', 
      border: 'border-sky-100/40 dark:border-sky-900/20', 
      text: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-50 dark:bg-sky-950/40'
    },
    'bg-indigo-600': { 
      bg: 'from-indigo-500/10 via-indigo-600/5', 
      border: 'border-indigo-100/40 dark:border-indigo-900/20', 
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    'bg-emerald-600': { 
      bg: 'from-emerald-500/10 via-emerald-600/5', 
      border: 'border-emerald-100/40 dark:border-emerald-900/20', 
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    'bg-amber-600': { 
      bg: 'from-amber-500/10 via-amber-600/5', 
      border: 'border-amber-100/40 dark:border-amber-900/20', 
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40'
    },
  };

  const style = colorMap[color] || colorMap['bg-sky-600'];

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

export default function RaporDashboard() {
  const [chartData, setChartData] = React.useState(mockChartData);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => 
        prev.map(item => ({
          ...item,
          Nilai: Math.max(70, Math.min(95, item.Nilai + (Math.random() > 0.5 ? 1 : -1)))
        }))
      );
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AcademicPageLayout 
      title="Dashboard E-Rapor" 
      description="Monitoring progres pengisian nilai, verifikasi wali kelas, dan pembagian rapor"
      toolbar={<TvModeToggle />}
    >
      <div className="space-y-6">
        
        {/* Metrik Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Rapor Terproses" value="12 Kelas" icon={<FileText size={20} />} color="bg-sky-600" subtext="Dari total 18 kelas" />
          <StatCard title="Siswa Dinilai" value="384 / 412" icon={<Users size={20} />} color="bg-indigo-600" subtext="93% siswa selesai diinput" />
          <StatCard title="Rata-rata Nilai" value="84.2" icon={<Award size={20} />} color="bg-emerald-600" subtext="+2.4% peningkatan KBM" />
          <StatCard title="Status Cetak Rapor" value="Siap 6 Kelas" icon={<CheckSquare size={20} />} color="bg-amber-600" subtext="Menunggu lock wali kelas" />
        </div>

        {/* Chart & Status Wali Kelas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-none shadow-sm dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Rata-rata Nilai per Kelas</h3>
                <p className="text-xs text-slate-450 dark:text-slate-450">Beban rata-rata capaian kompetensi siswa per rombongan belajar</p>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[60, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Bar dataKey="Nilai" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Agenda Kanan */}
          <Card className="p-6 border-none shadow-sm dark:bg-slate-900/40 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Status Input Wali Kelas</h3>
              <p className="text-xs text-slate-450 dark:text-slate-450">Progress penginputan nilai rapor semester aktif</p>
            </div>
            <div className="space-y-4">
              {mockRecentReports.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.kelas}</h4>
                    <p className="text-[10px] text-slate-500">Wali: {item.wali}</p>
                    <p className="text-[9px] text-slate-400">{item.totalSiswa} Siswa</p>
                  </div>
                  {item.inputStatus === '100% Selesai' ? (
                    <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex-shrink-0">Selesai</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex-shrink-0">{item.inputStatus}</span>
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
