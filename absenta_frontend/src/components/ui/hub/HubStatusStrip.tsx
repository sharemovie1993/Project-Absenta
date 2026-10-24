import React from 'react';
import { cn } from '@/lib/utils';

export interface HubStatusItem {
  id: string;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface HubStatusStripProps {
  items: HubStatusItem[];
  className?: string;
}

/**
 * HubStatusStrip - Bilah Status Harian Kompak dengan Hairline Divider Ala Shopee Pay / Balance Strip
 */
export const HubStatusStrip: React.FC<HubStatusStripProps> = React.memo(({
  items,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-stretch divide-x divide-slate-100 dark:divide-slate-800/80 overflow-hidden h-11 sm:h-12',
        className
      )}
    >
      {items.map((item) => {
        const isClickable = Boolean(item.onClick);

        return (
          <div
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'flex-1 flex items-center justify-center px-2.5 sm:px-3 gap-1.5 min-w-0 transition-colors select-none text-center',
              isClickable && 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800',
              item.className
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <div className="flex flex-col items-center justify-center min-w-0 truncate">
              {item.title && (
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-none">
                  {item.title}
                </span>
              )}
              {item.subtitle && (
                <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                  {item.subtitle}
                </span>
              )}
            </div>
            {item.badge}
          </div>
        );
      })}
    </div>
  );
});

HubStatusStrip.displayName = 'HubStatusStrip';
