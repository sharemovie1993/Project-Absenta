import React, { useState, useMemo } from 'react';
import { Calendar, Sparkles, Clock, X, User, BookOpen, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { WORKDAYS_HARI_KEYS, getDayLabel, getDayShortLabel } from '@/constants/day.constants';
import { getJadwalKBM, getMyJadwalKBM, type JadwalKBM } from '@/api/attendance/jadwalKBM.api';
import { useAuthStore } from '@/store/authStore';

interface StudentWeeklyScheduleWidgetProps {
  kelasId?: string;
  kelasNama?: string;
  className?: string;
}

const ALL_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const StudentWeeklyScheduleWidget: React.FC<StudentWeeklyScheduleWidgetProps> = ({
  kelasId,
  kelasNama: propKelasNama,
  className,
}) => {
  const { user } = useAuthStore();
  const effectiveKelasId = kelasId || (user as any)?.siswa_profile?.kelas_id || (user as any)?.kelas_id;
  const effectiveKelasNama = propKelasNama || (user as any)?.siswa_profile?.Kelas?.nama_kelas || (user as any)?.kelas_nama || 'Kelas';

  // Fetch Class Schedule (backend automatically scopes to student's class if role === SISWA)
  const { data: scheduleRes, isLoading } = useQuery({
    queryKey: ['jadwal-kbm', 'student-weekly', effectiveKelasId],
    queryFn: async () => {
      const filters: any = {};
      if (effectiveKelasId) filters.kelas_id = effectiveKelasId;
      const res = await getJadwalKBM(filters);
      return res;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const rawSchedules: JadwalKBM[] = useMemo(() => {
    const data = scheduleRes?.data ?? scheduleRes;
    const list: JadwalKBM[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
    return list;
  }, [scheduleRes]);

  // Selected cell item for popup modal
  const [selectedItem, setSelectedItem] = useState<{
    item: any;
    day: string;
    slot: number;
    colSpan: number;
  } | null>(null);

  // Filter day for mobile convenience
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  // Compute maximum slot index used in this class schedule
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

  // Total JP Belajar Seminggu
  const totalWeeklyJp = useMemo(() => {
    return rawSchedules.filter((s) => Boolean(s.mapel_id || s.jenis_kegiatan)).length;
  }, [rawSchedules]);

  // Merge consecutive slots for the same subject & unit & teacher
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

      let colSpan = 1;
      let finalEnd = item.jam_selesai;
      let nextIndex = i + 1;
      while (nextIndex < activeSlots.length) {
        const nextSlot = activeSlots[nextIndex];
        const nextItem = slotMap.get(`${day}_${nextSlot}`);

        if (
          nextItem &&
          String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
          String(nextItem.unit_pengajaran_id || '') === String(item.unit_pengajaran_id || '') &&
          String(nextItem.guru_id || '') === String(item.guru_id || '') &&
          String(nextItem.guru_pelaksana_id || '') === String(item.guru_pelaksana_id || '') &&
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
        item: { ...item, jam_selesai_merged: finalEnd },
      });
    }

    return cells;
  };

  // Color generator based on mapel name
  const getMapelColor = (name: string = '') => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themes = [
      'bg-indigo-600 dark:bg-indigo-500 text-white',
      'bg-blue-600 dark:bg-blue-500 text-white',
      'bg-teal-600 dark:bg-teal-500 text-white',
      'bg-emerald-600 dark:bg-emerald-500 text-white',
      'bg-violet-600 dark:bg-violet-500 text-white',
      'bg-amber-600 dark:bg-amber-500 text-white',
      'bg-rose-600 dark:bg-rose-500 text-white',
      'bg-cyan-600 dark:bg-cyan-500 text-white',
    ];
    return themes[hash % themes.length];
  };

  const displayedDays = useMemo(() => {
    if (selectedDayFilter === 'ALL') return WORKDAYS_HARI_KEYS;
    return WORKDAYS_HARI_KEYS.filter((d) => d === selectedDayFilter);
  }, [selectedDayFilter]);

  return (
    <div className={cn("p-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4", className)}>
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Jadwal Pelajaran Kelas {effectiveKelasNama}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Matriks Mingguan Pelajaran &amp; Pengajar Kelas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
          <div className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-black">
            Beban: {totalWeeklyJp} JP / Minggu
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
            <Sparkles size={12} className="text-indigo-500" />
            <span>Senin — Sabtu</span>
          </div>
        </div>
      </div>

      {/* ── DAY FILTER CHIPS (MOBILE FRIENDLY) ────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedDayFilter('ALL')}
          className={cn(
            "px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer",
            selectedDayFilter === 'ALL'
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
          )}
        >
          Semua Hari
        </button>
        {WORKDAYS_HARI_KEYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDayFilter(day)}
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer",
              selectedDayFilter === day
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            )}
          >
            {getDayLabel(day)}
          </button>
        ))}
      </div>

      {/* ── RESPONSIVE COMPACT MATRIX GRID ────────────────────────────── */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden overflow-x-auto">
        <div style={{ minWidth: activeSlots.length > 8 ? '720px' : '100%' }}>
          
          {/* Header Row (Slots 1 to N) */}
          <div
            className="grid border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/70 text-center text-xs font-black text-slate-600 dark:text-slate-300"
            style={{ gridTemplateColumns: `36px repeat(${activeSlots.length}, minmax(0, 1fr))` }}
          >
            <div className="p-1 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[9px] uppercase font-black text-slate-400">
              HARI
            </div>
            {activeSlots.map((slot) => (
              <div key={slot} className="p-1.5 sm:p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                <span className="text-[10px] sm:text-[11px] font-black text-slate-800 dark:text-slate-200">
                  <span className="hidden sm:inline">JAM </span>{slot}
                </span>
              </div>
            ))}
          </div>

          {/* Body Rows */}
          <div>
            {isLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
                Memuat data jadwal pelajaran kelas...
              </div>
            ) : rawSchedules.length === 0 ? (
              <div className="p-12 text-center text-xs font-medium text-slate-400">
                Jadwal pelajaran untuk kelas ini belum dikonfigurasi oleh tim Kurikulum.
              </div>
            ) : (
              displayedDays.map((day) => {
                const mergedCells = getMergedSlotsForDay(day);

                return (
                  <div
                    key={day}
                    className="grid border-b last:border-b-0 border-slate-200/80 dark:border-slate-800/60"
                    style={{ gridTemplateColumns: `36px repeat(${activeSlots.length}, minmax(0, 1fr))` }}
                  >
                    {/* Day Column */}
                    <div className="p-1 bg-slate-100/70 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center select-none overflow-hidden">
                      <span className="transform -rotate-90 font-black text-[9px] text-slate-700 dark:text-slate-300 tracking-wider whitespace-nowrap uppercase leading-none">
                        {getDayShortLabel(day)}
                      </span>
                    </div>

                    {/* Slot Cells */}
                    {mergedCells.map(({ slot, colSpan, item }) => {
                      const mapelNama = item?.Mapel?.nama_mapel || item?.mapel_nama || item?.jenis_kegiatan || 'Mapel';
                      const guruNama = item?.GuruPelaksana?.nama_guru || item?.Guru?.nama_guru || item?.guru_nama || 'Guru';
                      const unitNama = item?.UnitPengajaran?.nama_unit || item?.unit_nama || null;

                      return (
                        <div
                          key={`${day}-${slot}`}
                          className="p-0.5 sm:p-1 border-r last:border-r-0 border-slate-200/60 dark:border-slate-800/40 min-h-[64px] sm:min-h-[78px] flex"
                          style={{ gridColumn: `span ${colSpan}` }}
                        >
                          {item ? (
                            <button
                              type="button"
                              onClick={() => setSelectedItem({ item, day, slot, colSpan })}
                              className="w-full h-full rounded-lg sm:rounded-xl p-1 sm:p-1.5 bg-gradient-to-br from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col justify-between items-center text-center shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer group overflow-hidden"
                            >
                              {/* BARIS 1: NAMA MATA PELAJARAN */}
                              <div className="w-full flex items-center justify-center">
                                <span className={cn(
                                  "w-full px-1 py-0.5 rounded text-[8px] sm:text-[9.5px] font-black truncate text-center leading-none shadow-2xs",
                                  getMapelColor(mapelNama)
                                )}>
                                  {mapelNama}
                                </span>
                              </div>

                              {/* BARIS 2: WAKTU */}
                              <div className="w-full flex items-center justify-center my-auto py-0.5">
                                {colSpan >= 3 ? (
                                  <div className="px-1.5 py-0.5 rounded bg-indigo-100/70 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 font-mono text-[9px] font-black tracking-tight whitespace-nowrap text-center">
                                    {item.jam_mulai} - {item.jam_selesai_merged || item.jam_selesai}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center leading-none py-0.5 px-1 rounded bg-indigo-100/75 dark:bg-indigo-950/75 border border-indigo-200/70 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 font-mono">
                                    <span className="text-[8px] sm:text-[9.5px] font-black tracking-tight leading-none">
                                      {item.jam_mulai}
                                    </span>
                                    <span className="text-[7.5px] sm:text-[8.5px] font-bold text-indigo-600 dark:text-indigo-400 tracking-tight leading-none mt-0.5">
                                      {item.jam_selesai_merged || item.jam_selesai}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* BARIS 3: GURU & UNIT */}
                              <div className="w-full flex flex-col items-center justify-center leading-none">
                                <p className="text-[7.5px] sm:text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate w-full">
                                  {guruNama}
                                </p>
                                {unitNama && (
                                  <span className="inline-block mt-0.5 px-1 py-0.2 rounded text-[7px] sm:text-[8px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 truncate max-w-full">
                                    {unitNama}
                                  </span>
                                )}
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
      </div>

      {/* ── MODAL POPUP DETAIL (WHEN STUDENT TAPS ANY SLOT CELL) ────────── */}
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
                  getMapelColor(selectedItem.item.Mapel?.nama_mapel || selectedItem.item.mapel_nama)
                )}>
                  {selectedItem.item.Mapel?.nama_mapel || selectedItem.item.mapel_nama || selectedItem.item.jenis_kegiatan}
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

            <div className="space-y-3">
              {/* Unit Tag if any */}
              {(selectedItem.item.UnitPengajaran?.nama_unit || selectedItem.item.unit_nama) && (
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Unit Pengajaran / Elemen</p>
                    <p className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                      {selectedItem.item.UnitPengajaran?.nama_unit || selectedItem.item.unit_nama}
                    </p>
                  </div>
                </div>
              )}

              {/* Guru Pengampu */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Guru Pengampu</p>
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {selectedItem.item.GuruPelaksana?.nama_guru || selectedItem.item.Guru?.nama_guru || selectedItem.item.guru_nama || 'Guru Pengampu'}
                  </p>
                </div>
              </div>

              {/* Waktu & Alokasi JP */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alokasi Waktu</p>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {selectedItem.colSpan} Jam Pelajaran (JP)
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    Slot Jam ke-{selectedItem.slot} {selectedItem.colSpan > 1 ? `s/d ${selectedItem.slot + selectedItem.colSpan - 1}` : ''}
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam Pembelajaran</p>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {selectedItem.item.jam_mulai || '-'} - {selectedItem.item.jam_selesai_merged || selectedItem.item.jam_selesai || '-'}
                  </p>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    WIB
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-extrabold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
