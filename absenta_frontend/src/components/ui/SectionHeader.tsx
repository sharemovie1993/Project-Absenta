import React from 'react';
import { motion } from 'framer-motion';
import { useNavStore, type HubType } from '../../store/navStore';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ 
  title, 
  subtitle, 
  description,
  icon, 
  children,
  className = '' 
}: SectionHeaderProps) {
  const { activeHub } = useNavStore();

  const getHubColor = (hub: HubType) => {
    switch (hub) {
      case 'AKADEMIK': return 'from-blue-500 to-indigo-600';
      case 'ABSENSI': return 'from-emerald-500 to-teal-600';
      case 'HUBIN': return 'from-purple-500 to-fuchsia-600';
      case 'SARPRAS': return 'from-indigo-500 to-blue-600';
      case 'KOPERASI': return 'from-amber-500 to-orange-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  const getHubTextColor = (hub: HubType) => {
    switch (hub) {
      case 'AKADEMIK': return 'text-blue-600 dark:text-blue-400';
      case 'ABSENSI': return 'text-emerald-600 dark:text-emerald-400';
      case 'HUBIN': return 'text-purple-600 dark:text-purple-400';
      case 'SARPRAS': return 'text-indigo-600 dark:text-indigo-400';
      case 'KOPERASI': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6", className)}
    >
      <div className="flex items-center gap-4 mb-4 sm:mb-0">
        {icon && (
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br text-white shadow-lg ring-2 ring-white dark:ring-slate-900",
            getHubColor(activeHub)
          )}>
            {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 22 })}
          </div>
        )}
        <div className="space-y-0.5">
          <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] opacity-80", getHubTextColor(activeHub))}>
            {activeHub} MODULE
          </p>
          <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-100 uppercase">
            {title}
          </h1>
          {(subtitle || description) && (
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 max-w-xl">
              {subtitle || description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </motion.div>
  );
}

export default SectionHeader;
