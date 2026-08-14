import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DropdownOption } from '../../../api/dropdown.api';

type Props = {
  selectedKelasId: string;
  kelasOptions: DropdownOption[];
  tanggal: string;
  onChangeKelas: (id: string) => void;
  onChangeTanggal: (v: string) => void;
  onSetToday: () => void;
  isGuru?: boolean;
  kelasLabel?: (id?: string) => string;
};

export const SesiFilterPanel = React.memo(function SesiFilterPanel({
  tanggal,
  onChangeTanggal,
  onSetToday,
  selectedKelasId,
  onChangeKelas,
  kelasOptions = [],
  isGuru = false,
  kelasLabel,
}: Props) {
  const fmtTanggal = (() => {
    try {
      const [y, m, d] = (tanggal || '').split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return tanggal;
    }
  })();

  const shiftTanggal = (deltaDays: number) => {
    try {
      const [y, m, d] = (tanggal || '').split('-');
      const base = new Date(Number(y), Number(m) - 1, Number(d));
      base.setDate(base.getDate() + deltaDays);
      const yy = base.getFullYear();
      const mm = String(base.getMonth() + 1).padStart(2, '0');
      const dd = String(base.getDate()).padStart(2, '0');
      onChangeTanggal(`${yy}-${mm}-${dd}`);
    } catch {
      onSetToday();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Date Navigation Pill Group */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => shiftTanggal(-1)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
          title="Kemarin"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={onSetToday}
          className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
        >
          Hari Ini
        </button>
        <button
          type="button"
          onClick={() => shiftTanggal(1)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
          title="Besok"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Date Display Pill */}
      <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-tight">{fmtTanggal}</span>
      </div>

      {/* Kelas Filter Selector */}
      {kelasOptions.length > 0 && !isGuru && (
        <div className="flex items-center gap-2">
          <select
            value={selectedKelasId}
            onChange={(e) => onChangeKelas(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">Semua Kelas</option>
            {kelasOptions.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isGuru && selectedKelasId && (
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-xs font-black text-indigo-700 dark:text-indigo-300">
          <span>Kelas:</span>
          <span>{kelasLabel ? kelasLabel(selectedKelasId) : (kelasOptions.find(o => o.value === selectedKelasId)?.label || selectedKelasId)}</span>
        </div>
      )}
    </div>
  );
});
