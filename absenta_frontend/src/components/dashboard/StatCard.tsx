import React from 'react';
import type { StatCardProps } from "../../types/dashboard";

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  loading,
  color = 'blue'
}) => {
  const colorSchemes = {
    blue: 'bg-primary/10 text-primary dark:bg-primary/20',
    indigo: 'bg-primary/10 text-primary dark:bg-primary/20',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl p-6 transition-all hover:shadow-md group">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <h4 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">
            {title}
          </h4>
          
          {loading ? (
            <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          ) : (
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
              {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
            </p>
          )}

          {(subtitle || trend) && (
            <div className="flex items-center space-x-2">
              {trend && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${trend.isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
              {subtitle && (
                <p className="text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className={`flex-shrink-0 p-3 rounded-xl transition-transform group-hover:scale-110 ${colorSchemes[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
