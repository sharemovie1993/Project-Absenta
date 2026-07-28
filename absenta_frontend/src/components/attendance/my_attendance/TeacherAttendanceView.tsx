import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboardGuru } from '../../../api/attendanceGerbang.api';
import { TeacherAttendanceLeaderboardModal } from './TeacherAttendanceLeaderboardModal';
import {
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Award,
  BookOpen,
  Info,
  LogIn,
  LogOut,
  FileText,
  Trophy,
  Target
} from 'lucide-react';
import { Button, Badge, SectionCard, Loader } from '../../ui';
import { format, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { SharedVisualAttendanceCalendar } from '../SharedVisualAttendanceCalendar';
import { SharedAttendanceTimeline } from '../SharedAttendanceTimeline';


import {
  computeTeacherSessionStats,
  evaluateTeacherDisciplineAspects,
  getTeacherTimelineItemStyle
} from '../../../utils/attendance/teacherAttendance.utils';

interface TeacherAttendanceViewProps {
  user: any;
  currentDate: Date;
  selectedDate: string;
  rekap: any;
  detailMap: Map<string, any>;
  daysInMonth: Date[];
  handlePreviousMonth: () => void;
  handleNextMonth: () => void;
  setSelectedDate: (date: string) => void;
  teacherSessions?: any[];
  isTeacherSesiLoading?: boolean;
  teacherTrackingData?: any;
  isTeacherTrackingLoading?: boolean;
}

const STATUS_SHORT: Record<string, string> = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Telat',
  ALPA: 'Alpa',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  DISPEN: 'Dispen',
  BELUM: ''
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  HADIR: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60',
  TERLAMBAT: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/60',
  ALPA: 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60',
  SAKIT: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60',
  IZIN: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60',
  DISPEN: 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60',
  BELUM: ''
};

const STATUS_LABELS: Record<string, string> = {
  HADIR: 'Hadir Tepat Waktu',
  TERLAMBAT: 'Terlambat',
  ALPA: 'Alpa / Tanpa Keterangan',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  DISPEN: 'Dispensasi',
  BELUM: 'Belum Ada Data'
};

export const TeacherAttendanceView: React.FC<TeacherAttendanceViewProps> = ({
  user,
  currentDate,
  selectedDate,
  rekap,
  detailMap,
  daysInMonth,
  handlePreviousMonth,
  handleNextMonth,
  setSelectedDate,
  teacherSessions = [],
  isTeacherSesiLoading = false,
  teacherTrackingData,
  isTeacherTrackingLoading = false,
}) => {
  const [showTeacherLeaderboardModal, setShowTeacherLeaderboardModal] = useState(false);

  const { data: leaderboardRes, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ['teacher-discipline-leaderboard'],
    queryFn: () => getLeaderboardGuru(50),
    staleTime: 5 * 60 * 1000
  });


  const teacherLeaderboard = leaderboardRes?.data || [];

  const myRankIndex = React.useMemo(() => {
    if (!teacherLeaderboard || teacherLeaderboard.length === 0) return 1;
    const currentName = user?.name || rekap?.nama_guru || '';
    const idx = teacherLeaderboard.findIndex(t => t.id === user?.id || t.nama === currentName);
    return idx !== -1 ? idx + 1 : 1;
  }, [teacherLeaderboard, user, rekap]);

  const attendanceRate = rekap?.persentase_kehadiran ?? 100;
  const hadirCount = rekap?.statistik?.HADIR || 0;
  const terlambatCount = rekap?.statistik?.TERLAMBAT || 0;
  const izinCount = rekap?.statistik?.IZIN || 0;
  const sakitCount = rekap?.statistik?.SAKIT || 0;
  const dispenCount = rekap?.statistik?.DISPEN || 0;
  const alpaCount = rekap?.statistik?.ALPA || 0;

  const selectedDayDetail = React.useMemo(() => {
    if (!selectedDate) return null;
    const targetKey = selectedDate.slice(0, 10);
    if (detailMap.has(targetKey)) return detailMap.get(targetKey);
    const details = rekap?.detail || rekap?.details || [];
    if (Array.isArray(details)) {
      return details.find((d: any) => d.tanggal && String(d.tanggal).slice(0, 10) === targetKey) || null;
    }
    return null;
  }, [detailMap, selectedDate, rekap]);

  // Compute aggregated KBM stats via helper
  const { totalSesiHariIni, sesiHadirHariIni, firstSessionTapTime } = React.useMemo(
    () => computeTeacherSessionStats(teacherSessions),
    [teacherSessions]
  );

  // Single Source of Truth (SSOT) for Gate Taps & Final Daily Status
  const gateDatangItem = React.useMemo(() => {
    return teacherTrackingData?.kegiatan?.find((k: any) => k.jenis_kegiatan?.includes('Datang')) || null;
  }, [teacherTrackingData]);

  const gatePulangItem = React.useMemo(() => {
    return teacherTrackingData?.kegiatan?.find((k: any) => k.jenis_kegiatan?.includes('Pulang')) || null;
  }, [teacherTrackingData]);

  const jamMasukDisplay = gateDatangItem?.waktu || selectedDayDetail?.jam_masuk || selectedDayDetail?.waktu_tap || firstSessionTapTime;
  const jamPulangDisplay = gatePulangItem?.waktu || selectedDayDetail?.jam_pulang || selectedDayDetail?.waktu_tap_pulang;
  const rawStatusFinal = (teacherTrackingData?.status || selectedDayDetail?.status || (jamMasukDisplay ? 'HADIR' : 'BELUM')).toUpperCase();


  // Compute 2-Aspect evaluation via helper
  const aspects = React.useMemo(
    () =>
      evaluateTeacherDisciplineAspects({
        jamMasukDisplay,
        jamPulangDisplay,
        rawStatusFinal,
        totalSesiHariIni,
        sesiHadirHariIni,
      }),
    [jamMasukDisplay, jamPulangDisplay, rawStatusFinal, totalSesiHariIni, sesiHadirHariIni]
  );

  return (
    <div className="space-y-6">
      {/* 1. HEADER CARD: RINGKASAN KEHADIRAN PENGAJAR */}
      <SectionCard fullWidth className="p-6 flex flex-col w-full min-w-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0 border border-indigo-100 dark:border-indigo-900/50">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base tracking-tight uppercase">
              Ringkasan Kehadiran Pengajar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Selamat bertugas, <span className="font-bold text-indigo-600 dark:text-indigo-400">{user?.name || rekap?.nama_guru}</span>. Pantau rekap presensi harian & ketepatan waktu mengajar Anda.
            </p>
          </div>
        </div>

        {/* 3 METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Rasio Kehadiran Mengajar */}
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Persentase Kehadiran
                </span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {attendanceRate}%
                </span>
              </div>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, attendanceRate)}%` }} 
              />
            </div>
          </div>

          {/* Card 2: Hadir Tepat Waktu */}
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Tepat Waktu (Bulan Ini)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {hadirCount}
                </span>
                <span className="text-xs font-bold text-slate-400">Hari</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block mt-2">
                🟢 Presensi Tepat Waktu
              </span>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-2xl">
              <CheckCircle2 size={20} />
            </div>
          </div>

          {/* Card 3: Terlambat / Catatan */}
          <div className="p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Terlambat / Catatan
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-orange-600 dark:text-orange-400">
                  {terlambatCount}
                </span>
                <span className="text-xs font-bold text-slate-400">Hari</span>
              </div>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide block mt-2">
                ⚠️ Keterlambatan Masuk
              </span>
            </div>
            <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-2xl">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 2. MAIN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: CALENDAR & DAILY DETAIL */}
        <div className="lg:col-span-2 space-y-6">
          {/* MONTHLY CALENDAR CARD */}
          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <SharedVisualAttendanceCalendar
              title="Kalender Presensi Pengajar"
              bulan={format(currentDate, 'yyyy-MM')}
              selectedDate={selectedDate}
              onBulanChange={(newBulanStr) => {
                try {
                  const [y, m] = newBulanStr.split('-');
                  if (y && m) {
                    const targetMonth = parseInt(m, 10) - 1;
                    const currentMonth = currentDate.getMonth();
                    if (targetMonth < currentMonth) {
                      handlePreviousMonth();
                    } else if (targetMonth > currentMonth) {
                      handleNextMonth();
                    }
                  }
                } catch (e) {}
              }}
              onDateSelect={(dateStr) => setSelectedDate(dateStr)}
              detailMap={detailMap}
              statistik={rekap?.statistik}
            />
          </SectionCard>


          {/* DAILY DETAIL / TIMELINE PRESENSI TEACHER CARD */}
          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <SharedAttendanceTimeline
              title="Timeline Presensi"
              selectedDate={selectedDate}
              items={teacherTrackingData?.kegiatan || []}
              isLoading={isTeacherSesiLoading || isTeacherTrackingLoading}
            />
          </SectionCard>

        </div>

        {/* RIGHT COLUMN: TEACHER SIDEBAR CARDS */}
        <div className="space-y-6">
          {/* Card 1: 2 Aspek Evaluasi Kedisiplinan Guru */}
          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                <Trophy size={18} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
                Poin & Peringkat Saya
              </h3>
            </div>

            {/* Total Skor Combined */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 text-white shadow-lg space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">Total Poin Kedisiplinan</span>
                <Badge className="bg-amber-400 text-amber-950 font-black text-[10px] px-2.5 py-0.5 border-none">
                  RANK #{myRankIndex}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black">{rekap?.total_poin ?? (hadirCount * 10)}</span>
                <span className="text-xs font-bold text-indigo-300">Poin</span>
              </div>

              <div className="pt-2 border-t border-indigo-800/80 flex items-center justify-between text-[11px] font-medium text-indigo-200">
                <span>Kehadiran: <strong className="text-white font-black">{attendanceRate}%</strong></span>
                <span>Total Hadir: <strong className="text-white font-black">{hadirCount} Hari</strong></span>
              </div>
            </div>

            {/* 2 Rincian Aspek Evaluasi Kedisiplinan Pengajar */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Rincian Presensi Harian</span>

              {/* Aspek 1: Presensi Gerbang Sekolah */}
              <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <LogIn size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">1. Presensi Gerbang Sekolah</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                      {aspects.gerbangSubtitle}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl shrink-0 ${aspects.gerbangBadgeClass}`}>
                  {aspects.gerbangStatusLabel}
                </span>
              </div>

              {/* Aspek 2: Presensi Mengajar di Kelas */}
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">2. Presensi Mengajar di Kelas</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                      {aspects.kbmSubtitle}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl shrink-0 ${aspects.kbmBadgeClass}`}>
                  {aspects.kbmStatusLabel}
                </span>
              </div>
            </div>


          </SectionCard>


          {/* Card 2: Klasemen Kedisiplinan Pengajar (Top Teachers) */}
          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
                  Klasemen Kedisiplinan Guru
                </h3>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-extrabold text-[9px] px-2 py-0.5 border-none">
                SEKOLAH
              </Badge>
            </div>

            {isLeaderboardLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader />
              </div>
            ) : teacherLeaderboard.length > 0 ? (
              <div className="space-y-2">
                {teacherLeaderboard.slice(0, 5).map((t, index) => {
                  const rank = index + 1;
                  const isMe = t.id === user?.id || t.nama === (user?.name || rekap?.nama_guru);

                  return (
                    <div
                      key={t.id || index}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isMe
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 shadow-sm'
                          : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {rank === 1 ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                            🥇
                          </div>
                        ) : rank === 2 ? (
                          <div className="w-7 h-7 rounded-xl bg-slate-300 text-slate-900 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                            🥈
                          </div>
                        ) : rank === 3 ? (
                          <div className="w-7 h-7 rounded-xl bg-amber-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                            🥉
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                            #{rank}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate ${isMe ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                            {t.nama} {isMe && <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">(Saya)</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                            🚪 Gerbang: {t.gerbang_count || 0}x • 📖 KBM: {t.kbm_count || 0}x
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap shrink-0">
                        {t.points} Pts
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">
                Belum ada data klasemen pengajar.
              </div>
            )}

            {/* BUTTON NAVIGASI KLASEMEN LENGKAP */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTeacherLeaderboardModal(true)}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                <span>Lihat Klasemen Lengkap</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </SectionCard>



          {/* Card 3: Status Penugasan & Profile Guru */}
          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
                Status Tugas Pengajar
              </h3>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-wider block mb-0.5">Status Akun</span>
                  <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">Pengajar Aktif</span>
                </div>
                <Badge className="bg-emerald-500 text-white font-extrabold text-[10px] border-none px-2.5 py-0.5">AKTIF</Badge>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nama Lengkap</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-100">{user?.name || rekap?.nama_guru}</span>
              </div>
            </div>
          </SectionCard>

          {/* Card 4: Panduan Operasional Presensi Guru */}
          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
                Panduan Presensi Guru
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Lakukan presensi masuk & pulang di mesin gerbang atau terminal lobby jika diaktifkan sekolah.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Setiap awal jam KBM kelas, buka sesi presensi dan lakukan tap RFID / scan siswa.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>Isi Jurnal KBM setelah sesi berakhir untuk mendokumentasikan materi pembelajaran.</span>
              </li>
            </ul>
          </SectionCard>
        </div>

      </div>

      {/* MODAL KLASEMEN GURU LENGKAP */}
      <TeacherAttendanceLeaderboardModal
        isOpen={showTeacherLeaderboardModal}
        onClose={() => setShowTeacherLeaderboardModal(false)}
        teacherLeaderboard={teacherLeaderboard}
        isLoading={isLeaderboardLoading}
        currentUserId={user?.id}
        currentUserName={user?.name || rekap?.nama_guru}
      />
    </div>
  );
};

