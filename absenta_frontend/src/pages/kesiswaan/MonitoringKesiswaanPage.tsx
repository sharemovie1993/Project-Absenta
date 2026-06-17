import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Clock,
  ChevronRight,
  ShieldAlert,
  Search,
  MessageSquare,
  Star,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { kesiswaanApi } from '../../api/kesiswaan.api';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const MonitoringKesiswaanPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: violations, isLoading } = useQuery({
    queryKey: ['kesiswaan-monitoring-violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 })
  });

  const stats = useMemo(() => {
    if (!violations?.data?.list) return { today: 0, severe: 0, totalPoints: 0, trending: 0 };
    const list = violations.data.list;
    const today = list.filter((v: any) => new Date(v.tanggal).toDateString() === new Date().toDateString()).length;
    const severe = list.filter((v: any) => v.poin >= 50).length;
    const totalPoints = list.reduce((acc: number, curr: any) => acc + curr.poin, 0);
    
    return { today, severe, totalPoints, trending: list.length };
  }, [violations]);

  const careList = useMemo(() => {
    if (!violations?.data?.list) return [];
    const studentPoints: Record<string, { id: string; name: string; class: string; points: number }> = {};
    
    violations.data.list.forEach((v: any) => {
      const id = v.siswa_id;
      if (!studentPoints[id]) {
        studentPoints[id] = { 
          id,
          name: v.Siswa?.nama_siswa || 'Unknown', 
          class: v.Siswa?.Kelas?.nama_kelas || '-', 
          points: 0 
        };
      }
      studentPoints[id].points += v.poin;
    });

    return Object.values(studentPoints)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [violations]);

  const recentList = useMemo(() => {
    return violations?.data?.list.slice(0, 5) || [];
  }, [violations]);

  const academicStats = useMemo(() => [
    {
      title: "Pelanggaran Hari Ini",
      value: stats.today,
      subtitle: "Catatan baru masuk hari ini",
      icon: <Clock size={14} />,
      gradient: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Kasus Berat (≥ 50 Poin)",
      value: stats.severe,
      subtitle: "Butuh pembinaan segera",
      icon: <ShieldAlert size={14} />,
      gradient: "from-rose-500 to-pink-600",
    },
    {
      title: "Total Laporan",
      value: stats.trending,
      subtitle: "Semua catatan terverifikasi",
      icon: <Users size={14} />,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      title: "Akumulasi Poin",
      value: stats.totalPoints,
      subtitle: "Total poin seluruh kelas",
      icon: <TrendingUp size={14} />,
      gradient: "from-amber-500 to-orange-600",
    }
  ], [stats]);

  return (
    <AcademicPageLayout
      title="Monitoring Kesiswaan"
      description="Pantau statistik kedisiplinan, laporan pelanggaran, dan siswa yang memerlukan pembinaan segera."
      stats={academicStats}
      isLoadingStats={isLoading}
      toolbar={
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/kesiswaan/pelanggaran')}
            variant="outline"
            className="rounded-xl h-12 px-6 font-black text-xs uppercase tracking-widest border-gray-100 shadow-sm"
          >
            <Search size={16} className="mr-2" /> Telusuri Data
          </Button>
          <Button 
            variant="primary"
            className="rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white shadow-xl shadow-indigo-600/20 border-none"
            onClick={() => navigate('/kesiswaan/pelanggaran')}
          >
            Input Catatan Baru
          </Button>
        </div>
      }
      hardeningModuleKey="kesiswaan_monitoring"
    >
      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-6">
        {/* Recent Character Notes - Column 1 */}
        <div className="lg:col-span-7 flex">
          <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col justify-between w-full min-h-[500px]">
            <div>
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">Catatan Pelanggaran Terkini</h3>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Aktivitas perilaku siswa real-time</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3.5">
                {isLoading ? [1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />) : 
                 recentList.length > 0 ? recentList.map((v: any) => (
                    <div key={v.id} className="p-4 rounded-xl border border-gray-100/50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all duration-300 group flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                          v.poin >= 50 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                        )}>
                          <AlertTriangle size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tight truncate max-w-[170px]">{v.Siswa?.nama_siswa}</h4>
                          <p className="text-xs text-gray-500 font-medium truncate max-w-[200px]">{v.jenis_pelanggaran} <span className="mx-1.5 opacity-20">•</span> <span className="font-bold text-gray-400">{v.Siswa?.Kelas?.nama_kelas}</span></p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4 shrink-0">
                        <div>
                          <p className={cn("text-base font-black leading-none mb-1", v.poin >= 50 ? 'text-rose-600' : 'text-amber-600')}>+{v.poin}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(v.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 p-0">
                          <ArrowRight size={14} />
                        </Button>
                      </div>
                    </div>
                 )) : (
                    <div className="py-20 text-center bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                      <Star size={36} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Semua Siswa Terjaga Dengan Baik</p>
                    </div>
                 )}
              </div>
            </div>
          </Card>
        </div>

        {/* Support Spotlight - Column 2 */}
        <div className="lg:col-span-5 flex">
          <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm relative overflow-hidden group min-h-[500px] flex flex-col justify-between w-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm shrink-0">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight leading-none text-gray-900 dark:text-white uppercase">Care Spotlight</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Siswa Butuh Sapaan Wali</p>
                </div>
              </div>
              
              <div className="space-y-3.5">
                {isLoading ? [1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />) : 
                careList.map((s: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 -mx-2 rounded-xl transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-xs font-black border border-gray-100 dark:border-slate-800 group-hover:border-rose-500 transition-colors shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate max-w-[130px] uppercase tracking-tight text-gray-800 dark:text-gray-200">{s.name}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{s.class}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-black text-rose-500">{s.points}</span>
                      <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 rounded-xl">
              <p className="text-[9px] text-rose-600 dark:text-rose-400 leading-relaxed font-semibold italic">
                * Prioritaskan panggilan orang tua/wali untuk siswa dengan akumulasi poin di atas 75. Fokus pada pembinaan intensif dan solusi.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default MonitoringKesiswaanPage;
