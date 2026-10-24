import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronRight } from 'lucide-react';

export interface HubBentoCell {
  id: string;
  title: string;
  value: React.ReactNode;
  subtext?: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  iconColorClass?: string;
  badge?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
}

export interface HubBentoGridProps {
  cells: HubBentoCell[];
  columns?: 2 | 3;
  className?: string;
}

/**
 * HubBentoGrid - Grid Metrik Flat dengan Garis Rambut (Hairline Divider) Ala "Keuangan Shopee"
 * Menggantikan kartu-kartu bento tebal mengambang dengan struktur modular 1 kartu bergaris tipis,
 * menghemat 40% ruang vertikal dan membuat UI terasa sangat ringan.
 */
export const HubBentoGrid: React.FC<HubBentoGridProps> = React.memo(({
  cells,
  columns = 2,
  className,
}) => {
  const colClass = columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2';

  return (
    <div
      className={cn(
        'grid w-full divide-x divide-y divide-slate-100 dark:divide-slate-800/80 -m-2.5 sm:-m-3 border-t border-slate-100 dark:border-slate-800/60',
        colClass,
        className
      )}
    >
      {cells.map((cell) => {
        const IconComponent = cell.icon;
        const isClickable = Boolean(cell.onClick);

        return (
          <div
            key={cell.id}
            onClick={cell.onClick}
            className={cn(
              'p-2.5 sm:p-3 flex items-start justify-between gap-2 transition-colors relative select-none',
              isClickable && 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/80'
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {IconComponent && (
                <div
                  className={cn(
                    'w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                    cell.iconColorClass || 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                  )}
                >
                  <IconComponent size={16} className="stroke-[1.75]" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {cell.title}
                  </span>
                  {cell.badge}
                </div>

                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                  {cell.value}
                </div>

                {cell.subtext && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
                    {cell.subtext}
                  </p>
                )}
              </div>
            </div>

            {cell.showChevron && (
              <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0 self-center" />
            )}
          </div>
        );
      })}
    </div>
  );
});

HubBentoGrid.displayName = 'HubBentoGrid';
