import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { getAttendanceChart, getKepsekEscalations, getDashboardOverview } from '../../../api/dashboard.api';
import { toLocalMonth, toLocalDate } from '../../../utils/attendance/time';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, LayoutDashboard, Users, FileText, Bell, 
  ShieldCheck, TrendingUp, Activity, User, PlayCircle, ChevronRight, 
  History, Fingerprint, Star, Clock 
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../ui/Card';
import { MonitoringKbmWidget } from '../shared/MonitoringKbmWidget';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import iconForName from '../../../lib/iconForName';
import { Button } from '../../ui';
import { KepalaSekolahBkDashboardWidget } from '../widgets/KepalaSekolahBkDashboardWidget';

const COLORS = ['#10b981', '#3b82f6', '#fbbf24', '#ef4444']; // Green, Blue, Yellow, Red

export const KepalaSekolahDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { menu: groupedMenu } = useSmartMenu();
  const currentMonth = useMemo(() => toLocalMonth(), []);
  const [activeTab, setActiveTab] = useState<'kbm' | 'bk'>('kbm');

  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => getDashboardOverview(),
  });

  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ['attendance-chart', currentMonth],
    queryFn: () => getAttendanceChart(currentMonth),
  });

  const { data: escalationsData, isLoading: isEscalationsLoading } = useQuery({
    queryKey: ['kepsek-escalations'],
    queryFn: () => getKepsekEscalations(10),
  });

  const stats = overviewData?.data;
  const guruAttendance = stats?.total_guru ? Math.round((stats.guru_hadir / stats.total_guru) * 100) : 0;
  const siswaAttendance = stats?.total_siswa ? Math.round((stats.siswa_hadir / stats.total_siswa) * 100) : 0;
  
  const trendData = useMemo(() => {
    if (!chartData?.data) return [];
    const labels = chartData.data.labels || [];
    const datasets = chartData.data.datasets || [];
    return labels.map((label: string, index: number) => {
      const item: any = { name: label };
      datasets.forEach((dataset: any) => {
        const key = dataset.label.toLowerCase().includes('guru') ? 'Guru' : 'Siswa';
        item[key] = dataset.data[index];
      });
      return item;
    });
  }, [chartData]);

  const distributionData = useMemo(() => [
    { name: 'Hadir', value: stats?.siswa_hadir || 0 },
    { name: 'Sakit', value: stats?.siswa_sakit || 0 },
    { name: 'Izin', value: stats?.siswa_izin || 0 },
    { name: 'Alpa', value: stats?.siswa_alpa || 0 },
  ].filter(d => d.value > 0), [stats]);

  const escalations = escalationsData?.data || [];

  const quickActions: QuickAction[] = [
    { label: 'Overview', icon: LayoutDashboard, onClick: () => navigate('/dashboard'), color: 'blue' },
    { label: 'Monitoring', icon: Users, onClick: () => navigate('/attendance/rekap'), color: 'indigo' },
    { label: 'Laporan PDF', icon: FileText, onClick: () => navigate('/reports'), color: 'emerald' },
    { label: 'Eskalasi', icon: Bell, onClick: () => navigate('/notifications'), color: 'rose' },
  ];

  const infoStrips: InfoStripItem[] = [
    { label: 'Hadir Siswa', value: `${siswaAttendance}%`, icon: Users, color: 'blue' },
    { label: 'Hadir Guru', value: `${guruAttendance}%`, icon: CheckCircle, color: 'emerald' },
    { label: 'Eskalasi Aktif', value: `${escalations.length} Kasus`, icon: AlertTriangle, color: 'rose' },
    { label: 'Sesi Aktif', value: `${stats?.total_sesi_aktif || 0} Kelas`, icon: PlayCircle, color: 'indigo' },
  ];

  return (
    <>
      <WelcomeBanner
        title={`Selamat Datang, Bapak/Ibu Kepala Sekolah`}
        subtitle="Analisa perkembangan sekolah, tingkat kehadiran, dan efektivitas KBM secara menyeluruh dari satu tempat."
        icon={ShieldCheck}
        badge={{ label: 'Executive View', color: 'blue' }}
      />

      <QuickActionGrid title="Navigasi Strategis" actions={quickActions} columns={4} />

      <InfoStripGrid items={infoStrips} />

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 my-4">
        <button
          onClick={() => setActiveTab('kbm')}
          className={cn(
            "flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
            activeTab === 'kbm'
              ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-slate-700/50"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          📈 Kehadiran & Monitoring KBM
        </button>
        <button
          onClick={() => setActiveTab('bk')}
          className={cn(
            "flex-1 py-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
            activeTab === 'bk'
              ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-white border border-slate-200/40 dark:border-slate-700/50"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          🛡️ Analitik & Tata Kelola BK
        </button>
      </div>

      {activeTab === 'kbm' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tren Kehadiran Sekolah */}
            <CompactSectionCard title="Tren Kehadiran Bulanan" icon={TrendingUp} iconColor="blue">
               <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={trendData}>
                        <XAxis dataKey="name" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="Siswa" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Guru" stroke="#10b981" strokeWidth={2} dot={false} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </CompactSectionCard>

            {/* Distribusi Siswa */}
            <CompactSectionCard title="Distribusi Status Harian" icon={PieChart} iconColor="indigo">
               <div className="flex items-center gap-4 h-full">
                  <div className="w-1/2 h-24">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie 
                              data={distributionData} cx="50%" cy="50%" 
                              innerRadius={20} outerRadius={35} 
                              paddingAngle={5} dataKey="value"
                           >
                              {distributionData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-1">
                     {distributionData.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px]">
                           <div className="flex items-center gap-1.5 truncate">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="text-gray-500 font-bold uppercase truncate">{item.name}</span>
                           </div>
                           <span className="font-black text-gray-900">{item.value}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </CompactSectionCard>
          </div>

          {/* Monitoring & Eskalasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CompactSectionCard title="Monitoring KBM Live" icon={Activity} iconColor="indigo">
               <div className="max-h-48 overflow-y-auto custom-scrollbar no-scrollbar">
                  <MonitoringKbmWidget />
               </div>
            </CompactSectionCard>

            <CompactSectionCard title="Eskalasi Kasus Terbaru" icon={Bell} iconColor="rose">
               <div className="space-y-2">
                  {escalations.length > 0 ? escalations.slice(0, 3).map((item: any) => (
                     <div key={item.id} className="p-2 bg-rose-50/30 rounded-md border border-rose-50 flex items-center justify-between group cursor-pointer hover:bg-white transition-all">
                        <div className="min-w-0">
                           <h4 className="text-[11px] font-bold text-gray-900 truncate uppercase">{item.title}</h4>
                           <p className="text-[9px] text-gray-400 font-medium">{item.source}</p>
                        </div>
                        <Badge variant={item.priority === 'High' ? 'destructive' : 'warning'} className="text-[8px] h-4">{item.priority}</Badge>
                     </div>
                  )) : (
                     <div className="text-center py-4 text-gray-400 italic text-[10px]">Semua eskalasi tuntas</div>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full h-8 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600"
                    onClick={() => navigate('/notifications')}
                  >
                     Lihat Semua Eskalasi
                  </Button>
               </div>
            </CompactSectionCard>
          </div>
        </>
      ) : (
        <KepalaSekolahBkDashboardWidget />
      )}
    </>
  );
};
