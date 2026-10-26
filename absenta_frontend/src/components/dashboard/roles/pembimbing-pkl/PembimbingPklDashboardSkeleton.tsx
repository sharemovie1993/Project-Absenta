import React from 'react';

export const PembimbingPklDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Top Header Shimmer */}
      <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl" />

      {/* Bento Grid 2x2 Shimmer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Action Slider Shimmer */}
      <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />

      {/* 2-Column Content Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    </div>
  );
};
