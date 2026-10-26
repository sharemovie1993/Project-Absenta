import React from 'react';
import { cn } from '@/lib/utils';
import type { MetricBlockItem } from '../types';

const colorStyles: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-600 dark:text-cyan-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-600 dark:text-orange-400' },
};

export const UnifiedBlockMetrics: React.FC<{ items: MetricBlockItem[]; columns?: 2 | 3 | 4 }> = ({
  items,
  columns = 4,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
      <div
        className={cn(
          'grid grid-cols-2 gap-2.5 sm:gap-4',
          columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          const style = colorStyles[item.color] || colorStyles.blue;
          return (
            <div
              key={idx}
              onClick={item.onClick}
              className={cn(
                'flex items-center gap-2.5 sm:gap-3 p-2 rounded-xl transition-all select-none min-w-0',
                item.onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-98' : ''
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs',
                  style.bg,
                  style.text
                )}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                  {item.label}
                </span>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                  {item.value}
                </h4>
                {item.subtitle && (
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
