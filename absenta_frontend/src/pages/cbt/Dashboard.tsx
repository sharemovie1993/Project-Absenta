import React from 'react';
import { Laptop, Cpu, BookOpen, Clock, Users, ArrowUpRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { Card } from '@/components/ui/Card';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

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
          <AnalyticsCard 
            title="Ujian Aktif Hari Ini" 
            value="3 Ujian" 
            icon={<Laptop />} 
            gradient="from-purple-500 to-purple-700 text-white" 
            subtitle="Sedang berjalan" 
          />
          <AnalyticsCard 
            title="Total Peserta Ujian" 
            value="234 Siswa" 
            icon={<Users />} 
            gradient="from-blue-500 to-blue-700 text-white" 
            subtitle="Siswa aktif login" 
          />
          <AnalyticsCard 
            title="Total Bank Soal" 
            value="1,248 Soal" 
            icon={<BookOpen />} 
            gradient="from-indigo-500 to-indigo-700 text-white" 
            subtitle="Dalam 12 rumpun mapel" 
          />
          <AnalyticsCard 
            title="Tingkat Kelulusan" 
            value="88.4%" 
            icon={<ShieldCheck />} 
            gradient="from-amber-500 to-amber-700 text-white" 
            subtitle="Di atas KKM" 
          />
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
