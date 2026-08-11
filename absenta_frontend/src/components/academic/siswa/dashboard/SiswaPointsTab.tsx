import React from 'react';
import { Award, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SiswaPointsTabProps {
  bukuCatatanList: Array<{
    id: string;
    type: 'PRESTASI' | 'PELANGGARAN';
    tanggal: string;
    judul: string;
    kategori: string;
    pencatat: string;
    poinText: string;
    status: string;
  }>;
  catatanFilter: 'semua' | 'prestasi' | 'pelanggaran';
  setCatatanFilter: (val: 'semua' | 'prestasi' | 'pelanggaran') => void;
  filteredBukuCatatan: Array<{
    id: string;
    type: 'PRESTASI' | 'PELANGGARAN';
    tanggal: string;
    judul: string;
    kategori: string;
    pencatat: string;
    poinText: string;
    status: string;
  }>;
}

export const SiswaPointsTab: React.FC<SiswaPointsTabProps> = ({
  bukuCatatanList,
  catatanFilter,
  setCatatanFilter,
  filteredBukuCatatan,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      {/* Card Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Buku Catatan Kedisiplinan &amp; Prestasi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar akumulasi poin pelanggaran dan poin penghargaan sekolah
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCatatanFilter('semua')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
              catatanFilter === 'semua'
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Semua ({bukuCatatanList.length})
          </button>
          <button
            type="button"
            onClick={() => setCatatanFilter('prestasi')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
              catatanFilter === 'prestasi'
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Prestasi (+)
          </button>
          <button
            type="button"
            onClick={() => setCatatanFilter('pelanggaran')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none",
              catatanFilter === 'pelanggaran'
                ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/80 dark:border-slate-700"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Pelanggaran (-)
          </button>
        </div>
      </div>

      {/* Catatan List Items */}
      <div className="space-y-3">
        {filteredBukuCatatan.map((item) => {
          const isPrestasi = item.type === 'PRESTASI';

          return (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5",
                  isPrestasi
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                )}>
                  {isPrestasi ? <Award size={20} /> : <AlertTriangle size={20} />}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md font-mono uppercase tracking-wider",
                      isPrestasi
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                    )}>
                      {item.type}
                    </span>
                    <span className="text-slate-400 font-mono">• {item.tanggal}</span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {item.judul}
                  </h4>

                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Kategori: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.kategori}</span> • Pencatat: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.pencatat}</span>
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800/80 gap-1">
                <span className={cn(
                  "text-sm sm:text-base font-black font-mono",
                  isPrestasi
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}>
                  {item.poinText}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700/60 font-mono">
                  Status: {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
