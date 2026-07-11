import React, { useMemo, useCallback, useState } from 'react';
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
  ArrowRight,
  Award
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { kesiswaanApi, type Pelanggaran } from '../../api/kesiswaan.api';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const MonitoringKesiswaanPage: React.FC = () => {
  const navigate = useNavigate();
  const [spotlightTab, setSpotlightTab] = useState<'violations' | 'achievements'>('violations');

  const { data: violations, isLoading } = useQuery({
    queryKey: ['kesiswaan-monitoring-violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 })
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['kesiswaan-leaderboard'],
    queryFn: () => kesiswaanApi.getPrestasiLeaderboard({ limit: 5 })
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['kesiswaan-analytics'],
    queryFn: () => kesiswaanApi.getPelanggaranAnalytics({ year: new Date().getFullYear() })
  });

  const stats = useMemo(() => {
    if (!violations?.data?.list) return { today: 0, severe: 0, totalPoints: 0, trending: 0 };
    const list = violations.data.list;
    const today = list.filter((v: Pelanggaran) => new Date(v.tanggal).toDateString() === new Date().toDateString()).length;
    const severe = list.filter((v: Pelanggaran) => v.poin >= 50).length;
    const totalPoints = list.reduce((acc: number, curr: Pelanggaran) => acc + curr.poin, 0);
    
    return { today, severe, totalPoints, trending: list.length };
  }, [violations]);

  const careStudents = useMemo(() => {
    if (!violations?.data?.list) return [];
    const studentPoints: Record<string, { id: string; name: string; class: string; points: number }> = {};
    
    violations.data.list.forEach((v: Pelanggaran) => {
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

  const recentViolations = useMemo(() => {
    return violations?.data?.list.slice(0, 5) || [];
  }, [violations]);

  const handleNavigateToPelanggaran = useCallback(() => {
    navigate('/kesiswaan/pelanggaran');
  }, [navigate]);

  const monthlyTrend = useMemo(() => {
    return analytics?.data?.trend_bulanan || [];
  }, [analytics]);

  const maxCases = useMemo(() => {
    if (monthlyTrend.length === 0) return 1;
    return Math.max(...monthlyTrend.map((m: any) => m.total_kasus), 1);
  }, [monthlyTrend]);

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
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Kesiswaan', path: '/kesiswaan' },
        { label: 'Monitoring', path: '/kesiswaan/monitoring' }
      ]}
      instruction={{
        title: "Panduan Monitoring Kesiswaan",
        description: "Halaman ini digunakan untuk memantau data kedisiplinan dan pembinaan siswa secara real-time.",
        items: [
          { text: "Statistik di bagian atas menampilkan ringkasan data pelanggaran siswa." },
          { text: "Gunakan 'Care Spotlight' untuk melihat siswa yang memerlukan perhatian atau pembinaan intensif segera." },
          { text: "Catatan pelanggaran terkini menampilkan aktivitas real-time." }
        ]
      }}
      hardeningModuleKey="kesiswaan_monitoring"
      toolbar={
        <div className="flex gap-3">
          <Button 
            onClick={handleNavigateToPelanggaran}
            variant="outline"
            className="rounded-xl h-12 px-6 font-black text-xs uppercase tracking-widest border-gray-100 shadow-sm"
          >
            <Search size={16} className="mr-2" /> Telusuri Data
          </Button>
          <Button 
            variant="primary"
            className="rounded-xl h-12 px-8 font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white shadow-xl shadow-indigo-600/20 border-none"
            onClick={handleNavigateToPelanggaran}
          >
            Input Catatan Baru
          </Button>
        </div>
      }
    >
      {/* Monthly Trend Chart */}
      <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">Tren Laporan Pelanggaran Bulanan</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Grafik analisis kedisiplinan tahunan</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-650 dark:text-slate-350 uppercase tracking-widest">Tahun: {new Date().getFullYear()}</span>
          </div>
        </div>

        {isLoadingAnalytics ? (
          <div className="flex justify-between items-end h-48 pt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
              <Skeleton key={i} className="w-[6%] h-full rounded-t-lg" />
            ))}
          </div>
        ) : monthlyTrend.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs italic">Data tren bulanan belum tersedia.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-end h-48 pt-6 border-b border-gray-100 dark:border-slate-850 px-2">
              {monthlyTrend.map((m: any, idx: number) => {
                const heightPct = (m.total_kasus / maxCases) * 100;
                return (
                  <div key={idx} className="w-[6%] flex flex-col items-center group relative h-full justify-end">
                    <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-20">
                      {m.total_kasus} Kasus ({m.total_poin} Poin)
                    </div>
                    <div 
                      style={{ height: `${Math.max(5, heightPct)}%` }} 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500 cursor-pointer",
                        m.total_kasus > 0 
                          ? "bg-gradient-to-t from-indigo-500 to-indigo-650 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/10" 
                          : "bg-slate-100 dark:bg-slate-800"
                      )}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">
              {monthlyTrend.map((m: any, idx: number) => (
                <span key={idx} className="w-[6%] text-center truncate">
                  {String(m.nama_bulan || '').substring(0, 3)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

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
                {/* EmptyState handler is implemented below */}
                {isLoading ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />) : 
                 recentViolations.length > 0 ? recentViolations?.map((v: Pelanggaran) => (
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
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 gap-4">
                <button
                  onClick={() => setSpotlightTab('violations')}
                  className={cn(
                    "pb-1 text-xs font-black uppercase tracking-wider transition-all",
                    spotlightTab === 'violations' 
                      ? "text-rose-600 dark:text-rose-450 border-b-2 border-rose-600 font-black" 
                      : "text-slate-400 hover:text-slate-650"
                  )}
                >
                  Care Spotlight
                </button>
                <button
                  onClick={() => setSpotlightTab('achievements')}
                  className={cn(
                    "pb-1 text-xs font-black uppercase tracking-wider transition-all",
                    spotlightTab === 'achievements' 
                      ? "text-emerald-600 dark:text-emerald-450 border-b-2 border-emerald-600 font-black" 
                      : "text-slate-400 hover:text-slate-650"
                  )}
                >
                  Leaderboard Prestasi
                </button>
              </div>

              {spotlightTab === 'violations' ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <MessageSquare size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase leading-none">Siswa Butuh Sapaan Wali</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Top Poin Pelanggaran</p>
                    </div>
                  </div>

                  {isLoading ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />) : 
                  careStudents?.map((s: { id: string; name: string; class: string; points: number }, idx: number) => (
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
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Award size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase leading-none">Siswa Berprestasi</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Top Poin Penghargaan</p>
                    </div>
                  </div>

                  {isLoadingLeaderboard ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />) : 
                  leaderboard?.data && leaderboard.data.length > 0 ? (
                    leaderboard.data.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 -mx-2 rounded-xl transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-xs font-black border border-gray-100 dark:border-slate-800 group-hover:border-emerald-500 transition-colors shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate max-w-[130px] uppercase tracking-tight text-gray-800 dark:text-gray-200">{s.nama_siswa}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{s.nama_kelas}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-base font-black text-emerald-650">+{s.total_poin}</span>
                          <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center bg-slate-50/10 dark:bg-slate-900/10 rounded-xl border border-dashed border-gray-100 dark:border-slate-800">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Belum ada catatan prestasi.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
              <p className="text-[9px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold italic">
                {spotlightTab === 'violations' 
                  ? "* Prioritaskan panggilan orang tua/wali untuk siswa dengan akumulasi poin di atas 75. Fokus pada pembinaan intensif."
                  : "* Berikan apresiasi atau sertifikat penghargaan secara berkala bagi siswa yang berada di peringkat 5 teratas."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AcademicPageLayout>
  );
};

export default MonitoringKesiswaanPage;
