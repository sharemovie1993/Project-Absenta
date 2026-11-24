import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  LayoutList,
  LayoutGrid,
  Compass,
  CheckCircle2,
  FileText,
  FolderOpen,
  User,
  ArrowLeft,
  RefreshCw,
  QrCode,
  Trophy,
  ShieldCheck,
  Flame,
  Sparkles,
  Briefcase,
  Laptop,
  Calendar,
  X,
  ClipboardCheck,
  ShoppingBag,
} from 'lucide-react';
import { renderApiValue } from '@/components/ui';
import { cn } from '@/lib/utils';
import { changePassword } from '@/api/auth.api';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import type { CbtStudentExamItem } from '@/types/cbt.types';
import { DEFAULT_CONFIG } from '@/components/academic/student-card/constants';
import { calculateProfileCompleteness, type SectionEditType } from '@/components/academic/siswa/profileCompleteness';
import { useGerbangAttendanceData } from '@/hooks/attendance/useGerbangAttendanceData';
import { sosialisasiApi, sosialisasiQueryKeys } from '@/api/academic/sosialisasi.api';
import { isSosialisasiInSchedule } from '@/helpers/sosialisasiHelper';
import { sendStudentAppTelemetryPing } from '@/services/appTelemetryService';

// Types & Skeletons
import type { SiswaTabId, SiswaNavTabItem } from './siswa/types';
import { SiswaDashboardSkeleton } from './siswa/SiswaDashboardSkeleton';
import { useSiswaDashboardData } from './siswa/useSiswaDashboardData';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  type UniversalSubtabCategory,
  UniversalEcosystemTopbar,
} from './common';

// Components
import { SiswaHeaderBanner } from './siswa/components/SiswaHeaderBanner';

// Subtabs
import { SiswaRingkasanTab } from './siswa/tabs/SiswaRingkasanTab';
import { SiswaJadwalTab } from './siswa/tabs/SiswaJadwalTab';
import { SiswaEkskulTab } from './siswa/tabs/SiswaEkskulTab';
import { SiswaPklTab } from './siswa/tabs/SiswaPklTab';
import { SiswaCbtTab } from './siswa/tabs/SiswaCbtTab';
import { SiswaKehadiranTab } from './siswa/tabs/SiswaKehadiranTab';
import { SiswaCatatanTab } from './siswa/tabs/SiswaCatatanTab';
import { SiswaBerkasTab } from './siswa/tabs/SiswaBerkasTab';
import { SiswaPortalTab } from './siswa/tabs/SiswaPortalTab';
import { SiswaProfilTab } from './siswa/tabs/SiswaProfilTab';

// Modals
import { SiswaChangePasswordModal } from './siswa/modals/SiswaChangePasswordModal';
import { SiswaLeaderboardModal } from './siswa/modals/SiswaLeaderboardModal';
import { SiswaPrestasiModal } from './siswa/modals/SiswaPrestasiModal';
import { SiswaKehadiranModal } from './siswa/modals/SiswaKehadiranModal';
import { SiswaBelumAbsenModal } from './siswa/modals/SiswaBelumAbsenModal';
import { SiswaCardModal } from '../../academic/siswa/dashboard/SiswaCardModal';
import Modal from '@/components/ui/Modal';

const TeacherSosialisasiScanModal = lazy(() =>
  import('../staff/modals/TeacherSosialisasiScanModal').then((m) => ({ default: m.TeacherSosialisasiScanModal }))
);

const AbsensiPklView = lazy(() =>
  import('../../hubin/absensi/AbsensiPklView').then((m) => ({ default: m.AbsensiPklView }))
);

const SiswaOnboardingModal = lazy(() =>
  import('@/components/academic/siswa/SiswaOnboardingModal').then((m) => ({ default: m.SiswaOnboardingModal }))
);

const SiswaExamDispatchModal = lazy(() =>
  import('@/components/cbt/sesi/SiswaExamDispatchModal').then((m) => ({ default: m.SiswaExamDispatchModal }))
);

const SessionManagerModule = lazy(() =>
  import('@/pages/attendance/ops/components/SessionManagerModule').then((m) => ({ default: m.SessionManagerModule }))
);

const UniversalCoopMemberView = lazy(() =>
  import('@/components/cooperative/dashboard/UniversalCoopMemberView').then((m) => ({ default: m.UniversalCoopMemberView }))
);

export const SiswaDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as SiswaTabId | null;
  const validTabs: SiswaTabId[] = ['ringkasan', 'jadwal', 'ekskul', 'pkl', 'cbt', 'portal', 'kehadiran', 'catatan', 'berkas', 'profil', 'presensi-kelas', 'koperasi'];
  const activeTab: SiswaTabId = rawTab && validTabs.includes(rawTab) ? rawTab : 'ringkasan';

  // Deteksi Event Ujian CBT Aktif Siswa lebih awal agar modul non-ujian tidak ikut di-fetch saat ada ujian
  const { data: studentExams = [], isLoading: isExamsLoading } = useQuery<CbtStudentExamItem[]>({
    queryKey: cbtQueryKeys.myExams(),
    queryFn: cbtApi.getMyExams,
    staleTime: 30 * 1000,
  });

  const activeStudentExams = useMemo(() => {
    if (!studentExams || studentExams.length === 0) return [];
    const now = Date.now();
    return studentExams.filter((item) => {
      if (item.status_peserta === 'FINISHED' || item.status_peserta === 'DISQUALIFIED') return false;
      if (item.status_jadwal === 'ACTIVE' || item.status_jadwal === 'PAUSED') return true;
      if (item.status_jadwal !== 'COMPLETED' && item.status_jadwal !== 'ARCHIVED' && item.status_jadwal !== 'DRAFT') {
        const start = new Date(item.tanggal_mulai).getTime();
        const end = new Date(item.tanggal_selesai).getTime();
        return now >= start && now <= end;
      }
      return false;
    });
  }, [studentExams]);

  const hasActiveStudentExam = activeStudentExams.length > 0;
  const isExamLockdown = hasActiveStudentExam;
  const effectiveTab: SiswaTabId =
    isExamLockdown && activeTab !== 'cbt' && activeTab !== 'profil'
      ? 'cbt'
      : isExamsLoading && !rawTab
      ? 'cbt'
      : activeTab;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('siswa');

  // Keep-Alive Tab Cache
  const [visitedTabs, setVisitedTabs] = useState<Set<SiswaTabId>>(() => new Set([effectiveTab]));

  useEffect(() => {
    if (isExamLockdown && activeTab !== 'cbt' && activeTab !== 'profil') {
      setSearchParams({ tab: 'cbt' }, { replace: true });
    }
  }, [isExamLockdown, activeTab, setSearchParams]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(effectiveTab)) return prev;
      const next = new Set(prev);
      next.add(effectiveTab);
      return next;
    });
  }, [effectiveTab]);

  // Telemetry: Laporkan status aplikasi mobile siswa secara otomatis
  useEffect(() => {
    sendStudentAppTelemetryPing();
  }, []);

  const handleTabChange = useCallback(
    (newTab: SiswaTabId | string) => {
      if (isExamLockdown && newTab !== 'cbt' && newTab !== 'profil') {
        toast('Mode Fokus Ujian: Hanya Ujian CBT & Profil yang diizinkan.', { icon: '🔒' });
        setSearchParams({ tab: 'cbt' }, { replace: true });
        return;
      }
      setSearchParams({ tab: newTab });
    },
    [isExamLockdown, setSearchParams]
  );

  // Data hook (optimized with effectiveTab-driven lazy query loading)
  const data = useSiswaDashboardData(effectiveTab);

  // Modals state
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPrestasiModal, setShowPrestasiModal] = useState(false);
  const [showKehadiranModal, setShowKehadiranModal] = useState(false);
  const [showBelumAbsenModal, setShowBelumAbsenModal] = useState(false);
  const [showPklModal, setShowPklModal] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  // Rapat Sosialisasi State (Presensi Siswa via Scan)
  const [isScanSosialisasiOpen, setIsScanSosialisasiOpen] = useState(false);
  const { data: sosialisasiData, refetch: refetchSosialisasi } = useQuery({
    queryKey: sosialisasiQueryKeys.active(),
    queryFn: () => sosialisasiApi.getActiveSession().catch(() => null),
    enabled: !isExamsLoading && !hasActiveStudentExam,
    staleTime: 60 * 1000,
  });

  const isSosialisasiActive = sosialisasiData?.session?.status === 'AKTIF';
  const isSosialisasiLive = useMemo(() => {
    return isSosialisasiActive && isSosialisasiInSchedule(sosialisasiData?.session);
  }, [isSosialisasiActive, sosialisasiData?.session]);

  const [isSosialisasiDismissed, setIsSosialisasiDismissed] = useState(false);
  const handleDismissSosialisasi = () => {
    setIsSosialisasiDismissed(true);
    try {
      if (sosialisasiData?.session?.id) {
        sessionStorage.setItem(`absenta_dismiss_sosialisasi_${sosialisasiData.session.id}`, 'true');
      }
    } catch {}
  };

  useEffect(() => {
    if (sosialisasiData?.session?.id) {
      try {
        const isDismissed = sessionStorage.getItem(`absenta_dismiss_sosialisasi_${sosialisasiData.session.id}`) === 'true';
        setIsSosialisasiDismissed(isDismissed);
      } catch {}
    }
  }, [sosialisasiData?.session?.id]);

  const shouldShowSosialisasiBanner = isSosialisasiLive && !isSosialisasiDismissed && Boolean(sosialisasiData?.session);

  const myStudentAttendance = useMemo(() => {
    if (!sosialisasiData?.attendees) return null;
    const studentId = data.siswaProfile?.id || data.user?.siswa_id || data.user?.id;
    const currentNisn = data.currentNisn;
    return sosialisasiData.attendees.find(
      (a: any) =>
        (studentId && (a.guru_id === studentId || a.id === studentId)) ||
        (currentNisn && (a.nip === currentNisn || a.guru_id === currentNisn))
    );
  }, [sosialisasiData?.attendees, data]);
  const isStudentAttended = Boolean(myStudentAttendance?.is_hadir);

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionEditType>('pribadi');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handleOpenEditSection = (section: SectionEditType) => {
    setActiveSection(section);
    setShowOnboardingModal(true);
  };

  const handleOpenPklModal = useCallback(() => {
    setShowPklModal(true);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error('Password lama dan password baru harus diisi');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword({
        current_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Password berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePasswordModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengubah password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await data.refetchProfile();
      toast.success('Data dashboard siswa berhasil diperbarui!');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Gerbang data for Belum Absen modal
  const {
    notPresent: notPresentData = [],
    notPresentLoading,
    miniStats: miniStatsData = { masuk: 0, keluar: 0 },
    fetchNotPresent: refetchNotPresent,
    refreshStats: refetchMiniStats,
    removePendingStudent,
  } = useGerbangAttendanceData({
    tenantId: data.tenantId,
    selectedKelasId: data.siswaProfile?.kelas_id || '',
    enabled: showBelumAbsenModal,
  });

  const [showExamDispatchModal, setShowExamDispatchModal] = useState(false);
  const [isExamDismissedByUser, setIsExamDismissedByUser] = useState(false);

  // 1. Deteksi & Buka Modal Pengarahan Ujian (Prioritas Utama saat Ada Ujian Aktif)
  useEffect(() => {
    // ── GUARD ANTI-FLICKER: Tunggu query ujian selesai loading sebelum menentukan modal! ──
    if (isExamsLoading) return;

    if (hasActiveStudentExam && activeTab !== 'cbt') {
      // Pastikan modal onboarding profil selalu ditutup rapat saat ada ujian aktif
      setShowOnboardingModal(false);

      if (!isExamDismissedByUser) {
        setShowExamDispatchModal(true);
      }
    } else {
      setShowExamDispatchModal(false);
    }
  }, [hasActiveStudentExam, isExamsLoading, activeTab, isExamDismissedByUser]);

  // 2. Onboarding auto prompt profil (Hanya jika TIDAK sedang loading dan TIDAK ada ujian aktif)
  useEffect(() => {
    // ── GUARD ANTI-FLICKER: Jangan munculkan onboarding jika sedang loading atau ada ujian aktif ──
    if (isExamsLoading || hasActiveStudentExam) {
      setShowOnboardingModal(false);
      return;
    }
    if (data.siswaProfile) {
      const comp = calculateProfileCompleteness(data.siswaProfile);
      const hasDismissed = sessionStorage.getItem(`onboarding_dismissed_${data.user?.siswa_id || data.user?.id}`);
      if (!comp.isComplete && !hasDismissed) {
        setShowOnboardingModal(true);
      }
    }
  }, [data.siswaProfile, data.user, hasActiveStudentExam, isExamsLoading]);

  // Tab items config & categories (dibatasi ke Ujian CBT & Profil saat ada ujian aktif)
  const categories: UniversalSubtabCategory[] = useMemo(() => {
    if (isExamLockdown) {
      return [
        { id: 'akademik', label: 'UJIAN CBT', icon: Laptop },
        { id: 'layanan', label: 'AKUN SISWA', icon: User },
      ];
    }
    return [
      { id: 'operasional', label: 'OPERASIONAL SISWA', icon: LayoutList },
      { id: 'akademik', label: 'AKADEMIK & PENILAIAN', icon: Laptop },
      { id: 'layanan', label: 'LAYANAN & INFORMASI', icon: LayoutGrid },
    ];
  }, [isExamLockdown]);

  const navTabs: SiswaNavTabItem[] = useMemo(() => {
    if (isExamLockdown) {
      return [
        { id: 'cbt', label: 'Ujian CBT', shortLabel: 'Ujian', icon: Laptop, category: 'akademik' },
        { id: 'profil', label: 'Profil', shortLabel: 'Profil', icon: User, category: 'layanan' },
      ];
    }

    const tabs: SiswaNavTabItem[] = [
      { id: 'ringkasan', label: 'Ringkasan', shortLabel: 'Ringkasan', icon: LayoutList, category: 'operasional' },
    ];
    if (data.isPetugasKelas) {
      tabs.push({
        id: 'presensi-kelas',
        label: 'Presensi Kelas',
        shortLabel: 'Presensi',
        icon: ClipboardCheck,
        category: 'operasional',
      });
    }
    tabs.push(
      { id: 'jadwal', label: 'Jadwal Pelajaran', shortLabel: 'Jadwal', icon: Calendar, category: 'akademik' },
      { id: 'ekskul', label: 'Ekstrakurikuler', shortLabel: 'Ekskul', icon: Compass, category: 'akademik' }
    );
    if (data.isAktifPkl || data.myPenempatan) {
      tabs.push({
        id: 'pkl',
        label: 'PKL',
        shortLabel: 'PKL',
        icon: Briefcase,
        badge: data.pendingJurnalCount > 0 ? data.pendingJurnalCount : undefined,
        category: 'operasional',
      });
    }
    tabs.push(
      { id: 'cbt', label: 'Ujian CBT', shortLabel: 'Ujian', icon: Laptop, category: 'akademik' },
      { id: 'kehadiran', label: 'Presensi', shortLabel: 'Presensi', icon: CheckCircle2, category: 'operasional' },
      { id: 'catatan', label: 'Disiplin', shortLabel: 'Disiplin', icon: FileText, badge: data.pelanggaranCount, category: 'operasional' },
      { id: 'berkas', label: 'Dokumen', shortLabel: 'Dokumen', icon: FolderOpen, category: 'akademik' },
      { id: 'koperasi', label: 'Koperasi Siswa', shortLabel: 'Koperasi', icon: ShoppingBag, category: 'layanan' },
      { id: 'portal', label: 'Portal', shortLabel: 'Portal', icon: LayoutGrid, category: 'layanan' },
      { id: 'profil', label: 'Profil', shortLabel: 'Profil', icon: User, category: 'layanan' }
    );
    return tabs;
  }, [isExamLockdown, data.isPetugasKelas, data.isAktifPkl, data.myPenempatan, data.pendingJurnalCount, data.pelanggaranCount]);

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  const renderValueOrUnconnectedBadge = (val: any, customConnectedText?: React.ReactNode) => {
    return renderApiValue(val, customConnectedText, data.isApiConnected);
  };

  const currentSubtabTitle = useMemo(() => {
    switch (activeTab) {
      case 'ringkasan': return 'Pusat Kendali';
      case 'presensi-kelas': return 'Presensi Kelas (Petugas)';
      case 'jadwal': return 'Jadwal Pelajaran';
      case 'ekskul': return 'Ekstrakurikuler Saya';
      case 'kehadiran': return 'Riwayat Presensi';
      case 'pkl': return 'Praktik Kerja (PKL)';
      case 'cbt': return 'Ujian Online (CBT)';
      case 'catatan': return 'Poin & Kedisiplinan';
      case 'berkas': return 'Berkas Akademik';
      case 'koperasi': return 'Koperasi Siswa';
      case 'profil': return 'Profil Saya';
      default: return 'Portal Siswa';
    }
  }, [activeTab]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 w-full max-w-full min-w-0">
      {/* 1. Universal Topbar Terkunci Ramping (Murni Judul + Kembali) */}
      {activeTab !== 'koperasi' && (
        <UniversalEcosystemTopbar
          ecosystem="siswa"
          title={currentSubtabTitle}
          icon={User}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          actions={
            !isExamLockdown ? (
              <button
                type="button"
                onClick={() => setShowDigitalCardModal(true)}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                title="Buka Kartu Pelajar Digital"
                aria-label="Kartu Digital"
              >
                <QrCode size={15} />
              </button>
            ) : undefined
          }
        />
      )}

      {/* Dedicated Universal Mobile Subtab Sidebar Drawer */}
      <UniversalMobileSubtabSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        title={data.studentName || 'Portal Siswa'}
        subtitle={`Kelas ${data.currentClassName} • NISN: ${data.nisn || '-'}`}
        roleBadge="SISWA"
        scope="siswa"
        roleIcon={User}
        tabs={navTabs}
        activeTab={activeTab}
        onSelectTab={(tabId) => handleTabChange(tabId as SiswaTabId)}
        categories={categories}
      />

      {/* 2. Desktop 2-Column Sidebar Layout */}
      <div className={cn(
        "grid grid-cols-1 gap-6 items-start",
        activeTab !== 'koperasi' && "lg:grid-cols-[230px_minmax(0,1fr)]"
      )}>
        {/* Left Column: Sidebar Controls (Desktop sticky & independent scroll with elegant sleek scrollbar) */}
        <aside className={cn(
          "hidden sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain role-dashboard-sidebar-scroll pr-1.5 space-y-3 pb-12",
          activeTab !== 'koperasi' ? "lg:block" : "lg:hidden"
        )}>
          {/* Identity Mini Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {data.studentPhotoUrl ? (
                  <img
                    src={data.studentPhotoUrl}
                    alt={data.studentName}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center ring-1 ring-blue-500/30">
                    {data.studentInitials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 px-1 rounded-full text-[8px] font-black bg-amber-500 text-slate-950 ring-1 ring-white dark:ring-slate-900">
                  Lv.{data.gamification.level}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                  Kelas {data.currentClassName}
                </span>
                <h2 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {data.studentName}
                </h2>
                {data.primaryRoleTitle && (
                  <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded text-[8.5px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 truncate max-w-full">
                    {data.primaryRoleTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Streak & XP Strip */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
                <Flame size={12} className="animate-pulse" />
                <span>{data.gamification.streakDays} Hari Streak</span>
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {data.gamification.points} XP
              </span>
            </div>
          </div>

          {/* Desktop Vertical Nav Menu */}
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge !== null && Number(tab.badge) > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Banner Mode Fokus Ujian saat Ada Ujian Aktif */}
          {isExamLockdown && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-[11px] font-semibold leading-relaxed">
              <span className="font-black block mb-0.5">🔒 Mode Fokus Ujian Aktif</span>
              Navigasi dibatasi ke <strong>Ujian CBT</strong> &amp; <strong>Profil</strong> selama ujian berlangsung.
            </div>
          )}

          {/* Quick Shortcuts Card (Leaderboard & Discipline) - disembunyikan saat Mode Fokus Ujian */}
          {!isExamLockdown && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Status Kedisiplinan
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Skor Disiplin</span>
              </span>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                {data.currentDisciplineScore}/100
              </span>
            </div>
            {data.myRank.rank > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-500" />
                  <span>Peringkat</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLeaderboardModal(true)}
                  className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  #{data.myRank.rank} di Kelas
                </button>
              </div>
            )}
          </div>
          )}
        </aside>

        {/* Right Column: Main Content & Subtabs */}
        <main className="space-y-4 min-w-0">
          {/* Banner Presensi Sosialisasi Siswa (Hanya Muncul Sesuai Jadwal Jam Rapat & Bisa Ditutup) */}
          {shouldShowSosialisasiBanner && sosialisasiData?.session && (
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-violet-600/15 via-indigo-600/15 to-purple-600/15 dark:from-violet-950/60 dark:via-indigo-950/60 dark:to-purple-950/50 border border-violet-300 dark:border-violet-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs",
                  isStudentAttended ? "bg-emerald-500 text-white" : "bg-violet-600 text-white"
                )}>
                  {isStudentAttended ? <CheckCircle2 size={22} /> : <QrCode size={22} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200">
                      Sosialisasi Platform
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {sosialisasiData.session.nama_acara}
                    </h4>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      isStudentAttended
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                    )}>
                      {isStudentAttended ? "Sudah Hadir" : "Wajib Presensi"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {isStudentAttended
                      ? `Kehadiran Anda telah berhasil dicatat pada rapat sosialisasi ini.`
                      : `${sosialisasiData.session.tempat} • Pukul ${sosialisasiData.session.waktu_mulai} - ${sosialisasiData.session.waktu_selesai} WIB`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsScanSosialisasiOpen(true)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95",
                    isStudentAttended
                      ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
                      : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 font-extrabold"
                  )}
                >
                  <QrCode size={16} />
                  <span>{isStudentAttended ? "Lihat Status Presensi" : "Scan QR Presensi"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissSosialisasi}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Tutup banner ini"
                  aria-label="Tutup banner"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Header Identity Banner (Sembunyikan saat di Tab CBT & Koperasi agar tidak tumpuk) */}
          {activeTab !== 'cbt' && activeTab !== 'koperasi' && (
            <SiswaHeaderBanner
              studentName={data.studentName}
              studentInitials={data.studentInitials}
              studentPhotoUrl={data.studentPhotoUrl}
              currentNisn={data.currentNisn}
              currentJurusan={data.currentJurusan}
              currentClassName={data.currentClassName}
              isPetugasKelas={data.isPetugasKelas}
              studentBadges={data.studentBadges}
              gamification={data.gamification}
              onOpenDigitalCard={() => setShowDigitalCardModal(true)}
              onOpenBelumAbsen={() => setShowBelumAbsenModal(true)}
              onOpenPresensiKelas={() => handleTabChange('presensi-kelas')}
            />
          )}

          {/* Subtab Panels with Keep-Alive Cache */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              <SiswaRingkasanTab
                isAktifPkl={data.isAktifPkl}
                todayFormattedDate={data.todayFormattedDate}
                todayIso={data.todayIso}
                todayPklAbsensi={data.todayPklAbsensi}
                pklHadir={data.pklHadir}
                pklSisaHari={data.pklSisaHari}
                dailyRecap={data.dailyRecap}
                monthStats={data.monthStats}
                gamification={data.gamification}
                myRank={data.myRank}
                kelasLeaderboardStudents={data.kelasLeaderboardStudents}
                currentClassName={data.currentClassName}
                currentUserId={data.user?.siswa_id || data.user?.id}
                studentName={data.studentName}
                onOpenLeaderboard={() => setShowLeaderboardModal(true)}
                todayKbmSchedule={data.todayKbmSchedule}
                isLoadingSchedule={data.isLoadingSchedule}
                disciplineHistory={data.disciplineHistory}
                totalPoinPrestasi={data.totalPoinPrestasi}
                totalPoinPelanggaran={data.totalPoinPelanggaran}
                currentDisciplineScore={data.currentDisciplineScore}
                onOpenPrestasiModal={() => setShowPrestasiModal(true)}
                onOpenKehadiranModal={() => setShowKehadiranModal(true)}
                onOpenPklModal={handleOpenPklModal}
                onNavigateTab={handleTabChange}
              />
            </div>
          )}

          {visitedTabs.has('jadwal') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'jadwal'}
              className={cn('w-full min-w-0', activeTab === 'jadwal' ? 'block' : 'hidden')}
            >
              <SiswaJadwalTab
                kelasId={data.siswaProfile?.kelas_id}
                kelasNama={data.currentClassName}
              />
            </div>
          )}

          {visitedTabs.has('ekskul') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ekskul'}
              className={cn('w-full min-w-0', activeTab === 'ekskul' ? 'block' : 'hidden')}
            >
              <SiswaEkskulTab
                studentProfile={{
                  id: data.siswaProfile?.id || (data.user as any)?.siswa_id,
                  nis: (data.siswaProfile as any)?.nis || (data.user as any)?.username,
                  nisn: data.nisn,
                  nama: data.studentName,
                  nama_siswa: data.studentName,
                  kelas_id: data.siswaProfile?.kelas_id,
                  kelas_nama: data.currentClassName,
                  foto: data.studentPhotoUrl,
                  foto_url: data.studentPhotoUrl,
                  ekskul_1: (data.siswaProfile as any)?.ekskul_1,
                  ekskul_2: (data.siswaProfile as any)?.ekskul_2,
                  ekskuls: (data.siswaProfile as any)?.ekskuls,
                }}
              />
            </div>
          )}

          {visitedTabs.has('pkl') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'pkl'}
              className={cn('w-full min-w-0', activeTab === 'pkl' ? 'block' : 'hidden')}
            >
              <SiswaPklTab
                myPenempatan={data.myPenempatan}
                isAktifPkl={data.isAktifPkl}
                todayPklAbsensi={data.todayPklAbsensi}
                pklHadir={data.pklHadir}
                pklSisaHari={data.pklSisaHari}
                pendingJurnals={data.pendingJurnals}
                pendingJurnalCount={data.pendingJurnalCount}
                studentName={data.studentName}
                className={data.currentClassName}
                onRefreshData={() => {
                  data.refetchPklAbsensi();
                  data.refetchProfile();
                }}
              />
            </div>
          )}

          {visitedTabs.has('cbt') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'cbt'}
              className={cn('w-full min-w-0', activeTab === 'cbt' ? 'block' : 'hidden')}
            >
              <SiswaCbtTab />
            </div>
          )}

          {visitedTabs.has('portal') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'portal'}
              className={cn('w-full min-w-0', activeTab === 'portal' ? 'block' : 'hidden')}
            >
              <SiswaPortalTab
                onBackToBeranda={() => handleTabChange('ringkasan')}
                onNavigateTab={handleTabChange}
              />
            </div>
          )}

          {visitedTabs.has('kehadiran') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'kehadiran'}
              className={cn('w-full min-w-0', activeTab === 'kehadiran' ? 'block' : 'hidden')}
            >
              <SiswaKehadiranTab
                gamification={data.gamification}
                handlePrevMonth={data.handlePrevMonth}
                handleNextMonth={data.handleNextMonth}
                selectedMonthFormatted={data.selectedMonthFormatted}
                calendarGridData={data.calendarGridData}
                todayIso={data.todayIso}
                selectedDate={data.selectedDate}
                onSelectDate={data.setSelectedDate}
                sessionAttendanceHistory={data.sessionAttendanceHistory}
                todayKbmSchedule={data.todayKbmSchedule}
                isLoadingSchedule={data.isLoadingSchedule}
                isApiConnected={data.isApiConnected}
                kelasId={data.siswaProfile?.kelas_id || ''}
                siswaId={data.siswaProfile?.id || (data.user as any)?.siswa_id || data.user?.id || ''}
                studentName={data.studentName}
                studentNis={data.currentNisn}
                kelasNama={data.currentClassName}
                jurusanNama={data.currentJurusan}
              />
            </div>
          )}

          {visitedTabs.has('catatan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'catatan'}
              className={cn('w-full min-w-0', activeTab === 'catatan' ? 'block' : 'hidden')}
            >
              <SiswaCatatanTab
                bukuCatatanList={data.bukuCatatanList}
                catatanFilter={data.catatanFilter}
                setCatatanFilter={data.setCatatanFilter}
                filteredBukuCatatan={data.filteredBukuCatatan}
                totalPoinPrestasi={data.totalPoinPrestasi}
                totalPoinPelanggaran={data.totalPoinPelanggaran}
                netPoin={data.netPoin}
              />
            </div>
          )}

          {visitedTabs.has('berkas') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'berkas'}
              className={cn('w-full min-w-0', activeTab === 'berkas' ? 'block' : 'hidden')}
            >
              <SiswaBerkasTab
                siswaId={data.siswaProfile?.id}
                siswaName={data.studentName}
                nis={data.siswaProfile?.nis}
                nisn={data.currentNisn}
              />
            </div>
          )}

          {visitedTabs.has('profil') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'profil'}
              className={cn('w-full min-w-0', activeTab === 'profil' ? 'block' : 'hidden')}
            >
              <SiswaProfilTab
                siswaProfile={data.siswaProfile}
                user={data.user}
                studentPhotoUrl={data.studentPhotoUrl}
                studentInitials={data.studentInitials}
                currentClassName={data.currentClassName}
                currentJurusan={data.currentJurusan}
                currentNisn={data.currentNisn}
                currentNik={data.currentNik}
                currentOrtu={data.currentOrtu}
                qrCodeDataUrl={data.qrCodeDataUrl}
                renderValueOrUnconnectedBadge={renderValueOrUnconnectedBadge}
                handleOpenEditSection={handleOpenEditSection}
                setShowDigitalCardModal={setShowDigitalCardModal}
                handlePasswordSubmit={handlePasswordSubmit}
                oldPassword={oldPassword}
                setOldPassword={setOldPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                passwordSubmitting={passwordSubmitting}
              />
            </div>
          )}

          {visitedTabs.has('presensi-kelas') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'presensi-kelas'}
              className={cn('w-full min-w-0', activeTab === 'presensi-kelas' ? 'block' : 'hidden')}
            >
              <Suspense fallback={
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="animate-spin text-amber-500 mx-auto" size={24} />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Memuat Meja Kerja Petugas Presensi Kelas...</p>
                </div>
              }>
                <SessionManagerModule
                  selectedKelasId={data.siswaProfile?.kelas_id || ''}
                  setSelectedKelasId={() => {}}
                  kelasOptions={[{ label: data.currentClassName, value: data.siswaProfile?.kelas_id || '' }]}
                  isPetugasSiswa={true}
                  canCreateSession={true}
                  managedKelasIds={data.siswaProfile?.kelas_id ? [data.siswaProfile.kelas_id] : []}
                  user={data.user as any}
                  hideLayout={true}
                  hideKelas={true}
                />
              </Suspense>
            </div>
          )}

          {/* 🛍️ TAB KOPERASI SISWA: PORTAL ANGGOTA KOPERASI SISWA */}
          {visitedTabs.has('koperasi') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'koperasi'}
              className={cn('w-full min-w-0', activeTab === 'koperasi' ? 'block' : 'hidden')}
            >
              <Suspense fallback={
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <RefreshCw className="animate-spin text-emerald-500 mx-auto" size={24} />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Memuat Portal Koperasi Siswa...</p>
                </div>
              }>
                <UniversalCoopMemberView
                  hideLayout={true}
                  onBack={() => handleTabChange('ringkasan')}
                  backLabel="Kembali ke Portal Siswa"
                />
              </Suspense>
            </div>
          )}
        </main>
      </div>

      {/* 3. Modals */}
      <SiswaChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        isSubmitting={passwordSubmitting}
      />

      <SiswaLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        students={data.kelasLeaderboardStudents}
        currentClassName={data.currentClassName}
        selectedMonthFormatted={data.selectedMonthFormatted}
        currentUserId={data.user?.siswa_id || data.user?.id}
        studentName={data.studentName}
      />

      <SiswaPrestasiModal
        isOpen={showPrestasiModal}
        onClose={() => setShowPrestasiModal(false)}
        bukuCatatanList={data.bukuCatatanList}
        totalPoinPrestasi={data.totalPoinPrestasi}
        prestasiCount={data.prestasiCount}
      />

      <SiswaKehadiranModal
        isOpen={showKehadiranModal}
        onClose={() => setShowKehadiranModal(false)}
        onNavigateToTab={handleTabChange}
        selectedMonthFormatted={data.selectedMonthFormatted}
        attendanceRate={data.gamification.attendanceRate}
        monthStats={data.monthStats}
      />

      <SiswaBelumAbsenModal
        isOpen={showBelumAbsenModal}
        onClose={() => {
          setShowBelumAbsenModal(false);
          refetchMiniStats();
          refetchNotPresent();
        }}
        currentClassName={data.currentClassName}
        kelasId={data.siswaProfile?.kelas_id || ''}
        notPresentData={notPresentData}
        notPresentLoading={notPresentLoading}
        miniStatsData={miniStatsData}
        onRefreshData={async () => {
          await refetchMiniStats();
          await refetchNotPresent();
        }}
        onRemovePendingStudent={removePendingStudent}
      />

      {showPklModal && (
        <Modal
          isOpen={showPklModal}
          onClose={() => {
            setShowPklModal(false);
            data.refetchPklAbsensi();
            data.refetchProfile();
          }}
          title="Presensi Masuk & Pulang PKL"
          size="2xl"
        >
          <div className="p-1 sm:p-2 max-h-[85vh] overflow-y-auto w-full min-w-0">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <RefreshCw className="animate-spin text-indigo-500" size={28} />
                  <span className="text-xs font-bold text-slate-400">Memuat Kartu Presensi PKL...</span>
                </div>
              }
            >
              <AbsensiPklView
                isModal={true}
                hideLayout={true}
                onlyAttendanceCards={true}
                onClose={() => {
                  setShowPklModal(false);
                  data.refetchPklAbsensi();
                  data.refetchProfile();
                }}
              />
            </Suspense>
          </div>
        </Modal>
      )}

      <SiswaCardModal
        showDigitalCardModal={showDigitalCardModal}
        setShowDigitalCardModal={setShowDigitalCardModal}
        cardSide={cardSide}
        setCardSide={setCardSide}
        activeCardConfig={data.activeCardConfig}
        DEFAULT_CONFIG={DEFAULT_CONFIG}
        dynamicLogoUrl={data.dynamicLogoUrl}
        sekolahName={data.sekolahName}
        dynamicCardTitle="KARTU TANDA PELAJAR DIGITAL"
        studentPhotoUrl={data.studentPhotoUrl}
        studentName={data.studentName}
        currentNisn={data.currentNisn}
        currentClassName={data.currentClassName}
        currentJurusan={data.currentJurusan}
        qrCodeDataUrl={data.qrCodeDataUrl}
        dynamicRules="Gunakan QR Code ini untuk scan Tap Presensi Gerbang Sekolah & Akses Perpustakaan Digital."
      />

      {/* Modal Pengarahan Sesi Ujian CBT Aktif Siswa (Prioritas Utama saat Ada Ujian) */}
      <Suspense fallback={null}>
        {showExamDispatchModal && (
          <SiswaExamDispatchModal
            isOpen={showExamDispatchModal}
            onClose={() => {
              setShowExamDispatchModal(false);
              setIsExamDismissedByUser(true);
            }}
            activeExams={activeStudentExams}
            studentName={data.studentName}
            classNameTitle={data.currentClassName}
            onGoToCbtTab={() => handleTabChange('cbt')}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showOnboardingModal && (
          <SiswaOnboardingModal
            isOpen={showOnboardingModal}
            onClose={() => setShowOnboardingModal(false)}
            initialSection={activeSection}
            siswaId={data.siswaProfile?.id}
            onSuccess={() => data.refetchProfile()}
          />
        )}
      </Suspense>

      {/* Modal Scanner Presensi Sosialisasi Siswa (Khusus Kehadiran Diri) */}
      {isScanSosialisasiOpen && (
        <Suspense fallback={null}>
          <TeacherSosialisasiScanModal
            isOpen={isScanSosialisasiOpen}
            onClose={() => setIsScanSosialisasiOpen(false)}
            guruId={data.siswaProfile?.id || data.user?.siswa_id || data.user?.id || ''}
            guruNama={data.studentName || 'Siswa'}
            guruNip={data.currentNisn || '-'}
            tenantId={data.tenantId}
            activeSession={sosialisasiData?.session}
            isAlreadyAttended={isStudentAttended}
            waktuHadir={myStudentAttendance?.waktu_hadir}
            onSuccess={() => refetchSosialisasi()}
          />
        </Suspense>
      )}
    </div>
  );
};

export default SiswaDashboard;
