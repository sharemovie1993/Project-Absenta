import React from 'react';
import {
  ShieldAlert,
  Clock,
  MapPin,
  KeyRound,
  Users,
  ArrowRight,
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CbtJadwalUjian } from '@/types/cbt.types';

export interface CbtPengawasDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveSchedules: CbtJadwalUjian[];
  guruNama?: string;
  onEnterMejaPengawas: (jadwalId: string) => void;
}

export const CbtPengawasDispatchModal: React.FC<CbtPengawasDispatchModalProps> = ({
  isOpen,
  onClose,
  liveSchedules,
  guruNama,
  onEnterMejaPengawas,
}) => {
  if (!isOpen || !liveSchedules || liveSchedules.length === 0) return null;

  const handleDismiss = () => {
    try {
      liveSchedules.forEach((s) => {
        sessionStorage.setItem(`cbt_pengawas_dispatch_${s.id}`, 'true');
      });
    } catch (_) {}
    onClose();
  };

  const handleSelectSchedule = (jadwalId: string) => {
    try {
      sessionStorage.setItem(`cbt_pengawas_dispatch_${jadwalId}`, 'true');
    } catch (_) {}
    onEnterMejaPengawas(jadwalId);
  };

  const formatScheduleTime = (startStr?: string, endStr?: string) => {
    if (!startStr) return '';
    try {
      const d1 = new Date(startStr);
      const t1 = d1.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      if (!endStr) return t1;
      const d2 = new Date(endStr);
      const t2 = d2.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return `${t1} - ${t2} WIB`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow Accent Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3 bg-gradient-to-b from-emerald-50/50 dark:from-emerald-950/20 to-transparent">
          <div className="flex items-start gap-3">
            <div className="relative p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25 shrink-0">
              <ShieldAlert size={22} className="animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  🔴 PENGAWASAN AKTIF BERLANGSUNG
                </span>
                {liveSchedules.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    {liveSchedules.length} Sesi Aktif
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                Panggilan Tugas Pengawas Ujian CBT
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {guruNama ? `Yth. ${guruNama}, Anda` : 'Anda'} terjadwal sebagai Pengawas Ruang / Proktor pada sesi ujian yang sedang aktif.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Briefing Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200">
              <Sparkles size={14} className="text-emerald-500" />
              <span>Prioritas Pengawasan Ruang Ujian</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              Mohon segera membuka <strong>Meja Pengawas CBT</strong> untuk memantau kehadiran siswa, merilis token sesi, menangani reset login kendala perangkat, dan mengawasi rekam pelanggaran layar peserta.
            </p>
          </div>

          {/* Schedule Cards */}
          <div className="space-y-3">
            {liveSchedules.map((schedule, idx) => {
              const isFirst = idx === 0;
              const cfg = (schedule.setting_keamanan as any) || {};
              const room = cfg.ruang_ujian || cfg.ruang_ujian_nama || 'Ruang CBT';
              const mapel = schedule.BankSoal?.Mapel?.nama_mapel || schedule.BankSoal?.judul || 'Ujian CBT';
              const timeRange = formatScheduleTime(schedule.tanggal_mulai, schedule.tanggal_selesai);
              const isPaused = schedule.status === 'PAUSED';

              return (
                <div
                  key={schedule.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all',
                    isFirst
                      ? 'bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-850 dark:to-slate-900 border-emerald-300 dark:border-emerald-700/60 shadow-sm'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {schedule.nama_sesi || `Sesi #${idx + 1}`}
                        </span>
                        {isPaused ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                            Sesi Dijeda (PAUSED)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                            🔴 Sesi Berlangsung Live
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                        {mapel}
                      </h4>
                      {schedule.BankSoal?.judul && schedule.BankSoal?.judul !== mapel && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {schedule.BankSoal.judul}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {schedule.durasi_menit} Menit
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Status: {schedule.status}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{room}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{timeRange || `${schedule.durasi_menit} Menit`}</span>
                    </div>
                  </div>

                  {/* Token Row */}
                  <div className="mt-2.5 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <KeyRound size={13} className="text-emerald-500" />
                      <span>Token Ujian Sesi:</span>
                    </div>
                    {schedule.token_ujian ? (
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 tracking-widest text-xs px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                        {schedule.token_ujian}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500">
                        Tanpa Token (Bebas Akses)
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-3.5">
                    <button
                      type="button"
                      onClick={() => handleSelectSchedule(schedule.id)}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ShieldCheck size={16} />
                      <span>🛡️ Masuk ke Meja Pengawas Sekarang</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-slate-400" />
            <p className="leading-relaxed">
              Di Meja Pengawas, Anda dapat memantau detak jantung (heartbeat) peserta secara live, mereset izin masuk siswa yang mengalami kendala teknis, dan mengunduh berita acara ujian.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Nanti Saja (Tetap di Halaman Ini)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CbtPengawasDispatchModal;
