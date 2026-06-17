import React from 'react';
import {
  ShieldCheck,
  ChevronRight,
  LogOut,
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface KesiswaanSidebarPanelProps {
  className?: string;
  /** Apakah hari ini jadwal piket */
  isPiketHariIni?: boolean;
  /** Jumlah siswa sedang izin keluar aktif */
  activeIzinCount?: number;
  /** Total poin pelanggaran hari ini */
  pointsToday?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Navigasi ke menu piket */
  onOpenPiket?: () => void;
  /** Navigasi ke monitoring */
  onOpenMonitoring?: () => void;
}

export const KesiswaanSidebarPanel: React.FC<KesiswaanSidebarPanelProps> = ({
  className,
  isPiketHariIni = false,
  activeIzinCount = 0,
  pointsToday = 0,
  isLoading = false,
  onOpenPiket,
  onOpenMonitoring,
}) => {
  return (
    <div className={cn(
      'rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-amber-50/50 dark:bg-amber-900/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Tim Kesiswaan</p>
            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Piket & Ketertiban</p>
          </div>
        </div>
        <span className={cn(
          'text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border',
          isPiketHariIni
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-900/40'
            : 'text-gray-500 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-slate-700 dark:border-slate-600'
        )}>
          {isPiketHariIni ? '● Piket Aktif' : 'Tidak Piket'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Izin Aktif */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/50">
            <div className="flex items-center gap-1 mb-1">
              <LogOut size={10} className="text-orange-400" />
              <span className="text-[8px] font-black text-gray-400 uppercase">Izin Keluar</span>
            </div>
            {isLoading ? (
              <div className="h-6 bg-gray-200 dark:bg-slate-600/50 rounded animate-pulse" />
            ) : (
              <>
                <p className={cn(
                  'text-xl font-black leading-none',
                  activeIzinCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {activeIzinCount}
                </p>
                <p className="text-[8px] text-gray-400 mt-0.5">siswa aktif</p>
              </>
            )}
          </div>

          {/* Poin Pelanggaran */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/50">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle size={10} className="text-rose-400" />
              <span className="text-[8px] font-black text-gray-400 uppercase">Pelanggaran</span>
            </div>
            {isLoading ? (
              <div className="h-6 bg-gray-200 dark:bg-slate-600/50 rounded animate-pulse" />
            ) : (
              <>
                <p className={cn(
                  'text-xl font-black leading-none',
                  pointsToday > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {pointsToday}
                </p>
                <p className="text-[8px] text-gray-400 mt-0.5">poin hari ini</p>
              </>
            )}
          </div>
        </div>

        {/* Alert jika ada yang perlu tindak lanjut */}
        {!isLoading && (activeIzinCount > 0 || pointsToday > 0) && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/80 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <Clock size={11} className="text-amber-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
              {activeIzinCount > 0
                ? `${activeIzinCount} siswa menunggu konfirmasi`
                : 'Ada catatan pelanggaran hari ini'}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-slate-700/50">
          <button
            onClick={onOpenPiket}
            className="w-full flex items-center justify-between group py-2 px-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Zap size={11} className="text-amber-500" />
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                Menu Piket & Izin
              </span>
            </div>
            <ChevronRight size={12} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
          </button>
          {onOpenMonitoring && (
            <button
              onClick={onOpenMonitoring}
              className="w-full flex items-center justify-between group py-2 px-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={11} className="text-amber-500" />
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  Monitoring Kesiswaan
                </span>
              </div>
              <ChevronRight size={12} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
