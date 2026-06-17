import React from 'react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: any[];
}

interface ImportResultStatsProps {
  result: ImportResult;
  className?: string;
}

export const ImportResultStats: React.FC<ImportResultStatsProps> = ({ result, className = '' }) => {
  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      <AnalyticsCard
        title="Dibuat"
        value={result.created || 0}
        icon={<CheckCircle2 />}
        gradient="from-emerald-500 to-teal-600"
        compact
        variant="ghost"
        className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30"
      />
      <AnalyticsCard
        title="Update"
        value={result.updated || 0}
        icon={<RefreshCw />}
        gradient="from-blue-500 to-indigo-600"
        compact
        variant="ghost"
        className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30"
      />
      <AnalyticsCard
        title="Tetap"
        value={result.skipped || 0}
        icon={<CheckCircle2 className="opacity-50" />}
        gradient="from-slate-500 to-slate-600"
        compact
        variant="ghost"
        className="bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/30"
      />
      <AnalyticsCard
        title="Gagal"
        value={result.errors?.length || 0}
        icon={<AlertCircle />}
        gradient="from-rose-500 to-red-600"
        compact
        variant="ghost"
        className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30"
      />
    </div>
  );
};

export default ImportResultStats;
