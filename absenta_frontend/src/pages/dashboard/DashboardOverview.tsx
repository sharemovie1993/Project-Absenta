import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, GraduationCap, Users, History, ShieldAlert } from "lucide-react";
import { getDashboardOverview, getAttendanceChart } from "../../api/dashboard.api";
import { getAcademicStats, type AcademicStats } from "../../api/academic-stats.api";
import { getAcademicRegistrationStats } from "../../api/academic/siswa.api";
import type { DashboardOverviewStats, ChartData } from "../../types/dashboard";
import { useAuthStore } from "../../store/authStore";
import { useCapabilities } from "../../hooks/useCapabilities";
import { isSystemSuperAdmin, isPlatformUser } from "../../utils/rbac";
import { cn } from "../../lib/utils";

const AttendanceChart = lazy(() => import("../../components/charts/AttendanceChart"));
import OnboardingDashboard from "./OnboardingDashboard";
import SimpleOnboardingModal from "../../components/dashboard/SimpleOnboardingModal";
import DashboardEmptyState from "../../components/dashboard/DashboardEmptyState";
import DashboardTipsBanner from "../../components/dashboard/DashboardTipsBanner";
import TrialValueBanner from "../../components/dashboard/TrialValueBanner";
import MarketplacePromoWidget from "../../components/dashboard/MarketplacePromoWidget";
import { getActiveTahunPelajaran } from "../../api/academic/tahunPelajaran.api";
import { isPetugasActive } from "../../api/attendanceGerbang.api";
import { AnalyticsCard } from "../../components/ui/AnalyticsCard";
import { Button, Modal, ModalFooter } from "../../components/ui";
import { useInstruction } from "../../contexts/InstructionContext";
import { MyJobdeskWidget } from "../../components/dashboard/MyJobdeskWidget";

import { Loader } from "../../components/ui/Loader";

interface TrendData {
  value: number;
  isPositive: boolean;
}

// Role-based Dashboards
const UnifiedStaffDashboard = lazy(() => import("../../components/dashboard/roles/UnifiedStaffDashboard").then(module => ({ default: module.UnifiedStaffDashboard })));
const SiswaDashboard = lazy(() => import("../../components/dashboard/roles/SiswaDashboard").then(module => ({ default: module.SiswaDashboard })));
const PetugasDashboard = lazy(() => import("../../components/dashboard/roles/PetugasDashboard").then(module => ({ default: module.PetugasDashboard })));
const GerbangDashboard = lazy(() => import("../../components/dashboard/roles/GerbangDashboard").then(module => ({ default: module.GerbangDashboard })));
const KepalaSekolahDashboard = lazy(() => import("../../components/dashboard/roles/KepalaSekolahDashboard").then(module => ({ default: module.KepalaSekolahDashboard })));
const OrtuDashboard = lazy(() => import("../../apps/parent/pages/ParentDashboard"));

export default function DashboardOverview() {
  // ----------------------------------------------------------------------
  // 1. Hooks & State Declarations (MUST BE TOP LEVEL)
  // ----------------------------------------------------------------------
  
  const { user, isAuthenticated, token, hasCompletedOnboarding, subscription, markOnboardingCompleted, isLoading: isAuthLoading, loadUser } = useAuthStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardOverviewStats | null>(null);
  const [academicStats, setAcademicStats] = useState<AcademicStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveTahunPelajaran, setHasActiveTahunPelajaran] = useState<boolean>(false);
  const [showSubscriptionIssueModal, setShowSubscriptionIssueModal] = useState(false);
  const subscriptionIssueModalShownRef = useRef(false);
  const [trends, setTrends] = useState<{
    siswa: TrendData;
    guru: TrendData;
    kehadiranSiswa: TrendData;
    kehadiranGuru: TrendData;
  } | null>(null);

  // Onboarding & Banners State
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showTipsBanner, setShowTipsBanner] = useState(true);
  const [showTrialBanner, setShowTrialBanner] = useState(true);

  const [activeView, setActiveView] = useState<string>('default');

  const [registrationStats, setRegistrationStats] = useState<{ registered: number; total_active: number } | null>(null);

  const { setInstructionData } = useInstruction();

  // ----------------------------------------------------------------------
  // 2. Derived Values (Safe to compute early if they depend on props/state)
  // ----------------------------------------------------------------------

  const roleName = typeof user?.role === 'string' ? user.role : (user?.role?.name || (user as any)?.roleName);
  const caps = user?.capabilities || [];
  const isAdminOrSuperadmin = roleName === 'SUPERADMIN' || roleName === 'ADMIN' || isSystemSuperAdmin(roleName, user?.tenant_id);
  const canOverview = isAdminOrSuperadmin && caps.includes('dashboard.view.overview');
  
  const { isHubin, isSarpras, isTU } = useCapabilities();
  
  // Logic Onboarding: tampilkan untuk ADMIN/GURU/SISWA yang memiliki tenant
  const shouldOnboard = false; // Disabled
  
  // Logic Empty State: Jika total siswa 0 dan total guru 0, anggap belum ada data
  const isEmptyState = (stats?.total_siswa === 0) && (stats?.total_guru === 0);

  const persentaseGuru = stats?.persentase_guru ?? 0;
  const isSubscriptionIssue = false; // Disabled
  
  // Check if session has been created (Patch D & F)
  // Use localStorage as primary flag, fallback to attendance stats if available
  const hasCreatedSession = !!localStorage.getItem(`first_action_done_session_${user?.id}`) || 
                            (stats?.siswa_hadir || 0) > 0 || 
                            (stats?.guru_hadir || 0) > 0;

  // ----------------------------------------------------------------------
  // 3. Memoized Values
  // ----------------------------------------------------------------------

  // ----------------------------------------------------------------------
  // 3. Memoized Values
  // ----------------------------------------------------------------------

  const trialDaysLeft = useMemo(() => {
    if (subscription?.status === 'TRIAL' && subscription.end_date) {
      const end = new Date(subscription.end_date);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    return 0;
  }, [subscription]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Pagi";
    if (hour < 15) return "Siang";
    if (hour < 19) return "Sore";
    return "Malam";
  };

  const quickActions = [
    { label: 'Tahun Pelajaran', icon: CalendarCheck, onClick: () => navigate('/academic/tahun-pelajaran'), color: 'blue' },
    { label: 'Data Siswa', icon: GraduationCap, onClick: () => navigate('/academic/siswa'), color: 'indigo' },
    { label: 'Kejadian Khusus', icon: ShieldAlert, onClick: () => navigate('/attendance/settings?tab=events'), color: 'rose' },
    { label: 'Log Aktivitas', icon: History, onClick: () => navigate('/academic/staff-logs'), color: 'slate' },
  ];

  const renderOverviewContent = () => (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Selamat {getTimeGreeting()}, {user?.name || 'Admin'} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Inilah ringkasan aktivitas sekolah Anda hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action, idx) => {
          const colorsMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100',
            indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100',
            rose: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100',
            slate: 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100',
          };
          const colorClass = colorsMap[action.color || 'blue'];
          
          return (
            <button
              key={idx}
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300 group shadow-sm",
                colorClass
              )}
            >
              <div className="p-2 rounded-xl bg-white/80 shadow-sm group-hover:scale-110 transition-transform">
                <action.icon size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{action.label}</span>
            </button>
          );
        })}
      </div>

      <>
        {/* Marketplace Upsell disabled per user request */}
        {/* {((subscription?.Plan?.name === 'CORE_PLATFORM' || subscription?.plan?.name === 'CORE_PLATFORM') || subscription?.status === 'TRIAL') && isAdminOrSuperadmin && (
          <div className="mb-8">
            <MarketplacePromoWidget />
          </div>
        )} */}

        {/* Trial-to-Value Hint disabled per user request */}
        {/* {showTrialBanner && subscription?.status === 'TRIAL' && (trialDaysLeft < 5) && hasCreatedSession && (
          <TrialValueBanner 
            trialDaysLeft={trialDaysLeft}
            onDismiss={() => setShowTrialBanner(false)}
          />
        )} */}



          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AnalyticsCard
              title="Total Siswa"
              value={stats?.total_siswa || 0}
              subtitle="Siswa terdaftar"
              growth={trends?.siswa ? (trends.siswa.isPositive ? trends.siswa.value : -trends.siswa.value) : undefined}
              icon={<Users size={20} />}
              gradient="from-indigo-500 to-purple-600"
              onClick={() => navigate('/academic/siswa')}
            />
            <AnalyticsCard
              title="Total Guru"
              value={stats?.total_guru || 0}
              subtitle="Guru aktif"
              growth={trends?.guru ? (trends.guru.isPositive ? trends.guru.value : -trends.guru.value) : undefined}
              icon={<GraduationCap size={20} />}
              gradient="from-blue-500 to-cyan-600"
              onClick={() => navigate('/academic/guru')}
            />
            <AnalyticsCard
              title="Kehadiran Siswa"
              value={`${(stats?.persentase_siswa ?? 0).toFixed(1)}%`}
              subtitle={`${stats?.siswa_hadir ?? 0} dari ${stats?.total_siswa ?? 0} siswa`}
              growth={trends?.kehadiranSiswa ? (trends.kehadiranSiswa.isPositive ? trends.kehadiranSiswa.value : -trends.kehadiranSiswa.value) : undefined}
              icon={<CalendarCheck size={20} />}
              gradient="from-green-500 to-emerald-600"
              onClick={() => navigate('/attendance/rekap/siswa-harian')}
            />
            <AnalyticsCard
              title="Kehadiran Guru"
              value={`${persentaseGuru.toFixed(1)}%`}
              subtitle={`${stats?.guru_hadir ?? 0} guru hadir`}
              growth={trends?.kehadiranGuru ? (trends.kehadiranGuru.isPositive ? trends.kehadiranGuru.value : -trends.kehadiranGuru.value) : undefined}
              icon={<CalendarCheck size={20} />}
              gradient="from-yellow-500 to-orange-600"
              onClick={() => navigate('/attendance/monitoring')}
            />
          </div>

          {/* Attendance Chart */}
          <div className="mb-8">
            <Suspense fallback={<div className="h-[350px] flex items-center justify-center"><Loader /></div>}>
              <AttendanceChart 
                data={chartData}
                title="Tren Kehadiran Bulanan"
                height={350}
              />
            </Suspense>
          </div>

          {/* Detailed Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Kehadiran Siswa</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hadir</span>
                  <span className="font-semibold text-green-600">{stats?.siswa_hadir || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Izin</span>
                  <span className="font-semibold text-yellow-600">{stats?.siswa_izin || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sakit</span>
                  <span className="font-semibold text-blue-600">{stats?.siswa_sakit || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Alpa</span>
                  <span className="font-semibold text-red-600">{stats?.siswa_alpa || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Kehadiran Guru</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hadir</span>
                  <span className="font-semibold text-green-600">{stats?.guru_hadir || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tidak Hadir</span>
                  <span className="font-semibold text-red-600">{stats?.guru_tidak_hadir || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      </>
    );

  // Determine available views based on role
  const availableViews = useMemo(() => {
    const views: { id: string; label: string; component: React.ReactNode }[] = [];
    const hasCap = (cap: string) => caps.includes(cap);

    // 0. OVERVIEW (Admin/Main)
    if (canOverview) {
      views.push({ id: 'overview', label: 'Overview', component: renderOverviewContent() });
    }

    // 1. GERBANG (Petugas Gerbang / Satpam atau Guru dengan Jabatan Petugas Gerbang)
    const isSiswa = roleName === 'SISWA';
    const isGerbangPosition =
      roleName === 'GERBANG' ||
      roleName === 'PETUGAS_GERBANG' ||
      ((user?.guru_profile as any)?.jabatan || '').toLowerCase().includes('gerbang') ||
      ((user as any)?.jabatan || '').toLowerCase().includes('gerbang') ||
      (user as any)?.position_codes?.includes('GERBANG') ||
      hasCap('dashboard.view.gerbang') ||
      hasCap('attendance.gate.tap.entry');

    if (!isAdminOrSuperadmin && !isSiswa && isGerbangPosition) {
      if (!views.find(v => v.id === 'gerbang')) {
        views.push({ id: 'gerbang', label: 'Petugas Gerbang', component: <GerbangDashboard /> });
      }
    }


    // 2. PETUGAS KELAS (Only for non-SISWA roles, SISWA uses Unified SiswaDashboard)
    if (hasCap('dashboard.view.petugas') && roleName !== 'SISWA') {
      if (!views.find(v => v.id === 'petugas')) {
        views.push({ id: 'petugas', label: 'Petugas Kelas', component: <PetugasDashboard /> });
      }
    }

    // 3. STAFF DASHBOARD (Unified) or KEPALA SEKOLAH DASHBOARD (Executive)
    // Any role that is fundamentally a Staff/Teacher/Gerbang gets the Unified view
    const isStaff = ['GURU', 'KEPALA_SEKOLAH', 'KURIKULUM', 'WAKAKUR', 'KESISWAAN', 'WAKASIS', 'PETUGAS_KELAS', 'TU', 'HUBIN', 'SARPRAS', 'KAPROG', 'GERBANG', 'PETUGAS_GERBANG'].includes(roleName || '');
    const hasStaffCaps = hasCap('dashboard.view.guru') || hasCap('dashboard.view.walikelas') || hasCap('dashboard.view.kepsek') || hasCap('dashboard.view.gerbang') || hasCap('attendance.scan');
    
    if (isStaff || hasStaffCaps) {
      const isKepsekRole = roleName === 'KEPALA_SEKOLAH' || 
                           hasCap('dashboard.view.kepsek') || 
                           ((user?.guru_profile as any)?.jabatan || '').toUpperCase().includes('KEPALA');
      
      if (isKepsekRole) {
        if (!views.find(v => v.id === 'kepsek_dashboard')) {
          views.push({ id: 'kepsek_dashboard', label: 'Dashboard Eksekutif', component: <KepalaSekolahDashboard /> });
        }
      } else {
        if (!views.find(v => v.id === 'unified_staff')) {
          views.push({ id: 'unified_staff', label: 'Dashboard Pribadi', component: <UnifiedStaffDashboard /> });
        }
      }
    }

    // 4. SISWA (Base View)
    if (roleName === 'SISWA') {
       if (!views.find(v => v.id === 'siswa')) {
          views.push({ id: 'siswa', label: 'Dashboard Siswa', component: <SiswaDashboard /> });
       }
    }

    // 5. ORTU / PARENT PORTAL (Khusus pengguna ber-role Orang Tua)
    if (['ORTU', 'ORANG_TUA', 'PARENT', 'WALI_MURID'].includes(roleName || '')) {
       if (!views.find(v => v.id === 'ortu')) {
          views.push({ id: 'ortu', label: 'Dashboard Orang Tua', component: <OrtuDashboard /> });
       }
    }

    return views;
  }, [roleName, caps, isHubin, isSarpras, isTU, hasActiveTahunPelajaran]);

  // ----------------------------------------------------------------------
  // 4. Effects
  // ----------------------------------------------------------------------

  // Enforce Billing Redirect (Strict)
  useEffect(() => {
    // Only redirect if auth is loaded and we are sure about subscription status
    if (!isAuthLoading && subscription?.status === 'PENDING_PAYMENT' && user?.role?.name !== 'SUPERADMIN') {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/service-center') && !currentPath.startsWith('/invoice')) {
        navigate('/service-center');
      }
    }
  }, [subscription, user, navigate, isAuthLoading]);

  // Redirect Platform Users to their relevant primary pages (CS / Finance / Infra)
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      if (roleName === 'PLATFORM_SUPPORT') {
        navigate('/tenants');
      } else if (roleName === 'PLATFORM_FINANCE') {
        navigate('/superadmin/intelligence/revenue');
      } else if (roleName === 'PLATFORM_INFRASTRUCTURE') {
        navigate('/superadmin/infra');
      }
    }
  }, [roleName, user, isAuthenticated, isAuthLoading, navigate]);

  useEffect(() => {
    if (!isSubscriptionIssue) {
      subscriptionIssueModalShownRef.current = false;
      setShowSubscriptionIssueModal(false);
      return;
    }
    if (!subscriptionIssueModalShownRef.current) {
      subscriptionIssueModalShownRef.current = true;
      setShowSubscriptionIssueModal(true);
    }
  }, [isSubscriptionIssue]);

  // Handle Instructions for Setup (Patch G: Smart Humanist)
  useEffect(() => {
    const fetchRegStats = async () => {
       if (academicStats?.tahun_pelajaran?.id && academicStats?.semester?.id) {
         try {
           const rs = await getAcademicRegistrationStats(academicStats.tahun_pelajaran.id, academicStats.semester.id);
           setRegistrationStats(rs);
         } catch (e) {
           console.error("Failed to fetch registration stats", e);
         }
       }
    };
    fetchRegStats();
  }, [academicStats, loading]);

  useEffect(() => {
    if (loading || isAuthLoading) return;

    if (isEmptyState && isAdminOrSuperadmin && academicStats && stats) {
      const tpDone = (academicStats.total_tahun_pelajaran || 0) > 0 && hasActiveTahunPelajaran;
      const smtDone = (academicStats.total_semester || 0) > 0;
      const jurDone = (academicStats.total_jurusan || 0) > 0;
      const klsDone = (academicStats.total_kelas || 0) > 0;
      const guruDone = (stats.total_guru || 0) > 0;
      const siswaDone = (stats.total_siswa || 0) > 0;
      const regDone = (registrationStats?.registered || 0) > 0;
      const sesiDone = (stats?.total_sesi_aktif || 0) > 0 || hasCreatedSession;

      setInstructionData({
        title: "Panduan Setup Akademik",
        description: "Ikuti langkah berikut untuk mengaktifkan sistem Absenta di sekolah Anda. Klik pada langkah yang belum selesai.",
        items: [
          { 
            text: "Tetapkan Tahun Pelajaran Aktif", 
            path: "/academic/tahun-pelajaran",
            completed: tpDone
          },
          { 
            text: "Aktifkan Semester Berjalan", 
            path: "/academic/semester",
            completed: smtDone
          },
          { 
            text: "Siapkan Struktur Jurusan", 
            path: "/academic/jurusan",
            completed: jurDone
          },
          { 
            text: "Atur Struktur Kelas", 
            path: "/academic/kelas", 
            completed: klsDone
          },
          { 
            text: "Input Data Master Guru & Siswa", 
            path: "/academic/siswa",
            completed: (guruDone && siswaDone)
          },
          { 
            text: "Registrasi Akademik (Sync Siswa)", 
            path: "/academic/registrasi-siswa",
            completed: regDone
          },
          { 
            text: "Buat Sesi Absensi Pertama", 
            path: "/attendance/sesi",
            completed: sesiDone
          }
        ],
        tips: [
          "Gunakan fitur Import Excel di menu Siswa/Guru untuk mempercepat setup.",
          "Setelah sinkronisasi Siswa Akademik, data siswa baru akan muncul di menu absensi."
        ]
      });
    } else {
      // Clear or set default instructions when data exists
      if (isAdminOrSuperadmin) {
        setInstructionData({
          title: "Dashboard Operasional",
          description: "Kelola operasional harian sekolah Anda. Gunakan shortcut untuk akses cepat.",
          items: [
             { text: "Monitor data kehadiran siswa dan guru melalui menu Rekapitulasi." },
             { text: "Cek laporan bulanan di menu Rekapitulasi." },
             { text: "Kelola pelanggaran di menu Kesiswaan." }
          ],
          tips: [
            "Gunakan Shortcut Ctrl+K untuk mencari menu.",
            "Data diperbarui otomatis setiap kali ada aktivitas scan."
          ]
        });
      } else {
        setInstructionData(null);
      }
    }

    return () => setInstructionData(null);
  }, [isEmptyState, isAdminOrSuperadmin, loading, isAuthLoading, academicStats, stats, registrationStats, hasActiveTahunPelajaran, hasCreatedSession]);

  // Effect untuk menampilkan Onboarding Modal
  useEffect(() => {
    // Tunggu sampai stats terload untuk cek isEmptyState, atau gunakan hasCompletedOnboarding
    // Jika loading masih true, jangan putuskan dulu
    if (loading || isAuthLoading) return;

    if (shouldOnboard) {
      // Trigger: Belum onboarding ATAU Data Kosong
      if (!hasCompletedOnboarding || isEmptyState) {
        const hasSeen = localStorage.getItem(`onboarding_seen_${user?.id}`);
        if (!hasSeen) {
          setShowOnboarding(true);
        }
      }
    }
  }, [shouldOnboard, user?.id, hasCompletedOnboarding, isEmptyState, loading, isAuthLoading]);

  // Ensure one-time capability fetch if missing
  const capsFetchRef = useRef(false);
  useEffect(() => {
    // Only for GURU/SISWA who need caps
    const roleName = user?.role?.name;
    if (isAuthenticated && (roleName === 'GURU' || roleName === 'SISWA')) {
        const hasCaps = user?.capabilities && user.capabilities.length > 0;
        if (!hasCaps && !capsFetchRef.current) {
            capsFetchRef.current = true;
            // Trigger loadUser via store directly to avoid dependency loop if we used a local function
            useAuthStore.getState().loadUser().catch(console.error);
        }
    }
  }, [isAuthenticated, user?.role?.name, user?.capabilities]);


  // Set default view on load
  useEffect(() => {
    if (availableViews.length > 0 && activeView === 'default') {
      const isGerbangUser = 
        roleName === 'GERBANG' || 
        roleName === 'PETUGAS_GERBANG' ||
        ((user?.guru_profile as any)?.jabatan || '').toLowerCase().includes('gerbang') ||
        ((user as any)?.jabatan || '').toLowerCase().includes('gerbang') ||
        caps.includes('attendance.gate.tap.entry') ||
        caps.includes('dashboard.view.gerbang');

      const hasPetugas = caps.includes('dashboard.view.petugas');
      const isAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
      const hasGuruProfile = !!user?.guru_profile?.id || !!(user as any)?.guru?.id;

      const savedView = user?.id ? localStorage.getItem(`preferred_view_${user.id}`) : null;

      if (savedView && availableViews.some(v => v.id === savedView)) {
        setActiveView(savedView);
      } else if (isGerbangUser && availableViews.some(v => v.id === 'gerbang')) {
        setActiveView('gerbang');
      } else if (hasPetugas && !isAdmin && availableViews.some(v => v.id === 'petugas')) {
        setActiveView('petugas');
      } else if (roleName === 'GURU' || (hasGuruProfile && !isAdmin)) {
        setActiveView('unified_staff');
      } else {
        // Fallback to the first available view
        setActiveView(availableViews[0].id);
      }
    }
  }, [availableViews, activeView, caps, roleName, user]);

  // Data Fetching Effect
  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth to complete

    const fetchDashboardData = async () => {
      try {
        const actualRoleName = typeof user?.role === 'string' ? user.role : (user?.role?.name || (user as any)?.roleName);
        if (isPlatformUser(actualRoleName, user?.tenant_id)) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Debug authentication state
        console.log('Authentication state:', {
          isAuthenticated,
          hasUser: !!user,
          hasToken: !!token,
          tokenFromStorage: !!localStorage.getItem('access_token'),
          tenantId: localStorage.getItem('tenant_id'),
          userRole: user?.role?.name
        });

        // Check if user is authenticated
        if (!isAuthenticated || !token) {
          setError('User tidak terautentikasi. Silakan login kembali.');
          return;
        }

        if (!canOverview) {
           // Fetch only safe endpoints needed for basic functionality
           const activeTpData = await getActiveTahunPelajaran().catch(() => null);
           setHasActiveTahunPelajaran(!!activeTpData);
           
           // Fetch petugas status for relevant roles
           try {
              if (roleName === 'SISWA' || roleName === 'GURU' || roleName === 'PETUGAS_KELAS') {
                const petugas = await isPetugasActive();
                localStorage.setItem(`petugas_active_${user?.id}`, String(!!petugas?.data?.active));
              }
           } catch (e) {
              if (user?.id) localStorage.setItem(`petugas_active_${user?.id}`, 'false');
           }
           
           setLoading(false);
           return;
        }

        // Fetch data in parallel for ADMIN/SUPERADMIN
        const [overviewData, chartResponse, academicData, activeTpData] = await Promise.all([
          getDashboardOverview(),
          getAttendanceChart(),
          getAcademicStats(),
          getActiveTahunPelajaran()
        ]);

        setStats(overviewData.data);
        setChartData(chartResponse.data);
        setAcademicStats(academicData.data);
        setHasActiveTahunPelajaran(!!activeTpData);

        // Cek status petugas aktif untuk SISWA/GURU (optional hint untuk onboarding)
        try {
          if (user?.role?.name === 'SISWA' || user?.role?.name === 'GURU') {
            const petugas = await isPetugasActive();
            localStorage.setItem(`petugas_active_${user?.id}`, String(!!petugas?.data?.active));
          }
        } catch (e) {
          if (user?.id) localStorage.setItem(`petugas_active_${user?.id}`, 'false');
        }

        // Fetch historical data for trend calculation
        const fetchHistoricalData = async () => {
          try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);
            const yesterdayData = await getDashboardOverview(yesterdayStr);
            return yesterdayData.data;
          } catch (error) {
            console.error('Error fetching historical data:', error);
            return null;
          }
        };

        const historicalData = await fetchHistoricalData();

        // Calculate trends if historical data is available
        const calculateTrend = (current: number, previous: number): TrendData => {
            if (previous === 0) {
              return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
            }
            const percentageChange = ((current - previous) / previous) * 100;
            return {
              value: Math.abs(Math.round(percentageChange * 10) / 10), // Round to 1 decimal
              isPositive: percentageChange >= 0
            };
        };

        if (historicalData && overviewData.data) {
          const currentStats = overviewData.data;
          
          setTrends({
            siswa: calculateTrend(currentStats.total_siswa, historicalData.total_siswa),
            guru: calculateTrend(currentStats.total_guru, historicalData.total_guru),
            kehadiranSiswa: calculateTrend(currentStats.persentase_siswa, historicalData.persentase_siswa),
            kehadiranGuru: calculateTrend(currentStats.persentase_guru, historicalData.persentase_guru)
          });
        } else {
          // Fallback to default trends if no historical data
          setTrends({
            siswa: { value: 0, isPositive: true },
            guru: { value: 0, isPositive: true },
            kehadiranSiswa: { value: 0, isPositive: true },
            kehadiranGuru: { value: 0, isPositive: true }
          });
        }

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message
        });
        
        if (err.response?.status === 401) {
          setError('Sesi Anda telah berakhir. Silakan login kembali.');
        } else if (err.response?.status === 400) {
          setError('Permintaan tidak valid. Periksa data yang dikirim.');
        } else {
          setError(err.response?.data?.message || err.message || 'Gagal mengambil data dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, token, user?.id, isAuthLoading]);

  // ----------------------------------------------------------------------
  // 5. Helpers
  // ----------------------------------------------------------------------

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    if (user?.id) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
    }
  };

  const renderRoleSwitcher = () => {
    const isGerbang = (user as any)?.position_codes?.includes('GERBANG');
    if (availableViews.length < 2 || isGerbang) return null;
    return (
      <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl inline-flex overflow-x-auto max-w-full border border-slate-200/80 dark:border-slate-700 shadow-sm">
        {availableViews.map((view) => (
          <button
            key={view.id}
            onClick={() => {
              setActiveView(view.id);
              if (user?.id) {
                localStorage.setItem(`preferred_view_${user.id}`, view.id);
              }
            }}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              (activeView === view.id || (activeView === 'default' && availableViews[0].id === view.id))
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/50 dark:border-slate-800'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // 6. Early Returns (Rendering)
  // ----------------------------------------------------------------------

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  // Loading state (local)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // PATCH 1: Don't show generic error for valid subscription states (handled by global banner)
    if (isSubscriptionIssue) {
      {/* Local subscription issue modal disabled */}
    }

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // 7. Main Render Logic
  // ----------------------------------------------------------------------

  // Determine effective view: activeView if found, otherwise first available view
  const currentView = availableViews.find(v => v.id === activeView) || availableViews[0];

  if (!hasCompletedOnboarding && isAdminOrSuperadmin) {
    return <OnboardingDashboard />;
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Peta Tugas Harian Terintegrasi Universal (Hanya Staf & Pegawai selain Dashboard Guru) */}
      {roleName !== 'SISWA' && activeView !== 'unified_staff' && <MyJobdeskWidget />}

      {/* Onboarding Modal */}
      {/* <SimpleOnboardingModal 
        isOpen={showOnboarding} 
        onClose={handleCloseOnboarding}
        isTrial={subscription?.status === 'TRIAL'}
        trialDays={trialDaysLeft || 0}
        roleName={roleName}
        isPetugasActive={!!(user?.id && localStorage.getItem(`petugas_active_${user.id}`) === 'true')}
      /> */}

      {availableViews.length > 0 ? (
        <>
          {renderRoleSwitcher()}
          <Suspense fallback={<div className="flex justify-center py-10"><Loader size="lg" /></div>}>
            {currentView?.component || <div className="text-center py-20 text-gray-500">Tampilan tidak tersedia.</div>}
          </Suspense>
        </>
      ) : (
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tidak Ada Akses Dashboard</h2>
          <p className="text-gray-500">Akun Anda belum memiliki izin untuk mengakses dashboard apa pun.</p>
        </div>
      )}
    </div>
  );
}
