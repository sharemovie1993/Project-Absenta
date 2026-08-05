
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../ui';
import { Clock, Plus, BookOpen, User, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type JadwalKBM } from '../../api/attendance/jadwalKBM.api';
import { getMyTenant } from '../../api/tenants.api';
import { cn } from '../../lib/utils';
import { getSlotsForDay } from './jam-kbm/JamKBMTypes';

interface JadwalGridProps {
  jadwal: JadwalKBM[];
  onAddSlot?: (day: string, slot: number) => void;
  onEditSlot?: (item: JadwalKBM) => void;
  onDeleteSlot?: (id: string) => void;
  loading?: boolean;
  readOnly?: boolean;
  selectedKelasId?: string;
}

import { WORKDAYS_HARI_KEYS as DAYS } from '../../constants/day.constants';
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1); // 12 Jam Pelajaran

// Mock time mapping for slots
const SLOT_TIME: Record<number, string> = {
  1: "07:00 - 07:45",
  2: "07:45 - 08:30",
  3: "08:30 - 09:15",
  4: "09:35 - 10:20", // After break
  5: "10:20 - 11:05",
  6: "11:05 - 11:50",
  7: "12:30 - 13:15", // After lunch
  8: "13:15 - 14:00",
  9: "14:00 - 14:45",
  10: "14:45 - 15:30",
  11: "15:30 - 16:15",
  12: "16:15 - 17:00",
};

export const JadwalGrid: React.FC<JadwalGridProps> = ({ 
  jadwal, 
  onAddSlot, 
  onEditSlot, 
  onDeleteSlot,
  loading,
  readOnly = false,
  selectedKelasId
}) => {
  
  // Shift config states
  const [shiftJamPelajaran, setShiftJamPelajaran] = useState<any>(null);
  const [hariSekolah, setHariSekolah] = useState<string[]>(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);

  useEffect(() => {
    const fetchTenantShift = async () => {
      try {
        const tenantRes = await getMyTenant();
        if (tenantRes?.success) {
          if (tenantRes.data?.shift_jam_pelajaran) {
            setShiftJamPelajaran(tenantRes.data.shift_jam_pelajaran);
          }
          if (Array.isArray(tenantRes.data?.hari_sekolah) && tenantRes.data.hari_sekolah.length > 0) {
            const order = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
            const sortedDays = [...tenantRes.data.hari_sekolah].sort((a, b) => order.indexOf(a) - order.indexOf(b));
            setHariSekolah(sortedDays);
          }
        }
      } catch (err) {
        console.error('Failed to load shift jam pelajaran config:', err);
      }
    };
    fetchTenantShift();
  }, []);

  // Resolve slot time dynamically based on day and class shift assignment
  const resolveSlotTime = (day: string, targetKelasId: string, slotIndex: number): { start: string; end: string } => {
    if (shiftJamPelajaran) {
      const assignedShiftId = shiftJamPelajaran.class_assignments?.[targetKelasId] || 'pagi';
      const shift = shiftJamPelajaran.shifts?.find((s: any) => s.id === assignedShiftId) || shiftJamPelajaran.shifts?.[0];
      if (shift) {
        const slotsForDay = getSlotsForDay(shift, day);
        const slot = slotsForDay.find((sl: any) => sl.slot === slotIndex);
        if (slot) {
          return { start: slot.start, end: slot.end };
        }
      }
    }
    const mockVal = SLOT_TIME[slotIndex] || "07:00 - 07:45";
    const parts = mockVal.split(' - ');
    return { start: parts[0], end: parts[1] };
  };

  // O(1) Memoized Slot Lookup Map for Google Enterprise performance
  const slotMap = React.useMemo(() => {
    const map = new Map<string, JadwalKBM>();
    for (let i = 0; i < jadwal.length; i++) {
      const j = jadwal[i];
      if (!j.hari || j.slot_index == null) continue;
      if (j.kelas_id) {
        map.set(`${j.hari}_${j.slot_index}_${j.kelas_id}`, j);
      }
      map.set(`${j.hari}_${j.slot_index}`, j);
    }
    return map;
  }, [jadwal]);

  const getSlotData = (day: string, slotIndex: number) => {
    if (selectedKelasId) {
      return slotMap.get(`${day}_${slotIndex}_${selectedKelasId}`) || slotMap.get(`${day}_${slotIndex}`);
    }
    return slotMap.get(`${day}_${slotIndex}`);
  };

  const getSlotVisualInfo = (day: string, slotIndex: number) => {
    const item = getSlotData(day, slotIndex);
    if (!item) return { type: 'empty' };

    // Check if there is a previous slot on the same day for the same class, teacher, subject
    const isContinuation = (() => {
      if (slotIndex <= 1) return false;
      const prevItem = getSlotData(day, slotIndex - 1);
      if (!prevItem) return false;
      return (
        String(prevItem.kelas_id || '') === String(item.kelas_id || '') &&
        String(prevItem.guru_id || '') === String(item.guru_id || '') &&
        String(prevItem.mapel_id || '') === String(item.mapel_id || '') &&
        String(prevItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
      );
    })();

    if (isContinuation) {
      return { type: 'continuation', parent: item };
    }

    // It is the start of a block. Let's find how many hours it lasts (JP count)
    // and what the final end time is.
    let jpCount = 1;
    let finalEnd = item.jam_selesai;
    let nextSlotIndex = slotIndex + 1;
    while (nextSlotIndex <= 10) {
      const nextItem = getSlotData(day, nextSlotIndex);
      if (
        nextItem &&
        String(nextItem.kelas_id || '') === String(item.kelas_id || '') &&
        String(nextItem.guru_id || '') === String(item.guru_id || '') &&
        String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
        String(nextItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
      ) {
        jpCount++;
        finalEnd = nextItem.jam_selesai;
        nextSlotIndex++;
      } else {
        break;
      }
    }

    return { type: 'start', item, jpCount, finalEnd };
  };

  const getMergedSlotsForDay = (day: string) => {
    const cells: { slot: number; colSpan: number; item: any }[] = [];
    let skipCount = 0;

    for (let i = 0; i < SLOTS.length; i++) {
      if (skipCount > 0) {
        skipCount--;
        continue;
      }

      const slot = SLOTS[i];
      const item = getSlotData(day, slot);

      if (!item) {
        cells.push({ slot, colSpan: 1, item: null });
        continue;
      }

      // Look ahead to see how many consecutive slots have the same class, teacher, subject
      let colSpan = 1;
      let nextIdx = i + 1;
      while (nextIdx < SLOTS.length) {
        const nextSlot = SLOTS[nextIdx];
        const nextItem = getSlotData(day, nextSlot);

        if (
          nextItem &&
          String(nextItem.kelas_id || '') === String(item.kelas_id || '') &&
          String(nextItem.guru_id || '') === String(item.guru_id || '') &&
          String(nextItem.mapel_id || '') === String(item.mapel_id || '') &&
          String(nextItem.jenis_kegiatan || '').toUpperCase() === String(item.jenis_kegiatan || '').toUpperCase()
        ) {
          colSpan++;
          nextIdx++;
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
    <div className="w-full overflow-x-auto max-h-[764px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="min-w-[1000px]">
        {/* Header Days */}
        <div className="grid border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20" style={{ gridTemplateColumns: `120px repeat(${SLOTS.length}, minmax(0, 1fr))` }}>
          <div className="p-2 bg-gray-50 dark:bg-slate-800/50 border-r border-gray-200 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400 text-xs text-center flex items-center justify-center">
            HARI / WAKTU
          </div>
          {SLOTS.map(slot => {
            return (
              <div 
                key={slot} 
                className="p-2 bg-gray-50 dark:bg-slate-800/50 font-bold text-center border-r last:border-r-0 border-gray-200 dark:border-gray-800 flex flex-col justify-center items-center"
              >
                <div className="text-[10px] text-gray-900 dark:text-white uppercase font-black">JAM {slot}</div>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        <div className="relative">
          {hariSekolah.map(day => {
            const mergedCells = getMergedSlotsForDay(day);

            return (
              <div 
                key={day} 
                className="grid border-b last:border-b-0 border-gray-100 dark:border-gray-800/50 group"
                style={{ gridTemplateColumns: `120px repeat(${SLOTS.length}, minmax(0, 1fr))` }}
              >
                {/* Day name column */}
                <div className="p-2 bg-gray-50/50 dark:bg-slate-800/20 border-r border-gray-200 dark:border-gray-800 flex items-center justify-center font-black text-xs text-gray-700 dark:text-gray-300">
                  {day}
                </div>

                {/* Merged Cells */}
                {mergedCells.map(({ slot, colSpan, item }) => {
                  return (
                    <div 
                      key={`${day}-${slot}`} 
                      className={cn(
                        "p-1 border-r last:border-r-0 border-gray-100 dark:border-gray-800/50 min-h-[54px] transition-colors relative flex"
                      )}
                      style={{ gridColumn: `span ${colSpan}` }}
                    >
                      <AnimatePresence mode="wait">
                        {item ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "w-full h-full rounded-xl p-3 border shadow-sm flex flex-col justify-between group/item transition-all duration-200 hover:shadow-md",
                              item.is_piket
                                ? "bg-gradient-to-br from-purple-900 to-indigo-900 text-white border-purple-500/40 shadow-md"
                                : item.jenis_kegiatan === 'KBM' 
                                  ? "bg-blue-50/55 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                  : "bg-amber-50/55 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30"
                            )}
                          >
                            <div className="w-full">
                              <div className="flex justify-between items-start mb-1 gap-1">
                                {item.is_piket ? (
                                  <Badge className="text-[9px] h-4 px-1.5 bg-amber-400 text-slate-900 font-black uppercase tracking-wider flex items-center gap-1 border-none">
                                    <ShieldCheck size={10} /> PIKET
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold uppercase truncate max-w-[80px]">
                                    {item.Kelas?.nama_kelas || item.jenis_kegiatan}
                                  </Badge>
                                )}
                                
                                {colSpan > 1 && (
                                  <Badge className={cn(
                                    "text-[8px] h-4 px-1 font-extrabold uppercase",
                                    item.is_piket ? "bg-purple-700/60 text-purple-100 border border-purple-400/30" : "bg-indigo-500/10 text-indigo-650 border-indigo-200/30"
                                  )}>
                                    {colSpan} JP
                                  </Badge>
                                )}

                                <div className="flex space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity ml-auto">
                                  {!readOnly && !item.is_piket && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); if (onEditSlot) onEditSlot(item); }} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-gray-400 hover:text-blue-500">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); if (onDeleteSlot) onDeleteSlot(item.id); }} className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-gray-400 hover:text-red-500">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {item.is_piket ? (
                                <div className="mt-1">
                                  <div className="text-xs font-black text-white leading-snug mb-0.5">
                                    TUGAS PIKET GURU
                                  </div>
                                  <div className="text-[10px] text-purple-200 font-bold">
                                    {item.pos_piket || 'Piket Umum'}
                                  </div>
                                  <div className="text-[9px] text-purple-300 font-mono mt-1">
                                    {item.jam_mulai} - {item.jam_selesai}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {item.Mapel && (
                                    <div className="text-xs font-bold text-gray-900 dark:text-white leading-snug mb-0.5 break-words">
                                      {item.Mapel.nama_mapel}
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <div className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 font-mono leading-none">
                                      {resolveSlotTime(day, item.kelas_id || '', slot).start} - {resolveSlotTime(day, item.kelas_id || '', slot + colSpan - 1).end}
                                    </div>
                                    {item.Guru && (
                                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                        <User className="w-2.5 h-2.5 mr-1 text-green-500 shrink-0" />
                                        <span className="truncate">{item.Guru.User?.full_name?.split(' ')[0]}</span>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        ) : (
                          <div className="w-full h-full rounded-xl border border-dashed border-gray-150 dark:border-slate-800/80 bg-gray-50/10 dark:bg-slate-900/5 hover:bg-gray-50/30 dark:hover:bg-slate-800/10 transition-colors flex items-center justify-center group/empty">
                            <span className="text-[9px] font-bold text-gray-300 dark:text-slate-700/80 uppercase tracking-wider group-hover/empty:text-gray-400 dark:group-hover/empty:text-slate-600 transition-colors select-none">
                              KOSONG
                            </span>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      )}
    </div>
  );
};
