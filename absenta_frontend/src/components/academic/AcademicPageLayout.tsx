import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsCard, MemoizedAnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Alert';
import toast from 'react-hot-toast';
import { useInstruction, type InstructionData } from '../../contexts/InstructionContext';
import { useAuthStore } from '../../store/authStore';
import Breadcrumb, { type BreadcrumbItem } from '@/components/ui/Breadcrumb';

// Impor komponen standardisasi hardening terpusat tingkat layout
import { InfraErrorBoundary } from '../superadmin/infra/InfraErrorBoundary';
import { HardeningInspector } from '../superadmin/infra/InfraSharedComponents';
import { getHardeningConfig } from '../../config/hardeningRegistry';
import auditReport from '../../config/hardeningAuditReport.json';
import { useTvStore } from '@/store/tvStore';
import { useCapabilities } from '../../hooks/useCapabilities';

interface AcademicStat {
  title: string;
  value?: React.ReactNode;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
  onClick?: () => void;
  subCards?: { 
    label: string; 
    value: string | number; 
    bgClass?: string; 
    textClass?: string; 
    borderClass?: string;
  }[];
  variant?: 'card' | 'ghost' | 'sub-cards';
}

interface AcademicPageLayoutProps {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  topSlot?: React.ReactNode;
  stats?: AcademicStat[];
  isLoadingStats?: boolean;
  instruction?: InstructionData;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  canView?: boolean;
  permissionMessage?: string;
  hardeningModuleKey?: string; // Properti opsional pemegang kunci konfigurasi kepatuhan
}

export const AcademicPageLayout: React.FC<AcademicPageLayoutProps> = React.memo(({
  title,
  description,
  breadcrumbs,
  topSlot,
  stats = [],
  isLoadingStats = false,
  instruction,
  toolbar,
  children,
  isLoading = false,
  canView: canViewProp = true,
  permissionMessage = "Anda tidak memiliki izin untuk mengakses halaman ini.",
  hardeningModuleKey
}) => {
  const { setInstructionData } = useInstruction();
  const { user } = useAuthStore();
  const { isAdmin, isKepsek } = useCapabilities();
  const { isTvMode } = useTvStore();

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

  const isPortalMode = dashboardMode === 'portal';


  // Resolve key secara otomatis berdasarkan URL browser jika tidak dilewatkan secara manual
  const resolvedKey = useMemo(() => {
    if (hardeningModuleKey) return hardeningModuleKey;
    if (typeof window === 'undefined') return null;
    
    const pathname = window.location.pathname;
    const cleanPath = pathname.toLowerCase().replace(/\/$/, "");
    const segments = cleanPath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    const lastSegmentNoHyphen = lastSegment.replace(/-/g, '');
    
    // Cek override modul utama yang sudah dipetakan secara manual
    if (cleanPath.endsWith('/jenis-pelanggaran')) return 'kesiswaan_jenis_pelanggaran';
    if (cleanPath.endsWith('/monitoring') && cleanPath.includes('/kesiswaan')) return 'kesiswaan_monitoring';
    if (cleanPath.endsWith('/piket')) return 'kesiswaan_piket';
    if (cleanPath.endsWith('/pos-keamanan')) return 'kesiswaan_pos_keamanan';
    if (cleanPath.endsWith('/guru')) return 'academic_guru';
    if (cleanPath.endsWith('/kelas')) return 'academic_kelas';
    if (cleanPath.endsWith('/siswa')) return 'academic_siswa';
    if (cleanPath.endsWith('/struktur-organisasi')) return 'strukturorganisasilist';
    
    const keys = Object.keys(auditReport);
    
    // Pencocokan skor dinamis cerdas berbasis segmentasi path file fisik dan segmen URL
    let bestMatchKey = null;
    let maxMatchScore = 0;
    
    for (const key of keys) {
      const entry = (auditReport as Record<string, { relativePath?: string; filename: string }>)[key];
      if (entry && entry.relativePath) {
        const pathParts = entry.relativePath
          .toLowerCase()
          .replace(/\\/g, '/')
          .replace(/\.tsx?$/, '')
          .replace(/page$/, '')
          .split('/')
          .filter((p: string) => p !== 'src' && p !== 'pages' && p !== 'index');
          
        let matchScore = 0;
        for (const part of pathParts) {
          if (segments.some(seg => seg.includes(part) || part.includes(seg))) {
            matchScore += 1;
          }
        }
        
        // Bobot ekstra untuk kesamaan nama file dasar
        const filenameClean = entry.filename.toLowerCase().replace(/page\.tsx$/, '').replace(/\.tsx$/, '');
        if (lastSegmentNoHyphen === filenameClean || lastSegmentNoHyphen.includes(filenameClean) || filenameClean.includes(lastSegmentNoHyphen)) {
          matchScore += 2;
        }
        
        if (matchScore > maxMatchScore) {
          maxMatchScore = matchScore;
          bestMatchKey = key;
        }
      }
    }
    
    if (maxMatchScore >= 1) {
      return bestMatchKey;
    }
    
    return null;
  }, [hardeningModuleKey]);

  // Ambil parameter kepatuhan hardening secara dinamis dari registry terpusat
  const hardeningConfig = useMemo(() => {
    return resolvedKey ? getHardeningConfig(resolvedKey) : null;
  }, [resolvedKey]);

  // Admin always has access to academic pages
  const canView = useMemo(() => {
    if (isAdmin) return true;
    return canViewProp;
  }, [isAdmin, canViewProp, user]);

  // Set Instruction Panel Content
  useEffect(() => {
    if (instruction) {
      setInstructionData(instruction);
    }
    return () => setInstructionData(null);
  }, [instruction, setInstructionData]);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase().replace(/\/$/, "");
  
  const isMainStaffDashboard = useMemo(() => {
    return currentPath === '' || currentPath === '/' || currentPath === '/dashboard' || currentPath === '/dashboard/overview';
  }, [currentPath]);

  const isModuleRootDashboard = useMemo(() => {
    return [
      '/kurikulum/dashboard', '/kurikulum',
      '/kesiswaan/monitoring', '/kesiswaan',
      '/sarpras/dashboard', '/sarpras',
      '/bpbk/dashboard', '/bpbk',
      '/hubin/dashboard', '/hubin',
      '/bkk/dashboard', '/bkk',
      '/cooperative/dashboard', '/cooperative',
      '/cbt/dashboard', '/cbt',
      '/rapor/dashboard', '/rapor',
      '/correspondence/dashboard', '/correspondence',
      '/attendance/dashboard', '/attendance',
      '/academic/dashboard', '/academic',
      '/piket/dashboard', '/piket'
    ].includes(currentPath);
  }, [currentPath]);

  const handleGoBack = useCallback(() => {
    // 1. Khusus Kepala Sekolah: Selalu utamakan kembali ke Executive Dashboard (/dashboard)
    if (isKepsek) {
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
      return;
    }

    // 2. Jika berada di root modul, kembali ke portal utama /dashboard
    if (isModuleRootDashboard) {
      navigate('/dashboard');
      return;
    }

    // 3. Smart Parent Resolver untuk staff spesialis modul
    if (currentPath.startsWith('/kurikulum')) {
      navigate('/kurikulum/dashboard');
      return;
    }
    if (currentPath.startsWith('/kesiswaan')) {
      navigate('/kesiswaan/monitoring');
      return;
    }
    if (currentPath.startsWith('/sarpras')) {
      navigate('/sarpras/dashboard');
      return;
    }
    if (currentPath.startsWith('/bpbk')) {
      navigate('/bpbk/dashboard');
      return;
    }
    if (currentPath.startsWith('/hubin')) {
      navigate('/hubin/dashboard');
      return;
    }
    if (currentPath.startsWith('/cooperative')) {
      navigate('/cooperative/dashboard');
      return;
    }
    if (currentPath.startsWith('/cbt')) {
      navigate('/cbt/dashboard');
      return;
    }
    if (currentPath.startsWith('/rapor')) {
      navigate('/rapor/dashboard');
      return;
    }
    if (currentPath.startsWith('/correspondence')) {
      navigate('/correspondence/dashboard');
      return;
    }
    if (currentPath.startsWith('/attendance')) {
      navigate('/attendance/dashboard');
      return;
    }
    if (currentPath.startsWith('/academic')) {
      navigate('/dashboard');
      return;
    }

    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate, currentPath, isKepsek, isModuleRootDashboard]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <div className="flex items-center">
            <div className="ml-2">
              <h4 className="font-medium">Akses Ditolak</h4>
              <p className="text-sm">{permissionMessage}</p>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-4 max-w-full relative transition-all duration-300 min-w-0 overflow-x-hidden",
      isTvMode ? "p-6 min-h-screen" : "px-0 sm:px-4 pt-1.5 sm:pt-2 pb-24 sm:pb-6"
    )}>
      {/* Top Slot (Positioned at Top, e.g. App Launcher if provided) */}
      {!isTvMode && topSlot && (
        <div className="px-3 sm:px-0">
          {topSlot}
        </div>
      )}

      {/* Top Navigation & Hardening Bar */}
      {!isTvMode && (
        <div className="px-3 sm:px-0 flex items-center justify-between gap-2.5 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200 py-0.5">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {!isMainStaffDashboard && (
              isModuleRootDashboard ? (
                <Link
                  to="/dashboard"
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 text-xs font-black transition-all duration-200 border border-slate-200/80 dark:border-slate-800 cursor-pointer shadow-2xs hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 select-none shrink-0"
                  title="Kembali ke Dashboard Staff Utama"
                >
                  <ArrowLeft size={14} className="stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
                  <span className="tracking-tight">Dashboard Staff</span>
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleGoBack}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 text-xs font-black transition-all duration-200 border border-slate-200/80 dark:border-slate-800 cursor-pointer shadow-2xs hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 select-none shrink-0"
                    title="Kembali ke halaman sebelumnya"
                  >
                    <ArrowLeft size={14} className="stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
                    <span className="tracking-tight">Kembali</span>
                  </button>

                  <Link
                    to="/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black transition-all duration-200 border border-slate-200/80 dark:border-slate-800 cursor-pointer shadow-2xs select-none shrink-0"
                    title="Langsung ke Dashboard Staff Utama"
                  >
                    <LayoutGrid size={13} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="tracking-tight">Dashboard Staff</span>
                  </Link>
                </>
              )
            )}

            {/* Bilah Status Hardening Dev Audit */}

            {hardeningConfig && resolvedKey && (
              <div className="hidden sm:block">
                <HardeningInspector 
                  pageName={hardeningConfig.displayName}
                  standards={hardeningConfig.standards}
                  moduleKey={resolvedKey}
                />
              </div>
            )}
          </div>

          {toolbar && (
            <div className="w-full sm:w-auto ml-auto">
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* Premium Stats Grid (Analytics Cards) */}
      {(stats.length > 0 || isLoadingStats) && (
        <div className="px-3 sm:px-0 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 min-h-[60px] sm:min-h-[80px]">
          {isLoadingStats ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-[60px] sm:h-[80px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-lg sm:rounded-xl animate-pulse",
                  i >= 2 && "hidden sm:block",
                  i >= 4 && "hidden lg:block"
                )}
              />
            ))
          ) : (
            (stats || []).map((stat, idx) => (
              <MemoizedAnalyticsCard
                key={idx}
                title={stat.title}
                value={stat.value}
                isLoading={isLoadingStats}
                icon={stat.icon}
                gradient={stat.gradient}
                subtitle={stat.subtitle}
                onClick={stat.onClick}
                subCards={stat.subCards}
                variant={stat.variant || 'premium'}
                mobileCompact={true}
              />
            ))
          )}
        </div>
      )}

      {/* Unified Main Content Container - Secured dynamically via Isolated layout-level ErrorBoundary */}
      <div className="w-full">
        <InfraErrorBoundary 
          fallbackTitle={`Gagal memuat halaman ${title || 'Akademik'}`}
          queryKeyToInvalidate={hardeningModuleKey ? [hardeningModuleKey] : undefined}
        >
          <div className="w-full space-y-2 sm:space-y-6 max-sm:[&_.academic-card]:rounded-none max-sm:[&_.academic-card]:border-x-0 max-sm:[&_.academic-card]:p-2 max-sm:[&>div]:rounded-none max-sm:[&>div]:border-x-0">
            {children}
          </div>
        </InfraErrorBoundary>
      </div>
    </div>
  );
});

AcademicPageLayout.displayName = 'AcademicPageLayout';

export default AcademicPageLayout;
