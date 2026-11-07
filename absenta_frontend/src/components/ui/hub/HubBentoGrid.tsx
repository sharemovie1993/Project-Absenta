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
  cells?: HubBentoCell[];
  columns?: 2 | 3 | 4;
  className?: string;
  cellClassName?: string;
}

/**
 * HubBentoGrid - Grid Metrik Flat dengan Garis Rambut (Hairline Divider) Ala "Keuangan Shopee"
 * Menghadirkan proporsi padding vertikal & horizontal yang pas dan nyaman,
 * tanpa tumpukan teks berlebih (maksimal 2 baris terfokus).
 */
export const HubBentoGrid: React.FC<HubBentoGridProps> = React.memo(({
  cells = [],
  columns = 2,
  className,
  cellClassName,
}) => {
  const safeCells = Array.isArray(cells) ? cells : [];
  const colClass = columns === 4
    ? 'grid-cols-2 lg:grid-cols-4'
    : columns === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-2';

  return (
    <div
      className={cn(
        'grid w-full divide-x divide-y divide-slate-100 dark:divide-slate-800/80',
        colClass,
        className
      )}
    >
      {safeCells.map((cell) => {
        const IconComponent = cell.icon;
        const isClickable = Boolean(cell.onClick);

        return (
          <div
            key={cell.id}
            onClick={cell.onClick}
            className={cn(
              'py-2 px-2.5 sm:py-3 sm:px-3.5 flex items-center justify-between gap-1.5 sm:gap-2.5 transition-colors relative select-none min-w-0',
              cellClassName,
              isClickable && 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/80'
            )}
          >
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              {IconComponent && (
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
                    cell.iconColorClass || 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                  )}
                >
                  <IconComponent size={15} className="stroke-[1.9]" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[10.5px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate leading-none">
                    {cell.title}
                  </span>
                  {cell.badge}
                </div>

                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight mt-1 truncate">
                  {cell.value}
                </div>

                {cell.subtext && (
                  <p className="text-[9.5px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5 leading-none">
                    {cell.subtext}
                  </p>
                )}
              </div>
            </div>

            {cell.showChevron && (
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600 shrink-0 self-center hidden sm:block ml-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
});

HubBentoGrid.displayName = 'HubBentoGrid';
