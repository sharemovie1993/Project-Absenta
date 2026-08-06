import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { MemoizedAnalyticsCard } from '../ui/AnalyticsCard';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { getMyTenant } from '../../api/tenants.api';
import { useInstruction, type InstructionData } from '../../contexts/InstructionContext';

// Hardening & Infrastructure Audit imports
import { InfraErrorBoundary } from '../superadmin/infra/InfraErrorBoundary';
import { HardeningInspector } from '../superadmin/infra/InfraSharedComponents';
import { getHardeningConfig } from '../../config/hardeningRegistry';
import auditReport from '../../config/hardeningAuditReport.json';

export interface OperationalStatItem {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  gradient?: string;
  subtitle?: string;
}

export interface OperationalPageLayoutProps {
  title: string;
  shortTitle?: string;
  subtitle?: string;
  backPath?: string;
  backLabel?: string;
  statusBadge?: React.ReactNode;
  stats?: OperationalStatItem[];
  actions?: React.ReactNode;
  instruction?: InstructionData;
  hardeningModuleKey?: string;
  children: React.ReactNode;
}

export const OperationalPageLayout: React.FC<OperationalPageLayoutProps> = ({
  title,
  shortTitle,
  subtitle,
  backPath = '/dashboard',
  backLabel = 'Kembali ke Dashboard',
  statusBadge,
  stats = [],
  actions,
  instruction,
  hardeningModuleKey,
  children,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setInstructionData } = useInstruction();
  const [tenantName, setTenantName] = useState<string>('');

  const userRole = (user?.role?.name || '').toUpperCase();

  // Automatic Hardening Key Resolution (same engine as AcademicPageLayout)
  const resolvedKey = useMemo(() => {
    if (hardeningModuleKey) return hardeningModuleKey;
    if (typeof window === 'undefined') return null;
    
    const pathname = window.location.pathname;
    const cleanPath = pathname.toLowerCase().replace(/\/$/, "");
    const segments = cleanPath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    const lastSegmentNoHyphen = lastSegment.replace(/-/g, '');
    
    if (cleanPath.endsWith('/piket')) return 'kesiswaan_piket';
    if (cleanPath.includes('/rab-calculator')) return 'billing_rab_calculator';
    if (cleanPath.includes('/verify-siplah')) return 'verify_siplah';
    
    const keys = Object.keys(auditReport);
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
    
    return maxMatchScore >= 1 ? bestMatchKey : null;
  }, [hardeningModuleKey]);

  // Fetch hardening config
  const hardeningConfig = useMemo(() => {
    return resolvedKey ? getHardeningConfig(resolvedKey) : null;
  }, [resolvedKey]);

  // Instruction Context binding
  useEffect(() => {
    if (instruction) {
      setInstructionData(instruction);
    }
    return () => setInstructionData(null);
  }, [instruction, setInstructionData]);

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const res = await getMyTenant();
        if (res?.success && res.data) {
          setTenantName(res.data.nama_sekolah || '');
        }
      } catch (e) {
        // Fallback silent
      }
    };
    loadTenant();
  }, []);

  const [showMobileStats, setShowMobileStats] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased">
      {/* ── STANDARDIZED OPERATIONAL TOPBAR (RESPONSIVE: MOBILE, TABLET, DESKTOP) ── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-md shrink-0 select-none gap-1.5 sm:gap-3 max-w-full overflow-hidden">
        {/* Left Section: Back button & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition border border-white/10 shrink-0 cursor-pointer"
            title={backLabel}
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline truncate max-w-[140px] md:max-w-none">{backLabel}</span>
          </button>

          <div className="h-4 w-px bg-slate-700/80 mx-0.5 hidden sm:block shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <div className="p-1 sm:p-1.5 bg-indigo-600 rounded-lg font-black text-white shrink-0 shadow-xs hidden xs:flex">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm lg:text-base font-black text-white leading-none tracking-tight truncate">
                <span className="sm:hidden">{shortTitle || title}</span>
                <span className="hidden sm:inline">{title}</span>
              </h1>
              <p className="text-[10px] text-indigo-300 font-medium mt-0.5 truncate hidden sm:block">
                {tenantName || 'Absenta.id'} {subtitle ? `• ${subtitle}` : '• Mode Layar Operasional'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Controls, Actions, Theme Toggle, User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 shrink-0">
          {/* HARDENING / AUDIT INSPECTOR TOOL INTEGRATION */}
          {hardeningConfig && resolvedKey && (
            <div className="hidden lg:block">
              <HardeningInspector 
                pageName={hardeningConfig.displayName}
                standards={hardeningConfig.standards}
                moduleKey={resolvedKey}
              />
            </div>
          )}

          {statusBadge && <div className="hidden md:block shrink-0">{statusBadge}</div>}

          {/* Desktop & Tablet Action Buttons */}
          {actions && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0 [&_button]:text-[11px] lg:[&_button]:text-xs [&_button]:px-2.5 lg:[&_button]:px-3.5 [&_button]:py-1 lg:[&_button]:py-1.5 [&_button]:h-auto">
              {actions}
            </div>
          )}

          <div className="bg-slate-800 text-slate-200 rounded-lg border border-slate-700 px-1 py-0.5 flex items-center shrink-0">
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-800 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-[10px] sm:text-xs border border-indigo-500/40 shrink-0">
              {user?.nama?.charAt(0) || user?.full_name?.charAt(0) || 'G'}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-bold text-white leading-none truncate max-w-[120px]">
                {user?.nama || user?.full_name || 'User'}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">{userRole}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE SECONDARY ACTION BAR (Visible on < sm if actions/statusBadge present) ── */}
      {(actions || statusBadge) && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800/90 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-inner">
          {statusBadge && <div className="shrink-0">{statusBadge}</div>}
          {actions && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto [&_button]:text-[10px] [&_button]:px-2.5 [&_button]:py-1 [&_button]:h-8 [&_button]:rounded-lg">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Mobile Hardening Inspector fallback */}
      {hardeningConfig && resolvedKey && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-1 flex justify-center">
          <HardeningInspector 
            pageName={hardeningConfig.displayName}
            standards={hardeningConfig.standards}
            moduleKey={resolvedKey}
          />
        </div>
      )}

      {/* ── COMPACT OPERATIONAL STATS BAR (WITH MOBILE COLLAPSIBLE TOGGLE) ── */}
      {stats.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 py-2 sm:py-3 shrink-0">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Collapsible Toggle Header */}
            <div className="flex sm:hidden items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-2 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px] truncate">
                📊 Ringkasan Statistik
              </span>
              <button
                type="button"
                onClick={() => setShowMobileStats(!showMobileStats)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] shrink-0"
              >
                <span>{showMobileStats ? 'Tutup' : 'Buka'}</span>
                {showMobileStats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {/* Stat Cards Grid */}
            <div className={cn(
              "grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 transition-all duration-300",
              !showMobileStats && "hidden sm:grid"
            )}>
              {stats.map((st, idx) => (
                <MemoizedAnalyticsCard
                  key={idx}
                  title={st.title}
                  value={st.value}
                  icon={st.icon}
                  gradient={st.gradient || 'from-indigo-500 to-blue-600'}
                  subtitle={st.subtitle}
                  variant="premium"
                  mobileCompact={true}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN OPERATIONAL WORKSPACE CANVAS (MARGINLESS ON MOBILE) ── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-0 py-1 sm:px-3.5 sm:py-3.5 space-y-2 sm:space-y-3.5 min-w-0 overflow-x-hidden">
        <InfraErrorBoundary 
          fallbackTitle={`Gagal memuat modul operasional ${title}`}
          queryKeyToInvalidate={resolvedKey ? [resolvedKey] : undefined}
        >
          <div className="w-full space-y-2 sm:space-y-6 max-sm:[&_.op-card]:rounded-none max-sm:[&_.op-card]:border-x-0 max-sm:[&_.op-card]:p-2 max-sm:[&>div]:rounded-none max-sm:[&>div]:border-x-0">
            {children}
          </div>
        </InfraErrorBoundary>
      </main>
    </div>
  );
};

export default OperationalPageLayout;
