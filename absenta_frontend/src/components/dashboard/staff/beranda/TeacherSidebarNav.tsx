import React from 'react';
import { 
  CalendarDays, 
  FileText, 
  GraduationCap, 
  BarChart2, 
  ShieldCheck,
  UserCheck,
  Clock,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeacherSubTabId, TeacherSubTabItem } from './TeacherSubNavPills';

interface TeacherSidebarNavProps {
  activeSubTab: TeacherSubTabId;
  onChangeSubTab: (subTabId: TeacherSubTabId) => void;
  guruNama?: string;
  perangkatRejectedCount?: number;
  unfilledJournalsCount?: number;
  totalJp?: number;
  currentBebanJp?: number;
  targetBebanJp?: number;
  className?: string;
}

export const TeacherSidebarNav: React.FC<TeacherSidebarNavProps> = React.memo(({
  activeSubTab,
  onChangeSubTab,
  guruNama,
  perangkatRejectedCount = 0,
  unfilledJournalsCount = 0,
  totalJp = 0,
  currentBebanJp = 0,
  targetBebanJp = 24,
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

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeSubTab(tab.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left select-none",
                isActive
                  ? "bg-indigo-600 text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={16} className={cn("shrink-0", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                <span className="truncate">{tab.label}</span>
              </div>

              {/* Dynamic Notification Badge */}
              {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold min-w-5 text-center leading-tight transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.badgeVariant === 'rose'
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                  )}
                >
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
});

TeacherSidebarNav.displayName = 'TeacherSidebarNav';
