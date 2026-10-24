import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronRight } from 'lucide-react';

export interface HubListRowProps {
  id?: string;
  title: string;
  subtitle?: React.ReactNode;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  iconColorClass?: string;
  rightBadge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * HubListRow - Baris Menu Flat dengan Garis Rambut Ala Shopee ("Pulsa, Tagihan", "Aktivitas Saya")
 */
export const HubListRow: React.FC<HubListRowProps> = React.memo(({
  title,
  subtitle,
  icon: IconComponent,
  iconColorClass,
  rightBadge,
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/80 transition-colors text-left group select-none cursor-pointer',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {IconComponent && (
          <div
            className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
              iconColorClass || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <IconComponent size={17} className="stroke-[1.75]" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {rightBadge}
        <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
});

HubListRow.displayName = 'HubListRow';
