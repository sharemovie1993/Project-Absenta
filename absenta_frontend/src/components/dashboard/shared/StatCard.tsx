import React from 'react';
import { motion } from 'framer-motion';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  color?: 'blue' | 'indigo' | 'emerald' | 'orange' | 'purple' | 'rose' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  loading,
  color = 'blue'
}) => {
  const colorSchemes = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl md:rounded-xl p-5 md:p-6 transition-all hover:shadow-xl group relative overflow-hidden"
    >
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1.5 flex-1">
          <h4 className="text-gray-400 dark:text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">
            {title}
          </h4>
          
          {loading ? (
            <div className="h-8 md:h-10 w-24 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg" />
          ) : (
            <p className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
            </p>
          )}

          {(subtitle || trend) && (
            <div className="flex items-center space-x-2 pt-1">
              {trend && !loading && (
                <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40'}`}>
                  {trend.isPositive ? '↑' : '↓'} {trend.value}%
                </span>
              )}
              {subtitle && (
                <p className="text-xs md:text-sm font-medium text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={`flex-shrink-0 p-3 md:p-4 rounded-xl transition-transform group-hover:scale-110 group-hover:rotate-6 ${colorSchemes[color]}`}>
            {React.cloneElement(icon as any, { size: 24, strokeWidth: 2.5 })}
          </div>
        )}
      </div>
      
      {/* Subtle bottom accent line */}
      <div className={`absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300 ${colorSchemes[color].split(' ')[1]}`}></div>
    </motion.div>
  );
};
