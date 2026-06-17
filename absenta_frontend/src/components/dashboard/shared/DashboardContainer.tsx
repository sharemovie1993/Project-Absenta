import React from 'react';
import { motion } from 'framer-motion';

interface DashboardContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12 ${className}`}
    >
      {children}
    </motion.div>
  );
};

interface DashboardSectionProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rightElement?: React.ReactNode;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({ 
  title, 
  subtitle,
  icon, 
  children, 
  className = "",
  rightElement
}) => {
  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {icon && <div className="text-blue-600 dark:text-blue-400">{icon}</div>}
            <div>
              {title && <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h2>}
              {subtitle && <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {rightElement}
        </div>
      )}
      {children}
    </div>
  );
};
