import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: 'blue' | 'indigo' | 'emerald' | 'orange' | 'rose' | 'amber' | 'purple' | 'gray';
  accent?: 'left' | 'bottom';
  description?: string;
  compact?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  onClick,
  color = 'blue',
  accent = 'left',
  description,
  compact = false
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500',
      hover: 'hover:ring-blue-100 dark:hover:ring-blue-900/30'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500',
      hover: 'hover:ring-indigo-100 dark:hover:ring-indigo-900/30'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500',
      hover: 'hover:ring-emerald-100 dark:hover:ring-emerald-900/30'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500',
      hover: 'hover:ring-orange-100 dark:hover:ring-orange-900/30'
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500',
      hover: 'hover:ring-rose-100 dark:hover:ring-rose-900/30'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500',
      hover: 'hover:ring-amber-100 dark:hover:ring-amber-900/30'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500',
      hover: 'hover:ring-purple-100 dark:hover:ring-purple-900/30'
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-400',
      hover: 'hover:ring-gray-100 dark:hover:ring-gray-800'
    }
  };

  const activeColor = colorMap[color];
  const accentClass = accent === 'left' ? `border-l-4 ${activeColor.border}` : `border-b-4 ${activeColor.border}`;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden grow rounded-xl bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700
        shadow-sm transition-all duration-300 cursor-pointer group flex flex-col ${compact ? 'p-3 md:p-4' : 'p-4 md:p-5'}
        border outline outline-1 outline-transparent ${accentClass} ${activeColor.hover} hover:shadow-xl hover:outline-1
      `}
    >
      <div className={`p-2.5 md:p-3 w-fit rounded-xl ${compact ? 'mb-2' : 'mb-4'} ${activeColor.bg} ${activeColor.text} group-hover:rotate-12 transition-transform duration-300`}>
        <Icon size={compact ? 20 : 24} strokeWidth={2.5} />
      </div>
      
      <div>
        <h3 className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-xs md:text-sm' : 'text-sm md:text-base'} leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
          {title}
        </h3>
        <p className={`text-[9px] md:text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider`}>
          {subtitle}
        </p>
        {description && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>
      
      {/* Decorative background icon */}
      <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity ${activeColor.text}`}>
        <Icon size={compact ? 60 : 80} />
      </div>
    </motion.div>
  );
};
