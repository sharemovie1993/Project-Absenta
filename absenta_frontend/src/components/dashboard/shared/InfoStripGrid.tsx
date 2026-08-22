import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * InfoStripGrid — Baris info ringkas horizontal ala MyASN.
 * Empat kolom kecil: Ikon + Label + Value.
 * Mirip baris "Status Verifikasi", "Pangkat/Golongan", dll di MyASN.
 */
export interface InfoStripItem {
  label: string;
  value: string;
  icon?: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'orange' | 'teal' | 'cyan' | 'slate' | 'green' | 'red';
}

interface InfoStripGridProps {
  items: InfoStripItem[];
  variant?: 'default' | 'flat';
}

const colorMap: Record<string, { icon: string; bg: string }> = {
  blue:    { icon: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  green:   { icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  amber:   { icon: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  rose:    { icon: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
  red:     { icon: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
  indigo:  { icon: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  purple:  { icon: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
  orange:  { icon: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  teal:    { icon: 'text-teal-500',    bg: 'bg-teal-50 dark:bg-teal-900/20' },
  cyan:    { icon: 'text-cyan-500',    bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  slate:   { icon: 'text-slate-500',   bg: 'bg-slate-50 dark:bg-slate-900/20' },
};

export const InfoStripGrid: React.FC<InfoStripGridProps> = ({ items, variant = 'default' }) => {
  return (
    <div className={variant === 'default' 
      ? "bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm p-3"
      : "p-0"
    }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item, idx) => {
          const colors = colorMap[item.color || 'blue'] || colorMap.blue;
          return (
            <div key={idx} className="flex items-center gap-2.5 p-2 rounded-md">
              {item.icon && (
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon size={16} className={colors.icon} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-tight truncate">{item.label}</p>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight truncate">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
