import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader, X } from 'lucide-react';
import { PendingSiswaModule } from '@/pages/attendance/ops/components/PendingSiswaModule';

export interface SiswaBelumAbsenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClassName: string;
  kelasId: string;
  notPresentData: any[];
  notPresentLoading: boolean;
  miniStatsData: { masuk: number; keluar: number };
  onRefreshData: () => Promise<void>;
  onRemovePendingStudent: (id: string) => void;
}

export const SiswaBelumAbsenModal: React.FC<SiswaBelumAbsenModalProps> = ({
  isOpen,
  onClose,
  currentClassName,
  kelasId,
  notPresentData,
  notPresentLoading,
  miniStatsData,
  onRefreshData,
  onRemovePendingStudent,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/65 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Handle Pill */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

            {/* Header Modal */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-rose-50/60 dark:bg-rose-950/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Daftar Siswa Belum Absensi
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                    Kelas {currentClassName} • Presensi Manual Petugas Kelas
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

            {/* Modal Body: Responsive PendingSiswaModule */}
            <div className="p-2 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <Suspense
                fallback={
                  <div className="py-20 text-center space-y-3">
                    <Loader className="animate-spin mx-auto text-rose-500" size={32} />
                    <p className="text-xs font-bold text-slate-400">Memuat daftar siswa belum absen...</p>
                  </div>
                }
              >
                <PendingSiswaModule
                  notPresent={notPresentData}
                  notPresentLoading={notPresentLoading}
                  miniStats={miniStatsData}
                  selectedKelasId={kelasId}
                  setSelectedKelasId={() => {}}
                  kelasOptions={[]}
                  isPetugasSiswa={true}
                  userRole="PETUGAS_KELAS"
                  socketConnected={true}
                  refreshData={onRefreshData}
                  removePendingStudent={onRemovePendingStudent}
                />
              </Suspense>
            </div>

            {/* Footer Modal */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                Presensi manual akan langsung tersinkron secara real-time.
              </span>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shrink-0"
              >
                Selesai &amp; Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
