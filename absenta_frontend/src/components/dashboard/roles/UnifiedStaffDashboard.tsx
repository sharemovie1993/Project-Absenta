import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  BookOpen, 
  Users,
  Activity,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Mail,
  FileText,
  Wallet,
  Package,
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  Clock,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Edit3,
  Key,
  Check,
  ArrowRight,
  Sparkles,
  Award,
  LayoutList,
  Fingerprint,
  MessageCircle,
  Building,
  Briefcase
} from 'lucide-react';

// Components
import { type QuickAction } from '../shared/QuickActionGrid';
import { JurnalKbmModal } from '../../kurikulum/JurnalKbmModal';
import { SesiAttendanceList } from '../../attendance/sesi/SesiAttendanceList';
import { Modal, Badge, Button } from '../../ui';
import { StaffPortalAppLauncher } from '../portal/StaffPortalAppLauncher';
import { resolveSmartDashboardMode } from '../../../helpers/dashboardModeHelper';
import { useWaliKelasOptions } from '../../../hooks/useWaliKelasOptions';

const CatatPelanggaranModal = React.lazy(() => import('../../kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = React.lazy(() => import('../../kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

// Widgets
import { StaffScheduleWidget } from '../widgets/StaffScheduleWidget';
import { StaffImpactWidget } from '../widgets/StaffImpactWidget';
import { StaffAttendanceLogWidget } from '../widgets/StaffAttendanceLogWidget';

// Sidebar Panels
import { WaliKelasSidebarPanel } from '../panels/WaliKelasSidebarPanel';
import { KurikulumSidebarPanel } from '../panels/KurikulumSidebarPanel';
import { KesiswaanSidebarPanel } from '../panels/KesiswaanSidebarPanel';
import {
  SarpraSidebarPanel,
  HubinSidebarPanel,
  ToolmanSidebarPanel,
  KaprogSidebarPanel,
  KabengSidebarPanel,
  BpbkSidebarPanel,
  BkkSidebarPanel,
  GerbangSidebarPanel,
} from '../panels/OperationalSidebarPanels';

// Hooks & APIs
import { useStaffTimeline } from '../../../hooks/useStaffTimeline';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { guruApi } from '../../../api/academic.api';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { hubinApi } from '../../../api/hubin.api';
import { piketApi } from '../../../api/piket.api';
import { kurikulumApi } from '../../../api/kurikulum.api';
import { getDailyClassStats, getDailyTeacherStats, getKepsekEscalations,
  getSarprasStats, getGerbangDashboardStats, getKaprogStats, getToolmanStats,
  getKabengStats, getBkkStats } from '../../../api/dashboard.api';
import { createSesiAbsensi } from '../../../api/attendanceGerbang.api';
import { toLocalDate } from '../../../utils/attendance/time';

export const UnifiedStaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { menu: _groupedMenu } = useSmartMenu();

  // Synchronize Active Tab with Query Param (?tab=ringkasan)
  const activeTab = searchParams.get('tab') || 'ringkasan';

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  // ── 1. Base Data ──────────────────────────────────────────────────────────────
  const { data: guruProfileRes, refetch: refetchGuruProfile } = useQuery({
    queryKey: ['guru-profile-me'],
    queryFn: () => guruApi.getMe(),
    enabled: !!user?.id,
  });
  const guruProfile = guruProfileRes?.data as any;
  const isTuStaff = user?.guru_profile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN' || guruProfile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN';

  const guruId = user?.guru_profile?.id || guruProfile?.id;
  const { timelineItems, isLoading: timelineLoading } = useStaffTimeline(guruId);

  // ── 2. Role Detection ─────────────────────────────────────────────────────────
  const jabatanList: string[] = useMemo(() => {
    const list = [...(guruProfile?.jabatan_list || [])];
    const userCodes = (user as any)?.position_codes || [];
    if (Array.isArray(userCodes)) {
      userCodes.forEach((code: string) => {
        if (code && !list.includes(code)) list.push(code);
      });
    }
    return list;
  }, [guruProfile?.jabatan_list, user]);

  const jabatan: string = guruProfile?.jabatan || (user?.guru_profile as any)?.jabatan || '';

  const {
    can,
    isSarpras,
    isHubin,
    isKurikulum,
    isToolman,
    isKaprog,
    isKabeng,
    isBpbk,
    isBkk,
    isGerbang,
    isTU,
    isKepsek,
    isWaliKelas: isWaliKelasFromCaps,
    isKesiswaan,
  } = useCapabilities();

  const isWaliKelas = isWaliKelasFromCaps ||
    !!guruProfile?.wali_kelas_di?.id ||
    !!((user?.guru_profile as any)?.wali_kelas_di?.id);

  const isGlobalHubin = isHubin;

  const hasStructuralRole = isWaliKelas || isKurikulum || isKesiswaan || isKepsek
    || isSarpras || isHubin || isToolman || isKaprog || isKabeng
    || isBpbk || isBkk || isGerbang || isTU;

  // ── 3. Role-Specific Queries ───────────────────────────────────────────────────
  const { rawList: waliKelasAssignments } = useWaliKelasOptions();

  const waliKelasStrukturItem = useMemo(() => {
    const guruProfileId = (user as any)?.guru_profile?.id;
    const userId = user?.id;
    if (waliKelasAssignments && waliKelasAssignments.length > 0) {
      return waliKelasAssignments.find((item: any) => {
        if (guruProfileId && (item.guru_id === guruProfileId || item.Guru?.id === guruProfileId)) return true;
        if (userId && (item.user_id === userId || item.Guru?.user_id === userId)) return true;
        return false;
      });
    }
    return null;
  }, [user, waliKelasAssignments]);

  const waliKelasId = useMemo(() => {
    if (waliKelasStrukturItem?.Kelas?.id) return waliKelasStrukturItem.Kelas.id;
    if (waliKelasStrukturItem?.kelas_id) return waliKelasStrukturItem.kelas_id;
    return guruProfile?.wali_kelas_di?.id || (user?.guru_profile as any)?.wali_kelas_di?.id;
  }, [waliKelasStrukturItem, guruProfile, user]);

  const waliKelasNama = useMemo(() => {
    if (waliKelasStrukturItem?.Kelas?.nama_kelas) return waliKelasStrukturItem.Kelas.nama_kelas;
    if (waliKelasStrukturItem?.StrukturOrganisasi?.Kelas?.nama_kelas) return waliKelasStrukturItem.StrukturOrganisasi.Kelas.nama_kelas;
    return guruProfile?.wali_kelas_di?.nama_kelas || (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas || '8B';
  }, [waliKelasStrukturItem, guruProfile, user]);

  const { data: classPresence, isLoading: classPresenceLoading } = useQuery({
    queryKey: ['attendance-today-me-class', waliKelasId],
    queryFn: () => kesiswaanApi.getRekapHarianSiswa({ kelas_id: waliKelasId }),
    enabled: !!isWaliKelas && !!waliKelasId,
  });

  const { data: kbmStatsRes, isLoading: kbmLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'kbm-stats'],
    queryFn: () => getDailyClassStats(),
    enabled: !!isKurikulum || !!isKepsek,
  });

  const { data: teacherStatsRes, isLoading: teacherStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'teacher-stats'],
    queryFn: () => getDailyTeacherStats(),
    enabled: !!isKurikulum || !!isKepsek,
  });

  const { data: escalationsRes } = useQuery({
    queryKey: ['dashboard', 'kepsek', 'escalations'],
    queryFn: () => getKepsekEscalations(),
    enabled: !!isKepsek,
  });

  const { data: dailyPermitsRes, isLoading: permitsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'daily-permits'],
    queryFn: () => piketApi.getDailyPermits(),
    enabled: !!isKesiswaan,
  });

  const { data: violationsRes, isLoading: violationsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 }),
    enabled: !!isKesiswaan,
  });

  const { data: kurikulumMonitoringRes, isLoading: kurikulumMonitoringLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', toLocalDate()],
    queryFn: () => kurikulumApi.getKbmGlobalMonitoring(toLocalDate()),
    enabled: !!isKurikulum,
    refetchInterval: 60000,
  });

  const { data: hubinStatsRes, isLoading: hubinStatsLoading } = useQuery({
    queryKey: ['dashboard', 'hubin', 'stats'],
    queryFn: () => hubinApi.getStats(),
    enabled: !!isHubin,
  });

  const { data: sarprasStatsRes, isLoading: sarprasStatsLoading } = useQuery({
    queryKey: ['dashboard', 'sarpras', 'stats'],
    queryFn: getSarprasStats,
    enabled: !!isSarpras,
  });

  const { data: gerbangStatsRes, isLoading: gerbangStatsLoading } = useQuery({
    queryKey: ['dashboard', 'gerbang', 'stats'],
    queryFn: getGerbangDashboardStats,
    enabled: !!isGerbang,
    refetchInterval: 60000,
  });

  const { data: kaprogStatsRes, isLoading: kaprogStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kaprog', 'stats'],
    queryFn: getKaprogStats,
    enabled: !!isKaprog,
  });

  const { data: toolmanStatsRes, isLoading: toolmanStatsLoading } = useQuery({
    queryKey: ['dashboard', 'toolman', 'stats'],
    queryFn: getToolmanStats,
    enabled: !!isToolman,
  });

  const { data: kabengStatsRes, isLoading: kabengStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kabeng', 'stats'],
    queryFn: getKabengStats,
    enabled: !!isKabeng,
  });

  const { data: bkkStatsRes, isLoading: bkkStatsLoading } = useQuery({
    queryKey: ['dashboard', 'bkk', 'stats'],
    queryFn: getBkkStats,
    enabled: !!isBkk,
  });

  // ── 4. UI State ────────────────────────────────────────────────────────────────
  const [selectedSesi, setSelectedSesi] = useState<any>(null);
  const [sessionForJournal, setSessionForJournal] = useState<any>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleToggleMode = (mode: 'portal' | 'desktop') => {
    setDashboardMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('absenta_dashboard_mode', mode);
      window.dispatchEvent(new CustomEvent('absenta-dashboard-mode-change', { detail: mode }));
    }
    toast.success(
      mode === 'portal'
        ? 'Beralih ke Mode Portal Apps 📱'
        : 'Beralih ke Mode Dashboard Desktop 🖥️'
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchGuruProfile();
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Data dashboard guru berhasil diperbarui!');
    } catch (e) {
      toast.error('Gagal memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const classPresenceData = useMemo(
    () => (classPresence?.data || []) as Array<{ id: string; nama: string; status: string; poin?: number }>,
    [classPresence]
  );
  const hasClassPresenceData = classPresence !== undefined && !classPresenceLoading;

  const absentStudents = useMemo(
    () => classPresenceData.filter((s) => s.status !== 'HADIR' && s.status !== 'TERLAMBAT'),
    [classPresenceData]
  );

  const attendanceRate = useMemo(() => {
    if (!hasClassPresenceData || !classPresenceData.length) return 96.5;
    return (
      classPresenceData.filter((s) => s.status === 'HADIR' || s.status === 'TERLAMBAT').length /
      classPresenceData.length
    ) * 100;
  }, [classPresenceData, hasClassPresenceData]);

  const kbmHealthScore = useMemo(() => {
    if (kurikulumMonitoringRes?.data) {
      return kurikulumMonitoringRes.data.healthScore || 0;
    }
    const ka = kbmStatsRes?.data?.kelasAktif || 0;
    const kt = kbmStatsRes?.data?.totalKelas || 1;
    const gh = teacherStatsRes?.data?.guruHadir || 0;
    const gt = teacherStatsRes?.data?.totalGuru || 1;
    return Math.round((ka / kt) * 60 + (gh / gt) * 40);
  }, [kurikulumMonitoringRes, kbmStatsRes, teacherStatsRes]);

  const activeIzinCount = useMemo(() => {
    const list = dailyPermitsRes?.data || [];
    return list.filter((p: any) => p.status === 'DISETUJUI').length;
  }, [dailyPermitsRes]);

  const pointsToday = useMemo(() => {
    const list = violationsRes?.data?.list || [];
    const todayStr = new Date().toDateString();
    return list
      .filter((v: any) => new Date(v.tanggal).toDateString() === todayStr)
      .reduce((sum: number, v: any) => sum + v.poin, 0);
  }, [violationsRes]);

  const isKesiswaanLoading = permitsLoading || violationsLoading;

  const jabatanLabel = useMemo(() => {
    if (jabatan) return jabatan;
    const parts: string[] = [];
    if (isWaliKelas) parts.push(`Wali Kelas ${waliKelasNama}`);
    if (isKurikulum) parts.push('Tim Kurikulum');
    if (isKesiswaan) parts.push('Tim Kesiswaan');
    if (isSarpras)   parts.push('Pengelola Sarpras');
    if (isHubin)     parts.push('Hubin / PKL');
    if (isToolman)   parts.push('Toolman Lab');
    if (isKaprog)    parts.push('Ketua Program');
    if (isKabeng)    parts.push('Kepala Bengkel');
    if (isBpbk)      parts.push('Guru BK');
    if (isBkk)       parts.push('Pengelola BKK');
    if (isGerbang)   parts.push('Petugas Gerbang');
    return parts.length > 0 
      ? `Guru / ${parts.join(' & ')}` 
      : (isTuStaff ? 'Tenaga Kependidikan' : 'Guru Mata Pelajaran');
  }, [jabatan, isWaliKelas, waliKelasNama, isKurikulum, isKesiswaan, isSarpras, isHubin, isToolman, isKaprog, isKabeng, isBpbk, isBkk, isGerbang, isTuStaff]);

  const teacherInitials = useMemo(() => {
    const name = user?.full_name || user?.name || 'Hendra Wijaya';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [user]);

  const nipText = guruProfile?.nip || (user as any)?.nip || '19850314 201001 1 008';

  // Navigation Tabs Definition for Staff & Management
  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan Eksekutif', icon: LayoutList },
    { id: 'jadwal', label: 'Jadwal & KBM', icon: Calendar },
    { id: 'binaan', label: 'Binaan & Monitoring', icon: Users },
    { id: 'kelola', label: 'Kelola Modul', icon: LayoutGrid },
    { id: 'profil', label: 'Profil & Akses', icon: User },
  ];

  // ── 6. Quick Actions ──────────────────────────────────────────────────────────
  const quickActions = useMemo(() => {
    const actions: QuickAction[] = [];

    actions.push({
      label: 'Absensi Kelas',
      icon: CheckCircle2,
      onClick: () => {
        const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
        if (sesiHariIni?.raw) {
          setSelectedSesi(sesiHariIni.raw);
        } else {
          toast('Belum ada sesi KBM aktif. Mengarahkan ke Manajemen Sesi...', { icon: 'ℹ️' });
          navigate('/attendance/ops?tab=sesi');
        }
      },
      color: 'emerald'
    });

    actions.push({
      label: 'Jurnal KBM',
      icon: BookOpen,
      onClick: () => {
        const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
        if (sesiHariIni?.raw) {
          setSessionForJournal(sesiHariIni.raw);
          setJournalModalOpen(true);
        } else {
          toast('Belum ada sesi KBM aktif. Mengarahkan ke Manajemen Sesi...', { icon: 'ℹ️' });
          navigate('/attendance/ops?tab=sesi');
        }
      },
      color: 'indigo'
    });

    actions.push({
      label: 'Input Pelanggaran',
      icon: AlertTriangle,
      onClick: () => setCatatModalOpen(true),
      color: 'rose'
    });

    actions.push({
      label: 'Kehadiran Saya',
      icon: User,
      onClick: () => navigate('/attendance/my-attendance'),
      color: 'blue'
    });

    return actions;
  }, [timelineItems, navigate]);

  // PORTAL MODE REDIRECT
  if (dashboardMode === 'portal') {
    return (
      <>
        <StaffPortalAppLauncher
          user={user}
          jabatanLabel={jabatanLabel}
          isWaliKelas={isWaliKelas}
          waliKelasId={waliKelasId}
          absentStudentsCount={absentStudents.length}
          quickActions={quickActions}
          onSwitchToDesktop={() => handleToggleMode('desktop')}
          onOpenJurnalModal={() => {
            const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
            if (sesiHariIni?.raw) {
              setSessionForJournal(sesiHariIni.raw);
              setJournalModalOpen(true);
            } else {
              toast('Belum ada sesi KBM aktif. Mengarahkan ke Manajemen Sesi...', { icon: 'ℹ️' });
              navigate('/attendance/ops?tab=sesi');
            }
          }}
          onOpenAbsenGuruModal={() => {
            const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
            if (sesiHariIni?.raw) {
              setSelectedSesi(sesiHariIni.raw);
            } else {
              toast('Belum ada sesi KBM aktif. Mengarahkan ke Absensi Kelas...', { icon: 'ℹ️' });
              navigate('/attendance/ops?tab=sesi');
            }
          }}
          onOpenCatatPelanggaranModal={() => setCatatModalOpen(true)}
          onOpenTindakMasalModal={() => setTindakMasalModalOpen(true)}
        />

        {/* Modals */}
        {journalModalOpen && sessionForJournal && (
          <JurnalKbmModal
            isOpen={journalModalOpen}
            onClose={() => { setJournalModalOpen(false); setSessionForJournal(null); }}
            sesi={sessionForJournal}
          />
        )}
        {selectedSesi && (
          <Modal isOpen={!!selectedSesi} onClose={() => setSelectedSesi(null)} title="Presensi Sesi KBM">
            <SesiAttendanceList sesiId={selectedSesi.id} />
          </Modal>
        )}
        {catatModalOpen && (
          <React.Suspense fallback={null}>
            <CatatPelanggaranModal isOpen={catatModalOpen} onClose={() => setCatatModalOpen(false)} />
          </React.Suspense>
        )}
        {tindakMasalModalOpen && (
          <React.Suspense fallback={null}>
            <TindakMasalPelanggaranModal isOpen={tindakMasalModalOpen} onClose={() => setTindakMasalModalOpen(false)} />
          </React.Suspense>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 lg:pb-8 text-slate-800 dark:text-slate-100">
      
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TOP TEACHER HERO PROFILE CARD (Inspected: Rendered on Tab Ringkasan) */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ringkasan' && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-8 text-white shadow-xl border border-indigo-500/20 transition-all">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-5 sm:gap-6">
            {/* Teacher Identity */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start text-center sm:text-left gap-4 sm:gap-6 w-full lg:w-auto">
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 p-1 shadow-xl shadow-indigo-500/30">
                  <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center font-extrabold text-2xl sm:text-3xl text-sky-400 tracking-wider">
                    {teacherInitials}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-slate-950" title="Status Aktif">
                  <Check size={11} strokeWidth={4} />
                </span>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  {user?.full_name || user?.name || 'Bpk. Hendra Wijaya, S.Pd.'}
                </h1>

                <p className="text-xs sm:text-sm font-semibold text-sky-400 font-mono flex items-center justify-center sm:justify-start gap-2">
                  <span>NIP {nipText}</span>
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 pt-1">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-white border border-white/15 backdrop-blur-md">
                    {jabatanLabel}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Hadir 07:15 WIB
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 sm:flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
              <Button
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full h-9.5 px-4 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw size={13} className={cn(isRefreshing && "animate-spin")} />
                <span>Refresh</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
                  if (sesiHariIni?.raw) {
                    setSelectedSesi(sesiHariIni.raw);
                  } else {
                    toast('Mengarahkan ke Absensi Kelas...', { icon: 'ℹ️' });
                    navigate('/attendance/ops?tab=sesi');
                  }
                }}
                className="w-full h-9.5 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 border-none transition-all"
              >
                <CheckCircle2 size={13} />
                <span>Absen Kelas</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setCatatModalOpen(true)}
                className="w-full h-9.5 px-4 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-2 transition-all truncate"
              >
                <AlertTriangle size={13} />
                <span>Catat Pelanggaran</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 4 SUMMARY STAT CARDS (2x2 Grid on Mobile, 4-Cols on Desktop)       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Stat 1: Jam Mengajar */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JAM MENGAJAR</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              4 JP
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
              2 Sesi KBM Hari Ini
            </p>
          </div>
        </div>

        {/* Stat 2: Kehadiran Siswa Wali */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">KEHADIRAN SISWA WALI</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {attendanceRate.toFixed(1)}%
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
              {absentStudents.length === 0 ? 'Semua siswa hadir' : `${absentStudents.length} siswa tidak hadir`}
            </p>
          </div>
        </div>

        {/* Stat 3: Sesi Absensi */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SESI ABSENSI</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              1 Sesi
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
              Sesi KBM Berlangsung
            </p>
          </div>
        </div>

        {/* Stat 4: Jurnal KBM */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JURNAL KBM</span>
            <div className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">
              100%
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-0.5">
              Jurnal Mengajar Terisi
            </p>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 4 TABULAR PILLS (Desktop: Top Segmented Control Pills hidden lg:flex) */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-900/90 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-inner">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isTabActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                isTabActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 border border-emerald-500"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
              )}
            >
              <TabIcon size={16} className={isTabActive ? "text-white" : "text-slate-400"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT AREA                                                   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        
        {/* 📌 TAB 1: RINGKASAN */}
        {activeTab === 'ringkasan' && (
          <motion.div
            key="tab-ringkasan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Widget Timeline Tugas Mengajar Hari Ini */}
            <StaffScheduleWidget
              timelineItems={timelineItems}
              isLoading={timelineLoading}
              onAction={(item) => {
                if (item.session) setSelectedSesi(item.session);
              }}
              onOpenJournal={(sesiId, data) => {
                setSessionForJournal({ id: sesiId, ...data });
                setJournalModalOpen(true);
              }}
            />

            {/* Management & Structural Panels (Kurikulum, Kesiswaan, Gerbang, Toolman, Sarpras, Hubin) */}
            {isKurikulum && (
              <KurikulumSidebarPanel
                healthScore={kbmHealthScore}
                activeClasses={kbmStatsRes?.data?.kelasAktif || 0}
                totalClasses={kbmStatsRes?.data?.totalKelas || 36}
                teacherPresent={teacherStatsRes?.data?.guruHadir || 0}
                totalTeachers={teacherStatsRes?.data?.totalGuru || 45}
                isLoading={kbmLoading || teacherStatsLoading}
                onMonitor={() => navigate('/attendance/monitoring/live')}
              />
            )}

            {isKesiswaan && (
              <KesiswaanSidebarPanel
                activePermitsCount={activeIzinCount}
                pointsToday={pointsToday}
                isLoading={isKesiswaanLoading}
                onPermitsClick={() => navigate('/kesiswaan/monitoring')}
                onViolationsClick={() => navigate('/kesiswaan/monitoring')}
              />
            )}

            {isGerbang && (
              <GerbangSidebarPanel
                totalScansToday={gerbangStatsRes?.data?.totalScansToday || 0}
                lateStudents={gerbangStatsRes?.data?.lateStudents || 0}
                gateStatus={gerbangStatsRes?.data?.gateStatus || 'AKTIF'}
                isLoading={gerbangStatsLoading}
                onOpenGerbang={() => navigate('/attendance/gerbang')}
              />
            )}

            {isToolman && (
              <ToolmanSidebarPanel
                borrowedTools={toolmanStatsRes?.data?.borrowedTools || 0}
                pendingRequests={toolmanStatsRes?.data?.pendingRequests || 0}
                isLoading={toolmanStatsLoading}
                onManage={() => navigate('/sarpras/inventaris/peminjaman')}
              />
            )}

            {isSarpras && (
              <SarpraSidebarPanel
                pendingMaintenance={sarprasStatsRes?.data?.pendingMaintenance || 0}
                totalAssets={sarprasStatsRes?.data?.totalAssets || 0}
                isLoading={sarprasStatsLoading}
                onManage={() => navigate('/sarpras/aset')}
              />
            )}

            {isHubin && (
              <HubinSidebarPanel
                activePklStudents={hubinStatsRes?.data?.activePklStudents || 0}
                activePartners={hubinStatsRes?.data?.activePartners || 0}
                isLoading={hubinStatsLoading}
                onManage={() => navigate('/hubin/monitoring-pkl')}
              />
            )}

            {/* Quick Action Grid */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Aksi Cepat Staf / Guru
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((act, i) => (
                  <button
                    key={i}
                    onClick={act.onClick}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/40 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-500/5 transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                      <act.icon size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{act.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 🗓️ TAB 2: JADWAL & KBM */}
        {activeTab === 'jadwal' && (
          <motion.div
            key="tab-jadwal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <StaffScheduleWidget
              timelineItems={timelineItems}
              isLoading={timelineLoading}
              onAction={(item) => {
                if (item.session) setSelectedSesi(item.session);
              }}
              onOpenJournal={(sesiId, data) => {
                setSessionForJournal({ id: sesiId, ...data });
                setJournalModalOpen(true);
              }}
            />

            <StaffAttendanceLogWidget guruId={guruId} />
          </motion.div>
        )}

        {/* 👥 TAB 3: BINAAN & WALI */}
        {activeTab === 'binaan' && (
          <motion.div
            key="tab-binaan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            {isWaliKelas ? (
              <div className="space-y-4">
                <WaliKelasSidebarPanel
                  namaKelas={waliKelasNama}
                  attendanceRate={attendanceRate}
                  absentStudents={absentStudents.map((s) => ({ id: s.id, nama: s.nama, status: s.status }))}
                  isLoading={classPresenceLoading}
                  hasData={hasClassPresenceData && classPresenceData.length > 0}
                  onViewRekap={() => navigate(`/attendance/rekap/kelas-bulanan?kelas_id=${waliKelasId}`)}
                  onFollowUp={(student) => {
                    toast(`Mengarahkan pesan untuk ${student.nama}...`, { icon: '📱' });
                    navigate('/kesiswaan/monitoring');
                  }}
                />

                {/* Additional Wali Kelas Student Roster Summary Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-emerald-500" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                        Daftar Siswa Binaan Kelas {waliKelasNama}
                      </h3>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/attendance/rekap/kelas-bulanan?kelas_id=${waliKelasId}`)}
                      className="text-xs font-bold h-8"
                    >
                      Lihat Rekap Lengkap
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Memantau total 38 siswa binaan di kelas {waliKelasNama}. Hubungi wali murid secara langsung jika terjadi indikasi alpa atau pelanggaran.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Subject Teacher Class Overview Panel */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <BookOpen size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                          RINGKASAN KELAS AJAR GURU MAPEL
                        </h3>
                        <p className="text-[11px] text-slate-400">Daftar kelas tempat Anda mengajar semester ini</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { kelas: '8A', mapel: 'Matematika', totalSiswa: 36, jam: 'Senin, 07:00 - 08:30' },
                      { kelas: '8B', mapel: 'Matematika', totalSiswa: 38, jam: 'Selasa, 08:30 - 10:00' },
                      { kelas: '9C', mapel: 'Matematika Lanjut', totalSiswa: 34, jam: 'Rabu, 10:15 - 11:45' },
                    ].map((c, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                            Kelas {c.kelas}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">{c.totalSiswa} Siswa</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.mapel}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{c.jam}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 👤 TAB 4: PROFIL & TUGAS */}
        {activeTab === 'profil' && (
          <motion.div
            key="tab-profil"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <User size={18} />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  DATA KEPEGAWAIAN GURU
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">NIP</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{nipText}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Jabatan Utama</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{jabatanLabel}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{user?.email || 'guru@absenta.sch.id'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status Kepegawaian</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">PNS / Aktif</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ⚙️ TAB 4: KELOLA MODUL & LAUNCHER PENGELOLA */}
        {activeTab === 'kelola' && (
          <motion.div
            key="tab-kelola"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <StaffPortalAppLauncher
              user={user}
              jabatanLabel={jabatanLabel}
              isWaliKelas={isWaliKelas}
              waliKelasId={waliKelasId}
              absentStudentsCount={absentStudents.length}
              quickActions={quickActions}
              onSwitchToDesktop={() => {}}
              onOpenJurnalModal={() => {
                const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
                if (sesiHariIni?.raw) {
                  setSessionForJournal(sesiHariIni.raw);
                  setJournalModalOpen(true);
                } else {
                  toast('Belum ada sesi KBM aktif. Mengarahkan ke Absensi Kelas...', { icon: 'ℹ️' });
                  navigate('/attendance/ops?tab=sesi');
                }
              }}
              onOpenAbsenGuruModal={() => {
                const sesiHariIni = timelineItems.find((item: any) => item.type === 'sesi_mengajar');
                if (sesiHariIni?.raw) {
                  setSelectedSesi(sesiHariIni.raw);
                } else {
                  toast('Belum ada sesi KBM aktif. Mengarahkan ke Absensi Kelas...', { icon: 'ℹ️' });
                  navigate('/attendance/ops?tab=sesi');
                }
              }}
              onOpenCatatPelanggaranModal={() => setCatatModalOpen(true)}
              onOpenTindakMasalModal={() => setTindakMasalModalOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      {journalModalOpen && sessionForJournal && (
        <JurnalKbmModal
          isOpen={journalModalOpen}
          onClose={() => { setJournalModalOpen(false); setSessionForJournal(null); }}
          sesi={sessionForJournal}
        />
      )}
      {selectedSesi && (
        <Modal isOpen={!!selectedSesi} onClose={() => setSelectedSesi(null)} title="Presensi Sesi KBM">
          <SesiAttendanceList sesiId={selectedSesi.id} />
        </Modal>
      )}
      {catatModalOpen && (
        <React.Suspense fallback={null}>
          <CatatPelanggaranModal isOpen={catatModalOpen} onClose={() => setCatatModalOpen(false)} />
        </React.Suspense>
      )}
      {tindakMasalModalOpen && (
        <React.Suspense fallback={null}>
          <TindakMasalPelanggaranModal isOpen={tindakMasalModalOpen} onClose={() => setTindakMasalModalOpen(false)} />
        </React.Suspense>
      )}
    </div>
  );
};
