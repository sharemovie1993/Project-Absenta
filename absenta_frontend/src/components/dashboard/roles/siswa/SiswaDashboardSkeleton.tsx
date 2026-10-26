import React from 'react';

export const SiswaDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse pb-16">
      {/* Header Banner Shimmer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="flex gap-2">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Tab Strip Shimmer */}
        <div className="hidden md:flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Today Presence Banner Shimmer */}
      <div className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800" />

      {/* 4 Stat Cards Shimmer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>

      {/* Bento Grid 2 Columns Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
};
