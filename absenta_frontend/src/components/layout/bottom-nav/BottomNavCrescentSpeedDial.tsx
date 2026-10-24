import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { MobileBottomTabItem, MobileBottomSubItem } from '@/config/bottomNavEcosystems.config';

export interface BottomNavCrescentSpeedDialProps {
  openFlyoutItem?: MobileBottomTabItem;
  currentSubtab: string | null;
  onClose: () => void;
  onSelectSubItem: (subItem: MobileBottomSubItem) => void;
}

export const BottomNavCrescentSpeedDial: React.FC<BottomNavCrescentSpeedDialProps> = React.memo(({
  openFlyoutItem,
  currentSubtab,
  onClose,
  onSelectSubItem,
}) => {
  return (
    <AnimatePresence>
      {openFlyoutItem && openFlyoutItem.children && (
        <>
          {/* Backdrop overlay transparan dengan blur lembut */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 z-50 bg-black/45 backdrop-blur-xs cursor-pointer"
          />

          {/* Container Melayang Bebas Tanpa Kotak (100% Transparan) */}
          <div className="lg:hidden fixed bottom-[calc(4.4rem+env(safe-area-inset-bottom))] right-3 sm:right-5 z-50 pointer-events-none flex flex-col items-end max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar py-2">
            <div className="flex flex-col-reverse items-end gap-2.5 sm:gap-3 pointer-events-auto pr-1">
              {openFlyoutItem.children.map((sub, idx, arr) => {
                const SubIcon = sub.icon;
                const isSubActive = currentSubtab === sub.id;
                const total = arr.length;
                // Perhitungan Lengkungan Busur / Bulan Sabit (Crescent Bow Curve)
                // Menghasilkan pergeseran melengkung cembung ke kiri di bagian tengah
                const normalizedT = total > 1 ? idx / (total - 1) : 0.5;
                const curveOffset = Math.round(Math.sin(normalizedT * Math.PI) * 44);

                return (
                  <motion.button
                    key={sub.id}
                    type="button"
                    onClick={() => onSelectSubItem(sub)}
                    initial={{ opacity: 0, scale: 0.5, x: 30 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.5, x: 30 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 26,
                      delay: idx * 0.025,
                    }}
                    style={{
                      transform: `translateX(-${curveOffset}px)`,
                    }}
                    className="flex items-center justify-end gap-2.5 group select-none cursor-pointer focus:outline-hidden"
                  >
                    {/* Label Teks Rata Kanan di Sebelah Kiri Icon */}
                    <div
                      className={cn(
                        "px-3 py-1.5 rounded-2xl shadow-lg border backdrop-blur-xl transition-all duration-150 flex items-center gap-1.5",
                        isSubActive
                          ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-indigo-600/30 scale-105"
                          : "bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border-white/60 dark:border-slate-700/60 font-semibold hover:bg-white dark:hover:bg-slate-800 group-hover:scale-102 shadow-black/15"
                      )}
                    >
                      {sub.badge && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white shrink-0 leading-none shadow-xs">
                          {sub.badge}
                        </span>
                      )}
                      <span className="text-xs text-right whitespace-nowrap leading-none tracking-tight">
                        {sub.label}
                      </span>
                    </div>

                    {/* Icon Bulat Melayang di Sebelah Kanan */}
                    <div
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-xl border backdrop-blur-xl transition-all duration-150 group-hover:scale-110",
                        isSubActive
                          ? "bg-indigo-600 text-white border-indigo-300 ring-2 ring-indigo-400/80 shadow-indigo-600/40"
                          : cn(
                              "bg-white/95 dark:bg-slate-900/95 border-white/80 dark:border-slate-700/80 shadow-black/20",
                              sub.color || "text-indigo-600 dark:text-indigo-400"
                            )
                      )}
                    >
                      <SubIcon size={19} className="stroke-[2.2]" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
});

BottomNavCrescentSpeedDial.displayName = 'BottomNavCrescentSpeedDial';
export default BottomNavCrescentSpeedDial;
