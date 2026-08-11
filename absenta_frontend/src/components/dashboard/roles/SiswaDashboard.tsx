import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, UnconnectedBadge, renderApiValue } from '../../../components/ui';
import { SiswaPortalAppLauncher } from '../portal/SiswaPortalAppLauncher';
import { resolveSmartDashboardMode } from '../../../helpers/dashboardModeHelper';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { getRekapBulananSiswaMe, getRekapHarianSiswaMe, getRekapBulananKelasMe } from '../../../api/attendanceGerbang.api';
import { getMyJadwalKBM } from '../../../api/attendance/jadwalKBM.api';
import { toLocalDate, toLocalMonth, formatLocalTimeFromISO } from '../../../utils/attendance/time';
import { calculateStudentGamification } from '../../../utils/attendance/attendanceGamification.utils';
import { 
  CheckCircle2, 
  User, 
  QrCode, 
  CreditCard,
  Printer,
  Users, 
  Trophy, 
  Award,
  AlertTriangle, 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft,
  LayoutList, 
  Activity, 
  Fingerprint, 
  MessageCircle, 
  FileText, 
  RefreshCw,
  Edit3,
  Key,
  ShieldCheck,
  Shield,
  Clock,
  Calendar,
  MapPin,
  Heart,
  X,
  Check,
  Sparkles,
  AlertCircle,
  ArrowRight,
  FolderOpen,
  Camera,
  Loader
} from 'lucide-react';
import { kesiswaanApi } from '../../../api/kesiswaan.api';
import { cn } from '../../../lib/utils';
import { siswaApi } from '../../../api/academic.api';
import { getSiswaList, getSiswaMe } from '../../../api/academic/siswa.api';
import { sekolahApi } from '../../../api/academic/sekolah.api';
import { studentCardConfigApi } from '../../../api/academic/student-card-config.api';
import { changePassword } from '../../../api/auth.api';
import { PreviewCard } from '../../../components/academic/student-card/PreviewCard';
import { CardBackPreview } from '../../../components/academic/student-card/CardBackPreview';
import { PrintableCard } from '../../../components/academic/student-card/PrintableCard';
import { CardBackPrint } from '../../../components/academic/student-card/CardBackPrint';
import { DEFAULT_CONFIG } from '../../../components/academic/student-card/constants';
import { SiswaOnboardingModal, calculateProfileCompleteness, type SectionEditType } from '@/components/academic/siswa/SiswaOnboardingModal';
import { useSiswaMe } from '@/hooks/useSiswaMe';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { formatAlamatLengkap } from '@/lib/alamat.util';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { listSiswaDocuments, getMemberDocPreviewUrl } from '@/api/memberDocs.api';
import { SiswaDocsPanel } from '@/components/academic/siswa/SiswaDocsPanel';
import { SelfMemberDocsSection } from '@/components/documents/SelfMemberDocsSection';
import { toast } from 'react-hot-toast';
import { SiswaCardModal } from '../../academic/siswa/dashboard/SiswaCardModal';
import { SiswaProfileTab } from '../../academic/siswa/dashboard/SiswaProfileTab';
import { SiswaAttendanceTab } from '../../academic/siswa/dashboard/SiswaAttendanceTab';
import { SiswaPointsTab } from '../../academic/siswa/dashboard/SiswaPointsTab';
import { PendingSiswaModule } from '../../../pages/attendance/ops/components/PendingSiswaModule';
import { useGerbangAttendanceData } from '../../../hooks/attendance/useGerbangAttendanceData';
import { useTenant } from '../../../hooks/useTenant';

export const SiswaDashboard: React.FC = () => {
  const { user, tenantMode } = useAuthStore();
  const { tenant: tenantSettings } = useTenantSettings();
  const { can } = useCapabilities();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isPetugasKelas = can('attendance.sessions.update.attendance');

  // Synchronize Active Tab with URL Query Parameter (?tab=ringkasan)
  const activeTab = searchParams.get('tab') || 'ringkasan';

  const handleTabChange = (newTab: string) => {
    setSearchParams({ tab: newTab });
  };

  const [dashboardMode, setDashboardMode] = useState<'portal' | 'desktop'>(() => {
    return resolveSmartDashboardMode(user);
  });

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

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
  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Selected Month State for Attendance Tab (Format: YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(monthIso);
  const [catatanFilter, setCatatanFilter] = useState<'semua' | 'prestasi' | 'pelanggaran'>('semua');

  // Modals state
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPrestasiModal, setShowPrestasiModal] = useState(false);
  const [showKehadiranModal, setShowKehadiranModal] = useState(false);
  const [showBelumAbsenModal, setShowBelumAbsenModal] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionEditType>('pribadi');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const handleOpenEditSection = (section: SectionEditType) => {
    setActiveSection(section);
    setShowOnboardingModal(true);
  };

  // Form states for password change modal
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // 1. Get Student Detailed Profile via Custom Hook
  const { siswaProfile, isApiConnected, refetch: refetchProfile } = useSiswaMe();

  const { tenantId } = useTenant();
  const {
    notPresent: notPresentData = [],
    notPresentLoading,
    miniStats: miniStatsData = { masuk: 0, keluar: 0 },
    refreshAll: refetchNotPresent,
  } = useGerbangAttendanceData({
    tenantId,
    selectedKelasId: siswaProfile?.kelas_id || '',
    enabled: showBelumAbsenModal,
  });

  // 1.1 Fetch Sekolah Profile Data (Dynamic School Name & Logo from Modul Siswa-Card / Backend)
  const { data: sekolahProfileRes } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: sekolahApi.getProfile,
  });

  const sekolahName = tenantSettings?.name || sekolahProfileRes?.nama || sekolahProfileRes?.nama_sekolah || (siswaProfile as any)?.Sekolah?.nama || (siswaProfile as any)?.sekolah?.nama || (user as any)?.nama_sekolah || (user as any)?.tenant_name || (user as any)?.sekolah_nama || (user as any)?.tenantName || 'Sekolah';
  const sekolahLogo = tenantSettings?.logo_url || sekolahProfileRes?.logo_url || null;

  // 1.15 Resolve Student Profile Photo (with resolveProfilePhotoUrl & MemberDocs FOTO fallback)
  const { data: siswaDocsForPhoto } = useQuery({
    queryKey: ['self-member-docs-foto', siswaProfile?.id],
    queryFn: () => listSiswaDocuments(siswaProfile!.id),
    enabled: !!siswaProfile?.id && !siswaProfile?.foto && !siswaProfile?.foto_url,
  });

  const studentPhotoDoc = useMemo(() => {
    return siswaDocsForPhoto?.data?.find((d: any) => d.kategori === 'FOTO');
  }, [siswaDocsForPhoto]);

  const rawStudentPhoto = useMemo(() => {
    if (siswaProfile?.foto) return siswaProfile.foto;
    if (siswaProfile?.foto_url) return siswaProfile.foto_url;
    if ((siswaProfile as any)?.foto_pas) return (siswaProfile as any).foto_pas;
    if ((user as any)?.foto) return (user as any).foto;
    if ((user as any)?.foto_url) return (user as any).foto_url;
    if (studentPhotoDoc && siswaProfile?.id) {
      return getMemberDocPreviewUrl('SISWA', siswaProfile.id, studentPhotoDoc.id);
    }
    return null;
  }, [siswaProfile, user, studentPhotoDoc]);

  const studentPhotoUrl = useMemo(() => {
    return rawStudentPhoto ? resolveProfilePhotoUrl(rawStudentPhoto) : null;
  }, [rawStudentPhoto]);

  // 1.2 Fetch Active Student Card Configuration from Modul Siswa-Card (Tenant Setting Hook)
  const { data: studentCardConfigRes } = useQuery({
    queryKey: ['student-card-config-me'],
    queryFn: studentCardConfigApi.getConfig,
    enabled: true,
  });

  const activeCardConfig = studentCardConfigRes || null;

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
  const { data: dailyRecapRes, refetch: refetchDailyRecap } = useQuery({
    queryKey: ['rekap-harian-siswa-me', selectedDate, user?.siswa_id],
    queryFn: () => getRekapHarianSiswaMe({ tanggal: selectedDate }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: monthlyRecapRes, refetch: refetchMonthlyRecap } = useQuery({
    queryKey: ['rekap-bulanan-siswa-me', selectedMonth, user?.siswa_id],
    queryFn: () => getRekapBulananSiswaMe({ bulan: selectedMonth }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: scheduleRes, refetch: refetchSchedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['jadwal-kbm-siswa-me', selectedDate, user?.siswa_id],
    queryFn: async () => {
      console.log('🚀 [FRONTEND DASHBOARD] Querying getMyJadwalKBM for selectedDate:', selectedDate, 'user siswa_id:', user?.siswa_id);
      const res = await getMyJadwalKBM({ tanggal: selectedDate });
      console.log('🎯 [FRONTEND DASHBOARD] Query getMyJadwalKBM returned:', res);
      return res;
    },
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: pelanggaranRes, refetch: refetchPelanggaran } = useQuery({
    queryKey: ['pelanggaran-me', user?.siswa_id || user?.id],
    queryFn: async () => {
      try {
        const axios = (await import('../../../lib/axiosInstance')).default;
        const res = await axios.get('/kesiswaan/pelanggaran/me');
        console.log('🚨 [DEBUG PELANGGARAN-ME] Raw API response:', res?.data);
        console.log('🚨 [DEBUG PELANGGARAN-ME] Inner data payload:', res?.data?.data, 'Keys:', res?.data?.data ? Object.keys(res.data.data) : []);
        return res.data;
      } catch (err) {
        console.error('❌ [DEBUG PELANGGARAN-ME] Error fetching pelanggaran:', err);
        return null;
      }
    },
    enabled: !!user,
  });

  const { data: prestasiRes } = useQuery({
    queryKey: ['prestasi-me', user?.siswa_id || user?.id],
    queryFn: async () => {
      try {
        const axios = (await import('../../../lib/axiosInstance')).default;
        const res = await axios.get('/kesiswaan/prestasi/me');
        console.log('🏆 [DEBUG PRESTASI-ME] Raw API response:', res?.data);
        console.log('🏆 [DEBUG PRESTASI-ME] Inner data payload:', res?.data?.data, 'Keys:', res?.data?.data ? Object.keys(res.data.data) : []);
        return res.data;
      } catch (err) {
        console.error('❌ [DEBUG PRESTASI-ME] Error fetching prestasi:', err);
        return null;
      }
    },
    enabled: !!user,
  });

  const { data: kelasLeaderboardRes } = useQuery({
    queryKey: ['class-leaderboard-me-dashboard', selectedMonth],
    queryFn: () => getRekapBulananKelasMe({ bulan: selectedMonth }),
    enabled: !!user,
  });

  const myRank = useMemo(() => {
    const students = kelasLeaderboardRes?.data?.students || [];
    if (!students.length) return { rank: 0, totalStudents: 0 };
    const myIdx = students.findIndex((s: any) => s.id === user?.siswa_id || s.id === user?.id || s.nama === user?.name || s.nama === siswaProfile?.nama);
    return {
      rank: myIdx !== -1 ? myIdx + 1 : 0,
      totalStudents: students.length,
    };
  }, [kelasLeaderboardRes, user, siswaProfile]);

  const dailyRecap = dailyRecapRes?.data ?? null;
  const monthlyRecap = monthlyRecapRes?.data ?? null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchDailyRecap(),
        refetchMonthlyRecap(),
        refetchSchedule(),
        refetchPelanggaran(),
      ]);
      toast.success('Data dashboard berhasil diperbarui!');
    } catch (e) {
      toast.error('Gagal memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengubah password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const gamification = useMemo(() => {
    const detail = Array.isArray(monthlyRecapRes?.data?.detail)
      ? monthlyRecapRes.data.detail
      : Array.isArray(monthlyRecap?.detail)
        ? monthlyRecap.detail
        : [];

    let attendanceRate = 0;
    if (typeof monthlyRecapRes?.data?.persentase_kehadiran === 'number') {
      attendanceRate = monthlyRecapRes.data.persentase_kehadiran;
    } else if (typeof monthlyRecap?.persentase_kehadiran === 'number') {
      attendanceRate = monthlyRecap.persentase_kehadiran;
    } else {
      const h = monthlyRecapRes?.data?.total_hadir ?? 0;
      const i = monthlyRecapRes?.data?.total_izin ?? 0;
      const s = monthlyRecapRes?.data?.total_sakit ?? 0;
      const a = monthlyRecapRes?.data?.total_alpa ?? 0;
      const tot = h + i + s + a;
      attendanceRate = tot > 0 ? Math.round((h / tot) * 100) : 0;
    }

    const apiData = pelanggaranRes?.data;
    const rawList = Array.isArray(apiData)
      ? apiData
      : Array.isArray(apiData?.list)
        ? apiData.list
        : [];
    const totalPoinPelanggaran = rawList.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0);

    return calculateStudentGamification(detail, attendanceRate, totalPoinPelanggaran);
  }, [monthlyRecapRes, monthlyRecap, pelanggaranRes]);

  const studentInitials = useMemo(() => {
    const name = siswaProfile?.nama || (user as any)?.nama_siswa || user?.full_name || user?.name || 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [siswaProfile, user]);

  const studentName = siswaProfile?.nama || siswaProfile?.nama_siswa || (user as any)?.nama_siswa || user?.full_name || user?.name || '-';
  const currentClassName = siswaProfile?.Kelas?.nama_kelas || siswaProfile?.kelas?.nama_kelas || siswaProfile?.kelas_nama || (user as any)?.kelas_nama || (user as any)?.kelas || '-';
  const currentNisn = (siswaProfile as any)?.nisn || (siswaProfile as any)?.nis || (user as any)?.nisn || (user as any)?.username || '-';
  const currentNik = siswaProfile?.nik || (user as any)?.nik || (user as any)?.nik_siswa || '-';

  useEffect(() => {
    const rawNisn = currentNisn && currentNisn !== '-' ? currentNisn : (siswaProfile?.nisn || siswaProfile?.nis || user?.username || '1234567890');
    QRCode.toDataURL(String(rawNisn), { errorCorrectionLevel: 'L', margin: 0, width: 300 })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate QR code:', err));
  }, [currentNisn, siswaProfile, user]);

  const currentJurusan = siswaProfile?.Jurusan?.nama || siswaProfile?.jurusan?.nama || siswaProfile?.Kelas?.Jurusan?.nama || siswaProfile?.kelas?.Jurusan?.nama || siswaProfile?.jurusan?.nama_jurusan || siswaProfile?.Jurusan?.nama_jurusan || siswaProfile?.Kelas?.Jurusan?.nama_jurusan || siswaProfile?.Kelas?.jurusan?.nama_jurusan || siswaProfile?.kelas?.Jurusan?.nama_jurusan || siswaProfile?.kelas?.jurusan?.nama_jurusan || siswaProfile?.jurusan_nama || (user as any)?.jurusan_nama || (user as any)?.jurusan || '-';
  const currentOrtu = siswaProfile?.nama_ayah || siswaProfile?.nama_ibu || siswaProfile?.nama_wali || (user as any)?.nama_ortu || '-';
  const rawTitle = activeCardConfig?.card_title;
  const dynamicCardTitle = (rawTitle && !rawTitle.toLowerCase().includes('pegawai'))
    ? rawTitle
    : 'KARTU TANDA PELAJAR DIGITAL';
  const dynamicLogoUrl = activeCardConfig?.logo_url || sekolahLogo;
  const dynamicRules = activeCardConfig?.back_rules || 'Gunakan QR Code ini untuk scan Tap Presensi Gerbang Sekolah & Akses Perpustakaan Digital.';

  const renderValueOrUnconnectedBadge = (val: any, customConnectedText?: React.ReactNode) => {
    return renderApiValue(val, customConnectedText, isApiConnected);
  };

  // Helper for universal array extraction from backend payload
  const extractListFromPayload = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    
    const target = payload?.data || payload;
    if (Array.isArray(target)) return target;
    if (Array.isArray(target?.list)) return target.list;
    if (Array.isArray(target?.rows)) return target.rows;
    if (Array.isArray(target?.items)) return target.items;
    if (Array.isArray(target?.records)) return target.records;
    if (Array.isArray(target?.pelanggaran)) return target.pelanggaran;
    if (Array.isArray(target?.prestasi)) return target.prestasi;
    if (Array.isArray(target?.data)) return target.data;
    
    if (target && typeof target === 'object') {
      for (const key of Object.keys(target)) {
        if (Array.isArray(target[key])) {
          return target[key];
        }
      }
    }
    return [];
  };

  // pelanggaran data list — handle all possible API payload shapes
  const pelanggaranList = useMemo(() => {
    console.log('🔍 [DEBUG PELANGGARAN LIST] pelanggaranRes:', pelanggaranRes);
    const list = extractListFromPayload(pelanggaranRes);
    console.log('✅ [DEBUG PELANGGARAN LIST] Parsed count:', list.length, list);
    return list;
  }, [pelanggaranRes]);

  const prestasiList = useMemo(() => {
    console.log('🔍 [DEBUG PRESTASI LIST] prestasiRes:', prestasiRes);
    const list = extractListFromPayload(prestasiRes);
    console.log('✅ [DEBUG PRESTASI LIST] Parsed count:', list.length, list);
    return list;
  }, [prestasiRes]);

  const totalPoinPelanggaran = useMemo(() => {
    return pelanggaranList.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0);
  }, [pelanggaranList]);

  const totalPoinPrestasi = useMemo(() => {
    return prestasiList.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0);
  }, [prestasiList]);

  const netPoin = useMemo(() => totalPoinPrestasi - totalPoinPelanggaran, [totalPoinPrestasi, totalPoinPelanggaran]);

  const disciplineHistory = useMemo(() => {
    const combined = [];
    if (pelanggaranList.length > 0) {
      for (const p of pelanggaranList) {
        combined.push({
          id: p.id || p.tanggal || `pel-${Math.random()}`,
          judul: p.nama_pelanggaran || p.kategori || p.keterangan || 'Catatan Pelanggaran',
          kategori: p.kategori || 'Kedisiplinan',
          tanggal: p.tanggal,
          poin: -(p.poin || 5),
          type: 'pelanggaran',
        });
      }
    }
    if (prestasiList.length > 0) {
      for (const pr of prestasiList) {
        combined.push({
          id: pr.id || pr.tanggal || `pres-${Math.random()}`,
          judul: pr.nama_prestasi || pr.kategori || pr.keterangan || 'Catatan Prestasi',
          kategori: pr.kategori || 'Prestasi & Keahlian',
          tanggal: pr.tanggal,
          poin: +(pr.poin || 10),
          type: 'prestasi',
        });
      }
    }
    combined.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
    return combined;
  }, [pelanggaranList, prestasiList]);

  const currentDisciplineScore = useMemo(() => {
    const baseScore = 100;
    return Math.max(0, baseScore - totalPoinPelanggaran + totalPoinPrestasi);
  }, [totalPoinPelanggaran, totalPoinPrestasi]);

  // Attendance stats calculation for month (100% Real API data)
  const monthStats = useMemo(() => {
    return {
      hadir: monthlyRecapRes?.data?.total_hadir ?? monthlyRecap?.statistik?.HADIR ?? 0,
      sakit: monthlyRecapRes?.data?.total_sakit ?? monthlyRecap?.statistik?.SAKIT ?? 0,
      izin: monthlyRecapRes?.data?.total_izin ?? monthlyRecap?.statistik?.IZIN ?? 0,
      alpa: monthlyRecapRes?.data?.total_alpa ?? monthlyRecap?.statistik?.ALPA ?? 0,
    };
  }, [monthlyRecapRes, monthlyRecap]);

  // Navigation Tabs definition
  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: LayoutList },
    { id: 'kehadiran', label: 'Kehadiran', icon: CheckCircle2 },
    { id: 'catatan', label: 'Catatan', icon: FileText },
    { id: 'berkas', label: 'Berkas Saya', icon: FolderOpen },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  // Month navigation helper
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const selectedMonthFormatted = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Calendar Grid Calculator for Kehadiran Tab
  const calendarGridData = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10); // 1-indexed

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...

    const detailList = Array.isArray(monthlyRecap?.detail) ? monthlyRecap.detail : [];
    const statusMap = new Map<string, { status: string; waktu_masuk?: string; keterangan?: string; metode?: string }>();

    for (const item of detailList) {
      if (item.tanggal) {
        statusMap.set(item.tanggal, {
          status: item.status,
          waktu_masuk: item.waktu_masuk,
          keterangan: item.keterangan,
          metode: item.metode_absen
        });
      }
    }

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = statusMap.get(dateIso);
      days.push({
        day: d,
        dateIso,
        status: rec?.status || null,
        rec,
      });
    }

    return {
      year,
      month,
      daysInMonth,
      firstDayIndex,
      days,
    };
  }, [selectedMonth, monthlyRecap]);

  // Historis Sesi Absensi & Tap for Kehadiran Tab Right Column
  const sessionAttendanceHistory = useMemo(() => {
    const formatWaktu = (raw: any) => {
      if (!raw || raw === '-') return '-';
      const str = String(raw).trim();
      if (str.includes('T') || str.includes('Z')) {
        const formatted = formatLocalTimeFromISO(str);
        if (formatted) return `${formatted} WIB`;
      }
      const clean = str.replace(/WIB/gi, '').trim();
      return clean ? `${clean} WIB` : '-';
    };

    // 1. First check dailyRecapRes for selectedDate
    const dailyData = dailyRecapRes?.data;
    const rincianList = Array.isArray(dailyData?.rincian) ? dailyData.rincian : [];

    if (rincianList.length > 0) {
      return rincianList.map((item: any, idx: number) => {
        const isHadir = item.status === 'HADIR' || item.status === 'TEPAT_WAKTU';
        const isTerlambat = item.status === 'TERLAMBAT';
        const isSakit = item.status === 'SAKIT' || item.status === 'IZIN';

        const waktuRaw = item.waktu_tap || item.waktu || item.waktu_masuk || item.created_at || '-';
        const waktuStr = formatWaktu(waktuRaw);

        let formattedDate = selectedDate;
        if (selectedDate && selectedDate.includes('-')) {
          try {
            const [y, m, d] = selectedDate.split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            formattedDate = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          } catch {}
        }

        const sesiNama = item.jenis_kegiatan || item.sesi_nama || item.nama_sesi || item.mapel || 'Sesi Presensi';

        return {
          id: item.id || `rincian-${idx}`,
          date: formattedDate,
          status: item.status || 'HADIR',
          metode: item.metode_absen || item.metode || (isHadir ? 'RFID' : 'Manual'),
          waktu: waktuStr,
          sesi: sesiNama,
          keterangan: item.keterangan || '',
        };
      });
    }

    // 2. Fallback to monthlyRecap detail filtered by selectedDate or all items
    const detailList = Array.isArray(monthlyRecap?.detail) ? monthlyRecap.detail : [];
    const filteredDetail = detailList.filter((item: any) => !selectedDate || item.tanggal === selectedDate);
    const listToMap = filteredDetail.length > 0 ? filteredDetail : detailList;

    if (listToMap.length > 0) {
      return listToMap.map((item: any, idx: number) => {
        const isHadir = item.status === 'HADIR' || item.status === 'TEPAT_WAKTU';
        const isTerlambat = item.status === 'TERLAMBAT';
        const isSakit = item.status === 'SAKIT' || item.status === 'IZIN';

        const waktuRaw = item.waktu_masuk || item.waktu || item.waktu_tap || '-';
        const waktuStr = formatWaktu(waktuRaw);

        let formattedDate = item.tanggal || '-';
        if (item.tanggal && item.tanggal.includes('-')) {
          try {
            const [y, m, d] = item.tanggal.split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            formattedDate = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          } catch {}
        }

        const sesiNama = item.sesi_nama || item.nama_sesi || item.jenis_kegiatan || item.mapel || 'Sesi Presensi';

        return {
          id: item.id || item.tanggal || `session-${idx}`,
          date: formattedDate,
          status: item.status || 'HADIR',
          metode: item.metode_absen || item.metode || (isHadir ? 'RFID' : 'Manual'),
          waktu: waktuStr,
          sesi: sesiNama,
          keterangan: item.keterangan || '',
        };
      });
    }
    return [];
  }, [dailyRecapRes, monthlyRecap, selectedDate]);

  // Today KBM Schedule for Kehadiran Tab Bottom Section
  const todayKbmSchedule = useMemo(() => {
    console.log('📊 [FRONTEND USEMEMO] scheduleRes raw object:', scheduleRes);
    const rawList = scheduleRes?.data;
    const list = Array.isArray(rawList)
      ? rawList
      : Array.isArray((rawList as any)?.data)
        ? (rawList as any).data
        : Array.isArray(scheduleRes)
          ? scheduleRes
          : [];

    console.log('📋 [FRONTEND USEMEMO] Parsed todayKbmSchedule list count:', list.length, list);

    if (list.length > 0) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      return list.map((item: any, idx: number) => {
        const jamMulai = item.jam_mulai || item.jam?.split('-')[0]?.trim() || '';
        const jamSelesai = item.jam_selesai || item.jam?.split('-')[1]?.trim() || '';

        let calcStatus = 'Mendatang';
        if (jamMulai && jamMulai !== '??:??') {
          const [sH, sM] = jamMulai.split(':').map(Number);
          const startMin = (sH || 0) * 60 + (sM || 0);
          let endMin = startMin + 90;
          if (jamSelesai && jamSelesai !== '??:??') {
            const [eH, eM] = jamSelesai.split(':').map(Number);
            endMin = (eH || 0) * 60 + (eM || 0);
          }

          if (currentMinutes >= startMin && currentMinutes <= endMin) {
            calcStatus = 'Sedang Berlangsung';
          } else if (currentMinutes > endMin) {
            calcStatus = 'Selesai';
          }
        }

        const kodeMapel = item.Mapel?.kode_mapel || item.kode_mapel || item.kode || `KBM-${idx + 1}`;
        const namaMapel = item.Mapel?.nama_mapel || item.nama_mapel || item.kegiatan || item.jenis_kegiatan || item.mapel || 'Mata Pelajaran';
        const namaGuru = item.Guru?.User?.full_name || item.Guru?.nama_guru || item.nama_guru || item.guru || 'Guru Pengampu';
        const namaKelas = item.Kelas?.nama_kelas || item.kelas_nama || item.lokasi || item.ruang || 'Ruang Kelas';

        return {
          id: item.id || String(idx),
          kode: kodeMapel,
          mapel: namaMapel,
          guru: namaGuru,
          lokasi: namaKelas,
          jam: item.jam || (jamMulai && jamSelesai ? `${jamMulai} - ${jamSelesai}` : '07:00 - 08:30'),
          status: calcStatus,
        };
      });
    }
    return [];
  }, [scheduleRes]);

  // Buku Catatan Kedisiplinan & Prestasi for Catatan Poin Tab
  const bukuCatatanList = useMemo(() => {
    const rawPelanggaran: any[] = pelanggaranList;
    const rawPrestasi: any[] = prestasiList;

    const pelanggaranItems = rawPelanggaran.map((item: any) => ({
      id: item.id || Math.random().toString(),
      type: 'PELANGGARAN' as const,
      tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : '-',
      judul: item.nama_pelanggaran || item.jenis_pelanggaran || item.kategori || item.judul || 'Pelanggaran Kedisiplinan',
      kategori: item.Jenis?.kategori || item.kategori || item.jenis_pelanggaran || 'Kedisiplinan',
      pencatat: item.pencatat || item.guru_pencatat || 'Tim BK',
      poin: -(item.poin || 0),
      poinText: `-${item.poin || 0} Poin`,
      status: item.status || 'Selesai',
    }));

    const prestasiItems = rawPrestasi.map((item: any) => ({
      id: item.id || Math.random().toString(),
      type: 'PRESTASI' as const,
      tanggal: item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : '-',
      judul: item.nama_prestasi || item.judul || 'Prestasi Siswa',
      kategori: item.Jenis?.kategori || item.kategori || 'Akademik & Keilmuan',
      pencatat: item.pencatat || item.guru_pencatat || 'Wali Kelas',
      poin: item.poin || 0,
      poinText: `+${item.poin || 0} Poin`,
      status: item.status || 'Disetujui',
    }));

    const combined = [...pelanggaranItems, ...prestasiItems];
    // Sort by tanggal descending (terbaru dulu)
    combined.sort((a, b) => {
      const da = a.tanggal === '-' ? 0 : new Date(a.tanggal).getTime();
      const db = b.tanggal === '-' ? 0 : new Date(b.tanggal).getTime();
      return db - da;
    });
    return combined;
  }, [pelanggaranList, prestasiList]);

  // Filtered List based on catatanFilter state
  const filteredBukuCatatan = useMemo(() => {
    if (catatanFilter === 'prestasi') return bukuCatatanList.filter(item => item.type === 'PRESTASI');
    if (catatanFilter === 'pelanggaran') return bukuCatatanList.filter(item => item.type === 'PELANGGARAN');
    return bukuCatatanList;
  }, [bukuCatatanList, catatanFilter]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 lg:pb-8 text-slate-800 dark:text-slate-100">
      
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* TOP INTEGRATED HERO & NAVIGATION CARD (Clean Light White Theme)    */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 text-slate-800 dark:text-slate-100 shadow-sm space-y-4 sm:space-y-5">
        {/* Top Row: Identity & Quick Action */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Avatar Box with Student Photo */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center font-black text-xl sm:text-2xl shadow-xs overflow-hidden">
                {studentPhotoUrl ? (
                  <img
                    src={studentPhotoUrl}
                    alt={studentName}
                    className="w-full h-full object-cover rounded-2xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  studentInitials
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-white" title="Status Aktif">
                <Check size={10} strokeWidth={4} />
              </span>
            </div>

            {/* Name, Class Badge, NISN & Jurusan */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {studentName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  Kelas {currentClassName}
                </span>
                {isPetugasKelas && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>Petugas Kelas</span>
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                <span>NISN: {currentNisn}</span>
                {currentJurusan && currentJurusan !== '-' && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span>{currentJurusan}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons on Right (Streamlined Row) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch sm:self-auto justify-start sm:justify-end">
            {isPetugasKelas && (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate('/attendance/ops?tab=sesi')}
                  className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 border-none cursor-pointer"
                  title={`Presensi Kelas Saya (${currentClassName})`}
                >
                  <CheckCircle2 size={15} />
                  <span>Presensi Kelas</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setShowBelumAbsenModal(true)}
                  className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
                  title={`Cek Siswa Belum Absen & Presensi Manual (${currentClassName})`}
                >
                  <AlertCircle size={15} />
                  <span>Belum Absensi</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => navigate('/attendance/ops?tab=jurnal')}
                  className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700/80 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Input Jurnal KBM Kelas"
                >
                  <FileText size={15} />
                  <span>Jurnal KBM</span>
                </Button>
              </>
            )}

            <Button
              size="sm"
              onClick={() => setShowDigitalCardModal(true)}
              className="h-9 sm:h-10 px-3.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              title="Buka Kartu Pelajar Digital"
            >
              <QrCode size={15} />
              <span>Kartu Digital</span>
            </Button>
          </div>
        </div>

        {/* Bottom Row: Integrated Navigation Tabs Bar Inset (Desktop / Tablet Only - Hidden on Mobile) */}
        <div className="hidden md:flex p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;
            const badgeCount = tab.id === 'catatan' ? (pelanggaranRes?.data?.length || 0) : null;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 cursor-pointer select-none",
                  isTabActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 border border-blue-500 font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50"
                )}
              >
                <TabIcon size={16} />
                <span>{tab.id === 'profil' ? 'Profil & Kartu' : tab.id === 'catatan' ? 'Catatan Poin' : tab.label}</span>
                {badgeCount !== null && badgeCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* TODAY'S PRESENCE & DISCIPLINE SCORE BANNER                         */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'ringkasan' && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 p-5 sm:p-6 text-slate-800 dark:text-slate-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-blue-500/20">
          {/* Left Side: Gate Attendance & Mini Session Status */}
          <div className="space-y-3 max-w-2xl min-w-0">
            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                STATUS HARI INI – {todayFormattedDate}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Presensi Gerbang:</span>
                <span className="underline decoration-blue-500 underline-offset-4 font-mono font-black text-blue-600 dark:text-blue-400">
                  {dailyRecapRes?.data?.status || (dailyRecapRes?.data?.rincian?.[0]?.status ?? 'HADIR')} (
                  {dailyRecapRes?.data?.rincian?.[0]?.waktu_tap 
                    ? formatLocalTimeFromISO(dailyRecapRes.data.rincian[0].waktu_tap) + ' WIB'
                    : (dailyRecapRes?.data?.waktu_masuk || 'Belum Tap')
                  })
                </span>
              </h2>

              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                <MapPin size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Gate 1 Utama</span>
                <span>•</span>
                <span>Sesi KBM Active</span>
              </p>
            </div>

            {/* Mini Status Sesi KBM Hari Ini (Khusus Mode Multi-Sesi) */}
            {todayKbmSchedule && todayKbmSchedule.length > 0 && (
              <div className="pt-2.5 space-y-1.5 border-t border-blue-500/20">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Progres Sesi KBM Hari Ini ({todayKbmSchedule.length} Sesi Terjadwal)
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {todayKbmSchedule.map((sesi: any, idx: number) => {
                    const gateStatus = dailyRecapRes?.data?.status || dailyRecapRes?.data?.rincian?.[0]?.status;
                    const isStudentAtSchool = gateStatus === 'HADIR' || gateStatus === 'TERLAMBAT' || gateStatus === 'TEPAT_WAKTU';

                    const tapList = Array.isArray(dailyRecapRes?.data?.sessionTaps)
                      ? dailyRecapRes.data.sessionTaps
                      : Array.isArray((dailyRecapRes as any)?.data?.rincian)
                        ? (dailyRecapRes as any).data.rincian
                        : [];

                    const tap = tapList.find(
                      (t: any) => 
                        t.sesi_id === sesi.id || 
                        t.nama_sesi === sesi.nama_sesi || 
                        (t.nama_mapel && sesi.mapel && String(t.nama_mapel).toLowerCase().trim() === String(sesi.mapel).toLowerCase().trim()) || 
                        (t.mapel && sesi.mapel && String(t.mapel).toLowerCase().trim() === String(sesi.mapel).toLowerCase().trim()) ||
                        (t.jenis_kegiatan && sesi.mapel && String(t.jenis_kegiatan).toLowerCase().includes(String(sesi.mapel).toLowerCase())) ||
                        (t.jenis_kegiatan && sesi.kode && String(t.jenis_kegiatan).toLowerCase().includes(String(sesi.kode).toLowerCase()))
                    );

                    let displayStatusLabel = 'Jadwal';
                    let badgeStyle = 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-300/80 dark:border-slate-700';

                    if (tap && tap.status) {
                      const s = String(tap.status).toUpperCase();
                      if (s === 'HADIR' || s === 'TEPAT_WAKTU') {
                        displayStatusLabel = 'Hadir';
                        badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
                      } else if (s === 'TERLAMBAT') {
                        displayStatusLabel = 'Terlambat';
                        badgeStyle = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
                      } else if (s === 'SAKIT' || s === 'IZIN' || s === 'DISPEN') {
                        displayStatusLabel = s === 'SAKIT' ? 'Sakit' : s === 'IZIN' ? 'Izin' : 'Dispen';
                        badgeStyle = 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
                      } else if (s === 'ALPA') {
                        displayStatusLabel = 'Alpa';
                        badgeStyle = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
                      }
                    } else {
                      if (sesi.status === 'Sedang Berlangsung') {
                        displayStatusLabel = isStudentAtSchool ? 'KBM' : 'Belum';
                        badgeStyle = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 animate-pulse';
                      } else if (sesi.status === 'Mendatang') {
                        displayStatusLabel = 'Jadwal';
                        badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                      } else if (sesi.status === 'Selesai') {
                        if (isStudentAtSchool) {
                          displayStatusLabel = 'Hadir';
                          badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
                        } else {
                          displayStatusLabel = 'Alpa';
                          badgeStyle = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
                        }
                      }
                    }

                    return (
                      <span
                        key={sesi.id || `sesi-mini-${idx}`}
                        className={cn("px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all", badgeStyle)}
                        title={`${sesi.nama_sesi || `Sesi ${idx+1}`}: ${sesi.mapel || 'Mata Pelajaran'} (${displayStatusLabel})`}
                      >
                        <span className="font-mono text-[10px] opacity-75">Sesi {idx + 1}</span>
                        <span className="font-extrabold">{displayStatusLabel}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 SUMMARY STAT CARDS (Clean Light Theme - Rendered only on Ringkasan tab) */}
      {activeTab === 'ringkasan' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Stat 1: Saldo Poin Kedisiplinan (Clickable to Catatan Tab) */}
          <div 
            onClick={() => handleTabChange('catatan')}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 relative overflow-hidden group hover:border-amber-500/60 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
            title="Klik untuk membuka Tab Catatan & Buku Poin"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Shield size={18} className="sm:hidden" />
              <Shield size={20} className="hidden sm:block" />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Saldo Poin Kedisiplinan</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {netPoin >= 0 ? `+${netPoin}` : netPoin} Poin
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                {netPoin >= 0 ? 'Aman (Saldo Poin Positif)' : netPoin >= -20 ? 'Peringatan (Perlu Perhatian)' : 'Kritis (Perlu Pembinaan)'}
              </p>
            </div>
          </div>

          {/* Stat 2: Peringkat Kedisiplinan (Clickable Leaderboard) */}
          <div 
            onClick={() => setShowLeaderboardModal(true)}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 relative overflow-hidden group hover:border-blue-500/60 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
            title="Klik untuk melihat Klasemen Kedisiplinan Kelas"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp size={18} className="sm:hidden" />
              <TrendingUp size={20} className="hidden sm:block" />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Peringkat Kedisiplinan</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {myRank.rank > 0 ? `#${myRank.rank}` : '-'}
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {myRank.totalStudents > 0 ? `Dari ${myRank.totalStudents} Siswa ${currentClassName}` : `Kelas ${currentClassName}`}
              </p>
            </div>
          </div>

          {/* Stat 3: Kehadiran Bulanan (Clickable Modal) */}
          <div 
            onClick={() => setShowKehadiranModal(true)}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 relative overflow-hidden group hover:border-emerald-500/60 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
            title="Klik untuk melihat Rincian Kehadiran Bulanan"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={18} className="sm:hidden" />
              <CheckCircle2 size={20} className="hidden sm:block" />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Kehadiran Bulanan</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {gamification.attendanceRate}%
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                {gamification.attendanceRate >= 95 ? 'Sangat Baik' : gamification.attendanceRate >= 80 ? 'Cukup Baik' : 'Perlu Perhatian'}
              </p>
            </div>
          </div>

          {/* Stat 4: Total Prestasi (Clickable Modal) */}
          <div 
            onClick={() => setShowPrestasiModal(true)}
            className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5 relative overflow-hidden group hover:border-purple-500/60 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
            title="Klik untuk melihat Detail Catatan Prestasi & Penghargaan"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Trophy size={18} className="sm:hidden" />
              <Trophy size={20} className="hidden sm:block" />
            </div>
            <div className="space-y-0.5 min-w-0 w-full">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">Total Prestasi</span>
              <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {prestasiList.length} Penghargaan
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-purple-600 dark:text-purple-400 truncate">
                +{totalPoinPrestasi} Poin Bonus
              </p>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* TAB CONTENT AREA                                                   */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence mode="wait">
        
        {/* ðŸ“Œ TAB 1: RINGKASAN */}
        {activeTab === 'ringkasan' && (
          <motion.div
            key="tab-ringkasan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5 sm:space-y-6"
          >
            {/* ðŸš€ AKSI CEPAT SISWA (Clean Light Theme) */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Aksi Cepat Siswa</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowDigitalCardModal(true)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 shadow-sm text-left space-y-2.5 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kartu Digital</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Tampilkan QR / Barcode</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('kehadiran')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/50 shadow-sm text-left space-y-2.5 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Jadwal KBM</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Cek Presensi Kelas</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('catatan')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/50 shadow-sm text-left space-y-2.5 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Buku Poin</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Pelanggaran &amp; Prestasi</p>
                  </div>
                </button>

                <button
                  onClick={() => handleTabChange('profil')}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 shadow-sm text-left space-y-2.5 transition-all group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Profil Saya</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Profil &amp; Kartu Pelajar</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 📜 HISTORIS POIN KEDISIPLINAN TERBARU (Clean Light Theme) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">Historis Poin Kedisiplinan Terbaru</h3>
                <button onClick={() => handleTabChange('catatan')} className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                  <span>Lihat Semua</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {disciplineHistory.length > 0 ? (
                  disciplineHistory.slice(0, 3).map((item) => {
                    const isPositive = item.poin > 0;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border flex items-center justify-between gap-3 transition-all",
                          isPositive ? "border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-500/40" : "border-rose-200/80 dark:border-rose-900/40 hover:border-rose-500/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                            isPositive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          )}>
                            {isPositive ? <Award size={18} /> : <AlertCircle size={18} />}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.judul}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {item.kategori} • {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-black shrink-0 font-mono",
                          isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {isPositive ? `+${item.poin} Poin` : `${item.poin} Poin`}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <FileText size={18} />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Belum ada catatan poin kedisiplinan terbaru.</p>
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 2: KEHADIRAN (Kalender & Historis Presensi Gerbang) */}
        {activeTab === 'kehadiran' && (
          <motion.div
            key="tab-kehadiran"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SiswaAttendanceTab
              gamification={gamification}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
              selectedMonthFormatted={selectedMonthFormatted}
              calendarGridData={calendarGridData}
              todayIso={todayIso}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              sessionAttendanceHistory={sessionAttendanceHistory}
              todayKbmSchedule={todayKbmSchedule}
              isLoadingSchedule={isLoadingSchedule}
              isApiConnected={isApiConnected}
            />
          </motion.div>
        )}

        {/* TAB 3: CATATAN POIN (Buku Catatan Kedisiplinan & Prestasi) */}
        {activeTab === 'catatan' && (
          <motion.div
            key="tab-catatan"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SiswaPointsTab
              bukuCatatanList={bukuCatatanList}
              catatanFilter={catatanFilter}
              setCatatanFilter={setCatatanFilter}
              filteredBukuCatatan={filteredBukuCatatan}
              totalPoinPrestasi={totalPoinPrestasi}
              totalPoinPelanggaran={totalPoinPelanggaran}
              netPoin={netPoin}
            />
          </motion.div>
        )}

        {/* TAB 4: BERKAS SAYA (Slot Kategori Visual Berkas Siswa) */}
        {activeTab === 'berkas' && (
          <motion.div
            key="tab-berkas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {siswaProfile?.id ? (
              <SiswaDocsPanel
                siswaId={siswaProfile.id}
                siswaName={siswaProfile.nama_siswa || user?.name || ''}
                nis={siswaProfile.nis}
                nisn={siswaProfile.nisn}
                mode="full"
                canManage={true}
              />
            ) : (
              <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 font-semibold animate-pulse">
                Memuat data berkas siswa...
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: PROFIL */}
        {activeTab === 'profil' && (
          <motion.div
            key="tab-profil"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <SiswaProfileTab
              siswaProfile={siswaProfile}
              user={user}
              studentPhotoUrl={studentPhotoUrl}
              studentInitials={studentInitials}
              currentClassName={currentClassName}
              currentJurusan={currentJurusan}
              currentNisn={currentNisn}
              currentNik={currentNik}
              currentOrtu={currentOrtu}
              qrCodeDataUrl={qrCodeDataUrl}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (Inspected: lg:hidden)           */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex justify-around items-center shadow-xl">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isTabActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 p-1 rounded-xl text-[10px] font-bold transition-all duration-200 select-none flex-1",
                isTabActive
                  ? "text-primary"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isTabActive ? "bg-primary/15 text-primary" : "bg-transparent"
              )}>
                <TabIcon size={18} />
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL GANTI PASSWORD                                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                  <Key size={20} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Ganti Password</h3>
              </div>
              <button onClick={() => setShowChangePasswordModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Password Lama</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password lama..."
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru..."
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 h-10 rounded-xl text-xs font-extrabold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="flex-1 h-10 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                >
                  {passwordSubmitting ? 'Saving...' : 'Simpan Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kartu Pelajar Digital Verified Fullscreen Modal */}
      <SiswaCardModal
        isOpen={showDigitalCardModal}
        onClose={() => setShowDigitalCardModal(false)}
        siswaProfile={siswaProfile}
        user={user}
        sekolahName={sekolahName}
        dynamicLogoUrl={dynamicLogoUrl}
        studentPhotoUrl={studentPhotoUrl}
        studentInitials={studentInitials}
        studentName={studentName}
        currentClassName={currentClassName}
        currentJurusan={currentJurusan}
        currentNisn={currentNisn}
        currentNik={currentNik}
        studentCardConfigRes={studentCardConfigRes}
      />

      {/* Focused Per-Section Profile Edit Modal */}
      {showOnboardingModal && (
        <SiswaOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          siswa={siswaProfile}
          activeSection={activeSection}
          onSuccess={() => {
            refetchProfile();
          }}
        />
      )}

      {/* MODAL KLASEMEN KEDISIPLINAN KELAS */}
      <AnimatePresence>
        {showLeaderboardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowLeaderboardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                    <Trophy size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Klasemen Kedisiplinan Kelas
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Kelas {currentClassName} • {selectedMonthFormatted}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Leaderboard List Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                {kelasLeaderboardRes?.data?.students && kelasLeaderboardRes.data.students.length > 0 ? (
                  kelasLeaderboardRes.data.students.map((student: any, idx: number) => {
                    const isMe = student.id === user?.siswa_id || student.id === user?.id || student.nama === user?.name || student.nama === siswaProfile?.nama;
                    const rankNumber = idx + 1;
                    const isGold = rankNumber === 1;
                    const isSilver = rankNumber === 2;
                    const isBronze = rankNumber === 3;

                    return (
                      <div
                        key={student.id || `rank-item-${idx}`}
                        className={cn(
                          "pt-2.5 first:pt-0 p-3 rounded-2xl transition-all flex items-center justify-between gap-3 border",
                          isMe
                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/40 shadow-xs"
                            : "bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        )}
                      >
                        {/* Left Rank & Student Name */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Badge */}
                          <div className={cn(
                            "w-8 h-8 rounded-xl font-black font-mono text-xs flex items-center justify-center shrink-0 border",
                            isGold ? "bg-amber-400/20 text-amber-600 border-amber-400/40" :
                            isSilver ? "bg-slate-300/20 text-slate-600 border-slate-300/40" :
                            isBronze ? "bg-amber-700/20 text-amber-800 border-amber-700/40" :
                            "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                          )}>
                            #{rankNumber}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn(
                                "text-sm font-bold truncate block",
                                isMe ? "text-blue-700 dark:text-blue-300 font-extrabold" : "text-slate-900 dark:text-white"
                              )}>
                                {student.nama}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-600 text-white uppercase tracking-wider">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
                              <span>Hadir: {student.hadir || 0}x</span>
                              <span>•</span>
                              <span>Persentase: {student.persentase || 0}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Points Badge */}
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                            {student.total_poin >= 0 ? `+${student.total_poin}` : student.total_poin} Poin
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">Total Skor</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <Trophy className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      Belum ada data klasemen untuk bulan ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-center">
                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Tutup Klasemen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL BUKU CATATAN PRESTASI & PENGHARGAAN SISWA */}
      <AnimatePresence>
        {showPrestasiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowPrestasiModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Trophy size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Buku Catatan Prestasi & Penghargaan
                    </h3>
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                      Total +{totalPoinPrestasi} Poin Bonus • {prestasiList.length} Penghargaan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrestasiModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* List Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
                {bukuCatatanList.filter(item => item.type === 'PRESTASI').length > 0 ? (
                  bukuCatatanList.filter(item => item.type === 'PRESTASI').map((item: any) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Award size={20} />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                            {item.judul}
                          </h4>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Kategori: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.kategori}</span> • Pencatat: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.pencatat}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Tanggal: {item.tanggal}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 inline-block font-mono">
                          +{item.poin || 0} Poin
                        </span>
                        <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <Trophy className="mx-auto text-slate-300 dark:text-slate-700" size={40} />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      Belum ada catatan prestasi atau penghargaan yang terdaftar.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-center">
                <button
                  onClick={() => setShowPrestasiModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Tutup Buku Prestasi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL RINCIAN KEHADIRAN BULANAN SISWA */}
      <AnimatePresence>
        {showKehadiranModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowKehadiranModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Rincian Kehadiran Bulanan
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      {selectedMonthFormatted} • Presensi {gamification.attendanceRate}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKehadiranModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stats Grid Breakdown */}
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-center">
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">HADIR</span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">{monthStats.hadir}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/20 text-center">
                    <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">SAKIT</span>
                    <span className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono">{monthStats.sakit}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-500/20 text-center">
                    <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">IZIN</span>
                    <span className="text-lg font-black text-blue-700 dark:text-blue-300 font-mono">{monthStats.izin}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/20 text-center">
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">ALPA</span>
                    <span className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono">{monthStats.alpa}</span>
                  </div>
                </div>

                {/* Progress Bar Visual */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Tingkat Kehadiran</span>
                    <span>{gamification.attendanceRate}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div style={{ width: `${gamification.attendanceRate}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-500" />
                  </div>
                </div>

                {/* Quick Info & Action */}
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-500/20 flex items-center justify-between gap-3">
                  <div className="text-xs text-blue-800 dark:text-blue-300 font-medium">
                    Lihat riwayat kalender lengkap dan surat izin presensi di Tab Kehadiran.
                  </div>
                  <button
                    onClick={() => {
                      setShowKehadiranModal(false);
                      handleTabChange('kehadiran');
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    Buka Tab Kehadiran &rsaquo;
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-center">
                <button
                  onClick={() => setShowKehadiranModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Tutup Rincian
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CHECKLIST SISWA BELUM ABSENSI (PETUGAS KELAS - HYBRID MOBILE SHEET & DESKTOP CARD) */}
      <AnimatePresence>
        {showBelumAbsenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/65 backdrop-blur-sm"
            onClick={() => setShowBelumAbsenModal(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Handle Pill */}
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

              {/* Header Modal */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-rose-50/60 dark:bg-rose-950/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <AlertCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Daftar Siswa Belum Absensi
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                      Kelas {currentClassName} • Presensi Manual Petugas Kelas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBelumAbsenModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body: Responsive PendingSiswaModule */}
              <div className="p-2 sm:p-6 overflow-y-auto space-y-4 flex-1">
                <Suspense fallback={
                  <div className="py-20 text-center space-y-3">
                    <Loader className="animate-spin mx-auto text-rose-500" size={32} />
                    <p className="text-xs font-bold text-slate-400">Memuat daftar siswa belum absen...</p>
                  </div>
                }>
                  <PendingSiswaModule
                    notPresent={notPresentData}
                    notPresentLoading={notPresentLoading}
                    miniStats={miniStatsData}
                    selectedKelasId={siswaProfile?.kelas_id || ''}
                    setSelectedKelasId={() => {}}
                    kelasOptions={[]}
                    isPetugasSiswa={true}
                    userRole="PETUGAS_KELAS"
                    socketConnected={true}
                    refreshData={refetchNotPresent}
                  />
                </Suspense>
              </div>

              {/* Footer Modal */}
              <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                  Presensi manual akan langsung tersinkron secara real-time.
                </span>
                <button
                  onClick={() => setShowBelumAbsenModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shrink-0"
                >
                  Selesai &amp; Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SiswaDashboard;

