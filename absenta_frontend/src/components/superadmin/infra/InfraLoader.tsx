import React from 'react';

// ─── PREMIUM SKELETON LOADER FOR DYNAMIC TABS ─────────────────────────────────

export const InfraPanelLoader: React.FC = () => {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-6 shadow-sm animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="space-y-2 flex-grow">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 animate-pulse" />
          <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded-md w-2/3 animate-pulse" />
        </div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-24 animate-pulse shrink-0" />
      </div>

      {/* Grid or rows skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 dark:border-slate-900 last:border-0">
            <div className="flex items-center gap-2 flex-grow">
              <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-grow">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/4 animate-pulse" />
                <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16 animate-pulse shrink-0" />
            <div className="h-6 bg-slate-100 dark:bg-slate-900 rounded-lg w-20 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
