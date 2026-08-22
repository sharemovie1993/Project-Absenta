import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionWindowAlert } from '../../../hooks/attendance/useSessionWindowAlert';
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
  LayoutGrid,
  Fingerprint,
  MessageCircle,
  Building,
  Briefcase,
  UserCheck,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  X,
  QrCode,
  MapPin,
  Flag,
  Zap
} from 'lucide-react';

// Components
import { type QuickAction } from '../shared/QuickActionGrid';
import { JurnalKbmModal } from '../../kurikulum/JurnalKbmModal';
import { SesiAttendanceList } from '../../attendance/sesi/SesiAttendanceList';
import { Modal, Badge, Button, Loader } from '../../ui';
import { StaffPortalAppLauncher } from '../portal/StaffPortalAppLauncher';
import { resolveSmartDashboardMode } from '../../../helpers/dashboardModeHelper';
import { useWaliKelasOptions } from '../../../hooks/useWaliKelasOptions';
import { PiketOperations } from '../../piket/PiketOperations';
import { PiketPrintSlip } from '../../piket/PiketPrintSlip';
import { usePiketIzinKeluarOptions } from '../../../hooks/usePiketIzinKeluarOptions';
import { tenantApi } from '../../../api/tenants.api';
import { useNavStore } from '../../../store/navStore';

// Staff Dashboard Modular Tabs
import { StaffBerandaTab } from '../staff/tabs/StaffBerandaTab';
import { StaffKbmAbsenTab } from '../staff/tabs/StaffKbmAbsenTab';
import { StaffWaliKelasTab } from '../staff/tabs/StaffWaliKelasTab';
import { StaffPiketOperasionalTab } from '../staff/tabs/StaffPiketOperasionalTab';
import { StaffProfilGuruTab } from '../staff/tabs/StaffProfilGuruTab';
import { StaffManualInputTab } from '../staff/tabs/StaffManualInputTab';

// Lazy Module Dashboards for In-Tab Rendering (Bebas Sidebar, 100% Full Width)
const KurikulumDashboard = React.lazy(() => import('@/pages/kurikulum/Dashboard'));
const KesiswaanDashboard = React.lazy(() => import('@/pages/kesiswaan/MonitoringKesiswaanPage'));
const SarprasDashboard = React.lazy(() => import('@/pages/sarpras/SarprasDashboard'));
const HubinDashboard = React.lazy(() => import('@/pages/hubin/HubinDashboardPage'));
const CooperativeDashboard = React.lazy(() => import('@/pages/cooperative/Dashboard'));
const BpbkDashboard = React.lazy(() => import('@/pages/bpbk/DashboardPage'));
// Admin Overview Tab — dirender di tab Admin untuk role ADMIN/SUPERADMIN
import { StaffAdminOverviewTab } from '../staff/tabs/StaffAdminOverviewTab';
// Academic & Kepegawaian Dashboard — dirender di tab TU Kepegawaian
const AcademicDashboard = React.lazy(() => import('@/pages/academic/AcademicDashboard'));

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

  // ── 1. Base Data ──────────────────────────────────────────────────────────────
  const { data: guruProfileRes, refetch: refetchGuruProfile } = useQuery({
    queryKey: ['guru-profile-me'],
    queryFn: () => guruApi.getMe(),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });
  const guruProfile = guruProfileRes?.data as any;
  const isTuStaff = user?.guru_profile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN' || guruProfile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN';

  const guruId = user?.guru_profile?.id || guruProfile?.id;
  const { timelineItems, isLoading: timelineLoading, refetch: refetchTimeline } = useStaffTimeline(guruId);

  // 🔔 Global KBM Window Alert for Teacher (works across all tabs in dashboard)
  useSessionWindowAlert({
    schedules: Array.isArray(timelineItems) ? (timelineItems as any) : [],
    enabled: !isTuStaff && !!guruId,
    roleLabel: 'guru',
  });

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
    isAdmin,
    isSarpras,
    isHubin,
    isKurikulum,
    isToolman,
    isKaprog,
    isKabeng,
    isBpbk,
    isBkk,
    isGerbang,
    isPiketGuru,
    isPetugasKelas,
    isTU,
    isTUKepala,
    isTUKepegawaian,
    isTUPersuratan,
    isTUKeuangan,
    isTUSarpras,
    isKepsek,
    isWaliKelas: isWaliKelasFromCaps,
    isKesiswaan,
    isKoperasi,
  } = useCapabilities();

  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isAdminRole = isAdmin || roleName === 'ADMIN' || roleName === 'SUPERADMIN';

  // Jenis PTK Detection: PENDIDIK vs TENAGA KEPENDIDIKAN
  const jenisPtk = (
    guruProfile?.jenis_ptk ||
    (user?.guru_profile as any)?.jenis_ptk ||
    (user as any)?.jenis_ptk ||
    ''
  ).toUpperCase();

  // Petugas Gerbang Detection (Murni untuk staf satpam/gerbang, bukan Admin/Kepsek/Kurikulum)
  const isSecurityRole = roleName === 'GERBANG' ||
    roleName === 'PETUGAS_GERBANG' ||
    jabatanList.some((j: string) => j.toUpperCase().includes('GERBANG') || j.toUpperCase().includes('SATPAM') || j.toUpperCase().includes('SECURITY')) ||
    jabatan.toUpperCase().includes('GERBANG') ||
    jabatan.toUpperCase().includes('SATPAM') ||
    jabatan.toUpperCase().includes('SECURITY');

  const hasGerbangDuty = isGerbang || isSecurityRole || (
    !isAdminRole && !isKurikulum && !isKepsek && (
      can('attendance.gate.scan') ||
      can('attendance.gate.tap.entry') ||
      can('dashboard.view.gerbang')
    )
  );

  // True Pendidik (Guru Pengajar KBM)
  const isPendidik = (
    (jenisPtk === 'PENDIDIK' || (!jenisPtk && (roleName === 'GURU' || isWaliKelasFromCaps))) &&
    !isSecurityRole &&
    !isTuStaff
  );

  const isPureGerbangStaff = isSecurityRole || (hasGerbangDuty && !isPendidik && !isAdminRole && !isKepsek && !isKurikulum);

  const isWaliKelas = isWaliKelasFromCaps ||
    !!guruProfile?.wali_kelas_di?.id ||
    !!((user?.guru_profile as any)?.wali_kelas_di?.id);

  const isGlobalHubin = isHubin;

  const hasStructuralRole = isWaliKelas || isKurikulum || isKesiswaan || isKepsek
    || isSarpras || isHubin || isToolman || isKaprog || isKabeng
    || isBpbk || isBkk || isGerbang || isTU;

  // 🎯 SMART DEFAULT TAB RESOLUTION (Matriks Fokus Pertama Tab Berdasarkan Role/Jabatan)
  const defaultTabId = useMemo(() => {
    if (isAdminRole) return 'admin';
    if (isKurikulum || isKepsek) return 'kurikulum';
    if (isKesiswaan) return 'kesiswaan';
    if (isKoperasi) return 'koperasi';
    if (isBpbk) return 'bpbk';
    if (isSarpras || isToolman || isKabeng) return 'sarpras';
    if (isHubin || isBkk || isKaprog) return 'hubin';
    if (isTUKepegawaian || isTU) return 'kepegawaian';
    if (isWaliKelas && !isPendidik) return 'binaan';
    if (isPendidik) return 'jadwal';
    if (isWaliKelas) return 'binaan';
    if (isPiketGuru) return 'kelola';
    if (isPureGerbangStaff) return 'ringkasan';
    return 'ringkasan';
  }, [
    isAdminRole,
    isKurikulum,
    isKepsek,
    isKesiswaan,
    isWaliKelas,
    isPendidik,
    isSarpras,
    isToolman,
    isKabeng,
    isHubin,
    isBkk,
    isKaprog,
    isBpbk,
    isKoperasi,
    isTUKepegawaian,
    isTU,
    isPiketGuru,
    isPureGerbangStaff,
  ]);

  // Synchronize Active Tab with Query Param (?tab=...) atau Smart Default Tab
  const activeTab = searchParams.get('tab') || defaultTabId;

  const handleTabChange = React.useCallback((newTab: string) => {
    setSearchParams({ tab: newTab }, { replace: true });
  }, [setSearchParams]);

  const { setActiveWorkspaceId } = useNavStore();

  // Sync NavStore activeWorkspaceId based on active tab
  useEffect(() => {
    if (activeTab === 'binaan') {
      setActiveWorkspaceId('WALIKELAS_WORKSPACE');
    }
  }, [activeTab, setActiveWorkspaceId]);

  // ── 3. Role-Specific Scoped Queries (Google Platform Standard: Scoped Lazy Query Execution) ───
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
    queryFn: () => kesiswaanApi.getRekapHarianSiswa({ kelas_id: waliKelasId }).catch(() => ({ success: true, data: [] })),
    enabled: !!isWaliKelas && !!waliKelasId && (activeTab === 'binaan' || activeTab === 'ringkasan'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kbmStatsRes, isLoading: kbmLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'kbm-stats'],
    queryFn: () => getDailyClassStats().catch(() => ({ success: true, data: null })),
    enabled: (!!isKurikulum || !!isKepsek) && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: teacherStatsRes, isLoading: teacherStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'teacher-stats'],
    queryFn: () => getDailyTeacherStats().catch(() => ({ success: true, data: null })),
    enabled: (!!isKurikulum || !!isKepsek) && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: escalationsRes } = useQuery({
    queryKey: ['dashboard', 'kepsek', 'escalations'],
    queryFn: () => getKepsekEscalations().catch(() => ({ success: true, data: [] })),
    enabled: !!isKepsek && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyPermitsRes, isLoading: permitsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'daily-permits'],
    queryFn: () => piketApi.getDailyPermits().catch(() => ({ success: true, data: [] })),
    enabled: !!isKesiswaan && (can('attendance.piket.view') || can('attendance.gate.scan')) && (activeTab === 'kelola' || activeTab === 'ringkasan'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: violationsRes, isLoading: violationsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 }).catch(() => ({ success: true, data: { list: [] } })),
    enabled: !!isKesiswaan && (activeTab === 'ringkasan' || activeTab === 'binaan'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kurikulumMonitoringRes, isLoading: kurikulumMonitoringLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', toLocalDate()],
    queryFn: () => kurikulumApi.getKbmGlobalMonitoring(toLocalDate()).catch(() => ({ success: true, data: null })),
    enabled: !!isKurikulum && activeTab === 'ringkasan',
    staleTime: 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: hubinStatsRes, isLoading: hubinStatsLoading } = useQuery({
    queryKey: ['dashboard', 'hubin', 'stats'],
    queryFn: () => hubinApi.getStats().catch(() => ({ success: true, data: null })),
    enabled: !!isHubin && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: sarprasStatsRes, isLoading: sarprasStatsLoading } = useQuery({
    queryKey: ['dashboard', 'sarpras', 'stats'],
    queryFn: () => getSarprasStats().catch(() => ({ success: true, data: null })),
    enabled: !!isSarpras && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: gerbangStatsRes, isLoading: gerbangStatsLoading } = useQuery({
    queryKey: ['dashboard', 'gerbang', 'stats'],
    queryFn: () => getGerbangDashboardStats().catch(() => ({ success: true, data: null })),
    enabled: !!isGerbang && (can('attendance.gate.scan') || can('attendance.piket.view')) && (activeTab === 'kelola' || activeTab === 'ringkasan'),
    staleTime: 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: kaprogStatsRes, isLoading: kaprogStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kaprog', 'stats'],
    queryFn: () => getKaprogStats().catch(() => ({ success: true, data: null })),
    enabled: !!isKaprog && can('dashboard.view.kaprog') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: toolmanStatsRes, isLoading: toolmanStatsLoading } = useQuery({
    queryKey: ['dashboard', 'toolman', 'stats'],
    queryFn: () => getToolmanStats().catch(() => ({ success: true, data: null })),
    enabled: !!isToolman && can('dashboard.view.toolman') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: kabengStatsRes, isLoading: kabengStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kabeng', 'stats'],
    queryFn: () => getKabengStats().catch(() => ({ success: true, data: null })),
    enabled: !!isKabeng && can('dashboard.view.kabeng') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: bkkStatsRes, isLoading: bkkStatsLoading } = useQuery({
    queryKey: ['dashboard', 'bkk', 'stats'],
    queryFn: () => getBkkStats().catch(() => ({ success: true, data: null })),
    enabled: !!isBkk && can('dashboard.view.bkk') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  // ── 4. UI State & Piket Operations ─────────────────────────────────────────────
  const { rawList: dailyPermits, refetch: refetchPermits } = usePiketIzinKeluarOptions();
  const [printedPermit, setPrintedPermit] = useState<any>(null);
  const [printPaperSize, setPrintPaperSize] = useState<string>('80mm');

  const { data: tenantRes } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: () => tenantApi.getMyTenant().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const tenantInfo = tenantRes?.success ? tenantRes.data : null;

  const [selectedSesi, setSelectedSesi] = useState<any>(null);
  const [sessionForJournal, setSessionForJournal] = useState<any>(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [tindakMasalModalOpen, setTindakMasalModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // KBM & Absen Interactive Tab State (Adopsi Gambar Mockup KBM & Absen Guru)
  const [kbmSiswaList, setKbmSiswaList] = useState([
    { id: '1', nama: 'Fahrizal Rahmat', nisn: '0058291824', status: 'HADIR' },
    { id: '2', nama: 'Anisa Maharani', nisn: '0058291825', status: 'HADIR' },
    { id: '3', nama: 'Bagas Prasetyo', nisn: '0058291826', status: 'HADIR' },
    { id: '4', nama: 'Citra Dewi Permata', nisn: '0058291827', status: 'HADIR' },
    { id: '5', nama: 'Daffa Rizky Saputra', nisn: '0058291828', status: 'ALPA' },
    { id: '6', nama: 'Elvina Nurul Zahra', nisn: '0058291829', status: 'SAKIT' },
  ]);

  const [jurnalMateri, setJurnalMateri] = useState(
    'Materi: Pengenalan State Management & Router pada React & TypeScript. Praktek membuat aplikasi CRUD Sederhana.'
  );

  const handleMarkAllHadir = () => {
    setKbmSiswaList(prev => prev.map(s => ({ ...s, status: 'HADIR' })));
    toast.success('Semua siswa ditandai HADIR!');
  };

  const handleStatusChange = (id: string, status: string) => {
    setKbmSiswaList(prev => prev.map(s => s.id === id ? { ...s, status } : s));
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
    const parts: string[] = [];
    if (isWaliKelas) parts.push(`Wali Kelas ${waliKelasNama || ''}`.trim());
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
    if (isTUKepala)  parts.push('Kepala Tata Usaha');
    else if (isTUKepegawaian) parts.push('TU Kepegawaian & Dapodik');
    else if (isTUPersuratan)  parts.push('TU Persuratan & Agenda');
    else if (isTUKeuangan)    parts.push('TU Keuangan & SPP');
    else if (isTUSarpras)     parts.push('TU Sarpras & Pengurus KIB');
    else if (isTU)            parts.push('Staf Tata Usaha');
    if (parts.length > 0) {
      return parts.join(' & ');
    }
    if (jabatan) return jabatan;
    return isTuStaff ? 'Tenaga Kependidikan' : 'Guru Mata Pelajaran';
  }, [jabatan, isWaliKelas, waliKelasNama, isKurikulum, isKesiswaan, isSarpras, isHubin, isToolman, isKaprog, isKabeng, isBpbk, isBkk, isGerbang, isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras, isTU, isTuStaff]);

  const teacherInitials = useMemo(() => {
    const name = user?.full_name || user?.name || 'Hendra Wijaya';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [user]);

  const nipText = guruProfile?.nip || (user as any)?.nip || '19850314 201001 1 008';

  // Dynamic TU Tab Label & Badge
  const tuTabMeta = useMemo(() => {
    if (isTUKepala) return { label: 'Tata Usaha', badge: 'KOR TU' };
    if (isTUKepegawaian) return { label: 'TU Kepegawaian', badge: 'DAPODIK' };
    if (isTUPersuratan) return { label: 'TU Persuratan', badge: 'SURAT' };
    if (isTUKeuangan) return { label: 'TU Keuangan', badge: 'SPP' };
    if (isTUSarpras) return { label: 'TU Sarpras & Logistik', badge: 'KIB' };
    return { label: 'Tata Usaha', badge: 'TU' };
  }, [isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras]);

  // Navigation Tabs Definition STRICTLY based on SK/Position Codes (Jabatan Nyata)
  const tabs = useMemo(() => {
    const list: Array<{ id: string; label: string; icon: any; badge?: string }> = [];

    // 0. Tab khusus Admin
    if (isAdminRole) {
      list.push({ id: 'admin', label: 'Dashboard Admin', icon: ShieldCheck, badge: 'ADMIN' });
    }

    // 1. Beranda Guru / Scan Gerbang (Hanya muncul jika Guru Pendidik Aktif atau Petugas Gerbang Murni)
    if ((isPendidik || isPureGerbangStaff) && !isAdminRole) {
      list.push({ 
        id: 'ringkasan', 
        label: isPureGerbangStaff ? 'Scan Gerbang' : 'Beranda Guru', 
        icon: isPureGerbangStaff ? ShieldCheck : UserCheck 
      });
    }

    // 1.1 Input Manual (Khusus Petugas Gerbang / Piket)
    if ((hasGerbangDuty || isGerbang || isPureGerbangStaff) && (!isAdminRole || isPendidik)) {
      list.push({
        id: 'manual_presensi',
        label: 'Input Manual',
        icon: ClipboardCheck,
        badge: 'SISWA'
      });
    }

    // 2. KBM & Absen (hanya untuk Guru Pengajar Aktif)
    if (!isPureGerbangStaff && (!isTuStaff || isKurikulum) && (!isAdminRole || isPendidik)) {
      list.push({ id: 'jadwal', label: 'KBM & Absen', icon: BookOpen, badge: 'AKTIF' });
    }

    // 3. Wali Kelas (hanya jika ditugaskan sebagai Wali Kelas)
    if (isWaliKelas) {
      list.push({ id: 'binaan', label: 'Wali Kelas', icon: Users, badge: waliKelasNama || '8B' });
    }

    // 4. Kurikulum (hanya jika ada SK Kurikulum / Kepsek / Admin)
    if (isKurikulum || isAdminRole || isKepsek) {
      list.push({ id: 'kurikulum', label: 'Kurikulum', icon: ShieldCheck, badge: 'WAKA' });
    }

    // 5. Kesiswaan (hanya jika ada SK Kesiswaan / Kepsek / Admin)
    if (isKesiswaan || isAdminRole || isKepsek) {
      list.push({ id: 'kesiswaan', label: 'Kesiswaan', icon: Users, badge: 'WAKA' });
    }

    // 6. Sarpras (hanya jika ada SK Sarpras / Toolman / Kabeng / Admin / Kepsek)
    if (isSarpras || isToolman || isKabeng || isAdminRole || isKepsek) {
      list.push({ id: 'sarpras', label: 'Sarpras', icon: Building, badge: 'WAKA' });
    }

    // 7. Hubin (hanya jika ada SK Hubin / BKK / Kaprog / Admin / Kepsek)
    if (isHubin || isBkk || isKaprog || isAdminRole || isKepsek) {
      list.push({ id: 'hubin', label: 'Hubin', icon: Briefcase, badge: 'WAKA' });
    }

    // 8. Koperasi (hanya jika ada SK Pengelola Koperasi / Admin / Kepsek)
    if (isKoperasi || isAdminRole || isKepsek) {
      list.push({ id: 'koperasi', label: 'Koperasi', icon: ShoppingCart, badge: 'UNIT' });
    }

    // 9. BP/BK (hanya jika ada SK Guru BK / Admin / Kepsek)
    if (isBpbk || isAdminRole || isKepsek) {
      list.push({ id: 'bpbk', label: 'BP/BK', icon: UserCheck, badge: 'BK' });
    }

    // 10. Tab Tata Usaha Sesuai Spesialisasi Fungsional
    if (isTUKepegawaian || isTU || isAdminRole || isKepsek) {
      list.push({ id: 'kepegawaian', label: tuTabMeta.label, icon: Users, badge: tuTabMeta.badge });
    }

    // 11. Piket & Gerbang (Hanya jika ada tugas piket / gerbang / kesiswaan nyata, bukan Admin murni)
    if (!isKurikulum && (isPiketGuru || isGerbang || isKesiswaan) && (!isAdminRole || isPendidik)) {
      list.push({ 
        id: 'kelola', 
        label: isPureGerbangStaff ? 'Pos Keamanan' : hasGerbangDuty ? 'Piket & Gerbang' : 'Piket Harian', 
        icon: isPureGerbangStaff ? ShieldCheck : ClipboardList,
        badge: isPureGerbangStaff ? 'IZIN' : hasGerbangDuty ? 'SCAN' : undefined 
      });
    }

    // 12. Profil Pengguna / Guru / Staf
    list.push({ 
      id: 'profil', 
      label: isAdminRole && !isPendidik ? 'Profil Akun' : isPureGerbangStaff ? 'Profil' : 'Profil Guru', 
      icon: User 
    });

    return list;
  }, [
    isAdminRole,
    isPureGerbangStaff,
    hasGerbangDuty,
    isTuStaff,
    isKurikulum,
    isWaliKelas,
    waliKelasNama,
    isKesiswaan,
    isKepsek,
    isSarpras,
    isToolman,
    isKabeng,
    isHubin,
    isBkk,
    isKaprog,
    isKoperasi,
    isBpbk,
    isGerbang,
    isTUKepegawaian,
    isTU,
  ]);

  // Normalisasi tab aktif jika tab di URL tidak termasuk dalam daftar kapabilitas user
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === activeTab)) {
      const fallback = tabs.some(t => t.id === defaultTabId) ? defaultTabId : tabs[0].id;
      setSearchParams({ tab: fallback }, { replace: true });
    }
  }, [tabs, activeTab, defaultTabId, setSearchParams]);

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
      
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TOP INTEGRATED HERO BANNER CARD & TAB NAV (Desktop: Always | Mobile: Beranda only) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={cn(
        "p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white shadow-lg space-y-4 relative overflow-hidden",
        activeTab !== 'ringkasan' && "hidden md:block"
      )}>
        {/* Header Row: Title, Jabatan, NIP & Presensi Kegiatan Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            {/* 1. NAMA */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-xs">
              {user?.full_name || user?.name || 'Drs. Budi Santoso, M.Pd'}
            </h1>

            {/* 2. NIP */}
            {nipText && nipText !== '-' && (
              <div className="pt-0.5">
                <span className="inline-block text-[11px] sm:text-xs font-mono font-bold text-indigo-100 bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/20">
                  NIP: {nipText}
                </span>
              </div>
            )}

            {/* 3. JABATAN */}
            <p className="text-xs sm:text-sm font-semibold text-white/90 pt-0.5">
              {jabatanLabel}
            </p>
          </div>

          {/* Right Action: Sesuai Role Pengguna */}
          {(isWaliKelas || isPetugasKelas) && (
            <button
              type="button"
              onClick={() => navigate('/attendance/ops?tab=sesi&subtab=kegiatan')}
              className="group relative px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs flex items-center gap-2.5 shrink-0 self-start sm:self-auto shadow-md shadow-amber-950/30 border border-amber-300/30 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                <Flag className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-amber-100 uppercase tracking-wider block">
                  PRESENSI KEGIATAN
                </span>
                <span className="text-xs font-black text-white tracking-tight group-hover:underline">
                  Apel, Upacara &amp; Pembiasaan ➔
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Tab Navigation Row Inset (Desktop) */}
        <div className="hidden md:flex p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar relative z-10 shadow-lg">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap select-none",
                  isTabActive
                    ? "bg-slate-900 text-emerald-400 border border-emerald-500/40 shadow-md shadow-emerald-950/50"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
              >
                <TabIcon size={15} className={isTabActive ? "text-emerald-400" : "text-slate-400"} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs uppercase">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT AREA                                                   */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT AREA (Instant 0ms Scoped Render)                       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="w-full min-w-0"
      >
        {/* 📌 TAB 1: BERANDA GURU / STAF */}
        {activeTab === 'ringkasan' && (
          <StaffBerandaTab
            guruId={guruId}
            guruNama={guruProfile?.nama_guru || user?.full_name}
            waliKelasNama={waliKelasNama}
            waliKelasId={waliKelasId}
            isWaliKelas={isWaliKelas}
            hasGerbangDuty={hasGerbangDuty}
            isPureGerbang={isPureGerbangStaff}
            isPendidik={isPendidik}
            timelineItems={timelineItems || []}
            onNavigateTab={handleTabChange}
          />
        )}

        {/* 🗓️ TAB 2: KBM & ABSEN */}
        {activeTab === 'jadwal' && (
          <StaffKbmAbsenTab
            guruId={guruId}
            guruNama={guruProfile?.nama_guru || user?.full_name}
            timelineItems={timelineItems || []}
            isLoadingTimeline={timelineLoading}
            onRefreshTimeline={refetchTimeline}
          />
        )}

        {/* 👥 TAB 3: WALI KELAS */}
        {activeTab === 'binaan' && (
          <StaffWaliKelasTab
            waliKelasNama={waliKelasNama}
            kelasId={waliKelasId}
          />
        )}

        {/* 📘 TAB 4: KURIKULUM DASHBOARD */}
        {activeTab === 'kurikulum' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <KurikulumDashboard />
          </Suspense>
        )}

        {/* 👥 TAB 5: KESISWAAN DASHBOARD */}
        {activeTab === 'kesiswaan' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <KesiswaanDashboard />
          </Suspense>
        )}

        {/* 🏢 TAB 6: SARPRAS DASHBOARD */}
        {activeTab === 'sarpras' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <SarprasDashboard />
          </Suspense>
        )}

        {/* 💼 TAB 7: HUBIN DASHBOARD */}
        {activeTab === 'hubin' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <HubinDashboard />
          </Suspense>
        )}

        {/* 🛒 TAB 8: KOPERASI DASHBOARD */}
        {activeTab === 'koperasi' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <CooperativeDashboard />
          </Suspense>
        )}

        {/* 🤝 TAB 9: BP/BK DASHBOARD */}
        {activeTab === 'bpbk' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <BpbkDashboard />
          </Suspense>
        )}

        {/* 🛡️ TAB ADMIN: DASHBOARD OPERASIONAL ADMIN/SUPERADMIN */}
        {activeTab === 'admin' && (
          <StaffAdminOverviewTab user={user} />
        )}

        {/* 🧑‍💼 TAB 10: TU KEPEGAWAIAN (DATA INDUK & DAPODIK) */}
        {activeTab === 'kepegawaian' && (
          <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
            <AcademicDashboard />
          </Suspense>
        )}

        {/* 🔍 TAB INPUT MANUAL: FORM PENCARIAN SISWA/GURU LUPA KARTU */}
        {activeTab === 'manual_presensi' && (
          <StaffManualInputTab />
        )}

        {/* 📋 TAB 9: PIKET HARIAN & OPERASIONAL */}
        {activeTab === 'kelola' && (
          <StaffPiketOperasionalTab
            dailyPermits={dailyPermitsRes?.data || dailyPermits || []}
            refetchPermits={refetchPermits}
            printedPermit={printedPermit}
            setPrintedPermit={setPrintedPermit}
            printPaperSize={printPaperSize}
            setPrintPaperSize={setPrintPaperSize}
            tenantInfo={tenantInfo}
          />
        )}

        {/* 👤 TAB 10: PROFIL GURU */}
        {activeTab === 'profil' && (
          <StaffProfilGuruTab
            user={user}
            teacherInitials={teacherInitials}
            nipText={nipText}
            waliKelasNama={waliKelasNama}
          />
        )}
      </motion.div>


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

export default UnifiedStaffDashboard;
