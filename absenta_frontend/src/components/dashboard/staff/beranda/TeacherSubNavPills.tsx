import React from 'react';
import { 
  LayoutDashboard,
  FileText, 
  GraduationCap, 
  BarChart2, 
  ShieldCheck,
  Radio,
  Laptop,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TeacherSubTabId =
  | 'agenda'
  | 'tugas'
  | 'perangkat'
  | 'cbt'
  | 'nilai'
  | 'remedial'
  | 'rekap'
  | 'supervisi'
  | 'sidang_guru'
  | 'pengawas_cbt';

export interface TeacherSubTabItem {
  id: TeacherSubTabId;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  badgeVariant?: 'rose' | 'amber' | 'indigo' | 'emerald';
  temporaryStyle?: 'cbt_radar' | 'sidang_beacon';
}

interface TeacherSubNavPillsProps {
  activeSubTab: TeacherSubTabId;
  onChangeSubTab: (subTabId: TeacherSubTabId) => void;
  perangkatRejectedCount?: number;
  unfilledJournalsCount?: number;
  remedialAlertCount?: number;
  isPengujiSidang?: boolean;
  pengujiSidangUnexaminedCount?: number;
  isPengawasCbt?: boolean;
  pengawasCbtActiveCount?: number;
  className?: string;
}

export const TeacherSubNavPills: React.FC<TeacherSubNavPillsProps> = React.memo(({
  activeSubTab,
  onChangeSubTab,
  perangkatRejectedCount = 0,
  unfilledJournalsCount = 0,
  remedialAlertCount = 0,
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
    <div className={cn("w-full overflow-x-auto no-scrollbar py-1", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-max sm:w-full">
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
                "relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none",
                isActive && isCbtRadar
                  ? "bg-emerald-600 text-white shadow-sm border border-emerald-500 font-bold"
                  : isActive && isSidangBeacon
                  ? "bg-amber-600 text-white shadow-sm border border-amber-500 font-bold"
                  : isActive
                  ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700/60 font-bold"
                  : isCbtRadar
                  ? "bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-400/80 dark:border-emerald-700 animate-pulse font-bold"
                  : isSidangBeacon
                  ? "bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-400/80 dark:border-amber-700 animate-pulse font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60"
              )}
            >
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
                size={15}
                className={cn(
                  isActive && (isCbtRadar || isSidangBeacon)
                    ? "text-white"
                    : isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : isCbtRadar
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isSidangBeacon
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400 dark:text-slate-500"
                )}
              />
              <span>{tab.label}</span>

              {/* Dynamic Notification Badge */}
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none animate-pulse",
                    isActive && (isCbtRadar || isSidangBeacon)
                      ? "bg-white/25 text-white"
                      : tab.badgeVariant === 'emerald'
                      ? "bg-emerald-600 text-white"
                      : tab.badgeVariant === 'rose'
                      ? "bg-rose-500 text-white"
                      : tab.badgeVariant === 'amber'
                      ? "bg-amber-500 text-white"
                      : "bg-indigo-600 text-white"
                  )}
                >
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

TeacherSubNavPills.displayName = 'TeacherSubNavPills';
