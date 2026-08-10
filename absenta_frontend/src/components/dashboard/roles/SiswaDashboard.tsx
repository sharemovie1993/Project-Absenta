import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { SiswaPortalAppLauncher } from '../portal/SiswaPortalAppLauncher';
import { resolveSmartDashboardMode } from '../../../helpers/dashboardModeHelper';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRekapBulananSiswaMe, getRekapHarianSiswaMe, getRekapBulananKelasMe } from '../../../api/attendanceGerbang.api';
import { getMyJadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { formatLocalDateTime, getVirtualDate, toLocalDate, toLocalMonth } from '../../../utils/attendance/time';
import { calculateStudentGamification } from '../../../utils/attendance/attendanceGamification.utils';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  User, 
  QrCode, 
  Users, 
  ClipboardList,
  History,
  CalendarDays,
  Target,
  Flame, 
  Trophy, 
  Star, 
  AlertTriangle, 
  PlayCircle, 
  BookOpen,
  ArrowRight,
  Medal,
  TrendingUp,
  MapPin,
  ChevronRight,
  LayoutList,
  Activity,
  Fingerprint,
  MessageCircle,
  Briefcase,
  Crown,
  FileText,
  Megaphone,
  Sparkles,
  KeyRound,
  Shield,
  Award
} from 'lucide-react';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { CircularProgress } from '../../ui/CircularProgress';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { cn } from '../../../lib/utils';
import { WelcomeBanner } from '../shared/WelcomeBanner';
import { QuickActionGrid, type QuickAction } from '../shared/QuickActionGrid';
import { InfoStripGrid, type InfoStripItem } from '../shared/InfoStripGrid';
import { CompactSectionCard } from '../shared/CompactSectionCard';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { iconForName } from '../../../lib/iconForName';
import { siswaApi } from '../../../api/academic.api';
import { hubinApi } from '../../../api/hubin.api';
import { SiswaOnboardingModal, calculateProfileCompleteness } from '@/components/academic/siswa/SiswaOnboardingModal';

export const SiswaDashboard: React.FC = () => {
  const { user, tenantMode } = useAuthStore();
  const { can } = useCapabilities();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { menu: groupedMenu } = useSmartMenu();
  const isPetugasKelas = can('attendance.sessions.update.attendance');

  // Synchronize Active Tab with URL Query Parameter (?tab=ringkasan)
  const activeTab = searchParams.get('tab') || 'ringkasan';

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  const [dashboardMode, setDashboardMode] = useState<'portal' | 'desktop'>(() => {
    return resolveSmartDashboardMode(user);
  });

  useEffect(() => {
    if (user && !localStorage.getItem('absenta_dashboard_mode')) {
      setDashboardMode(resolveSmartDashboardMode(user));
    }
  }, [user]);

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setDashboardMode(customEvent.detail);
      }
    };
    window.addEventListener('absenta-dashboard-mode-change', handleModeChange);
    return () => window.removeEventListener('absenta-dashboard-mode-change', handleModeChange);
  }, []);

  const handleToggleMode = (newMode: 'portal' | 'desktop') => {
    setDashboardMode(newMode);
    localStorage.setItem('absenta_dashboard_mode', newMode);
    window.dispatchEvent(new CustomEvent('absenta-dashboard-mode-change', { detail: newMode }));
  };

  const todayIso = useMemo(() => toLocalDate(), []);
  const monthIso = useMemo(() => toLocalMonth(), []);

  // 1. Get Student Detailed Profile
  const { data: siswaProfileRes } = useQuery({
    queryKey: ['siswa-profile-me', user?.siswa_id],
    queryFn: () => siswaApi.getById(user?.siswa_id || ''),
    enabled: !!user?.siswa_id,
  });

  const siswaProfile = siswaProfileRes?.data;

  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const completeness = useMemo(() => {
    return calculateProfileCompleteness(siswaProfile);
  }, [siswaProfile]);

  useEffect(() => {
    if (siswaProfile) {
      const comp = calculateProfileCompleteness(siswaProfile);
      const hasDismissed = sessionStorage.getItem(`onboarding_dismissed_${user?.siswa_id || user?.id}`);
      if (!comp.isComplete && !hasDismissed) {
        setShowOnboardingModal(true);
      }
    }
  }, [siswaProfile, user?.siswa_id, user?.id]);

  // 2. Attendance & Schedule Data
  const { data: dailyRecapRes, isLoading: isDailyRecapLoading } = useQuery({
    queryKey: ['rekap-harian-siswa-me', todayIso, user?.siswa_id],
    queryFn: () => getRekapHarianSiswaMe({ tanggal: todayIso }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: monthlyRecapRes, isLoading: isMonthlyRecapLoading } = useQuery({
    queryKey: ['rekap-bulanan-siswa-me', monthIso, user?.siswa_id],
    queryFn: () => getRekapBulananSiswaMe({ bulan: monthIso }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: scheduleRes, isLoading: isScheduleLoading } = useQuery({
    queryKey: ['jadwal-kbm-siswa-me', todayIso, user?.siswa_id],
    queryFn: () => getMyJadwalKBM({ tanggal: todayIso }),
    enabled: !!user && !!user?.siswa_id && tenantMode === 'MULTI_SESI',
  });

  const { data: pelanggaranRes, isLoading: isPelanggaranLoading } = useQuery({
    queryKey: ['pelanggaran-siswa-me', user?.siswa_id],
    queryFn: () => kesiswaanApi.getPelanggaran({ siswa_id: user?.siswa_id }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: kelasLeaderboardRes } = useQuery({
    queryKey: ['class-leaderboard-me-dashboard', monthIso],
    queryFn: () => getRekapBulananKelasMe({ bulan: monthIso }),
    enabled: !!user,
  });

  const myRank = useMemo(() => {
    const students = kelasLeaderboardRes?.data?.students || [];
    if (!students.length) return { rank: 1, totalStudents: 1 };
    const myIdx = students.findIndex((s: any) => s.id === user?.siswa_id || s.id === user?.id || s.nama === user?.name || s.nama === siswaProfile?.nama);
    return {
      rank: myIdx !== -1 ? myIdx + 1 : 1,
      totalStudents: students.length,
    };
  }, [kelasLeaderboardRes, user, siswaProfile]);

  // Fetch Student's PKL Placement Status (Strict Conditional)
  const { data: myPklRes } = useQuery({
    queryKey: ['hubin-my-penempatan', user?.siswa_id],
    queryFn: () => hubinApi.getMyPenempatan(),
    enabled: !!user && !!user?.siswa_id && can('hubin.pkl.view.list'),
  });

  const isPklActive = useMemo(() => {
    const pkl = myPklRes?.data;
    if (!pkl) return false;

    const statusStr = String(pkl.status || '').toUpperCase();
    if (['BATAL', 'NONAKTIF', 'SELESAI', 'REJECTED', 'DITOLAK'].includes(statusStr)) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (pkl.tanggal_mulai) {
      const startDate = new Date(pkl.tanggal_mulai);
      startDate.setHours(0, 0, 0, 0);
      if (today < startDate) return false;
    }

    if (pkl.tanggal_selesai) {
      const endDate = new Date(pkl.tanggal_selesai);
      endDate.setHours(23, 59, 59, 999);
      if (today > endDate) return false;
    }

    return true;
  }, [myPklRes]);

  const dailyRecap = dailyRecapRes?.data ?? null;
  const monthlyRecap = monthlyRecapRes?.data ?? null;
  const jadwalKBMs = scheduleRes?.data ?? [];

  const studentStatus = useMemo(() => {
    if (!dailyRecap) {
      return { isPresent: false, checkInTime: '--:--', checkOutTime: null as string | null, statusLabel: '-' };
    }

    const rincian = Array.isArray(dailyRecap.rincian) ? dailyRecap.rincian : [];
    const pickTime = (predicate: (x: any) => boolean): string | null => {
      const found = rincian.find((x: any) => predicate(x) && x?.waktu_tap);
      return found?.waktu_tap ?? null;
    };

    const formatTime = (timeStr: string | null): string => {
      if (!timeStr || timeStr === '--:--') return '--:--';
      try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return timeStr;
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return timeStr;
      }
    };

    const rawCheckIn =
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('GERBANG_DATANG')) ||
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('MASUK')) ||
      pickTime((x) => !!x?.waktu_tap) || '--:--';

    const rawCheckOut =
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('GERBANG_PULANG')) ||
      pickTime((x) => String(x?.jenis_kegiatan || '').toUpperCase().includes('PULANG'));

    const statusLabel = String(dailyRecap.status || '-').toUpperCase();
    const isPresent = statusLabel === 'HADIR' || statusLabel === 'TERLAMBAT';

    return { 
      isPresent, 
      checkInTime: formatTime(rawCheckIn), 
      checkOutTime: rawCheckOut ? formatTime(rawCheckOut) : null, 
      statusLabel 
    };
  }, [dailyRecap]);

  const schedule = useMemo(() => {
    const d = getVirtualDate();
    const nowHHMM = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const toMinutes = (hhmm: string): number => {
      const [h, m] = String(hhmm || '').split(':');
      const hh = Number(h);
      const mm = Number(m);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
      return hh * 60 + mm;
    };
    const nowMin = toMinutes(nowHHMM);

    return (jadwalKBMs || []).map((item: any) => {
      const start = String(item.jam_mulai || '00:00');
      const end = String(item.jam_selesai || '00:00');
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      const active = nowMin >= startMin && nowMin < endMin;

      const subject = item?.Mapel?.nama_mapel || item?.jenis_kegiatan || item?.kegiatan || 'Kegiatan';
      const teacher = item?.Guru?.User?.full_name || item?.Guru?.nama_guru || (item?.category === 'KEGIATAN' || item?.is_kegiatan ? 'Kegiatan Sekolah' : '-');
      const category = item?.category || (item?.is_kegiatan ? 'KEGIATAN' : 'KBM');
      const isKegiatan = category === 'KEGIATAN' || item?.is_kegiatan || false;
      const status = active ? 'BERLANGSUNG' : nowMin < startMin ? 'MENUNGGU' : 'SELESAI';
      const attendanceStatus = item.attendance_status;

      return { id: item.id, subject, time: `${start} - ${end}`, teacher, status, active, attendanceStatus, category, isKegiatan };
    });
  }, [jadwalKBMs]);

  // Gamification Logic via Centralized Helper
  const gamification = useMemo(() => {
    const detail = Array.isArray(monthlyRecap?.detail) ? monthlyRecap.detail : [];
    const attendanceRate = monthlyRecap?.persentase_kehadiran || 100;
    const totalPoinPelanggaran = Array.isArray(pelanggaranRes?.data) 
      ? pelanggaranRes.data.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0)
      : 0;

    return calculateStudentGamification(detail, attendanceRate, totalPoinPelanggaran);
  }, [monthlyRecap, pelanggaranRes]);

  const infoStrips: InfoStripItem[] = [
    { label: 'Status Absen', value: studentStatus.isPresent ? `Hadir ${studentStatus.checkInTime}` : 'Belum Absen', icon: Fingerprint, color: studentStatus.isPresent ? 'emerald' : 'amber' },
    { label: 'Kehadiran', value: `${gamification.attendanceRate}%`, icon: TrendingUp, color: 'blue' },
    { label: 'Poin Disiplin', value: `${monthlyRecap?.total_poin ?? 0} pts`, icon: Medal, color: 'indigo' },
    { label: 'Streak Hadir', value: `${gamification.streak} Hari`, icon: Flame, color: 'orange' },
  ];

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      { label: 'Jadwal Saya', icon: CalendarDays, onClick: () => navigate('/kurikulum/jadwal'), color: 'indigo' },
      { label: 'Riwayat Absen', icon: History, onClick: () => navigate('/attendance/my-attendance'), color: 'orange' },
      { label: 'Konseling BK', icon: MessageCircle, onClick: () => navigate('/bpbk/konseling'), color: 'blue' },
    ];

    if (isPklActive) {
      actions.unshift({ label: 'Absen & Logbook PKL', icon: Briefcase, onClick: () => navigate('/hubin/absensi'), color: 'emerald' });
    }

    return actions;
  }, [navigate, isPklActive]);

  const getStudentDisplayName = (fullName?: string) => {
    if (!fullName) return 'Siswa';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts[0].length <= 2) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  // RENDER PORTAL APPS LAUNCHER MODE FOR SISWA
  if (dashboardMode === 'portal') {
    return (
      <SiswaPortalAppLauncher
        user={user}
        isPetugasKelas={isPetugasKelas}
        onSwitchToDesktop={() => handleToggleMode('desktop')}
      />
    );
  }

  // DESKTOP TABULAR SEGMENTED PILLS DEFINITION
  const desktopTabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutList, badge: null },
    { id: 'kehadiran', label: 'Kehadiran & KBM', icon: Clock, badge: studentStatus.isPresent ? 'Hadir' : null },
    { id: 'catatan', label: 'Catatan & Poin', icon: AlertTriangle, badge: (pelanggaranRes?.data?.length || 0) > 0 ? pelanggaranRes.data.length : null },
    { id: 'profil', label: 'Profil & Kartu Digital', icon: User, badge: !completeness.isComplete ? 'Onboarding' : null },
  ];

  return (
    <div className="space-y-4 pb-16">
      <WelcomeBanner
        title={`Halo, ${getStudentDisplayName(user?.full_name)}!`}
        subtitle={gamification.streak >= 3 ? `Kamu sudah rajin sekolah ${gamification.streak} hari berturut-turut. Keren!` : "Tetap semangat belajar dan jaga kehadiranmu."}
        icon={User}
        badge={studentStatus.isPresent ? { label: 'Hadir', color: 'green' } : { label: 'Belum Presensi', color: 'amber' }}
      />

      {/* DESKTOP TABULAR SEGMENTED CONTROL PILLS (Hidden on Mobile, Visible on Desktop) */}
      <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {desktopTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isTabActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer flex-1 select-none",
                isTabActive
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md shadow-slate-950/5 border border-slate-200/60 dark:border-slate-700/60"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              )}
            >
              <TabIcon size={16} className={isTabActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
              <span>{tab.label}</span>

              {tab.badge && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                  isTabActive
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DYNAMIC CONTENT AREA BASED ON ACTIVE TAB */}
      <AnimatePresence mode="wait">
        {/* 📌 TAB 1: RINGKASAN */}
        {activeTab === 'ringkasan' && (
          <motion.div
            key="tab-ringkasan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Banner Kelengkapan Profil Siswa */}
            {siswaProfile && !completeness.isComplete && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-blue-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Onboarding Data Siswa</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {completeness.percent}% Terisi
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Profil Anda belum 100% lengkap ({completeness.missingFields.slice(0, 3).join(', ')}...). Lengkapi sekarang untuk pencatatan DAPODIK & kartu pelajar digital!
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => setShowOnboardingModal(true)}
                  className="shrink-0 h-9 px-4 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 border-none"
                >
                  <Sparkles size={14} />
                  <span>Lengkapi Profil</span>
                </Button>
              </div>
            )}

            {/* Strip Tugas Petugas Kelas */}
            {isPetugasKelas && (
              <div className="bg-amber-500/10 border border-amber-200 dark:border-amber-900/50 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 shadow-xs">
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                      ⚡ Tugas Operasional Presensi Kelas
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Anda bertugas mencatat presensi siswa kelas hari ini.
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate('/attendance/ops')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] h-7 px-3 rounded-xl shrink-0 border-none shadow-xs flex items-center gap-1.5"
                >
                  <span>Mulai Absen Kelas</span>
                  <ArrowRight size={12} />
                </Button>
              </div>
            )}

            {/* Agenda Akademik & Pengumuman Sekolah */}
            <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-200 dark:border-sky-900/50 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500 text-white rounded-xl shrink-0 shadow-xs">
                  <Megaphone size={16} />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 block">
                    📢 Agenda Akademik Terdekat
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Ujian Tengah Semester (UTS) akan dilaksanakan mulai 15 Agustus 2026. Pertahankan kedisiplinan presensi Anda!
                  </span>
                </div>
              </div>
              <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-none font-bold text-[10px] shrink-0">
                INFO SEKOLAH
              </Badge>
            </div>

            <QuickActionGrid title="Aksi Cepat" actions={quickActions.slice(0, 4)} columns={4} />

            <InfoStripGrid items={infoStrips} />

            {/* Widget Klasemen Poin Saya */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CompactSectionCard title="Klasemen Presensi Saya" icon={Crown} iconColor="amber">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center shadow-sm shrink-0">
                      #{myRank.rank}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs block">
                        Peringkat #{myRank.rank} dari {myRank.totalStudents} Siswa
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Total Poin: <strong className="text-amber-600 font-bold">{monthlyRecap?.total_poin ?? 0} Pts</strong> • Streak {gamification.streak} Hari
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/attendance/my-attendance')}
                    className="text-[10px] font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 rounded-xl shrink-0 h-8"
                  >
                    Lihat Klasemen <ChevronRight size={12} />
                  </Button>
                </div>
              </CompactSectionCard>

              {/* Status Perizinan Hari Ini */}
              <CompactSectionCard title="Status Permohonan Izin" icon={FileText} iconColor="blue">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Pengajuan Izin Keluar / Sakit</span>
                    <span className="text-[10px] text-slate-500">Ajukan surat izin elektronik langsung ke Wali Kelas</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/kesiswaan/pelanggaran')}
                    className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shrink-0 h-8"
                  >
                    Ajukan Izin
                  </Button>
                </div>
              </CompactSectionCard>
            </div>
          </motion.div>
        )}

        {/* ⏱️ TAB 2: KEHADIRAN & KBM */}
        {activeTab === 'kehadiran' && (
          <motion.div
            key="tab-kehadiran"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Fingerprint size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Absen Gerbang Hari Ini</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {studentStatus.isPresent ? `Hadir (${studentStatus.checkInTime})` : 'Belum Tap Masuk'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Persentase Kehadiran</span>
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {gamification.attendanceRate}% Bulan Ini
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Flame size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Streak Kehadiran</span>
                  <span className="text-base font-extrabold text-orange-600 dark:text-orange-400">
                    {gamification.streak} Hari Berturut-turut
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule & Presence List Card */}
            <CompactSectionCard title="Jadwal & Presensi KBM Hari Ini" icon={Calendar} iconColor="blue">
              {schedule.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  Tidak ada jadwal KBM tercatat hari ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {schedule.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          item.active ? "bg-emerald-500 animate-ping" : "bg-slate-300 dark:bg-slate-700"
                        )} />
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">{item.subject}</span>
                          <span className="text-[10px] text-slate-400">{item.teacher} • {item.time}</span>
                        </div>
                      </div>

                      <Badge className={cn(
                        "text-[10px] font-bold rounded-lg border-none px-2 py-0.5",
                        item.active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CompactSectionCard>
          </motion.div>
        )}

        {/* ⚠️ TAB 3: CATATAN & POIN */}
        {activeTab === 'catatan' && (
          <motion.div
            key="tab-catatan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Riwayat Pelanggaran & Poin Minus */}
              <CompactSectionCard title="Catatan Kedisiplinan & Pelanggaran" icon={AlertTriangle} iconColor="amber">
                {isPelanggaranLoading ? (
                  <div className="p-6 text-center text-xs text-slate-400">Memuat catatan...</div>
                ) : !pelanggaranRes?.data || pelanggaranRes.data.length === 0 ? (
                  <div className="p-8 text-center text-emerald-600 dark:text-emerald-400 text-xs font-bold space-y-1">
                    <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <span>Luar biasa! Tidak ada catatan pelanggaran.</span>
                    <p className="text-[10px] text-slate-400 font-normal">Pertahankan kedisiplinan Anda di sekolah!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {pelanggaranRes.data.map((item: any) => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{item.nama_pelanggaran || item.kategori}</span>
                          <span className="text-[10px] text-slate-400">{item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</span>
                        </div>
                        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none font-bold text-xs">
                          -{item.poin || 0} Pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CompactSectionCard>

              {/* Riwayat Prestasi & Poin Plus */}
              <CompactSectionCard title="Pencapaian & Prestasi Lomba" icon={Award} iconColor="emerald">
                <div className="p-8 text-center text-slate-400 text-xs font-semibold space-y-2">
                  <Trophy className="w-8 h-8 mx-auto text-amber-500" />
                  <span>Belum ada catatan prestasi terdaftar bulan ini.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/kesiswaan/pelanggaran')}
                    className="text-[10px] font-bold rounded-xl h-8"
                  >
                    Laporkan Prestasi Lomba
                  </Button>
                </div>
              </CompactSectionCard>
            </div>
          </motion.div>
        )}

        {/* 👤 TAB 4: PROFIL & KARTU DIGITAL */}
        {activeTab === 'profil' && (
          <motion.div
            key="tab-profil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {user?.full_name?.charAt(0) || 'S'}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {user?.full_name || user?.name || 'Siswa Absenta'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span>NISN: <strong>{siswaProfile?.nisn || user?.nisn || '-'}</strong></span>
                    <span>•</span>
                    <span>Kelas: <strong>{siswaProfile?.Kelas?.nama_kelas || '-'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Button
                  size="sm"
                  onClick={() => navigate('/account/profile')}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex-1 md:flex-initial"
                >
                  <User size={14} className="mr-1.5" />
                  Lihat Profil Lengkap
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOnboardingModal(true)}
                  className="rounded-xl text-xs font-bold flex-1 md:flex-initial"
                >
                  Edit Data
                </Button>
              </div>
            </div>

            {/* Kartu Pelajar Digital Container */}
            <CompactSectionCard title="Kartu Pelajar Digital Siswa" icon={QrCode} iconColor="indigo">
              <div className="p-6 text-center space-y-3 bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="inline-block p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
                  <QrCode size={120} className="text-slate-900 dark:text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">QR Code Presensi Digital Siswa</h4>
                  <p className="text-xs text-slate-500">Gunakan QR Code ini untuk scan presensi gerbang atau peminjaman buku perpustakaan.</p>
                </div>
              </div>
            </CompactSectionCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Onboarding Siswa */}
      {showOnboardingModal && siswaProfile && (
        <SiswaOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          siswaData={siswaProfile}
          onSuccess={() => setShowOnboardingModal(false)}
        />
      )}
    </div>
  );
};
