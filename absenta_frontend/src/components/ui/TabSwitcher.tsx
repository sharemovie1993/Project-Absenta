import React from 'react';
import { cn } from '@/lib/utils';

export interface TabOption {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  colorClass?: string; // e.g., 'text-blue-600 dark:text-blue-400'
}

interface TabSwitcherProps {
  options?: TabOption[];
  tabs?: TabOption[];
  items?: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({
  options,
  tabs,
  items,
  activeTab,
  onChange,
  className,
}) => {
  const tabOptions = options || tabs || items || [];
  return (
    <div 
      className={cn("flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar flex-nowrap shrink-0", className)} 
      role="tablist"
    >
      {tabOptions.map((opt) => {
        const isActive = activeTab === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            id={`tab-btn-${opt.id}`}
            type="button"
            aria-selected={isActive}
            role="tab"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none whitespace-nowrap shrink-0",
              isActive
                ? cn("bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm", opt.colorClass)
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default TabSwitcher;
