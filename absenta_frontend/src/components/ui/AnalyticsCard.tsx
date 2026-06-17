import React from 'react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  isLoading?: boolean;
  gradient?: string;
  growth?: number;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  extraCompact?: boolean;
  variant?: 'card' | 'ghost';
}

export function AnalyticsCard({ 
  title, 
  value, 
  icon, 
  isLoading, 
  gradient = 'from-blue-500 to-indigo-600',
  growth,
  subtitle,
  onClick,
  className,
  compact = false,
  extraCompact = false,
  variant = 'card'
}: AnalyticsCardProps) {
  const isCompact = compact || extraCompact;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        "h-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl", 
        onClick && "cursor-pointer group hover:-translate-y-1", 
        className
      )}
    >
      <div className={cn(
        "relative overflow-hidden transition-all duration-300 h-full flex flex-col justify-center",
        variant === 'card' ? "bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800" : "bg-transparent border border-gray-200 dark:border-gray-800",
        isCompact ? "rounded-xl h-[68px]" : "rounded-xl"
      )}>
        {/* Background Pattern */}
        {/* Decorative Hub Accent */}
        {variant === 'card' && (
          <>
            <div className={cn("hidden sm:block absolute top-0 right-0 rounded-full opacity-10 blur-3xl bg-gradient-to-br", gradient, isCompact ? "w-20 h-20 -mr-10 -mt-10" : "w-32 h-32 -mr-16 -mt-16")} />
            <div className={cn("absolute bottom-0 left-0 rounded-r-full transition-all duration-500", gradient, isCompact ? "w-1 h-6" : "w-2 h-12")} />
          </>
        )}
        
        {isLoading ? (
          <div className={cn("relative z-10 animate-pulse", isCompact ? "p-3" : "p-4 min-h-[96px]")}>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-2 w-16 bg-gray-200 dark:bg-gray-800 rounded opacity-50" />
                <div className="h-6 w-28 bg-gray-200 dark:bg-gray-800 rounded opacity-80" />
                {!isCompact && <div className="h-2 w-20 bg-gray-200 dark:bg-gray-800 rounded opacity-30 mt-1" />}
              </div>
              <div className={cn("rounded-xl bg-gray-200 dark:bg-gray-800 opacity-20", isCompact ? "w-8 h-8" : "w-10 h-10")} />
            </div>
          </div>
        ) : (
          <div className={cn("relative z-10", isCompact ? "p-3" : "p-4")}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={cn("uppercase font-black tracking-widest text-slate-700 dark:text-slate-400 mb-0.5", isCompact ? "text-[8px]" : "text-[9px]")}>{title}</p>
                <div className="flex items-baseline gap-2 max-w-full">
                  <div 
                    title={String(value)}
                    className={cn(
                      "font-black tracking-tight text-gray-900 dark:text-gray-100 truncate", 
                      isCompact 
                        ? (typeof value === 'string' && value.length > 10 ? "text-[13px]" : "text-lg") 
                        : "text-xl"
                    )}
                  >
                    {value}
                  </div>
                  {growth !== undefined && (
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                      growth >= 0 
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                        : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                    )}>
                      {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                    </span>
                  )}
                </div>
                
                {/* Clickable Indicator */}
                {onClick && (
                  <div className="absolute bottom-1.5 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Kelola</span>
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <svg className="w-2 h-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
                {subtitle && (
                  <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    {subtitle}
                  </p>
                )}
              </div>
              {icon && (
                <div className={cn(
                  "rounded-xl text-white shadow-md transition-transform duration-500 group-hover:scale-110 bg-gradient-to-br",
                  gradient,
                  isCompact ? "p-1.5" : "p-2.5"
                )}>
                  {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: isCompact ? 14 : 16 })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const MemoizedAnalyticsCard = React.memo(AnalyticsCard);
