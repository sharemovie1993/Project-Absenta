import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * CompactSectionCard — Kartu info kompak ala MyASN.
 * Digunakan untuk "Informasi Jabatan", "Pendidikan Terakhir", dll.
 * P-3, rounded-lg, shadow-sm. Sangat tipis.
 */
interface CompactSectionCardProps {
  title: string;
  icon?: any;
  iconColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'orange';
  children: React.ReactNode;
  className?: string;
}

const iconColorMap: Record<string, string> = {
  blue:    'text-blue-500',
  emerald: 'text-emerald-500',
  amber:   'text-amber-500',
  rose:    'text-rose-500',
  indigo:  'text-indigo-500',
  purple:  'text-purple-500',
  orange:  'text-orange-500',
};

export const CompactSectionCard: React.FC<CompactSectionCardProps> = ({
  title,
  icon: Icon,
  iconColor = 'blue',
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm p-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-gray-50 dark:border-slate-700">
        {Icon && <Icon size={15} className={iconColorMap[iconColor]} />}
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">{title}</h4>
      </div>
      {/* Content */}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

/**
 * InfoRow — Baris label-value di dalam CompactSectionCard.
 */
interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  bold?: boolean;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, bold = false }) => {
  return (
    <div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{label}</p>
      <p className={`text-xs ${bold ? 'font-bold' : 'font-semibold'} text-gray-800 dark:text-gray-200 leading-tight`}>
        {value}
      </p>
    </div>
  );
};
