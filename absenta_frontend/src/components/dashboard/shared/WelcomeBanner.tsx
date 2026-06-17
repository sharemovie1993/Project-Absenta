import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * WelcomeBanner — Header sapaan ala MyASN.
 * Biru muda gradient, ikon selamat datang, badge status.
 */
interface WelcomeBannerProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    color?: 'blue' | 'green' | 'amber' | 'rose' | 'indigo' | 'emerald';
  };
  icon?: LucideIcon;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  title,
  subtitle,
  badge,
  icon: Icon,
}) => {
  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 p-4 flex items-center gap-4">
      {/* Icon */}
      {Icon && (
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-white" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-gray-800 dark:text-white leading-tight truncate">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Badge */}
      {badge && (
        <span className={`flex-shrink-0 px-2.5 py-1 rounded text-[10px] font-bold ${badgeColors[badge.color || 'blue']}`}>
          {badge.label}
        </span>
      )}
    </div>
  );
};
