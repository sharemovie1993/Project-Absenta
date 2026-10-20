import React from 'react';
import { cn } from '@/lib/utils';
import { FileSpreadsheet } from 'lucide-react';

export interface PklSpreadsheetSkeletonProps {
  isMobile?: boolean;
}

export const PklSpreadsheetSkeleton: React.FC<PklSpreadsheetSkeletonProps> = ({ isMobile = false }) => {
  if (isMobile) {
    return (
      <div className="space-y-3 animate-pulse pb-12" aria-label="Memuat kartu siswa...">
        {/* Mobile Header Bar Skeleton */}
        <div className="flex items-center justify-between px-1 py-1">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>

        {/* 3 Mobile Card Skeletons */}
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-850 rounded" />
                </div>
                <div className="h-3 w-48 bg-slate-100 dark:bg-slate-850 rounded" />
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden animate-pulse"
      aria-label="Memuat spreadsheet nilai PKL..."
    >
      {/* Control Header Skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Spreadsheet Shimmer Table Rows */}
      <div className="p-4 space-y-3">
        {/* Table Header Row Skeleton */}
        <div className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="col-span-1 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="col-span-3 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="col-span-1 h-5 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="col-span-1 h-5 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="col-span-1 h-5 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="col-span-1 h-5 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="col-span-1 h-5 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="col-span-1 h-5 bg-slate-100 dark:bg-slate-850 rounded" />
          <div className="col-span-2 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>

        {/* 6 Dummy Shimmer Rows */}
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-slate-50 dark:border-slate-850">
            <div className="col-span-1 h-4 w-6 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="col-span-3 space-y-1">
              <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-850 rounded" />
            </div>
            <div className="col-span-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="col-span-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="col-span-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="col-span-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="col-span-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="col-span-1 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="col-span-2 h-7 bg-slate-100 dark:bg-slate-800 rounded-md" />
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
};
export default PklSpreadsheetSkeleton;
