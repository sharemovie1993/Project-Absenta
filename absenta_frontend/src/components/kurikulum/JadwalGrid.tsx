
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '../ui';
import { Clock, Plus, BookOpen, User, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type JadwalTemplate } from '../../api/attendance/jadwalTemplate.api';
import { getMyTenant } from '../../api/tenants.api';
import { cn } from '../../lib/utils';

interface JadwalGridProps {
  jadwal: JadwalTemplate[];
  onAddSlot?: (day: string, slot: number) => void;
  onEditSlot?: (item: JadwalTemplate) => void;
  onDeleteSlot?: (id: string) => void;
  loading?: boolean;
  readOnly?: boolean;
  selectedKelasId?: string;
}

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1); // 10 Jam Pelajaran

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

  useEffect(() => {
    const fetchTenantShift = async () => {
      try {
        const tenantRes = await getMyTenant();
        if (tenantRes?.success && tenantRes.data?.shift_jam_pelajaran) {
          setShiftJamPelajaran(tenantRes.data.shift_jam_pelajaran);
        }
      } catch (err) {
        console.error('Failed to load shift jam pelajaran config:', err);
      }
    };
    fetchTenantShift();
  }, []);

  // Resolve slot time dynamically based on the class shift assignment
  const resolveSlotTime = (targetKelasId: string, slotIndex: number): { start: string; end: string } => {
    if (shiftJamPelajaran) {
      const assignedShiftId = shiftJamPelajaran.class_assignments?.[targetKelasId] || 'pagi';
      const shift = shiftJamPelajaran.shifts?.find((s: any) => s.id === assignedShiftId) || shiftJamPelajaran.shifts?.[0];
      if (shift) {
        const slot = shift.slots?.find((sl: any) => sl.slot === slotIndex);
        if (slot) {
          return { start: slot.start, end: slot.end };
        }
      }
    }
    const mockVal = SLOT_TIME[slotIndex] || "07:00 - 07:45";
    const parts = mockVal.split(' - ');
    return { start: parts[0], end: parts[1] };
  };

  const getSlotData = (day: string, slotIndex: number) => {
    if (selectedKelasId) {
      const targetSlot = resolveSlotTime(selectedKelasId, slotIndex);
      return jadwal.find(j => 
        j.hari === day && 
        j.jam_mulai && j.jam_mulai.startsWith(targetSlot.start) &&
        j.kelas_id === selectedKelasId
      );
    } else {
      return jadwal.find(j => {
        if (j.hari !== day) return false;
        if (j.kelas_id) {
          const classSlot = resolveSlotTime(j.kelas_id, slotIndex);
          return j.jam_mulai && j.jam_mulai.startsWith(classSlot.start);
        }
        return false;
      });
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="min-w-[1000px]">
        {/* Header Days */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-r border-gray-200 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400 text-sm text-center">
            WAKTU
          </div>
          {DAYS.map(day => (
            <div key={day} className="p-4 bg-gray-50 dark:bg-slate-800/50 font-bold text-gray-900 dark:text-white text-sm text-center border-r last:border-r-0 border-gray-200 dark:border-gray-800">
              {day}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div className="relative">
          {SLOTS.map(slot => {
            const prevSlotIndex = slot > 1 ? slot - 1 : null;
            const prevSlot = prevSlotIndex && selectedKelasId ? resolveSlotTime(selectedKelasId, prevSlotIndex) : null;
            const currentSlot = selectedKelasId ? resolveSlotTime(selectedKelasId, slot) : null;
            const breakDuration = prevSlot && currentSlot && (() => {
              const toMins = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return (h || 0) * 60 + (m || 0);
              };
              return toMins(currentSlot.start) - toMins(prevSlot.end);
            })();

            return (
              <React.Fragment key={slot}>
                {breakDuration && breakDuration > 0 && (
                  <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800/80 bg-amber-50/10 dark:bg-amber-950/5">
                    <div className="p-2.5 border-r border-gray-200 dark:border-gray-800 flex items-center justify-center bg-amber-50/20 dark:bg-amber-950/10">
                      <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 tracking-wider">BREAK</span>
                    </div>
                    <div className="col-span-6 p-2.5 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400/85">
                      <span className="flex items-center gap-1.5">
                        ☕ Istirahat: {breakDuration} Menit ({prevSlot.end} - {currentSlot.start})
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-7 border-b last:border-b-0 border-gray-100 dark:border-gray-800/50 group">
                  {/* Time Column */}
                  <div className="p-4 bg-gray-50/50 dark:bg-slate-800/20 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center space-y-1">
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">JAM {slot}</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {selectedKelasId 
                        ? (() => {
                            const t = resolveSlotTime(selectedKelasId, slot);
                            return `${t.start} - ${t.end}`;
                          })()
                        : 'Dinamis'
                      }
                    </span>
                  </div>

                  {/* Day Columns */}
                  {DAYS.map(day => {
                    const item = getSlotData(day, slot);
                    
                    return (
                      <div 
                        key={`${day}-${slot}`} 
                        className={cn(
                          "p-2 border-r last:border-r-0 border-gray-100 dark:border-gray-800/50 min-h-[100px] transition-colors relative"
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {item ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={cn(
                                "h-full w-full rounded-xl p-3 border shadow-sm flex flex-col justify-between group/item",
                                item.jenis_kegiatan === 'KBM' 
                                  ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                  : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30"
                              )}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold uppercase truncate max-w-[80px]">
                                    {item.Kelas?.nama_kelas || item.jenis_kegiatan}
                                  </Badge>
                                  <div className="flex space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    {!readOnly && (
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
                                
                                {item.Mapel && (
                                  <>
                                    <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight mb-0.5">
                                      {item.Mapel.nama_mapel}
                                    </div>
                                    <div className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 font-mono mb-1 leading-none">
                                      {item.jam_mulai} - {item.jam_selesai}
                                    </div>
                                  </>
                                )}
                                {item.Guru && (
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center">
                                    <User className="w-2.5 h-2.5 mr-1 text-green-500" />
                                    {item.Guru.User?.full_name?.split(' ')[0]}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
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
