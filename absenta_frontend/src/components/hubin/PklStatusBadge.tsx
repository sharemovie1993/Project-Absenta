import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PklStatusType = 'AKTIF' | 'SELESAI' | 'BATAL' | 'HADIR' | 'ALPHA' | 'ALPA' | 'IZIN' | 'SAKIT' | 'BELUM ABSEN';

interface PklStatusBadgeProps {
  status: string | PklStatusType;
  className?: string;
}

export const PklStatusBadge: React.FC<PklStatusBadgeProps> = React.memo(({ status, className }) => {
  const normalized = String(status || '').toUpperCase();

  switch (normalized) {
    // Placement statuses
    case 'AKTIF':
      return (
        <span className={cn("px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full flex items-center gap-1.5 w-fit border border-emerald-100 dark:border-emerald-900/30 shadow-sm", className)}>
          <CheckCircle2 size={13} className="shrink-0 animate-pulse" />
          <span>Aktif</span>
        </span>
      );
    case 'SELESAI':
      return (
        <span className={cn("px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 rounded-full flex items-center gap-1.5 w-fit border border-blue-100 dark:border-blue-900/30 shadow-sm", className)}>
          <Clock size={13} className="shrink-0" />
          <span>Selesai</span>
        </span>
      );
    case 'BATAL':
      return (
        <span className={cn("px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400 rounded-full flex items-center gap-1.5 w-fit border border-rose-100 dark:border-rose-900/30 shadow-sm", className)}>
          <XCircle size={13} className="shrink-0" />
          <span>Batal</span>
        </span>
      );

    // Attendance statuses
    case 'HADIR':
      return (
        <span className={cn("px-2 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-full flex items-center gap-1 w-fit border border-emerald-100/50 dark:border-emerald-900/20 shadow-sm", className)}>
          <CheckCircle2 size={11} className="shrink-0" />
          <span>HADIR</span>
        </span>
      );
    case 'ALPHA':
    case 'ALPA':
      return (
        <span className={cn("px-2 py-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-450 rounded-full flex items-center gap-1 w-fit border border-rose-100/50 dark:border-rose-900/20 shadow-sm", className)}>
          <XCircle size={11} className="shrink-0" />
          <span>ALPHA</span>
        </span>
      );
    case 'IZIN':
      return (
        <span className={cn("px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 rounded-full flex items-center gap-1 w-fit border border-amber-100/50 dark:border-amber-900/20 shadow-sm", className)}>
          <Clock size={11} className="shrink-0" />
          <span>IZIN</span>
        </span>
      );
    case 'SAKIT':
      return (
        <span className={cn("px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-full flex items-center gap-1 w-fit border border-indigo-100/50 dark:border-indigo-900/20 shadow-sm", className)}>
          <AlertCircle size={11} className="shrink-0" />
          <span>SAKIT</span>
        </span>
      );
    case 'BELUM ABSEN':
      return (
        <span className={cn("px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 dark:text-slate-400 rounded-full flex items-center gap-1 w-fit border border-slate-200 dark:border-slate-800 shadow-sm", className)}>
          <HelpCircle size={11} className="shrink-0" />
          <span>BELUM ABSEN</span>
        </span>
      );

    default:
      return (
        <span className={cn("px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-full w-fit", className)}>
          {status}
        </span>
      );
  }
});

export default PklStatusBadge;
