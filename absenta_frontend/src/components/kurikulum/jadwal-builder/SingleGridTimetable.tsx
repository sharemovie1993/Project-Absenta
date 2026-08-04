import React from 'react';
import { RefreshCw, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { cn } from '../../../lib/utils';
import { getMapelColor, getMapelAbbreviation, getTeacherColor } from '../../../utils/mapelColorHelper';
import { ViewMode, ToolMode, ColorByMode, GridOrientation } from './types';

interface Props {
  viewMode: ViewMode;
  toolMode: ToolMode;
  colorByMode?: ColorByMode;
  gridOrientation?: GridOrientation;
  selectedKelasId: string;
  hariSekolah: string[];
  slots: number[];
  loadingData: boolean;
  savingSlot: string | null;
  resolveSlotTime: (targetKelasId: string, slotIndex: number) => { start: string; end: string };
  getSlotData: (day: string, slotIndex: number) => any;
  checkConflict: (day: string, slotIndex: number, targetKelasId: string) => any;
  onSlotClick: (day: string, slotIndex: number) => void;
  onDeleteSlot: (day: string, slotIndex: number, id: string) => void;
}

export const SingleGridTimetable: React.FC<Props> = ({
  viewMode,
  toolMode,
  colorByMode = 'MAPEL',
  gridOrientation = 'VERTICAL_HARI',
  selectedKelasId,
  hariSekolah,
  slots,
  loadingData,
  savingSlot,
  resolveSlotTime,
  getSlotData,
  checkConflict,
  onSlotClick,
  onDeleteSlot,
}) => {

  const renderCell = (day: string, slotIndex: number) => {
    const item = getSlotData(day, slotIndex) as any;
    const conflict = checkConflict(day, slotIndex, viewMode === 'KELAS' ? selectedKelasId : '');
    const active = savingSlot === `${day}-${slotIndex}`;

    return (
      <div
        key={`${day}-${slotIndex}`}
        onClick={() => onSlotClick(day, slotIndex)}
        className={cn(
          'p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/50 min-h-[46px] transition-all relative cursor-pointer group/cell flex flex-col justify-between select-none',
          active && 'bg-indigo-50/30 dark:bg-indigo-950/10 ring-1 ring-indigo-500/20 z-10',
          !active && 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
        )}
      >
        {item ? (
          (() => {
            const mapelStyle = colorByMode === 'GURU'
              ? getTeacherColor(item.Guru?.nama_guru || item.Guru?.User?.full_name || '')
              : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '');
            return (
              <div
                className={cn(
                  'h-full w-full rounded-xl p-1.5 border flex flex-col justify-between relative transition-all shadow-sm border-l-4 min-h-[40px]',
                  item.isForeign
                    ? 'bg-slate-100/40 dark:bg-slate-850/10 border-slate-200 dark:border-slate-800/80 border-dashed'
                    : `${mapelStyle.bg} ${mapelStyle.border}`
                )}
                style={{
                  borderLeftColor: item.isForeign ? undefined : mapelStyle.dotHex,
                }}
              >
                <div className="flex flex-col justify-center space-y-0.5 text-center py-0.5">
                  {viewMode === 'GURU' ? (
                    <>
                      <div className="text-[9.5px] font-black uppercase text-indigo-700 dark:text-indigo-300 leading-tight truncate">
                        {item.isForeign ? 'TERISI' : (item.Kelas?.nama_kelas || 'KELAS')}
                      </div>
                      <div className="text-[9px] font-extrabold uppercase text-slate-800 dark:text-slate-100 leading-tight truncate">
                        {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[9.5px] font-black uppercase text-slate-800 dark:text-slate-100 leading-tight truncate">
                        {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                      </div>
                      <div className="text-[8.5px] font-bold text-slate-600 dark:text-slate-400 leading-tight truncate">
                        {item.isForeign
                          ? `Oleh: ${item.Guru?.nama_guru || item.Guru?.User?.full_name || 'Guru Lain'}`
                          : item.Guru?.nama_guru ||
                            item.Guru?.User?.full_name ||
                            (item.guru_id ? 'Guru Terjadwal' : '(Belum Set Guru)')}
                      </div>
                    </>
                  )}
                </div>

                {/* Delete Hover Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSlot(day, slotIndex, item.id);
                  }}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-100 dark:border-rose-900/40 text-rose-500 hover:text-rose-600 shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity"
                  title="Hapus jadwal"
                >
                  <Trash2 size={9} />
                </button>
              </div>
            );
          })()
        ) : (
          <div className="h-full w-full flex items-center justify-center min-h-[38px]">
            {toolMode === 'PAINT' && conflict ? (
              <div
                className={cn(
                  'flex flex-col items-center justify-center p-1 rounded-xl border text-center transition-all w-full h-full',
                  conflict.type === 'TEACHER'
                    ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 text-rose-600 dark:text-rose-450'
                    : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-100/50 dark:border-amber-900/20 text-amber-600 dark:text-amber-450'
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[7.5px] font-black uppercase tracking-wider mt-0.5 leading-none">
                  {conflict.type === 'TEACHER' ? 'GURU BENTROK' : 'TIMPA KBM'}
                </span>
              </div>
            ) : (
              <span className="opacity-0 group-hover/cell:opacity-100 text-slate-350 dark:text-slate-650 transition-opacity duration-200">
                <Plus size={11} className="stroke-[2.5]" />
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto max-h-[764px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="min-w-[1000px]">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Menghubungkan ke mesin jadwal...
            </p>
          </div>
        ) : gridOrientation === 'VERTICAL_HARI' ? (
          /* ── KONFIGURASI B: Hari di Kiri (Vertikal), Jam Pelajaran ke Kanan (Horizontal) ── */
          <div>
            {/* Header Row: Jam Slots across top */}
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 sticky top-0 z-20"
              style={{ gridTemplateColumns: `110px repeat(${slots.length}, minmax(130px, 1fr))` }}
            >
              <div className="p-2 border-r border-slate-200 dark:border-slate-800 font-black text-slate-550 dark:text-slate-450 text-[10px] text-center tracking-widest uppercase">
                HARI / WAKTU
              </div>
              {slots.map((slotIndex) => {
                const slot = resolveSlotTime(selectedKelasId, slotIndex);
                return (
                  <div
                    key={slotIndex}
                    className="p-1.5 font-black text-slate-800 dark:text-slate-200 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 tracking-wider flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">
                      JAM {slotIndex}
                    </span>
                    <span className="text-[8.5px] text-slate-450 dark:text-slate-550 font-bold">
                      {slot.start} - {slot.end}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Body Rows: 1 Row per Day */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {hariSekolah.map((day) => (
                <div
                  key={day}
                  className="grid border-b last:border-b-0 border-slate-100 dark:border-slate-800/80 group/row"
                  style={{ gridTemplateColumns: `110px repeat(${slots.length}, minmax(130px, 1fr))` }}
                >
                  {/* Day Label Column */}
                  <div className="p-2 bg-slate-50/30 dark:bg-slate-900/20 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-slate-800 dark:text-slate-200 text-xs tracking-widest uppercase shrink-0">
                    {day}
                  </div>

                  {/* Slot Cells */}
                  {slots.map((slotIndex) => renderCell(day, slotIndex))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── KONFIGURASI A: Hari di Atas (Horizontal), Jam Pelajaran ke Bawah (Vertikal) ── */
          <div>
            {/* Header Days */}
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 sticky top-0 z-20"
              style={{ gridTemplateColumns: `repeat(${hariSekolah.length + 1}, minmax(0, 1fr))` }}
            >
              <div className="p-2 border-r border-slate-200 dark:border-slate-800 font-black text-slate-550 dark:text-slate-450 text-[10px] text-center tracking-widest uppercase">
                JAM / WAKTU
              </div>
              {hariSekolah.map((day) => (
                <div
                  key={day}
                  className="p-2 font-black text-slate-800 dark:text-slate-200 text-[10px] text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 tracking-widest uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="relative">
              {slots.map((slotIndex) => {
                const slot = resolveSlotTime(selectedKelasId, slotIndex);

                const prevSlotIndex = slotIndex > 1 ? slotIndex - 1 : null;
                const prevSlot = prevSlotIndex ? resolveSlotTime(selectedKelasId, prevSlotIndex) : null;
                const breakDuration =
                  prevSlot &&
                  (() => {
                    const toMins = (t: string) => {
                      const [h, m] = t.split(':').map(Number);
                      return (h || 0) * 60 + (m || 0);
                    };
                    const prevEndMins = toMins(prevSlot.end);
                    const currentStartMins = toMins(slot.start);
                    return currentStartMins - prevEndMins;
                  })();

                return (
                  <React.Fragment key={slotIndex}>
                    {breakDuration && breakDuration > 0 && (
                      <div
                        className="grid border-b border-slate-200 dark:border-slate-800/80 bg-amber-50/10 dark:bg-amber-950/5"
                        style={{ gridTemplateColumns: `repeat(${hariSekolah.length + 1}, minmax(0, 1fr))` }}
                      >
                        <div className="p-1 border-r border-slate-200 dark:border-slate-800/80 flex items-center justify-center bg-amber-50/20 dark:bg-amber-950/10">
                          <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 tracking-wider">
                            BREAK
                          </span>
                        </div>
                        <div
                          className="p-1 flex items-center justify-center text-[9.5px] font-bold text-amber-600 dark:text-amber-400/85"
                          style={{ gridColumn: `span ${hariSekolah.length}` }}
                        >
                          <span className="flex items-center gap-1">
                            ☕ Istirahat: {breakDuration} Menit ({prevSlot.end} - {slot.start})
                          </span>
                        </div>
                      </div>
                    )}
                    <div
                      className="grid border-b last:border-b-0 border-slate-100 dark:border-slate-800/80 group/row"
                      style={{ gridTemplateColumns: `repeat(${hariSekolah.length + 1}, minmax(0, 1fr))` }}
                    >
                      {/* Time Column */}
                      <div className="p-1.5 bg-slate-50/20 dark:bg-slate-900/10 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-0.5 shrink-0">
                        <span className="text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                          JAM {slotIndex}
                        </span>
                        <span className="text-[8.5px] text-slate-450 dark:text-slate-550 font-bold">
                          {slot.start} - {slot.end}
                        </span>
                      </div>

                      {/* Days Columns */}
                      {hariSekolah.map((day) => renderCell(day, slotIndex))}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
