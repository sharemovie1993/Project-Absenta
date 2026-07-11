import React from 'react';
import { Laptop, Cpu, BookOpen, Clock, Users, ArrowUpRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Card } from '@/components/ui/Card';
import { TvModeToggle } from '@/components/ui/TvModeToggle';

const mockChartData = [
  { name: 'MAT', Peserta: 180 },
  { name: 'IND', Peserta: 220 },
  { name: 'ING', Peserta: 210 },
  { name: 'PROG', Peserta: 120 },
  { name: 'JAS', Peserta: 190 },
  { name: 'AGM', Peserta: 240 },
];

const mockActiveExams = [
  { id: 1, nama: 'Penilaian Akhir Semester Ganjil - Matematika', mapel: 'Matematika', sisaWaktu: '45 Menit', status: 'SEDANG BERJALAN', peserta: 180 },
  { id: 2, nama: 'Kuis Harian - Bahasa Indonesia', mapel: 'Bahasa Indonesia', sisaWaktu: '10 Menit', status: 'SEDANG BERJALAN', peserta: 54 },
  { id: 3, nama: 'Ujian Kejuruan - Pemrograman Web', mapel: 'Pemrograman Web', sisaWaktu: 'Selesai', status: 'SELESAI', peserta: 72 },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    'bg-purple-600': { 
      bg: 'from-purple-500/10 via-purple-600/5', 
      border: 'border-purple-100/40 dark:border-purple-900/20', 
      text: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40'
    },
    'bg-blue-600': { 
      bg: 'from-blue-500/10 via-blue-600/5', 
      border: 'border-blue-100/40 dark:border-blue-900/20', 
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40'
    },
    'bg-indigo-600': { 
      bg: 'from-indigo-500/10 via-indigo-600/5', 
      border: 'border-indigo-100/40 dark:border-indigo-900/20', 
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    'bg-amber-600': { 
      bg: 'from-amber-500/10 via-amber-600/5', 
      border: 'border-amber-100/40 dark:border-amber-900/20', 
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40'
    },
  };

  const style = colorMap[color] || colorMap['bg-purple-600'];

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

export default function CbtDashboard() {
  const [chartData, setChartData] = React.useState(mockChartData);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => 
        prev.map(item => ({
          ...item,
          Peserta: Math.max(100, Math.min(300, item.Peserta + (Math.random() > 0.5 ? 5 : -5)))
        }))
      );
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AcademicPageLayout 
      title="Dashboard CBT (Computer Based Test)" 
      description="Mockup monitoring ujian aktif, bank soal, dan analisis hasil tes siswa"
      toolbar={<TvModeToggle />}
    >
      <div className="space-y-6">
        
        {/* Metrik Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Ujian Aktif Hari Ini" value="3 Ujian" icon={<Laptop size={20} />} color="bg-purple-600" subtext="Sedang berjalan" />
          <StatCard title="Total Peserta Ujian" value="234 Siswa" icon={<Users size={20} />} color="bg-blue-600" subtext="Siswa aktif login ujian" />
          <StatCard title="Total Bank Soal" value="1,248 Soal" icon={<BookOpen size={20} />} color="bg-indigo-600" subtext="Dalam 12 rumpun mapel" />
          <StatCard title="Tingkat Kelulusan" value="88.4%" icon={<ShieldCheck size={20} />} color="bg-amber-600" subtext="Di atas Kriteria Minimal" />
        </div>

        {/* Chart & Active Exams */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border-none shadow-sm dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Distribusi Peserta Ujian per Mata Pelajaran</h3>
                <p className="text-xs text-slate-450 dark:text-slate-450">Jumlah siswa terdaftar ujian online per modul keilmuan</p>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                  <Bar dataKey="Peserta" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Agenda Kanan */}
          <Card className="p-6 border-none shadow-sm dark:bg-slate-900/40 space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ujian Aktif Saat Ini</h3>
              <p className="text-xs text-slate-450 dark:text-slate-450">Sesi evaluasi online yang sedang aktif diakses siswa</p>
            </div>
            <div className="space-y-4">
              {mockActiveExams.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.nama}</h4>
                    <p className="text-[10px] text-slate-500">Mapel: {item.mapel}</p>
                    <p className="text-[9px] text-slate-400">{item.peserta} Peserta • Sisa {item.sisaWaktu}</p>
                  </div>
                  {item.status === 'SEDANG BERJALAN' ? (
                    <span className="text-[9px] font-black uppercase bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">Running</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex-shrink-0">Done</span>
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
