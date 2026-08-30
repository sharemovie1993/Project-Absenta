import React from 'react';
import { cn } from '../../lib/utils';

interface SectionCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: any;
  isActive?: boolean;
  fullWidth?: boolean;
  className?: string;
  noPadding?: boolean;
  actions?: React.ReactNode;
}

export const SectionCard = React.memo(({ 
  children, 
  title, 
  icon: Icon, 
  isActive = false,
  fullWidth = false,
  className = '',
  noPadding = false,
  actions
}: SectionCardProps) => (
  <div className={cn(
    "bg-white dark:bg-slate-950 rounded-xl border transition-all duration-300",
    isActive ? "border-blue-500 shadow-lg ring-1 ring-blue-500/20" : "border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md",
    className
  )}>
    {title && (
      <div className="bg-slate-50/30 dark:bg-slate-800/30 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              isActive ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            )}>
              {React.isValidElement(Icon)
                ? Icon
                : typeof Icon === 'function' || (typeof Icon === 'object' && (Icon as any)?.$$typeof)
                ? React.createElement(Icon as any, { size: 14, 'aria-hidden': 'true' })
                : null}
            </div>
          )}
          <h3 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">{title}</h3>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    )}
    <div className={cn(
      "relative flex-1 flex flex-col",
      noPadding ? "" : "p-4",
      fullWidth ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"
    )}>
      {children}
    </div>
  </div>
));

export default SectionCard;
