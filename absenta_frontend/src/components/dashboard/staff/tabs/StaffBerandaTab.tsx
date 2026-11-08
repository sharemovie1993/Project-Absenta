import React, { useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  ClipboardList, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Loader, 
  GraduationCap,
  FileEdit,
  FileText,
  Radio,
  BarChart2,
  CheckSquare,
  Award,
  Eye,
  MapPin,
  Lock,
  LayoutDashboard,
  Laptop,
  Rocket,
} from 'lucide-react';
import { 
  UniversalMobileSubtabSidebar, 
  useMobileSubtabSidebar,
  UniversalEcosystemTopbar,
  type UniversalSubtabItem 
} from '@/components/dashboard/roles/common';
import { useCbtOperationMode } from '@/components/cbt/cbtModeHelper';
import { useQuery } from '@tanstack/react-query';
import { piketApi } from '../../../../api/piket.api';
import { kurikulumApi } from '../../../../api/kurikulum.api';
import { getRekapBulananGuruMe } from '../../../../api/attendance/rekap.api';
import { getMyActionHub } from '../../../../api/dashboard.api';
import { TimelineItem } from './StaffKbmAbsenTab';
import { StaffWeeklyScheduleWidget } from '../../widgets/StaffWeeklyScheduleWidget';
import { BebanMengajarWidget } from '../widgets/BebanMengajarWidget';
import { PengajuanIzinGuruModal } from '../profil/PengajuanIzinGuruModal';
import { useTenant } from '../../../../hooks/useTenant';
import { toLocalDate, formatLocalTimeFromISO } from '../../../../utils/attendance/time';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';
import { useMobileAccountSheetStore } from '@/store/mobileAccountSheetStore';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';
import { HubCard, HubActionGrid, type HubActionItem } from '@/components/ui/hub';

// Subkomponen High-Density Beranda
import { TeacherDailyStatusStrip } from '../beranda/TeacherDailyStatusStrip';
import { TeacherOpsMicroGrid } from '../beranda/TeacherOpsMicroGrid';
import { TeacherActionHubWidget } from '../beranda/TeacherActionHubWidget';
import { TeacherSidebarNav } from '../beranda/TeacherSidebarNav';
import { TeacherSubTabId } from '../beranda/TeacherSubNavPills';
import { DirectKbmFeed } from '../beranda/DirectKbmFeed';
import { TeacherBukuNilaiSubTab } from '../beranda/TeacherBukuNilaiSubTab';
import { TeacherRadarRemedialSubTab } from '../beranda/TeacherRadarRemedialSubTab';
import { raporApi } from '@/api/rapor.api';
import { hubinApi } from '@/api/hubin.api';
import { cbtApi } from '@/api/cbt.api';

// Universal Role-Ready Views (In-Place Sub-Tab)
const PerangkatAjarView = lazy(() =>
  import('@/components/kurikulum/perangkat-ajar/PerangkatAjarView').then((m) => ({ default: m.PerangkatAjarView }))
);
const SupervisiAkademikView = lazy(() =>
  import('@/components/kurikulum/supervisi/SupervisiAkademikView').then((m) => ({ default: m.SupervisiAkademikView }))
);
const StaffRekapMapelTab = lazy(() =>
  import('./StaffRekapMapelTab').then((m) => ({ default: m.StaffRekapMapelTab }))
);
const NilaiPklView = lazy(() =>
  import('@/components/hubin/nilai-pkl/NilaiPklView').then((m) => ({ default: m.NilaiPklView }))
);
const CbtBankSoalView = lazy(() =>
  import('@/components/cbt/bank-soal/CbtBankSoalView').then((m) => ({ default: m.CbtBankSoalView }))
);
const CbtJadwalView = lazy(() =>
  import('@/components/cbt/jadwal/CbtJadwalView').then((m) => ({ default: m.CbtJadwalView }))
);
const CbtProctorMonitoringView = lazy(() =>
  import('@/components/cbt/sesi/CbtProctorMonitoringView').then((m) => ({ default: m.CbtProctorMonitoringView }))
);

// Lazy load GateInputModule untuk satpam
const GateInputModule = lazy(() =>
  import('../../../../pages/attendance/ops/components/GateInputModule').then((m) => ({ default: m.GateInputModule }))
);

interface StaffBerandaTabProps {
  user?: any;
  guruId?: string;
  guruNama?: string;
  waliKelasNama?: string;
  waliKelasId?: string;
  isWaliKelas?: boolean;
  isPembimbingPkl?: boolean;
  isKaprog?: boolean;
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
  hasGerbangDuty?: boolean;
  isPureGerbang?: boolean;
  isPendidik?: boolean;
  timelineItems?: TimelineItem[];
  onNavigateTab: (tabId: string) => void;
  onOpenAttendance?: (sesi: any) => void;
  onOpenJournal?: (sesi: any) => void;
}

export const StaffBerandaTab: React.FC<StaffBerandaTabProps> = React.memo(({
  user,
  guruId,
  guruNama,
  waliKelasNama,
  waliKelasId,
  isWaliKelas = false,
  isPembimbingPkl = false,
  isKaprog = false,
  kaprogJurusan,
  hasGerbangDuty = false,
  isPureGerbang = false,
  isPendidik = true,
  timelineItems = [],
  onNavigateTab,
  onOpenAttendance,
  onOpenJournal,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantId } = useTenant();
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [teacherCbtMode, setTeacherCbtMode] = useState<'bank' | 'sesi'>('bank');
  const { isOrkestrasi, eventName } = useCbtOperationMode();

  // User Profil & Avatar Data untuk Mobile Topbar Header
  const rawPhoto = user?.profile_photo_url || (user as any)?.avatar || (user?.guru_profile as any)?.foto_url;
  const userPhoto = rawPhoto ? resolveProfilePhotoUrl(rawPhoto) : null;
  const initialChar = (user?.full_name || guruNama || (user as any)?.name || 'G').slice(0, 1).toUpperCase();
  const displayName = guruNama || user?.full_name || (user as any)?.name || 'Bapak/Ibu Guru';

  // Status apakah guru merupakan pendidik pengajar aktif
  const isActualTeachingStaff = isPendidik && !isPureGerbang && !hasGerbangDuty;

  // Sub-tab Navigation State via Search Params (DRY & Direct-Linkable)
  const subTabParam = (searchParams.get('subtab') as TeacherSubTabId) || 'agenda';

  const handleSubTabChange = useCallback((newSubTab: TeacherSubTabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newSubTab === 'agenda') {
        next.delete('subtab');
      } else {
        next.set('subtab', newSubTab);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Mobile Subtab Sidebar Drawer State (Terkoneksi ke FAB / Tombol Elevasi Tengah Menu)
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, openMobileSidebar } = useMobileSubtabSidebar('portal');

  // Presensi Kehadiran Guru Bulan Ini
  const { data: rekapGuruRes, isLoading: loadingRekap } = useQuery({
    queryKey: ['attendance-rekap-guru-me-bulanan'],
    queryFn: () => getRekapBulananGuruMe().catch(() => ({ success: true, data: null })),
    staleTime: 5 * 60 * 1000,
  });

  const rekapStats = rekapGuruRes?.data?.statistik || {
    HADIR: 0,
    TERLAMBAT: 0,
    DISPEN: 0,
    IZIN: 0,
    SAKIT: 0,
    JAM_MASUK: null,
  };

  // Query Beban Mengajar Guru (KBM JP & Ekuivalensi)
  const { data: bebanGuruRes, isLoading: loadingBeban } = useQuery({
    queryKey: ['kurikulum-beban-guru-all'],
    queryFn: () => kurikulumApi.getBebanMengajar().catch(() => ({ success: true, data: [] })),
    enabled: isActualTeachingStaff,
    staleTime: 5 * 60 * 1000,
  });

  // Query Perangkat Ajar Guru Sendiri (Untuk Notification Badges di Sidebar)
  const { data: myPerangkatRes } = useQuery({
    queryKey: ['my-perangkat-workspace', guruId],
    queryFn: () => kurikulumApi.getPerangkatAjar({ guru_id: guruId }).catch(() => ({ success: true, data: [] })),
    enabled: Boolean(guruId) && isActualTeachingStaff,
    staleTime: 60 * 1000,
  });

  const perangkatList = safeArr<any>(myPerangkatRes?.data || myPerangkatRes);
  const rejectedPerangkatCount = perangkatList.filter((p: any) => p.status?.toUpperCase() === 'REJECTED').length;

  // Pusat Tindakan & Peringatan Terpadu Guru (Cross-Divisional Action Hub)
  const { data: actionHubRes, isLoading: loadingActionHub } = useQuery({
    queryKey: ['my-action-hub-dashboard'],
    queryFn: () => getMyActionHub().catch(() => ({ success: true, data: { summary: { total: 0, critical: 0, today: 0, upcoming: 0 }, actions: [] } })),
    enabled: isActualTeachingStaff,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const actionHubData = actionHubRes?.data || { summary: { total: 0, critical: 0, today: 0, upcoming: 0 }, actions: [] };

  // Query Radar Remedial (Untuk alert badge di sidebar - khusus menghitung siswa yang perlu remedial)
  const { data: radarRes } = useQuery({
    queryKey: ['rapor-radar-remedial-badge', guruId],
    queryFn: () => raporApi.getRadarRemedial({ guru_id: guruId }).catch(() => ({ success: true, data: null })),
    enabled: isActualTeachingStaff,
    staleTime: 60 * 1000,
  });

  const remedialCount = radarRes?.data?.stats?.total_perlu_remedial || 0;

  // ── Query Adaptif: Guru Sebagai Penguji Sidang PKL ──
  const effectiveGuruId = guruId || user?.guru_profile?.id || user?.id;
  const { data: mySidangData } = useQuery({
    queryKey: ['my-penguji-sidang-students', effectiveGuruId],
    queryFn: async () => {
      if (!effectiveGuruId) return [];
      const res = await hubinApi.getRekapPklSiswa({
        status: 'ELIGIBLE',
      }).catch(() => null);
      const list: any[] = Array.isArray(res) ? res : res?.data?.list || res?.data || [];
      return list.filter((item: any) => {
        const pId = item.nilai_json?.penguji_id;
        // KETAT: Sub-tab Sidang PKL HANYA muncul untuk guru yang BENAR-BENAR terdaftar di ploting penguji (penguji_id).
        // Tidak boleh ada fallback ke pembimbing penempatan PKL maupun pencocokan nama tekstual longgar.
        return Boolean(pId && pId === effectiveGuruId);
      });
    },
    enabled: Boolean(effectiveGuruId) && isActualTeachingStaff,
    staleTime: 60 * 1000,
  });

  const isPengujiSidang = (mySidangData?.length ?? 0) > 0;
  const pengujiSidangUnexaminedCount = useMemo(() => {
    if (!mySidangData) return 0;
    return mySidangData.filter((item: any) => {
      const n = item.nilai_json?.nilai_sidang;
      return n === null || n === undefined || n === '' || Number(n) === 0;
    }).length;
  }, [mySidangData]);

  // ── Query Adaptif: Guru Sebagai Pengawas Ruang / Proktor Ujian CBT ──
  const { data: myPengawasCbtData } = useQuery({
    queryKey: ['my-pengawas-cbt-schedules', effectiveGuruId],
    queryFn: async () => {
      if (!effectiveGuruId) return [];
      const res = await cbtApi.getJadwalList({ limit: 50, guru_id: effectiveGuruId }).catch(() => null);
      const list = res?.items || [];
      return list.filter((item) => {
        const cfg = item.setting_keamanan;
        // KETAT: Sub-tab Pengawas Ujian CBT HANYA muncul jika guru BENAR-BENAR terdaftar di ploting pengawas/proktor
        return Boolean(
          cfg &&
            (cfg.pengawas_1_id === effectiveGuruId ||
              cfg.pengawas_2_id === effectiveGuruId ||
              cfg.proktor_id === effectiveGuruId)
        );
      });
    },
    enabled: Boolean(effectiveGuruId) && isActualTeachingStaff,
    staleTime: 30 * 1000,
  });

  const isPengawasCbt = (myPengawasCbtData?.length ?? 0) > 0;
  const pengawasCbtActiveCount = useMemo(() => {
    if (!myPengawasCbtData) return 0;
    const activeOrDraft = myPengawasCbtData.filter(
      (j) => j.status === 'ACTIVE' || j.status === 'DRAFT' || j.status === 'PAUSED'
    ).length;
    return activeOrDraft > 0 ? activeOrDraft : myPengawasCbtData.length;
  }, [myPengawasCbtData]);

  const validSubTabs: TeacherSubTabId[] = useMemo(() => [
    'agenda',
    'tugas',
    'perangkat',
    'cbt',
    'nilai',
    'remedial',
    'rekap',
    'supervisi',
    ...(isPengawasCbt ? ['pengawas_cbt' as const] : []),
    ...(isPengujiSidang ? ['sidang_guru' as const] : []),
  ], [isPengawasCbt, isPengujiSidang]);

  const [selectedPengawasJadwalId, setSelectedPengawasJadwalId] = useState<string | undefined>(undefined);

  const activeSubTab = validSubTabs.includes(subTabParam) ? subTabParam : 'agenda';

  // Resolusi Judul & Icon Subtab untuk Universal Ecosystem Topbar
  const { currentSubtabTitle, currentSubtabIcon } = useMemo(() => {
    switch (activeSubTab) {
      case 'agenda':
        return {
          currentSubtabTitle: guruNama ? `Halo, ${guruNama}` : 'Beranda Pendidik',
          currentSubtabIcon: LayoutDashboard,
        };
      case 'tugas':
        return {
          currentSubtabTitle: 'Pusat Tugas & Peringatan',
          currentSubtabIcon: CheckSquare,
        };
      case 'perangkat':
        return {
          currentSubtabTitle: 'Perangkat Ajar Saya',
          currentSubtabIcon: FileText,
        };
      case 'cbt':
        return {
          currentSubtabTitle: 'Bank Soal CBT',
          currentSubtabIcon: Laptop,
        };
      case 'pengawas_cbt':
        return {
          currentSubtabTitle: 'Pengawas Ujian CBT',
          currentSubtabIcon: Eye,
        };
      case 'sidang_guru':
        return {
          currentSubtabTitle: 'Penguji Sidang PKL',
          currentSubtabIcon: Award,
        };
      case 'nilai':
        return {
          currentSubtabTitle: 'Buku Nilai Guru',
          currentSubtabIcon: GraduationCap,
        };
      case 'remedial':
        return {
          currentSubtabTitle: 'Radar Remedial Siswa',
          currentSubtabIcon: Radio,
        };
      case 'rekap':
        return {
          currentSubtabTitle: 'Rekap Jurnal & Absensi',
          currentSubtabIcon: BarChart2,
        };
      case 'supervisi':
        return {
          currentSubtabTitle: 'Supervisi Akademik',
          currentSubtabIcon: Award,
        };
      default:
        return {
          currentSubtabTitle: 'Ruang Pendidik',
          currentSubtabIcon: BookOpen,
        };
    }
  }, [activeSubTab, guruNama]);

  const teacherBeban = useMemo(() => {
    const list = Array.isArray(bebanGuruRes?.data)
      ? bebanGuruRes.data
      : Array.isArray(bebanGuruRes)
      ? bebanGuruRes
      : [];
    if (!list.length) return null;
    return list.find((b: any) =>
      (guruId && b.id === guruId) ||
      (guruNama && b.nama_guru?.toLowerCase().trim() === guruNama.toLowerCase().trim())
    );
  }, [bebanGuruRes, guruId, guruNama]);

  // Kalkulasi JP Mengajar Hari Ini
  const { totalJp, totalMinutes } = useMemo(() => {
    let jpCount = 0;
    let minutes = 0;

    timelineItems.forEach((item) => {
      const slots = (item.slot_selesai && item.slot_mulai) 
        ? (item.slot_selesai - item.slot_mulai + 1) 
        : 2;
      jpCount += slots;

      if (item.jam_mulai && item.jam_selesai) {
        const [hMulai, mMulai] = item.jam_mulai.split(':').map(Number);
        const [hSelesai, mSelesai] = item.jam_selesai.split(':').map(Number);
        const duration = (hSelesai * 60 + mSelesai) - (hMulai * 60 + mMulai);
        if (duration > 0) minutes += duration;
      }
    });

    return {
      totalJp: jpCount,
      totalMinutes: minutes > 0 ? minutes : jpCount * 45
    };
  }, [timelineItems]);

  // Active & Next KBM Session
  const activeKbm = useMemo(() => {
    return timelineItems.find((i) => i.isLive && !i.isFinished);
  }, [timelineItems]);

  const nextKbm = useMemo(() => {
    return timelineItems.find((i) => !i.isLive && !i.isFinished);
  }, [timelineItems]);

  const isAllFinished = useMemo(() => {
    return timelineItems.length > 0 && timelineItems.every((i) => i.isFinished);
  }, [timelineItems]);

  // Hutang Jurnal KBM (Sesi yang selesai tapi belum ada jurnal)
  const unfilledJournalsCount = useMemo(() => {
    return timelineItems.filter((i) => i.isFinished && !i.session?.jurnal_kbm).length;
  }, [timelineItems]);

  // Fallback handler jika modal dihandle langsung oleh komponen
  const handleOpenAttendance = useCallback((item: TimelineItem) => {
    if (onOpenAttendance) {
      onOpenAttendance(item.session || { id: item.id, kelas_nama: item.kelas_nama, kegiatan: item.kegiatan });
    } else {
      navigate('/attendance/ops?tab=sesi');
    }
  }, [onOpenAttendance, navigate]);

  const handleOpenJournal = useCallback((item: TimelineItem) => {
    if (onOpenJournal) {
      onOpenJournal(item);
    } else {
      navigate('/kurikulum/jurnal');
    }
  }, [onOpenJournal, navigate]);

  // Pintasan Aksi Operasional Guru (Shopee-Grade Headerless Quick Action Slider)
  const teacherQuickActions: HubActionItem[] = useMemo(() => [
    {
      id: 'jurnal',
      label: 'Isi Jurnal KBM',
      icon: FileEdit,
      iconColorClass: unfilledJournalsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
      badge: unfilledJournalsCount > 0 ? unfilledJournalsCount : undefined,
      onClick: () => {
        const targetSession = timelineItems.find((i: any) => !i.isFinished || !i.session?.jurnal_kbm) || timelineItems[0];
        if (targetSession) {
          handleOpenJournal(targetSession);
        } else {
          navigate('/kurikulum/jurnal');
        }
      },
    },
    {
      id: 'perangkat',
      label: 'Perangkat Ajar',
      icon: FileText,
      iconColorClass: 'text-teal-600 dark:text-teal-400',
      badge: rejectedPerangkatCount > 0 ? rejectedPerangkatCount : undefined,
      onClick: () => handleSubTabChange('perangkat'),
    },
    {
      id: 'nilai',
      label: 'Buku Nilai',
      icon: GraduationCap,
      iconColorClass: 'text-blue-600 dark:text-blue-400',
      onClick: () => handleSubTabChange('nilai'),
    },
    {
      id: 'remedial',
      label: 'Radar Remedial',
      icon: Radio,
      iconColorClass: 'text-rose-600 dark:text-rose-400',
      badge: remedialCount > 0 ? remedialCount : undefined,
      onClick: () => handleSubTabChange('remedial'),
    },
    {
      id: 'rekap',
      label: 'Rekap Mapel',
      icon: BarChart2,
      iconColorClass: 'text-indigo-600 dark:text-indigo-400',
      onClick: () => handleSubTabChange('rekap'),
    },
    {
      id: 'supervisi',
      label: 'Supervisi Saya',
      icon: ShieldCheck,
      iconColorClass: 'text-purple-600 dark:text-purple-400',
      onClick: () => handleSubTabChange('supervisi'),
    },
    {
      id: 'tugas',
      label: 'Tugas Saya',
      icon: CheckSquare,
      iconColorClass: 'text-amber-600 dark:text-amber-400',
      badge: (actionHubData.summary?.total || 0) > 0 ? actionHubData.summary?.total : undefined,
      onClick: () => handleSubTabChange('tugas'),
    },
    ...(isPengawasCbt ? [
      {
        id: 'pengawas_cbt',
        label: 'Pengawas CBT',
        icon: Eye,
        iconColorClass: 'text-emerald-600 dark:text-emerald-400',
        badge: pengawasCbtActiveCount > 0 ? pengawasCbtActiveCount : undefined,
        onClick: () => handleSubTabChange('pengawas_cbt'),
      }
    ] : []),
    ...(isPengujiSidang ? [
      {
        id: 'sidang_guru',
        label: 'Sidang PKL',
        icon: Award,
        iconColorClass: 'text-amber-600 dark:text-amber-400',
        badge: pengujiSidangUnexaminedCount > 0 ? pengujiSidangUnexaminedCount : undefined,
        onClick: () => handleSubTabChange('sidang_guru'),
      }
    ] : []),
  ], [
    unfilledJournalsCount,
    timelineItems,
    handleOpenJournal,
    navigate,
    rejectedPerangkatCount,
    remedialCount,
    actionHubData.summary?.total,
    isPengawasCbt,
    pengawasCbtActiveCount,
    isPengujiSidang,
    pengujiSidangUnexaminedCount,
    handleSubTabChange,
  ]);

  // ── Navigasi Subtab Standar Universal Mobile Subtab Sidebar (Shopee-Grade Drawer) ──
  const navTabs: UniversalSubtabItem[] = useMemo(() => [
    {
      id: 'agenda',
      label: 'Ringkasan',
      shortLabel: 'Ringkasan',
      icon: LayoutDashboard,
      badge: unfilledJournalsCount > 0 ? unfilledJournalsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      category: 'pembelajaran',
    },
    {
      id: 'tugas',
      label: 'Tugas',
      shortLabel: 'Tugas',
      icon: CheckSquare,
      badge: (actionHubData.summary?.total || 0) > 0 ? actionHubData.summary?.total : undefined,
      badgeColor: (actionHubData.summary?.critical || 0) > 0 ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white',
      category: 'pembelajaran',
    },
    {
      id: 'perangkat',
      label: 'Perangkat',
      shortLabel: 'Perangkat',
      icon: FileText,
      badge: rejectedPerangkatCount > 0 ? rejectedPerangkatCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      category: 'pembelajaran',
    },
    {
      id: 'cbt',
      label: 'CBT',
      shortLabel: 'CBT',
      icon: Laptop,
      category: 'pembelajaran',
    },
    ...(isPengawasCbt ? [
      {
        id: 'pengawas_cbt',
        label: 'Pengawas',
        shortLabel: 'Pengawas',
        icon: Eye,
        badge: pengawasCbtActiveCount > 0 ? pengawasCbtActiveCount : undefined,
        badgeColor: 'bg-emerald-500 text-white',
        category: 'pembelajaran',
      }
    ] : []),
    {
      id: 'nilai',
      label: 'Nilai',
      shortLabel: 'Nilai',
      icon: GraduationCap,
      category: 'evaluasi',
    },
    {
      id: 'remedial',
      label: 'Remedial',
      shortLabel: 'Remedial',
      icon: Radio,
      badge: remedialCount > 0 ? remedialCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      category: 'evaluasi',
    },
    {
      id: 'rekap',
      label: 'Rekap',
      shortLabel: 'Rekap',
      icon: BarChart2,
      category: 'evaluasi',
    },
    {
      id: 'supervisi',
      label: 'Supervisi',
      shortLabel: 'Supervisi',
      icon: ShieldCheck,
      category: 'evaluasi',
    },
    ...(isPengujiSidang ? [
      {
        id: 'sidang_guru',
        label: 'Sidang',
        shortLabel: 'Sidang',
        icon: Award,
        badge: pengujiSidangUnexaminedCount > 0 ? pengujiSidangUnexaminedCount : undefined,
        badgeColor: 'bg-amber-500 text-white',
        category: 'evaluasi',
      }
    ] : []),
  ], [
    unfilledJournalsCount,
    actionHubData.summary?.total,
    actionHubData.summary?.critical,
    rejectedPerangkatCount,
    isPengawasCbt,
    pengawasCbtActiveCount,
    remedialCount,
    isPengujiSidang,
    pengujiSidangUnexaminedCount,
  ]);

  const navCategories = useMemo(() => [
    { id: 'pembelajaran', label: 'Operasional KBM' },
    { id: 'evaluasi', label: 'Penilaian & Supervisi' },
  ], []);

  return (
    <motion.div
      key="tab-ringkasan-kbm-integrated"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="max-w-full"
    >
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2-COLUMN LAYOUT ALA KAPROG / KURIKULUM (Left Sidebar + Right Main)  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isActualTeachingStaff ? (
        <div className="w-full max-w-full min-w-0">
          {/* Dedicated Universal Mobile Subtab Sidebar Drawer */}
          <UniversalMobileSubtabSidebar
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            title={guruNama || 'Ruang Pendidik'}
            subtitle={`Beban Mengajar ${(teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0)}/${(teacherBeban?.max_jp ?? 24)} JP`}
            roleBadge="GURU PENGAJAR"
            scope="portal"
            roleIcon={BookOpen}
            tabs={navTabs}
            activeTab={activeSubTab}
            onSelectTab={(tabId) => handleSubTabChange(tabId as TeacherSubTabId)}
            categories={navCategories}
          />

          {/* ── 1. UNIVERSAL ECOSYSTEM TOPBAR (Standar Industri Absenta: Ruang Pendidik) ── */}
          <UniversalEcosystemTopbar
            ecosystem="portal"
            title={currentSubtabTitle}
            icon={currentSubtabIcon}
            hideBack={activeSubTab === 'agenda'}
            onBack={() => handleSubTabChange('agenda')}
            className="lg:hidden"
            actions={
              <button
                type="button"
                onClick={() => handleSubTabChange('tugas')}
                className={cn(
                  'relative p-1.5 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0',
                  activeSubTab === 'tugas'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25'
                )}
                title="Pusat Tugas & Peringatan Saya"
                aria-label="Pusat Tugas & Peringatan Saya"
              >
                <ClipboardList size={15} />
                {(actionHubData.summary?.total || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-1 ring-white animate-pulse leading-none">
                    {(actionHubData.summary?.total || 0) > 99 ? '99+' : actionHubData.summary?.total}
                  </span>
                )}
              </button>
            }
          />

          {/* 2. Desktop 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-5 items-start">
            {/* Kolom Kiri: Sidebar Sub-Menu Guru (Desktop sticky, tersembunyi di mobile) */}
            <aside className="hidden lg:block space-y-3 sticky top-20">
              <TeacherSidebarNav
                activeSubTab={activeSubTab}
                onChangeSubTab={handleSubTabChange}
                guruNama={guruNama}
                perangkatRejectedCount={rejectedPerangkatCount}
                unfilledJournalsCount={unfilledJournalsCount}
                actionHubTotalCount={actionHubData.summary?.total || 0}
                actionHubCriticalCount={actionHubData.summary?.critical || 0}
                remedialAlertCount={remedialCount}
                totalJp={totalJp}
                currentBebanJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
                targetBebanJp={teacherBeban?.max_jp ?? 24}
                isPengujiSidang={isPengujiSidang}
                pengujiSidangUnexaminedCount={pengujiSidangUnexaminedCount}
                isPengawasCbt={isPengawasCbt}
                pengawasCbtActiveCount={pengawasCbtActiveCount}
              />
            </aside>

          {/* Kolom Kanan: Main Content Canvas */}
          <main className="min-w-0 space-y-4">
            {/* Desktop Subtab Header (Ketika guru membuka subtab non-agenda di Desktop) */}
            {activeSubTab !== 'agenda' && (
              <div className="hidden lg:flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubTabChange('agenda')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                    title="Kembali ke Beranda Pendidik"
                  >
                    <ArrowLeft size={16} />
                    <span>Kembali</span>
                  </button>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      Ruang Pendidik • Sub-Modul
                    </span>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {currentSubtabTitle}
                    </h1>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 1: RINGKASAN & BERANDA PENDIDIK */}
            {activeSubTab === 'agenda' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Daily Status Strip */}
                <TeacherDailyStatusStrip
                  activeKbm={activeKbm}
                  nextKbm={nextKbm}
                  isAllFinished={isAllFinished}
                  totalJp={totalJp}
                  totalMinutes={totalMinutes}
                  guruTapTime={(rekapStats as any)?.JAM_MASUK || null}
                  isGuruHadir={Boolean(rekapStats.HADIR > 0 || (rekapStats as any)?.JAM_MASUK)}
                />

                {/* Operational Micro-Grid */}
                <TeacherOpsMicroGrid
                  totalJp={totalJp}
                  totalMinutes={totalMinutes}
                  unfilledJournalsCount={unfilledJournalsCount}
                  currentJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
                  targetJp={teacherBeban?.max_jp ?? 24}
                  onOpenSchedule={() => {}}
                  onOpenJournals={() => {}}
                  onOpenBeban={() => onNavigateTab('profil')}
                  onOpenRekapMapel={() => handleSubTabChange('rekap')}
                />

                {/* Pintasan Aksi Operasional Guru (Shopee-Grade Quick Action Slider) */}
                <HubCard bodyClassName="py-2.5 sm:py-3 px-2 sm:px-3">
                  <HubActionGrid items={teacherQuickActions} variant="slider" />
                </HubCard>

                {/* Direct KBM Execution Feed (Sesi Mengajar Langsung di Layar) */}
                <DirectKbmFeed
                  timelineItems={timelineItems}
                  onOpenAttendance={handleOpenAttendance}
                  onOpenJournal={handleOpenJournal}
                />

                {/* Desktop Wide View (Jadwal Mingguan & Beban Mengajar Luas) */}
                <div className="hidden md:block space-y-4 pt-2">
                  <StaffWeeklyScheduleWidget
                    guruId={guruId}
                    guruNama={guruNama}
                  />

                  <BebanMengajarWidget
                    currentJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
                    kbmJp={teacherBeban?.current_jp ?? 0}
                    ekuivalenJp={teacherBeban?.ekuivalen_position_jp ?? 0}
                    targetJp={teacherBeban?.max_jp ?? 24}
                    teacherName={guruNama}
                    positions={teacherBeban?.positions || []}
                    hadirBulanIni={rekapStats.HADIR || 0}
                    terlambatBulanIni={rekapStats.TERLAMBAT || 0}
                    dinasLuarBulanIni={rekapStats.DISPEN || 0}
                    izinBulanIni={(rekapStats.IZIN || 0) + (rekapStats.SAKIT || 0)}
                    isLoading={loadingBeban || loadingRekap}
                    onOpenAjukanIzin={() => setShowIzinModal(true)}
                  />
                </div>
              </div>
            )}

            {/* SUB-TAB TUGAS SAYA (Action Hub Full View: Langsung Menampilkan Bento Grid Tanpa Redudansi Judul) */}
            {activeSubTab === 'tugas' && (
              <div className="space-y-4">
                <TeacherActionHubWidget
                  hideHeader={true}
                  actions={actionHubData.actions || []}
                  summary={actionHubData.summary || { total: 0, critical: 0, today: 0, upcoming: 0 }}
                  isLoading={loadingActionHub}
                  onOpenJournal={handleOpenJournal}
                  onNavigateTab={onNavigateTab}
                />
              </div>
            )}

            {/* SUB-TAB 2: PERANGKAT AJAR SAYA (Universal Role-Ready View In-Place) */}
            {activeSubTab === 'perangkat' && (
              <Suspense
                fallback={
                  <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-emerald-600" size={32} />
                    <p className="text-xs text-slate-500 font-semibold">Memuat Meja Perangkat Ajar...</p>
                  </div>
                }
              >
                <PerangkatAjarView guruId={effectiveGuruId} hideLayout={true} roleContext="GURU" />
              </Suspense>
            )}

            {/* SUB-TAB CBT: FOKUS GURU MEMBUAT BANK SOAL, MENYUSUN BUTIR SOAL, & AKTIVASI SESI UJIAN */}
            {activeSubTab === 'cbt' && (
              <div className="space-y-4">
                {/* 2-Pill Modern Switcher: Bank Soal Saya vs Sesi Ujian Kelas Binaan */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setTeacherCbtMode('bank')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                      teacherCbtMode === 'bank'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <BookOpen size={14} />
                    <span>Bank Soal Saya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTeacherCbtMode('sesi')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                      teacherCbtMode === 'sesi'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    <Rocket size={14} />
                    <span>Sesi Ujian Kelas Binaan</span>
                  </button>
                </div>

                {teacherCbtMode === 'bank' ? (
                  <Suspense
                    fallback={
                      <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                        <Loader className="animate-spin text-indigo-600" size={32} />
                        <p className="text-xs text-slate-500 font-semibold">Memuat Bank Soal Guru...</p>
                      </div>
                    }
                  >
                    <CbtBankSoalView
                      guruId={effectiveGuruId}
                      hideLayout={true}
                      roleContext="GURU"
                      onScheduleSuccess={() => setTeacherCbtMode('sesi')}
                    />
                  </Suspense>
                ) : (
                  <Suspense
                    fallback={
                      <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                        <Loader className="animate-spin text-indigo-600" size={32} />
                        <p className="text-xs text-slate-500 font-semibold">Memuat Sesi Ujian Kelas Binaan...</p>
                      </div>
                    }
                  >
                    <CbtJadwalView
                      guruId={effectiveGuruId}
                      hideLayout={true}
                    />
                  </Suspense>
                )}
              </div>
            )}

            {/* SUB-TAB 3: BUKU NILAI & ASESMEN SISWA */}
            {activeSubTab === 'nilai' && (
              <TeacherBukuNilaiSubTab guruId={effectiveGuruId} guruNama={guruNama} />
            )}

            {/* SUB-TAB 4: RADAR REMEDIAL SISWA (EARLY DETECTION HUB) */}
            {activeSubTab === 'remedial' && (
              <TeacherRadarRemedialSubTab guruId={effectiveGuruId} />
            )}

            {/* SUB-TAB 4: REKAPITULASI PRESENSI MAPEL */}
            {activeSubTab === 'rekap' && (
              <Suspense
                fallback={
                  <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-indigo-600" size={32} />
                    <p className="text-xs text-slate-500 font-semibold">Memuat Rekapitulasi Mapel...</p>
                  </div>
                }
              >
                <StaffRekapMapelTab user={user} />
              </Suspense>
            )}

            {/* SUB-TAB 5: SUPERVISI AKADEMIK SAYA */}
            {activeSubTab === 'supervisi' && (
              <Suspense
                fallback={
                  <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-amber-600" size={32} />
                    <p className="text-xs text-slate-500 font-semibold">Memuat Catatan Supervisi Akademik...</p>
                  </div>
                }
              >
                <SupervisiAkademikView guruId={effectiveGuruId} hideLayout={true} readOnly={true} roleContext="GURU" />
              </Suspense>
            )}

            {/* SUB-TAB 6A: MEJA PENGAWAS & PROKTOR UJIAN CBT (FOKUS FUNGSI - ZERO NOISE) */}
            {activeSubTab === 'pengawas_cbt' && isPengawasCbt && (
              <div className="space-y-4 pb-20 sm:pb-8">
                <Suspense
                  fallback={
                    <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                      <Loader className="animate-spin text-emerald-600" size={32} />
                      <p className="text-xs text-slate-500 font-semibold">Memuat Layar Pengawas CBT...</p>
                    </div>
                  }
                >
                  <CbtProctorMonitoringView
                    initialJadwalId={selectedPengawasJadwalId || myPengawasCbtData?.[0]?.id}
                    guruId={effectiveGuruId}
                    myPengawasData={myPengawasCbtData}
                  />
                </Suspense>
              </div>
            )}

            {/* SUB-TAB 6B: MEJA PENGUJI SIDANG PKL (ADAPTIF - HANYA MUNCUL JIKA TERPLOTING) */}
            {activeSubTab === 'sidang_guru' && isPengujiSidang && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/70 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 relative">
                      <GraduationCap size={20} />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-200 animate-ping absolute -top-0.5 -right-0.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950 dark:text-amber-100 flex items-center gap-2">
                        <span>Meja Penguji Sidang PKL</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white animate-pulse">
                          TIM PENGUJI
                        </span>
                      </h4>
                      <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                        Menampilkan {mySidangData?.length ?? 0} siswa PKL yang diploting kepada Anda untuk dinilai sidang &amp; laporannya.
                      </p>
                    </div>
                  </div>
                  {pengujiSidangUnexaminedCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 shrink-0">
                      {pengujiSidangUnexaminedCount} Siswa Belum Dinilai
                    </span>
                  )}
                </div>

                <Suspense
                  fallback={
                    <div className="p-12 text-center text-xs text-slate-400">
                      <div className="animate-spin w-8 h-8 mx-auto text-indigo-600 mb-2 border-2 border-current border-t-transparent rounded-full" />
                      Memuat lembar penilaian sidang PKL...
                    </div>
                  }
                >
                  <NilaiPklView
                    initialTab="sidang"
                    pengujiGuruId={effectiveGuruId}
                    isPengujiOnly={true}
                    hideScopeBanner={true}
                    hideHeaderStats={true}
                    hideCetakRapor={true}
                    hideLocalFilters={true}
                    className="w-full"
                  />
                </Suspense>
              </div>
            )}
          </main>
        </div>
      </div>
    ) : (
        /* TERMINAL SCANNER (Khusus Staf Satpam / Gerbang Non-Guru) */
        <div className="space-y-4">
          <Suspense
            fallback={
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader className="animate-spin text-rose-600" size={36} />
              </div>
            }
          >
            <GateInputModule />
          </Suspense>
        </div>
      )}

      {/* Modal Pengajuan Izin Mandiri Guru */}
      {showIzinModal && (
        <PengajuanIzinGuruModal
          isOpen={showIzinModal}
          onClose={() => setShowIzinModal(false)}
        />
      )}
    </motion.div>
  );
});

StaffBerandaTab.displayName = 'StaffBerandaTab';
