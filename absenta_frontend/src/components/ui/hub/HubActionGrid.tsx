import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { HubActionSlider } from './HubActionSlider';

export interface HubActionItem {
  id: string;
  label: string;
  value?: React.ReactNode;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  iconColorClass?: string;
  badge?: number | string | null;
  onClick?: () => void;
  disabled?: boolean;
}

export interface HubActionGridProps {
  items: HubActionItem[];
  columns?: 4 | 5;
  variant?: 'grid' | 'slider';
  className?: string;
}

/**
 * HubActionGrid - Grid Aksi Borderless Horizontal Ala Shopee ("Pesanan Saya" & "Menu Utama")
 * Item berdiri bebas tanpa kotak pembungkus individu, dengan ikon garis tipis dan tipografi Capitalize rapi.
 * Mendukung mode 'slider' untuk tampilan 1-baris scrollable dengan peeking affordance & dynamic scroll indicator.
 */
export const HubActionGrid: React.FC<HubActionGridProps> = React.memo(({
  items = [],
  columns = 4,
  variant = 'grid',
  className,
}) => {
  const safeItems = Array.isArray(items) ? items : [];

  if (variant === 'slider') {
    return <HubActionSlider items={safeItems} className={className} />;
  }

  const colClass = columns === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div className={cn('grid w-full gap-1 sm:gap-2', colClass, className)}>
      {safeItems.map((item) => {
        const IconComponent = item.icon;
        const isInteractive = Boolean(item.onClick);

        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled || !isInteractive}
            onClick={item.onClick}
            className={cn(
              'flex flex-col items-center justify-center text-center p-1.5 sm:p-2 rounded-xl transition-all relative group select-none min-h-[64px]',
              isInteractive
                ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 active:scale-95'
                : 'cursor-default'
            )}
          >
            {/* Red Counter Badge ala Shopee */}
            {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
              <span className="absolute top-1 right-2 sm:right-3 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white shadow-xs flex items-center justify-center leading-none z-10 animate-in zoom-in-75">
                {item.badge}
              </span>
            )}

            {/* Ikon Garis Halus Bersih (Line Art tanpa rounded box warna tebal) */}
            <div
              className={cn(
                'w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mb-1 transition-transform group-hover:scale-110 shrink-0',
                item.iconColorClass || 'text-slate-700 dark:text-slate-200'
              )}
            >
              <IconComponent size={22} className="stroke-[1.65]" />
            </div>

            {/* Label Utama (Capitalize Ramping) */}
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight block truncate max-w-full">
              {item.label}
            </span>

            {/* Nilai / Sub-label Bawah */}
            {item.value && (
              <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate mt-0.5 max-w-full">
                {item.value}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
});

HubActionGrid.displayName = 'HubActionGrid';
