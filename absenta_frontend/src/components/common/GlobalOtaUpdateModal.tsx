import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  X,
  HardDrive,
  Calendar,
  CloudDownload,
  ArrowRight,
} from 'lucide-react';
import {
  useOtaState,
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
      {/* ── 1. INDIKATOR NON-INTRUSIF SAAT MENGUNDUH DI LATAR BELAKANG ── */}
      <AnimatePresence>
        {ota.isDownloading && !ota.isReadyToReload && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-84 z-[99990] select-none"
          >
            <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold min-w-0">
                  <CloudDownload className="w-4 h-4 text-blue-400 shrink-0 animate-bounce" />
                  <span className="truncate">Mengunduh pembaruan di latar belakang...</span>
                </div>
                <span className="font-mono text-[11px] font-black text-blue-300 ml-2">
                  {ota.downloadProgress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, ota.downloadProgress)}%` }}
                  transition={{ ease: 'easeOut', duration: 0.2 }}
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Aplikasi tetap dapat digunakan seperti biasa.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. MODAL RESTART ELEGAN KETIKA PEMBARUAN SUDAH SELESAI DIUNDUH ── */}
      <AnimatePresence>
        {ota.isReadyToReload && ota.isModalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative"
            >
              {/* Header Visual */}
              <div className="h-28 bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 relative flex items-center justify-center overflow-hidden">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-black/10 rounded-full blur-2xl" />

                {/* Close Button */}
                <button
                  type="button"
                  onClick={dismissOtaModal}
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-black/20 text-white/90 hover:bg-black/30 transition-all cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Success Icon Badge */}
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg transform -translate-y-1">
                  <CheckCircle2 className="w-9 h-9 text-emerald-200 animate-pulse" />
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pembaruan Siap Diterapkan</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Versi Baru Telah Siap!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Berkas pembaruan telah otomatis terunduh di latar belakang. Muat ulang sekarang untuk menikmati pembaruan, atau lanjutkan beraktivitas.
                  </p>
                </div>

                {/* Version Transition Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saat Ini</span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 truncate block">
                      v{ota.currentVersion}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Terpasang</span>
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 truncate block">
                      v{ota.remoteVersion || manifest?.version}
                    </span>
                  </div>
                </div>

                {/* Info Box */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                      Ukuran: <strong>{bundleSizeMb} MB</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Rilis: <strong>{formattedDate}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                    💡 <em>Jika Anda memilih nanti, pembaruan akan <strong>otomatis langsung aktif</strong> saat aplikasi dibuka kembali di lain waktu.</em>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={applyOtaReload}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Mulai Ulang Aplikasi Sekarang</span>
                  </button>

                  <button
                    type="button"
                    onClick={dismissOtaModal}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Lanjutkan Beraktivitas (Otomatis Saat Buka Ulang)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 3. FLOATING BADGE KETIKA MODAL DI-MINIMIZE (TIDAK MENGHALANGI) ── */}
      <AnimatePresence>
        {ota.isReadyToReload && !ota.isModalOpen && (
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
                <Rocket className="w-4 h-4 text-emerald-400 dark:text-emerald-600 group-hover:animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-ping" />
              </div>
              <span className="text-xs font-bold font-sans">
                Update Siap (v{ota.remoteVersion || manifest?.version})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                Muat Ulang
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalOtaUpdateModal;
