import React from 'react';
import { BookOpen, FileText, CheckSquare, Award, Clock, Users, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { Card } from '@/components/ui/Card';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

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

export default React.memo(function RaporDashboard() {
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
      topSlot={<WorkspaceAppLauncherCard workspaceId="RAPOR_WORKSPACE" />}
      toolbar={<TvModeToggle />}
    >
      <div className="space-y-6">
        
        {/* Metrik Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard 
            title="Rapor Terproses" 
            value="12 Kelas" 
            icon={<FileText />} 
            gradient="from-sky-500 to-sky-700 text-white" 
            subtitle="Total 18 kelas" 
          />
          <AnalyticsCard 
            title="Siswa Dinilai" 
            value="384 / 412" 
            icon={<Users />} 
            gradient="from-indigo-500 to-indigo-700 text-white" 
            subtitle="93% nilai terinput" 
          />
          <AnalyticsCard 
            title="Rata-rata Nilai" 
            value="84.2" 
            icon={<Award />} 
            gradient="from-emerald-500 to-emerald-700 text-white" 
            subtitle="+2.4% dibanding semester lalu" 
          />
          <AnalyticsCard 
            title="Status Cetak Rapor" 
            value="Siap 6 Kelas" 
            icon={<CheckSquare />} 
            gradient="from-amber-500 to-amber-700 text-white" 
            subtitle="Menunggu lock wali" 
          />
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
});
