import React from 'react';

export const EkskulDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Top Header Shimmer */}
      <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />

      {/* 2-Column Layout Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column Shimmer */}
        <div className="hidden lg:block space-y-3">
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-56 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>

        {/* Right Column Content Shimmer */}
        <div className="space-y-4">
          {/* Bento Grid 2x2 Shimmer */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>

          {/* Quick Action Slider Shimmer */}
          <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl" />

          {/* Feeds 2 Columns Shimmer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
