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
  resolveSlotTime: (targetKelasId: string, slotIndex: number, day: string) => { start: string; end: string };
  getSlotData: (day: string, slotIndex: number) => any;
  checkConflict: (day: string, slotIndex: number, targetKelasId: string) => any;
  onSlotClick: (day: string, slotIndex: number) => void;
  onDeleteSlot: (day: string, slotIndex: number, id: string) => void;
}

export const SingleGridTimetable: React.FC<Props> = React.memo(({
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
    const conflict = checkConflict(day, slotIndex, selectedKelasId);
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
            const isPembiasaan = item.is_pembiasaan || item.jenis_kegiatan === 'PEMBIASAAN';
            const mapelStyle = isPembiasaan
              ? { bg: 'bg-amber-50/80 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', dotHex: '#f59e0b' }
              : colorByMode === 'GURU'
                ? getTeacherColor(item.Guru?.nama_guru || item.Guru?.User?.full_name || '')
                : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '');
            return (
              <div
                className={cn(
                  'h-full w-full rounded-xl p-1.5 border flex flex-col justify-between relative transition-all shadow-sm border-l-4 min-h-[40px]',
                  isPembiasaan
                    ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : item.isForeign
                      ? 'bg-slate-100/40 dark:bg-slate-850/10 border-slate-200 dark:border-slate-800/80 border-dashed'
                      : `${mapelStyle.bg} ${mapelStyle.border}`
                )}
                style={{
                  borderLeftColor: isPembiasaan ? '#f59e0b' : item.isForeign ? undefined : mapelStyle.dotHex,
                }}
              >
                {/* Badge Indicator MANUAL (Bukan Impor XML) */}
                {!item.asc_id && !isPembiasaan && (
                  <span className="absolute -top-1.5 -right-1.5 z-10 text-[7px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white border border-amber-600 shadow-md uppercase tracking-tighter">
                    MANUAL
                  </span>
                )}

                <div className="flex flex-col justify-center space-y-0.5 text-center py-0.5">
                  {(() => {
                    const dynamicSlot = resolveSlotTime(item.kelas_id || selectedKelasId, slotIndex, day);
                    const isZero = (t?: string) => !t || t === '00:00' || t === '00:00:00';
                    const displayStart = dynamicSlot?.start || (!isZero(item.jam_mulai) ? item.jam_mulai : '');
                    const displayEnd = dynamicSlot?.end || (!isZero(item.jam_selesai) ? item.jam_selesai : '');
                    return (
                      <>
                        {isPembiasaan ? (
                          <>
                            <div className="text-[8.5px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                              PEMBIASAAN
                            </div>
                            <div className="text-[9px] font-extrabold uppercase text-amber-950 dark:text-amber-100 leading-tight truncate">
                              {item.Mapel?.nama_mapel || item.nama}
                            </div>
                            <div className="text-[8px] font-mono font-bold text-amber-600 dark:text-amber-400 leading-none mt-0.5">
                              {displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : ''}
                            </div>
                          </>
                        ) : viewMode === 'KELAS' ? (
                          <>
                            <div className="text-[9px] font-extrabold uppercase text-slate-800 dark:text-slate-100 leading-tight truncate">
                              {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                            </div>
                            <div className="text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                              {displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : ''}
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
                            <div className="text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                              {displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : ''}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
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
          <div className="h-full w-full flex items-center justify-center min-h-[38px] relative">
            {toolMode === 'PAINT' && conflict ? (
              <div
                title={conflict.message}
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center p-1 rounded-xl border text-center transition-all cursor-help shadow-md leading-tight opacity-0 group-hover/cell:opacity-100 z-10 backdrop-blur-[1px]',
                  conflict.type === 'TEACHER'
                    ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-400 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-400 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                )}
              >
                <div className="flex items-center justify-center gap-0.5 font-black text-[8px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 animate-bounce" />
                  <span>{conflict.type === 'TEACHER' ? 'GURU BENTROK' : 'TIMPA'}</span>
                </div>
                {conflict.type === 'TEACHER' && (
                  <div className="flex flex-col items-center text-[7.5px] leading-tight font-bold">
                    {conflict.kelasName && (
                      <span className="text-[7px] text-rose-600 dark:text-rose-300">di {conflict.kelasName}</span>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            <span className="opacity-0 group-hover/cell:opacity-100 text-slate-350 dark:text-slate-650 transition-opacity duration-200">
              <Plus size={11} className="stroke-[2.5]" />
            </span>
          </div>
        )}
      </div>
    );
  };

  const getMergedCellsForDay = (day: string) => {
    const mergedCells: {
      startSlot: number;
      endSlot: number;
      span: number;
      item: any;
      lastSlotItem: any;
    }[] = [];

    let i = 0;
    while (i < slots.length) {
      const slotIdx = slots[i];
      const item = getSlotData(day, slotIdx);

      if (!item) {
        mergedCells.push({
          startSlot: slotIdx,
          endSlot: slotIdx,
          span: 1,
          item: null,
          lastSlotItem: null,
        });
        i++;
        continue;
      }

      let span = 1;
      let nextIdx = i + 1;
      let lastItem = item;

      while (nextIdx < slots.length) {
        const nextSlot = slots[nextIdx];
        const nextItem = getSlotData(day, nextSlot);

        if (
          nextItem &&
          String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
          String(nextItem.guru_id || '') === String(item.guru_id || '') &&
          String(nextItem.kelas_id || '') === String(item.kelas_id || '') &&
          String(nextItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
        ) {
          span++;
          lastItem = nextItem;
          nextIdx++;
        } else {
          break;
        }
      }

      mergedCells.push({
        startSlot: slotIdx,
        endSlot: slotIdx + span - 1,
        span,
        item,
        lastSlotItem: lastItem,
      });

      i += span;
    }

    return mergedCells;
  };

  const renderAggregatedCell = (day: string, cell: { startSlot: number; endSlot: number; span: number; item: any; lastSlotItem: any }) => {
    const { startSlot, endSlot, span, item, lastSlotItem } = cell;

    if (!item) {
      return renderCell(day, startSlot);
    }

    const active = savingSlot === `${day}-${startSlot}`;
    const isPembiasaan = item.is_pembiasaan || item.jenis_kegiatan === 'PEMBIASAAN';

    const mapelStyle = isPembiasaan
      ? { bg: 'bg-amber-50/80 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', dotHex: '#f59e0b' }
      : colorByMode === 'GURU'
        ? getTeacherColor(item.Guru?.nama_guru || item.Guru?.User?.full_name || '')
        : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '');

    const dynamicStartSlot = resolveSlotTime(item.kelas_id || selectedKelasId, startSlot, day);
    const dynamicEndSlot = resolveSlotTime((lastSlotItem || item).kelas_id || selectedKelasId, endSlot, day);
    const isZero = (t?: string) => !t || t === '00:00' || t === '00:00:00';
    const displayStart = dynamicStartSlot?.start || (!isZero(item.jam_mulai) ? item.jam_mulai : '');
    const displayEnd = dynamicEndSlot?.end || (!isZero((lastSlotItem || item).jam_selesai) ? (lastSlotItem || item).jam_selesai : '');

    return (
      <div
        key={`${day}-${startSlot}`}
        style={{ gridColumn: `span ${span}` }}
        onClick={() => onSlotClick(day, startSlot)}
        className={cn(
          'p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/50 min-h-[52px] transition-all relative cursor-pointer group/cell flex flex-col justify-between select-none',
          active && 'bg-indigo-50/30 dark:bg-indigo-950/10 ring-1 ring-indigo-500/20 z-10',
          !active && 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
        )}
      >
        <div
          className={cn(
            'h-full w-full rounded-xl p-2 border flex flex-col justify-between relative transition-all shadow-sm border-l-4 min-h-[44px]',
            isPembiasaan
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : item.isForeign
                ? 'bg-slate-100/40 dark:bg-slate-850/10 border-slate-200 dark:border-slate-800/80 border-dashed'
                : `${mapelStyle.bg} ${mapelStyle.border}`
          )}
          style={{
            borderLeftColor: isPembiasaan ? '#f59e0b' : item.isForeign ? undefined : mapelStyle.dotHex,
          }}
        >
          {/* Badge Indicator MANUAL (Bukan Impor XML) */}
          {!item.asc_id && !isPembiasaan && (
            <span className="absolute -top-1.5 -right-1.5 z-10 text-[7px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white border border-amber-600 shadow-md uppercase tracking-tighter">
              MANUAL
            </span>
          )}

          {/* Badge JP jika > 1 JP */}
          {span > 1 && (
            <span className="absolute -top-1.5 left-2 z-10 text-[7.5px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white border border-indigo-700 shadow-md uppercase tracking-tighter">
              {span} JP
            </span>
          )}

          <div className="flex flex-col justify-center space-y-0.5 text-center py-0.5">
            {isPembiasaan ? (
              <>
                <div className="text-[8.5px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  PEMBIASAAN {span > 1 ? `(${span} JP)` : ''}
                </div>
                <div className="text-[9.5px] font-extrabold uppercase text-amber-950 dark:text-amber-100 leading-tight truncate">
                  {item.Mapel?.nama_mapel || item.nama}
                </div>
                <div className="text-[8px] font-mono font-bold text-amber-600 dark:text-amber-400 leading-none mt-0.5">
                  {displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : ''}
                </div>
              </>
            ) : viewMode === 'KELAS' ? (
              <>
                <div className="text-[10px] font-extrabold uppercase text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                </div>
                <div className="text-[8.5px] font-bold text-slate-600 dark:text-slate-400 leading-tight truncate">
                  {item.Guru?.nama_guru || item.Guru?.User?.full_name || (item.guru_id ? 'Guru Terjadwal' : '(Belum Set Guru)')}
                </div>
                <div className="text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  {displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : ''} {span > 1 ? `(${span} JP)` : ''}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                </div>
                <div className="text-[8.5px] font-bold text-slate-600 dark:text-slate-400 leading-tight truncate">
                  {item.isForeign
                    ? `Oleh: ${item.Guru?.nama_guru || item.Guru?.User?.full_name || 'Guru Lain'}`
                    : item.Kelas?.nama_kelas || `Kelas ${item.kelas_id || ''}`}
                </div>
                <div className="text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  {displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : ''} {span > 1 ? `(${span} JP)` : ''}
                </div>
              </>
            )}
          </div>

          {/* Action Hover Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              for (let s = startSlot; s <= endSlot; s++) {
                const sItem = getSlotData(day, s);
                if (sItem?.id) onDeleteSlot(day, s, sItem.id);
              }
            }}
            className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-100 dark:border-rose-900/40 text-rose-500 hover:text-rose-600 shadow-sm opacity-0 group-hover/cell:opacity-100 transition-opacity z-20"
            title={`Hapus ${span > 1 ? `${span} JP` : 'jadwal'}`}
          >
            <Trash2 size={9} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto max-h-[764px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="w-full min-w-full">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Menghubungkan ke mesin jadwal...
            </p>
          </div>
        ) : gridOrientation === 'VERTICAL_HARI' ? (
          /* ── KONFIGURASI B: Hari di Kiri (Vertikal), Jam Pelajaran ke Kanan (Horizontal) ── */
          <div className="w-full">
            {/* Header Row: Jam Slots across top */}
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 sticky top-0 z-20 w-full"
              style={{ gridTemplateColumns: `85px repeat(${slots.length}, minmax(0, 1fr))` }}
            >
              <div className="p-2 border-r border-slate-200 dark:border-slate-800 font-black text-slate-550 dark:text-slate-450 text-[9px] text-center tracking-wider uppercase shrink-0">
                HARI / WAKTU
              </div>
              {slots.map((slotIndex) => {
                return (
                  <div
                    key={slotIndex}
                    className="py-1.5 px-0.5 font-black text-slate-800 dark:text-slate-200 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 tracking-tight flex items-center justify-center min-w-0"
                  >
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase truncate">
                      {slotIndex === 0 ? 'JAM 0' : `JAM ${slotIndex}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Body Rows: 1 Row per Day */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 w-full">
              {hariSekolah.map((day) => (
                <div
                  key={day}
                  className="grid border-b last:border-b-0 border-slate-100 dark:border-slate-800/80 group/row w-full"
                  style={{ gridTemplateColumns: `85px repeat(${slots.length}, minmax(0, 1fr))` }}
                >
                  {/* Day Label Column */}
                  <div className="p-2 bg-slate-50/30 dark:bg-slate-900/20 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-slate-800 dark:text-slate-200 text-[11px] tracking-wider uppercase shrink-0">
                    {day}
                  </div>

                  {/* Aggregated Consecutive Slot Cells */}
                  {getMergedCellsForDay(day).map((cell) => renderAggregatedCell(day, cell))}
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
});
