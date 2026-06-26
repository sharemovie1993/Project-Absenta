import React from 'react';

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined;
  className?: string;
}

export const DetailRow = React.memo<DetailRowProps>(({ icon, label, value, className = "" }) => (
  <div className={`flex items-center justify-between py-3 px-5 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 gap-4 group ${className}`}>
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <span className="font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-right font-black text-slate-900 dark:text-slate-100 text-[12px] truncate flex-1 uppercase tracking-tight">
      {value || '-'}
    </div>
  </div>
));

DetailRow.displayName = 'DetailRow';

interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: any;
  fullWidth?: boolean;
}

export const SectionCard = React.memo<SectionCardProps>(({ children, title, icon: Icon, fullWidth = false }) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 overflow-visible shadow-sm transition-all hover:shadow-md group">
    {title && (
      <div className="bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
        {Icon && (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:rotate-12 transition-transform duration-500">
             <Icon size={16} />
          </div>
        )}
        <h3 className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{title}</h3>
      </div>
    )}
    <div className={`p-6 ${fullWidth ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}`}>
      {children}
    </div>
  </div>
));

SectionCard.displayName = 'SectionCard';
