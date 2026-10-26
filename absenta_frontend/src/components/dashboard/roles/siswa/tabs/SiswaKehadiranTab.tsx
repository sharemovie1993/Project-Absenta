import React from 'react';
import { SiswaAttendanceTab } from '@/components/academic/siswa/dashboard/SiswaAttendanceTab';

export interface SiswaKehadiranTabProps {
  gamification: any;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  selectedMonthFormatted: string;
  calendarGridData: any[];
  todayIso: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  sessionAttendanceHistory: any[];
  todayKbmSchedule: any[];
  isLoadingSchedule: boolean;
  isApiConnected: boolean;
  kelasId: string;
}

export const SiswaKehadiranTab: React.FC<SiswaKehadiranTabProps> = ({
  gamification,
  handlePrevMonth,
  handleNextMonth,
  selectedMonthFormatted,
  calendarGridData,
  todayIso,
  selectedDate,
  onSelectDate,
  sessionAttendanceHistory,
  todayKbmSchedule,
  isLoadingSchedule,
  isApiConnected,
  kelasId,
}) => {
  return (
    <div className="space-y-4">
      <SiswaAttendanceTab
        gamification={gamification}
        handlePrevMonth={handlePrevMonth}
        handleNextMonth={handleNextMonth}
        selectedMonthFormatted={selectedMonthFormatted}
        calendarGridData={calendarGridData}
        todayIso={todayIso}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        sessionAttendanceHistory={sessionAttendanceHistory}
        todayKbmSchedule={todayKbmSchedule}
        isLoadingSchedule={isLoadingSchedule}
        isApiConnected={isApiConnected}
        kelasId={kelasId}
      />
    </div>
  );
};
