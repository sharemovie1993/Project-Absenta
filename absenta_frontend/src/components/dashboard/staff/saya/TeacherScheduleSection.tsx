import React from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { HubCard, HubListRow } from '@/components/ui/hub';

interface TeacherScheduleSectionProps {
  onOpenWeeklySchedule: () => void;
  onOpenAcademicCalendar: () => void;
  className?: string;
}

export const TeacherScheduleSection: React.FC<TeacherScheduleSectionProps> = React.memo(({
  onOpenWeeklySchedule,
  onOpenAcademicCalendar,
  className,
}) => {
  return (
    <HubCard
      title="Jadwal & Agenda Mengajar"
      className={className}
      noPadding
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        <HubListRow
          title="Matriks Jadwal Mengajar Mingguan"
          subtitle="Jadwal mengajar lengkap hari Senin s.d. Jumat"
          icon={Calendar}
          iconColorClass="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
          onClick={onOpenWeeklySchedule}
        />
        <HubListRow
          title="Kalender Akademik & Hari Efektif"
          subtitle="Jadwal PTS, PAS, libur nasional, dan rapat dinas"
          icon={CalendarDays}
          iconColorClass="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
          onClick={onOpenAcademicCalendar}
        />
      </div>
    </HubCard>
  );
});

TeacherScheduleSection.displayName = 'TeacherScheduleSection';
