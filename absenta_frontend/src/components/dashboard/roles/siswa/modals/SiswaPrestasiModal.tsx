import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, X } from 'lucide-react';

export interface SiswaPrestasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  bukuCatatanList: any[];
  totalPoinPrestasi: number;
  prestasiCount: number;
}

export const SiswaPrestasiModal: React.FC<SiswaPrestasiModalProps> = ({
  isOpen,
  onClose,
  bukuCatatanList,
  totalPoinPrestasi,
  prestasiCount,
}) => {
  const prestasiItems = bukuCatatanList.filter((item) => item.type === 'PRESTASI');

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
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Trophy size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Buku Catatan Prestasi &amp; Penghargaan
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                    Total +{totalPoinPrestasi} Poin Bonus • {prestasiCount} Penghargaan
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

            {/* List Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
              {prestasiItems.length > 0 ? (
                prestasiItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Award size={20} />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                          {item.judul}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Kategori: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.kategori}</span> • Pencatat: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.pencatat}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Tanggal: {item.tanggal}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 inline-block font-mono">
                        +{item.poin || 0} Poin
                      </span>
                      <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-2">
                  <Trophy className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Belum ada catatan prestasi atau penghargaan yang terdaftar.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-center">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Tutup Buku Prestasi
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
