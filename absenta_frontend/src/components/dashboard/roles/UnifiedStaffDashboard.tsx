import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { cn } from '../../../lib/utils';
import { EcosystemProvider } from '@/context/EcosystemContext';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

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
  Fingerprint,
  MessageCircle,
  Building,
  Briefcase,
  UserCheck,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  HeartHandshake,
  X,
  QrCode,
  MapPin,
  Flag,
  Zap,
  CheckSquare,
  Wrench,
  Compass
} from 'lucide-react';

// Components
import { type QuickAction } from '../shared/QuickActionGrid';
const Modal = React.lazy(() => import('../../ui/Modal'));
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { StaffPortalAppLauncher } from '../portal/StaffPortalAppLauncher';
import { resolveSmartDashboardMode } from '../../../helpers/dashboardModeHelper';
import { useWaliKelasOptions } from '../../../hooks/useWaliKelasOptions';
import { usePiketIzinKeluarOptions } from '../../../hooks/usePiketIzinKeluarOptions';
import { useNavStore } from '../../../store/navStore';
import { useMobileSubtabSidebarStore } from './common/subtabSidebarStore';
import { useGuruMe } from '../../../hooks/useGuruMe';

// Lazy-Loaded Heavy Modals (Zero Network Leak on Initial Load)
const JurnalKbmModal = React.lazy(() => import('../../kurikulum/JurnalKbmModal').then(m => ({ default: m.JurnalKbmModal })));
const SesiAttendanceList = React.lazy(() => import('../../attendance/sesi/SesiAttendanceList').then(m => ({ default: m.SesiAttendanceList })));

// Staff Dashboard Modular Tabs (Code-Split via React.lazy)
const StaffBerandaTab = React.lazy(() => import('../staff/tabs/StaffBerandaTab').then(m => ({ default: m.StaffBerandaTab })));
const StaffKbmAbsenTab = React.lazy(() => import('../staff/tabs/StaffKbmAbsenTab').then(m => ({ default: m.StaffKbmAbsenTab })));
const StaffActionHubTab = React.lazy(() => import('../staff/tabs/StaffActionHubTab').then(m => ({ default: m.StaffActionHubTab })));
const StaffRekapMapelTab = React.lazy(() => import('../staff/tabs/StaffRekapMapelTab').then(m => ({ default: m.StaffRekapMapelTab })));
// Wali Kelas Dashboard — clean modular design (replaces legacy StaffWaliKelasTab)
const WaliKelasDashboard = React.lazy(() => import('./WaliKelasDashboard').then(m => ({ default: m.WaliKelasDashboard })));
const StaffPiketOperasionalTab = React.lazy(() => import('../staff/tabs/StaffPiketOperasionalTab').then(m => ({ default: m.StaffPiketOperasionalTab })));
const StaffProfilGuruTab = React.lazy(() => import('../staff/tabs/StaffProfilGuruTab').then(m => ({ default: m.StaffProfilGuruTab })));
const StaffManualInputTab = React.lazy(() => import('../staff/tabs/StaffManualInputTab').then(m => ({ default: m.StaffManualInputTab })));
// Kaprog Dashboard — clean 3-zone design (replaced StaffKaprogTab)
const KaprogDashboard = React.lazy(() => import('./KaprogDashboard').then(m => ({ default: m.KaprogDashboard })));
// Admin Dashboard — clean role-patterned architecture
const AdminDashboard = React.lazy(() => import('./AdminDashboard').then(m => ({ default: m.AdminDashboard })));
// Kurikulum Dashboard — clean role-patterned architecture
const KurikulumDashboard = React.lazy(() => import('./KurikulumDashboard').then(m => ({ default: m.KurikulumDashboard })));
// Kesiswaan Dashboard — clean role-patterned architecture
const KesiswaanDashboard = React.lazy(() => import('./KesiswaanDashboard').then(m => ({ default: m.KesiswaanDashboard })));
// Sarpras Dashboard — clean role-patterned architecture
const SarprasDashboard = React.lazy(() => import('./SarprasDashboard').then(m => ({ default: m.SarprasDashboard })));
// Hubin Dashboard — clean role-patterned architecture
const HubinDashboard = React.lazy(() => import('./HubinDashboard').then(m => ({ default: m.HubinDashboard })));
// Koperasi Dashboard — clean role-patterned architecture
const KoperasiDashboard = React.lazy(() => import('./KoperasiDashboard').then(m => ({ default: m.KoperasiDashboard })));
// BPBK Dashboard — clean role-patterned architecture
const BpbkDashboard = React.lazy(() => import('./BpbkDashboard').then(m => ({ default: m.BpbkDashboard })));
// BKK Dashboard — clean role-patterned architecture
const BkkDashboard = React.lazy(() => import('./BkkDashboard').then(m => ({ default: m.BkkDashboard })));
// Toolman Dashboard — clean role-patterned architecture
const ToolmanDashboard = React.lazy(() => import('./ToolmanDashboard').then(m => ({ default: m.ToolmanDashboard })));
// Ekskul Dashboard — clean role-patterned architecture
const EkskulDashboard = React.lazy(() => import('./EkskulDashboard').then(m => ({ default: m.EkskulDashboard })));
// Pembimbing PKL Dashboard — clean role-patterned architecture
const PembimbingPklDashboard = React.lazy(() => import('./PembimbingPklDashboard').then(m => ({ default: m.PembimbingPklDashboard })));
// Satpam / Gerbang Dashboard — clean role-patterned architecture
const SatpamDashboard = React.lazy(() => import('./SatpamDashboard').then(m => ({ default: m.SatpamDashboard })));

// Executive Principal Dashboard — dirender di tab Overview Eksekutif untuk KEPALA_SEKOLAH
const KepalaSekolahDashboard = React.lazy(() => import('./KepalaSekolahDashboard').then(m => ({ default: m.KepalaSekolahDashboard })));
// Tata Usaha Dashboard — unified capability-driven command center untuk seluruh jabatan TU
const TataUsahaDashboard = React.lazy(() => import('./TataUsahaDashboard').then(m => ({ default: m.TataUsahaDashboard })));

const CatatPelanggaranModal = React.lazy(() => import('../../kesiswaan/modals/CatatPelanggaranModal').then(m => ({ default: m.CatatPelanggaranModal })));
const TindakMasalPelanggaranModal = React.lazy(() => import('../../kesiswaan/modals/TindakMasalPelanggaranModal').then(m => ({ default: m.TindakMasalPelanggaranModal })));
const TeacherSosialisasiScanModal = React.lazy(() =>
  import('../staff/modals/TeacherSosialisasiScanModal').then((m) => ({ default: m.TeacherSosialisasiScanModal }))
);
const RapatSosialisasiPanel = React.lazy(() =>
  import('@/components/management/compliance/RapatSosialisasiPanel').then((m) => ({ default: m.RapatSosialisasiPanel }))
);
import { sosialisasiApi, sosialisasiQueryKeys } from '@/api/academic/sosialisasi.api';

// Hooks & APIs
import { useStaffTimeline } from '../../../hooks/useStaffTimeline';
import { toLocalDate } from '../../../utils/attendance/time';

export const UnifiedStaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

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
    isPembinaEskul,
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
  const isGuruOrStaff = !isAdmin || Boolean(user?.guru_profile?.id);
  const { guruProfile, refetch: refetchGuruProfile } = useGuruMe({ enabled: isGuruOrStaff });

  // Query P5 Projects for facilitator role
  const { data: myP5ProjectsRes } = useQuery({
    queryKey: ['my-p5-projects-hero', user?.id],
    queryFn: async () => {
      const { raporApi } = await import('../../../api/rapor.api');
      return raporApi.getMyP5Projects();
    },
    enabled: !!user?.id && !isAdmin && !isKepsek,
    staleTime: 5 * 60 * 1000,
  });

  const isFasilitatorP5Actual = isFasilitatorP5 || Boolean(myP5ProjectsRes?.data && myP5ProjectsRes.data.length > 0);
  const p5ProjectCount = Math.max(fasilitatorP5Count || 0, myP5ProjectsRes?.data?.length || 0);

  const guruId = user?.guru_profile?.id || guruProfile?.id;
  const [isScanSosialisasiOpen, setIsScanSosialisasiOpen] = useState(false);

  // ── Query Sesi Aktif Rapat Sosialisasi Platform (Universal All Roles & All Dashboards) ──
  const { data: sosialisasiData, refetch: refetchSosialisasi } = useQuery({
    queryKey: sosialisasiQueryKeys.active(),
    queryFn: () => sosialisasiApi.getActiveSession().catch(() => null),
    staleTime: 60 * 1000,
  });

  const isSosialisasiActive = sosialisasiData?.session?.status === 'AKTIF';
  const myAttendanceItem = useMemo(() => {
    if (!sosialisasiData?.attendees) return null;
    const currentNip = (user?.guru_profile as any)?.nip || guruProfile?.nip || (user as any)?.nip;
    return sosialisasiData.attendees.find(
      (a: any) => (guruId && a.guru_id === guruId) || (currentNip && a.nip === currentNip)
    );
  }, [sosialisasiData?.attendees, guruId, guruProfile, user]);
  const isMyAttendanceDone = Boolean(myAttendanceItem?.is_hadir);

  const { timelineItems, isLoading: timelineLoading, refetch: refetchTimeline } = useStaffTimeline(guruId, {
    enabled: !isAdmin && Boolean(guruId),
  });

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

  // Piket Guru: Murni hanya jika guru terdaftar dalam jadwal piket (bukan Hubin/Kepsek/guru umum tanpa jadwal)
  const isPiketGuruActual = !isKepsek && (
    Boolean(isPiketGuru) ||
    Boolean(
      guruProfile?.is_piket_guru || 
      (guruProfile?.active_piket_count && guruProfile.active_piket_count > 0) ||
      ((user?.guru_profile as any)?.is_piket_guru) ||
      ((user?.guru_profile as any)?.active_piket_count > 0)
    )
  );

  const hasStructuralRole = isWaliKelas || isKurikulum || isKesiswaan || isKepsek
    || isSarpras || isHubin || isToolman || isKaprog || isKabeng
    || isBpbk || isBkk || isGerbang || isTU;

  // 🎯 DEFAULT TAB RESOLUTION (Posisi Netral: Apapun jabatannya, selalu mendarat di Beranda Dashboard)
  const defaultTabId = useMemo(() => {
    if (isAdminRole && !isKepsek) return 'admin';
    return 'ringkasan';
  }, [isAdminRole, isKepsek]);

  // Synchronize Active Tab with Query Param (?tab=...) atau Smart Default Tab (dengan guard akses)
  const rawRequestedTab = searchParams.get('tab');
  const requestedTab =
    rawRequestedTab === 'walas'
      ? 'binaan'
      : rawRequestedTab === 'jadwal' || rawRequestedTab === 'action_hub' || rawRequestedTab === 'rekap_mapel'
      ? 'ringkasan'
      : rawRequestedTab;
  const activeTab = requestedTab || defaultTabId;

  // Sinkronisasi query param otomatis saat akses /dashboard polosan atau legacy tabs
  useEffect(() => {
    if (!rawRequestedTab) {
      setSearchParams({ tab: defaultTabId }, { replace: true });
    } else if (rawRequestedTab === 'action_hub') {
      setSearchParams({ tab: 'ringkasan', subtab: 'tugas' }, { replace: true });
    } else if (rawRequestedTab === 'rekap_mapel') {
      setSearchParams({ tab: 'ringkasan', subtab: 'rekap' }, { replace: true });
    }
  }, [rawRequestedTab, defaultTabId, setSearchParams]);

  // ── 3. Role-Specific Scoped Queries (Google Platform Standard: Scoped Lazy Query Execution) ───
  const { rawList: waliKelasAssignments } = useWaliKelasOptions({
    enabled: Boolean(isWaliKelas) || activeTab === 'binaan',
  });

  const waliKelasStrukturItem = useMemo(() => {
    const guruProfileId = (user as any)?.guru_profile?.id || (user as any)?.guru_profile_id || guruProfile?.id;
    const userId = user?.id || (user as any)?.userId;
    if (waliKelasAssignments && waliKelasAssignments.length > 0) {
      return waliKelasAssignments.find((item: any) => {
        const hasClass = Boolean(
          item.kelas_id || 
          item.Kelas?.id || 
          item.StrukturOrganisasi?.kelas_id || 
          item.StrukturOrganisasi?.Kelas?.id
        );
        if (!hasClass) return false;
        if (guruProfileId && (item.guru_id === guruProfileId || item.Guru?.id === guruProfileId)) return true;
        if (userId && (item.user_id === userId || item.Guru?.user_id === userId)) return true;
        return false;
      });
    }
    return null;
  }, [user, waliKelasAssignments, guruProfile]);

  const waliKelasId = useMemo(() => {
    if ((user as any)?.walikelas_kelas?.id) return (user as any).walikelas_kelas.id;
    if (waliKelasStrukturItem?.Kelas?.id) return waliKelasStrukturItem.Kelas.id;
    if (waliKelasStrukturItem?.StrukturOrganisasi?.Kelas?.id) return waliKelasStrukturItem.StrukturOrganisasi.Kelas.id;
    if (waliKelasStrukturItem?.StrukturOrganisasi?.kelas_id) return waliKelasStrukturItem.StrukturOrganisasi.kelas_id;
    if (waliKelasStrukturItem?.kelas_id) return waliKelasStrukturItem.kelas_id;
    return guruProfile?.wali_kelas_di?.id || (user?.guru_profile as any)?.wali_kelas_di?.id;
  }, [waliKelasStrukturItem, guruProfile, user]);

  const waliKelasNama = useMemo(() => {
    if ((user as any)?.walikelas_kelas?.nama_kelas) return (user as any).walikelas_kelas.nama_kelas;
    if (waliKelasStrukturItem?.Kelas?.nama_kelas) return waliKelasStrukturItem.Kelas.nama_kelas;
    if (waliKelasStrukturItem?.StrukturOrganisasi?.Kelas?.nama_kelas) return waliKelasStrukturItem.StrukturOrganisasi.Kelas.nama_kelas;
    return guruProfile?.wali_kelas_di?.nama_kelas || (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas || 'Kelas Binaan';
  }, [waliKelasStrukturItem, guruProfile, user]);

  const handleTabChange = React.useCallback((newTab: string) => {
    useMobileSubtabSidebarStore.getState().close();
    if (newTab === 'p5_projek') {
      navigate('/rapor/p5');
      return;
    }
    setSearchParams({ tab: newTab }, { replace: true });
  }, [setSearchParams, navigate]);

  // ── Desktop Horizontal Tab Scroll Controls (Tombol Kiri / Kanan) ─────────────
  const desktopNavScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollNavLeft, setCanScrollNavLeft] = useState(false);
  const [canScrollNavRight, setCanScrollNavRight] = useState(false);

  const updateDesktopNavScrollState = React.useCallback(() => {
    const el = desktopNavScrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollNavLeft(el.scrollLeft > 4);
    setCanScrollNavRight(maxScrollLeft > 4 && el.scrollLeft < maxScrollLeft - 4);
  }, []);

  const scrollDesktopNav = React.useCallback((direction: 'left' | 'right') => {
    const el = desktopNavScrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.round(el.clientWidth * 0.55));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  }, []);

  // Tutup dan reset sidebar otomatis hanya saat activeTab benar-benar berubah setelah mount
  const prevActiveTabRef = React.useRef(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current !== activeTab) {
      prevActiveTabRef.current = activeTab;
      useMobileSubtabSidebarStore.getState().close();
    }
  }, [activeTab]);

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
    queryFn: async () => {
      const { kesiswaanApi } = await import('../../../api/kesiswaan.api');
      return kesiswaanApi.getRekapHarianSiswa({ kelas_id: waliKelasId }).catch(() => ({ success: true, data: [] }));
    },
    enabled: !!isWaliKelas && !!waliKelasId && (activeTab === 'binaan' || activeTab === 'ringkasan'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kbmStatsRes, isLoading: kbmLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'kbm-stats'],
    queryFn: async () => {
      const { getDailyClassStats } = await import('../../../api/dashboard.api');
      return getDailyClassStats().catch(() => ({ success: true, data: null }));
    },
    enabled: (!!isKurikulum || !!isKepsek) && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: teacherStatsRes, isLoading: teacherStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'teacher-stats'],
    queryFn: async () => {
      const { getDailyTeacherStats } = await import('../../../api/dashboard.api');
      return getDailyTeacherStats().catch(() => ({ success: true, data: null }));
    },
    enabled: (!!isKurikulum || !!isKepsek) && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: escalationsRes } = useQuery({
    queryKey: ['dashboard', 'kepsek', 'escalations'],
    queryFn: async () => {
      const { getKepsekEscalations } = await import('../../../api/dashboard.api');
      return getKepsekEscalations().catch(() => ({ success: true, data: [] }));
    },
    enabled: !!isKepsek && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyPermitsRes, isLoading: permitsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'daily-permits'],
    queryFn: async () => {
      const { piketApi } = await import('../../../api/piket.api');
      return piketApi.getDailyPermits().catch(() => ({ success: true, data: [] }));
    },
    enabled: !!isKesiswaan && (can('attendance.piket.view') || can('attendance.gate.scan')) && (activeTab === 'kelola' || activeTab === 'ringkasan'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: violationsRes, isLoading: violationsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'violations'],
    queryFn: async () => {
      const { kesiswaanApi } = await import('../../../api/kesiswaan.api');
      return kesiswaanApi.getPelanggaran({ limit: 100 }).catch(() => ({ success: true, data: { list: [] } }));
    },
    enabled: !!isKesiswaan && (activeTab === 'ringkasan' || activeTab === 'binaan'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: kurikulumMonitoringRes, isLoading: kurikulumMonitoringLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', toLocalDate()],
    queryFn: async () => {
      const { kurikulumApi } = await import('../../../api/kurikulum.api');
      return kurikulumApi.getKbmGlobalMonitoring(toLocalDate()).catch(() => ({ success: true, data: null }));
    },
    enabled: !!isKurikulum && activeTab === 'ringkasan',
    staleTime: 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: hubinStatsRes, isLoading: hubinStatsLoading } = useQuery({
    queryKey: ['dashboard', 'hubin', 'stats'],
    queryFn: async () => {
      const { hubinApi } = await import('../../../api/hubin.api');
      return hubinApi.getStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isHubin && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: sarprasStatsRes, isLoading: sarprasStatsLoading } = useQuery({
    queryKey: ['dashboard', 'sarpras', 'stats'],
    queryFn: async () => {
      const { getSarprasStats } = await import('../../../api/dashboard.api');
      return getSarprasStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isSarpras && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: gerbangStatsRes, isLoading: gerbangStatsLoading } = useQuery({
    queryKey: ['dashboard', 'gerbang', 'stats'],
    queryFn: async () => {
      const { getGerbangDashboardStats } = await import('../../../api/dashboard.api');
      return getGerbangDashboardStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isGerbang && (can('attendance.gate.scan') || can('attendance.piket.view')) && (activeTab === 'kelola' || activeTab === 'ringkasan'),
    staleTime: 60 * 1000,
    refetchInterval: 60000,
  });

  const { data: kaprogStatsRes, isLoading: kaprogStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kaprog', 'stats'],
    queryFn: async () => {
      const { getKaprogStats } = await import('../../../api/dashboard.api');
      return getKaprogStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isKaprog && can('dashboard.view.kaprog') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: toolmanStatsRes, isLoading: toolmanStatsLoading } = useQuery({
    queryKey: ['dashboard', 'toolman', 'stats'],
    queryFn: async () => {
      const { getToolmanStats } = await import('../../../api/dashboard.api');
      return getToolmanStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isToolman && can('dashboard.view.toolman') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: kabengStatsRes, isLoading: kabengStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kabeng', 'stats'],
    queryFn: async () => {
      const { getKabengStats } = await import('../../../api/dashboard.api');
      return getKabengStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isKabeng && can('dashboard.view.kabeng') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  const { data: bkkStatsRes, isLoading: bkkStatsLoading } = useQuery({
    queryKey: ['dashboard', 'bkk', 'stats'],
    queryFn: async () => {
      const { getBkkStats } = await import('../../../api/dashboard.api');
      return getBkkStats().catch(() => ({ success: true, data: null }));
    },
    enabled: !!isBkk && can('dashboard.view.bkk') && activeTab === 'ringkasan',
    staleTime: 5 * 60 * 1000,
  });

  // ── 4. UI State & Piket Operations ─────────────────────────────────────────────
  const { rawList: dailyPermits, refetch: refetchPermits } = usePiketIzinKeluarOptions({
    enabled: (Boolean(isPiketGuruActual) || Boolean(isKesiswaan)) && (activeTab === 'kelola' || activeTab === 'ringkasan'),
  });
  const [printedPermit, setPrintedPermit] = useState<any>(null);
  const [printPaperSize, setPrintPaperSize] = useState<string>('80mm');

  const { tenant: authTenant } = useAuthStore();

  const { data: tenantRes } = useQuery({
    queryKey: ['my-tenant'],
    queryFn: async () => {
      const { tenantApi } = await import('../../../api/tenants.api');
      const res = await tenantApi.getMyTenant();
      return res.data;
    },
    initialData: (user as any)?.tenant || authTenant,
    enabled: !!user?.tenant_id && !authTenant && !(user as any)?.tenant,
    staleTime: 10 * 60 * 1000,
  });
  const tenantInfo = tenantRes || authTenant || (user as any)?.tenant || null;

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
    if (isPembinaEskul) parts.push('Pembina Ekskul');
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
    isHubin, isPembimbingPkl, isToolman, isPembinaEskul, isKaprog, isKabeng, isBpbk, isBkk, isGerbang,
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
    if (isPembinaEskul) {
      badges.push({ label: 'Pembina Ekskul', icon: Compass, color: 'bg-indigo-500/25 text-indigo-100 border-indigo-400/30' });
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
    isKurikulum, isKesiswaan, isPembinaEskul, isSarpras, isHubin, isKaprog, isKabeng, isToolman, isBpbk, isBkk,
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
      list.push({ id: 'kepsek', label: 'Dashboard Kepala Sekolah', icon: Award });
    }

    // 0.1 Tab Rapat Sosialisasi (Universal: Tampil untuk seluruh role pengguna ketika ada rapat aktif)
    if (isSosialisasiActive) {
      list.push({
        id: 'sosialisasi_view',
        label: isMyAttendanceDone ? 'Sosialisasi (Hadir)' : '⚡ Presensi Sosialisasi',
        icon: QrCode,
      });
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

    // 1.1 Input Manual (Khusus Petugas Gerbang / Piket)
    if ((hasGerbangDuty || isGerbang || isPureGerbangStaff) && (!isAdminRole || isEffectivePendidik) && !isKepsek) {
      list.push({
        id: 'manual_presensi',
        label: 'Input Manual',
        icon: ClipboardCheck,
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

    // 4.1 Kaprog (Ketua Program Keahlian / Jurusan & Admin)
    if ((isKaprog || isAdminRole) && !isKepsek) {
      list.push({ 
        id: 'kaprog', 
        label: isAdminRole && !isKaprog ? 'Dashboard Kaprog' : 'Dashboard Jurusan', 
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

    // 4.6 Koperasi (Khusus Pengurus / Pengelola Koperasi / Admin)
    if ((isKoperasi || isKoperasiHead || isKoperasiFinance || isKoperasiSecretary || isKoperasiAuditor || isKoperasiStore || (isAdminRole && !isKepsek) || can('coop.pos.access') || can('coop.manage')) && !isKepsek) {
      list.push({ 
        id: 'koperasi', 
        label: 'Dashboard Koperasi', 
        icon: ShoppingCart, 
      });
    }

    // 4.7 Konseling / BPBK (Khusus Guru BK / Konselor / Admin)
    if ((isBpbk || (isAdminRole && !isKepsek) || can('bpbk.view') || can('bpbk.manage')) && !isKepsek) {
      list.push({ 
        id: 'bpbk', 
        label: 'Dashboard Konseling', 
        icon: HeartHandshake, 
      });
    }

    // 4.8 BKK (Bursa Kerja Khusus & Penyaluran Alumni)
    if ((isBkk || (isAdminRole && !isKepsek) || can('hubin.view') || can('hubin.manage')) && !isKepsek) {
      list.push({ 
        id: 'bkk', 
        label: 'Dashboard BKK', 
        icon: Award, 
      });
    }

    // 4.9 Toolman (Teknisi Peralatan & Laboratorium / Bengkel)
    if ((isToolman || isKabeng || (isAdminRole && !isKepsek) || can('sarpras.view') || can('sarpras.manage')) && !isKepsek) {
      list.push({ 
        id: 'toolman', 
        label: 'Dashboard Toolman', 
        icon: Wrench, 
      });
    }

    // 4.10 Ekstrakurikuler (Pembina Ekskul & Kesiswaan)
    if ((isPembinaEskul || isKesiswaan || (isAdminRole && !isKepsek) || can('kesiswaan.view') || can('kesiswaan.manage')) && !isKepsek) {
      list.push({ 
        id: 'ekskul', 
        label: 'Dashboard Ekstrakurikuler', 
        icon: Compass, 
      });
    }

    // 4.11 Pembimbing PKL: Murni hanya untuk guru yang terdaftar di plotting PKL
    if (isPembimbingPkl && !isKepsek) {
      list.push({ 
        id: 'pembimbing_pkl', 
        label: 'Dashboard Pembimbing PKL', 
        icon: Briefcase, 
      });
    }

    // 4.12 Pos Satpam & Gerbang Keamanan
    if ((isGerbang || isPureGerbangStaff || hasGerbangDuty || (isAdminRole && !isKepsek) || can('attendance.gate.scan')) && !isKepsek && !isPureGerbangStaff) {
      list.push({ 
        id: 'satpam', 
        label: 'Pos Satpam & Gerbang', 
        icon: ShieldCheck, 
      });
    }

    // 5. Fasilitator P5 (Khusus Guru Fasilitator Projek P5)
    if (isFasilitatorP5Actual && !isKepsek) {
      list.push({ id: 'p5_projek', label: 'Dashboard P5', icon: Sparkles });
    }

    // 10. Tab Tata Usaha Terpadu (1 Shell Capability-Driven untuk seluruh 5 jabatan TU)
    if ((isTU || isTUKepala || isTUPersuratan || isTUKepegawaian || isTUKeuangan || isTUSarpras || (isAdminRole && !isKepsek)) && !isKepsek) {
      list.push({ id: 'kepegawaian', label: tuTabMeta.label || 'Dashboard TU', icon: Building });
    }

    // 11. Piket & Gerbang: Murni hanya untuk guru yang terdaftar dalam jadwal piket atau petugas keamanan gerbang
    const canAccessPiket = isPureGerbangStaff || (isPiketGuruActual && !isKepsek);
    if (canAccessPiket) {
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
    isTUKepala,
    isTUPersuratan,
    isTUKepegawaian,
    isTUKeuangan,
    isTUSarpras,
    isTU,
    tuTabMeta,
    isPiketGuruActual,
    isSarpras,
    isHubin,
    isKoperasi,
    isKoperasiHead,
    isKoperasiFinance,
    isKoperasiSecretary,
    isKoperasiAuditor,
    isKoperasiStore,
    isBpbk,
    isBkk,
    isToolman,
    isKabeng,
    isPembinaEskul,
    isSosialisasiActive,
    isMyAttendanceDone,
  ]);

  useEffect(() => {
    const el = desktopNavScrollRef.current;
    if (!el) return;

    updateDesktopNavScrollState();
    const activeBtn = el.querySelector<HTMLElement>('[data-nav-tab-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    const handleScroll = () => updateDesktopNavScrollState();
    el.addEventListener('scroll', handleScroll, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updateDesktopNavScrollState())
      : null;
    resizeObserver?.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [tabs.length, activeTab, updateDesktopNavScrollState]);

  // Normalisasi tab aktif jika tab di URL tidak termasuk dalam daftar kapabilitas user
  useEffect(() => {
    // Tab binaan, kepsek, kaprog, kepegawaian, pembimbing_pkl, dan kelola (piket) valid jika user memiliki peran tersebut
    if (activeTab === 'sosialisasi_view' && isSosialisasiActive) return;
    if (activeTab === 'binaan' && (isWaliKelas || Boolean(waliKelasId))) return;
    if (activeTab === 'kepsek' && (isKepsek || isAdminRole)) return;
    if (activeTab === 'kaprog' && (isKaprog || isAdminRole)) return;
    if (activeTab === 'kepegawaian' && (isTUKepala || isTUPersuratan || isTUKepegawaian || isTUKeuangan || isTUSarpras || isTU || isAdminRole)) return;
    if (activeTab === 'pembimbing_pkl' && isPembimbingPkl) return;
    if (activeTab === 'kelola' && (isPiketGuruActual || isPureGerbangStaff)) return;

    // Tunggu sampai tabs siap sebelum melakukan fallback
    if (tabs.length === 0) return;

    if (!tabs.some(t => t.id === activeTab)) {
      const fallback = tabs.some(t => t.id === defaultTabId) ? defaultTabId : tabs[0].id;
      setSearchParams({ tab: fallback }, { replace: true });
    }
  }, [tabs, activeTab, defaultTabId, setSearchParams, isWaliKelas, waliKelasId, isKaprog, isTUKepala, isTUPersuratan, isTUKepegawaian, isTUKeuangan, isTUSarpras, isTU, isAdminRole, isPembimbingPkl, isPiketGuruActual, isPureGerbangStaff]);

  // ── 6. Quick Actions ──────────────────────────────────────────────────────────
  const quickActions = useMemo(() => {
    const actions: QuickAction[] = [];

    if (isSosialisasiActive) {
      actions.push({
        label: isMyAttendanceDone ? 'Sosialisasi (Hadir)' : 'Presensi Sosialisasi',
        icon: QrCode,
        onClick: () => setIsScanSosialisasiOpen(true),
        color: 'violet' as any,
      });
    }

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
        onClick: () => setSearchParams({ tab: 'ringkasan', subtab: 'rekap' }, { replace: true }),
        color: 'emerald'
      });
    }

    return actions;
  }, [timelineItems, navigate, isPendidik, isEffectivePendidik, hasTeachingDuty, isSosialisasiActive, isMyAttendanceDone]);

  // PORTAL MODE REDIRECT
  if (dashboardMode === 'portal') {
    return (
      <>
        {/* Banner Sosialisasi Global Portal Mode */}
        {isSosialisasiActive && sosialisasiData?.session && (
          <div className="mb-4 p-3.5 bg-gradient-to-r from-violet-600/15 via-indigo-600/15 to-purple-600/15 dark:from-violet-950/60 dark:via-indigo-950/60 dark:to-purple-950/50 border border-violet-300 dark:border-violet-700/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs",
                isMyAttendanceDone ? "bg-emerald-500 text-white" : "bg-violet-600 text-white"
              )}>
                {isMyAttendanceDone ? <CheckCircle2 size={18} /> : <QrCode size={18} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
                    Sosialisasi
                  </span>
                  <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                    {sosialisasiData.session.nama_acara}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {isMyAttendanceDone ? "Status: Sudah Hadir" : "Wajib Presensi • Ketuk tombol scan"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsScanSosialisasiOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white shrink-0 active:scale-95"
            >
              {isMyAttendanceDone ? "Status" : "Scan QR"}
            </button>
          </div>
        )}

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
          <Suspense fallback={null}>
            <JurnalKbmModal
              isOpen={journalModalOpen}
              onClose={() => { setJournalModalOpen(false); setSessionForJournal(null); }}
              sesi={sessionForJournal}
            />
          </Suspense>
        )}
        {selectedSesi && (
          <Suspense fallback={null}>
            <Modal isOpen={!!selectedSesi} onClose={() => setSelectedSesi(null)} title="Presensi Sesi KBM">
              <Suspense fallback={<div className="py-8 flex justify-center"><Loader /></div>}>
                <SesiAttendanceList sesiId={selectedSesi.id} sesi={selectedSesi} />
              </Suspense>
            </Modal>
          </Suspense>
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

        {/* Modal Scanner QR Presensi Sosialisasi (Portal Mode) */}
        {isScanSosialisasiOpen && (
          <Suspense fallback={null}>
            <TeacherSosialisasiScanModal
              isOpen={isScanSosialisasiOpen}
              onClose={() => setIsScanSosialisasiOpen(false)}
              guruId={guruId || user?.id || ''}
              guruNama={guruProfile?.nama_guru || user?.full_name || user?.name || 'Pengguna'}
              guruNip={guruProfile?.nip || (user?.guru_profile as any)?.nip || (user as any)?.nip}
              tenantId={user?.tenant_id}
              activeSession={sosialisasiData?.session}
              isAlreadyAttended={isMyAttendanceDone}
              waktuHadir={myAttendanceItem?.waktu_hadir}
              onSuccess={() => refetchSosialisasi()}
            />
          </Suspense>
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

        {/* Tab Navigation Row Inset (Desktop) dengan Tombol Geser Kiri / Kanan */}
        <div className="hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 relative z-10 shadow-lg">
          <button
            type="button"
            onClick={() => scrollDesktopNav('left')}
            disabled={!canScrollNavLeft}
            aria-label="Geser navigasi dashboard ke kiri"
            title="Geser ke kiri"
            className={cn(
              "w-8 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all select-none",
              canScrollNavLeft
                ? "bg-white/10 hover:bg-white/20 text-white border-white/15 cursor-pointer active:scale-95 shadow-xs"
                : "bg-transparent text-slate-600 border-transparent opacity-35 cursor-default"
            )}
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={desktopNavScrollRef}
            className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth"
          >
            {tabs.map((tab, idx) => {
              const TabIcon = tab.icon;
              const isTabActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id || `tab-idx-${idx}`}
                  type="button"
                  data-nav-tab-active={isTabActive ? 'true' : undefined}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 select-none",
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

          <button
            type="button"
            onClick={() => scrollDesktopNav('right')}
            disabled={!canScrollNavRight}
            aria-label="Geser navigasi dashboard ke kanan"
            title="Geser ke kanan"
            className={cn(
              "w-8 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all select-none",
              canScrollNavRight
                ? "bg-white/10 hover:bg-white/20 text-white border-white/15 cursor-pointer active:scale-95 shadow-xs"
                : "bg-transparent text-slate-600 border-transparent opacity-35 cursor-default"
            )}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* ── BANNER SOSIALISASI PLATFORM (GLOBAL ACCESS ALL DASHBOARDS) ── */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isSosialisasiActive && sosialisasiData?.session && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-violet-600/15 via-indigo-600/15 to-purple-600/15 dark:from-violet-950/60 dark:via-indigo-950/60 dark:to-purple-950/50 border border-violet-300 dark:border-violet-700/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs",
              isMyAttendanceDone ? "bg-emerald-500 text-white" : "bg-violet-600 text-white"
            )}>
              {isMyAttendanceDone ? <CheckCircle2 size={22} /> : <QrCode size={22} />}
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
                  isMyAttendanceDone
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                )}>
                  {isMyAttendanceDone ? "Sudah Hadir" : "Wajib Presensi"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {isMyAttendanceDone
                  ? `Kehadiran Anda tercatat pada ${myAttendanceItem?.waktu_hadir ? new Date(myAttendanceItem.waktu_hadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'rapat ini'}`
                  : `${sosialisasiData.session.tempat} • Pukul ${sosialisasiData.session.waktu_mulai} - ${sosialisasiData.session.waktu_selesai} WIB`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => handleTabChange('sosialisasi_view')}
              className="px-3 py-2 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100/50 dark:hover:bg-violet-900/30 transition-all cursor-pointer"
            >
              Lihat Detail Acara
            </button>
            <button
              type="button"
              onClick={() => setIsScanSosialisasiOpen(true)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95",
                isMyAttendanceDone
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 font-extrabold"
              )}
            >
              <QrCode size={16} />
              <span>{isMyAttendanceDone ? "Lihat Status Presensi" : "Scan QR Presensi"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT AREA (Keep-Alive Lazy-Mount Engine: 0ms Switch)       */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="w-full min-w-0">
        {/* ⚡ TAB RAPAT SOSIALISASI (UNIVERSAL ALL ROLES) */}
        {visitedTabs.has('sosialisasi_view') && (
          <div 
            key="tab-sosialisasi_view"
            role="tabpanel"
            aria-hidden={activeTab !== 'sosialisasi_view'}
            className={cn("w-full min-w-0", activeTab === 'sosialisasi_view' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
              <RapatSosialisasiPanel />
            </Suspense>
          </div>
        )}
        {/* 📌 TAB 1: OVERVIEW EKSEKUTIF (KEPSEK) ATAU BERANDA GURU / STAF */}
        {visitedTabs.has('ringkasan') && (
          <EcosystemProvider ecosystem={isKepsek ? 'kepsek' : isPureGerbangStaff ? 'satpam' : 'portal'} as={React.Fragment}>
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
            ) : isPureGerbangStaff ? (
              <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
                <SatpamDashboard />
              </Suspense>
            ) : (
              <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
                <StaffBerandaTab
                  user={user}
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
              </Suspense>
            )}
          </div>
          </EcosystemProvider>
        )}

        {/* 🗓️ TAB 2: KBM & ABSEN */}
        {visitedTabs.has('jadwal') && (
          <EcosystemProvider ecosystem='kurikulum' as={React.Fragment}>
            <div 
            key="tab-jadwal"
            role="tabpanel"
            aria-hidden={activeTab !== 'jadwal'}
            className={cn("w-full min-w-0", activeTab === 'jadwal' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <StaffKbmAbsenTab
                guruId={guruId}
                guruNama={guruProfile?.nama_guru || user?.full_name}
                timelineItems={timelineItems || []}
                isLoadingTimeline={timelineLoading}
                onRefreshTimeline={refetchTimeline}
              />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 👥 TAB 3: WALI KELAS — Role Dashboard Architecture */}
        {visitedTabs.has('binaan') && (
          <EcosystemProvider ecosystem='walas' as={React.Fragment}>
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
          </EcosystemProvider>
        )}

        {/* 🏆 TAB KAPROG: DASHBOARD KETUA PROGRAM KEAHLIAN — New Design */}
        {visitedTabs.has('kaprog') && (
          <EcosystemProvider ecosystem='kaprog' as={React.Fragment}>
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
          </EcosystemProvider>
        )}

        {/* 📚 TAB KURIKULUM: DASHBOARD KURIKULUM */}
        {visitedTabs.has('kurikulum') && (
          <EcosystemProvider ecosystem='kurikulum' as={React.Fragment}>
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
          </EcosystemProvider>
        )}

        {/* 🛡️ TAB KESISWAAN: DASHBOARD KESISWAAN */}
        {visitedTabs.has('kesiswaan') && (
          <EcosystemProvider ecosystem='kesiswaan' as={React.Fragment}>
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
          </EcosystemProvider>
        )}

        {/* 📦 TAB SARPRAS: DASHBOARD SARPRAS */}
        {visitedTabs.has('sarpras') && (
          <EcosystemProvider ecosystem='sarpras' as={React.Fragment}>
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
          </EcosystemProvider>
        )}

        {/* 💼 TAB HUBIN: DASHBOARD HUBIN */}
        {visitedTabs.has('hubin') && (
          <EcosystemProvider ecosystem='hubin' as={React.Fragment}>
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
          </EcosystemProvider>
        )}

        {/* 🛒 TAB KOPERASI: DASHBOARD KOPERASI */}
        {visitedTabs.has('koperasi') && (
          <EcosystemProvider ecosystem='koperasi' as={React.Fragment}>
            <div 
            key="tab-koperasi"
            role="tabpanel"
            aria-hidden={activeTab !== 'koperasi'}
            className={cn("w-full min-w-0", activeTab === 'koperasi' ? "block" : "hidden")}
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
              <KoperasiDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🤝 TAB BPBK / KONSELING: DASHBOARD KONSELING */}
        {visitedTabs.has('bpbk') && (
          <EcosystemProvider ecosystem='bpbk' as={React.Fragment}>
            <div 
            key="tab-bpbk"
            role="tabpanel"
            aria-hidden={activeTab !== 'bpbk'}
            className={cn("w-full min-w-0", activeTab === 'bpbk' ? "block" : "hidden")}
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
              <BpbkDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🎓 TAB BKK: DASHBOARD BURSA KERJA KHUSUS */}
        {visitedTabs.has('bkk') && (
          <EcosystemProvider ecosystem='bkk' as={React.Fragment}>
            <div 
            key="tab-bkk"
            role="tabpanel"
            aria-hidden={activeTab !== 'bkk'}
            className={cn("w-full min-w-0", activeTab === 'bkk' ? "block" : "hidden")}
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
              <BkkDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🔧 TAB TOOLMAN: DASHBOARD TEKNISI BENGKEL / LAB */}
        {visitedTabs.has('toolman') && (
          <EcosystemProvider ecosystem='toolman' as={React.Fragment}>
            <div 
            key="tab-toolman"
            role="tabpanel"
            aria-hidden={activeTab !== 'toolman'}
            className={cn("w-full min-w-0", activeTab === 'toolman' ? "block" : "hidden")}
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
              <ToolmanDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🧭 TAB EKSKUL: DASHBOARD PEMBINA EKSTRAKURIKULER */}
        {visitedTabs.has('ekskul') && (
          <EcosystemProvider ecosystem='ekskul' as={React.Fragment}>
            <div 
            key="tab-ekskul"
            role="tabpanel"
            aria-hidden={activeTab !== 'ekskul'}
            className={cn("w-full min-w-0", activeTab === 'ekskul' ? "block" : "hidden")}
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
              <EkskulDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🏭 TAB PEMBIMBING PKL: DASHBOARD GURU PEMBIMBING SISWA MAGANG */}
        {visitedTabs.has('pembimbing_pkl') && (
          <EcosystemProvider ecosystem='pembimbing_pkl' as={React.Fragment}>
            <div 
            key="tab-pembimbing_pkl"
            role="tabpanel"
            aria-hidden={activeTab !== 'pembimbing_pkl'}
            className={cn("w-full min-w-0", activeTab === 'pembimbing_pkl' ? "block" : "hidden")}
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
              <PembimbingPklDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🛡️ TAB: POS SATPAM & GERBANG KEAMANAN */}
        {visitedTabs.has('satpam') && (
          <EcosystemProvider ecosystem='satpam' as={React.Fragment}>
            <div
            key="tab-satpam"
            role="tabpanel"
            aria-hidden={activeTab !== 'satpam'}
            className={cn("w-full min-w-0", activeTab === 'satpam' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <SatpamDashboard />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🛡️ TAB ADMIN: DASHBOARD OPERASIONAL ADMIN/SUPERADMIN */}
        {visitedTabs.has('admin') && (
          <EcosystemProvider ecosystem='admin' as={React.Fragment}>
            <div 
            key="tab-admin"
            role="tabpanel"
            aria-hidden={activeTab !== 'admin'}
            className={cn("w-full min-w-0", activeTab === 'admin' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <AdminDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🏆 TAB KEPSEK: DASHBOARD KEPALA SEKOLAH (AKSES ADMIN / EKSEKUTIF) */}
        {visitedTabs.has('kepsek') && (
          <EcosystemProvider ecosystem='kepsek' as={React.Fragment}>
            <div 
            key="tab-kepsek"
            role="tabpanel"
            aria-hidden={activeTab !== 'kepsek'}
            className={cn("w-full min-w-0", activeTab === 'kepsek' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <KepalaSekolahDashboard />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🧑‍💼 TAB 10: TATA USAHA TERPADU & KEPEGAWAIAN */}
        {visitedTabs.has('kepegawaian') && (
          <EcosystemProvider ecosystem='tu' as={React.Fragment}>
            <div 
            key="tab-kepegawaian"
            role="tabpanel"
            aria-hidden={activeTab !== 'kepegawaian'}
            className={cn("w-full min-w-0", activeTab === 'kepegawaian' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <TataUsahaDashboard user={user} />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 🔍 TAB INPUT MANUAL: FORM PENCARIAN SISWA/GURU LUPA KARTU */}
        {visitedTabs.has('manual_presensi') && (
          <EcosystemProvider ecosystem='portal' as={React.Fragment}>
            <div 
            key="tab-manual_presensi"
            role="tabpanel"
            aria-hidden={activeTab !== 'manual_presensi'}
            className={cn("w-full min-w-0", activeTab === 'manual_presensi' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <StaffManualInputTab />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 📋 TAB 9: PIKET HARIAN & OPERASIONAL */}
        {visitedTabs.has('kelola') && (
          <EcosystemProvider ecosystem='piket' as={React.Fragment}>
            <div 
            key="tab-kelola"
            role="tabpanel"
            aria-hidden={activeTab !== 'kelola'}
            className={cn("w-full min-w-0", activeTab === 'kelola' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <StaffPiketOperasionalTab
                dailyPermits={dailyPermitsRes?.data || dailyPermits || []}
                refetchPermits={refetchPermits}
                printedPermit={printedPermit}
                setPrintedPermit={setPrintedPermit}
                printPaperSize={printPaperSize}
                setPrintPaperSize={setPrintPaperSize}
                tenantInfo={tenantInfo}
              />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}

        {/* 👤 TAB 10: PROFIL GURU */}
        {visitedTabs.has('profil') && (
          <EcosystemProvider ecosystem='portal' as={React.Fragment}>
            <div 
            key="tab-profil"
            role="tabpanel"
            aria-hidden={activeTab !== 'profil'}
            className={cn("w-full min-w-0", activeTab === 'profil' ? "block" : "hidden")}
          >
            <Suspense fallback={<div className="py-12 flex justify-center"><Loader /></div>}>
              <StaffProfilGuruTab
                user={user}
                teacherInitials={teacherInitials}
                nipText={nipText}
                waliKelasNama={waliKelasNama}
              />
            </Suspense>
          </div>
          </EcosystemProvider>
        )}
      </div>


      {/* Modals */}
      {journalModalOpen && sessionForJournal && (
        <Suspense fallback={null}>
          <JurnalKbmModal
            isOpen={journalModalOpen}
            onClose={() => { setJournalModalOpen(false); setSessionForJournal(null); }}
            sesi={sessionForJournal}
          />
        </Suspense>
      )}
      {selectedSesi && (
        <Suspense fallback={null}>
          <Modal isOpen={!!selectedSesi} onClose={() => setSelectedSesi(null)} title="Presensi Sesi KBM">
            <Suspense fallback={<div className="py-8 flex justify-center"><Loader /></div>}>
              <SesiAttendanceList sesiId={selectedSesi.id} sesi={selectedSesi} />
            </Suspense>
          </Modal>
        </Suspense>
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

      {/* Modal Scanner QR Presensi Sosialisasi (Universal Semua Role) */}
      {isScanSosialisasiOpen && (
        <Suspense fallback={null}>
          <TeacherSosialisasiScanModal
            isOpen={isScanSosialisasiOpen}
            onClose={() => setIsScanSosialisasiOpen(false)}
            guruId={guruId || user?.id || ''}
            guruNama={guruProfile?.nama_guru || user?.full_name || user?.name || 'Pengguna'}
            guruNip={guruProfile?.nip || (user?.guru_profile as any)?.nip || (user as any)?.nip}
            tenantId={user?.tenant_id}
            activeSession={sosialisasiData?.session}
            isAlreadyAttended={isMyAttendanceDone}
            waktuHadir={myAttendanceItem?.waktu_hadir}
            onSuccess={() => refetchSosialisasi()}
          />
        </Suspense>
      )}
    </div>
  );
};

export default UnifiedStaffDashboard;
