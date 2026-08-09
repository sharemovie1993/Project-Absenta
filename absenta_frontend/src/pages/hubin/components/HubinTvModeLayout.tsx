import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, ChevronLeft, ChevronRight, Building2, Users, ClipboardList, Briefcase, GraduationCap, AlertTriangle, ArrowRight, TrendingUp
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { cn } from '@/lib/utils';
import { type HubinStats, type HubinActivity } from './HubinDashboardComponents';

interface HubinTvModeLayoutProps {
  currentScene: number;
  setCurrentScene: React.Dispatch<React.SetStateAction<number>>;
  scenes: Array<{ title: string; desc: string }>;
  lastRefresh: Date;
  stats: HubinStats | null;
  activities: HubinActivity[];
  statCards: Array<{ label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; desc: string }>;
}

export const HubinTvModeLayout: React.FC<HubinTvModeLayoutProps> = React.memo(({
  currentScene,
  setCurrentScene,
  scenes,
  lastRefresh,
  stats,
  activities,
  statCards
}) => {
  const totalTraced = React.useMemo(() => {
    if (!stats?.tracerStats) return 0;
    return (
      (stats.tracerStats.BEKERJA || 0) +
      (stats.tracerStats.KULIAH || 0) +
      (stats.tracerStats.WIRAUSAHA || 0) +
      (stats.tracerStats.MENCARI_KERJA || 0)
    );
  }, [stats]);

  const tracerItems = React.useMemo(() => {
    if (!stats?.tracerStats) return [];
    return [
      { label: 'Bekerja', value: stats.tracerStats.BEKERJA || 0, color: 'bg-emerald-500' },
      { label: 'Kuliah / Studi Lanjut', value: stats.tracerStats.KULIAH || 0, color: 'bg-indigo-500' },
      { label: 'Wirausaha', value: stats.tracerStats.WIRAUSAHA || 0, color: 'bg-amber-500' },
      { label: 'Mencari Kerja', value: stats.tracerStats.MENCARI_KERJA || 0, color: 'bg-rose-500' },
    ];
  }, [stats]);

  const getActionLabel = React.useCallback((action: string) => {
    switch (action) {
      case 'HUBIN_MITRA_CREATE': return 'Menambahkan Mitra Industri';
      case 'HUBIN_MITRA_UPDATE': return 'Memperbarui Mitra Industri';
      case 'HUBIN_MITRA_DELETE': return 'Menghapus Mitra Industri';
      case 'HUBIN_MOU_CREATE': return 'Membuat MoU Kerja Sama';
      case 'HUBIN_MOU_UPDATE': return 'Memperbarui MoU Kerja Sama';
      case 'HUBIN_MOU_DELETE': return 'Menghapus MoU Kerja Sama';
      case 'HUBIN_MOU_RENEW': return 'Memperpanjang MoU Kerja Sama';
      case 'HUBIN_PKL_PLACE': return 'Menempatkan Siswa PKL';
      case 'HUBIN_PKL_REMOVE': return 'Menarik Siswa PKL';
      case 'HUBIN_LOWONGAN_CREATE': return 'Membuka Lowongan Kerja BKK';
      case 'HUBIN_LOWONGAN_UPDATE': return 'Memperbarui Lowongan Kerja';
      case 'HUBIN_LOWONGAN_DELETE': return 'Menutup Lowongan Kerja';
      case 'HUBIN_LAMARAN_CREATE': return 'Mengajukan Lamaran BKK';
      case 'HUBIN_LAMARAN_STATUS': return 'Memperbarui Status Lamaran BKK';
      case 'HUBIN_LAMARAN_DELETE': return 'Membatalkan Lamaran BKK';
      case 'HUBIN_TRACER_SUBMIT': return 'Mengisi Tracer Study';
      case 'HUBIN_TEFA_CREATE': return 'Membuat Proyek TEFA';
      case 'HUBIN_TEFA_UPDATE': return 'Memperbarui Proyek TEFA';
      case 'HUBIN_TEFA_DELETE': return 'Menghapus Proyek TEFA';
      default: return action;
    }
  }, []);

  const getActionBadgeColor = React.useCallback((action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (action.includes('UPDATE') || action.includes('RENEW')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-8 overflow-hidden font-sans select-none animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">Layar Monitor Hubungan Industri</h1>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
              Scene {currentScene + 1} dari 4: {scenes[currentScene]?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
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
            <div>Diperbarui: {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div>Auto-refresh: 60s</div>
          </div>

          <TvModeToggle variant="floating-exit" />
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 min-h-0 relative">
        {/* Left/Right manual click navigations */}
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
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                  {statCards?.map((s, idx) => (
                    <Card key={idx} className="p-5 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-white shadow-lg flex items-center justify-between min-h-[96px]">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{s.value}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-tight">{s.desc}</p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-indigo-500 dark:text-indigo-400",
                        s.color === 'emerald' ? "text-emerald-500 dark:text-emerald-400" :
                        s.color === 'amber' ? "text-amber-500 dark:text-amber-400" :
                        s.color === 'sky' ? "text-sky-500 dark:text-sky-400" : ""
                      )}>
                        <s.icon size={24} />
                      </div>
                    </Card>
                  ))}
                </div>

                {/* MoU Alert banner or info */}
                {stats && stats.mouExpiringCount > 0 ? (
                  <div className="flex items-center gap-4 p-5 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl shrink-0">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Perhatian: Dokumen MoU Rekan Industri Expiring</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Terdapat {stats.mouExpiringCount} rekanan industri dengan status MoU mendekati tanggal kadaluarsa (30 hari).</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-5 bg-emerald-500/10 dark:bg-emerald-950/10 border border-emerald-500/20 dark:border-emerald-900/25 rounded-2xl shrink-0">
                    <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Dokumen Kerja Sama MoU Stabil</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Semua dokumen MoU industri berada dalam status aktif dan valid.</p>
                    </div>
                  </div>
                )}

                {/* Visual Overview */}
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
                  <Building2 className="w-16 h-16 text-indigo-500 dark:text-indigo-400 mb-4" />
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">Kemitraan Industri & Keterserapan Kerja</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-2">
                    Mengelola kolaborasi terpadu bersama {stats?.totalMitra || 0} mitra DU-DI rekanan sekolah, memfasilitasi program PKL terstruktur, lowongan BKK aktif, serta pelacakan alumni tracer study digital.
                  </p>
                </div>
              </div>
            )}

            {currentScene === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                {/* Uraian Tracer Study */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/35 flex items-center justify-center">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Serapan Keterserapan Alumni</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Hasil penelusuran tracer study lulusan</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats?.totalAlumniTraced || 0}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Lulusan Terlacak</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-500">{stats?.employmentRate?.toFixed(1) ?? '0'}%</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Tingkat Penyerapan Kerja</p>
                      </div>
                    </div>

                    {totalTraced === 0 ? (
                      <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                        Belum ada data tracer study terisi
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2">
                        {tracerItems?.map((item, idx) => {
                          const pct = Math.round((item.value / totalTraced) * 100) || 0;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                                <span className="text-slate-800 dark:text-slate-200">{item.value} alumni ({pct}%)</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", item.color)} style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Jurusan Terserap */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Top Jurusan/Program Keahlian</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Serapan industri tertinggi per kompetensi</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                    {stats && stats.topJurusanTerserap?.length > 0 ? (
                      stats.topJurusanTerserap?.map((j, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{j.nama}</span>
                          <Badge variant="info" className="font-bold text-xs">{j.count} Alumni Terserap</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Belum ada data penyerapan jurusan</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentScene === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                {/* Penempatan Siswa PKL */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/35 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Aktivitas Penempatan PKL Terbaru</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Penempatan siswa di industri DU-DI</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                    {stats && stats.recentPkl?.length > 0 ? (
                      stats.recentPkl?.map((pkl) => (
                        <div key={pkl.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{pkl.siswa}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">Mitra: {pkl.mitra} <span className="mx-1">•</span> Tanggal: {pkl.tanggal ? new Date(pkl.tanggal).toLocaleDateString('id-ID') : '—'}</p>
                          </div>
                          <Badge variant={pkl.status === 'AKTIF' ? 'success' : pkl.status === 'SELESAI' ? 'info' : 'secondary'}>
                            {pkl.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Belum ada penempatan PKL</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Mitra Industri */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Top Mitra Industri Partner PKL</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">DU-DI rekanan ter-aktif penempatan siswa</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                    {stats && stats.topMitra?.length > 0 ? (
                      stats.topMitra?.map((m, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{m.nama}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Mitra Industri DU-DI Partner</p>
                          </div>
                          <Badge variant="success" className="font-bold text-xs">{m.count} Siswa PKL Aktif</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Belum ada partner ter-aktif</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentScene === 3 && (
              <div className="h-full flex flex-col bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/35 flex items-center justify-center">
                    <Activity size={16} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Log Aktivitas Terbaru (Audit Trail)</h3>
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Aktivitas sinkronisasi operasional Hubin</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                  {activities && activities.length > 0 ? (
                    activities?.map((act) => (
                      <div key={act.id} className="flex items-start justify-between text-xs py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition-colors px-2 rounded-lg">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={cn("text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded shrink-0", getActionBadgeColor(act.action))}>
                            {act.action.replace('HUBIN_', '')}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{getActionLabel(act.action)}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
                              Oleh <span className="font-semibold text-slate-500 dark:text-slate-400">{act.actor}</span>
                              {act.metadata && (
                                <span className="italic opacity-80">
                                  {act.metadata.nama && ` • ${act.metadata.nama}`}
                                  {act.metadata.siswa_nama && ` • ${act.metadata.siswa_nama}`}
                                  {act.metadata.posisi && ` • ${act.metadata.posisi}`}
                                  {act.metadata.nama_proyek && ` • ${act.metadata.nama_proyek}`}
                                  {act.metadata.mou_nomor && ` • MoU ${act.metadata.mou_nomor}`}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0 ml-2">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px]">Tidak ada log aktivitas terakhir</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* AnalyticsCard */}
    </div>
  );
});
