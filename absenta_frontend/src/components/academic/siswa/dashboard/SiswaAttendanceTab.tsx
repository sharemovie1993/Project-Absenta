import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, User, Clock, MapPin, CheckCircle2, Calendar, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnconnectedBadge, Modal } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { usePresensiTerpaduSesi } from '@/hooks/useAttendanceHooks';
import { SesiAttendanceList } from '@/components/attendance/sesi/SesiAttendanceList';
import { getTeacherStatusMeta, getSessionStatusMeta } from '@/utils/kbm-normalizer';
import { UniversalKbmCard } from '@/components/dashboard/shared/kbm/UniversalKbmCard';
import { PhotoPreviewModal } from '@/components/dashboard/shared/kbm/PhotoPreviewModal';

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

const SiswaSesiExpandedContent: React.FC<{ sesiId: string; sesi: any; monthlyRecap?: any }> = React.memo(({
  sesiId,
  sesi,
  monthlyRecap,
}) => {
  const { data: presensiRes, isLoading } = usePresensiTerpaduSesi(sesiId, Boolean(sesiId));

  const records = React.useMemo(() => {
    const raw = presensiRes?.data || presensiRes;
    const fetchedList = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
    if (fetchedList.length > 0) return fetchedList;
    if (Array.isArray(monthlyRecap?.students) && monthlyRecap.students.length > 0) {
      return monthlyRecap.students.map((st: any) => ({
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
      }));
    }
    return [];
  }, [presensiRes, monthlyRecap]);

  if (isLoading && records.length === 0) {
    return (
      <div className="py-8 text-center space-y-2">
        <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Memuat rincian presensi kelas...</p>
      </div>
    );
  }

  return (
    <div className="p-1 space-y-3">
      <SesiAttendanceList
        records={records}
        sesi={sesi}
        isReportMode={true}
      />
    </div>
  );
});

SiswaSesiExpandedContent.displayName = 'SiswaSesiExpandedContent';

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
  const [expandedSesiId, setExpandedSesiId] = useState<string | null>(null);
  const [previewPhotoData, setPreviewPhotoData] = useState<{
    photoUrl: string;
    guruNama?: string;
    kelasNama?: string;
    mapelNama?: string;
    timestamp?: string;
  } | null>(null);

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

            <div className="space-y-3 pt-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {sessionAttendanceHistory.length > 0 ? (
                sessionAttendanceHistory.map((item) => {
                  const isHadir = item.status === 'HADIR' || item.status === 'TEPAT_WAKTU';
                  const isTerlambat = item.status === 'TERLAMBAT';
                  const isSakit = item.status === 'SAKIT' || item.status === 'IZIN';
                  const isAlpa = item.status === 'ALPA';
                  const isStudentTapped = isHadir || isTerlambat || isSakit || isAlpa;
                  const targetId = (item as any).sesi_id || (item as any).sesi_absensi_id || item.id;
                  const isExpanded = expandedSesiId === targetId;

                  return (
                    <UniversalKbmCard
                      key={item.id}
                      mode="SISWA"
                      item={{
                        ...item,
                        mapel_nama: item.mapel || item.mapel_nama || (item.sesi ? item.sesi.replace(/^KBM\s*-\s*/i, '').trim() : '') || 'Sesi Pembelajaran',
                        guru_nama: item.nama_guru || (item as any).guru || 'Guru Pengampu',
                        guru_status: item.status_guru === 'BELUM_ABSEN' ? 'BELUM_TAP' : (item.status_guru || 'BELUM_TAP'),
                      }}
                      studentStatus={isStudentTapped ? (isHadir ? 'HADIR' : isTerlambat ? 'TERLAMBAT' : isSakit ? 'IZIN' : 'ALPA') : undefined}
                      studentWaktuTap={item.waktu_tap}
                      studentMetode={item.metode}
                      isExpanded={isExpanded}
                      onToggleExpand={() => setExpandedSesiId(isExpanded ? null : targetId)}
                      onViewPhoto={(it) => {
                        const pUrl = it.foto_kegiatan || it.foto_masuk || (it as any).session?.foto_kegiatan || (it as any).session?.foto_masuk || (it as any).AbsenGuru?.[0]?.foto_masuk;
                        if (pUrl) {
                          setPreviewPhotoData({
                            photoUrl: pUrl,
                            guruNama: it.guru_nama || (it as any).nama_guru || 'Guru Pengampu',
                            kelasNama: (it as any).kelas_nama || 'Kelas',
                            mapelNama: it.mapel_nama || (it as any).kegiatan || 'KBM',
                            timestamp: `${it.waktu || it.jam_mulai || ''} WIB`,
                          });
                        }
                      }}
                      expandedContent={
                        <SiswaSesiExpandedContent 
                          sesiId={targetId} 
                          sesi={item} 
                          monthlyRecap={monthlyRecap} 
                        />
                      }
                    />
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

      {/* Modal Preview Foto Lightbox untuk Siswa */}
      {previewPhotoData && (
        <PhotoPreviewModal
          isOpen={Boolean(previewPhotoData)}
          onClose={() => setPreviewPhotoData(null)}
          photoUrl={previewPhotoData.photoUrl}
          guruNama={previewPhotoData.guruNama}
          kelasNama={previewPhotoData.kelasNama}
          mapelNama={previewPhotoData.mapelNama}
          timestamp={previewPhotoData.timestamp}
        />
      )}
    </div>
  );
};
