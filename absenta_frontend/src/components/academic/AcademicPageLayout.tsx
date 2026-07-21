import React, { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AnalyticsCard, MemoizedAnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Alert';
import toast from 'react-hot-toast';
import { useInstruction, type InstructionData } from '../../contexts/InstructionContext';
import { useAuth } from '../../hooks/useAuth';
import Breadcrumb, { type BreadcrumbItem } from '@/components/ui/Breadcrumb';

// Impor komponen standardisasi hardening terpusat tingkat layout
import { InfraErrorBoundary } from '../superadmin/infra/InfraErrorBoundary';
import { HardeningInspector } from '../superadmin/infra/InfraSharedComponents';
import { getHardeningConfig } from '../../config/hardeningRegistry';
import auditReport from '../../config/hardeningAuditReport.json';
import { useTvStore } from '@/store/tvStore';

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
  const { isAdmin, user } = useAuth();
  const { isTvMode } = useTvStore();


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
    if (isAdmin()) return true;
    return canViewProp;
  }, [isAdmin, canViewProp, user]);

  // Set Instruction Panel Content
  useEffect(() => {
    if (instruction) {
      setInstructionData(instruction);
    }
    return () => setInstructionData(null);
  }, [instruction, setInstructionData]);

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
      "space-y-4 max-w-full relative transition-all duration-300",
      isTvMode ? "p-6 min-h-screen" : "px-4 pt-2 pb-6"
    )}>

      {/* TV Mode Header Bar */}
      {isTvMode && (title || toolbar) && (
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            {title && (
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
          {toolbar && (
            <div className="flex items-center gap-3">
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* Responsive Breadcrumbs */}
      {!isTvMode && (breadcrumbs === undefined || breadcrumbs.length > 0) && (
        <div className="flex items-center">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      {/* Page Header */}
      {!isTvMode && (title || description || toolbar) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            {title && (
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 tracking-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-[13px] text-slate-700 dark:text-slate-400 mt-0.5 font-medium leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {toolbar && (
            <div className="w-full md:w-auto">
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* Renders dynamic interactive certification badge at Layout-level */}
      {!isTvMode && hardeningConfig && resolvedKey && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 py-0.5">
          <HardeningInspector 
            pageName={hardeningConfig.displayName}
            standards={hardeningConfig.standards}
            moduleKey={resolvedKey}
          />
        </div>
      )}

      {/* Premium Stats Grid */}
      {(stats.length > 0 || isLoadingStats) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[80px]">
          {isLoadingStats ? (
            // Render 2 skeletons on mobile/tablet, 4 on desktop to match layout
            [...Array(4)].map((_, i) => (
              <div key={i} className={cn(
                "h-[80px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-xl animate-pulse",
                i >= 1 && "hidden sm:block",
                i >= 2 && "hidden lg:block"
              )} />
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
                variant={stat.variant}
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
          {children}
        </InfraErrorBoundary>
      </div>
    </div>
  );
});

AcademicPageLayout.displayName = 'AcademicPageLayout';

export default AcademicPageLayout;
