import React from 'react';
export { SectionCard } from '../../../ui/SectionCard';

export const DetailRow = React.memo(({ icon, label, value, className = "" }: { icon: React.ReactNode, label: string, value: string | number | undefined, className?: string }) => (
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

