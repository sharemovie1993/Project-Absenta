import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../lib/utils';

export interface MonthlyTrendItem {
  nama_bulan: string;
  total_kasus: number;
  total_poin: number;
}

interface MonthlyTrendChartProps {
  monthlyTrend: MonthlyTrendItem[];
  maxCases: number;
  isLoadingAnalytics: boolean;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  monthlyTrend,
  maxCases,
  isLoadingAnalytics,
}) => {
  return (
    <Card className="p-6 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-800/50 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none">Tren Laporan Pelanggaran Bulanan</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Grafik analisis kedisiplinan tahunan</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Tahun: {new Date().getFullYear()}</span>
        </div>
      </div>

      {isLoadingAnalytics ? (
        <div className="flex justify-between items-end h-48 pt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]?.map(i => (
            <Skeleton key={i} className="w-[6%] h-full rounded-t-lg" />
          ))}
        </div>
      ) : monthlyTrend.length === 0 ? (
        <div className="py-20 text-center text-slate-400 text-xs italic">Data tren bulanan belum tersedia.</div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-end h-48 pt-6 border-b border-gray-100 dark:border-slate-800 px-2">
            {monthlyTrend?.map((m, idx) => {
              const heightPct = (m.total_kasus / maxCases) * 100;
              return (
                <div key={idx} className="w-[6%] flex flex-col items-center group relative h-full justify-end">
                  <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-20">
                    {m.total_kasus} Kasus ({m.total_poin} Poin)
                  </div>
                  <div 
                    style={{ height: `${Math.max(5, heightPct)}%` }} 
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-500 cursor-pointer",
                      m.total_kasus > 0 
                        ? "bg-gradient-to-t from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-md shadow-indigo-500/10" 
                        : "bg-slate-100 dark:bg-slate-800"
                    )}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">
            {monthlyTrend?.map((m, idx) => (
              <span key={idx} className="w-[6%] text-center truncate">
                {String(m.nama_bulan || '').substring(0, 3)}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
