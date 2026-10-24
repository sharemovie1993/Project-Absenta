import React from 'react';

/**
 * WalasDashboardSkeleton
 * 
 * Shopee-Grade Mobile Hub Skeleton Loading View for Wali Kelas Dashboard.
 * Eliminates layout shift (CLS = 0) and replaces giant spinners with a sleek,
 * native shimmer structure matching Bento Grid, Quick Actions Slider, and Feed.
 */
export const WalasDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full max-w-full min-w-0 animate-pulse" aria-busy="true" aria-label="Memuat data rombel">
      {/* 1. SKELETON BENTO GRID (2x2 Flat Hairline Cells) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3 px-3.5 flex flex-col justify-center min-h-[72px]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="w-16 h-3 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="w-24 h-4.5 rounded bg-slate-200/80 dark:bg-slate-800/90 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. SKELETON QUICK ACTION SLIDER (Headerless 1-Row Horizontal Slider) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-2.5 sm:py-3 px-2 sm:px-3 shadow-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[64px]">
              <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-11 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
        {/* Dynamic Capsule Indicator Skeleton */}
        <div className="flex justify-center mt-2.5">
          <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 3. SKELETON RECENT FEED / STATUS CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
          <div className="w-32 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="w-14 h-3 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="space-y-3 pt-0.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="w-3/5 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-2/5 h-2.5 rounded bg-slate-100 dark:bg-slate-800/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
