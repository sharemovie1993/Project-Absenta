import React from 'react';
import { SectionCard } from '../../ui';
import { Users } from 'lucide-react';

export const MemberSkeleton: React.FC = React.memo(() => {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[105px] rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 animate-pulse p-5 flex items-center justify-between"
          >
            <div className="space-y-3 flex-1">
              <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Demographics / Participation Chart Widescreen Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-48 animate-pulse flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
            Memuat data keanggotaan...
          </p>
        </div>
      </div>

      {/* Members Table Card Skeleton */}
      <SectionCard title="Data Anggota Koperasi" icon={Users} fullWidth noPadding>
        <div className="p-16 flex justify-center items-center">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </SectionCard>
    </div>
  );
});
