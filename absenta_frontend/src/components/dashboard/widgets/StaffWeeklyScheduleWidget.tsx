import React, { useState, useMemo } from 'react';
import { Calendar, Sparkles, Clock, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WORKDAYS_HARI_KEYS, getDayLabel, getDayShortLabel } from '../../../constants/day.constants';
import { useStaffWeeklySchedule } from '../../../hooks/attendance/useStaffWeeklySchedule';

interface StaffWeeklyScheduleWidgetProps {
  guruId?: string;
  guruNama?: string;
  className?: string;
}

const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const StaffWeeklyScheduleWidget: React.FC<StaffWeeklyScheduleWidgetProps> = ({
  guruId,
  guruNama,
  className
}) => {
  const {
    rawSchedules,
    totalWeeklyJp,
    isLoading,
  } = useStaffWeeklySchedule(guruId);

  // Selected cell item for mobile detail popup/sheet
  const [selectedItem, setSelectedItem] = useState<{
    item: any;
    day: string;
    slot: number;
    colSpan: number;
  } | null>(null);

  // Compute maximum slot index used by this teacher to fit perfectly on mobile
  const maxSlot = useMemo(() => {
    let max = 7;
    rawSchedules.forEach((s) => {
      if (s.slot_index && s.slot_index > max) max = s.slot_index;
    });
    return Math.min(Math.max(max, 7), 12);
  }, [rawSchedules]);

  const activeSlots = useMemo(() => {
    return ALL_SLOTS.filter((s) => s <= maxSlot);
  }, [maxSlot]);

  // Fast Slot Lookup Map
  const slotMap = useMemo(() => {
    const map = new Map<string, any>();
    rawSchedules.forEach((j) => {
      if (!j.hari || j.slot_index == null) return;
      map.set(`${String(j.hari).toUpperCase()}_${j.slot_index}`, j);
    });
    return map;
  }, [rawSchedules]);

  // Merge consecutive slots for the same class & mapel and resolve merged end time
  const getMergedSlotsForDay = (day: string) => {
    const cells: { slot: number; colSpan: number; item: any }[] = [];
    let skipCount = 0;

    for (let i = 0; i < activeSlots.length; i++) {
      if (skipCount > 0) {
        skipCount--;
        continue;
      }

      const slot = activeSlots[i];
      const item = slotMap.get(`${day}_${slot}`);

      if (!item) {
        cells.push({ slot, colSpan: 1, item: null });
        continue;
      }

      // Check how many consecutive slots have the same class and mapel
      let colSpan = 1;
      let finalEnd = item.jam_selesai;
      let nextIndex = i + 1;
      while (nextIndex < activeSlots.length) {
        const nextSlot = activeSlots[nextIndex];
        const nextItem = slotMap.get(`${day}_${nextSlot}`);

        if (
          nextItem &&
          String(nextItem.kelas_id || '') === String(item.kelas_id || '') &&
          String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
          String(nextItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
        ) {
          colSpan++;
          finalEnd = nextItem.jam_selesai || finalEnd;
          nextIndex++;
        } else {
          break;
        }
      }

      skipCount = colSpan - 1;
      cells.push({ 
        slot, 
        colSpan, 
        item: { ...item, jam_selesai_merged: finalEnd } 
      });
    }

    return cells;
  };

  // Color generator based on class name string for high-contrast visual differentiation
  const getClassColor = (name: string = '') => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themes = [
      'bg-blue-600 dark:bg-blue-500 text-white',
      'bg-indigo-600 dark:bg-indigo-500 text-white',
      'bg-emerald-600 dark:bg-emerald-500 text-white',
      'bg-amber-600 dark:bg-amber-500 text-white',
      'bg-purple-600 dark:bg-purple-500 text-white',
      'bg-teal-600 dark:bg-teal-500 text-white',
      'bg-rose-600 dark:bg-rose-500 text-white',
    ];
    return themes[hash % themes.length];
  };

  return (
    <div className={cn("p-3.5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-4", className)}>
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Matriks Jadwal Mengajar Guru
            </h2>
          </div>
          {guruNama && (
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 pl-9">
              Pengajar: <span className="font-bold text-slate-700 dark:text-slate-200">{guruNama}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-[11px] sm:text-xs font-black">
            Beban: {totalWeeklyJp} JP / Minggu
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs font-bold">
            <Sparkles size={12} className="text-blue-500" />
            <span>Senin — Sabtu</span>
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE 1-PAGE COMPACT MATRIX GRID ───────────────────────────── */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden">
        
        {/* Header Row (Slots 1 to N) */}
        <div 
          className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/70 text-center text-xs font-black text-slate-600 dark:text-slate-300"
          style={{ gridTemplateColumns: `38px repeat(${activeSlots.length}, minmax(0, 1fr))` }}
        >
          <div className="p-1 sm:p-2 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] sm:text-[10px] uppercase font-black text-slate-400">
            HARI
          </div>
          {activeSlots.map((slot) => (
            <div key={slot} className="p-1 sm:p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-200">
                <span className="hidden sm:inline">JAM </span>{slot}
              </span>
            </div>
          ))}
        </div>

        {/* Body Rows (Senin s/d Sabtu) */}
        <div>
          {isLoading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400 animate-pulse">
              Memuat data jadwal mengajar...
            </div>
          ) : (
            WORKDAYS_HARI_KEYS.map((day) => {
              const mergedCells = getMergedSlotsForDay(day);

              return (
                <div
                  key={day}
                  className="grid border-b last:border-b-0 border-slate-200/80 dark:border-slate-800/60"
                  style={{ gridTemplateColumns: `38px repeat(${activeSlots.length}, minmax(0, 1fr))` }}
                >
                  {/* Day Column (Compact 3-letter label for mobile) */}
                  <div className="p-1 sm:p-2 bg-slate-100/60 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-[10px] sm:text-xs text-slate-700 dark:text-slate-300">
                    <span className="sm:hidden">{getDayShortLabel(day)}</span>
                    <span className="hidden sm:inline">{getDayLabel(day)}</span>
                  </div>

                  {/* Slot Cells */}
                  {mergedCells.map(({ slot, colSpan, item }) => {
                    const kelasNama = item?.Kelas?.nama_kelas || item?.kelas_nama || 'Kelas';
                    const mapelNama = item?.Mapel?.nama_mapel || item?.mapel_nama || item?.jenis_kegiatan || 'Mapel';
                    const jamText = item?.jam_mulai && (item?.jam_selesai_merged || item?.jam_selesai)
                      ? `${item.jam_mulai}-${item.jam_selesai_merged || item.jam_selesai}`
                      : null;

                    return (
                      <div
                        key={`${day}-${slot}`}
                        className="p-0.5 sm:p-1 border-r last:border-r-0 border-slate-200/60 dark:border-slate-800/40 min-h-[58px] sm:min-h-[74px] flex"
                        style={{ gridColumn: `span ${colSpan}` }}
                      >
                        {item ? (
                          <button
                            type="button"
                            onClick={() => setSelectedItem({ item, day, slot, colSpan })}
                            className="w-full h-full rounded-lg sm:rounded-xl p-1 sm:p-1.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex flex-col justify-between items-center text-center shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group overflow-hidden"
                          >
                            {/* ── BARIS 1: NAMA KELAS (FULL WIDTH MAKSIMAL) ── */}
                            <div className="w-full flex items-center justify-center">
                              <span className={cn(
                                "w-full px-1 py-0.5 rounded text-[8px] sm:text-[10px] font-black truncate text-center leading-none shadow-2xs",
                                getClassColor(kelasNama)
                              )}>
                                {kelasNama}
                              </span>
                            </div>

                            {/* ── BARIS 2 (TENGAH): LABEL WAKTU JAM MENGAJAR ── */}
                            <div className="w-full flex items-center justify-center my-auto py-0.5">
                              <span className="text-[7.5px] sm:text-[9.5px] font-black text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/70 px-1 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40 font-mono text-center tracking-tighter truncate leading-none max-w-full">
                                {jamText || '07:00-08:30'}
                              </span>
                            </div>

                            {/* ── BARIS 3: NAMA MATA PELAJARAN ───────────── */}
                            <div className="w-full">
                              <p className="text-[7.5px] sm:text-[10px] font-extrabold text-slate-800 dark:text-slate-100 truncate leading-tight">
                                {mapelNama}
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full h-full rounded-lg border border-dashed border-slate-200/40 dark:border-slate-800/30 flex items-center justify-center text-slate-300 dark:text-slate-700 text-[10px] select-none">
                            ·
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL POPUP DETAIL (WHEN TEACHER TAPS ANY SLOT CELL ON MOBILE) ──── */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-black",
                  getClassColor(selectedItem.item.Kelas?.nama_kelas || selectedItem.item.kelas_nama)
                )}>
                  {selectedItem.item.Kelas?.nama_kelas || selectedItem.item.kelas_nama || 'Kelas'}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Hari {getDayLabel(selectedItem.day)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mata Pelajaran</p>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedItem.item.Mapel?.nama_mapel || selectedItem.item.mapel_nama || selectedItem.item.jenis_kegiatan || 'Mata Pelajaran'}
                </h3>
                {selectedItem.item.Mapel?.kode_mapel && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Kode: {selectedItem.item.Mapel.kode_mapel}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alokasi Waktu</p>
                  <p className="text-xs font-black text-blue-600 dark:text-blue-400 mt-0.5">
                    {selectedItem.colSpan} Jam Pelajaran (JP)
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    Slot Jam ke-{selectedItem.slot} {selectedItem.colSpan > 1 ? `s/d ${selectedItem.slot + selectedItem.colSpan - 1}` : ''}
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam Mengajar</p>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {selectedItem.item.jam_mulai || '-'} - {selectedItem.item.jam_selesai_merged || selectedItem.item.jam_selesai || '-'}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Sifat: {selectedItem.item.jenis_kegiatan || 'TEORI'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="w-full py-2.5 rounded-2xl text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer hover:opacity-90 transition-opacity"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
