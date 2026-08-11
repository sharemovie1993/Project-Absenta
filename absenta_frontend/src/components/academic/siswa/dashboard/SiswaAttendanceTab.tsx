import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, User, Clock, MapPin, CheckCircle2, Calendar, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnconnectedBadge, Modal } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { usePresensiTerpaduSesi } from '@/hooks/useAttendanceHooks';
import { SesiAttendanceList } from '@/components/attendance/sesi/SesiAttendanceList';

export interface SiswaAttendanceTabProps {
  gamification: {
    attendanceRate: number;
    [key: string]: any;
  };
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  selectedMonthFormatted: string;
  calendarGridData: {
    year: number;
    month: number;
    daysInMonth: number;
    firstDayIndex: number;
    days: Array<{ day: number; dateIso: string; isCurrentMonth?: boolean; dateStr?: string; status: string | null; rec?: any }>;
  };
  todayIso?: string;
  selectedDate?: string;
  onSelectDate?: (dateIso: string) => void;
  sessionAttendanceHistory?: Array<{
    id: string;
    date: string;
    waktu: string;
    status: string;
    metode?: string;
    keterangan?: string;
    sesi?: string;
    nama_guru?: string;
    status_guru?: string;
    waktu_guru?: string;
    sesi_id?: string;
  }>;
  todayKbmSchedule?: Array<{
    id: string;
    kode: string;
    mapel: string;
    guru: string;
    lokasi: string;
    jam: string;
    status: string;
  }>;
  isLoadingSchedule?: boolean;
  isApiConnected?: boolean;
  monthlyRecap?: any;
  dailyRecapRes?: any;
  kelasId?: string;
}

export const SiswaAttendanceTab: React.FC<SiswaAttendanceTabProps> = ({
  gamification,
  handlePrevMonth,
  handleNextMonth,
  selectedMonthFormatted,
  calendarGridData,
  todayIso = new Date().toISOString().slice(0, 10),
  selectedDate: propSelectedDate = '',
  onSelectDate,
  sessionAttendanceHistory = [],
  todayKbmSchedule = [],
  isLoadingSchedule = false,
  isApiConnected = true,
  monthlyRecap,
  dailyRecapRes,
  kelasId,
}) => {
  const { user } = useAuthStore();
  const attendanceRate = gamification?.attendanceRate ?? 100;
  const selectedDate = propSelectedDate || todayIso;
  const [selectedSesiModal, setSelectedSesiModal] = useState<{
    isOpen: boolean;
    sesiId?: string;
    sesiTitle?: string;
    guruName?: string;
    guruStatus?: string;
    guruWaktuTap?: string;
    waktuTap?: string;
  }>({ isOpen: false });

  // Purely fetch backend pre-calculated session attendance records via custom hook
  const { data: sesiAttendanceData, isLoading: isLoadingSesiDetails } = usePresensiTerpaduSesi(
    selectedSesiModal.sesiId,
    selectedSesiModal.isOpen
  );

  const formattedSelectedDateText = React.useMemo(() => {
    if (!selectedDate) return 'Hari Ini';
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROW 1: KALENDER PRESENSI & HISTORIS SESI ABSENSI (TOP GRID)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        
        {/* LEFT COLUMN: Kalender Presensi (col-span-12 lg:col-span-7 xl:col-span-7) */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-7 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Kalender Presensi {selectedMonthFormatted}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rekap status kehadiran harian di gerbang &amp; sesi sekolah
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {attendanceRate}% Kehadiran
                </span>

                {/* Month Navigation Buttons */}
                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-xs transition-all cursor-pointer select-none"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 shadow-xs transition-all cursor-pointer select-none"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <div>Min</div>
              <div>Sen</div>
              <div>Sel</div>
              <div>Rab</div>
              <div>Kam</div>
              <div>Jum</div>
              <div>Sab</div>
            </div>

            {/* Calendar Days Grid (Compact & Sleek Sizing) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: calendarGridData.firstDayIndex }).map((_, idx) => (
                <div key={`pad-${idx}`} className="h-9 sm:h-10 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-transparent opacity-30 pointer-events-none" />
              ))}

              {calendarGridData.days.map((item) => {
                const isToday = item.dateIso === todayIso;
                const isSelected = item.dateIso === selectedDate;
                const st = item.status;
                const isHadir = st === 'HADIR' || st === 'TEPAT_WAKTU';
                const isTerlambat = st === 'TERLAMBAT';
                const isIzinSakit = st === 'IZIN' || st === 'SAKIT';
                const isAlpa = st === 'ALPA';

                return (
                  <div
                    key={item.dateIso}
                    onClick={() => onSelectDate && onSelectDate(item.dateIso)}
                    className={cn(
                      "h-9 sm:h-10 rounded-xl p-1 border flex flex-col items-center justify-center gap-0.5 relative transition-all cursor-pointer group select-none",
                      isSelected && !isToday && "ring-2 ring-blue-500/80 border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold",
                      isToday
                        ? "bg-emerald-500/15 border-emerald-500/80 text-emerald-700 dark:text-emerald-300 shadow-sm ring-2 ring-emerald-500/30 font-black"
                        : !isSelected && "bg-slate-50/90 dark:bg-slate-950/70 border-slate-200/70 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-extrabold leading-none",
                      isToday && "text-emerald-600 dark:text-emerald-400 font-black",
                      isSelected && !isToday && "text-blue-600 dark:text-blue-400 font-black"
                    )}>
                      {item.day}
                    </span>

                    <div className="flex items-center justify-center h-1.5">
                      {isHadir && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" title="Hadir" />
                      )}
                      {isTerlambat && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" title="Terlambat" />
                      )}
                      {isIzinSakit && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30" title="Izin / Sakit" />
                      )}
                      {isAlpa && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30" title="Alpa" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Legend */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Hadir</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Izin / Sakit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Alpa</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Historis Sesi Absensi (col-span-12 lg:col-span-5 xl:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-5 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Historis Sesi Absensi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Catatan riwayat presensi sesi KBM &amp; pintu gerbang
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono shrink-0 border border-slate-200 dark:border-slate-700">
                {formattedSelectedDateText}
              </span>
            </div>

            <div className="space-y-3 pt-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {sessionAttendanceHistory.length > 0 ? (
                sessionAttendanceHistory.map((item) => {
                  const isHadir = item.status === 'HADIR' || item.status === 'TEPAT_WAKTU';
                  const isTerlambat = item.status === 'TERLAMBAT';
                  const isSakit = item.status === 'SAKIT' || item.status === 'IZIN';
                  const isAlpa = item.status === 'ALPA';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const targetId = (item as any).sesi_id || (item as any).sesi_absensi_id || item.id;
                        setSelectedSesiModal({
                          isOpen: true,
                          sesiId: targetId,
                          sesiTitle: item.sesi || 'Sesi KBM',
                          guruName: item.nama_guru || (item as any).guru || 'Guru Pengajar',
                          guruStatus: item.status_guru === 'BELUM_ABSEN' ? 'BELUM_TAP' : (item.status_guru || 'HADIR'),
                          guruWaktuTap: (item as any).waktu_guru || null,
                          waktuTap: item.waktu
                        });
                      }}
                      className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 space-y-2 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md cursor-pointer transition-all group"
                      title="Klik untuk melihat rincian presensi teman sekelas"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 truncate max-w-[200px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {item.sesi}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                            <Eye size={11} /> Lihat Presensi
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.metode && item.metode !== '-' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                              {item.metode}
                            </span>
                          )}
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black border",
                            isHadir && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                            isTerlambat && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                            isSakit && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                            isAlpa && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          )}>
                            {isHadir ? 'Hadir' : isTerlambat ? 'Terlambat' : isSakit ? 'Izin / Sakit' : 'Alpa'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 font-mono font-extrabold text-slate-900 dark:text-white">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>Waktu Tap: {item.waktu}</span>
                        </div>

                        {item.nama_guru && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <User size={12} className="text-slate-400 shrink-0" />
                            <span>Guru: {item.nama_guru}</span>
                            {item.status_guru === 'HADIR' ? (
                              <span className="ml-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">(Guru Hadir)</span>
                            ) : item.status_guru === 'BELUM_ABSEN' ? (
                              <span className="ml-1 text-[10px] font-medium text-slate-400">(Belum Absen)</span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {item.keterangan && 
                        !['alpa', 'hadir', 'hadir tepat waktu', 'terlambat', 'terlambat mengikuti presensi', 'sakit/izin', 'sakit', 'izin', 'tepat waktu via gerbang / sesi presensi', 'izin / sakit terlampir via portal', 'belum ada catatan presensi dari wali kelas'].includes(item.keterangan.trim().toLowerCase()) && (
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                          {item.keterangan}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Calendar size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Belum ada riwayat sesi absensi pada tanggal ini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ROW 2: JADWAL JAM MASUK KELAS KBM HARI INI (BOTTOM FULL CARD)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Jadwal Jam Masuk Kelas KBM Hari Ini
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mata pelajaran dan ruang kelas yang harus diikuti hari ini
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0 self-start sm:self-auto font-mono">
            {todayKbmSchedule.length} Sesi Terjadwal
          </span>
        </div>

        {isLoadingSchedule ? (
          <div className="py-10 text-center text-xs font-semibold text-slate-400">
            Memuat jadwal KBM hari ini...
          </div>
        ) : todayKbmSchedule.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            {todayKbmSchedule.map((item) => {
              const isOngoing = item.status === 'Sedang Berlangsung';
              const isFinished = item.status === 'Selesai';

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border space-y-3 transition-all",
                    isOngoing
                      ? "bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20"
                      : isFinished
                      ? "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-80"
                      : "bg-slate-50/90 dark:bg-slate-950/70 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                      {item.kode}
                    </span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black border",
                      isOngoing
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                        : isFinished
                        ? "bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300/40 dark:border-slate-700/40"
                        : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                    )}>
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {item.mapel}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <User size={13} className="shrink-0 text-slate-400" />
                      <span className="truncate">{item.guru}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                    <span className="truncate flex items-center gap-1">
                      <MapPin size={12} className="shrink-0 text-slate-400" />
                      <span>{item.lokasi}</span>
                    </span>
                    <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100 shrink-0 flex items-center gap-1">
                      <Clock size={12} className="shrink-0 text-slate-400" />
                      <span>{item.jam}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Tidak ada jadwal KBM untuk hari ini.
            </p>
          </div>
        )}
      </div>

      {/* Read-Only Session Attendance Modal for Students */}
      <Modal
        isOpen={selectedSesiModal.isOpen}
        onClose={() => setSelectedSesiModal({ isOpen: false })}
        title={`Presensi Kelas — ${selectedSesiModal.sesiTitle || 'Sesi KBM'}`}
        size="5xl"
      >
        <div className="p-2 space-y-3">
          {isLoadingSesiDetails ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Memuat rincian presensi kelas...</p>
            </div>
          ) : (
            <SesiAttendanceList
              records={(sesiAttendanceData as any) || []}
              sesi={{
                id: selectedSesiModal.sesiId || '',
                status: 'SELESAI',
                nama_guru: selectedSesiModal.guruName || 'Guru Pengajar',
                guru_status: selectedSesiModal.guruStatus || 'HADIR',
                waktu_tap_guru: selectedSesiModal.guruWaktuTap || null,
                Guru: {
                  id: 'guru-sesi-selected',
                  nama_guru: selectedSesiModal.guruName || 'Guru Pengajar'
                }
              }}
              isReportMode={true}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
