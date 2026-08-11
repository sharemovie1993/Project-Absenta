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
  LayoutGrid,
  Fingerprint,
  MessageCircle,
  Building,
  Briefcase,
  UserCheck,
  ClipboardList,
  X,
  QrCode,
  MapPin
} from 'lucide-react';

// Components
import { type QuickAction } from '../shared/QuickActionGrid';
import { JurnalKbmModal } from '../../kurikulum/JurnalKbmModal';
import { SesiAttendanceList } from '../../attendance/sesi/SesiAttendanceList';
import { Modal, Badge, Button } from '../../ui';
import { StaffPortalAppLauncher } from '../portal/StaffPortalAppLauncher';
import { resolveSmartDashboardMode } from '../../../helpers/dashboardModeHelper';
import { useWaliKelasOptions } from '../../../hooks/useWaliKelasOptions';
import { PiketOperations } from '../../piket/PiketOperations';
import { PiketPrintSlip } from '../../piket/PiketPrintSlip';
import { usePiketIzinKeluarOptions } from '../../../hooks/usePiketIzinKeluarOptions';
import { tenantApi } from '../../../api/tenants.api';

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
    queryFn: () => kesiswaanApi.getRekapHarianSiswa({ kelas_id: waliKelasId }).catch(() => ({ success: true, data: [] })),
    enabled: !!isWaliKelas && !!waliKelasId,
  });

  const { data: kbmStatsRes, isLoading: kbmLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'kbm-stats'],
    queryFn: () => getDailyClassStats().catch(() => ({ success: true, data: null })),
    enabled: !!isKurikulum || !!isKepsek,
  });

  const { data: teacherStatsRes, isLoading: teacherStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'teacher-stats'],
    queryFn: () => getDailyTeacherStats().catch(() => ({ success: true, data: null })),
    enabled: !!isKurikulum || !!isKepsek,
  });

  const { data: escalationsRes } = useQuery({
    queryKey: ['dashboard', 'kepsek', 'escalations'],
    queryFn: () => getKepsekEscalations().catch(() => ({ success: true, data: [] })),
    enabled: !!isKepsek,
  });

  const { data: dailyPermitsRes, isLoading: permitsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'daily-permits'],
    queryFn: () => piketApi.getDailyPermits().catch(() => ({ success: true, data: [] })),
    enabled: !!isKesiswaan && (can('attendance.piket.view') || can('attendance.gate.scan')),
  });

  const { data: violationsRes, isLoading: violationsLoading } = useQuery({
    queryKey: ['dashboard', 'kesiswaan', 'violations'],
    queryFn: () => kesiswaanApi.getPelanggaran({ limit: 100 }).catch(() => ({ success: true, data: { list: [] } })),
    enabled: !!isKesiswaan,
  });

  const { data: kurikulumMonitoringRes, isLoading: kurikulumMonitoringLoading } = useQuery({
    queryKey: ['dashboard', 'kurikulum', 'monitoring-global', toLocalDate()],
    queryFn: () => kurikulumApi.getKbmGlobalMonitoring(toLocalDate()).catch(() => ({ success: true, data: null })),
    enabled: !!isKurikulum,
    refetchInterval: 60000,
  });

  const { data: hubinStatsRes, isLoading: hubinStatsLoading } = useQuery({
    queryKey: ['dashboard', 'hubin', 'stats'],
    queryFn: () => hubinApi.getStats().catch(() => ({ success: true, data: null })),
    enabled: !!isHubin,
  });

  const { data: sarprasStatsRes, isLoading: sarprasStatsLoading } = useQuery({
    queryKey: ['dashboard', 'sarpras', 'stats'],
    queryFn: () => getSarprasStats().catch(() => ({ success: true, data: null })),
    enabled: !!isSarpras,
  });

  const { data: gerbangStatsRes, isLoading: gerbangStatsLoading } = useQuery({
    queryKey: ['dashboard', 'gerbang', 'stats'],
    queryFn: () => getGerbangDashboardStats().catch(() => ({ success: true, data: null })),
    enabled: !!isGerbang && (can('attendance.gate.scan') || can('attendance.piket.view')),
    refetchInterval: 60000,
  });

  const { data: kaprogStatsRes, isLoading: kaprogStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kaprog', 'stats'],
    queryFn: () => getKaprogStats().catch(() => ({ success: true, data: null })),
    enabled: !!isKaprog && can('dashboard.view.kaprog'),
  });

  const { data: toolmanStatsRes, isLoading: toolmanStatsLoading } = useQuery({
    queryKey: ['dashboard', 'toolman', 'stats'],
    queryFn: () => getToolmanStats().catch(() => ({ success: true, data: null })),
    enabled: !!isToolman && can('dashboard.view.toolman'),
  });

  const { data: kabengStatsRes, isLoading: kabengStatsLoading } = useQuery({
    queryKey: ['dashboard', 'kabeng', 'stats'],
    queryFn: () => getKabengStats().catch(() => ({ success: true, data: null })),
    enabled: !!isKabeng && can('dashboard.view.kabeng'),
  });

  const { data: bkkStatsRes, isLoading: bkkStatsLoading } = useQuery({
    queryKey: ['dashboard', 'bkk', 'stats'],
    queryFn: () => getBkkStats().catch(() => ({ success: true, data: null })),
    enabled: !!isBkk && can('dashboard.view.bkk'),
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

  // Navigation Tabs Definition for Guru / Staff & Management (Adopsi Layout Mockup Guru)
  const tabs = [
    { id: 'ringkasan', label: 'Beranda Guru', icon: UserCheck },
    { id: 'jadwal', label: 'KBM & Absen', icon: BookOpen, badge: 'AKTIF' },
    { id: 'binaan', label: 'Wali Kelas', icon: Users, badge: '2' },
    { id: 'kelola', label: 'Piket Harian', icon: ClipboardList },
    { id: 'profil', label: 'Profil Guru', icon: User },
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
      
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TOP INTEGRATED HERO BANNER CARD & TAB NAV (Adopsi Gambar Guru)             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white shadow-xl space-y-6 relative overflow-hidden">
        
        {/* Header Row: Badges, Title & Teacher Attendance Status Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            {/* Top Badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20 shadow-xs">
                TEACHER &amp; WALAS OPERATIONAL
              </span>
              <span className="px-3 py-1 rounded-full bg-indigo-400/30 backdrop-blur-md text-indigo-100 text-[10px] font-mono font-extrabold border border-indigo-300/30">
                NIP: {nipText}
              </span>
            </div>

            {/* Teacher Name Greeting */}
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              {user?.full_name || user?.name || 'Drs. Budi Santoso, M.Pd'}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm font-medium text-white/90">
              {jabatanLabel}
            </p>
          </div>

          {/* Right Card: Teacher Attendance Badge */}
          <div className="p-3 px-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 flex items-center gap-3 shrink-0 self-start md:self-auto shadow-inner">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute inset-0" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-indigo-900" />
            </div>
            <div>
              <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest block">
                PRESENSI PEGAWAI HARI INI
              </span>
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                HADIR (06.30 WIB - Tepat Waktu)
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Row Inset (Embedded Dark Navigation Bar) */}
        <div className="p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar relative z-10 shadow-lg">
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
      <AnimatePresence mode="wait">
        
        {/* 📌 TAB 1: BERANDA GURU (Hanya tampil di tab Beranda Guru) */}
        {activeTab === 'ringkasan' && (
          <motion.div
            key="tab-ringkasan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* 3 SUMMARY STAT CARDS (Adopsi Layout Gambar Guru) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Stat 1: Jam Mengajar Hari Ini */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen size={22} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Jam Mengajar Hari Ini
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    4 JP <span className="text-xs font-bold text-slate-400">(180 Menit)</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Sesi KBM Active: Lab Komputer 2
                  </p>
                </div>
              </div>

              {/* Stat 2: Rombel Binaan Walas */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Users size={22} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Rombel Binaan Walas
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {waliKelasNama || 'XI RPL 1'} <span className="text-xs font-bold text-slate-400">(36 Siswa)</span>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    34 Hadir, 1 Sakit, 1 Alpa
                  </p>
                </div>
              </div>

              {/* Stat 3: Surat Izin Menunggu */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ClipboardList size={22} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Surat Izin Menunggu
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                    1 Pengajuan
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Butuh Validasi Wali Kelas
                  </p>
                </div>
              </div>
            </div>

            {/* ACTIVE KBM SESSION CARD (Adopsi Gambar Guru) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white uppercase tracking-wider">
                  KBM Berlangsung
                </span>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                  {waliKelasNama || 'XI RPL 1'} — Pemrograman Web &amp; Perangkat Bergerak
                </h3>
                <p className="text-xs font-medium text-slate-400">
                  Lab Komputer 2 • Jam Ke 1 - 4 (07.00 - 09.15 WIB)
                </p>
              </div>

              <Button
                onClick={() => {
                  handleTabChange('jadwal');
                }}
                className="w-full sm:w-auto h-10 px-5 rounded-2xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white border-none shrink-0 cursor-pointer shadow-lg shadow-blue-600/20"
              >
                Buka Input Presensi KBM
              </Button>
            </div>
          </motion.div>
        )}

        {/* 🗓️ TAB 2: KBM & ABSEN (Adopsi Layout Mockup KBM & Absen Guru) */}
        {activeTab === 'jadwal' && (
          <motion.div
            key="tab-jadwal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6"
          >
            {/* Header Row: Title, Pill Badge, Subtitle & Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Input Presensi Sesi KBM Matapelajaran
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                    SESI DIBUKA
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  {waliKelasNama || 'Kelas XI RPL 1'} • Lab Komputer 2
                </p>
              </div>

              {/* Header Right Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleMarkAllHadir}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-transparent text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/50 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 size={14} />
                  <span>Mark Semua Hadir (1-Click)</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => toast.success('Sesi KBM telah ditutup!')}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-900/30"
                >
                  <X size={14} />
                  <span>Tutup Sesi KBM</span>
                </Button>
              </div>
            </div>

            {/* Daftar Presensi Siswa Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Daftar Presensi Siswa ({kbmSiswaList.length} Siswa)
              </h3>

              <div className="space-y-2.5">
                {kbmSiswaList.map((siswa) => (
                  <div
                    key={siswa.id}
                    className="p-3.5 px-4.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    {/* Student Info */}
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {siswa.nama}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-400 font-semibold">
                        NISN: {siswa.nisn}
                      </p>
                    </div>

                    {/* Segmented Attendance Status Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                      {[
                        { key: 'HADIR', label: 'Hadir', activeClass: 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm' },
                        { key: 'TERLAMBAT', label: 'Terlambat', activeClass: 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' },
                        { key: 'SAKIT', label: 'Sakit', activeClass: 'bg-blue-600 text-white font-extrabold shadow-sm' },
                        { key: 'IZIN', label: 'Izin', activeClass: 'bg-purple-600 text-white font-extrabold shadow-sm' },
                        { key: 'ALPA', label: 'Alpa', activeClass: 'bg-rose-600 text-white font-extrabold shadow-sm' },
                      ].map((st) => {
                        const isSelected = siswa.status === st.key;
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => handleStatusChange(siswa.id, st.key)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none",
                              isSelected
                                ? cn(st.activeClass, "border-transparent")
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
                            )}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jurnal Mengajar & Catatan Pembelajaran Section */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                Jurnal Mengajar &amp; Catatan Pembelajaran
              </label>
              <textarea
                rows={3}
                value={jurnalMateri}
                onChange={(e) => setJurnalMateri(e.target.value)}
                placeholder="Tuliskan materi pembelajaran hari ini..."
                className="w-full p-4 rounded-2xl border border-slate-800 bg-slate-950/90 text-white text-xs font-medium focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
              />

              <Button
                type="button"
                onClick={() => toast.success('Jurnal & Data Presensi berhasil disimpan!')}
                className="h-10 px-5 rounded-2xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/30 transition-all"
              >
                <FileText size={15} />
                <span>Simpan Jurnal &amp; Presensi</span>
              </Button>
            </div>
          </motion.div>
        )}

        {/* 👥 TAB 3: WALI KELAS (Adopsi Layout Mockup Wali Kelas) */}
        {activeTab === 'binaan' && (
          <motion.div
            key="tab-binaan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-5 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6"
          >
            {/* Header Title */}
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Validasi Surat Izin Orang Tua Siswa (Rombel {waliKelasNama || 'XI RPL 1'})
              </h2>
            </div>

            {/* List of Permit Validation Cards */}
            <div className="space-y-4">
              {/* Permit Item 1 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Elvina Nurul Zahra
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Orang Tua: Ahmad Dahlan • Jenis: Sakit
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 self-start sm:self-auto">
                    Disetujui Wali Kelas
                  </span>
                </div>

                {/* Description Box */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <p className="text-xs font-medium italic text-slate-300">
                    "Demam tinggi dan flu berat, saran dokter istirahat total 2 hari."
                  </p>
                </div>

                {/* Attachment Thumbnail */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                    <img 
                      src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=100&auto=format&fit=crop&q=80" 
                      alt="Surat Dokter" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toast('Membuka lampiran surat dokter...', { icon: '📄' })}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    Lihat Lampiran Surat Dokter
                  </button>
                </div>
              </div>

              {/* Permit Item 2 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Bagas Prasetyo
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Orang Tua: Eko Prasetyo • Jenis: Pulang Cepat
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 self-start sm:self-auto">
                    Menunggu Persetujuan
                  </span>
                </div>

                {/* Description Box */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                  <p className="text-xs font-medium italic text-slate-300">
                    "Mengikuti seleksi tim sepakbola daerah jam 11.00 WIB"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => toast.error('Surat izin ditolak.')}
                    className="h-8.5 px-4 rounded-xl text-xs font-extrabold bg-white hover:bg-slate-100 text-rose-600 border-none cursor-pointer"
                  >
                    Tolak
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => toast.success('Surat izin disetujui Wali Kelas!')}
                    className="h-8.5 px-4 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-none shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    Setujui Surat Izin
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 👤 TAB 5: PROFIL GURU (Adopsi Presisi Layout Profil Siswa) */}
        {activeTab === 'profil' && (
          <motion.div
            key="tab-profil"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5 sm:space-y-6"
          >
            {/* 1. TOP ROW: 2 COLUMNS (Avatar Card & Account Settings Card) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              
              {/* Left Column (Avatar & Quick Info Card) - 4 cols on lg */}
              <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 text-center sm:text-left">
                <div className="space-y-4">
                  {/* Photo Avatar Frame */}
                  <div className="relative w-28 h-28 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 p-1 shadow-md flex items-center justify-center font-black text-3xl text-emerald-600 dark:text-emerald-400">
                    {teacherInitials}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white shadow-sm">
                      <Check size={12} strokeWidth={4} />
                    </span>
                  </div>

                  {/* Teacher Name & Status Pill */}
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {user?.full_name || user?.name || 'Drs. Budi Santoso, M.Pd'}
                    </h3>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Guru Aktif — {waliKelasNama || 'Wali Kelas XI RPL 1'}
                    </span>
                  </div>

                  {/* Quick Detail Key-Value List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">NIP</span>
                      <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{nipText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">NIK</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">3273101508050002</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Mata Pelajaran</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">Pemrograman Web</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Tugas Tambahan</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Wali Kelas</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Full-Width QR Card Digital Button */}
                <Button
                  type="button"
                  onClick={() => toast('Membuka QR Card Digital Guru...', { icon: '💳' })}
                  className="w-full h-10 rounded-2xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <QrCode size={16} />
                  <span>Lihat QR Card Digital</span>
                </Button>
              </div>

              {/* Right Column (Pengaturan Akun & Ganti Password Card) - 8 cols on lg */}
              <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Header Title with Edit Icon */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Edit3 size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                          Pengaturan Akun &amp; Ganti Password
                        </h3>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400">
                        Perbarui data diri guru atau ganti kata sandi portal
                      </p>
                    </div>
                  </div>

                  {/* Input Fields Grid */}
                  <form onSubmit={(e) => { e.preventDefault(); toast.success('Perubahan akun berhasil disimpan!'); }} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          Nomor Telepon WhatsApp Guru
                        </label>
                        <input
                          type="text"
                          defaultValue="6287779937341"
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                          Email Pembelajaran
                        </label>
                        <input
                          type="email"
                          defaultValue={user?.email || 'guru.budi@absenta.sch.id'}
                          className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        <Key size={14} className="text-amber-500" />
                        <span>GANTI KATA SANDI</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            Password Lama
                          </label>
                          <input
                            type="password"
                            placeholder="********"
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            Password Baru
                          </label>
                          <input
                            type="password"
                            placeholder="********"
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-xs font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="h-10 px-6 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        Simpan Perubahan
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* 2. BOTTOM ROW: 4 GRID CARDS (DATA PRIBADI, ORGANISASI/JABATAN, KONTAK & ALAMAT, SERTIFIKASI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Card 1: DATA PRIBADI */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      DATA PRIBADI
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit data pribadi...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Jenis Kelamin</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Laki-laki</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Agama</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Islam</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Tempat Lahir</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Bandung</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Tanggal Lahir</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">12 April 1978</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Email</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">budi.santoso@absenta.sch.id</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Pendidikan Terakhir</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">S2 Pendidikan Komputer</span>
                  </div>
                </div>
              </div>

              {/* Card 2: ORGANISASI & JABATAN */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      JABATAN DAN TUGAS TAMBAHAN
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit tugas tambahan...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Status Kepegawaian</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">PNS / Guru Tetap</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Golongan / Pangkat</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">IV/a - Pembina</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Tugas Utama</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Guru Pemrograman Web</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Wali Kelas</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{waliKelasNama || 'XI RPL 1'}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: KONTAK & ALAMAT */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      KONTAK &amp; ALAMAT
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit kontak...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Nomor Telepon</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">6287779937341</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Alamat Rumah</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Jl. Soekarno Hatta No. 456, Bandung</span>
                  </div>
                </div>
              </div>

              {/* Card 4: SERTIFIKASI & MASA KERJA */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      SERTIFIKASI &amp; MASA KERJA
                    </h3>
                  </div>
                  <button type="button" onClick={() => toast('Edit sertifikasi...', { icon: '✏️' })} className="text-slate-400 hover:text-emerald-600 cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Sertifikasi Guru</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Pendidik Profesional (Lulus SERTIFIKASI)</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block">Masa Kerja Pegawai</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">16 Tahun 5 Bulan</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 📋 TAB 4: PIKET HARIAN (Modul PiketOperations Langsung Ditanam) */}
        {activeTab === 'kelola' && (
          <motion.div
            key="tab-kelola"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <PiketOperations
              dailyPermits={dailyPermits || []}
              fetchPermits={refetchPermits}
              tenantInfo={tenantInfo}
              user={user}
              setPrintedPermit={setPrintedPermit}
              printPaperSize={printPaperSize}
              setPrintPaperSize={setPrintPaperSize}
              personaMode="UTAMA"
            />

            {/* Print Slip Portal Overlay ketika printedPermit terisi */}
            {printedPermit && (
              <PiketPrintSlip
                printedPermit={printedPermit}
                setPrintedPermit={setPrintedPermit}
                printPaperSize={printPaperSize}
                tenantInfo={tenantInfo}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (lg:hidden)                     */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center shadow-xl">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isTabActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1 min-w-0",
                isTabActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isTabActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-transparent"
              )}>
                <TabIcon size={18} />
              </div>
              <span className="truncate max-w-[64px] font-extrabold">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
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
