import React from 'react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';

interface AnalyticsCardProps {
  title: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
  gradient?: string;
  growth?: number;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
  extraCompact?: boolean;
  variant?: 'card' | 'ghost' | 'sub-cards' | 'premium';
  subCards?: { 
    label: string; 
    value: string | number; 
    bgClass?: string; 
    textClass?: string; 
    borderClass?: string;
  }[];
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
  variant = 'premium',
  subCards
}: AnalyticsCardProps) {
  const isCompact = compact || extraCompact;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const bgGradient = gradient.includes('bg-') ? gradient : cn("bg-gradient-to-br", gradient);

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
        variant === 'premium' 
          ? cn("text-white shadow-sm hover:shadow-lg border-none", bgGradient)
          : variant === 'card' 
            ? "bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800" 
            : "bg-transparent border border-gray-200 dark:border-gray-800",
        isCompact ? "rounded-xl h-[68px]" : "rounded-xl min-h-[96px]"
      )}>
        {/* Background Pattern */}
        {/* Decorative Hub Accent */}
        {variant === 'card' && (
          <>
            <div className={cn("hidden sm:block absolute top-0 right-0 rounded-full opacity-10 blur-3xl bg-gradient-to-br", gradient, isCompact ? "w-20 h-20 -mr-10 -mt-10" : "w-32 h-32 -mr-16 -mt-16")} />
            <div className={cn("absolute bottom-0 left-0 rounded-r-full transition-all duration-500", gradient, isCompact ? "w-1 h-6" : "w-2 h-12")} />
          </>
        )}
        {variant === 'premium' && (
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        )}
        
        {isLoading ? (
          <div className={cn("relative z-10 animate-pulse", isCompact ? "p-3" : "p-4 min-h-[96px]")}>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className={cn("h-2 w-16 rounded opacity-50", variant === 'premium' ? "bg-white/40" : "bg-gray-200 dark:bg-gray-800")} />
                <div className={cn("h-6 w-28 rounded opacity-80", variant === 'premium' ? "bg-white/60" : "bg-gray-200 dark:bg-gray-800")} />
                {!isCompact && <div className={cn("h-2 w-20 rounded opacity-30 mt-1", variant === 'premium' ? "bg-white/30" : "bg-gray-200 dark:bg-gray-800")} />}
              </div>
              <div className={cn("rounded-xl opacity-20", isCompact ? "w-8 h-8" : "w-10 h-10", variant === 'premium' ? "bg-white" : "bg-gray-200 dark:bg-gray-800")} />
            </div>
          </div>
        ) : (
          <div className={cn("relative z-10", isCompact ? "p-3" : "p-4")}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={cn(
                  "uppercase font-black tracking-widest mb-0.5", 
                  isCompact ? "text-[8px]" : "text-[9px]",
                  variant === 'premium' ? "text-white/80" : "text-slate-700 dark:text-slate-400"
                )}>
                  {title}
                </p>
                 {variant === 'sub-cards' && subCards && subCards.length > 0 ? (
                  <div className="flex gap-1 mt-2 w-full flex-nowrap justify-between">
                    {subCards.map((card, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "rounded-xl px-1 py-1.5 flex flex-col items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex-1 min-w-0 border transition-all duration-250 hover:-translate-y-0.5",
                          card.bgClass || "bg-slate-50/50 dark:bg-slate-800/40",
                          card.borderClass || "border-slate-150 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                        )}
                      >
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider mb-1",
                          card.textClass || "text-slate-400 dark:text-slate-500"
                        )}>
                          {card.label}
                        </span>
                        <span className={cn(
                          "text-sm font-extrabold leading-none",
                          card.textClass || "text-slate-850 dark:text-slate-100"
                        )}>
                          {card.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2 max-w-full">
                    <div 
                      title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
                      className={cn(
                        "font-black tracking-tight", 
                        (typeof value === 'string' || typeof value === 'number') && "truncate",
                        isCompact 
                          ? (typeof value === 'string' && value.length > 10 ? "text-[13px]" : "text-lg") 
                          : "text-xl",
                        variant === 'premium' ? "text-white" : "text-gray-900 dark:text-gray-100"
                      )}
                    >
                      {value}
                    </div>
                    {growth !== undefined && (
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                        growth >= 0 
                          ? variant === 'premium' ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                          : variant === 'premium' ? "bg-black/20 text-white" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      )}>
                        {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                      </span>
                    )}
                  </div>
                )}
                
                {/* Clickable Indicator */}
                {onClick && (
                  <div className="absolute bottom-1.5 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      variant === 'premium' ? "text-white" : "text-blue-600 dark:text-blue-400"
                    )}>
                      Kelola
                    </span>
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full flex items-center justify-center",
                      variant === 'premium' ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/20"
                    )}>
                      <svg className={cn("w-2 h-2", variant === 'premium' ? "text-white" : "text-blue-600 dark:text-blue-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
                {subtitle && (
                  <p className={cn(
                    "text-[10px] font-medium flex items-center gap-1 mt-0.5 max-w-full overflow-hidden",
                    variant === 'premium' ? "text-white/70" : "text-slate-600 dark:text-slate-400"
                  )}>
                    <span className={cn("w-1 h-1 rounded-full shrink-0", variant === 'premium' ? "bg-white/40" : "bg-slate-300")} />
                    <span className="truncate">{subtitle}</span>
                  </p>
                )}
              </div>
              {icon && (
                <div className={cn(
                  "rounded-xl transition-transform duration-500 group-hover:scale-110",
                  variant === 'premium'
                    ? "bg-white/20 text-white shadow-sm"
                    : cn("text-white shadow-md bg-gradient-to-br", gradient),
                  isCompact ? "p-1.5" : "p-3"
                )}>
                  {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: isCompact ? 14 : 20 })}
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
