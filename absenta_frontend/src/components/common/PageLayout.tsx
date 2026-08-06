import React, { useEffect, useMemo } from 'react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Alert';
import toast from 'react-hot-toast';
import { useInstruction, type InstructionData } from '../../contexts/InstructionContext';
import { useAuth } from '../../hooks/useAuth';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui';

// Impor komponen standardisasi hardening terpusat tingkat layout
import { HardeningInspector } from '../superadmin/infra/InfraSharedComponents';
import { getHardeningConfig } from '../../config/hardeningRegistry';
import auditReport from '../../config/hardeningAuditReport.json';

interface PageStat {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
  onClick?: () => void;
}

interface PageLayoutProps {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  stats?: PageStat[];
  isLoadingStats?: boolean;
  instruction?: InstructionData;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  canView?: boolean;
  permissionMessage?: string;
  hardeningModuleKey?: string; // Properti opsional pemegang kunci kepatuhan
}

export const PageLayout: React.FC<PageLayoutProps> = ({
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
  const { isAdmin } = useAuth();


  // Admin always has access to pages by default
  const canView = useMemo(() => {
    if (isAdmin()) return true;
    return canViewProp;
  }, [isAdmin, canViewProp]);

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
    
    const keys = Object.keys(auditReport);
    
    // Pencocokan skor dinamis cerdas berbasis segmentasi path file fisik dan segmen URL
    let bestMatchKey = null;
    let maxMatchScore = 0;
    
    for (const key of keys) {
      const entry = (auditReport as any)[key];
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
    <div className="px-4 pt-4 pb-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-full overflow-x-hidden relative">

      {/* Responsive Breadcrumbs */}
      {breadcrumbs && (
        <div className="flex items-center">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      {/* Page Header */}
      {(title || description) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            {title && (
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Renders dynamic interactive certification badge at Layout-level */}
      {hardeningConfig && resolvedKey && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200 py-0.5">
          <HardeningInspector 
            pageName={hardeningConfig.displayName}
            standards={hardeningConfig.standards}
            moduleKey={resolvedKey}
          />
        </div>
      )}

      {/* Premium Stats Grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
          {stats.map((stat, idx) => (
            <AnalyticsCard
              key={idx}
              title={stat.title}
              value={stat.value}
              isLoading={isLoadingStats}
              icon={stat.icon}
              gradient={stat.gradient}
              subtitle={stat.subtitle}
              onClick={stat.onClick}
            />
          ))}
        </div>
      )}

      {/* Optional Toolbar Slot */}
      {toolbar && (
        <div className="mb-2">
          {toolbar}
        </div>
      )}

      {/* Unified Main Content Container */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
