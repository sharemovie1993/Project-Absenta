import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Clock,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Search,
  MessageSquare,
  Star,
  Activity,
  ArrowRight,
  Award,
  RefreshCw,
  CalendarDays
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { kesiswaanApi, type Pelanggaran } from '../../api/kesiswaan.api';
import { Skeleton } from '../../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useTvStore } from '../../store/tvStore';
import { TvModeToggle } from '../../components/ui/TvModeToggle';
import { PiketAgendaPanel, RombelDisiplinPanel } from './components/MonitoringKesiswaanComponents';

interface MonthlyTrendItem {
  nama_bulan: string;
  total_kasus: number;
  total_poin: number;
}

interface LeaderboardItem {
  nama_siswa: string;
  nama_kelas: string;
  total_poin: number;
}

const REFETCH = 60_000;
const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const MonitoringKesiswaanPage: React.FC = () => {
  const navigate = useNavigate();
  const { isTvMode } = useTvStore();
  const [currentScene, setCurrentScene] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [spotlightTab, setSpotlightTab] = useState<'violations' | 'achievements'>('violations');

  useEffect(() => {
    if (!isTvMode) return;
    const timer = setInterval(() => {
      setCurrentScene(prev => (prev + 1) % 4);
    }, 15_000);
    return () => clearInterval(timer);
  }, [isTvMode]);

  useEffect(() => {
    if (!isTvMode) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, REFETCH);
    return () => clearInterval(interval);
  }, [isTvMode]);

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

  const monthlyTrend = useMemo((): MonthlyTrendItem[] => {
    return (analytics?.data?.trend_bulanan as MonthlyTrendItem[]) || [];
  }, [analytics]);

  const maxCases = useMemo(() => {
    if (monthlyTrend.length === 0) return 1;
    return Math.max(...(monthlyTrend?.map((m: MonthlyTrendItem) => m.total_kasus) || [1]), 1);
  }, [monthlyTrend]);

  const academicStats = useMemo(() => [
    {
      title: "Pelanggaran Hari Ini",
      value: stats.today,
      subtitle: "Catatan baru masuk hari ini",
      icon: <Clock size={14} />,
      gradient: "from-indigo-500 to-indigo-600",
      variant: "card" as const,
    },
    {
      title: "Kasus Berat (≥ 50 Poin)",
      value: stats.severe,
      subtitle: "Butuh pembinaan segera",
      icon: <ShieldAlert size={14} />,
      gradient: "from-rose-500 to-pink-600",
      variant: "card" as const,
    },
    {
      title: "Total Laporan",
      value: stats.trending,
      subtitle: "Semua catatan terverifikasi",
      icon: <Users size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      variant: "card" as const,
    },
    {
      title: "Akumulasi Poin",
      value: stats.totalPoints,
      subtitle: "Total poin seluruh kelas",
      icon: <TrendingUp size={14} />,
      gradient: "from-amber-500 to-orange-600",
      variant: "card" as const,
    }
  ], [stats]);  if (isTvMode) {
    const scenes = [
      { title: "Ringkasan Harian, Piket & Agenda", desc: "Statistik harian, piket aktif, dan agenda terdekat" },
      { title: "Aktivitas Pelanggaran Real-time", desc: "Catatan pelanggaran masuk terbaru" },
      { title: "Spotlight Perilaku & Prestasi Siswa", desc: "Care spotlight siswa dan leaderboard prestasi" },
      { title: "Kepatuhan Rombel & Tren Bulanan", desc: "Kondisi disiplin kelas dan analisis tren tahunan" }
    ];

    return (
      <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-8 overflow-hidden font-sans select-none">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">Layar Monitor Kesiswaan</h1>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
                Scene {currentScene + 1} dari 4: {scenes[currentScene].title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Scene dots indicator */}
            <div className="flex items-center gap-2">
              {scenes?.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentScene(i)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                    currentScene === i ? "bg-indigo-500 scale-125" : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                  )}
                  aria-label={`Go to scene ${i + 1}`}
                />
              ))}
            </div>

            <div className="text-right text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-normal border-l border-slate-200 dark:border-slate-800 pl-6">
              <div>Diperbarui: {fmt(lastRefresh)}</div>
              <div>Auto-refresh: 60s</div>
            </div>

            <TvModeToggle variant="floating-exit" />
          </div>
        </div>

        {/* TV Mode Body */}
        <div className="flex-1 min-h-0 relative">
          {/* Left/Right click navigation areas for TV Mode */}
          <button 
            onClick={() => setCurrentScene(prev => (prev - 1 + 4) % 4)}
            className="fixed left-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-start pl-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Previous Scene"
          >
            <ChevronLeft size={36} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button 
            onClick={() => setCurrentScene(prev => (prev + 1) % 4)}
            className="fixed right-0 top-[80px] bottom-0 w-[8%] z-40 flex items-center justify-end pr-4 transition-all duration-300 opacity-0 hover:opacity-100 hover:bg-slate-500/5 dark:hover:bg-slate-300/5 cursor-pointer text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 group"
            aria-label="Next Scene"
          >
            <ChevronRight size={36} className="transition-transform group-hover:translate-x-1" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col justify-between"
            >
              {currentScene === 0 && (
                <div className="space-y-6 h-full flex flex-col justify-between">
                  {/* Grid 4 Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                    {academicStats?.map((s, idx) => (
                      <Card key={idx} className="p-5 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-white shadow-lg flex items-center justify-between min-h-[96px]">
                        <div>
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{s.title}</p>
                          <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{s.value}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-tight">{s.subtitle}</p>
                        </div>
                        <div className={cn("p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-indigo-500 dark:text-indigo-400", s.gradient?.includes("rose") ? "text-rose-600 dark:text-rose-400" : s.gradient?.includes("emerald") ? "text-emerald-600 dark:text-emerald-400" : s.gradient?.includes("amber") ? "text-amber-600 dark:text-amber-400" : "")}>
                          {s.icon}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Piket & Agenda Panel */}
                  <div className="flex-1 min-h-0 pt-2">
                    <PiketAgendaPanel />
                  </div>
                </div>
              )}

              {currentScene === 1 && (
                <div className="h-full flex flex-col bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Catatan Pelanggaran Terkini</h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Feed aktivitas perilaku siswa real-time</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-2">
                    {isLoading ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-16 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />) :
                     recentViolations.length > 0 ? recentViolations?.map((v: Pelanggaran) => (
                        <div key={v.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                              v.poin >= 50 ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/35'
                            )}>
                              <AlertTriangle size={18} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight truncate">{v.Siswa?.nama_siswa}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{v.jenis_pelanggaran} <span className="mx-1.5 opacity-20">•</span> <span className="font-bold text-slate-400 dark:text-slate-500">{v.Siswa?.Kelas?.nama_kelas}</span></p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn("text-base font-black leading-none mb-1", v.poin >= 50 ? 'text-rose-500' : 'text-amber-500')}>+{v.poin}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{new Date(v.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                     )) : (
                        <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          <Star size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-widest">Semua Siswa Terjaga Dengan Baik</p>
                        </div>
                     )}
                  </div>
                </div>
              )}

              {currentScene === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                  {/* Care Spotlight */}
                  <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 flex items-center justify-center">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Care Spotlight</p>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Top Poin Pelanggaran</p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        {isLoading ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />) :
                        careStudents?.map((s: { id: string; name: string; class: string; points: number }, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.name}</p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{s.class}</p>
                              </div>
                            </div>
                            <span className="text-base font-black text-rose-500 shrink-0">+{s.points}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl mt-4">
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 italic font-semibold leading-relaxed">
                        * Panggilan wali perlu diprioritaskan bagi siswa dengan akumulasi poin di atas 75.
                      </p>
                    </div>
                  </div>

                  {/* Leaderboard Prestasi */}
                  <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center">
                          <Award size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Leaderboard Prestasi</p>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Top Poin Penghargaan</p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        {isLoading ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800/40 rounded-xl" />) :
                        leaderboard?.data && leaderboard.data.length > 0 ? (
                          leaderboard?.data?.map((s: LeaderboardItem, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800/30">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.nama_siswa}</p>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{s.nama_kelas}</p>
                                </div>
                              </div>
                              <span className="text-base font-black text-emerald-400 shrink-0">+{s.total_poin}</span>
                            </div>
                          ))
                        ) : (
                          <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Belum ada catatan prestasi.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl mt-4">
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 italic font-semibold leading-relaxed">
                        * Apresiasi sertifikat penghargaan berkala sangat disarankan bagi siswa di peringkat 5 teratas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentScene === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                  {/* Rombel Disiplin Panel */}
                  <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 overflow-y-auto shadow-sm">
                    <RombelDisiplinPanel violations={violations} />
                  </div>

                  {/* Tren Bulanan */}
                  <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-6 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/35 flex items-center justify-center">
                            <TrendingUp size={14} />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Tren Laporan Bulanan</h3>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Analisis kasus tingkat tahunan</p>
                          </div>
                        </div>
                      </div>

                      {isLoadingAnalytics ? (
                        <div className="flex justify-between items-end h-48 pt-6">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]?.map(i => (
                            <Skeleton key={i} className="w-[6%] h-full bg-slate-100 dark:bg-slate-800/40 rounded-t-lg" />
                          ))}
                        </div>
                      ) : monthlyTrend.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-xs italic">Data tren bulanan belum tersedia.</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-end h-48 pt-6 border-b border-slate-200 dark:border-slate-800 px-2">
                            {monthlyTrend?.map((m: MonthlyTrendItem, idx: number) => {
                              const heightPct = (m.total_kasus / maxCases) * 100;
                              return (
                                <div key={idx} className="w-[6%] flex flex-col items-center group relative h-full justify-end">
                                  <div className="absolute bottom-full mb-2 bg-slate-900 dark:bg-slate-950 text-white text-[9px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-25">
                                    {m.total_kasus} Kasus
                                  </div>
                                  <div 
                                    style={{ height: `${Math.max(5, heightPct)}%` }} 
                                    className={cn(
                                      "w-full rounded-t-lg transition-all duration-500 cursor-pointer",
                                      m.total_kasus > 0 
                                        ? "bg-gradient-to-t from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/10" 
                                        : "bg-slate-100 dark:bg-slate-800"
                                    )}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
                            {monthlyTrend?.map((m: MonthlyTrendItem, idx: number) => (
                              <span key={idx} className="w-[6%] text-center truncate">
                                {String(m.nama_bulan || '').substring(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

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
          <TvModeToggle />
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
      {/* ── BAGIAN I: Ringkasan & Informasi Harian ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-6">
        {/* Guru Piket & Agenda Kesiswaan */}
        <div className="lg:col-span-5 flex">
          <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm w-full">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none mb-6">Papan Informasi Piket & Agenda</h3>
            <PiketAgendaPanel />
          </Card>
        </div>

        {/* Catatan Pelanggaran Terkini */}
        <div className="lg:col-span-7 flex">
          <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col justify-between w-full min-h-[400px]">
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
                {isLoading ? [1,2,3]?.map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />) : 
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
      </div>

      {/* Divider Sekat I */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 dark:bg-slate-900 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200/60 dark:border-slate-800 rounded-full py-1">
            Bagian I: Ringkasan & Informasi Harian
          </span>
        </div>
      </div>

      {/* ── BAGIAN II: Perilaku & Prestasi Siswa ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Care Spotlight */}
        <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <MessageSquare size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase leading-none">Care Spotlight</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Top Poin Pelanggaran</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {isLoading ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />) : 
              careStudents?.map((s: { id: string; name: string; class: string; points: number }, idx: number) => (
                <div key={idx} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 -mx-2 rounded-xl transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-xs font-black border border-gray-100 dark:border-slate-800 group-hover:border-rose-500 transition-colors shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate max-w-[170px] uppercase tracking-tight text-gray-800 dark:text-gray-200">{s.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{s.class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base font-black text-rose-500">+{s.points}</span>
                    <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic">
              * Prioritaskan panggilan orang tua/wali untuk siswa dengan akumulasi poin di atas 75. Fokus pada pembinaan intensif.
            </p>
          </div>
        </Card>

        {/* Leaderboard Prestasi */}
        <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Award size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase leading-none">Leaderboard Prestasi</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Top Poin Penghargaan</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {isLoadingLeaderboard ? [1,2,3,4,5]?.map(i => <Skeleton key={i} className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />) : 
              leaderboard?.data && leaderboard.data.length > 0 ? (
                leaderboard?.data?.map((s: LeaderboardItem, idx: number) => (
                  <div key={idx} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 p-2 -mx-2 rounded-xl transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-xs font-black border border-gray-100 dark:border-slate-800 group-hover:border-emerald-500 transition-colors shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate max-w-[170px] uppercase tracking-tight text-gray-800 dark:text-gray-200">{s.nama_siswa}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{s.nama_kelas}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-black text-emerald-600">+{s.total_poin}</span>
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
          </div>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic">
              * Berikan apresiasi atau sertifikat penghargaan secara berkala bagi siswa yang berada di peringkat 5 teratas.
            </p>
          </div>
        </Card>
      </div>

      {/* Divider Sekat II */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 dark:bg-slate-900 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200/60 dark:border-slate-800 rounded-full py-1">
            Bagian II: Perilaku & Prestasi Siswa
          </span>
        </div>
      </div>

      {/* ── BAGIAN III: Kepatuhan Rombel ────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm w-full">
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none mb-6">Analisis Kepatuhan Rombel</h3>
          <RombelDisiplinPanel violations={violations} />
        </Card>
      </div>

      {/* Divider Sekat III */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 dark:bg-slate-900 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200/60 dark:border-slate-800 rounded-full py-1">
            Bagian III: Kepatuhan Rombel
          </span>
        </div>
      </div>

      {/* ── BAGIAN IV: Analisis Tren Bulanan ─────────────────────────────────────────── */}
      <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">Tren Laporan Pelanggaran Bulanan</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Grafik analisis kedisiplinan tahunan</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Tahun: {new Date().getFullYear()}</span>
          </div>
        </div>

        {isLoadingAnalytics ? (
          <div className="flex justify-between items-end h-48 pt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]?.map(i => (
              <Skeleton key={i} className="w-[6%] h-full rounded-t-lg" />
            ))}
          </div>
        ) : monthlyTrend.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs italic">Data tren bulanan belum tersedia.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-end h-48 pt-6 border-b border-gray-100 dark:border-slate-800 px-2">
              {monthlyTrend?.map((m: MonthlyTrendItem, idx: number) => {
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
                          ? "bg-gradient-to-t from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/10" 
                          : "bg-slate-100 dark:bg-slate-800"
                      )}
                    />
                  </div>
                );
              })}
            </div>
             <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">
              {monthlyTrend?.map((m: MonthlyTrendItem, idx: number) => (
                <span key={idx} className="w-[6%] text-center truncate">
                  {String(m.nama_bulan || '').substring(0, 3)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </AcademicPageLayout>
  );
};

export default MonitoringKesiswaanPage;
