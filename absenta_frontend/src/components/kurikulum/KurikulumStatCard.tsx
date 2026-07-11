import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KurikulumStatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  subtext?: string;
  trend?: { value: number; label: string };
  color: 'teal' | 'blue' | 'purple' | 'amber' | 'emerald' | 'rose';
  isLoading?: boolean;
}

const colorConfig = {
  teal:    { grad: 'from-teal-500/15 to-transparent',    border: 'border-teal-100/60 dark:border-teal-900/30',    text: 'text-teal-700 dark:text-teal-400',    iconBg: 'bg-teal-50 dark:bg-teal-950/50' },
  blue:    { grad: 'from-blue-500/15 to-transparent',    border: 'border-blue-100/60 dark:border-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    iconBg: 'bg-blue-50 dark:bg-blue-950/50' },
  purple:  { grad: 'from-purple-500/15 to-transparent',  border: 'border-purple-100/60 dark:border-purple-900/30',  text: 'text-purple-700 dark:text-purple-400',  iconBg: 'bg-purple-50 dark:bg-purple-950/50' },
  amber:   { grad: 'from-amber-500/15 to-transparent',   border: 'border-amber-100/60 dark:border-amber-900/30',   text: 'text-amber-700 dark:text-amber-400',   iconBg: 'bg-amber-50 dark:bg-amber-950/50' },
  emerald: { grad: 'from-emerald-500/15 to-transparent', border: 'border-emerald-100/60 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  rose:    { grad: 'from-rose-500/15 to-transparent',    border: 'border-rose-100/60 dark:border-rose-900/30',    text: 'text-rose-700 dark:text-rose-400',    iconBg: 'bg-rose-50 dark:bg-rose-950/50' },
};

export const KurikulumStatCard: React.FC<KurikulumStatCardProps> = ({
  title, value, icon, subtext, trend, color, isLoading = false,
}) => {
  const cfg = colorConfig[color];

  if (isLoading) {
    return (
      <div className={cn('relative overflow-hidden rounded-2xl bg-gradient-to-br border p-5 animate-pulse', cfg.grad, cfg.border)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl bg-gradient-to-br border p-5',
      'flex items-center justify-between shadow-sm',
      'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group',
      cfg.grad, cfg.border
    )}>
      <div className="space-y-1 flex-1 min-w-0 pr-3">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {title}
        </h3>
        <p className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 truncate">
          {value}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {subtext && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{subtext}</span>
          )}
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full',
              trend.value > 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                : trend.value < 0
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            )}>
              {trend.value > 0 ? <TrendingUp size={8} /> : trend.value < 0 ? <TrendingDown size={8} /> : <Minus size={8} />}
              {trend.label}
            </span>
          )}
        </div>
      </div>
      <div className={cn(
        'flex-shrink-0 p-3.5 rounded-xl shadow-inner',
        'group-hover:scale-110 transition-transform duration-300',
        cfg.iconBg, cfg.text
      )}>
        {icon}
      </div>
    </div>
  );
};
