import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getRekapBulananGuruMe,
  getRekapBulananSiswaMe,
  getRekapHarianSiswaMe,
  getRekapBulananKelas,
  getRekapBulananKelasMe,
  getTrackingHarianSiswa,
  getTrackingHarianGuruMe
} from '../../api/attendanceGerbang.api';
import { SharedVisualAttendanceCalendar } from '../../components/attendance/SharedVisualAttendanceCalendar';
import { SharedAttendanceTimeline } from '../../components/attendance/SharedAttendanceTimeline';

import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useNavigate } from 'react-router-dom';
import { kesiswaanApi } from '../../api/kesiswaan.api';
import { siswaApi } from '../../api/academic.api';
import { toLocalDate } from '../../utils/attendance/time';
import { formatDate } from '../../utils/layoutUtils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Target
} from 'lucide-react';
import {
  Button,
  Badge,
  SectionCard,
  Loader,
  EmptyState
} from '../../components/ui';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { evaluateExamEligibility } from '../../utils/attendance/attendanceGamification.utils';
import type { StudentAttendanceRecord, StudentDailyDetail } from '../../components/attendance/my_attendance/StudentAttendanceTypes';
import { StudentAttendancePointsSidebar } from '../../components/attendance/my_attendance/StudentAttendancePointsSidebar';
import { TeacherAttendanceView } from '../../components/attendance/my_attendance/TeacherAttendanceView';

const PremiumFeatureGate = lazy(() => import('../../components/auth/PremiumFeatureGate'));
const StudentAttendanceLeaderboardModal = lazy(() => import('../../components/attendance/my_attendance/StudentAttendanceLeaderboardModal'));
const StudentAttendanceIzinModal = lazy(() => import('../../components/attendance/my_attendance/StudentAttendanceIzinModal'));
const StudentAttendancePointHistoryModal = lazy(() => import('../../components/attendance/my_attendance/StudentAttendancePointHistoryModal'));

const STATUS_COLORS: Record<string, string> = {
  HADIR: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  TERLAMBAT: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]',
  ALPA: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]',
  SAKIT: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  IZIN: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  DISPEN: 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]',
  BELUM: 'bg-slate-200 dark:bg-slate-700'
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

export const MyAttendancePage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDate());
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPointHistoryModal, setShowPointHistoryModal] = useState(false);
  const [leaderboardScope, setLeaderboardScope] = useState<'KELAS' | 'JURUSAN' | 'SEKOLAH'>('KELAS');

  const bulanKey = format(currentDate, 'yyyy-MM');
  const { user, tenantId, subscription } = useAuthStore();
  const { isTeacher } = useCapabilities();
  const isGuru = isTeacher || !!(user as { guru_id?: string })?.guru_id;

  const features =
    (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.features ||
    (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.Plan?.features_json ||
    (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.plan?.features_json ||
    [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  // 1. Query Rekap Bulanan
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['my-attendance-rekap', bulanKey, tenantId, user?.id],
    queryFn: () => (isGuru ? getRekapBulananGuruMe({ bulan: bulanKey }) : getRekapBulananSiswaMe({ bulan: bulanKey })),
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  // 2. Query Detail Harian
  const { data: harianData } = useQuery({
    queryKey: ['my-attendance-harian', selectedDate, tenantId, user?.id],
    queryFn: () => getRekapHarianSiswaMe({ tanggal: selectedDate }),
    enabled: !!user && !isGuru,
    staleTime: 5 * 60 * 1000
  });

  // 2b. Query Tracking Harian (timeline sesi)
  const mySiswaId = (user as { siswa_id?: string; siswa?: { id?: string }; id?: string })?.siswa_id
    || (user as { siswa?: { id?: string } })?.siswa?.id
    || '';

  const { data: trackingData, isLoading: isTrackingLoading } = useQuery({
    queryKey: ['my-tracking-harian', selectedDate, mySiswaId],
    queryFn: () => getTrackingHarianSiswa(mySiswaId, { tanggal: selectedDate }),
    enabled: !!mySiswaId && !isGuru,
    staleTime: 5 * 60 * 1000
  });

  // 2c. Query Sesi Mengajar Guru untuk tanggal terpilih
  const { data: teacherSesiRes, isLoading: isTeacherSesiLoading } = useQuery({
    queryKey: ['teacher-daily-sessions', selectedDate, tenantId, user?.id],
    queryFn: () => getSesiAbsensiList({ tanggal: selectedDate, summary: true, guru_id: 'me' }),
    enabled: !!user && isGuru,
    staleTime: 5 * 60 * 1000
  });

  const teacherSessions = useMemo(() => {
    if (!teacherSesiRes) return [];
    const resData = (teacherSesiRes as { data?: unknown[] })?.data;
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(teacherSesiRes)) return teacherSesiRes as unknown[];
    return [];
  }, [teacherSesiRes]);

  // 2d. Query Tracking Harian Guru (Timeline Presensi Guru)
  const { data: teacherTrackingRes, isLoading: isTeacherTrackingLoading } = useQuery({
    queryKey: ['teacher-tracking-harian', selectedDate, user?.id],
    queryFn: () => getTrackingHarianGuruMe({ tanggal: selectedDate }),
    enabled: !!user && isGuru,
    staleTime: 5 * 60 * 1000
  });

  const teacherTrackingData = teacherTrackingRes?.data;

  // 3. Query Student Profile
  const { data: siswaMeRes } = useQuery({
    queryKey: ['my-siswa-profile-me', user?.id],
    queryFn: () => siswaApi.getMe(),
    enabled: !isGuru && !!user,
    staleTime: 15 * 60 * 1000
  });

  const mySiswaProfile = siswaMeRes?.data;
  const kelasId =
    mySiswaProfile?.kelas_id ||
    (user as { siswa?: { kelas_id?: string }; kelas_id?: string; Kelas?: { id?: string } })?.siswa?.kelas_id ||
    (user as { kelas_id?: string })?.kelas_id ||
    (user as { Kelas?: { id?: string } })?.Kelas?.id;

  // 4. Query Class Leaderboard (Hanya jika modal dibuka)
  const { data: kelasLeaderboardRes } = useQuery({
    queryKey: ['my-class-leaderboard-me', bulanKey, kelasId],
    queryFn: async () => {
      try {
        const res = await getRekapBulananKelasMe({ bulan: bulanKey });
        if (res?.data) return res;
      } catch (err) {
        console.warn('Fallback to getRekapBulananKelas', err);
      }
      if (kelasId) {
        return getRekapBulananKelas(kelasId, { bulan: bulanKey });
      }
      return null;
    },
    enabled: !isGuru && showLeaderboardModal,
    staleTime: 5 * 60 * 1000
  });

  // 5. Query All Classmates Roster (Lazy: Hanya jika modal dibuka)
  const { data: allClassmatesRes } = useQuery({
    queryKey: ['classmates-roster-list', kelasId],
    queryFn: () => siswaApi.getAll({ kelas_id: kelasId, limit: 100 }),
    enabled: !!kelasId && !isGuru && showLeaderboardModal,
    staleTime: 10 * 60 * 1000
  });

  // 6. Query Scoped Leaderboard
  const { data: scopedLeaderboardRes, isLoading: isScopedLoading } = useQuery({
    queryKey: ['scoped-leaderboard-me', bulanKey, leaderboardScope],
    queryFn: () => getRekapBulananKelasMe({ bulan: bulanKey, scope: leaderboardScope }),
    enabled: !isGuru && showLeaderboardModal,
    staleTime: 5 * 60 * 1000
  });

  const rekap = (attendanceData as { data?: Record<string, unknown> })?.data || (attendanceData as Record<string, unknown>);
  const detailHarian = harianData?.data;

  // Compute Classmates Leaderboard List
  const classmatesList = useMemo<StudentAttendanceRecord[]>(() => {
    const leaderboardRaw = kelasLeaderboardRes?.data;
    const leaderboardStudents: StudentAttendanceRecord[] = Array.isArray(leaderboardRaw)
      ? (leaderboardRaw as unknown as StudentAttendanceRecord[])
      : ((leaderboardRaw as { students?: StudentAttendanceRecord[] })?.students || []);

    const classmatesRaw =
      (allClassmatesRes as { data?: { siswa?: Array<{ id?: string; nama_siswa?: string; nama?: string }> } })?.data?.siswa ||
      (allClassmatesRes as { data?: Array<{ id?: string; nama_siswa?: string; nama?: string }> })?.data ||
      [];

    const map = new Map<string, StudentAttendanceRecord>();

    if (Array.isArray(classmatesRaw) && classmatesRaw.length > 0) {
      classmatesRaw.forEach((s) => {
        const key = s.id || s.nama_siswa || s.nama || 'unknown';
        map.set(key, {
          id: s.id || key,
          nama: s.nama_siswa || s.nama || 'Siswa',
          total_poin: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          terlambat: 0,
          persentase: 100
        });
      });
    }

    if (Array.isArray(leaderboardStudents) && leaderboardStudents.length > 0) {
      leaderboardStudents.forEach((st) => {
        const key = st.id || st.nama || st.nama_siswa || 'unknown';
        const existing = map.get(key);
        const mergedPoin = st.total_poin ?? (st.hadir ? st.hadir * 10 : 0);

        if (existing) {
          existing.total_poin = mergedPoin;
          existing.hadir = st.hadir ?? 0;
          existing.sakit = st.sakit ?? 0;
          existing.izin = st.izin ?? 0;
          existing.alpa = st.alpa ?? 0;
          existing.terlambat = st.terlambat ?? 0;
          existing.persentase = st.persentase || 100;
        } else {
          map.set(key, {
            id: st.id || key,
            nama: st.nama || st.nama_siswa || 'Siswa',
            total_poin: mergedPoin,
            hadir: st.hadir ?? 0,
            sakit: st.sakit ?? 0,
            izin: st.izin ?? 0,
            alpa: st.alpa ?? 0,
            terlambat: st.terlambat ?? 0,
            persentase: st.persentase || 100
          });
        }
      });
    }

    const result = Array.from(map.values());
    result.sort((a, b) => (b.total_poin || 0) - (a.total_poin || 0) || a.nama.localeCompare(b.nama));
    return result;
  }, [kelasLeaderboardRes, allClassmatesRes]);

  const activeLeaderboardList = useMemo<StudentAttendanceRecord[]>(() => {
    if (leaderboardScope === 'KELAS') {
      return classmatesList;
    }
    const scopedRaw = scopedLeaderboardRes?.data?.students;
    if (Array.isArray(scopedRaw) && scopedRaw.length > 0) {
      return [...(scopedRaw as StudentAttendanceRecord[])].sort(
        (a, b) => (b.total_poin || 0) - (a.total_poin || 0) || a.nama.localeCompare(b.nama)
      );
    }
    return classmatesList;
  }, [leaderboardScope, classmatesList, scopedLeaderboardRes]);

  const myRankIndex = useMemo(() => {
    if (!classmatesList || classmatesList.length === 0) return -1;
    return classmatesList.findIndex(
      (s) =>
        s.is_me ||
        s.id === mySiswaProfile?.id ||
        s.id === user?.siswa_id ||
        s.id === user?.id ||
        s.nama === user?.name ||
        s.nama === rekap?.nama_siswa
    );
  }, [classmatesList, mySiswaProfile, user, rekap]);

  const attendancePercentage = rekap?.persentase_kehadiran || 0;
  const examEligibility = useMemo(() => evaluateExamEligibility(attendancePercentage), [attendancePercentage]);

  // Generate calendar days
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const detailMap = useMemo(() => {
    const map = new Map<string, StudentDailyDetail>();
    const details = rekap?.detail || [];
    if (Array.isArray(details)) {
      details.forEach((item: StudentDailyDetail) => {
        if (item.tanggal) {
          map.set(item.tanggal, item);
        }
      });
    }
    return map;
  }, [rekap]);

  const handlePreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Presensi Saya', active: true }
  ], []);


  if (isLocked) {
    return (
      <AcademicPageLayout 
        title="Presensi Saya" 
        description="Monitoring kehadiran mandiri siswa"
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="myattendancepage"
      >
        <Suspense fallback={<Loader />}>
          <PremiumFeatureGate featureName="Presensi Saya" description="Fitur ini memerlukan paket langganan aktif." />
        </Suspense>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Presensi Saya"
      description={isGuru ? "Monitoring rekapitulasi kehadiran pengajar & jam mengajar." : "Monitoring rekapitulasi kehadiran, poin kedisiplinan, dan histori presensi harian."}
      breadcrumbs={breadcrumbs}
      instruction={{
        title: isGuru ? 'Panduan Presensi Pengajar' : 'Panduan Presensi Saya',
        description: isGuru ? 'Pantau rekapitulasi presensi harian Anda.' : 'Pantau persentase kehadiran Anda untuk memastikan kelayakan ujian minimum 85%.',
        items: isGuru ? [
          'Gunakan kalender harian untuk melihat rincian presensi Anda.',
          'Pantau persentase ketepatan waktu & presensi mengajar harian.',
          'Buka menu Operasional Presensi untuk mengelola sesi KBM kelas.'
        ] : [
          'Gunakan kalender harian untuk melihat rincian tap presensi gerbang & kelas.',
          'Buka Klasemen Lengkap untuk memantau posisi poin kedisiplinan sekelas atau se-sekolah.',
          'Ajukan surat permohonan izin/sakit melalui tombol form pengajuan.'
        ]
      }}
    >
      {isGuru ? (
        <TeacherAttendanceView
          user={user}
          currentDate={currentDate}
          selectedDate={selectedDate}
          rekap={rekap}
          detailMap={detailMap}
          daysInMonth={daysInMonth}
          handlePreviousMonth={handlePreviousMonth}
          handleNextMonth={handleNextMonth}
          setSelectedDate={setSelectedDate}
          teacherSessions={teacherSessions}
          isTeacherSesiLoading={isTeacherSesiLoading}
          teacherTrackingData={teacherTrackingData}
          isTeacherTrackingLoading={isTeacherTrackingLoading}
        />
      ) : (
        <div className="space-y-6">
        {/* CARD: RINGKASAN KEDISIPLINAN */}
        <SectionCard fullWidth className="p-6 flex flex-col w-full min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
              <TrendingUp size={18} />
            </div>
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm tracking-tight uppercase">
              Ringkasan Kedisiplinan
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Box 1: Pencapaian Poin */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Pencapaian Poin
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                    {rekap?.total_poin || 15}
                  </span>
                  <span className="text-sm font-black text-slate-400">Pts</span>
                </div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block mt-2">
                  Setara dengan performa luar biasa
                </span>
              </div>
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
                <Trophy size={22} />
              </div>
            </div>

            {/* Box 2: Rasio Kehadiran */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Rasio Kehadiran
                  </span>
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {attendancePercentage}%
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <Target size={22} />
                </div>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, attendancePercentage)}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Exam Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            examEligibility.colorTheme === 'emerald'
              ? 'bg-emerald-50/90 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60'
              : examEligibility.colorTheme === 'amber'
              ? 'bg-amber-50/90 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60'
              : 'bg-rose-50/90 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-2xl text-white shrink-0 ${
                examEligibility.colorTheme === 'emerald' ? 'bg-emerald-600' : examEligibility.colorTheme === 'amber' ? 'bg-amber-600' : 'bg-rose-600'
              }`}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 block">
                  {examEligibility.isEligible ? `Status Aman: Kehadiran Anda (${attendancePercentage}%) memenuhi syarat Ujian Semester (Min. 85%)` : examEligibility.statusLabel}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Sistem otomatis mengevaluasi kelayakan siswa mengikuti Ujian Semester dan Rapor.
                </span>
              </div>
            </div>
            <Badge className={`${
              examEligibility.colorTheme === 'emerald' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
            } border-none font-black text-[9px] shrink-0`}>
              {examEligibility.isEligible ? 'SYARAT TERPATUHI' : 'PERINGATAN'}
            </Badge>
          </div>
        </SectionCard>

        {/* MAIN LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: CALENDAR & DAILY DETAIL */}
          <div className="lg:col-span-2 space-y-6">
            {/* MONTHLY CALENDAR CARD */}
            <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
              <SharedVisualAttendanceCalendar
                title="Kalender Presensi Siswa"
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


            {/* DAILY DETAIL / SESSION TIMELINE CARD */}
            <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
              <SharedAttendanceTimeline
                title="Timeline Presensi"
                selectedDate={selectedDate}
                items={trackingData?.data?.kegiatan || []}
                isLoading={isTrackingLoading}
              />
            </SectionCard>


          </div>

          {/* RIGHT COLUMN: SIDEBAR CARDS */}
          <div className="space-y-6">
            <StudentAttendancePointsSidebar
              myRankIndex={myRankIndex}
              classmatesCount={classmatesList?.length || 32}
              myTotalPoin={rekap?.total_poin || 15}
              myStreak={rekap?.statistik?.HADIR || 2}
              attendanceRate={rekap?.persentase_kehadiran ?? 100}
              detailHarianList={detailHarian || []}
              rekapStats={rekap?.statistik}
              bulanKey={bulanKey}
              onOpenLeaderboardModal={() => setShowLeaderboardModal(true)}
              onOpenIzinModal={() => setShowIzinModal(true)}
              top3Classmates={classmatesList}
            />
          </div>
        </div>
      </div>
      )}

      {/* LAZY LOADED MODALS */}
      <Suspense fallback={<Loader />}>
        {showLeaderboardModal && (
          <StudentAttendanceLeaderboardModal
            isOpen={showLeaderboardModal}
            onClose={() => setShowLeaderboardModal(false)}
            leaderboardScope={leaderboardScope}
            onScopeChange={setLeaderboardScope}
            activeLeaderboardList={activeLeaderboardList}
            isScopedLoading={isScopedLoading}
            mySiswaProfileId={mySiswaProfile?.id}
            userSiswaId={user?.siswa_id}
            userId={user?.id}
            userName={user?.name}
            rekapNamaSiswa={rekap?.nama_siswa}
          />
        )}

        {showIzinModal && (
          <StudentAttendanceIzinModal
            isOpen={showIzinModal}
            onClose={() => setShowIzinModal(false)}
            onSubmitSuccess={() => toast.success('Status pengajuan diperbarui')}
          />
        )}

        {showPointHistoryModal && (
          <StudentAttendancePointHistoryModal
            isOpen={showPointHistoryModal}
            onClose={() => setShowPointHistoryModal(false)}
            rekapStats={rekap?.statistik}
            totalPoin={rekap?.total_poin}
            bulanKey={bulanKey}
          />
        )}
      </Suspense>
    </AcademicPageLayout>
  );
});

export default MyAttendancePage;
