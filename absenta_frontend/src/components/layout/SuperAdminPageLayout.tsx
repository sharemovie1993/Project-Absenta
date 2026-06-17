import React, { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MemoizedAnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Alert';
import { ToastContainer } from '../ui';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui';
import { useInstruction, type InstructionData } from '../../contexts/InstructionContext';

// Impor komponen standardisasi hardening terpusat tingkat layout
import { HardeningInspector } from '../superadmin/infra/InfraSharedComponents';
import { getHardeningConfig } from '../../config/hardeningRegistry';
import auditReport from '../../config/hardeningAuditReport.json';

interface SuperAdminStat {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
  onClick?: () => void;
}

interface SuperAdminPageLayoutProps {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  stats?: SuperAdminStat[];
  isLoadingStats?: boolean;
  instruction?: InstructionData;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  canView?: boolean;
  permissionMessage?: string;
  hardeningModuleKey?: string; // Properti opsional pemegang kunci kepatuhan
}

export const SuperAdminPageLayout: React.FC<SuperAdminPageLayoutProps> = ({
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
  permissionMessage = "Anda tidak memiliki izin akses Superadmin untuk melihat halaman ini.",
  hardeningModuleKey
}) => {
  const { setInstructionData } = useInstruction();
  const { user } = useAuth();
  const { toasts, removeToast } = useToast();

  // Set Instruction Panel Content
  useEffect(() => {
    if (instruction) {
      setInstructionData(instruction);
    }
    return () => setInstructionData(null);
  }, [instruction, setInstructionData]);

  // Validasi peran Superadmin yang ketat dan aman (case-insensitive)
  const isSuperAdmin = useMemo(() => {
    return String(user?.role?.name || '').toUpperCase() === 'SUPERADMIN';
  }, [user]);

  const canView = useMemo(() => {
    if (isSuperAdmin) return true;
    return canViewProp;
  }, [isSuperAdmin, canViewProp]);

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
              <h4 className="font-medium text-red-800 dark:text-red-200">Akses Ditolak</h4>
              <p className="text-sm text-red-600 dark:text-red-400">{permissionMessage}</p>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-6 space-y-4 max-w-full overflow-x-hidden relative">
      {/* Toast Notifikasi Global */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Navigasi Breadcrumbs Responsif */}
      {(breadcrumbs === undefined || breadcrumbs.length > 0) && (
        <div className="flex items-center">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      {/* Page Header dengan Gradasi Premium Indigo */}
      {(title || description) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            {title && (
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-700 dark:from-white dark:to-slate-400 tracking-tight">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
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

      {/* Grid Kartu Statistik Premium Responsif (Menghindari visual overlap / squished grid) */}
      {(stats.length > 0 || isLoadingStats) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[80px]">
          {isLoadingStats ? (
            [...Array(Math.min(4, stats.length || 4))].map((_, i) => (
              <div key={i} className={cn(
                "h-[80px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-xl animate-pulse",
                i >= 1 && "hidden sm:block",
                i >= 2 && "hidden lg:block"
              )} />
            ))
          ) : (
            stats.map((stat, idx) => (
              <MemoizedAnalyticsCard
                key={idx}
                title={stat.title}
                value={stat.value}
                isLoading={isLoadingStats}
                icon={stat.icon}
                gradient={stat.gradient}
                subtitle={stat.subtitle}
                onClick={stat.onClick}
              />
            ))
          )}
        </div>
      )}

      {/* Slot Toolbar Opsional (Tempat seragam untuk Filter, Cari, atau Tambah Data) */}
      {toolbar && (
        <div className="mb-2">
          {toolbar}
        </div>
      )}

      {/* Unified Main Content Container */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default SuperAdminPageLayout;
