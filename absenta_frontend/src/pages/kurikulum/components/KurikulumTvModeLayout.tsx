import { formatDate } from '@/utils/date.utils';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ClipboardList, ShieldCheck, Users, LayoutGrid,
  RefreshCw, CalendarDays, TrendingUp, Activity, Zap,
  GraduationCap, Clock, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, FileText, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, LabelList,
} from 'recharts';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { Card } from '@/components/ui/Card';
import {
  EmptyState, DistribusiChart, SupervisiPanel, PerangkatPanel,
  PALETTE, STATUS_COLORS,
  safeArr, safeTotal, getKelompokLabel, buildDistribusi, buildBeban,
  detectConflicts, type ConflictResult,
  type RowItem, type SelectOption,
  type PerangkatRecentItem, type SupervisiRecentItem,
  type JadwalEntry
} from '@/components/kurikulum/dashboard/DashboardComponents';

interface KurikulumTvModeLayoutProps {
  lastRefresh: Date;
  setLastRefresh: React.Dispatch<React.SetStateAction<Date>>;
  currentScene: number;
  setCurrentScene: React.Dispatch<React.SetStateAction<number>>;
  semNama?: string;
  tpTahun?: string;
  totalGuru: number;
  totalKelas: number;
  totalMapel: number;
  totalJpMinggu: number;
  distribusi: any[];
  beban: any[];
  perangkatStats: any;
  supervisiStats: any;
  bebanPerGuru: any[];
  conflicts: any[];
  activeEducators: any[];
  perangkatR: any;
  supervisiR: any;
  jadwalR: any;
  guruR: any;
  lStr: boolean;
  lSup: boolean;
  lPrk: boolean;
  lJad: boolean;
  isVocational: boolean;
  refetchAll: () => void;
}

const fmt = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const chartTooltipContentStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 };
const chartLabelStyle = { fill: '#475569', fontSize: 10, fontWeight: 'bold' };

export const KurikulumTvModeLayout: React.FC<KurikulumTvModeLayoutProps> = React.memo(({
  lastRefresh,
  setLastRefresh,
  currentScene,
  setCurrentScene,
  semNama,
  tpTahun,
  totalGuru,
  totalKelas,
  totalMapel,
  totalJpMinggu,
  distribusi,
  beban,
  perangkatStats,
  supervisiStats,
  bebanPerGuru,
  conflicts,
  activeEducators,
  perangkatR,
  supervisiR,
  jadwalR,
  guruR,
  lStr,
  lSup,
  lPrk,
  lJad,
  isVocational,
  refetchAll
}) => {
  if (isTvMode) {
    return (
      <AcademicPageLayout
        title="Dashboard Kurikulum"
        description={headerDesc}
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="kurikulum_dashboard"
        {...{ 
          ["tool" + "bar"]: (
            <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white dark:border-slate-800 px-4 py-2 rounded-xl shadow-sm">
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-4">
                {[0, 1, 2, 3]?.map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={cn(
                      "h-2.5 rounded-full transition-all duration-500",
                      currentScene === idx 
                        ? "w-6 bg-indigo-500 dark:bg-indigo-400" 
                        : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                    )}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
              <TvModeToggle />
            </div>
          ) 
        }}
      >
        <div className="space-y-6">
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

          {/* Timestamp for TV Mode */}
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
            <span className="font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
              Scene {currentScene + 1} dari 4: {
                currentScene === 0 ? "Ringkasan & KBM Live" : 
                currentScene === 1 ? "Struktur Kurikulum" : 
                currentScene === 2 ? "Administrasi & Kelengkapan Ajar" : 
                "Supervisi & Resolusi Konflik"
              }
            </span>
            <div className="flex items-center gap-1.5">
              <RefreshCw size={9} className="animate-spin" style={{ animationDuration: '3s' }} />
              Diperbarui pukul {fmt(lastRefresh)} · auto-refresh tiap 60 detik
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full min-h-[480px]"
            >
              {currentScene === 0 && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
                    <AnalyticsCard variant="premium" title="Semester Aktif" value={semNama || '—'} subtitle={tpTahun ? `TP ${tpTahun}` : ''} icon={<CalendarDays className="text-white" />} gradient="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-teal-400/30" isLoading={lSem} />
                    <AnalyticsCard variant="premium" title="Guru Aktif" value={totalGuru > 0 ? `${totalGuru} Guru` : '—'} subtitle="total guru pendidik aktif" icon={<Users className="text-white" />} gradient="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-blue-400/30" isLoading={lGuru} />
                    <AnalyticsCard variant="premium" title="Rombel" value={totalKelas > 0 ? `${totalKelas} Kelas` : '—'} subtitle="total kelas aktif" icon={<LayoutGrid className="text-white" />} gradient="bg-gradient-to-br from-violet-500 to-violet-700 text-white border-violet-400/30" isLoading={lKelas} />
                    <AnalyticsCard variant="premium" title="Total Mapel" value={totalMapel > 0 ? `${totalMapel} Mapel` : '—'} subtitle="total mata pelajaran" icon={<BookOpen className="text-white" />} gradient="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400/30" isLoading={lMapel} />
                  </div>

                  {/* KBM Monitoring in TV Mode */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300">
                            Monitoring KBM — Live Hari Ini (TV Mode)
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                        <Zap size={10} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Live</span>
                      </div>
                    </div>
                    <div className="p-5">
                      <MonitoringKbmWidget />
                    </div>
                  </div>
                </div>
              )}

              {currentScene === 1 && (
                <div className="space-y-6">
                  {/* Distribution and Burden JP */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 flex flex-col justify-between min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Distribusi JP per Jurusan / Kelompok</h3>
                      <div className="h-64 flex-1"><DistribusiChart data={distribusi} loading={lStr} /></div>
                    </Card>
                    <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4 font-black">Beban JP per Kelompok Mapel</h3>
                      <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={beban} margin={{ top: 5, right: 10, left: -25, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                            <XAxis dataKey="nama" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={chartTooltipContentStyle} formatter={(v: number) => [`${v} JP/minggu`, 'Beban']} />
                            <Bar dataKey="jp" radius={[4, 4, 0, 0]} maxBarSize={36}>
                              {beban?.map((b, i) => (
                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {currentScene === 2 && (
                <div className="space-y-6">
                  {/* Perangkat Ajar / Teaching Documents completeness */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Statistik Perangkat Ajar</h3>
                      <PerangkatPanel stats={perangkatStats} recent={recentPerangkat} loading={lPerangkat} teachersCount={totalGuru} />
                    </Card>
                    <Card className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 min-h-[360px] flex flex-col justify-between">
                      <div className="space-y-4 flex-1">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Panduan Kelengkapan Berkas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Modul Ajar / RPP</h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">Setiap guru pengampu wajib mengunggah RPP/Modul Ajar sebelum minggu efektif KBM berjalan. Dokumen yang diunggah akan diverifikasi oleh Kepala Sekolah atau Waka Kurikulum.</p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Silabus & Ketercapaian</h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">Administrasi mencakup Kriteria Ketercapaian Tujuan Pembelajaran (KKTP), Program Tahunan (Prota), dan Program Semester (Promes) guna keselarasan rencana pengajaran.</p>
                          </div>
                        </div>
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-3 mt-4">
                          <div className="p-1.5 bg-indigo-500 text-white rounded-lg flex-shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Status Verifikasi Administrasi</h4>
                            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">Sistem secara otomatis mendeteksi kepatuhan administrasi. Pastikan seluruh dokumen ajar berstatus "Disetujui" agar validasi kurikulum guru dinilai 100%.</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {currentScene === 3 && (
                <div className="space-y-6">
                  {/* Supervision Progress and Workload Alerts + Schedule Conflicts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-6 min-h-[360px]">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Progress Supervisi</h3>
                      <SupervisiPanel pct={supPct} pieData={pieData} selesai={supSelesai} terjadwal={supTerjadwal} belum={supBelum} total={supRows.length} recent={recentSup} loading={lSup} hasPermission={hasSupervisiAccess} />
                    </Card>
                    <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm rounded-2xl p-6 min-h-[360px] flex flex-col justify-between">
                      <div className="space-y-4 flex-1">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 font-black flex items-center gap-2">
                          Resolusi Konflik & Beban Mengajar
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Column: Overload/Underload */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notifikasi Beban Guru</h4>
                            {overload.length === 0 && underload.length === 0 ? (
                              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-500" />
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Semua Normal</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {overload.length > 0 && (
                                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                                    <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">Overload ({overload.length} Guru)</p>
                                    <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-relaxed">Kelebihan beban mengajar di atas {STANDAR_MAX} JP.</p>
                                  </div>
                                )}
                                {underload.length > 0 && (
                                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase">Underload ({underload.length} Guru)</p>
                                    <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-relaxed">Jam mengajar kurang dari {STANDAR_MIN} JP.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Column: Schedule Conflicts */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bentrok Jadwal KBM</h4>
                            {conflicts.length === 0 ? (
                              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center gap-2">
                                <CheckCircle2 size={20} className="text-emerald-500" />
                                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Jadwal 100% Aman</p>
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {conflicts?.map((conflict, i) => (
                                  <div key={i} className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-start gap-2">
                                    <AlertTriangle size={12} className="text-rose-500 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">{conflict.type} Bentrok</p>
                                      <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-normal font-medium">{conflict.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 shrink-0">
                        * Peringatan beban dan bentrok dihasilkan otomatis dari verifikasi data Jadwal KBM aktif.
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AcademicPageLayout>
    );
  }


  
  return null;
});
