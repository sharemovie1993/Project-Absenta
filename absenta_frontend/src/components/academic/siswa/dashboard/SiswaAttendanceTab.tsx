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
                  Presensi &amp; Jadwal KBM
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Status presensi pintu gerbang &amp; sesi KBM kelas hari ini
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
                          guruStatus: item.status_guru === 'BELUM_ABSEN' ? 'BELUM_TAP' : (item.status_guru || 'BELUM_TAP'),
                          guruWaktuTap: (item as any).waktu_guru || null,
                          waktuTap: item.waktu
                        });
                      }}
                      className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 space-y-2 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md cursor-pointer transition-all group"
                      title="Klik untuk melihat rincian presensi teman sekelas"
                    >
                      {(() => {
                        const rawTitle = item.sesi || 'Sesi Presensi';
                        const displayTitle = rawTitle.replace(/^KBM\s*-\s*/i, '').trim() || rawTitle;

                        const isMendatang = (item.status === 'MENDATANG' || item.metode === 'Terjadwal') && item.status !== 'TERLEWAT';
                        const isBerlangsung = item.status === 'BERLANGSUNG';
                        const isTerlewat = item.status === 'TERLEWAT';
                        const isHadir = item.status === 'HADIR' || item.status === 'TEPAT_WAKTU';
                        const isTerlambat = item.status === 'TERLAMBAT';
                        const isSakit = item.status === 'SAKIT' || item.status === 'IZIN';
                        const isAlpa = item.status === 'ALPA' && !isMendatang && !isTerlewat;

                        return (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 truncate max-w-[220px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {displayTitle}
                                </span>
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                  <Eye size={11} /> Lihat Presensi
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.metode && item.metode !== '-' && item.metode !== 'Terjadwal' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                                    {item.metode}
                                  </span>
                                )}
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-black border",
                                  isHadir && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                                  isTerlambat && "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                                  isSakit && "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                                  isAlpa && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                                  isBerlangsung && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 animate-pulse",
                                  isTerlewat && "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                                  isMendatang && !isBerlangsung && !isTerlewat && "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300/40 dark:border-slate-700/40"
                                )}>
                                  {isHadir ? 'Hadir' : isTerlambat ? 'Terlambat' : isSakit ? 'Izin / Sakit' : isBerlangsung ? 'Sedang Berlangsung' : isTerlewat ? 'Terlewat' : isMendatang ? 'Belum Berlangsung' : 'Alpa'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300 pt-0.5">
                              {item.jamLabel && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 uppercase tracking-wider font-mono">
                                  {item.jamLabel}
                                </span>
                              )}

                              <div className="flex items-center gap-1.5 font-mono font-extrabold text-slate-800 dark:text-slate-200">
                                <Clock size={13} className="text-slate-400 shrink-0" />
                                <span>{item.waktu}</span>
                                {item.waktu_tap && (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                                    • Tap {item.waktu_tap}
                                  </span>
                                )}
                              </div>

                              {item.nama_guru && item.nama_guru !== 'Guru Pengampu' ? (
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  <User size={12} className="text-indigo-500 shrink-0" />
                                  <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[180px]">{item.nama_guru}</span>
                                  {(() => {
                                    const isGuruHadir = item.status_guru === 'HADIR' || item.status_guru === 'SUDAH_TAP' || item.status_guru === 'TEPAT_WAKTU';
                                    const isGuruTelat = item.status_guru === 'TERLAMBAT';
                                    const isGuruIzin = item.status_guru === 'IZIN' || item.status_guru === 'SAKIT';
                                    const isGuruDigantikan = item.status_guru === 'DIGANTIKAN';

                                    if (isGuruHadir) {
                                      return (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                          Guru Hadir
                                        </span>
                                      );
                                    }
                                    if (isGuruTelat) {
                                      return (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                          Guru Telat
                                        </span>
                                      );
                                    }
                                    if (isGuruIzin) {
                                      return (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                          Guru Izin
                                        </span>
                                      );
                                    }
                                    if (isGuruDigantikan) {
                                      return (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                          Guru Inval
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700/40">
                                        Guru Belum Tap
                                      </span>
                                    );
                                  })()}
                                </div>
                              ) : null}
                            </div>
                          </>
                        );
                      })()}
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

      {/* Read-Only Session Attendance Modal for Students */}
      {(() => {
        const computedRecords = Array.isArray(sesiAttendanceData) && sesiAttendanceData.length > 0
          ? sesiAttendanceData
          : (Array.isArray(monthlyRecap?.students) && monthlyRecap.students.length > 0
              ? [
                  {
                    id: 'guru-header-rec',
                    guru_id: 'guru-id-selected',
                    is_guru: true,
                    nama_siswa: selectedSesiModal.guruName || 'Guru Pengajar',
                    nisn: 'GURU',
                    status: selectedSesiModal.guruStatus || 'BELUM_TAP',
                    waktu_tap: selectedSesiModal.guruWaktuTap || null,
                    Guru: {
                      id: 'guru-id-selected',
                      nama_guru: selectedSesiModal.guruName || 'Guru Pengajar'
                    }
                  },
                  ...monthlyRecap.students.map((st: any) => ({
                    id: st.id || st.siswa_id,
                    siswa_id: st.siswa_id || st.id,
                    nama_siswa: st.nama_siswa || st.nama || '-',
                    nisn: st.nis || st.nisn || '-',
                    is_guru: false,
                    status: st.status || 'BELUM_TAP',
                    waktu_tap: null,
                    Siswa: {
                      id: st.siswa_id || st.id,
                      nama_siswa: st.nama_siswa || st.nama || '-',
                      nis: st.nis || st.nisn || '-'
                    }
                  }))
                ]
              : ((sesiAttendanceData as any) || [])
            );

        const teacherRecord = Array.isArray(computedRecords) ? (computedRecords as any[]).find(r => r.is_guru || r.nisn === 'GURU') : null;
        const effectiveGuruName = teacherRecord?.nama_siswa || teacherRecord?.Guru?.nama_guru || selectedSesiModal.guruName || 'Guru Pengajar';
        const effectiveGuruStatus = teacherRecord?.status || selectedSesiModal.guruStatus || 'BELUM_TAP';
        const effectiveGuruWaktuTap = teacherRecord?.waktu_tap || selectedSesiModal.guruWaktuTap || null;

        return (
          <Modal
            isOpen={selectedSesiModal.isOpen}
            onClose={() => setSelectedSesiModal({ isOpen: false })}
            title={`Presensi Kelas — ${selectedSesiModal.sesiTitle || 'Sesi KBM'}`}
            size="5xl"
          >
            <div className="p-2 space-y-3">
              {isLoadingSesiDetails && computedRecords.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Memuat rincian presensi kelas...</p>
                </div>
              ) : (
                <SesiAttendanceList
                  records={computedRecords}
                  sesi={{
                    id: selectedSesiModal.sesiId || '',
                    status: 'SELESAI',
                    nama_guru: effectiveGuruName,
                    guru_status: effectiveGuruStatus,
                    waktu_tap_guru: effectiveGuruWaktuTap,
                    Guru: {
                      id: 'guru-sesi-selected',
                      nama_guru: effectiveGuruName
                    }
                  }}
                  isReportMode={true}
                />
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
