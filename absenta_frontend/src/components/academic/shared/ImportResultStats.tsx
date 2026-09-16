import React from 'react';
import { CheckCircle2, RefreshCw, AlertCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportResult {
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  errors?: unknown[];
}

interface ImportResultStatsProps {
  result: ImportResult;
  className?: string;
}

export const ImportResultStats: React.FC<ImportResultStatsProps> = React.memo(({ result, className = '' }) => {
  const created = result.created ?? 0;
  const updated = result.updated ?? 0;
  const skipped = result.skipped ?? 0;
  const failed = result.failed ?? (result.errors?.length || 0);

  const stats = [
    {
      label: 'Dibuat',
      value: created,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      label: 'Update',
      value: updated,
      icon: <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50',
      text: 'text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
    {
      label: 'Tetap',
      value: skipped,
      icon: <MinusCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
      bg: 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      iconBg: 'bg-slate-200/70 dark:bg-slate-800',
    },
    {
      label: 'Gagal',
      value: failed,
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      bg: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50',
      text: 'text-rose-700 dark:text-rose-300',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3", className)}>
      {stats.map((item, idx) => (
        <div
          key={idx}
          className={cn(
            "p-3 rounded-xl border flex items-center justify-between gap-2 shadow-sm transition-all",
            item.bg
          )}
        >
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight block truncate">
              {item.label}
            </span>
            <span className={cn("text-base sm:text-lg font-black block leading-none mt-1", item.text)}>
              {item.value.toLocaleString('id-ID')}
            </span>
          </div>
          <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", item.iconBg)}>
            {item.icon}
          </div>
        </div>
      ))}
    </div>
  );
});

ImportResultStats.displayName = 'ImportResultStats';
export default ImportResultStats;

