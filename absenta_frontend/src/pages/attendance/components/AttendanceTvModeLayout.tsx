import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, Cpu, MapPin, TrendingUp, BookOpen, 
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { type DeviceInfo, type FeedItem, type SectorItem } from './AttendanceDashboardComponents';
import { type GerbangStats } from '@/api/attendanceGerbang.api';

interface AttendanceTvModeLayoutProps {
  currentScene: number;
  setCurrentScene: React.Dispatch<React.SetStateAction<number>>;
  scenes: Array<{ title: string; desc: string }>;
  lastRefresh: Date;
  stats: GerbangStats | Record<string, unknown> | null;
  feed: FeedItem[];
  terminalDevices: DeviceInfo[];
  statsBySector: SectorItem[];
  sectorName: string;
  statCards: Array<{ label: string; value: number; icon: React.ReactNode; gradient: string; desc: string }>;
  chartData: Array<{ kelas: string; HADIR: number; TERLAMBAT: number; ALPA: number }>;
  sekolah: { name: string } | null;
}

export const AttendanceTvModeLayout: React.FC<AttendanceTvModeLayoutProps> = React.memo(({
  currentScene,
  setCurrentScene,
  scenes,
  lastRefresh,
  stats,
  feed,
  terminalDevices,
  statsBySector,
  sectorName,
  statCards,
  chartData,
  sekolah
}) => {
  const gateStats = stats as GerbangStats | null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-8 overflow-hidden font-sans select-none animate-fadeIn">
      {/* TV Mode Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/40">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">Layar Monitor Presensi & Terminal Gate</h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-0.5">
              Scene {currentScene + 1} dari 4: {scenes[currentScene]?.title}
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
                  currentScene === i ? "bg-emerald-500 scale-125" : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
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
                  {statCards?.map((s, idx) => (
                    <Card key={idx} className="p-5 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-white shadow-lg flex items-center justify-between min-h-[96px]">
                      <div>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{s.value}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-tight">{s.desc}</p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-emerald-500 dark:text-emerald-400",
                        s.gradient?.includes("orange") ? "text-amber-500 dark:text-amber-400" :
                        s.gradient?.includes("indigo") ? "text-blue-500 dark:text-blue-400" :
                        s.gradient?.includes("red") ? "text-rose-500 dark:text-rose-400" : ""
                      )}>
                        {s.icon}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Chart Kehadiran per Kelas */}
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Persentase Kehadiran per Kelas</h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Tingkat partisipasi harian KBM kelas</p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                          <XAxis dataKey="kelas" tick={{ fontSize: 10 }} className="text-slate-600 dark:text-slate-400" />
                          <YAxis tick={{ fontSize: 10 }} className="text-slate-600 dark:text-slate-400" />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="HADIR" fill="#10B981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="TERLAMBAT" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ALPA" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-sm font-semibold">Belum ada statistik masuk hari ini</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentScene === 1 && (
              <div className="h-full flex flex-col bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Feed Aktivitas Kelas KBM</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Log real-time aktivitas absensi kelas</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-2">
                  {feed.length > 0 ? (
                    feed?.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center shrink-0">
                            <BookOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight truncate">{item.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Guru Pengajar: {item.guru || 'Umum'} <span className="mx-1.5 opacity-20">•</span> <span className="font-bold text-slate-400 dark:text-slate-500">{item.message?.split('|')[1]?.trim() || ''}</span></p>
                          </div>
                        </div>
                        {item.counts && (
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">H: {item.counts.HADIR || 0}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg">T: {item.counts.TERLAMBAT || 0}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg">I: {item.counts.IZIN || 0}</span>
                            <span className="text-xs font-bold px-2 py-1 bg-rose-500/10 text-rose-500 rounded-lg">A: {item.counts.ALPA || 0}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <Clock size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-widest">Tidak ada aktivitas KBM berlangsung</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentScene === 2 && (
              <div className="h-full flex flex-col bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Konektivitas Terminal Perangkat Scanner</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Status aktif perangkat keras tapping RFID & Face Recognition</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-2">
                  {terminalDevices?.map((device) => (
                    <div key={device.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl shrink-0 border", device.status === 'ONLINE' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-900/30')}>
                          <Cpu className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-tight">{device.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{device.location} <span className="mx-1.5 opacity-20">•</span> Ping Terakhir: {device.lastPing}</p>
                        </div>
                      </div>
                      <Badge variant={device.status === 'ONLINE' ? 'success' : 'destructive'}>
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentScene === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                {/* Gate Stats */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Aktivitas Gerbang Sekolah</p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Gate statistics hari ini</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Total Tapping</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">{gateStats?.total_taps_today ?? 0} Kali</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Siswa Masuk (Tap)</span>
                        <span className="text-base font-black text-emerald-500">{gateStats?.total_masuk ?? 0} Siswa</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Siswa Keluar (Tap)</span>
                        <span className="text-base font-black text-blue-500">{gateStats?.total_keluar ?? 0} Siswa</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Terminal Gateway Aktif</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">{gateStats?.active_devices ?? 0} Perangkat</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl mt-4">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 italic font-semibold leading-relaxed">
                      * Aktivitas tap terakhir terdeteksi pada pukul {gateStats?.last_activity ? new Date(gateStats.last_activity).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}.
                    </p>
                  </div>
                </div>

                {/* Sektoral Kehadiran (Jurusan atau Tingkat) */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center">
                        <TrendingUp size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Tingkat Kehadiran Per {sectorName}</p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Agregasi persentase partisipasi sekolah</p>
                      </div>
                    </div>

                    <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                      {statsBySector.length > 0 ? (
                        statsBySector?.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 shrink-0">
                                {idx + 1}
                              </div>
                              <span className="text-xs font-black truncate uppercase tracking-tight text-slate-800 dark:text-white">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">Rate:</span>
                              <span className="text-sm font-black shrink-0 text-emerald-500">
                                {s.percentage}%
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Belum ada statistik sektoral.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl mt-4">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 italic font-semibold leading-relaxed">
                      * Data dihimpun berdasarkan kalkulasi kehadiran kelas hari ini di {sekolah?.name || 'Sekolah'}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});
