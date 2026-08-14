import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  LayoutGrid, 
  ListOrdered, 
  ChevronRight,
  CalendarDays,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { JadwalGrid } from '../../kurikulum/JadwalGrid';
import { cn } from '../../../lib/utils';
import { 
  useStaffWeeklySchedule, 
  ACADEMIC_WORKDAYS, 
  ACADEMIC_DAY_LABELS, 
  type AcademicDayName 
} from '../../../hooks/attendance/useStaffWeeklySchedule';

interface StaffWeeklyScheduleWidgetProps {
  onNavigateToKbm?: () => void;
  className?: string;
}

export const StaffWeeklyScheduleWidget: React.FC<StaffWeeklyScheduleWidgetProps> = ({
  onNavigateToKbm,
  className
}) => {
  const {
    viewMode,
    setViewMode,
    selectedDay,
    setSelectedDay,
    todayDayName,
    rawSchedules,
    dailyJpCounts,
    totalWeeklyJp,
    activeDayBlocks,
    activeDayJp,
    isLoading,
  } = useStaffWeeklySchedule();

  return (
    <div className={cn("p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5", className)}>
      
      {/* ── TOP HEADER & VIEW MODE CONTROLS ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Jadwal Mengajar 1 Minggu
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total beban mengajar semester aktif: <span className="font-black text-blue-600 dark:text-blue-400">{totalWeeklyJp} JP / Minggu</span>
          </p>
        </div>

        {/* Segmented View Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === 'agenda'
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <ListOrdered size={14} />
            <span>Agenda Hari</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              viewMode === 'grid'
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <LayoutGrid size={14} />
            <span>Matriks Grid</span>
          </button>
        </div>
      </div>

      {/* ── MODE 1: AGENDA PER HARI ────────────────────────────────────────── */}
      {viewMode === 'agenda' ? (
        <div className="space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {ACADEMIC_WORKDAYS.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = todayDayName === day;
              const dayJp = dailyJpCounts[day] || 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border",
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{ACADEMIC_DAY_LABELS[day]}</span>
                  {isToday && (
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider",
                      isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    )}>
                      Hari Ini
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    isSelected 
                      ? "bg-white text-blue-700" 
                      : dayJp > 0 
                        ? "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {dayJp > 0 ? `${dayJp} JP` : 'Libur'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Schedule List for Selected Day */}
          <div className="space-y-3 pt-1">
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
                ))}
              </div>
            ) : activeDayBlocks.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                    <span>Daftar Sesi Mengajar Hari {ACADEMIC_DAY_LABELS[selectedDay]}</span>
                    <span className="text-blue-600 dark:text-blue-400">{activeDayJp} Jam Pelajaran (JP)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {activeDayBlocks.map((block, idx) => (
                      <div
                        key={`${block.id}-${idx}`}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-blue-400/50 transition-all flex flex-col justify-between gap-3 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 flex items-center gap-1.5">
                              <Clock size={12} />
                              <span>{block.jam_mulai} - {block.jam_selesai} WIB</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                              {block.jpCount} JP (Slot {block.slot_mulai} - {block.slot_selesai})
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {block.kelas_nama} — {block.mapel_nama}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Sifat: {block.jenis_kegiatan}</span>
                              {block.mapel_kode && <span>• Kode: {block.mapel_kode}</span>}
                            </p>
                          </div>
                        </div>

                        {selectedDay === todayDayName && onNavigateToKbm && (
                          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex justify-end">
                            <button
                              type="button"
                              onClick={onNavigateToKbm}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Buka Presensi Hari Ini</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="py-10 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <CalendarDays size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Tidak Ada Jadwal Mengajar Hari {ACADEMIC_DAY_LABELS[selectedDay]}
                </h4>
                <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                  Anda tidak memiliki alokasi jam tatap muka KBM pada hari ini. Gunakan waktu untuk persiapan administrasi ajar.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── MODE 2: VISUAL MATRIX GRID FULL WEEK ───────────────────────────── */
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
            Matriks Visual Jadwal Mengajar Guru (Senin s/d Sabtu)
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <JadwalGrid
              jadwal={rawSchedules}
              readOnly={true}
              loading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};
