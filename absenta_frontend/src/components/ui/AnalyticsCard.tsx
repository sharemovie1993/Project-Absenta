import React from 'react';
import { cn } from '@/lib/utils';

export interface AnalyticsCardProps {
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
  variant?: 'card' | 'ghost' | 'sub-cards' | 'premium' | 'compact-premium';
  mobileCompact?: boolean;
  subCards?: { 
    label: string; 
    value: string | number; 
    bgClass?: string; 
    textClass?: string; 
    borderClass?: string;
  }[];
}

export function AnalyticsCardBase({ 
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
  mobileCompact = false,
  subCards
}: AnalyticsCardProps) {
  const isCompact = compact || extraCompact || variant === 'compact-premium';
  const isPremiumVariant = variant === 'premium' || variant === 'compact-premium';

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
        "h-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl min-w-0", 
        onClick && "cursor-pointer group hover:-translate-y-1", 
        className
      )}
    >
      <div className={cn(
        "relative overflow-hidden transition-all duration-300 h-full flex flex-col justify-center min-w-0",
        isPremiumVariant 
          ? cn("text-white shadow-sm hover:shadow-lg border-none", bgGradient)
          : variant === 'card' 
            ? "bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800" 
            : "bg-transparent border border-gray-200 dark:border-gray-800",
        variant === 'compact-premium' ? "rounded-xl min-h-[52px] sm:min-h-[68px]" : isCompact ? "rounded-xl h-[68px]" : "rounded-xl min-h-[52px] sm:min-h-[96px]"
      )}>
        {/* Background Pattern */}
        {variant === 'card' && (
          <>
            <div className={cn("hidden sm:block absolute top-0 right-0 rounded-full opacity-10 blur-3xl bg-gradient-to-br", gradient, isCompact ? "w-20 h-20 -mr-10 -mt-10" : "w-32 h-32 -mr-16 -mt-16")} />
            <div className={cn("absolute bottom-0 left-0 rounded-r-full transition-all duration-500", gradient, isCompact ? "w-1 h-6" : "w-2 h-12")} />
          </>
        )}
        {isPremiumVariant && (
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        )}
        
        {isLoading ? (
          <div className={cn("relative z-10 animate-pulse min-w-0", isCompact ? "p-2.5 sm:p-3" : "p-2.5 sm:p-4 min-h-[52px] sm:min-h-[96px]")}>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className={cn("h-2 w-16 rounded opacity-50", isPremiumVariant ? "bg-white/40" : "bg-gray-200 dark:bg-gray-800")} />
                <div className={cn("h-5 w-24 rounded opacity-80", isPremiumVariant ? "bg-white/60" : "bg-gray-200 dark:bg-gray-800")} />
              </div>
            </div>
          </div>
        ) : (
          <div className={cn("relative z-10 min-w-0", variant === 'compact-premium' ? "p-2.5 sm:p-3" : isCompact ? "p-2.5 sm:p-3" : "p-2.5 sm:p-4")}>
            <div className="flex items-center sm:items-start justify-between gap-1.5 sm:gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "uppercase font-black tracking-widest truncate text-[8px] sm:text-[9px] mb-0 sm:mb-0.5", 
                  isPremiumVariant ? "text-white/80" : "text-slate-700 dark:text-slate-400"
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
                  <div className="flex items-baseline gap-1 sm:gap-1.5 max-w-full min-w-0">
                    <div 
                      title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
                      className={cn(
                        "font-black tracking-tight min-w-0 truncate text-sm sm:text-xl", 
                        isPremiumVariant ? "text-white" : "text-gray-900 dark:text-gray-100"
                      )}
                    >
                      {value}
                    </div>
                    {growth !== undefined && (
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0",
                        growth >= 0 
                          ? isPremiumVariant ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                          : isPremiumVariant ? "bg-black/20 text-white" : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      )}>
                        {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                      </span>
                    )}
                  </div>
                )}
                
                {subtitle && (
                  <p className={cn(
                    "text-[10px] font-medium items-center gap-1 mt-0.5 max-w-full overflow-hidden truncate hidden sm:flex",
                    isPremiumVariant ? "text-white/70" : "text-slate-600 dark:text-slate-400"
                  )}>
                    <span className={cn("w-1 h-1 rounded-full shrink-0", isPremiumVariant ? "bg-white/40" : "bg-slate-300")} />
                    <span className="truncate">{subtitle}</span>
                  </p>
                )}
              </div>
              {icon && (
                <div className={cn(
                  "rounded-lg sm:rounded-xl transition-transform duration-500 group-hover:scale-110 shrink-0 p-1.5 sm:p-3 [&_svg]:w-3.5 [&_svg]:h-3.5 sm:[&_svg]:w-5 sm:[&_svg]:h-5",
                  isPremiumVariant
                    ? "bg-white/20 text-white shadow-sm"
                    : cn("text-white shadow-md bg-gradient-to-br", gradient)
                )}>
                  {React.isValidElement(icon)
                    ? icon
                    : typeof icon === 'function' || (typeof icon === 'object' && (icon as any)?.$$typeof)
                    ? React.createElement(icon as any, { className: "w-3.5 h-3.5 sm:w-5 sm:h-5" })
                    : icon}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const AnalyticsCard = React.memo(AnalyticsCardBase);
export const MemoizedAnalyticsCard = AnalyticsCard;
