import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SiswaLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  currentClassName: string;
  selectedMonthFormatted: string;
  currentUserId?: string;
  studentName?: string;
}

export const SiswaLeaderboardModal: React.FC<SiswaLeaderboardModalProps> = ({
  isOpen,
  onClose,
  students,
  currentClassName,
  selectedMonthFormatted,
  currentUserId,
  studentName,
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
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                  <Trophy size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Klasemen Kedisiplinan Kelas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Kelas {currentClassName} • {selectedMonthFormatted}
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

            {/* Leaderboard List Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {students && students.length > 0 ? (
                students.map((student: any, idx: number) => {
                  const isMe =
                    student.id === currentUserId ||
                    student.nama === studentName;
                  const rankNumber = idx + 1;
                  const isGold = rankNumber === 1;
                  const isSilver = rankNumber === 2;
                  const isBronze = rankNumber === 3;

                  return (
                    <div
                      key={student.id || `rank-item-${idx}`}
                      className={cn(
                        "pt-2.5 first:pt-0 p-3 rounded-2xl transition-all flex items-center justify-between gap-3 border",
                        isMe
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/40 shadow-xs"
                          : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      )}
                    >
                      {/* Left Rank & Student Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl font-black font-mono text-xs flex items-center justify-center shrink-0 border",
                            isGold
                              ? "bg-amber-400/20 text-amber-600 border-amber-400/40"
                              : isSilver
                              ? "bg-slate-300/20 text-slate-600 border-slate-300/40"
                              : isBronze
                              ? "bg-amber-700/20 text-amber-800 border-amber-700/40"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                          )}
                        >
                          #{rankNumber}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "text-sm font-bold truncate block",
                                isMe
                                  ? "text-blue-700 dark:text-blue-300 font-extrabold"
                                  : "text-slate-900 dark:text-white"
                              )}
                            >
                              {student.nama}
                            </span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-600 text-white uppercase tracking-wider">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
                            <span>Hadir: {student.hadir || 0}x</span>
                            <span>•</span>
                            <span>Persentase: {student.persentase || 0}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Points Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                          {student.total_poin >= 0 ? `+${student.total_poin}` : student.total_poin} Poin
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">Total Skor</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center space-y-2">
                  <Trophy className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Belum ada data klasemen untuk bulan ini.
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
                Tutup Klasemen
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
