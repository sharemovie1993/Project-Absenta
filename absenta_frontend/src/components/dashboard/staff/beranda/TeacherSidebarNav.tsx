import React from 'react';
import { 
  LayoutDashboard,
  CheckSquare,
  FileText, 
  GraduationCap, 
  Radio,
  BarChart2, 
  ShieldCheck,
  Clock,
  BookOpen,
  Laptop,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeacherSubTabId, TeacherSubTabItem } from './TeacherSubNavPills';

interface TeacherSidebarNavProps {
  activeSubTab: TeacherSubTabId;
  onChangeSubTab: (subTabId: TeacherSubTabId) => void;
  guruNama?: string;
  perangkatRejectedCount?: number;
  unfilledJournalsCount?: number;
  actionHubTotalCount?: number;
  actionHubCriticalCount?: number;
  remedialAlertCount?: number;
  totalJp?: number;
  currentBebanJp?: number;
  targetBebanJp?: number;
  isPengujiSidang?: boolean;
  pengujiSidangUnexaminedCount?: number;
  isPengawasCbt?: boolean;
  pengawasCbtActiveCount?: number;
  className?: string;
}

export const TeacherSidebarNav: React.FC<TeacherSidebarNavProps> = React.memo(({
  activeSubTab,
  onChangeSubTab,
  guruNama,
  perangkatRejectedCount = 0,
  unfilledJournalsCount = 0,
  actionHubTotalCount = 0,
  actionHubCriticalCount = 0,
  remedialAlertCount = 0,
  totalJp = 0,
  currentBebanJp = 0,
  targetBebanJp = 24,
  isPengujiSidang = false,
  pengujiSidangUnexaminedCount = 0,
  isPengawasCbt = false,
  pengawasCbtActiveCount = 0,
  className,
}) => {
  const tabs: TeacherSubTabItem[] = [
    {
      id: 'agenda',
      label: 'Ringkasan',
      icon: LayoutDashboard,
      badgeCount: unfilledJournalsCount > 0 ? unfilledJournalsCount : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'tugas',
      label: 'Tugas Saya',
      icon: CheckSquare,
      badgeCount: actionHubTotalCount > 0 ? actionHubTotalCount : undefined,
      badgeVariant: actionHubCriticalCount > 0 ? 'rose' : 'indigo',
    },
    {
      id: 'perangkat',
      label: 'Perangkat Ajar',
      icon: FileText,
      badgeCount: perangkatRejectedCount > 0 ? perangkatRejectedCount : undefined,
      badgeVariant: 'rose',
    },
    {
      id: 'cbt',
      label: 'Bank Soal CBT',
      icon: Laptop,
    },
    ...(isPengawasCbt ? [
      {
        id: 'pengawas_cbt' as const,
        label: 'Pengawas Ujian CBT',
        icon: Eye,
        badgeCount: pengawasCbtActiveCount > 0 ? pengawasCbtActiveCount : undefined,
        badgeVariant: 'emerald' as const,
        temporaryStyle: 'cbt_radar' as const,
      }
    ] : []),
    {
      id: 'nilai',
      label: 'Buku Nilai',
      icon: GraduationCap,
    },
    {
      id: 'remedial',
      label: 'Radar Remedial',
      icon: Radio,
      badgeCount: remedialAlertCount > 0 ? remedialAlertCount : undefined,
      badgeVariant: 'rose',
    },
    {
      id: 'rekap',
      label: 'Rekap Mapel',
      icon: BarChart2,
    },
    {
      id: 'supervisi',
      label: 'Supervisi Saya',
      icon: ShieldCheck,
    },
    ...(isPengujiSidang ? [
      {
        id: 'sidang_guru' as const,
        label: 'Sidang PKL',
        icon: GraduationCap,
        badgeCount: pengujiSidangUnexaminedCount > 0 ? pengujiSidangUnexaminedCount : undefined,
        badgeVariant: 'amber' as const,
        temporaryStyle: 'sidang_beacon' as const,
      }
    ] : []),
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── 1. Mini Profile / Workspace Identifier Card ala Kaprog ── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
            <BookOpen size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block leading-tight">
              Ruang Pendidik
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={guruNama || 'Guru Pengajar'}>
              {guruNama || 'Guru Pengajar'}
            </h3>
          </div>
        </div>

        {/* Status Beban JP Ringkas */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-medium flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <span>Beban Mengajar</span>
          </span>
          <span className="font-bold text-slate-700 dark:text-slate-200 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {currentBebanJp}/{targetBebanJp} JP
          </span>
        </div>
      </div>

      {/* ── 2. Navigasi Vertikal Menu ala Kaprog / Kurikulum ── */}
      <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Menu Pengajaran
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          const isCbtRadar = tab.temporaryStyle === 'cbt_radar';
          const isSidangBeacon = tab.temporaryStyle === 'sidang_beacon';

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeSubTab(tab.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left select-none",
                isActive && isCbtRadar
                  ? "bg-emerald-600 text-white shadow-sm border border-emerald-500 font-bold"
                  : isActive && isSidangBeacon
                  ? "bg-amber-600 text-white shadow-sm border border-amber-500 font-bold"
                  : isActive
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : isCbtRadar
                  ? "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-400/80 dark:border-emerald-700 animate-pulse font-bold hover:bg-emerald-100"
                  : isSidangBeacon
                  ? "bg-amber-50/90 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-400/80 dark:border-amber-700 animate-pulse font-bold hover:bg-amber-100"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {(isCbtRadar || isSidangBeacon) && (
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full animate-ping shrink-0",
                      isActive
                        ? "bg-white"
                        : isCbtRadar
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    )}
                  />
                )}
                <Icon
                  size={16}
                  className={cn(
                    "shrink-0",
                    isActive
                      ? "text-white"
                      : isCbtRadar
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isSidangBeacon
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                />
                <span className="truncate">{tab.label}</span>
              </div>

              {/* Dynamic Notification Badge / Temporary Status Pill */}
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 ? (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center leading-tight transition-colors",
                    isActive
                      ? "bg-white/25 text-white"
                      : tab.badgeVariant === 'emerald'
                      ? "bg-emerald-600 text-white animate-pulse"
                      : tab.badgeVariant === 'rose'
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                      : "bg-amber-500 text-white animate-pulse"
                  )}
                >
                  {tab.badgeCount}
                </span>
              ) : isCbtRadar ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600 text-white animate-pulse">
                  LIVE
                </span>
              ) : isSidangBeacon ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-white animate-pulse">
                  UJI
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
});

TeacherSidebarNav.displayName = 'TeacherSidebarNav';
