import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  X,
  AlertCircle,
  HardDrive,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  useOtaState,
  startOtaDownload,
  applyOtaReload,
  dismissOtaModal,
  openOtaModal,
  isMobileNative,
} from '@/services/otaUpdateService';

export const GlobalOtaUpdateModal: React.FC = () => {
  const ota = useOtaState();

  // Hanya tampil pada runtime mobile native
  if (!isMobileNative()) return null;

  const manifest = ota.manifest;
  const bundleSizeMb = manifest?.bundle_size_bytes
    ? (manifest.bundle_size_bytes / (1024 * 1024)).toFixed(1)
    : '17.2';

  const formattedDate = manifest?.released_at
    ? new Date(manifest.released_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Hari ini';

  return (
    <>
      {/* ── MODAL UTAMA PEMBARUAN OTA ── */}
      <AnimatePresence>
        {ota.isModalOpen && ota.hasUpdate && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative"
            >
              {/* Decorative Header Glow */}
              <div className="h-28 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 relative flex items-center justify-center overflow-hidden">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-black/10 rounded-full blur-2xl" />
                
                {/* Close Button jika belum mendownload */}
                {!ota.isDownloading && (
                  <button
                    type="button"
                    onClick={dismissOtaModal}
                    className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-black/20 text-white/90 hover:bg-black/30 transition-all cursor-pointer"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Rocket Icon Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transform -translate-y-1">
                  {ota.isReadyToReload ? (
                    <CheckCircle2 className="w-9 h-9 text-emerald-300 animate-bounce" />
                  ) : (
                    <Rocket className="w-8 h-8 text-amber-300 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pembaruan Resmi Tersedia</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {ota.isReadyToReload
                      ? 'Pembaruan Siap Diterapkan!'
                      : 'Versi Baru Absenta Telah Hadir'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ota.isReadyToReload
                      ? 'Berkas telah selesai diunduh. Muat ulang aplikasi untuk menikmati fitur terbaru.'
                      : 'Tingkatkan performa, perbaikan logo sekolah, dan stabilitas aplikasi.'}
                  </p>
                </div>

                {/* Version Comparison Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Versi Saat Ini</span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate block">
                      v{ota.currentVersion}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Versi Baru</span>
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 truncate block">
                      v{ota.remoteVersion || manifest?.version}
                    </span>
                  </div>
                </div>

                {/* Release Notes & Info */}
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                      Ukuran: <strong>{bundleSizeMb} MB</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Rilis: <strong>{formattedDate}</strong>
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] mb-1">
                      Catatan Pembaruan:
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "{manifest?.release_notes || 'Peningkatan performa, perbaikan logo sekolah, dan pembaruan stabilitas Absenta.'}"
                    </p>
                  </div>
                </div>

                {/* Progress Bar (Jika Sedang Mengunduh) */}
                {ota.isDownloading && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs font-bold text-blue-600 dark:text-blue-400">
                      <span>Mengunduh pembaruan...</span>
                      <span>{ota.downloadProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(5, ota.downloadProgress)}%` }}
                        transition={{ ease: 'easeOut', duration: 0.2 }}
                      />
                    </div>
                    <p className="text-[10px] text-center text-slate-400">
                      Mohon tunggu sebentar, aplikasi tidak akan tertutup.
                    </p>
                  </div>
                )}

                {/* Error Banner jika gagal */}
                {ota.error && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{ota.error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col gap-2.5">
                  {ota.isReadyToReload ? (
                    <button
                      type="button"
                      onClick={applyOtaReload}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 animate-spin-slow" />
                      <span>Muat Ulang Aplikasi Sekarang</span>
                    </button>
                  ) : ota.isDownloading ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <span>Sedang Mengunduh...</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={startOtaDownload}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Update Sekarang ({bundleSizeMb} MB)</span>
                      </button>

                      <button
                        type="button"
                        onClick={dismissOtaModal}
                        className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        Nanti Saja
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FLOATING PILL KETIKA MODAL DITUTUP (TIDAK MENGGANGGU) ── */}
      <AnimatePresence>
        {!ota.isModalOpen && ota.hasUpdate && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-20 right-4 z-[99990] flex items-center"
          >
            <button
              type="button"
              onClick={openOtaModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 shadow-2xl border border-slate-700/80 dark:border-slate-200 backdrop-blur-md active:scale-95 transition-all cursor-pointer group"
            >
              <div className="relative">
                <Rocket className="w-4 h-4 text-amber-400 dark:text-indigo-600 group-hover:animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-ping" />
              </div>
              <span className="text-xs font-bold font-sans">
                {ota.isReadyToReload ? 'Siap Muat Ulang' : `Update v${ota.remoteVersion || manifest?.version}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                {ota.isReadyToReload ? 'Terapkan' : 'Perbarui'}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalOtaUpdateModal;

