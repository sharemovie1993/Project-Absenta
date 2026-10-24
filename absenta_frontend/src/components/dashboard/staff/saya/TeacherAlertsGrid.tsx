import React, { useMemo } from 'react';
import { FileEdit, ClipboardList, ShieldAlert, Award } from 'lucide-react';
import { HubCard, HubActionGrid, type HubActionItem } from '@/components/ui/hub';

interface TeacherAlertsGridProps {
  unfilledJournalsCount: number;
  pendingLeavesCount: number;
  upcomingPiketDate?: string | null;
  gradeDeadlineText?: string | null;
  onOpenJournals?: () => void;
  onOpenLeaves?: () => void;
  onOpenPiket?: () => void;
  onOpenGrades?: () => void;
  className?: string;
}

export const TeacherAlertsGrid: React.FC<TeacherAlertsGridProps> = React.memo(({
  unfilledJournalsCount,
  pendingLeavesCount,
  upcomingPiketDate = 'Kamis Besok',
  gradeDeadlineText = 'Akhir Bulan',
  onOpenJournals,
  onOpenLeaves,
  onOpenPiket,
  onOpenGrades,
  className,
}) => {
  const items: HubActionItem[] = useMemo(() => [
    {
      id: 'alert-journal',
      label: 'Hutang Jurnal',
      value: unfilledJournalsCount > 0 ? `${unfilledJournalsCount} Sesi` : 'Tuntas',
      icon: FileEdit,
      iconColorClass: unfilledJournalsCount > 0 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300',
      badge: unfilledJournalsCount > 0 ? unfilledJournalsCount : null,
      onClick: onOpenJournals,
    },
    {
      id: 'alert-leaves',
      label: 'Izin Saya',
      value: pendingLeavesCount > 0 ? `${pendingLeavesCount} Menunggu` : 'Nihil',
      icon: ClipboardList,
      iconColorClass: pendingLeavesCount > 0 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300',
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : null,
      onClick: onOpenLeaves,
    },
    {
      id: 'alert-piket',
      label: 'Jadwal Piket',
      value: upcomingPiketDate || 'Siaga',
      icon: ShieldAlert,
      iconColorClass: 'text-blue-500',
      onClick: onOpenPiket,
    },
    {
      id: 'alert-grades',
      label: 'Setor Nilai',
      value: gradeDeadlineText || 'Aman',
      icon: Award,
      iconColorClass: 'text-purple-500',
      onClick: onOpenGrades,
    },
  ], [unfilledJournalsCount, pendingLeavesCount, upcomingPiketDate, gradeDeadlineText, onOpenJournals, onOpenLeaves, onOpenPiket, onOpenGrades]);

  return (
    <HubCard
      title="Tugas & Peringatan Saya"
      actionLabel="Lihat Semua"
      onAction={onOpenJournals}
      className={className}
    >
      <HubActionGrid items={items} columns={4} />
    </HubCard>
  );
});

TeacherAlertsGrid.displayName = 'TeacherAlertsGrid';
