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
  Zap,
  CheckSquare
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
import { raporApi } from '../../../api/rapor.api';
import { useNavStore } from '../../../store/navStore';

// Staff Dashboard Modular Tabs
import { StaffBerandaTab } from '../staff/tabs/StaffBerandaTab';
import { StaffKbmAbsenTab } from '../staff/tabs/StaffKbmAbsenTab';
const StaffActionHubTab = React.lazy(() => import('../staff/tabs/StaffActionHubTab').then(m => ({ default: m.StaffActionHubTab })));
const StaffRekapMapelTab = React.lazy(() => import('../staff/tabs/StaffRekapMapelTab').then(m => ({ default: m.StaffRekapMapelTab })));
// Wali Kelas Dashboard — clean modular design (replaces legacy StaffWaliKelasTab)
const WaliKelasDashboard = React.lazy(() => import('./WaliKelasDashboard').then(m => ({ default: m.WaliKelasDashboard })));
import { StaffPiketOperasionalTab } from '../staff/tabs/StaffPiketOperasionalTab';
import { StaffProfilGuruTab } from '../staff/tabs/StaffProfilGuruTab';
import { StaffManualInputTab } from '../staff/tabs/StaffManualInputTab';
import { StaffPembimbingPklTab } from '../staff/tabs/StaffPembimbingPklTab';
// Kaprog Dashboard — clean 3-zone design (replaced StaffKaprogTab)
const KaprogDashboard = React.lazy(() => import('./KaprogDashboard').then(m => ({ default: m.KaprogDashboard })));
// Kurikulum Dashboard — clean role-patterned architecture
const KurikulumDashboard = React.lazy(() => import('./KurikulumDashboard').then(m => ({ default: m.KurikulumDashboard })));
// Kesiswaan Dashboard — clean role-patterned architecture
const KesiswaanDashboard = React.lazy(() => import('./KesiswaanDashboard').then(m => ({ default: m.KesiswaanDashboard })));
// Sarpras Dashboard — clean role-patterned architecture
const SarprasDashboard = React.lazy(() => import('./SarprasDashboard').then(m => ({ default: m.SarprasDashboard })));
// Hubin Dashboard — clean role-patterned architecture
const HubinDashboard = React.lazy(() => import('./HubinDashboard').then(m => ({ default: m.HubinDashboard })));
import { StaffPortalTab } from '../staff/tabs/StaffPortalTab';

// Modular Dashboards are accessed via Google-style App Launcher & Portal tab
// Admin Overview Tab — dirender di tab Admin untuk role ADMIN/SUPERADMIN
import { StaffAdminOverviewTab } from '../staff/tabs/StaffAdminOverviewTab';
// Executive Principal Dashboard — dirender di tab Overview Eksekutif untuk KEPALA_SEKOLAH
const KepalaSekolahDashboard = React.lazy(() => import('./KepalaSekolahDashboard').then(m => ({ default: m.KepalaSekolahDashboard })));
// Kepegawaian Dashboard — dirender di tab TU Kepegawaian
const KepegawaianDashboard = React.lazy(() => import('./KepegawaianDashboard').then(m => ({ default: m.KepegawaianDashboard })));
// Tata Usaha Dashboard — unified command center untuk TU
const TataUsahaDashboard = React.lazy(() => import('./TataUsahaDashboard').then(m => ({ default: m.TataUsahaDashboard })));

const CatatPelanggaranModal = React.lazy(() => import('../../kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = React.lazy(() => import('../../kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));

// Widgets
import { StaffScheduleWidget } from '../widgets/StaffScheduleWidget';
import { StaffImpactWidget } from '../widgets/StaffImpactWidget';
import { StaffAttendanceLogWidget } from '../widgets/StaffAttendanceLogWidget';

// Sidebar Panels
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

  // ── 1. Role & Capability Detection ──────────────────────────────────────────
  const {
    can,
    isAdmin,
    isSarpras,
    isHubin,
    isKurikulum,
    isToolman,
    isKaprog,
    kaprogJurusan,
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
    isKoperasiHead,
    isKoperasiFinance,
    isKoperasiSecretary,
    isKoperasiStore,
    isKoperasiAuditor,
    isPembimbingPkl: isPembimbingPklFromCaps,
    isFasilitatorP5,
    fasilitatorP5Count,
  } = useCapabilities();

  // ── 2. Base Data ──────────────────────────────────────────────────────────────
  const { data: guruProfileRes, refetch: refetchGuruProfile } = useQuery({
    queryKey: ['guru-profile-me'],
    queryFn: () => guruApi.getMe(),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });
  const guruProfile = guruProfileRes?.data as any;

  // Query P5 Projects for facilitator role
  const { data: myP5ProjectsRes } = useQuery({
    queryKey: ['my-p5-projects-hero', user?.id],
    queryFn: () => raporApi.getMyP5Projects(),
    enabled: !!user?.id && !isAdmin && !isKepsek,
    staleTime: 5 * 60 * 1000,
  });

  const isFasilitatorP5Actual = isFasilitatorP5 || Boolean(myP5ProjectsRes?.data && myP5ProjectsRes.data.length > 0);
  const p5ProjectCount = Math.max(fasilitatorP5Count || 0, myP5ProjectsRes?.data?.length || 0);

  const guruId = user?.guru_profile?.id || guruProfile?.id;
  const { timelineItems, isLoading: timelineLoading, refetch: refetchTimeline } = useStaffTimeline(guruId);

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

  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isAdminRole = isAdmin || roleName === 'ADMIN' || roleName === 'SUPERADMIN';

  // Jenis PTK Detection: PENDIDIK vs TENAGA KEPENDIDIKAN
  const jenisPtk = (
    guruProfile?.jenis_ptk ||
    (user?.guru_profile as any)?.jenis_ptk ||
    (user as any)?.jenis_ptk ||
    ''
  ).toUpperCase();

  const isTuStaff = isTU ||
    jenisPtk === 'TENAGA_KEPENDIDIKAN' ||
    user?.guru_profile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN' ||
    guruProfile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN' ||
    jabatanList.some((j: string) => j.toUpperCase().startsWith('TU') || j.toUpperCase().includes('TATA USAHA'));

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
    !isTuStaff &&
    !isSecurityRole &&
    (jenisPtk === 'PENDIDIK' || (!jenisPtk && (roleName === 'GURU' || isWaliKelasFromCaps)))
  );

  // 🎓 Deteksi Penugasan Pengajar Delegasi / Guru Pengganti (Khususnya jika Staf TU / Non-Pendidik memegang jadwal KBM)
  const hasTeachingDuty = useMemo(() => {
    return Array.isArray(timelineItems) && timelineItems.length > 0;
  }, [timelineItems]);

  const isEffectivePendidik = isPendidik || hasTeachingDuty;

  // 🔔 Global KBM Window Alert for Teacher & Proxy (works across all tabs in dashboard)
  useSessionWindowAlert({
    schedules: Array.isArray(timelineItems) ? (timelineItems as any) : [],
    enabled: isEffectivePendidik && !!guruId,
    roleLabel: hasTeachingDuty && isTuStaff ? 'guru pengganti' : 'guru',
  });

  const isPureGerbangStaff = isSecurityRole || (hasGerbangDuty && !isEffectivePendidik && !isAdminRole && !isKepsek && !isKurikulum);

  const isWaliKelas = isWaliKelasFromCaps ||
    !!guruProfile?.wali_kelas_di?.id ||
    !!((user?.guru_profile as any)?.wali_kelas_di?.id);

  const isGlobalHubin = isHubin;
  // Pembimbing PKL: Hanya jika user adalah Guru, BUKAN Waka Hubin/Kepsek, punya kapabilitas guidance / penugasan PKL
  const isPembimbingPkl = !isHubin && !isKepsek && (
    Boolean(isPembimbingPklFromCaps) ||
    (can('hubin.guidance.manage') && Boolean(
      guruProfile?.is_pembimbing_pkl || 
      (guruProfile?.active_pkl_count && guruProfile.active_pkl_count > 0) ||
      ((user?.guru_profile as any)?.is_pembimbing_pkl) ||
      ((user?.guru_profile as any)?.active_pkl_count > 0)
    ))
  );

  const hasStructuralRole = isWaliKelas || isKurikulum || isKesiswaan || isKepsek
    || isSarpras || isHubin || isToolman || isKaprog || isKabeng
    || isBpbk || isBkk || isGerbang || isTU;

  // ── 3. Role-Specific Scoped Queries (Google Platform Standard: Scoped Lazy Query Execution) ───
  const { rawList: waliKelasAssignments } = useWaliKelasOptions();

  const waliKelasStrukturItem = useMemo(() => {
    const guruProfileId = (user as any)?.guru_profile?.id || (user as any)?.guru_profile_id || guruProfile?.id;
    const userId = user?.id || (user as any)?.userId;
    if (waliKelasAssignments && waliKelasAssignments.length > 0) {
      return waliKelasAssignments.find((item: any) => {
        const hasClass = Boolean(item.kelas_id || item.Kelas?.id);
        if (!hasClass) return false;
        if (guruProfileId && (item.guru_id === guruProfileId || item.Guru?.id === guruProfileId)) return true;
        if (userId && (item.user_id === userId || item.Guru?.user_id === userId)) return true;
        return false;
      });
    }
    return null;
  }, [user, waliKelasAssignments, guruProfile]);

  const waliKelasId = useMemo(() => {
    if (waliKelasStrukturItem?.Kelas?.id) return waliKelasStrukturItem.Kelas.id;
    if (waliKelasStrukturItem?.kelas_id) return waliKelasStrukturItem.kelas_id;
    return guruProfile?.wali_kelas_di?.id || (user?.guru_profile as any)?.wali_kelas_di?.id;
  }, [waliKelasStrukturItem, guruProfile, user]);

  const waliKelasNama = useMemo(() => {
    if (waliKelasStrukturItem?.Kelas?.nama_kelas) return waliKelasStrukturItem.Kelas.nama_kelas;
    if (waliKelasStrukturItem?.StrukturOrganisasi?.Kelas?.nama_kelas) return waliKelasStrukturItem.StrukturOrganisasi.Kelas.nama_kelas;
    return guruProfile?.wali_kelas_di?.nama_kelas || (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas || 'Kelas Binaan';
  }, [waliKelasStrukturItem, guruProfile, user]);

  // 🎯 DEFAULT TAB RESOLUTION (Posisi Netral: Apapun jabatannya, selalu mendarat di Beranda Dashboard)
  const defaultTabId = useMemo(() => {
    if (isAdminRole && !isKepsek) return 'admin';
    return 'ringkasan';
  }, [isAdminRole, isKepsek]);

  // Synchronize Active Tab with Query Param (?tab=...) atau Smart Default Tab (dengan guard akses)
  const rawRequestedTab = searchParams.get('tab');
  const requestedTab = rawRequestedTab === 'walas' ? 'binaan' : rawRequestedTab === 'jadwal' ? 'ringkasan' : rawRequestedTab;
  const activeTab = (requestedTab === 'pembimbing_pkl' && !isPembimbingPkl)
    ? defaultTabId
    : (requestedTab || defaultTabId);

  // Sinkronisasi query param otomatis saat akses /dashboard polosan
  useEffect(() => {
    if (!rawRequestedTab && defaultTabId !== 'portal') {
      setSearchParams({ tab: defaultTabId }, { replace: true });
    }
  }, [rawRequestedTab, defaultTabId, setSearchParams]);

  const handleTabChange = React.useCallback((newTab: string) => {
    if (newTab === 'p5_projek') {
      navigate('/rapor/p5');
      return;
    }
    setSearchParams({ tab: newTab }, { replace: true });
  }, [setSearchParams, navigate]);

  // ⚡ Keep-Alive Lazy-Mount Tab Cache:
  // Tab hanya di-mount ke DOM saat pertama kali dikunjungi (Lazy),
  // dan dipertahankan di memori DOM saat beralih tab (Keep-Alive) agar state, form, & scroll position tidak hilang.
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const { setActiveWorkspaceId } = useNavStore();

  // Sync NavStore activeWorkspaceId based on active tab
  useEffect(() => {
    if (activeTab === 'binaan') {
      setActiveWorkspaceId('WALIKELAS_WORKSPACE');
    }
  }, [activeTab, setActiveWorkspaceId]);

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
    enabled: !!user?.tenant_id,
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
    if (isKepsek) parts.push('Kepala Sekolah');
    if (isWaliKelas) parts.push(`Wali Kelas ${waliKelasNama || ''}`.trim());
    if (isKurikulum) parts.push('Tim Kurikulum');
    if (isKesiswaan) parts.push('Tim Kesiswaan');
    if (isSarpras)   parts.push('Pengelola Sarpras');
    if (isHubin)     parts.push('Hubin / PKL');
    else if (isPembimbingPkl) parts.push('Pembimbing PKL');

    // Koperasi
    if (isKoperasiHead) parts.push('Ketua Koperasi');
    else if (isKoperasiFinance) parts.push('Bendahara Koperasi');
    else if (isKoperasiSecretary) parts.push('Sekretaris Koperasi');
    else if (isKoperasiAuditor) parts.push('Pengawas Koperasi');
    else if (isKoperasiStore) parts.push('Manajer Toko Koperasi');
    else if (isKoperasi) parts.push('Pengelola Koperasi');

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
  }, [
    jabatan, isKepsek, isWaliKelas, waliKelasNama, isKurikulum, isKesiswaan, isSarpras,
    isHubin, isPembimbingPkl, isToolman, isKaprog, isKabeng, isBpbk, isBkk, isGerbang,
    isKoperasi, isKoperasiHead, isKoperasiFinance, isKoperasiSecretary, isKoperasiAuditor, isKoperasiStore,
    isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras, isTU, isTuStaff
  ]);

  const peranBadges = useMemo(() => {
    const badges: Array<{ label: string; icon?: any; color: string }> = [];

    if (isKepsek) {
      badges.push({
        label: 'Kepala Sekolah',
        icon: Award,
        color: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/30',
      });
    }

    if (isWaliKelas) {
      badges.push({
        label: `Wali Kelas ${waliKelasNama || ''}`.trim(),
        icon: GraduationCap,
        color: 'bg-blue-500/25 text-blue-100 border-blue-400/30',
      });
    }

    if (isPembimbingPkl) {
      badges.push({
        label: 'Pembimbing PKL',
        icon: Briefcase,
        color: 'bg-cyan-500/25 text-cyan-100 border-cyan-400/30',
      });
    }

    if (isFasilitatorP5Actual) {
      badges.push({
        label: p5ProjectCount > 1 ? `Fasilitator P5 (${p5ProjectCount} Projek)` : 'Fasilitator P5',
        icon: Sparkles,
        color: 'bg-amber-500/25 text-amber-100 border-amber-400/30',
      });
    }

    // ── Koperasi Badges ───────────────────────────────────────────
    if (isKoperasiHead) {
      badges.push({
        label: 'Ketua Koperasi',
        icon: ShoppingCart,
        color: 'bg-amber-500/25 text-amber-100 border-amber-400/30',
      });
    }
    if (isKoperasiFinance) {
      badges.push({
        label: 'Bendahara Koperasi',
        icon: ShoppingCart,
        color: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/30',
      });
    }
    if (isKoperasiSecretary) {
      badges.push({
        label: 'Sekretaris Koperasi',
        icon: ShoppingCart,
        color: 'bg-indigo-500/25 text-indigo-100 border-indigo-400/30',
      });
    }
    if (isKoperasiAuditor) {
      badges.push({
        label: 'Pengawas Koperasi',
        icon: ShoppingCart,
        color: 'bg-teal-500/25 text-teal-100 border-teal-400/30',
      });
    }
    if (isKoperasiStore) {
      badges.push({
        label: 'Manajer Toko Koperasi',
        icon: ShoppingCart,
        color: 'bg-orange-500/25 text-orange-100 border-orange-400/30',
      });
    }
    if (isKoperasi && !isKoperasiHead && !isKoperasiFinance && !isKoperasiSecretary && !isKoperasiAuditor && !isKoperasiStore) {
      badges.push({
        label: 'Pengelola Koperasi',
        icon: ShoppingCart,
        color: 'bg-amber-500/25 text-amber-100 border-amber-400/30',
      });
    }

    // ── Structural & Unit Badges ──────────────────────────────────
    if (isKurikulum) {
      badges.push({ label: 'Tim Kurikulum', icon: BookOpen, color: 'bg-purple-500/25 text-purple-100 border-purple-400/30' });
    }
    if (isKesiswaan) {
      badges.push({ label: 'Tim Kesiswaan', icon: Users, color: 'bg-pink-500/25 text-pink-100 border-pink-400/30' });
    }
    if (isSarpras) {
      badges.push({ label: 'Pengelola Sarpras', icon: Building, color: 'bg-orange-500/25 text-orange-100 border-orange-400/30' });
    }
    if (isHubin) {
      badges.push({ label: 'Hubin / PKL', icon: Briefcase, color: 'bg-teal-500/25 text-teal-100 border-teal-400/30' });
    }
    if (isKaprog) {
      badges.push({ label: 'Ketua Program Keahlian', icon: Award, color: 'bg-indigo-500/25 text-indigo-100 border-indigo-400/30' });
    }
    if (isKabeng) {
      badges.push({ label: 'Kepala Bengkel', icon: Activity, color: 'bg-rose-500/25 text-rose-100 border-rose-400/30' });
    }
    if (isToolman) {
      badges.push({ label: 'Toolman Lab', icon: Zap, color: 'bg-amber-500/25 text-amber-100 border-amber-400/30' });
    }
    if (isBpbk) {
      badges.push({ label: 'Guru BK', icon: UserCheck, color: 'bg-emerald-500/25 text-emerald-100 border-emerald-400/30' });
    }
    if (isBkk) {
      badges.push({ label: 'Pengelola BKK', icon: Briefcase, color: 'bg-sky-500/25 text-sky-100 border-sky-400/30' });
    }
    if (isGerbang) {
      badges.push({ label: 'Petugas Gerbang', icon: ShieldCheck, color: 'bg-red-500/25 text-red-100 border-red-400/30' });
    }
    if (isTUKepala) {
      badges.push({ label: 'Kepala Tata Usaha', icon: FileText, color: 'bg-violet-500/25 text-violet-100 border-violet-400/30' });
    } else if (isTUKepegawaian) {
      badges.push({ label: 'TU Kepegawaian & Dapodik', icon: FileText, color: 'bg-violet-500/25 text-violet-100 border-violet-400/30' });
    } else if (isTUPersuratan) {
      badges.push({ label: 'TU Persuratan & Agenda', icon: FileText, color: 'bg-violet-500/25 text-violet-100 border-violet-400/30' });
    } else if (isTUKeuangan) {
      badges.push({ label: 'TU Keuangan & SPP', icon: Wallet, color: 'bg-violet-500/25 text-violet-100 border-violet-400/30' });
    } else if (isTUSarpras) {
      badges.push({ label: 'TU Sarpras & KIB', icon: Building, color: 'bg-violet-500/25 text-violet-100 border-violet-400/30' });
    } else if (isTU) {
      badges.push({ label: 'Staf Tata Usaha', icon: FileText, color: 'bg-violet-500/25 text-violet-100 border-violet-400/30' });
    }

    // ── Badge Pengajar Pengganti KBM (Teaching Proxy) ───────────────────
    if (isTuStaff && hasTeachingDuty) {
      badges.push({
        label: 'Guru Pengganti KBM',
        icon: Sparkles,
        color: 'bg-amber-500/25 text-amber-100 border-amber-400/30',
      });
    }

    if (badges.length === 0) {
      if (jabatan) {
        badges.push({ label: jabatan, color: 'bg-white/15 text-white border-white/20' });
      } else {
        badges.push({
          label: isTuStaff ? 'Tenaga Kependidikan' : 'Guru Mata Pelajaran',
          color: 'bg-white/15 text-white border-white/20',
        });
      }
    }
    return badges;
  }, [
    isKepsek, isWaliKelas, waliKelasNama, isPembimbingPkl, isFasilitatorP5Actual, p5ProjectCount,
    isKoperasi, isKoperasiHead, isKoperasiFinance, isKoperasiSecretary, isKoperasiAuditor, isKoperasiStore,
    isKurikulum, isKesiswaan, isSarpras, isHubin, isKaprog, isKabeng, isToolman, isBpbk, isBkk,
    isGerbang, isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras, isTU,
    jabatan, isTuStaff,
  ]);

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
    const list: Array<{ id: string; label: string; icon: any }> = [];

    // 0. Tab khusus Admin
    if (isAdminRole && !isKepsek) {
      list.push({ id: 'admin', label: 'Dashboard Admin', icon: ShieldCheck });
    }

    // 1. Beranda Guru / Scan Gerbang / Overview Eksekutif Kepsek
    if (isKepsek) {
      list.push({ 
        id: 'ringkasan', 
        label: 'Overview Eksekutif', 
        icon: Award,
      });
    } else if (!isAdminRole) {
      list.push({ 
        id: 'ringkasan', 
        label: isPureGerbangStaff ? 'Scan Gerbang' : (isPendidik || isEffectivePendidik) ? 'Beranda Guru' : 'Beranda Staf', 
        icon: isPureGerbangStaff ? ShieldCheck : UserCheck 
      });
    }

    // 🌐 Portal Aplikasi (Google Apps Launcher Style) - Pusat Modul Sekolah
    list.push({
      id: 'portal',
      label: 'Portal',
      icon: LayoutGrid,
    });

    // ⚡ Tugas Saya (Pusat Tugas & Tindakan Terpadu Guru/Staf)
    if (!isKepsek) {
      list.push({
        id: 'action_hub',
        label: 'Tugas Saya',
        icon: CheckSquare,
      });
    }

    // 1.1 Input Manual (Khusus Petugas Gerbang / Piket)
    if ((hasGerbangDuty || isGerbang || isPureGerbangStaff) && (!isAdminRole || isEffectivePendidik) && !isKepsek) {
      list.push({
        id: 'manual_presensi',
        label: 'Input Manual',
        icon: ClipboardCheck,
      });
    }

    // 2. KBM & Absen telah terintegrasi langsung di Beranda Guru (Single Responsibility Core)

    // 2.1 Rekap Mapel (Khusus Guru Pendidik yang mengampu mata pelajaran)
    if ((isPendidik || isEffectivePendidik || hasTeachingDuty) && !isKepsek) {
      list.push({ 
        id: 'rekap_mapel', 
        label: 'Rekap Mapel', 
        icon: BookOpen 
      });
    }

    // 3. Wali Kelas (Khusus Guru Wali Kelas Rombel Binaan)
    if ((isWaliKelas || Boolean(waliKelasId)) && !isKepsek) {
      list.push({ 
        id: 'binaan', 
        label: 'Dashboard Walas', 
        icon: GraduationCap 
      });
    }

    // 4. Bimbingan PKL (Khusus Guru Pembimbing PKL yang bukan Waka Hubin)
    if (isPembimbingPkl && !isKepsek) {
      list.push({ id: 'pembimbing_pkl', label: 'Bimbingan PKL', icon: Briefcase });
    }

    // 4.1 Kaprog (Khusus Ketua Program Keahlian / Jurusan)
    if (isKaprog && !isKepsek) {
      list.push({ 
        id: 'kaprog', 
        label: 'Dashboard Jurusan', 
        icon: Award, 
      });
    }

    // 4.2 Kurikulum (Khusus Waka / Staf Kurikulum / Admin)
    if ((isKurikulum || (isAdminRole && !isKepsek) || can('curriculum.view') || can('curriculum.manage')) && !isKepsek) {
      list.push({ 
        id: 'kurikulum', 
        label: 'Dashboard Kurikulum', 
        icon: BookOpen, 
      });
    }

    // 4.3 Kesiswaan (Khusus Waka / Staf Kesiswaan / Admin)
    if ((isKesiswaan || (isAdminRole && !isKepsek) || can('kesiswaan.view') || can('kesiswaan.manage')) && !isKepsek) {
      list.push({ 
        id: 'kesiswaan', 
        label: 'Dashboard Kesiswaan', 
        icon: ShieldAlert, 
      });
    }

    // 4.4 Sarpras (Khusus Pengelola Sarpras / Toolman / Admin)
    if ((isSarpras || (isAdminRole && !isKepsek) || can('sarpras.view') || can('sarpras.manage')) && !isKepsek) {
      list.push({ 
        id: 'sarpras', 
        label: 'Dashboard Sarpras', 
        icon: Package, 
      });
    }

    // 4.5 Hubin (Khusus Pengelola Hubin / PKL / Admin)
    if ((isHubin || (isAdminRole && !isKepsek) || can('hubin.view') || can('hubin.manage')) && !isKepsek) {
      list.push({ 
        id: 'hubin', 
        label: 'Dashboard Hubin', 
        icon: Briefcase, 
      });
    }

    // 5. Fasilitator P5 (Khusus Guru Fasilitator Projek P5)
    if (isFasilitatorP5Actual && !isKepsek) {
      list.push({ id: 'p5_projek', label: 'Dashboard P5', icon: Sparkles });
    }

    // 10. Tab Tata Usaha Sesuai Spesialisasi Fungsional
    if ((isTUKepegawaian || isTU || isTUKepala || isTUPersuratan || (isAdminRole && !isKepsek)) && !isKepsek) {
      list.push({ id: 'kepegawaian', label: 'Dashboard TU', icon: Building });
    }

    // 11. Piket & Gerbang (Tugas piket harian, gerbang, kesiswaan, kurikulum, dan seluruh guru pendidik)
    const canAccessPiket = isPiketGuru || isGerbang || isKesiswaan || isKurikulum || isPendidik || can('attendance.piket.view') || can('attendance.piket.manage');
    if (canAccessPiket && (!isAdminRole || isPendidik) && !isKepsek) {
      list.push({ 
        id: 'kelola', 
        label: isPureGerbangStaff ? 'Pos Keamanan' : 'Dashboard Piket', 
        icon: isPureGerbangStaff ? ShieldCheck : ClipboardList,
      });
    }

    // 12. Profil Pengguna / Guru / Staf
    list.push({ 
      id: 'profil', 
      label: isKepsek ? 'Profil Kepala Sekolah' : (isAdminRole && !isPendidik ? 'Profil Akun' : isPureGerbangStaff ? 'Profil' : 'Profil Guru'), 
      icon: User 
    });

    return list;
  }, [
    isAdminRole,
    isPureGerbangStaff,
    hasGerbangDuty,
    isGerbang,
    isTuStaff,
    isKurikulum,
    isWaliKelas,
    waliKelasNama,
    isKesiswaan,
    isKepsek,
    isPendidik,
    isEffectivePendidik,
    hasTeachingDuty,
    can,
    isPembimbingPkl,
    isKaprog,
    isFasilitatorP5Actual,
    isTUKepegawaian,
    isTU,
    tuTabMeta,
    isPiketGuru,
    isSarpras,
    isHubin,
  ]);

  // Normalisasi tab aktif jika tab di URL tidak termasuk dalam daftar kapabilitas user
  useEffect(() => {
    // Tab binaan, kaprog, dan kepegawaian valid jika user memiliki peran tersebut
    if (activeTab === 'binaan' && (isWaliKelas || Boolean(waliKelasId))) return;
    if (activeTab === 'kaprog' && isKaprog) return;
    if (activeTab === 'kepegawaian' && (isTUKepala || isTUPersuratan || isTUKepegawaian || isTU)) return;

    // Tunggu sampai tabs siap sebelum melakukan fallback
    if (tabs.length === 0) return;

    if (!tabs.some(t => t.id === activeTab)) {
      const fallback = tabs.some(t => t.id === defaultTabId) ? defaultTabId : tabs[0].id;
      setSearchParams({ tab: fallback }, { replace: true });
    }
  }, [tabs, activeTab, defaultTabId, setSearchParams, isWaliKelas, waliKelasId, isKaprog, isTUKepala, isTUPersuratan, isTUKepegawaian, isTU]);

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

    if (isPendidik || isEffectivePendidik || hasTeachingDuty) {
      actions.push({
        label: 'Rekap Mapel',
        icon: FileText,
        onClick: () => handleTabChange('rekap_mapel'),
        color: 'emerald'
      });
    }

    return actions;
  }, [timelineItems, navigate, isPendidik, isEffectivePendidik, hasTeachingDuty]);

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
            <SesiAttendanceList sesiId={selectedSesi.id} sesi={selectedSesi} />
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
      {/* TOP INTEGRATED HERO BANNER CARD & TAB NAV (Desktop: Always | Mobile: Hidden to conserve vertical space) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white shadow-lg space-y-4 relative overflow-hidden">
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

            {/* 3. JABATAN / PERAN (BADGES MODERN) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {peranBadges.map((badge, idx) => {
                const IconComponent = badge.icon;
                return (
                  <span
                    key={idx}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg border backdrop-blur-md shadow-xs select-none",
                      badge.color
                    )}
                  >
                    {IconComponent && <IconComponent size={12} className="shrink-0 text-current opacity-90" />}
                    <span>{badge.label}</span>
                  </span>
                );
              })}
            </div>
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
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT AREA (Keep-Alive Lazy-Mount Engine: 0ms Switch)       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="w-full min-w-0">
        {/* 📌 TAB 1: OVERVIEW EKSEKUTIF (KEPSEK) ATAU BERANDA GURU / STAF */}
        {visitedTabs.has('ringkasan') && (
          <div 
            key="tab-ringkasan"
            role="tabpanel"
            aria-hidden={activeTab !== 'ringkasan'}
            className={cn("w-full min-w-0", activeTab === 'ringkasan' ? "block" : "hidden")}
          >
            {isKepsek ? (
              <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
                <KepalaSekolahDashboard />
              </Suspense>
            ) : (
              <StaffBerandaTab
                guruId={guruId}
                guruNama={guruProfile?.nama_guru || user?.full_name}
                waliKelasNama={waliKelasNama}
                waliKelasId={waliKelasId}
                isWaliKelas={isWaliKelas}
                isPembimbingPkl={isPembimbingPkl}
                isKaprog={isKaprog}
                kaprogJurusan={kaprogJurusan}
                hasGerbangDuty={hasGerbangDuty}
                isPureGerbang={isPureGerbangStaff}
                isPendidik={isEffectivePendidik}
                timelineItems={timelineItems || []}
                onNavigateTab={handleTabChange}
                onOpenAttendance={(sesi) => setSelectedSesi(sesi)}
                onOpenJournal={(sesi) => { setSessionForJournal(sesi); setJournalModalOpen(true); }}
              />
            )}
          </div>
        )}

        {/* 🌐 TAB PORTAL: APP LAUNCHER PUSAT APLIKASI SEKOLAH */}
        {visitedTabs.has('portal') && (
          <div 
            key="tab-portal"
            role="tabpanel"
            aria-hidden={activeTab !== 'portal'}
            className={cn("w-full min-w-0", activeTab === 'portal' ? "block" : "hidden")}
          >
            <StaffPortalTab 
              onBackToBeranda={() => handleTabChange(isAdminRole && !isKepsek ? 'admin' : 'ringkasan')}
              onNavigateTab={handleTabChange}
            />
          </div>
        )}

        {/* 🗓️ TAB 2: KBM & ABSEN */}
        {visitedTabs.has('jadwal') && (
          <div 
            key="tab-jadwal"
            role="tabpanel"
            aria-hidden={activeTab !== 'jadwal'}
            className={cn("w-full min-w-0", activeTab === 'jadwal' ? "block" : "hidden")}
          >
            <StaffKbmAbsenTab
              guruId={guruId}
              guruNama={guruProfile?.nama_guru || user?.full_name}
              timelineItems={timelineItems || []}
              isLoadingTimeline={timelineLoading}
              onRefreshTimeline={refetchTimeline}
            />
          </div>
        )}

        {/* ⚡ TAB ACTION HUB: PUSAT TUGAS & TINDAKAN TERPADU */}
        {visitedTabs.has('action_hub') && (
          <div 
            key="tab-action_hub"
            role="tabpanel"
            aria-hidden={activeTab !== 'action_hub'}
            className={cn("w-full min-w-0", activeTab === 'action_hub' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-4 py-4">
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              </div>
            }>
              <StaffActionHubTab 
                onOpenJournal={(sesi) => { setSessionForJournal(sesi); setJournalModalOpen(true); }}
                onNavigateTab={handleTabChange}
              />
            </Suspense>
          </div>
        )}

        {/* 📚 TAB REKAP MAPEL: REKAPITULASI PRESENSI PER MATA PELAJARAN */}
        {visitedTabs.has('rekap_mapel') && (
          <div 
            key="tab-rekap_mapel"
            role="tabpanel"
            aria-hidden={activeTab !== 'rekap_mapel'}
            className={cn("w-full min-w-0", activeTab === 'rekap_mapel' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-4 py-4">
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              </div>
            }>
              <StaffRekapMapelTab user={user} />
            </Suspense>
          </div>
        )}

        {/* 👥 TAB 3: WALI KELAS — Role Dashboard Architecture */}
        {visitedTabs.has('binaan') && (
          <div 
            key="tab-binaan"
            role="tabpanel"
            aria-hidden={activeTab !== 'binaan'}
            className={cn("w-full min-w-0", activeTab === 'binaan' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-6 py-4">
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              </div>
            }>
              <WaliKelasDashboard
                waliKelasNama={waliKelasNama}
                kelasId={waliKelasId}
                user={user}
              />
            </Suspense>
          </div>
        )}

        {/* 💼 TAB 7.1: BIMBINGAN PKL DASHBOARD (KHUSUS GURU PEMBIMBING) */}
        {visitedTabs.has('pembimbing_pkl') && (
          <div 
            key="tab-pembimbing_pkl"
            role="tabpanel"
            aria-hidden={activeTab !== 'pembimbing_pkl'}
            className={cn("w-full min-w-0", activeTab === 'pembimbing_pkl' ? "block" : "hidden")}
          >
            <StaffPembimbingPklTab
              guruId={guruId}
              guruNama={guruProfile?.nama_guru || user?.full_name}
            />
          </div>
        )}

        {/* 🏆 TAB KAPROG: DASHBOARD KETUA PROGRAM KEAHLIAN — New Design */}
        {visitedTabs.has('kaprog') && (
          <div 
            key="tab-kaprog"
            role="tabpanel"
            aria-hidden={activeTab !== 'kaprog'}
            className={cn("w-full min-w-0", activeTab === 'kaprog' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-6 py-4">
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
                </div>
                <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              </div>
            }>
              <KaprogDashboard
                user={user}
                kaprogJurusan={kaprogJurusan}
              />
            </Suspense>
          </div>
        )}

        {/* 📚 TAB KURIKULUM: DASHBOARD KURIKULUM */}
        {visitedTabs.has('kurikulum') && (
          <div 
            key="tab-kurikulum"
            role="tabpanel"
            aria-hidden={activeTab !== 'kurikulum'}
            className={cn("w-full min-w-0", activeTab === 'kurikulum' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-4 py-4">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            }>
              <KurikulumDashboard user={user} />
            </Suspense>
          </div>
        )}

        {/* 🛡️ TAB KESISWAAN: DASHBOARD KESISWAAN */}
        {visitedTabs.has('kesiswaan') && (
          <div 
            key="tab-kesiswaan"
            role="tabpanel"
            aria-hidden={activeTab !== 'kesiswaan'}
            className={cn("w-full min-w-0", activeTab === 'kesiswaan' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-4 py-4">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            }>
              <KesiswaanDashboard user={user} />
            </Suspense>
          </div>
        )}

        {/* 📦 TAB SARPRAS: DASHBOARD SARPRAS */}
        {visitedTabs.has('sarpras') && (
          <div 
            key="tab-sarpras"
            role="tabpanel"
            aria-hidden={activeTab !== 'sarpras'}
            className={cn("w-full min-w-0", activeTab === 'sarpras' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-4 py-4">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            }>
              <SarprasDashboard user={user} />
            </Suspense>
          </div>
        )}

        {/* 💼 TAB HUBIN: DASHBOARD HUBIN */}
        {visitedTabs.has('hubin') && (
          <div 
            key="tab-hubin"
            role="tabpanel"
            aria-hidden={activeTab !== 'hubin'}
            className={cn("w-full min-w-0", activeTab === 'hubin' ? "block" : "hidden")}
          >
            <Suspense fallback={
              <div className="w-full space-y-4 py-4">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            }>
              <HubinDashboard user={user} />
            </Suspense>
          </div>
        )}

        {/* 🛡️ TAB ADMIN: DASHBOARD OPERASIONAL ADMIN/SUPERADMIN */}
        {visitedTabs.has('admin') && (
          <div 
            key="tab-admin"
            role="tabpanel"
            aria-hidden={activeTab !== 'admin'}
            className={cn("w-full min-w-0", activeTab === 'admin' ? "block" : "hidden")}
          >
            <StaffAdminOverviewTab user={user} />
          </div>
        )}

        {/* 🧑‍💼 TAB 10: TATA USAHA TERPADU & KEPEGAWAIAN */}
        {visitedTabs.has('kepegawaian') && (
          <div 
            key="tab-kepegawaian"
            role="tabpanel"
            aria-hidden={activeTab !== 'kepegawaian'}
            className={cn("w-full min-w-0", activeTab === 'kepegawaian' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              {isTUKepala || isTUPersuratan || isTU ? (
                <TataUsahaDashboard user={user} />
              ) : (
                <KepegawaianDashboard user={user} />
              )}
            </Suspense>
          </div>
        )}

        {/* 🔍 TAB INPUT MANUAL: FORM PENCARIAN SISWA/GURU LUPA KARTU */}
        {visitedTabs.has('manual_presensi') && (
          <div 
            key="tab-manual_presensi"
            role="tabpanel"
            aria-hidden={activeTab !== 'manual_presensi'}
            className={cn("w-full min-w-0", activeTab === 'manual_presensi' ? "block" : "hidden")}
          >
            <StaffManualInputTab />
          </div>
        )}

        {/* 📋 TAB 9: PIKET HARIAN & OPERASIONAL */}
        {visitedTabs.has('kelola') && (
          <div 
            key="tab-kelola"
            role="tabpanel"
            aria-hidden={activeTab !== 'kelola'}
            className={cn("w-full min-w-0", activeTab === 'kelola' ? "block" : "hidden")}
          >
            <StaffPiketOperasionalTab
              dailyPermits={dailyPermitsRes?.data || dailyPermits || []}
              refetchPermits={refetchPermits}
              printedPermit={printedPermit}
              setPrintedPermit={setPrintedPermit}
              printPaperSize={printPaperSize}
              setPrintPaperSize={setPrintPaperSize}
              tenantInfo={tenantInfo}
            />
          </div>
        )}

        {/* 👤 TAB 10: PROFIL GURU */}
        {visitedTabs.has('profil') && (
          <div 
            key="tab-profil"
            role="tabpanel"
            aria-hidden={activeTab !== 'profil'}
            className={cn("w-full min-w-0", activeTab === 'profil' ? "block" : "hidden")}
          >
            <StaffProfilGuruTab
              user={user}
              teacherInitials={teacherInitials}
              nipText={nipText}
              waliKelasNama={waliKelasNama}
            />
          </div>
        )}
      </div>


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
          <SesiAttendanceList sesiId={selectedSesi.id} sesi={selectedSesi} />
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
