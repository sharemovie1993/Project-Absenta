import React from 'react';
import { cn } from '../../lib/utils';

interface TimelineItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  content?: React.ReactNode;
  time?: string;
  icon?: React.ReactNode;
  status?: 'default' | 'success' | 'warning' | 'error' | 'info';
  isLast?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  title,
  subtitle,
  content,
  time,
  icon,
  status = 'default',
  isLast = false
}) => {
  const statusClasses = {
    default: 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800/80',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30',
    warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30',
    error: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30',
    info: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30'
  };

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100 dark:bg-slate-800" />
      )}
      
      <div className={cn(
        "absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm border",
        statusClasses[status]
      )}>
        {icon || <div className="w-1.5 h-1.5 rounded-full bg-current" />}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[11px] font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </div>
          {time && (
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              {time}
            </div>
          )}
        </div>
        
        {subtitle && (
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            {subtitle}
          </div>
        )}
        
        {content && (
          <div className="mt-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
            {content}
          </div>
        )}
      </div>
    </div>
  );
};

export const Timeline: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col", className)}>
      {children}
    </div>
  );
};
