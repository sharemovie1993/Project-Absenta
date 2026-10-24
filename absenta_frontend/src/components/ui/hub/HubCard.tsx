import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface HubCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

/**
 * HubCard - Kontainer Induk Ramping & Ringan Berstandar Shopee
 * Menggabungkan seksi menjadi 1 kartu putih bersih dengan hairline border,
 * menghilangkan sindrom "kotak-dalam-kotak" yang membuat tampilan gemuk.
 */
export const HubCard: React.FC<HubCardProps> = React.memo(({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  className,
  bodyClassName,
  headerClassName,
  noPadding = false,
}) => {
  return (
    <div
      className={cn(
        'w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden transition-all',
        className
      )}
    >
      {/* Header baris ala Shopee (Judul di kiri, Aksi "Lihat Semua >" di kanan) */}
      {(title || actionLabel) && (
        <div
          className={cn(
            'flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100/90 dark:border-slate-800/60',
            headerClassName
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {typeof title === 'string' ? (
              <h3 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <span className="text-[10px] text-slate-400 font-normal truncate hidden sm:inline">
                {subtitle}
              </span>
            )}
          </div>

          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
            >
              <span>{actionLabel}</span>
              <ChevronRight size={13} className="text-slate-300 dark:text-slate-600" />
            </button>
          )}
        </div>
      )}

      {/* Konten Badan */}
      <div className={cn(!noPadding && 'p-2.5 sm:p-3', bodyClassName)}>
        {children}
      </div>
    </div>
  );
});

HubCard.displayName = 'HubCard';
