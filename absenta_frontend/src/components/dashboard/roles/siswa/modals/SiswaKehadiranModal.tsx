import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import type { SiswaMonthStats } from '../types';

export interface SiswaKehadiranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tabId: string) => void;
  selectedMonthFormatted: string;
  attendanceRate: number;
  monthStats: SiswaMonthStats;
}

export const SiswaKehadiranModal: React.FC<SiswaKehadiranModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  selectedMonthFormatted,
  attendanceRate,
  monthStats,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Rincian Kehadiran Bulanan
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedMonthFormatted} • Presensi {attendanceRate}%
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Grid Breakdown */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-center">
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">HADIR</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">{monthStats.hadir}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-center">
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">SAKIT</span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">{monthStats.sakit}</span>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-500/20 text-center">
                  <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">IZIN</span>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">{monthStats.izin}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/20 text-center">
                  <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">ALPA</span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">{monthStats.alpa}</span>
                </div>
              </div>

              {/* Progress Bar Visual */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Tingkat Kehadiran</span>
                  <span>{attendanceRate}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                  <div style={{ width: `${attendanceRate}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-500" />
                </div>
              </div>

              {/* Quick Info & Action */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-500/20 flex items-center justify-between gap-3">
                <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                  Lihat riwayat kalender lengkap dan surat izin presensi di Tab Kehadiran.
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab('kehadiran');
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Buka Tab Kehadiran &rsaquo;
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-center">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
