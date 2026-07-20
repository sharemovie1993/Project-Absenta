import React from 'react';
import { BookOpen } from 'lucide-react';
import { getMapelColor } from '../../../utils/mapelColorHelper';
import { DropdownOption } from '../../../api/dropdown.api';
import { JadwalKBM } from '../../../api/attendance/jadwalKBM.api';

interface Props {
  kelasList: DropdownOption[];
  allJadwal: JadwalKBM[];
  masterGridHari: string;
  slots: number[];
}

export const MasterGridKelasTimetable: React.FC<Props> = ({
  kelasList,
  allJadwal,
  masterGridHari,
  slots,
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="min-w-[1200px]">
        {/* Table Header */}
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

        {/* Rows per Class */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {kelasList.map((kelas) => {
            return (
              <div
                key={kelas.value}
                className="grid hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                style={{ gridTemplateColumns: `180px repeat(${slots.length}, minmax(0, 1fr))` }}
              >
                {/* Class Name Column */}
                <div className="p-2.5 border-r border-slate-200 dark:border-slate-800 flex items-center">
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {kelas.label}
                  </span>
                </div>

                {/* Slot Cells */}
                {slots.map((slotIdx) => {
                  const item = allJadwal.find(
                    (j) => j.kelas_id === kelas.value && j.hari === masterGridHari && j.slot_index === slotIdx
                  );
                  const mapelStyle = item ? getMapelColor(item.Mapel?.nama_mapel || item.jenis_kegiatan || '') : null;

                  return (
                    <div
                      key={slotIdx}
                      className="p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 min-h-[52px] flex items-center justify-center"
                    >
                      {item ? (
                        <div
                          className={`w-full h-full p-1.5 rounded-xl border border-l-4 flex flex-col justify-center text-center transition-all ${mapelStyle?.bg} ${mapelStyle?.border}`}
                          style={{ borderLeftColor: mapelStyle?.dotHex }}
                          title={`${item.Mapel?.nama_mapel || item.jenis_kegiatan} - ${item.Guru?.nama_guru || 'Guru'}`}
                        >
                          <span className="font-extrabold text-[9px] text-slate-800 dark:text-slate-100 truncate">
                            {item.Mapel?.nama_mapel || item.jenis_kegiatan}
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
};
