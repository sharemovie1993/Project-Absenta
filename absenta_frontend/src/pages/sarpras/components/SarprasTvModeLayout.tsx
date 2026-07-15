import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Clock, Cpu, MapPin, ChevronLeft, ChevronRight, Package, CheckCircle2, History, AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { cn } from '@/lib/utils';
import { type DeviceInfo, type LoanRecord, type RepairRecord } from './SarprasDashboardComponents';
import { type AssetStats } from '../SarprasDashboard';

interface SarprasTvModeLayoutProps {
  currentScene: number;
  setCurrentScene: React.Dispatch<React.SetStateAction<number>>;
  scenes: Array<{ title: string; desc: string }>;
  lastRefresh: Date;
  stats: AssetStats | null;
  loans: LoanRecord[];
  repairs: RepairRecord[];
  statCards: Array<{ label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; desc: string }>;
}

export const SarprasTvModeLayout: React.FC<SarprasTvModeLayoutProps> = ({
  currentScene,
  setCurrentScene,
  scenes,
  lastRefresh,
  stats,
  loans,
  repairs,
  statCards
}) => {
  const unreturned = loans?.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-8 overflow-hidden font-sans select-none animate-fadeIn">
      {/* TV Mode Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/40">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">Layar Monitor Sarana & Prasarana</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-0.5">
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
                  currentScene === i ? "bg-blue-500 scale-125" : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
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
                        "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-blue-500 dark:text-blue-400",
                        s.color === 'emerald' ? "text-emerald-500 dark:text-emerald-400" :
                        s.color === 'amber' ? "text-amber-500 dark:text-amber-400" :
                        s.color === 'rose' ? "text-rose-500 dark:text-rose-400" : ""
                      )}>
                        <s.icon size={24} />
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Visual Overview */}
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
                  <Package className="w-16 h-16 text-blue-500 dark:text-blue-400 mb-4 animate-bounce" />
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">Pusat Layanan Aset & Sarpras</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-2">
                    Unit yurisdiksi {stats?.jurisdiction?.name || 'Gudang Utama'} mengoperasikan sebanyak {stats?.total || 0} aset terdaftar dengan tingkat ketersediaan siap pakai sebesar {stats && stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%.
                  </p>
                </div>
              </div>
            )}

            {currentScene === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                {/* Transaksi Peminjaman Selesai */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/35 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Transaksi Peminjaman Terbaru</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Log peminjaman ter-update</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                    {loans && loans.length > 0 ? (
                      loans?.slice(0, 10)?.map((loan) => (
                        <div key={loan.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                              <Package size={20} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{loan.Asset?.nama}</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Peminjam: {loan.Peminjam?.full_name} <span className="mx-1">•</span> Kelas: XI</p>
                            </div>
                          </div>
                          <Badge variant={loan.status === 'RETURNED' ? 'success' : loan.status === 'PENDING' ? 'warning' : 'info'}>
                            {loan.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Belum ada transaksi</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Peminjam Belum Mengembalikan */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col shadow-sm">
                  <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 flex items-center justify-center">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Aset Belum Dikembalikan (OUT)</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Peminjam aktif penagihan segera</p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1">
                    {unreturned && unreturned.length > 0 ? (
                      unreturned?.map((loan) => (
                        <div key={loan.id} className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center shrink-0">
                              <Package size={20} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{loan.Asset?.nama}</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Peminjam: {loan.Peminjam?.full_name} <span className="mx-1">•</span> Batas: {new Date(loan.tanggal_kembali_plan).toLocaleDateString('id-ID')}</p>
                            </div>
                          </div>
                          <Badge variant="destructive">OUT</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Semua aset telah kembali</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentScene === 2 && (
              <div className="h-full flex flex-col bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-600/20 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Aset Rusak & Perlu Perbaikan (Maintenance Alert)</h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Daftar item sarpras yang membutuhkan perbaikan segera</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-2">
                  {repairs && repairs.length > 0 ? (
                    repairs?.map((rep) => (
                      <div key={rep.id} className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 shrink-0">
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-tight">{rep.Asset?.nama}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Teknisi: {rep.teknisi || 'Belum Ditugaskan'} <span className="mx-1.5 opacity-20">•</span> Deskripsi: {rep.deskripsi || '—'}</p>
                          </div>
                        </div>
                        <Badge variant="warning">
                          {rep.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <Cpu size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-widest">Seluruh aset dalam kondisi optimal</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentScene === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                {/* Detail Yurisdiksi Gudang */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/35 flex items-center justify-center">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Unit Gudang Aktif</p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Yurisdiksi unit sarpras</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Nama Unit</span>
                        <span className="text-base font-black text-slate-800 dark:text-white">{stats?.jurisdiction?.name || 'Global Access'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Tipe Akses</span>
                        <span className="text-base font-black text-blue-500">{stats?.jurisdiction?.type === 'unit' ? 'Akses Unit' : 'Akses Global'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 font-bold uppercase">Ketersediaan Barang</span>
                        <span className="text-base font-black text-emerald-500">{stats?.available || 0} Unit</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl mt-4">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 italic font-semibold leading-relaxed">
                      * Unit gudang ini menyinkronkan data peminjaman digital secara langsung dengan database pusat.
                    </p>
                  </div>
                </div>

                {/* Panduan Operasional Gudang */}
                <div className="bg-white dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/35 flex items-center justify-center">
                        <CheckCircle2 size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Sistem Online & Stabil</p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Aktivitas pelaporan & status</p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        1. Gunakan mode pemindaian barcode digital untuk mempercepat waktu tap pinjam-kembali barang praktikum.
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        2. Lakukan pengecekan berkala terhadap log status peminjaman agar meminimalkan kehilangan aset.
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        3. Perbarui status barang rusak dengan memindahkan kondisi barang ke unit reparasi agar terpantau teknisi.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mt-4">
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 italic font-semibold leading-relaxed">
                      * Sistem pencatatan toolman digital terhubung stabil dengan server utama.
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
};
