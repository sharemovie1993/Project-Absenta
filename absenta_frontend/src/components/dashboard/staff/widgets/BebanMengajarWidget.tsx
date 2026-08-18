import React from 'react';
import { Award, Clock, Calendar, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface BebanMengajarWidgetProps {
  currentJp?: number;
  kbmJp?: number;
  ekuivalenJp?: number;
  targetJp?: number;
  teacherName?: string;
  positions?: Array<{ name: string; ekuivalen_jp: number }>;
  hadirBulanIni?: number;
  terlambatBulanIni?: number;
  dinasLuarBulanIni?: number;
  izinBulanIni?: number;
  isLoading?: boolean;
  onOpenAjukanIzin?: () => void;
}

export const BebanMengajarWidget: React.FC<BebanMengajarWidgetProps> = ({
  currentJp = 0,
  kbmJp,
  ekuivalenJp = 0,
  targetJp = 24,
  teacherName = 'Guru',
  positions = [],
  hadirBulanIni = 0,
  terlambatBulanIni = 0,
  dinasLuarBulanIni = 0,
  izinBulanIni = 0,
  isLoading = false,
  onOpenAjukanIzin,
}) => {
  const displayTarget = targetJp > 0 ? targetJp : 24;
  const percentage = Math.min(100, Math.round((currentJp / displayTarget) * 100));
  const isFulfilled = currentJp >= displayTarget;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center shrink-0">
            <Award size={18} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Beban Jam Mengajar Mingguan</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                SYARAT TPG
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Standar Permendikbudristek: Min. 24 JP / minggu (Tatap Muka &amp; Ekuivalensi Tugas Tambahan)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAjukanIzin && (
            <button
              type="button"
              onClick={onOpenAjukanIzin}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Calendar size={13} />
              <span>Ajukan Izin / Dinas</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: Progress Visual (7 Cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Realisasi Beban Total
              </span>
              {ekuivalenJp > 0 && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                  {kbmJp !== undefined ? `${kbmJp} KBM + ` : ''}{ekuivalenJp} Ekuivalen
                </span>
              )}
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {currentJp} / {displayTarget} JP ({percentage}%)
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isFulfilled
                  ? "bg-gradient-to-r from-blue-500 to-emerald-500"
                  : "bg-gradient-to-r from-amber-500 to-orange-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 size={12} />
              {isFulfilled ? 'Syarat 24 JP Terpenuhi' : `${displayTarget - currentJp} JP lagi untuk memenuhi syarat 24 JP`}
            </span>
            <span>Target: {displayTarget} JP Wajib</span>
          </div>

          {/* Additional duty chips if available */}
          {positions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {positions.map((p, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                  <Sparkles size={10} className="text-amber-500" />
                  <span>{p.name}: +{p.ekuivalen_jp} JP</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Kehadiran Guru Bulan Ini (5 Cols) */}
        <div className="lg:col-span-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-around text-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Hadir</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{hadirBulanIni}</span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Terlambat</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">{terlambatBulanIni}</span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Dinas Luar</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{dinasLuarBulanIni}</span>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Cuti/Izin</span>
            <span className="text-sm font-black text-purple-600 dark:text-purple-400">{izinBulanIni}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
