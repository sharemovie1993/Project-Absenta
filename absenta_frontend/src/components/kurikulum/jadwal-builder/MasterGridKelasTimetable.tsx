import React, { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { getMapelColor, getMapelAbbreviation, getTeacherColor } from '../../../utils/mapelColorHelper';
import { DropdownOption } from '../../../api/dropdown.api';
import { JadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { ColorByMode } from './types';

interface Props {
  kelasList: DropdownOption[];
  allJadwal: JadwalKBM[];
  masterGridHari: string;
  slots: number[];
  colorByMode?: ColorByMode;
}

import { WORKDAYS_HARI_KEYS as DAYS } from '../../../constants/day.constants';

export const MasterGridKelasTimetable: React.FC<Props> = React.memo(({
  kelasList,
  allJadwal,
  masterGridHari,
  slots,
  colorByMode = 'MAPEL',
}) => {
  const isSemuaHari = masterGridHari === 'SEMUA';

  // O(1) Hash Map Lookup Optimization for Google Enterprise performance
  const kelasSlotMap = React.useMemo(() => {
    const map = new Map<string, JadwalKBM>();
    for (let i = 0; i < allJadwal.length; i++) {
      const j = allJadwal[i];
      if (!j.kelas_id || !j.hari || j.slot_index == null) continue;
      const key = `${j.kelas_id}_${j.hari}_${j.slot_index}`;
      if (!map.has(key)) {
        map.set(key, j);
      }
    }
    return map;
  }, [allJadwal]);

  return (
    <div className="w-full overflow-x-auto max-h-[764px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className={isSemuaHari ? "min-w-[2800px]" : "min-w-[1200px]"}>
        {/* Tier 1 Header: Days Header */}
        {isSemuaHari ? (
          <>
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-indigo-100/60 dark:bg-indigo-950/40"
              style={{ gridTemplateColumns: `180px repeat(${DAYS.length * slots.length}, minmax(42px, 1fr))` }}
            >
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 font-black text-indigo-900 dark:text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5 sticky left-0 z-20 bg-indigo-100/90 dark:bg-indigo-950/90 backdrop-blur-sm shadow-sm">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                KELAS (SEMUA HARI)
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-2 font-black text-slate-800 dark:text-slate-200 text-xs text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 uppercase tracking-widest bg-indigo-50/50 dark:bg-indigo-900/30"
                  style={{ gridColumn: `span ${slots.length}` }}
                >
                  🗓️ {day}
                </div>
              ))}
            </div>

            {/* Tier 2 Header: Slot Numbers per Day */}
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
              style={{ gridTemplateColumns: `180px repeat(${DAYS.length * slots.length}, minmax(42px, 1fr))` }}
            >
              <div className="p-2 border-r border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 text-center uppercase sticky left-0 z-20 bg-slate-50 dark:bg-slate-900">
                SLOT JAM
              </div>
              {DAYS.map((day) =>
                slots.map((slotIdx) => (
                  <div
                    key={`${day}-${slotIdx}`}
                    className="p-1.5 font-bold text-slate-600 dark:text-slate-400 text-[9px] text-center border-r last:border-r-0 border-slate-100 dark:border-slate-800"
                  >
                    J{slotIdx}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div
            className="grid border-b border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20"
            style={{ gridTemplateColumns: `180px repeat(${slots.length}, minmax(0, 1fr))` }}
          >
            <div className="p-3 border-r border-slate-200 dark:border-slate-800 font-black text-indigo-900 dark:text-indigo-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              KELAS / JAM ({masterGridHari})
            </div>
            {slots.map((slotIdx) => (
              <div
                key={slotIdx}
                className="p-2.5 font-black text-slate-700 dark:text-slate-300 text-[10px] text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 uppercase"
              >
                JAM {slotIdx}
              </div>
            ))}
          </div>
        )}

        {/* Rows per Class */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {kelasList.map((kelas) => {
            return (
              <div
                key={kelas.value}
                className="grid hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                style={{
                  gridTemplateColumns: isSemuaHari
                    ? `180px repeat(${DAYS.length * slots.length}, minmax(42px, 1fr))`
                    : `180px repeat(${slots.length}, minmax(0, 1fr))`,
                }}
              >
                {/* Class Name Column */}
                <div className="p-2.5 border-r border-slate-200 dark:border-slate-800 flex items-center sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {kelas.label}
                  </span>
                </div>

                {/* Slot Cells */}
                {isSemuaHari
                  ? DAYS.map((day) =>
                      slots.map((slotIdx) => {
                        const item = kelasSlotMap.get(`${kelas.value}_${day}_${slotIdx}`);
                        const mapelStyle = item
                          ? colorByMode === 'GURU'
                            ? getTeacherColor(item.Guru?.nama_guru || item.Guru?.User?.full_name || '')
                            : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '')
                          : null;

                        return (
                          <div
                            key={`${day}-${slotIdx}`}
                            className="p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 min-h-[52px] flex items-center justify-center"
                          >
                            {item ? (
                              <div
                                className={`w-full h-full p-1 rounded-lg border border-l-2 flex flex-col justify-center text-center transition-all ${mapelStyle?.bg} ${mapelStyle?.border}`}
                                style={{ borderLeftColor: mapelStyle?.dotHex }}
                                title={`${day} Jam ${slotIdx}${item.jam_mulai ? ` (${item.jam_mulai} - ${item.jam_selesai})` : ''}: ${item.Mapel?.nama_mapel || item.jenis_kegiatan} - ${item.Guru?.nama_guru || 'Guru'}`}
                              >
                                <span className="font-extrabold text-[9px] text-slate-800 dark:text-slate-100 truncate leading-none">
                                  {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                                </span>
                                <span className="text-[7.5px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-none">
                                  {item.Guru?.nama_guru || item.Guru?.User?.full_name || '-'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-300 dark:text-slate-700 font-light">-</span>
                            )}
                          </div>
                        );
                      })
                    )
                  : slots.map((slotIdx) => {
                        const item = kelasSlotMap.get(`${kelas.value}_${masterGridHari}_${slotIdx}`);
                        const mapelStyle = item
                          ? colorByMode === 'GURU'
                            ? getTeacherColor(item.Guru?.nama_guru || item.Guru?.User?.full_name || '')
                            : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '')
                          : null;

                      return (
                        <div
                          key={slotIdx}
                          className="p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 min-h-[52px] flex items-center justify-center"
                        >
                          {item ? (
                            <div
                              className={`w-full h-full p-1.5 rounded-xl border border-l-4 flex flex-col justify-center text-center transition-all ${mapelStyle?.bg} ${mapelStyle?.border}`}
                              style={{ borderLeftColor: mapelStyle?.dotHex }}
                              title={`${item.Mapel?.nama_mapel || item.jenis_kegiatan} - ${item.Guru?.nama_guru || 'Guru'}${item.jam_mulai ? ` (${item.jam_mulai} - ${item.jam_selesai})` : ''}`}
                            >
                              <span className="font-extrabold text-[10px] text-slate-800 dark:text-slate-100 truncate">
                                {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
                              </span>
                              <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                {item.Guru?.nama_guru || item.Guru?.User?.full_name || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 dark:text-slate-700 font-light">-</span>
                          )}
                        </div>
                      );
                    })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
