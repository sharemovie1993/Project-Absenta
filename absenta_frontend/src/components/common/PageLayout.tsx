import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Alert';
import toast from 'react-hot-toast';
import { useInstruction, type InstructionData } from '../../contexts/InstructionContext';
import { useCapabilities } from '../../hooks/useCapabilities';
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
  const { isAdmin } = useCapabilities();
  const navigate = useNavigate();
  const location = useLocation();
  const isNotDashboard = location.pathname !== '/' && location.pathname !== '/dashboard';

  const handleGoBack = useCallback(() => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);
  const canView = useMemo(() => {
    if (isAdmin) return true;
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
    <div className="px-0 sm:px-4 pt-1.5 sm:pt-2 pb-8 space-y-4 max-w-full overflow-x-hidden relative animate-in fade-in duration-300">
      {/* Top Navigation & Hardening Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200 py-0.5">
        <div className="flex items-center gap-3">
          {isNotDashboard && (
            <button
              type="button"
              onClick={handleGoBack}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 text-xs font-black transition-all duration-200 border border-slate-200/80 dark:border-slate-800 cursor-pointer shadow-2xs hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 select-none"
              title="Kembali ke halaman sebelumnya"
            >
              <ArrowLeft size={14} className="stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
              <span className="tracking-tight">Kembali</span>
            </button>
          )}

          {hardeningConfig && resolvedKey && (
            <HardeningInspector 
              pageName={hardeningConfig.displayName}
              standards={hardeningConfig.standards}
              moduleKey={resolvedKey}
            />
          )}
        </div>

        {toolbar && (
          <div className="w-full sm:w-auto ml-auto">
            {toolbar}
          </div>
        )}
      </div>

      {/* Unified Main Content Container */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
