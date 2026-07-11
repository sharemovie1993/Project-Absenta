import React from 'react';
import { AlertTriangle, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuruBeban {
  nama_guru: string;
  total_jp: number;
}

interface KurikulumAlertBannerProps {
  data: GuruBeban[];
  isLoading?: boolean;
  standarMin?: number;
  standarMax?: number;
}

export const KurikulumAlertBanner: React.FC<KurikulumAlertBannerProps> = ({
  data,
  isLoading = false,
  standarMin = 12,
  standarMax = 24,
}) => {
  const overloaded  = data.filter(d => d.total_jp > standarMax);
  const underloaded = data.filter(d => d.total_jp < standarMin);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        {[0, 1].map(i => (
          <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (overloaded.length === 0 && underloaded.length === 0) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
          <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">Beban Mengajar Normal</p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500">Semua guru memiliki beban jam mengajar dalam rentang standar ({standarMin}–{standarMax} JP/minggu)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Overload */}
      {overloaded.length > 0 && (
        <div className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/70 dark:bg-rose-900/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <TrendingUp size={13} className="text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Overload Jam ({overloaded.length} guru) &gt;{standarMax} JP
            </p>
          </div>
          <div className="space-y-1.5">
            {overloaded.slice(0, 4).map((g, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[10px] text-rose-700 dark:text-rose-300 truncate max-w-[65%]">
                  {g.nama_guru.split(',')[0]}
                </span>
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full flex-shrink-0">
                  {g.total_jp} JP
                </span>
              </div>
            ))}
            {overloaded.length > 4 && (
              <p className="text-[9px] text-rose-500 font-bold">+{overloaded.length - 4} lainnya</p>
            )}
          </div>
        </div>
      )}

      {/* Underload */}
      {underloaded.length > 0 && (
        <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/70 dark:bg-amber-900/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TrendingDown size={13} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Underload Jam ({underloaded.length} guru) &lt;{standarMin} JP
            </p>
          </div>
          <div className="space-y-1.5">
            {underloaded.slice(0, 4).map((g, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 truncate max-w-[65%]">
                  {g.nama_guru.split(',')[0]}
                </span>
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full flex-shrink-0">
                  {g.total_jp} JP
                </span>
              </div>
            ))}
            {underloaded.length > 4 && (
              <p className="text-[9px] text-amber-500 font-bold">+{underloaded.length - 4} lainnya</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
