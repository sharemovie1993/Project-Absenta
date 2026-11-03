import React from 'react';

/**
 * AdminDashboardSkeleton
 * 
 * Shopee-Grade Mobile Hub Skeleton Loading View for Administrator Dashboard.
 * Eliminates layout shift (CLS = 0) and matches Bento Grid, Quick Action Slider,
 * and Administrative metric shimmers.
 */
export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full max-w-full min-w-0 animate-pulse" aria-busy="true" aria-label="Memuat dashboard administrator">
      {/* 1. SKELETON HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="w-44 h-4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-64 h-3 rounded bg-slate-100 dark:bg-slate-800/60 hidden sm:block" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      {/* 2. SKELETON 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Sidebar Skeleton (Desktop) */}
        <aside className="hidden lg:block space-y-3">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="w-16 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-between">
              <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          <div className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
            ))}
          </div>
        </aside>

        {/* Content Skeleton */}
        <main className="min-w-0 space-y-4">
          {/* Launcher Skeleton */}
          <div className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/50" />

          {/* Bento Grid Skeleton */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800/80">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3 px-3.5 flex flex-col justify-center min-h-[76px]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                  </div>
                  <div className="w-28 h-5 rounded bg-slate-200/80 dark:bg-slate-800/90 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Slider Skeleton */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-3 shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  <div className="w-12 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Chart Skeleton */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs min-h-[260px] flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 animate-spin" />
          </div>
        </main>
      </div>
    </div>
  );
};
