import React from 'react';
import { Users } from 'lucide-react';
import { getMapelColor, getMapelAbbreviation, getTeacherColor } from '../../../utils/mapelColorHelper';
import { JadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { ColorByMode } from './types';

interface Props {
  guruList: any[];
  allJadwal: JadwalKBM[];
  masterGridHari: string;
  slots: number[];
  colorByMode?: ColorByMode;
}

import { WORKDAYS_HARI_KEYS as DAYS } from '../../../constants/day.constants';

export const MasterGridGuruTimetable: React.FC<Props> = ({
  guruList,
  allJadwal,
  masterGridHari,
  slots,
  colorByMode = 'MAPEL',
}) => {
  const isSemuaHari = masterGridHari === 'SEMUA';

  // O(1) Hash Map Lookup Optimization for Google Enterprise performance
  const guruSlotMap = React.useMemo(() => {
    const map = new Map<string, JadwalKBM[]>();
    for (let i = 0; i < allJadwal.length; i++) {
      const j = allJadwal[i];
      if (!j.guru_id || !j.hari || j.slot_index == null) continue;
      const key = `${j.guru_id}_${j.hari}_${j.slot_index}`;
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(j);
    }
    return map;
  }, [allJadwal]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className={isSemuaHari ? "min-w-[2800px]" : "min-w-[1200px]"}>
        {/* Tier 1 Header: Days Header */}
        {isSemuaHari ? (
          <>
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-purple-100/60 dark:bg-purple-950/40"
              style={{ gridTemplateColumns: `220px repeat(${DAYS.length * slots.length}, minmax(42px, 1fr))` }}
            >
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 font-black text-purple-900 dark:text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5 sticky left-0 z-20 bg-purple-100/90 dark:bg-purple-950/90 backdrop-blur-sm shadow-sm">
                <Users className="w-4 h-4 text-purple-600" />
                NAMA GURU (SEMUA HARI)
              </div>
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="p-2 font-black text-slate-800 dark:text-slate-200 text-xs text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 uppercase tracking-widest bg-purple-50/50 dark:bg-purple-900/30"
                  style={{ gridColumn: `span ${slots.length}` }}
                >
                  🗓️ {day}
                </div>
              ))}
            </div>

            {/* Tier 2 Header: Slot Numbers per Day */}
            <div
              className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
              style={{ gridTemplateColumns: `220px repeat(${DAYS.length * slots.length}, minmax(42px, 1fr))` }}
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
            className="grid border-b border-slate-200 dark:border-slate-800 bg-purple-50/50 dark:bg-purple-950/20"
            style={{ gridTemplateColumns: `220px repeat(${slots.length}, minmax(0, 1fr))` }}
          >
            <div className="p-3 border-r border-slate-200 dark:border-slate-800 font-black text-purple-900 dark:text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              NAMA GURU / JAM ({masterGridHari})
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

        {/* Rows per Teacher */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {guruList.map((guru) => {
            return (
              <div
                key={guru.id}
                className="grid hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                style={{
                  gridTemplateColumns: isSemuaHari
                    ? `220px repeat(${DAYS.length * slots.length}, minmax(42px, 1fr))`
                    : `220px repeat(${slots.length}, minmax(0, 1fr))`,
                }}
              >
                {/* Teacher Name Column */}
                <div className="p-2.5 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={guru.nama_guru}>
                    {guru.nama_guru}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">NIP: {guru.nip || '-'}</span>
                </div>

                {/* Slot Cells */}
                {isSemuaHari
                  ? DAYS.map((day) =>
                      slots.map((slotIdx) => {
                        const teacherSlots = guruSlotMap.get(`${guru.id}_${day}_${slotIdx}`) || [];
                        const isConflict = teacherSlots.length > 1;
                        const item = teacherSlots[0];
                        const mapelStyle = item
                          ? colorByMode === 'GURU'
                            ? getTeacherColor(guru.nama_guru)
                            : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '')
                          : null;

                        return (
                          <div
                            key={`${day}-${slotIdx}`}
                            className="p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 min-h-[52px] flex items-center justify-center"
                          >
                            {isConflict ? (
                              <span
                                className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-black bg-rose-500 text-white animate-pulse shadow-sm text-center leading-tight"
                                title={`BENTROK (${day} Jam ${slotIdx})! Guru mengajar di ${teacherSlots.length} kelas`}
                              >
                                🚨 ({teacherSlots.length})
                              </span>
                            ) : item ? (
                              <div
                                className={`w-full h-full p-1 rounded-lg border border-l-2 flex flex-col justify-center text-center transition-all ${mapelStyle?.bg} ${mapelStyle?.border}`}
                                style={{ borderLeftColor: mapelStyle?.dotHex }}
                                title={`${day} Jam ${slotIdx}: ${item.Mapel?.nama_mapel || item.jenis_kegiatan} - Kelas ${item.Kelas?.nama_kelas}`}
                              >
                                <span className="font-black text-[9px] text-indigo-700 dark:text-indigo-300 truncate leading-none">
                                  {item.Kelas?.nama_kelas}
                                </span>
                                <span className="text-[8px] font-extrabold text-slate-700 dark:text-slate-200 truncate mt-0.5 leading-none">
                                  {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
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
                      const teacherSlots = guruSlotMap.get(`${guru.id}_${masterGridHari}_${slotIdx}`) || [];
                      const isConflict = teacherSlots.length > 1;
                      const item = teacherSlots[0];
                      const mapelStyle = item
                        ? colorByMode === 'GURU'
                          ? getTeacherColor(guru.nama_guru)
                          : getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '')
                        : null;

                      return (
                        <div
                          key={slotIdx}
                          className="p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 min-h-[52px] flex items-center justify-center"
                        >
                          {isConflict ? (
                            <span
                              className="inline-flex items-center px-1.5 py-1 rounded text-[9px] font-black bg-rose-500 text-white animate-pulse shadow-sm text-center leading-tight"
                              title={`BENTROK! Guru mengajar di ${teacherSlots.length} kelas sekaligus di Jam ${slotIdx}`}
                            >
                              🚨 BENTROK ({teacherSlots.length} Kelas)
                            </span>
                          ) : item ? (
                            <div
                              className={`w-full h-full p-1.5 rounded-xl border border-l-4 flex flex-col justify-center text-center transition-all ${mapelStyle?.bg} ${mapelStyle?.border}`}
                              style={{ borderLeftColor: mapelStyle?.dotHex }}
                              title={`${item.Mapel?.nama_mapel || item.jenis_kegiatan} - Kelas ${item.Kelas?.nama_kelas}`}
                            >
                              <span className="font-black text-[10px] text-indigo-700 dark:text-indigo-300 truncate">
                                {item.Kelas?.nama_kelas}
                              </span>
                              <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-200 truncate">
                                {getMapelAbbreviation(item.Mapel?.nama_mapel || item.jenis_kegiatan)}
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
};
