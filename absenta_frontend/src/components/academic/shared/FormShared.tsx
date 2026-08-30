import React from 'react';
import { cn } from '@/lib/utils';

export interface DetailRowProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
  colSpan?: 1 | 2;
}

export const DetailRow = React.memo<DetailRowProps>(({ 
  icon, 
  label, 
  value, 
  className = "",
  valueClassName = "",
  colSpan = 1
}) => (
  <div className={cn(
    "space-y-0.5 min-w-0 p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 transition-all group",
    colSpan === 2 && "sm:col-span-2",
    className
  )}>
    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
      {icon && (
        <span className="shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5">
          {icon}
        </span>
      )}
      <span className="text-[10px] font-bold uppercase tracking-wider truncate block">
        {label}
      </span>
    </div>
    <div className={cn(
      "font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] leading-snug break-words pl-0.5 pt-0.5",
      valueClassName
    )}>
      {value !== undefined && value !== null && value !== '' ? value : '-'}
    </div>
  </div>
));
DetailRow.displayName = 'DetailRow';

export interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: any;
  badge?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}

export const SectionCard = React.memo<SectionCardProps>(({ 
  children, 
  title, 
  subtitle,
  icon: Icon, 
  badge,
  fullWidth = false,
  className = "",
  bodyClassName = "",
  headerClassName = ""
}) => (
  <div className={cn(
    "p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4",
    className
  )}>
    {title && (
      <div className={cn(
        "flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5",
        headerClassName
      )}>
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className="text-emerald-600 dark:text-emerald-400 shrink-0">
              {typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null) ? <Icon size={16} /> : Icon}
            </div>
          )}
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
              {title}
            </h3>
            {subtitle && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium normal-case truncate">
                ({subtitle})
              </span>
            )}
          </div>
        </div>
        {badge && (
          <div className="shrink-0">
            {badge}
          </div>
        )}
      </div>
    )}
    <div className={cn(
      fullWidth ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5",
      bodyClassName
    )}>
      {children}
    </div>
  </div>
));
SectionCard.displayName = 'SectionCard';

export interface InfoTileProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  className?: string;
}

export const InfoTile = React.memo<InfoTileProps>(({
  icon,
  label,
  value,
  subValue,
  className = ""
}) => (
  <div className={cn(
    "p-2.5 sm:p-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-0.5",
    className
  )}>
    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
      {icon && <span className="text-emerald-500 shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
      <span className="text-[10px] font-bold uppercase tracking-wider truncate block">{label}</span>
    </div>
    <div className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 break-words pl-0.5">
      {value || '-'}
    </div>
    {subValue && (
      <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium truncate block pl-0.5">
        {subValue}
      </span>
    )}
  </div>
));
InfoTile.displayName = 'InfoTile';

export default {
  DetailRow,
  SectionCard,
  InfoTile
};
