import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface DashboardHeroProps {
  title: string;
  subtitle: string;
  currentDate?: string;
  compact?: boolean;
  badge?: {
    label: string;
    icon?: LucideIcon;
    color?: 'primary' | 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  };
  stats?: Array<{
    label: string;
    value: string | number;
  }>;
  gradient?: string;
  children?: React.ReactNode;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  title,
  subtitle,
  currentDate,
  compact = false,
  badge,
  stats,
  gradient = 'from-primary to-primary/70',
  children
}) => {
  const badgeColors = {
    primary: 'bg-white/20 text-white',
    blue: 'bg-white/20 text-white',
    emerald: 'bg-emerald-400/20 text-emerald-100',
    amber: 'bg-amber-400/20 text-amber-100',
    rose: 'bg-rose-400/20 text-rose-100',
    indigo: 'bg-white/20 text-white',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl bg-gradient-to-br ${gradient} ${compact ? 'p-5 md:p-8' : 'p-6 md:p-10'} shadow-2xl overflow-hidden text-white dashboard-hero`}
    >
      {/* Abstract Background Shapes */}
      <div className={`absolute -right-20 -top-20 ${compact ? 'w-60 h-60' : 'w-80 h-80'} rounded-full bg-white opacity-10 blur-3xl animate-pulse`}></div>
      <div className={`absolute right-40 -bottom-20 ${compact ? 'w-48 h-48' : 'w-64 h-64'} rounded-full bg-white opacity-10 blur-2xl`}></div>
      <div className="absolute left-1/2 top-0 w-32 h-32 rounded-full bg-white opacity-5 blur-xl"></div>

      <div className={`relative z-10 flex flex-col lg:flex-row ${compact ? 'lg:items-end' : 'lg:items-center'} justify-between gap-6`}>
        <div className={`flex-1 ${compact ? 'space-y-3' : 'space-y-4'}`}>
          {badge && (
            <div className={`inline-flex items-center gap-2 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${badgeColors[badge.color || 'primary']}`}>
              {badge.icon && <badge.icon size={14} />}
              {badge.label}
            </div>
          )}
          
          <div>
            <h1 className={`${compact ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-3xl md:text-4xl lg:text-5xl'} font-extrabold tracking-tight mb-2`}>
              {title}
            </h1>
            <p className={`text-white/80 ${compact ? 'text-sm md:text-base lg:text-lg' : 'text-base md:text-lg lg:text-xl'} font-medium max-w-2xl opacity-90 leading-relaxed`}>
              {subtitle}
            </p>
          </div>

          {currentDate && (
            <div className={`text-[10px] md:text-xs font-semibold text-white/70 bg-black/10 w-fit px-3 py-1 rounded-lg backdrop-blur-sm`}>
              {currentDate}
            </div>
          )}
          
          {children}
        </div>

        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-3 md:gap-4 self-start lg:self-center w-full lg:w-auto">
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.05 }}
                className={`${compact ? 'p-3 md:p-4 min-w-[90px]' : 'p-4 md:p-5 min-w-[110px]'} bg-white/10 backdrop-blur-lg rounded-xl border border-white/10 text-center shadow-inner flex flex-col justify-center`}
              >
                <div className={`${compact ? 'text-xl md:text-2xl lg:text-3xl' : 'text-2xl md:text-3xl lg:text-4xl'} font-black`}>{stat.value}</div>
                <div className="text-[8px] md:text-[10px] text-white/70 mt-1 font-bold uppercase tracking-widest opacity-80">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
