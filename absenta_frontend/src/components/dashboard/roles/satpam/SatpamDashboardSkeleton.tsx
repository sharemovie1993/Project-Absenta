import React from 'react';

export const SatpamDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800" />

      {/* Bento Grid Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800/50" />
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800/50" />
      </div>
    </div>
  );
};
