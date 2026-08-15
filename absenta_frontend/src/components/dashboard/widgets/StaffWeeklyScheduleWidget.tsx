import React, { useMemo } from 'react';
import { Calendar, Sparkles, BookOpen, Clock, Layers } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WORKDAYS_HARI_KEYS, getDayLabel, type HariKey } from '../../../constants/day.constants';
import { useStaffWeeklySchedule } from '../../../hooks/attendance/useStaffWeeklySchedule';

interface StaffWeeklyScheduleWidgetProps {
  guruId?: string;
  guruNama?: string;
  className?: string;
}

const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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

  // Compute maximum slot index used by this teacher to keep grid compact
  const maxSlot = useMemo(() => {
    let max = 8;
    rawSchedules.forEach((s) => {
      if (s.slot_index && s.slot_index > max) max = s.slot_index;
    });
    return Math.min(max, 12);
  }, [rawSchedules]);

  const activeSlots = useMemo(() => {
    return SLOTS.filter((s) => s <= maxSlot);
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

  // Merge consecutive slots for the same class & mapel
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
          nextIndex++;
        } else {
          break;
        }
      }

      skipCount = colSpan - 1;
      cells.push({ slot, colSpan, item });
    }

    return cells;
  };

  return (
    <div className={cn("p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4", className)}>
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Jadwal Mengajar Guru (1 Minggu)
              </h2>
              {guruNama && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Guru: <span className="font-bold text-slate-700 dark:text-slate-200">{guruNama}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs font-black">
            Total: {totalWeeklyJp} JP / Minggu
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
            <Sparkles size={13} className="text-blue-500" />
            <span>Senin — Sabtu</span>
          </div>
        </div>
      </div>

      {/* ── TEACHER SPECIFIC MATRIX GRID ───────────────────────────────────── */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="min-w-[840px]">
          
          {/* Header Row (Slots) */}
          <div 
            className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/60 text-center text-xs font-black text-slate-600 dark:text-slate-300 sticky top-0 z-10"
            style={{ gridTemplateColumns: `100px repeat(${activeSlots.length}, minmax(0, 1fr))` }}
          >
            <div className="p-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[11px] uppercase tracking-wider text-slate-500">
              HARI
            </div>
            {activeSlots.map((slot) => (
              <div key={slot} className="p-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">JAM {slot}</span>
              </div>
            ))}
          </div>

          {/* Body Rows (Days) */}
          <div>
            {isLoading ? (
              <div className="p-10 text-center text-xs font-bold text-slate-400 animate-pulse">
                Memuat data jadwal mengajar...
              </div>
            ) : (
              WORKDAYS_HARI_KEYS.map((day) => {
                const mergedCells = getMergedSlotsForDay(day);

                return (
                  <div
                    key={day}
                    className="grid border-b last:border-b-0 border-slate-200/80 dark:border-slate-800/60 group"
                    style={{ gridTemplateColumns: `100px repeat(${activeSlots.length}, minmax(0, 1fr))` }}
                  >
                    {/* Day Name */}
                    <div className="p-3 bg-slate-100/50 dark:bg-slate-800/30 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300">
                      {getDayLabel(day)}
                    </div>

                    {/* Slot Cells */}
                    {mergedCells.map(({ slot, colSpan, item }) => {
                      return (
                        <div
                          key={`${day}-${slot}`}
                          className="p-1.5 border-r last:border-r-0 border-slate-200/60 dark:border-slate-800/40 min-h-[72px] flex"
                          style={{ gridColumn: `span ${colSpan}` }}
                        >
                          {item ? (
                            <div className="w-full h-full rounded-xl p-2.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex flex-col justify-between gap-1 shadow-xs hover:border-blue-400 transition-all group/cell">
                              <div className="flex items-center justify-between gap-1">
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-600 text-white shadow-xs tracking-tight truncate max-w-[90px]">
                                  {item.Kelas?.nama_kelas || item.kelas_nama || 'Kelas'}
                                </span>
                                {colSpan > 1 && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                    {colSpan} JP
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2">
                                  {item.Mapel?.nama_mapel || item.mapel_nama || item.jenis_kegiatan || 'Mata Pelajaran'}
                                </h4>
                                {item.jam_mulai && item.jam_selesai && (
                                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Clock size={10} className="text-blue-500" />
                                    <span>{item.jam_mulai} - {item.jam_selesai}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-xl border border-dashed border-slate-200/50 dark:border-slate-800/40 flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs select-none">
                              -
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
      </div>
    </div>
  );
};
