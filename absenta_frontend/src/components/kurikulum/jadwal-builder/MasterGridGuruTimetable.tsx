import React from 'react';
import { Users } from 'lucide-react';
import { getMapelColor } from '../../../utils/mapelColorHelper';
import { JadwalKBM } from '../../../api/attendance/jadwalKBM.api';

interface Props {
  guruList: any[];
  allJadwal: JadwalKBM[];
  masterGridHari: string;
  slots: number[];
}

export const MasterGridGuruTimetable: React.FC<Props> = ({
  guruList,
  allJadwal,
  masterGridHari,
  slots,
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="min-w-[1200px]">
        {/* Table Header */}
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

        {/* Rows per Teacher */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {guruList.map((guru) => {
            return (
              <div
                key={guru.id}
                className="grid hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                style={{ gridTemplateColumns: `220px repeat(${slots.length}, minmax(0, 1fr))` }}
              >
                {/* Teacher Name Column */}
                <div className="p-2.5 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={guru.nama_guru}>
                    {guru.nama_guru}
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">NIP: {guru.nip || '-'}</span>
                </div>

                {/* Slot Cells */}
                {slots.map((slotIdx) => {
                  const teacherSlots = allJadwal.filter(
                    (j) => j.guru_id === guru.id && j.hari === masterGridHari && j.slot_index === slotIdx
                  );
                  const isConflict = teacherSlots.length > 1;
                  const item = teacherSlots[0];
                  const mapelStyle = item ? getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '') : null;

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
                          <span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 truncate">
                            {item.Mapel?.nama_mapel}
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
