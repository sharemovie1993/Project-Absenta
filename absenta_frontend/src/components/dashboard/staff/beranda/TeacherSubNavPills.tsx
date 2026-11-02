import React from 'react';
import { 
  CalendarDays, 
  FileText, 
  GraduationCap, 
  BarChart2, 
  ShieldCheck,
  AlertCircle,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TeacherSubTabId = 'agenda' | 'tugas' | 'perangkat' | 'nilai' | 'remedial' | 'rekap' | 'supervisi';

export interface TeacherSubTabItem {
  id: TeacherSubTabId;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  badgeVariant?: 'rose' | 'amber' | 'indigo' | 'emerald';
}

interface TeacherSubNavPillsProps {
  activeSubTab: TeacherSubTabId;
  onChangeSubTab: (subTabId: TeacherSubTabId) => void;
  perangkatRejectedCount?: number;
  unfilledJournalsCount?: number;
  remedialAlertCount?: number;
  className?: string;
}

export const TeacherSubNavPills: React.FC<TeacherSubNavPillsProps> = React.memo(({
  activeSubTab,
  onChangeSubTab,
  perangkatRejectedCount = 0,
  unfilledJournalsCount = 0,
  remedialAlertCount = 0,
  className,
}) => {
  const tabs: TeacherSubTabItem[] = [
    {
      id: 'agenda',
      label: 'Agenda & KBM',
      icon: CalendarDays,
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
  ];

  return (
    <div className={cn("w-full overflow-x-auto no-scrollbar py-1", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-max sm:w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeSubTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap select-none",
                isActive
                  ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/60 dark:border-slate-700/60 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60"
              )}
            >
              <Icon size={15} className={cn(isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
              <span>{tab.label}</span>

              {/* Dynamic Notification Badge */}
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none animate-pulse",
                    tab.badgeVariant === 'rose'
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
