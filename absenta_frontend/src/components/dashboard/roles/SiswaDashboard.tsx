import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { SiswaPortalAppLauncher } from '../portal/SiswaPortalAppLauncher';
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
  Megaphone
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

export const SiswaDashboard: React.FC = () => {
  const { user, tenantMode } = useAuthStore();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { menu: groupedMenu } = useSmartMenu();
  
  const caps = user?.capabilities || [];
  const isPetugasKelas = can('attendance.sessions.update.attendance');

  const [dashboardMode, setDashboardMode] = useState<'portal' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('absenta_dashboard_mode') as 'portal' | 'desktop') || 'portal';
    }
    return 'portal';
  });

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
    enabled: !!user && !!user?.siswa_id && (can('hubin.self.pkl') || caps.includes('hubin.self.pkl') || can('hubin.view.pkl') || caps.includes('hubin.view.pkl')),
  });

  const isPklActive = useMemo(() => {
    const pkl = myPklRes?.data;
    if (!pkl) return false;

    // Check status
    const statusStr = String(pkl.status || '').toUpperCase();
    if (['BATAL', 'NONAKTIF', 'SELESAI', 'REJECTED', 'DITOLAK'].includes(statusStr)) {
      return false;
    }

    // Check active date range
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

  const activeSession = useMemo(() => schedule.find(s => s.active), [schedule]);

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

    // Jika siswa aktif PKL
    if (isPklActive) {
      actions.unshift({ label: 'Absen & Logbook PKL', icon: Briefcase, onClick: () => navigate('/hubin/absensi'), color: 'emerald' });
    }

    return actions;
  }, [navigate, isPklActive]);

  // Sidebar Prep
  const sidebarNavGroups = useMemo(() => {
    const groups = groupedMenu.map(group => ({
      label: group.label,
      items: group.items.map(item => ({
        label: item.name,
        icon: iconForName(item.icon) || ChevronRight,
        active: false,
        onClick: () => navigate(item.path || '#'),
        children: item.children
      }))
    }));

    // Add "Layanan Mandiri" for Digital Card
    groups.push({
      label: 'Layanan Mandiri',
      items: [
        {
          label: 'Kartu Digital',
          icon: QrCode,
          onClick: () => navigate('/profile'),
          active: false,
          children: undefined
        }
      ]
    });

    return groups;
  }, [groupedMenu, navigate]);

  // Student Display Name Helper (Handles single letter initials like "A. SYARIF")
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

  return (
    <>
      <WelcomeBanner
        title={`Halo, ${getStudentDisplayName(user?.full_name)}!`}
        subtitle={gamification.streak >= 3 ? `Kamu sudah rajin sekolah ${gamification.streak} hari berturut-turut. Keren!` : "Tetap semangat belajar dan jaga kehadiranmu."}
        icon={User}
        badge={studentStatus.isPresent ? { label: 'Hadir', color: 'green' } : { label: 'Belum Presensi', color: 'amber' }}
      />

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

      {/* Widget Klasemen Poin Saya & Status Permohonan Izin */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Mini Klasemen Kedisiplinan Kelas */}
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

        {/* Status Permohonan Surat Sakit/Izin (Mocked Status) */}
        <CompactSectionCard title="Status Permohonan Izin / Sakit" icon={FileText} iconColor="blue">
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">Surat Sakit Dokter</span>
                  <span className="text-[9px] text-slate-400">(Terbaru)</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Dikirim 27 Juli 2026 • Menunggu Verifikasi Wali Kelas
                </span>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none font-bold text-[9px] shrink-0">
              MENUNGGU
            </Badge>
          </div>
        </CompactSectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Sesi Saat Ini */}
        <CompactSectionCard title="Sesi Saat Ini" icon={PlayCircle} iconColor="indigo">
          {activeSession ? (
            <div className="bg-indigo-600 rounded-lg p-3 text-white">
              <h4 className="text-sm font-bold leading-tight">{activeSession.subject}</h4>
              <div className="flex items-center gap-3 mt-1.5 text-indigo-100 text-[11px]">
                <span className="flex items-center gap-1"><User size={12} /> {activeSession.teacher}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {activeSession.time}</span>
              </div>
              <div className="flex gap-2 mt-3">
                 <Button className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-md flex-1 font-bold text-[11px] h-8">
                    Masuk Kelas
                 </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">Tidak ada jam pelajaran aktif saat ini</span>
                <span>Jadwal pelajaran akan muncul otomatis saat jam KBM berlangsung.</span>
              </div>
            </div>
          )}
        </CompactSectionCard>

        {/* Pangkat Siswa */}
        <CompactSectionCard title="Capaian Belajar" icon={Trophy} iconColor="amber">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                <Medal size={24} />
             </div>
             <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{gamification.level}</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Pertahankan kehadiranmu!</p>
             </div>
          </div>
        </CompactSectionCard>
      </div>

      {/* Learning Journey Timeline */}
      <CompactSectionCard title="Agenda Belajar Hari Ini" icon={LayoutList} iconColor="indigo">
        <div className="space-y-2">
          {schedule.length > 0 ? (
            schedule.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md border transition-colors",
                  item.active 
                    ? 'border-indigo-200 bg-indigo-50/50' 
                    : 'border-gray-50 hover:bg-gray-50'
                )}
              >
                <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-gray-100 dark:border-slate-800 pr-2.5 flex-shrink-0">
                  <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-none">{item.time.split(' - ')[0]}</span>
                  <div className="w-0.5 h-2.5 bg-gray-100 dark:bg-slate-700 my-0.5" />
                  <span className="text-[9px] font-semibold text-gray-400 leading-none">{item.time.split(' - ')[1]}</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", item.active ? 'bg-indigo-500 animate-pulse' : item.status === 'SELESAI' ? 'bg-emerald-500' : 'bg-gray-200')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-800 dark:text-white truncate">{item.subject}</span>
                    {item.isKegiatan ? (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                        Kegiatan
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                        KBM
                      </span>
                    )}
                    {item.active && <Badge className="bg-indigo-600 text-white border-none text-[8px] px-1.5 py-0 h-4 animate-pulse">ACTIVE</Badge>}
                  </div>
                  <span className="text-[10px] text-gray-400 truncate block">{item.teacher}</span>
                </div>
                {item.attendanceStatus && (
                   <div className={cn(
                     "px-2 py-0.5 rounded text-[9px] font-bold",
                     item.attendanceStatus === 'HADIR' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                   )}>
                      {item.attendanceStatus}
                   </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <Calendar className="w-5 h-5 text-sky-500 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">Libur / Tidak ada agenda belajar hari ini</span>
                <span className="text-[11px]">Selamat beristirahat atau gunakan waktu untuk kegiatan belajar mandiri!</span>
              </div>
            </div>
          )}
        </div>
      </CompactSectionCard>

      {!user?.siswa_id && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800">
           <AlertTriangle size={16} />
           <p className="text-[11px] font-medium">Sesi perlu diperbarui. Silakan Logout dan Login kembali.</p>
        </div>
      )}
    </>
  );
};
