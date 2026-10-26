import React from 'react';

/**
 * BpbkDashboardSkeleton
 * 
 * Shopee-Grade Mobile Hub Skeleton Loading View for Bimbingan Konseling (BPBK) Dashboard.
 * Eliminates layout shift (CLS = 0) and matches Bento Grid, Quick Action Slider,
 * and EWS Table shimmers.
 */
export const BpbkDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 w-full max-w-full min-w-0 animate-pulse" aria-busy="true" aria-label="Memuat dashboard konseling">
      {/* 1. SKELETON BENTO GRID (2x2 or 4x1 Hairline Metric Cells) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800/80">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3 px-3.5 flex flex-col justify-center min-h-[76px]">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="w-20 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
              </div>
              <div className="w-16 h-5 rounded bg-slate-200/80 dark:bg-slate-800/90 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. SKELETON QUICK ACTION SLIDER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl py-3 px-3 shadow-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
              <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="w-12 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2.5">
          <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* 3. SKELETON CONTENT CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 min-h-[260px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <div className="w-48 h-4 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-20 h-4 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40" />
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 min-h-[260px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <div className="w-36 h-4 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
