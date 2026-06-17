import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * QuickActionGrid — Grid tombol aksi cepat ala MyASN.
 * Tampilan: 3-4 kolom kotak dengan ikon, label, hover effect.
 */
export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: 'blue' | 'emerald' | 'amber' | 'orange' | 'indigo' | 'rose' | 'purple';
}

interface QuickActionGridProps {
  title?: string;
  actions: QuickAction[];
  columns?: 2 | 3 | 4 | 5 | 6 | number;
}

const colorMap: Record<string, { icon: string; bg: string }> = {
  blue:    { icon: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  amber:   { icon: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  orange:  { icon: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  indigo:  { icon: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  rose:    { icon: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
  purple:  { icon: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
};

export const QuickActionGrid: React.FC<QuickActionGridProps> = ({
  title = 'Aksi Cepat',
  actions,
  columns = 4,
}) => {
  const gridCols = columns === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm p-3">
      {title && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs">⚡</span>
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">{title}</h3>
        </div>
      )}
      <div className={`grid ${gridCols} gap-2`}>
        {actions.map((action, idx) => {
          const colors = colorMap[action.color || 'blue'];
          return (
            <button
              key={idx}
              onClick={action.onClick}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <action.icon size={18} className={colors.icon} />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
