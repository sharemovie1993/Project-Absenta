import React from 'react';
import { Award, AlertTriangle, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CatatanItem {
  id: string;
  type: 'PRESTASI' | 'PELANGGARAN';
  tanggal: string;
  judul: string;
  kategori: string;
  pencatat: string;
  poin: number;
  poinText: string;
  status: string;
}

export interface SiswaPointsTabProps {
  bukuCatatanList: CatatanItem[];
  catatanFilter: 'semua' | 'prestasi' | 'pelanggaran';
  setCatatanFilter: (val: 'semua' | 'prestasi' | 'pelanggaran') => void;
  filteredBukuCatatan: CatatanItem[];
  totalPoinPrestasi?: number;
  totalPoinPelanggaran?: number;
  netPoin?: number;
}

function formatTanggal(tanggal: string): string {
  if (!tanggal || tanggal === '-') return '-';
  try {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return tanggal; }
}

function getStatusStyle(status: string) {
  const s = String(status).toLowerCase();
  if (s.includes('setuju') || s.includes('selesai') || s.includes('valid'))
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25';
  if (s.includes('proses') || s.includes('review') || s.includes('pending'))
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25';
  if (s.includes('binaan') || s.includes('aktif'))
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25';
  return 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700/50';
}

export const SiswaPointsTab: React.FC<SiswaPointsTabProps> = ({
  bukuCatatanList,
  catatanFilter,
  setCatatanFilter,
  filteredBukuCatatan,
  totalPoinPrestasi = 0,
  totalPoinPelanggaran = 0,
  netPoin = 0,
}) => {
  const prestasiCount = bukuCatatanList.filter(i => i.type === 'PRESTASI').length;
  const pelanggaranCount = bukuCatatanList.filter(i => i.type === 'PELANGGARAN').length;

  return (
    <div className="space-y-4">
      {/* Score Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            netPoin >= 0 ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}>
            {netPoin >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Poin</p>
            <p className={cn("text-2xl font-black font-mono leading-tight",
              netPoin >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
            )}>{netPoin >= 0 ? '+' : ''}{netPoin}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prestasi</p>
            <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 leading-tight">+{totalPoinPrestasi}</p>
            <p className="text-[10px] text-slate-400">{prestasiCount} catatan</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pelanggaran</p>
            <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 leading-tight">-{totalPoinPelanggaran}</p>
            <p className="text-[10px] text-slate-400">{pelanggaranCount} catatan</p>
          </div>
        </div>
      </div>

      {/* Main List Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">

        {/* Header & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                Buku Catatan Kedisiplinan &amp; Prestasi
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Daftar akumulasi poin pelanggaran dan poin penghargaan sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 shrink-0 self-start sm:self-auto">
            {([
              { key: 'semua'        as const, label: `Semua (${bukuCatatanList.length})`, activeClass: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700' },
              { key: 'prestasi'     as const, label: 'Prestasi (+)',                       activeClass: 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700' },
              { key: 'pelanggaran'  as const, label: 'Pelanggaran (-)',                    activeClass: 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs border border-slate-200/80 dark:border-slate-700' },
            ]).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCatatanFilter(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none whitespace-nowrap",
                  catatanFilter === tab.key ? tab.activeClass : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >{tab.label}</button>
            ))}
          </div>
        </div>

        {/* Item List */}
        {filteredBukuCatatan.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <BookOpen size={26} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {catatanFilter === 'prestasi' ? 'Belum ada catatan prestasi.' :
               catatanFilter === 'pelanggaran' ? 'Belum ada catatan pelanggaran.' :
               'Belum ada catatan poin.'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Data akan tampil setelah dicatat oleh guru atau staf sekolah.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredBukuCatatan.map((item) => {
              const isPrestasi = item.type === 'PRESTASI';
              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:shadow-sm",
                    isPrestasi
                      ? "bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40 hover:border-emerald-300/80"
                      : "bg-rose-50/60 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40 hover:border-rose-300/80"
                  )}
                >
                  {/* Left */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      isPrestasi ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}>
                      {isPrestasi ? <Award size={19} /> : <AlertTriangle size={19} />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest",
                          isPrestasi
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                        )}>
                          {item.type}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">• {formatTanggal(item.tanggal)}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">{item.judul}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Kategori: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.kategori}</span>
                        {item.pencatat && (
                          <> • Pencatat: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.pencatat}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800/80 gap-2 sm:gap-1.5">
                    <span className={cn("text-base sm:text-lg font-black font-mono leading-tight",
                      isPrestasi ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {item.poinText}
                    </span>
                    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono whitespace-nowrap", getStatusStyle(item.status))}>
                      Status: {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

