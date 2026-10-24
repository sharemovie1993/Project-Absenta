import React, { useMemo } from 'react';
import { BookOpen, Users, FileEdit, Clock } from 'lucide-react';
import { HubCard, HubActionGrid, type HubActionItem } from '@/components/ui/hub';

interface TeacherOpsMicroGridProps {
  totalJp: number;
  totalMinutes: number;
  studentsPresentCount?: number;
  studentsTotalCount?: number;
  unfilledJournalsCount: number;
  currentJp: number;
  targetJp?: number;
  onOpenSchedule?: () => void;
  onOpenJournals?: () => void;
  onOpenBeban?: () => void;
  className?: string;
}

export const TeacherOpsMicroGrid: React.FC<TeacherOpsMicroGridProps> = React.memo(({
  totalJp,
  totalMinutes,
  studentsPresentCount = 0,
  studentsTotalCount = 0,
  unfilledJournalsCount,
  currentJp,
  targetJp = 24,
  onOpenSchedule,
  onOpenJournals,
  onOpenBeban,
  className,
}) => {
  const items: HubActionItem[] = useMemo(() => [
    {
      id: 'ops-kbm',
      label: 'Sesi KBM',
      value: (
        <span>
          {totalJp} <span className="text-[10px] font-normal text-slate-400">JP</span>
        </span>
      ),
      icon: BookOpen,
      iconColorClass: 'text-blue-500',
      onClick: onOpenSchedule,
    },
    {
      id: 'ops-siswa',
      label: 'Siswa Hadir',
      value: studentsPresentCount > 0 ? (
        <span>
          {studentsPresentCount}
          {studentsTotalCount > 0 && <span className="text-[10px] font-normal text-slate-400">/{studentsTotalCount}</span>}
        </span>
      ) : '-',
      icon: Users,
      iconColorClass: 'text-emerald-500',
      onClick: onOpenSchedule,
    },
    {
      id: 'ops-jurnal',
      label: 'Jurnal',
      value: unfilledJournalsCount > 0 ? `${unfilledJournalsCount} Belum` : 'Tuntas',
      icon: FileEdit,
      iconColorClass: unfilledJournalsCount > 0 ? 'text-amber-500' : 'text-emerald-500',
      badge: unfilledJournalsCount > 0 ? unfilledJournalsCount : null,
      onClick: onOpenJournals,
    },
    {
      id: 'ops-beban',
      label: 'Beban JP',
      value: (
        <span>
          {currentJp}
          <span className="text-[10px] font-normal text-slate-400">/{targetJp}</span>
        </span>
      ),
      icon: Clock,
      iconColorClass: currentJp >= targetJp ? 'text-emerald-500' : 'text-indigo-500',
      onClick: onOpenBeban,
    },
  ], [totalJp, studentsPresentCount, studentsTotalCount, unfilledJournalsCount, currentJp, targetJp, onOpenSchedule, onOpenJournals, onOpenBeban]);

  return (
    <HubCard className={className} bodyClassName="py-2 px-1">
      <HubActionGrid items={items} columns={4} />
    </HubCard>
  );
});

TeacherOpsMicroGrid.displayName = 'TeacherOpsMicroGrid';
